# --- Build stage ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Build deps for sharp / native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Runtime deps: ffmpeg for rendering, libvips for sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libvips42 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# HF Spaces routes traffic to port 7860 by default
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
# Writable scratch / output dirs (HF gives /data on persistent, /tmp otherwise)
ENV UPLOAD_DIR=/tmp/uploads
ENV OUTPUT_DIR=/tmp/output
ENV TEMP_DIR=/tmp/memory

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Make sure scratch dirs exist & are writable for non-root user
RUN mkdir -p /tmp/uploads /tmp/output /tmp/memory && chmod -R 777 /tmp/uploads /tmp/output /tmp/memory

# HF Spaces runs containers as user 1000 (`user`) with HOME=/home/user
RUN useradd -m -u 1000 user || true
USER user

EXPOSE 7860
CMD ["node", "server.js"]
