# Kart Challenge — Go Backend

A food ordering REST API built with **Go**, **Gin**, and **Zap**. Validates coupon codes against three large (~600–700 MB compressed) gzip files using a two-phase hash-partitioned loader that keeps memory bounded.

---

## Architecture

```
go-backend/
├── cmd/server/main.go          ← entry point: load coupons, start Gin
├── internal/
│   ├── assets/                 ← embedded products.json
│   ├── config/                 ← env-based config (PORT, API_KEY, COUPON_DIR, LOG_LEVEL)
│   ├── domain/                 ← Product, Order, Coupon value types
│   ├── handler/                ← Gin handlers (product, order)
│   ├── loader/                 ← two-phase coupon loader
│   ├── middleware/             ← auth (api_key header) + Zap request logger
│   ├── repository/             ← interfaces + in-memory implementations
│   └── service/                ← interfaces + business logic
├── tests/
│   ├── unit/                   ← service & repository unit tests
│   └── integration/            ← supertest-style end-to-end with httptest
├── scripts/
│   └── download-coupons.sh     ← downloads couponbase*.gz from S3
├── data/                       ← coupon gz files live here (not committed)
├── Dockerfile                  ← multi-stage build
├── docker-compose.yml
├── Makefile
└── .env.example
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Health check |
| GET | `/api/product` | none | List all products |
| GET | `/api/product/:productId` | none | Get product by ID |
| POST | `/api/order` | `api_key` header | Place an order |

**Auth:** pass `api_key: apitest` header on order requests.

### Place Order — request body

```json
{
  "items": [
    { "productId": "bb594eaf-...", "quantity": 2 }
  ],
  "couponCode": "SAVE10AB"
}
```

A valid coupon must be **8–10 characters** and appear in **at least 2 of the 3** coupon files. A 10% discount is applied to the order total.

---

## Coupon Loading — Design

Files can exceed 1 GB compressed with hundreds of millions of unique codes. A single in-memory `map` would exhaust RAM.

**Two-phase hash-partitioned approach:**

1. **Phase 1** — for each of the 3 gz files, stream line-by-line and write each valid code (8–10 chars) to one of **256 bucket temp files** based on `fnv32a(code) % 256`. This is sequential and O(1) memory per line.

2. **Phase 2** — process each bucket independently using a goroutine pool (`runtime.NumCPU()` wide). Each bucket builds a small bitmask map (`code → uint8`), sets bit `i` for file `i`, then collects codes where `bits.OnesCount8(mask) >= 2` into the final `Set<string>`.

3. Temp files are deleted, the final `Set` is placed in `CouponRepository`, and the server starts accepting requests.

---

## Local Setup

```bash
cp .env.example .env
make download-coupons   # downloads couponbase*.gz into ./data
make run                # build + start server on :8080
```

### Run tests

```bash
make test
```

### Docker

```bash
make docker-up   # builds image, downloads coupon files, starts server
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listen port |
| `API_KEY` | `apitest` | Required header value for POST /api/order |
| `COUPON_DIR` | `./data` | Directory containing couponbase*.gz files |
| `LOG_LEVEL` | `info` | Zap log level: debug \| info \| warn \| error |
