# Team conventions

## Branches

- `main`: deployable code only
- `develop`: integration branch
- `feature/<scope>`: feature work
- `fix/<scope>`: bug fixes

## Commit messages

Use a short conventional prefix:

```text
feat: add project creation form
fix: prevent duplicate applications
chore: configure Prisma
refactor: split payment service
 test: add health endpoint test
 docs: update local setup guide
```

## Pull requests

Every pull request should include:

- What changed
- How to test it
- Screenshots for UI changes
- Database migration notes
- Environment variable changes

At least one other team member should review before merge.

## API conventions

- Base path: `/api/v1`
- JSON response body
- Server-side role and ownership checks
- Zod validation for request inputs
- Consistent errors with `code`, `message`, and optional `details`

## Security

- Never expose service secrets to the frontend
- Never log passwords, tokens, payment keys, or service role keys
- Store only password hashes and refresh token hashes
- Verify payment amount and status on the backend
