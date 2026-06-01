# FlavoHub

Food-delivery platform monorepo.

## Layout

```
flavohub/
├── apps/
│   ├── api/              # NestJS backend (all surfaces)
│   ├── admin-web/        # Next.js — Super Admin dashboard
│   └── restaurant-web/   # Next.js — Restaurant dashboard
└── packages/
    ├── shared/           # Shared TS types, enums, and API-response helpers
    └── config/           # Shared tooling config (TypeScript, ESLint, Prettier)
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL 18

## Getting started

```bash
# Install all workspace dependencies
pnpm install

# Build shared packages (required before running apps)
pnpm build

# Copy env template and fill in values
cp .env.example .env
```

## Running apps

Run each app from the repo root using pnpm's `--filter` flag:

```bash
pnpm --filter @flavohub/api dev
pnpm --filter @flavohub/admin-web dev
pnpm --filter @flavohub/restaurant-web dev
```

## Tooling

| Tool                       | Purpose                         |
| -------------------------- | ------------------------------- |
| pnpm workspaces            | Monorepo package management     |
| TypeScript 5 strict        | Type safety across all packages |
| ESLint + typescript-eslint | Linting                         |
| Prettier                   | Code formatting                 |
| Husky + lint-staged        | Pre-commit hooks                |
| Prisma                     | DB schema, migrations, client   |
