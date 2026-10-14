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
- `GET /projects/recommended` (authenticated `FREELANCER` only)
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

## Project recommendations and recruitment

- `GET /projects/recommended` reads `FreelancerProfile.mainCategory` and related skill names for the authenticated user. It returns at most 12 projects in `{ success, data, meta: { profileRequired } }`.
- Score: two points per matching skill name, plus one point for the matching category (case-insensitive). Ties are ordered by newest creation time, then project ID. Non-matching projects are excluded.
- Each recommended project includes `recommendation: { score, matchedSkills, categoryMatched }` and the current user's `isBookmarked` value.
- If both category and skills are missing, the API returns an empty list and `profileRequired: true`. Profile editing remains owned by the profiles feature.
- Use the same category values as project creation (`Web Development`, `Design`) when saving a freelancer's main category.
- Read-time recruitment status is `SCHEDULED` before the start, `OPEN` from the start (inclusive) until the deadline (exclusive), and `CLOSED` at/after the deadline. A null start means immediate recruitment.
- Deleted projects, explicitly closed projects (`closedAt`), selected projects, and projects whose transaction status is not `NONE` remain closed even if the dates are edited.
- Lists apply these rules before counting and pagination; recommendations and application submission use the same rules. Reads do not write status changes back to the database.
- Project detail adds `myApplication: { id, status } | null` for the authenticated viewer only; guests receive null.
- The frontend refreshes project reads every 30 seconds and after bookmark/application changes. Project query caches are separated by user ID.
- `/projects?bookmarkedOnly=true` opens the saved-project view, initially including all recruitment states.

## Deliveries (Sprint 3 B)

| Method | Path                                           | Access                                                     |
| ------ | ---------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/contracts/:contractId/delivery`              | Authenticated contract parties                             |
| POST   | `/contracts/:contractId/delivery`              | Contract FREELANCER, signed/paid/in progress               |
| POST   | `/contracts/:contractId/delivery/upload-url`   | Contract FREELANCER before final submission                |
| POST   | `/contracts/:contractId/delivery/download-url` | Contract parties, submitted attachments only               |
| PATCH  | `/deliveries/:deliveryId/approve`              | Contract CLIENT; approves delivery and releases settlement |

- Final submission is unique per contract; text/link-only submission does not need Storage credentials.
- Attachments use private Supabase object paths, not public URLs. Uploads require a bucket limit of 10 MiB or less. At most five files may be submitted.
- Approval updates Delivery, Project, Payment, and completion/review notifications in one database transaction. A failed settlement rolls back the entire approval.
- [Delivery setup, payloads, error cases, and A/C integration contract](./DELIVERIES.md).

## Planned groups

- `/users`
- `/profiles`
- `/notifications`
- `/contracts`
- `/payments`
- `/reviews`

Swagger UI is available at `/api-docs` while the backend is running.
