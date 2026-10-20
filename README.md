# WorkBridge

WorkBridge is a two-sided freelance project platform MVP. It covers project posting, applications, selection, price agreement, contracts, sandbox payments, delivery, settlement, notifications, bookmarks, AI price analysis, and mutual reviews.

## Finalized stack

- Frontend: React, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui style components
- Client data: TanStack Query, Zustand, Axios, React Hook Form, Zod
- Backend: Node.js, Express, TypeScript, Zod, JWT, bcrypt, Swagger/OpenAPI
- Database: PostgreSQL, Prisma ORM 7
- External services: Google OAuth, OpenAI API, Toss Payments Sandbox, Supabase Storage
- Deployment: Vercel, Render, Supabase
- Collaboration: GitHub, npm workspaces, ESLint, Prettier, Vitest, Supertest

## Repository layout

```text
workbridge/
|- frontend/          React SPA
|- backend/           Express REST API and Prisma schema
|- packages/shared/   Shared constants and schemas
|- docs/              Setup, ERD, and team documentation
|- scripts/           Local setup helpers
`- .github/workflows/ CI
```

## Prerequisites

- Node.js 24 LTS
- npm 11 or later
- Git
- A PostgreSQL database, preferably a Supabase project

## First run

```bash
npm run setup:env
npm install
```

Fill in `backend/.env`, especially `DATABASE_URL`, then run:

```bash
npm run db:migrate:init
npm run db:seed
npm run dev
```

Default URLs:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API health: http://localhost:4000/api/v1/health
- Swagger UI: http://localhost:4000/api-docs

## Common commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:studio
npm run db:seed:showcase
```

`npm run db:seed:showcase` adds or refreshes homepage projects, one completed workflow, and
privacy-safe review examples without deleting existing development data. It is idempotent and blocked
when `NODE_ENV=production`.

Read `docs/SETUP.md` before connecting GitHub, Supabase, Vercel, or Render.
