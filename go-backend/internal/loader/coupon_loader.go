// Package loader implements the two-phase hash-partitioned coupon loading
// strategy that keeps memory usage flat even for multi-GB gz input files.
package loader

import (
	"bufio"
	"compress/gzip"
	"fmt"
	"hash/fnv"
	"math/bits"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"go.uber.org/zap"
)

const (
	numBuckets   = 256
	minCodeLen   = 8
	maxCodeLen   = 10
	minPopcount  = 2 // a code must appear in at least 2 files to be considered valid
)

// LoadCoupons performs the two-phase loading and returns a set of valid codes.
//
// Phase 1: stream each *.gz file, filter lines whose length is in [8,10],
// write each qualifying code to one of 256 bucket temp files based on
// fnv32a(code) % 256.
//
// Phase 2: process every bucket file in parallel (goroutine pool = NumCPU),
// read all codes, build a bitmask per unique code (bit N = seen in file N),
// collect codes whose popcount >= minPopcount.
func LoadCoupons(dir string, logger *zap.Logger) (map[string]struct{}, error) {
	// Locate gz files.
	pattern := filepath.Join(dir, "*.gz")
	gzFiles, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("glob %q: %w", pattern, err)
	}
	if len(gzFiles) == 0 {
		logger.Warn("no .gz coupon files found; starting with empty coupon set", zap.String("dir", dir))
		return make(map[string]struct{}), nil
	}
	if len(gzFiles) > 64 {
		return nil, fmt.Errorf("too many gz files (%d); max 64 supported for bitmask", len(gzFiles))
	}

	logger.Info("phase 1: partitioning coupon files into buckets",
		zap.Int("files", len(gzFiles)),
		zap.Int("buckets", numBuckets),
	)

	// Create temp directory for bucket files.
	tmpDir, err := os.MkdirTemp("", "coupon-buckets-*")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer func() {
		if removeErr := os.RemoveAll(tmpDir); removeErr != nil {
			logger.Warn("failed to remove temp dir", zap.String("dir", tmpDir), zap.Error(removeErr))
		}
	}()

	// Phase 1 — stream each file, fan-out into buckets.
	for fileIdx, gzPath := range gzFiles {
		if err := phase1File(gzPath, fileIdx, tmpDir); err != nil {
			return nil, fmt.Errorf("phase1 %q: %w", gzPath, err)
		}
		logger.Info("phase 1 file done", zap.String("file", filepath.Base(gzPath)))
	}

	logger.Info("phase 2: building valid set from buckets",
		zap.Int("parallelism", runtime.NumCPU()),
	)

	// Phase 2 — parallel bucket processing.
	valid := make(map[string]struct{})
	var mu sync.Mutex

	concurrency := runtime.NumCPU()
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var firstErr error
	var errMu sync.Mutex

	for b := 0; b < numBuckets; b++ {
		bucketPath := filepath.Join(tmpDir, fmt.Sprintf("bucket-%03d.txt", b))

		// Skip buckets that were never written.
		if _, statErr := os.Stat(bucketPath); os.IsNotExist(statErr) {
			continue
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(path string, fileCount int) {
			defer wg.Done()
			defer func() { <-sem }()

			codes, processErr := phase2Bucket(path, fileCount)
			if processErr != nil {
				errMu.Lock()
				if firstErr == nil {
					firstErr = processErr
				}
				errMu.Unlock()
				return
			}

			if len(codes) > 0 {
				mu.Lock()
				for c := range codes {
					valid[c] = struct{}{}
				}
				mu.Unlock()
			}
		}(bucketPath, len(gzFiles))
	}

	wg.Wait()

	if firstErr != nil {
		return nil, fmt.Errorf("phase2: %w", firstErr)
	}

	logger.Info("coupon loading complete", zap.Int("valid_codes", len(valid)))
	return valid, nil
}

// phase1File streams a single gz file and writes each qualifying code to the
// appropriate bucket file.  bucket files are opened in append mode so that
// multiple source files accumulate into the same set of buckets.
func phase1File(gzPath string, fileIdx int, tmpDir string) error {
	f, err := os.Open(gzPath)
	if err != nil {
		return err
	}
	defer f.Close()

	gr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("gzip reader: %w", err)
	}
	defer gr.Close()

	// Open / cache bucket writers for this file so we don't thrash the OS.
	writers := make([]*bufio.Writer, numBuckets)
	files := make([]*os.File, numBuckets)
	defer func() {
		for i, bw := range writers {
			if bw != nil {
				_ = bw.Flush()
			}
			if files[i] != nil {
				_ = files[i].Close()
			}
		}
	}()

	getBucket := func(idx int) (*bufio.Writer, error) {
		if writers[idx] != nil {
			return writers[idx], nil
		}
		p := filepath.Join(tmpDir, fmt.Sprintf("bucket-%03d.txt", idx))
		bf, openErr := os.OpenFile(p, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
		if openErr != nil {
			return nil, openErr
		}
		files[idx] = bf
		writers[idx] = bufio.NewWriterSize(bf, 1<<20) // 1 MiB write buffer
		return writers[idx], nil
	}

	h := fnv.New32a()
	scanner := bufio.NewScanner(gr)
	scanner.Buffer(make([]byte, 1<<20), 1<<20)

	for scanner.Scan() {
		code := scanner.Text()
		l := len(code)
		if l < minCodeLen || l > maxCodeLen {
			continue
		}

		h.Reset()
		_, _ = h.Write([]byte(code))
		bucketIdx := int(h.Sum32() % numBuckets)

		bw, bucketErr := getBucket(bucketIdx)
		if bucketErr != nil {
			return bucketErr
		}
		// Format: "<fileIdx>:<code>\n"
		if _, writeErr := fmt.Fprintf(bw, "%d:%s\n", fileIdx, code); writeErr != nil {
			return writeErr
		}
	}

	return scanner.Err()
}

// phase2Bucket reads a bucket file, builds per-code bitmasks, and returns
// the set of codes that appear in at least minPopcount distinct source files.
func phase2Bucket(bucketPath string, fileCount int) (map[string]struct{}, error) {
	f, err := os.Open(bucketPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// bitmask uses uint64; supports up to 64 source files.
	bitmasks := make(map[string]uint64)

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 1<<16), 1<<16)

	for scanner.Scan() {
		line := scanner.Text()
		// Parse "<fileIdx>:<code>"
		colonIdx := -1
		for i := 0; i < len(line); i++ {
			if line[i] == ':' {
				colonIdx = i
				break
			}
		}
		if colonIdx < 0 {
			continue
		}
		fileIdxStr := line[:colonIdx]
		code := line[colonIdx+1:]

		// Parse file index manually (avoid strconv import overhead in hot path).
		fileIdx := 0
		for _, ch := range fileIdxStr {
			if ch < '0' || ch > '9' {
				fileIdx = -1
				break
			}
			fileIdx = fileIdx*10 + int(ch-'0')
		}
		if fileIdx < 0 || fileIdx >= fileCount {
			continue
		}

		bitmasks[code] |= 1 << uint(fileIdx)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	result := make(map[string]struct{})
	for code, mask := range bitmasks {
		if bits.OnesCount64(mask) >= minPopcount {
			result[code] = struct{}{}
		}
	}
	return result, nil
}
