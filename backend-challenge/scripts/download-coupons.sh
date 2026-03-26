#!/bin/sh
set -e

COUPON_DIR="${COUPON_DIR:-/app/data}"
BASE_URL="${COUPON_BASE_URL:-https://orderfoodonline-files.s3.ap-southeast-2.amazonaws.com}"

mkdir -p "$COUPON_DIR"

for i in 1 2 3; do
  FILE="couponbase${i}.gz"
  DEST="$COUPON_DIR/$FILE"

  if [ -f "$DEST" ]; then
    echo "[download-coupons] $FILE already exists, skipping."
  else
    echo "[download-coupons] Downloading $FILE..."
    curl -fSL --retry 3 --retry-delay 5 \
      "${BASE_URL}/${FILE}" \
      -o "$DEST"
    echo "[download-coupons] Downloaded $FILE"
  fi
done

echo "[download-coupons] All coupon files ready."
