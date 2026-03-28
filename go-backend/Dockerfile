# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Download dependencies first for better layer caching.
COPY go.mod go.sum ./
RUN go mod download

# Copy sources and build.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /app/bin/server ./cmd/server

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk --no-cache add ca-certificates bash curl

WORKDIR /app

COPY --from=builder /app/bin/server ./server
COPY data/ ./data/
COPY scripts/download-coupons.sh ./scripts/download-coupons.sh
RUN chmod +x ./scripts/download-coupons.sh

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "./scripts/download-coupons.sh && ./server"]
