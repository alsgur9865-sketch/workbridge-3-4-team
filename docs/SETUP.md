# WorkBridge setup guide

## 1. User-owned accounts and credentials

A team member must create or approve these resources:

1. A private GitHub repository named `workbridge`
2. A Supabase project for PostgreSQL and Storage
3. A Google Cloud OAuth application
4. An OpenAI API key
5. A Toss Payments Sandbox account and keys
6. Vercel and Render projects when deployment begins

Never paste real secrets into source files, Notion, issues, or chat. Put them only in local `.env` files and deployment environment variable settings.

## 2. Local prerequisites

Run these commands on every team member's computer:

```bash
node -v
npm -v
git --version
```

The team standard is Node.js 24 and npm 11 or later.

## 3. Create local environment files

```bash
npm run setup:env
```

This creates:

- `frontend/.env.local`
- `backend/.env`

## 4. Install packages

```bash
npm install
```

The root install also generates Prisma Client.

## 5. Connect PostgreSQL

Create a Supabase project and copy a PostgreSQL connection string into `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Do not commit this value.

## 6. Create the database schema

```bash
npm run db:migrate:init
npm run db:seed
```

Open Prisma Studio if you want to inspect the data:

```bash
npm run db:studio
```

## 7. Start both applications

```bash
npm run dev
```

Open:

- http://localhost:3000
- http://localhost:4000/api/v1/health
- http://localhost:4000/api/v1/health/database
- http://localhost:4000/api-docs

## 8. Initial Git commit

After the team verifies the project on at least two computers:

```bash
git add .
git commit -m "chore: initialize WorkBridge project"
git push origin main
```

Commit the generated `package-lock.json`. Do not commit `.env` files.

## 9. Recommended branches

```text
main
  Production-ready code

develop
  Integrated development branch

feature/auth
feature/projects
feature/applications
feature/contracts
```

## 10. Definition of setup complete

- Frontend opens on port 3000
- Backend health endpoint returns success on port 4000
- Database health endpoint returns success
- Prisma migration is applied
- Seed data exists
- Swagger UI opens
- Another team member can clone and run the same project
- CI passes on GitHub
