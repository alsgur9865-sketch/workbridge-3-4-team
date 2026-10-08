# API specification starter

Base URL: `/api/v1`

## Implemented now

- `GET /health`
- `GET /health/database`
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

Project mutations use `X-WorkBridge-Demo-User` only during local development until the auth
module is connected. AI price estimates return `AI_NOT_CONFIGURED` until `OPENAI_API_KEY` is
configured; `OPENAI_MODEL` is optional.

## Planned groups

- `/auth`
- `/users`
- `/profiles`
- `/notifications`
- `/contracts`
- `/payments`
- `/deliveries`
- `/reviews`

Swagger UI is available at `/api-docs` while the backend is running.
