.PHONY: build run test docker-build docker-up download-coupons tidy lint

# ── Local development ─────────────────────────────────────────────────────────

build:
	go build -ldflags="-s -w" -o bin/server ./cmd/server

run: build
	./bin/server

test:
	go test -v -race ./...

tidy:
	go mod tidy

lint:
	golangci-lint run ./...

# ── Docker ────────────────────────────────────────────────────────────────────

docker-build:
	docker build -t kart-challenge-go .

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# ── Data ──────────────────────────────────────────────────────────────────────

download-coupons:
	@bash scripts/download-coupons.sh
