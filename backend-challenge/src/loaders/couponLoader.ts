import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import readline from 'readline';
import { config } from '../config';
import { logger } from '../utils/logger';

const NUM_BUCKETS = 256;     // 256 bucket files per gz file → 768 temp files total
const MIN_LEN = 8;
const MAX_LEN = 10;
const FLUSH_THRESHOLD = 10_000; // lines buffered per bucket before flushing to disk

/**
 * Hash a code to a bucket index in [0, NUM_BUCKETS).
 */
function hashBucket(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % NUM_BUCKETS;
}

function popcount(n: number): number {
  let c = 0;
  while (n) { c += n & 1; n >>>= 1; }
  return c;
}

/**
 * Two-phase coupon loader that handles files with hundreds of millions of unique codes.
 *
 * Phase 1 — distribute:
 *   Stream each gz file once, filter for 8-10 char codes, and append each code
 *   to a per-bucket temp file (f{fileIdx}_b{bucket}.txt).
 *
 * Phase 2 — reduce:
 *   For each bucket, load the 3 small bucket files into a bitmask Map,
 *   collect codes with popcount(mask) >= 2, then discard the Map.
 *   At most NUM_BUCKETS unique codes are in memory at once.
 */
export async function loadCoupons(): Promise<Set<string>> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kart-coupons-'));
  logger.info(`Coupon temp dir: ${tmpDir}`);

  try {
    // ── Phase 1: distribute ──────────────────────────────────────────────────
    for (let fi = 0; fi < config.couponFiles.length; fi++) {
      const filePath = path.join(config.couponDir, config.couponFiles[fi]);

      if (!fs.existsSync(filePath)) {
        logger.warn(`Coupon file not found, skipping: ${filePath}`);
        continue;
      }

      logger.info(`Phase 1 [${fi + 1}/${config.couponFiles.length}]: distributing ${config.couponFiles[fi]}`);
      await distributeFile(filePath, fi, tmpDir);
    }

    // ── Phase 2: reduce ──────────────────────────────────────────────────────
    logger.info(`Phase 2: reducing ${NUM_BUCKETS} buckets...`);
    const validCoupons = new Set<string>();

    for (let b = 0; b < NUM_BUCKETS; b++) {
      const bitmask = new Map<string, number>();

      for (let fi = 0; fi < config.couponFiles.length; fi++) {
        const bucketFile = path.join(tmpDir, `f${fi}_b${b}.txt`);
        if (!fs.existsSync(bucketFile)) continue;

        const bit = 1 << fi;
        const content = fs.readFileSync(bucketFile, 'utf8');
        for (const code of content.split('\n')) {
          if (!code) continue;
          bitmask.set(code, (bitmask.get(code) ?? 0) | bit);
        }
      }

      for (const [code, mask] of bitmask) {
        if (popcount(mask) >= 2) validCoupons.add(code);
      }

      if ((b + 1) % 64 === 0) {
        logger.info(
          `Phase 2: ${b + 1}/${NUM_BUCKETS} buckets done, valid so far: ${validCoupons.size.toLocaleString()}`,
        );
      }
    }

    logger.info(`Coupon loading complete: ${validCoupons.size.toLocaleString()} valid coupons`);
    return validCoupons;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    logger.info(`Cleaned up temp dir: ${tmpDir}`);
  }
}

/**
 * Stream a single gz file, filter 8-10 char codes, and write each code to the
 * appropriate bucket temp file. In-memory line buffers are flushed to disk when
 * they hit FLUSH_THRESHOLD to avoid exhausting RAM.
 */
async function distributeFile(filePath: string, fileIdx: number, tmpDir: string): Promise<void> {
  const buffers: string[][] = Array.from({ length: NUM_BUCKETS }, () => []);

  const flushBucket = (b: number): void => {
    if (buffers[b].length === 0) return;
    const dest = path.join(tmpDir, `f${fileIdx}_b${b}.txt`);
    fs.appendFileSync(dest, buffers[b].join('\n') + '\n');
    buffers[b] = [];
  };

  return new Promise<void>((resolve, reject) => {
    let lineCount = 0;

    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

    fileStream.on('error', reject);
    gunzip.on('error', reject);

    rl.on('line', (line) => {
      const code = line.trim();
      // Only codes that can ever be valid need to be stored
      if (code.length < MIN_LEN || code.length > MAX_LEN) return;

      const b = hashBucket(code);
      buffers[b].push(code);
      if (buffers[b].length >= FLUSH_THRESHOLD) flushBucket(b);

      lineCount++;
      if (lineCount % 5_000_000 === 0) {
        logger.info(`  File ${fileIdx + 1}: distributed ${lineCount.toLocaleString()} valid-length lines`);
      }
    });

    rl.on('close', () => {
      for (let b = 0; b < NUM_BUCKETS; b++) flushBucket(b);
      logger.info(`  File ${fileIdx + 1}: ${lineCount.toLocaleString()} valid-length lines distributed`);
      resolve();
    });

    rl.on('error', reject);
    fileStream.pipe(gunzip);
  });
}
