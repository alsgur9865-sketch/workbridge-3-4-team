# API specification starter

Base URL: `/api/v1`

## Implemented now

- `GET /health`
- `GET /health/database`
- `POST /auth/signup`
- `POST /auth/login`
- `PATCH /auth/role`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /projects`
  - Filters: `search`, `category`, `status`, `skill`, `minBudget`, `maxBudget`
  - Options: `sort`, `bookmarkedOnly`, `page`, `limit`
- `GET /projects/:projectId`
- `POST /projects`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`
- `POST /projects/:projectId/bookmark`
- `DELETE /projects/:projectId/bookmark`
- `POST /projects/price-estimate`
- `POST /projects/:projectId/applications`
- `GET /projects/:projectId/applications`
- `GET /applications/me`
- `PATCH /applications/:applicationId/status`

## Auth session rules

- Access token: returned in JSON and sent as `Authorization: Bearer <token>`
- Refresh token: stored in the `workbridge_refresh_token` HttpOnly cookie
- Refresh tokens are hashed before being stored in `User.refreshTokenHash`
- `POST /auth/refresh` rotates both tokens
- `POST /auth/logout` clears the saved refresh token and cookie
- A newly registered user selects either `CLIENT` or `FREELANCER` once through `PATCH /auth/role`
- Selecting a role reissues the access/refresh tokens so the JWT role claim immediately matches the database

## Project authorization rules

- Project lists and details are public. When an access token is present, bookmark state is returned for that user.
- Project creation, updates, deletions, and AI price estimates require an authenticated `CLIENT`.
- Bookmark creation and removal require an authenticated user.
- AI price estimates return `AI_NOT_CONFIGURED` until `OPENAI_API_KEY` is configured; `OPENAI_MODEL` is optional.

## Planned groups

- `/users`
- `/profiles`
- `/notifications`
- `/contracts`
- `/payments`
- `/deliveries`
- `/reviews`

Swagger UI is available at `/api-docs` while the backend is running.
