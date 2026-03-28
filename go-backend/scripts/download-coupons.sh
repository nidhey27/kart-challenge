#!/usr/bin/env bash
# Downloads couponbase{1,2,3}.gz from S3 into COUPON_DIR if not already present.

set -euo pipefail

COUPON_DIR="${COUPON_DIR:-./data}"
BASE_URL="https://orderfoodonline-files.s3.ap-southeast-2.amazonaws.com"

mkdir -p "${COUPON_DIR}"

for i in 1 2 3; do
  FILE="${COUPON_DIR}/couponbase${i}.gz"
  if [ -f "${FILE}" ]; then
    echo "Coupon file already present: ${FILE}"
  else
    echo "Downloading couponbase${i}.gz ..."
    curl -fsSL --retry 3 --retry-delay 5 \
      "${BASE_URL}/couponbase${i}.gz" \
      -o "${FILE}"
    echo "Downloaded: ${FILE}"
  fi
done

echo "Coupon files ready in ${COUPON_DIR}"
