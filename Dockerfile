# Hotseat, self-hosted: one company's own installation on a plain Node server.
# Build:  docker build -t hotseat .
# Run:    see self-hosting/compose.yml and SELF_HOSTING.md

# Build the app for Node (HOTSEAT_TARGET=node), served at the root. Bun installs
# (the lockfile is Bun's); the build itself runs on Node (React Router's build
# doesn't run under Bun).
FROM node:25-slim AS build
RUN npm install -g bun@1.3
WORKDIR /app
COPY package.json bun.lockb ./
COPY patches ./patches
# No install scripts yet: they generate the Prisma client, whose schema isn't copied in yet.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
ENV HOTSEAT_TARGET=node BASE_PATH=/
RUN bun run prisma:generate && npx react-router build

# What the server needs at run time (and the Prisma CLI, for migrations).
FROM oven/bun:1.3 AS dependencies
WORKDIR /app
COPY package.json bun.lockb ./
COPY patches ./patches
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM node:25-slim
# Prisma's migration engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    HOTSEAT_EDITION=self-hosted \
    PORT=3000 \
    IMAGES_DIR=/data/images
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY server/node.mjs ./server/node.mjs
COPY app/repositories/main-repository/prisma/schema.prisma app/repositories/main-repository/prisma/prisma.config.ts ./prisma/
COPY app/repositories/main-repository/prisma/migrations ./prisma/migrations
COPY package.json ./
# The migration engine for this system, fetched now (installs above skipped
# scripts) — the server runs as an unprivileged user that can't fetch it later.
RUN node_modules/.bin/prisma version > /dev/null
# Uploaded images (logos, office photos, people's photos): mount a volume here.
RUN mkdir -p /data/images && chown -R node:node /data
VOLUME /data
EXPOSE 3000
USER node
# Bring the database up to date, then serve.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --config=prisma/prisma.config.ts && node server/node.mjs"]
