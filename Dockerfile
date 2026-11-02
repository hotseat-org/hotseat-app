# Hotseat, self-hosted: one company's own installation on a plain Node server.
# Build:  docker build -t hotseat .
# Run:    see self-hosting/compose.yml and SELF_HOSTING.md

# Build the app for Node (HOTSEAT_TARGET=node), served at the root. Bun installs
# (the lockfile is Bun's); the build itself runs on Node (React Router's build
# doesn't run under Bun). The server bundles its packages, so the image below
# needs only the few listed by scripts/runtime-packages.mjs.
FROM node:25-slim AS build
RUN npm install -g bun@1.3
WORKDIR /app
COPY package.json bun.lockb ./
COPY patches ./patches
# No install scripts yet: they generate the Prisma client, whose schema isn't copied in yet.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
ENV HOTSEAT_TARGET=node BASE_PATH=/
RUN bun run prisma:generate \
    && npx react-router build \
    && node scripts/runtime-packages.mjs runtime/package.json

# Pure JavaScript and WebAssembly from here on (no native engines): Alpine.
FROM node:25-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOTSEAT_EDITION=self-hosted \
    PORT=3000 \
    IMAGES_DIR=/data/images
# Just the run-time packages: the Prisma client and the Postgres driver. Of
# the client's query compilers, only the one it loads (fast, PostgreSQL).
COPY --from=build /app/runtime/package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && find node_modules/@prisma/client/runtime -type f \
       \( -name "*.map" -o \( -name "query_compiler_*" ! -name "query_compiler_fast_bg.postgresql.*" \) \) -delete
COPY --from=build /app/build ./build
COPY server/node.mjs server/migrate.mjs ./server/
COPY app/repositories/main-repository/prisma/migrations ./prisma/migrations
# Uploaded images (logos, office photos, people's photos): mount a volume here.
RUN mkdir -p /data/images && chown -R node:node /data
VOLUME /data
EXPOSE 3000
USER node
# Bring the database up to date, then serve.
CMD ["sh", "-c", "node server/migrate.mjs prisma/migrations && node server/node.mjs"]
