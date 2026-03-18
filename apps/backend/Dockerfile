FROM node:22-slim AS base
RUN corepack enable pnpm && apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend

RUN pnpm --filter @flip-finder/backend prisma:generate
RUN pnpm --filter @flip-finder/backend build

WORKDIR /app/apps/backend

EXPOSE 4000
CMD ["sh", "-c", "pnpm prisma:migrate:deploy && node dist/main"]
