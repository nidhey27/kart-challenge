import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Streams each .gz coupon file line by line, building a bitmask map.
 * Bit 0 = present in file 1, bit 1 = file 2, bit 2 = file 3.
 * A coupon is considered valid if it appears in at least 2 files.
 */
export async function loadCoupons(): Promise<Set<string>> {
  const bitmask = new Map<string, number>();

  for (let i = 0; i < config.couponFiles.length; i++) {
    const filePath = path.join(config.couponDir, config.couponFiles[i]);

    if (!fs.existsSync(filePath)) {
      logger.warn(`Coupon file not found, skipping: ${filePath}`);
      continue;
    }

    logger.info(`Loading coupon file ${i + 1}/${config.couponFiles.length}: ${filePath}`);
    await streamGzFile(filePath, i, bitmask);
    logger.info(`Finished loading file ${i + 1}`);
  }

  logger.info(`Building valid coupon set from ${bitmask.size} unique codes...`);
  const validCoupons = new Set<string>();

  for (const [code, mask] of bitmask) {
    // Count set bits (popcount) — valid if code appears in >= 2 files
    if (popcount(mask) >= 2) {
      validCoupons.add(code);
    }
  }

  // Free memory
  bitmask.clear();

  logger.info(`Coupon set built: ${validCoupons.size} valid coupons`);
  return validCoupons;
}

function streamGzFile(
  filePath: string,
  fileIndex: number,
  bitmask: Map<string, number>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bit = 1 << fileIndex;
    let lineCount = 0;

    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

    fileStream.on('error', reject);
    gunzip.on('error', reject);

    rl.on('line', (line) => {
      const code = line.trim();
      if (code.length === 0) return;

      const existing = bitmask.get(code) ?? 0;
      bitmask.set(code, existing | bit);

      lineCount++;
      if (lineCount % 1_000_000 === 0) {
        logger.info(`  File ${fileIndex + 1}: processed ${lineCount.toLocaleString()} lines`);
      }
    });

    rl.on('close', () => {
      logger.info(`  File ${fileIndex + 1}: total ${lineCount.toLocaleString()} lines`);
      resolve();
    });

    rl.on('error', reject);

    fileStream.pipe(gunzip);
  });
}

function popcount(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}
