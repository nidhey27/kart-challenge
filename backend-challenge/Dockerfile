# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

COPY tsconfig.json ./
COPY src ./src
COPY data/products.json ./data/products.json

RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/products.json ./data/products.json
COPY scripts/download-coupons.sh ./scripts/download-coupons.sh

RUN chmod +x ./scripts/download-coupons.sh && \
    mkdir -p /app/data /app/logs

ENV NODE_ENV=production
ENV PORT=3000
ENV API_KEY=apitest
ENV COUPON_DIR=/app/data

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "-c", "./scripts/download-coupons.sh && node dist/app.js"]
