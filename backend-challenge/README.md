# Advanced Challenge

Build an API server implementing our OpenAPI spec for food ordering API in [Go](https://go.dev).\
You can find our [API Documentation](https://orderfoodonline.deno.dev/public/openapi.html) here.

API documentation is based on [OpenAPI3.1](https://swagger.io/specification/v3/) specification.
You can also find spec file [here](https://orderfoodonline.deno.dev/public/openapi.yaml).

> The API immplementation example available to you at orderfoodonline.deno.dev/api is simplified and doesn't handle some edge cases intentionally.
> Use your best judgement to build a Robust API server.

## Basic Requirements

- Implement all APIs described in the OpenAPI specification
- Conform to the OpenAPI specification as close to as possible
- Implement all features our [demo API server](https://orderfoodonline.deno.dev) has implemented
- Validate promo code according to promo code validation logic described below

### Promo Code Validation

You will find three big files containing random text in this repositotory.\
A promo code is valid if the following rules apply:

1. Must be a string of length between 8 and 10 characters
2. It can be found in **at least two** files

> Files containing valid coupons are couponbase1.gz, couponbase2.gz and couponbase3.gz

You can download the files from here

[file 1](https://orderfoodonline-files.s3.ap-southeast-2.amazonaws.com/couponbase1.gz)
[file 2](https://orderfoodonline-files.s3.ap-southeast-2.amazonaws.com/couponbase2.gz)
[file 3](https://orderfoodonline-files.s3.ap-southeast-2.amazonaws.com/couponbase3.gz)

**Example Promo Codes**

Valid promo codes

- HAPPYHRS
- FIFTYOFF

Invalid promo codes

- SUPER100

> [!TIP]
> it should be noted that there are more valid and invalid promo codes that those shown above.

## Getting Started

You might need to configure Git LFS to clone this repository\
https://github.com/oolio-group/kart-challenge/tree/advanced-challenge/backend-challenge

1. Use this repository as a template and create a new repository in your account
2. Start coding
3. Share your repository

---

# Kart Challenge — Backend API (Implementation)

A food ordering REST API built with **Node.js + TypeScript** implementing the OpenAPI 3.1 spec. Key feature: coupon validation against 3 large gzip files using bitmask streaming.

## Architecture

```
src/
├── config/        ← env vars, file paths, API key
├── domain/        ← TypeScript interfaces (Product, Order, Coupon)
├── repositories/  ← in-memory data stores
├── services/      ← business logic
├── controllers/   ← HTTP request handlers
├── routes/        ← Express router wiring
├── middlewares/   ← auth + error handler
├── loaders/       ← streaming gz coupon loader
└── utils/         ← Winston logger
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/product` | none | List all products |
| GET | `/api/product/:productId` | none | Get product by ID |
| POST | `/api/order` | `api_key` header | Place order with optional coupon |
| GET | `/health` | none | Health check |

**Auth:** `api_key: apitest` header required on POST /api/order

### Example Requests

```bash
# List products
curl http://localhost:3000/api/product

# Get product
curl http://localhost:3000/api/product/waffle-with-berries

# Place order
curl -X POST http://localhost:3000/api/order \
  -H "api_key: apitest" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"waffle-with-berries","quantity":2}],"couponCode":"MYCODE123"}'
```

## Coupon Validation

Coupons are validated against 3 large gzip files (~600-700 MB each compressed). A coupon is valid if:
1. It is 8-10 characters long
2. It appears in **at least 2 of the 3** coupon files

### Loading Strategy (bitmask streaming)

```
1. Stream each .gz file via zlib.createGunzip() + readline
2. Each line = one coupon code
3. Maintain Map<string, number> with bitmask (bit 0=file1, bit 1=file2, bit 2=file3)
4. After all files: build Set<string> where popcount(bitmask) >= 2
5. Clear intermediate Map to free memory
```

This approach handles ~2B lines across 3 files without loading everything into memory at once.

## Setup

### Prerequisites
- Node.js 20+
- Coupon gz files in `./data/`

### Local Development

```bash
cd backend-challenge
cp .env.example .env
npm install
npm run dev
```

### Build & Run

```bash
npm run build
npm start
```

### Tests

```bash
npm test              # all tests
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
npm run test:coverage # with coverage report
```

## Docker

```bash
# Build and run (downloads coupon files on first start)
docker-compose up --build
```

The Docker entrypoint runs `download-coupons.sh` before starting the server. Files are cached in a named volume (`coupon-data`) so they don't re-download on restart.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `API_KEY` | `apitest` | Required header for POST /api/order |
| `COUPON_DIR` | `./data` | Directory containing coupon .gz files |
| `LOG_LEVEL` | `info` | Winston log level |
| `NODE_ENV` | `development` | Environment |

## Order Response Format

```json
{
  "id": "uuid",
  "items": [{"productId": "waffle-with-berries", "quantity": 2}],
  "products": [...],
  "discount": 10,
  "total": 11.70
}
```

`discount` is present only when a valid coupon was applied (10% off). `total` is the final price after discount.
