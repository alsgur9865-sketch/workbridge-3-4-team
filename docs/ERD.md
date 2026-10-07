# WorkBridge ERD v1.0

The Prisma schema in `backend/prisma/schema.prisma` is the implementation source of truth.

```mermaid
erDiagram
    USER ||--o| CLIENT_PROFILE : has
    USER ||--o| FREELANCER_PROFILE : has
    FREELANCER_PROFILE ||--o{ FREELANCER_SKILL : owns
    SKILL ||--o{ FREELANCER_SKILL : included_in
    USER ||--o{ PROJECT : creates
    PROJECT ||--o{ PROJECT_SKILL : requires
    SKILL ||--o{ PROJECT_SKILL : included_in
    PROJECT ||--o{ APPLICATION : receives
    USER ||--o{ APPLICATION : submits
    PROJECT o|--o| APPLICATION : selects
    USER ||--o{ AI_PRICE_ANALYSIS : requests
    PROJECT o|--o{ AI_PRICE_ANALYSIS : has
    PROJECT ||--o| CONTRACT : creates
    APPLICATION ||--o| CONTRACT : becomes
    CONTRACT ||--o| PAYMENT : has
    CONTRACT ||--o| DELIVERY : has
    CONTRACT ||--o{ REVIEW : receives
    USER ||--o{ REVIEW : writes
    USER ||--o{ REVIEW : receives
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ BOOKMARK : creates
    PROJECT ||--o{ BOOKMARK : saved_as
```

## Important constraints

- One application per freelancer and project
- One bookmark per user and project
- One review in each direction per contract
- One contract per project and accepted application
- One payment and one final delivery per contract in the MVP
- Project deletion is soft deletion through `deletedAt`
- Recruitment status and transaction status are separate
