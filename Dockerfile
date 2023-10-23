FROM oven/bun:latest AS base

WORKDIR /app

FROM base AS builder

COPY package*.json ./
COPY . .

RUN bun install

# FROM base AS release

# Copy your build files from the builder step. This is what I use for
# a node project, so change these accordingly to what it is for you.
# I assume since you're running a build command, you'll have a dist/build file somewhere (not familiar with bun)
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "start"]