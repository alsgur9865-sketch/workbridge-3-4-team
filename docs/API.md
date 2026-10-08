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

## Planned groups

- `/users`
- `/profiles`
- `/projects`
- `/notifications`
- `/bookmarks`
- `/ai/price-analyses`
- `/contracts`
- `/payments`
- `/deliveries`
- `/reviews`

Swagger UI is available at `/api-docs` while the backend is running.
