# WorkBridge API Specification

> Last updated: 2026-10-14  
> API prefix: `/api/v1`  
> Production API: `https://workbridge-3-4-team.onrender.com/api/v1`  
> Swagger UI: `https://workbridge-3-4-team.onrender.com/api-docs`

WorkBridge의 현재 구현 기준 API 명세입니다. 모든 경로는 별도 표기가 없는 한 `/api/v1` 기준입니다.

## 1. Common conventions

### Authentication

- Access token: JSON 응답으로 발급하며 이후 요청에 `Authorization: Bearer <token>`으로 전송합니다.
- Refresh token: `workbridge_refresh_token` HttpOnly cookie에 저장합니다.
- 서버는 refresh token 원문이 아니라 hash를 DB에 저장합니다.
- `POST /auth/refresh` 호출 시 access/refresh token을 모두 회전합니다.
- 운영 환경 refresh cookie는 `HttpOnly`, `Secure`, `SameSite=None`으로 설정됩니다.
- 역할은 `CLIENT` 또는 `FREELANCER`이며, 역할 변경 후 토큰을 재발급해 JWT role claim을 즉시 동기화합니다.

### Success response

일반적인 JSON 응답은 다음 형태입니다.

```json
{
  "success": true,
  "data": {}
}
```

목록 API는 endpoint에 따라 `meta` 등 추가 필드를 포함할 수 있습니다.

### Error response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

- Zod validation 실패: HTTP `400`, code `VALIDATION_ERROR`
- 인증 실패: 일반적으로 HTTP `401`
- 역할/소유권 위반: 일반적으로 HTTP `403`
- 리소스 없음: 일반적으로 HTTP `404`
- 현재 단계에서 수행할 수 없는 요청: 일반적으로 HTTP `409`

## 2. Endpoint summary

### Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | API 상태 확인 |
| GET | `/health/database` | Public | PostgreSQL 연결 상태 확인 |

### Authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/auth/google` | Public | Google OAuth 로그인 시작 |
| GET | `/auth/google/callback` | Public | Google OAuth callback 처리 후 frontend로 redirect |
| POST | `/auth/signup` | Public | 이메일 회원가입 |
| POST | `/auth/login` | Public | 이메일 로그인 및 token 발급 |
| PATCH | `/auth/role` | Authenticated | 최초 역할 선택 |
| POST | `/auth/refresh` | Refresh cookie | access/refresh token 회전 |
| POST | `/auth/logout` | Public / cookie | refresh session 제거 및 cookie 삭제 |

#### `POST /auth/signup`

```json
{
  "email": "client@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

- `email`: valid email, 최대 255자
- `password`: 8~72자
- `name`: 1~100자
- 성공: `201 Created`

#### `POST /auth/login`

```json
{
  "email": "client@example.com",
  "password": "password123"
}
```

성공 시 사용자 정보와 `accessToken`을 반환하고 refresh token cookie를 설정합니다.

#### `PATCH /auth/role`

```json
{
  "role": "CLIENT"
}
```

허용 값:

- `CLIENT`
- `FREELANCER`

역할 선택 성공 시 새로운 access/refresh token을 발급합니다.

---

### Users / Profiles

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/users/me` | Authenticated | 내 사용자/역할/프로필 조회 |
| PATCH | `/users/me` | Authenticated | 이름, 소개, 프로필 이미지 수정 |
| PUT | `/users/me/client-profile` | CLIENT | 의뢰인 프로필 생성/수정 |
| PUT | `/users/me/freelancer-profile` | FREELANCER | 프리랜서 프로필 생성/수정 |

#### `PATCH /users/me`

하나 이상의 필드가 필요합니다.

```json
{
  "name": "홍길동",
  "bio": "프로젝트 소개",
  "profileImageUrl": "https://example.com/profile.png"
}
```

#### `PUT /users/me/client-profile`

```json
{
  "companyName": "WorkBridge",
  "industry": "IT",
  "websiteUrl": "https://example.com"
}
```

#### `PUT /users/me/freelancer-profile`

```json
{
  "mainCategory": "Web Development",
  "careerYears": 3,
  "desiredRate": 5000000,
  "portfolioUrl": "https://example.com/portfolio",
  "skills": ["React", "TypeScript"]
}
```

현재 UI category 값:

- `Web Development`
- `Design`
- `Marketing`
- `Other`

skills는 최대 10개입니다.

---

### Projects

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/projects` | Public, optional auth | 프로젝트 목록/검색/필터 |
| GET | `/projects/recommended` | FREELANCER | 프로필 기반 추천 프로젝트 |
| GET | `/projects/:projectId` | Public, optional auth | 프로젝트 상세 |
| POST | `/projects` | CLIENT | 프로젝트 등록 |
| PATCH | `/projects/:projectId` | CLIENT owner | 프로젝트 수정 |
| DELETE | `/projects/:projectId` | CLIENT owner | 프로젝트 soft delete |
| POST | `/projects/:projectId/bookmark` | Authenticated | 북마크 추가 |
| DELETE | `/projects/:projectId/bookmark` | Authenticated | 북마크 제거 |
| POST | `/projects/price-estimate` | CLIENT | OpenAI 기반 프로젝트 적정 가격 분석 |

#### `GET /projects` query

| Query | Type | Description |
| --- | --- | --- |
| `page` | integer | 기본 1 |
| `limit` | integer 1~50 | 기본 12 |
| `search` | string | 제목/검색 조건 |
| `category` | string | 카테고리 필터 |
| `status` | `SCHEDULED \| OPEN \| CLOSED` | 모집 상태 |
| `skill` | string | 기술 필터 |
| `minBudget` | number | 최소 예산 |
| `maxBudget` | number | 최대 예산 |
| `sort` | `newest \| budgetLow \| budgetHigh \| deadline` | 정렬, 기본 newest |
| `bookmarkedOnly` | `true \| false` | 내 북마크만 조회 |

인증된 사용자는 응답에서 자신의 `isBookmarked` 상태를 확인할 수 있습니다.

#### Project recruitment rules

- 모집 시작 전: `SCHEDULED`
- 모집 시작 시각 이상, 마감 전: `OPEN`
- 모집 마감 이상: `CLOSED`
- `recruitmentStartAt = null`이면 즉시 모집 시작으로 처리합니다.
- 프로젝트가 명시적으로 닫혔거나, 지원자가 선택됐거나, 거래 상태가 `NONE`이 아니면 모집 상태는 닫힌 것으로 처리합니다.
- 삭제된 프로젝트는 목록/추천 대상에서 제외합니다.

#### `GET /projects/recommended`

프리랜서의 `mainCategory`와 skills를 기준으로 최대 12개 프로젝트를 추천합니다.

- skill 일치: 각 2점
- category 일치: 1점
- 동점: 최신 생성순 → project ID 순
- 일치 항목이 없는 프로젝트는 제외
- category와 skills가 모두 없으면 빈 목록 + `meta.profileRequired = true`

각 항목에는 다음 추천 정보가 포함됩니다.

```json
{
  "recommendation": {
    "score": 5,
    "matchedSkills": ["React", "TypeScript"],
    "categoryMatched": true
  }
}
```

#### `POST /projects`

```json
{
  "title": "쇼핑몰 관리자 대시보드 개발",
  "description": "주문과 재고를 관리하는 반응형 관리자 화면을 개발합니다.",
  "category": "Web Development",
  "budget": 4500000,
  "workStartAt": "2026-11-01T09:00:00+09:00",
  "workEndAt": "2026-12-01T18:00:00+09:00",
  "recruitmentStartAt": "2026-10-15T09:00:00+09:00",
  "recruitmentDeadline": "2026-10-25T18:00:00+09:00",
  "skills": ["React", "TypeScript"]
}
```

주요 validation:

- title: 2~200자
- description: 20~5000자
- budget: 0 초과, 최대 10억
- skills: 최대 10개
- 작업 종료일 > 작업 시작일
- 모집 마감일 <= 작업 시작일
- 모집 시작일이 있으면 모집 마감일보다 이전

#### `POST /projects/price-estimate`

```json
{
  "title": "관리자 대시보드 개발",
  "description": "회원 관리, 주문 관리, 통계 차트가 포함된 관리자 대시보드를 개발합니다.",
  "category": "Web Development",
  "estimatedDays": 30,
  "skills": ["React", "TypeScript", "Node.js"]
}
```

응답:

```json
{
  "success": true,
  "data": {
    "estimatedMinAmount": 3000000,
    "estimatedMaxAmount": 6000000,
    "estimatedTotalAmount": 4500000,
    "currency": "KRW",
    "summary": "분석 요약",
    "factors": [
      {
        "label": "기술 스택",
        "impact": "increase",
        "reason": "가격 판단 근거"
      }
    ],
    "assumptions": ["분석 가정"]
  }
}
```

- `OPENAI_MODEL`이 있으면 해당 모델 사용
- 미설정 시 현재 fallback: `gpt-6-luna`
- `OPENAI_API_KEY` 미설정: `503 AI_NOT_CONFIGURED`
- OpenAI 호출/응답 처리 실패: `502 AI_ANALYSIS_FAILED`
- 분석 결과의 `estimatedTotalAmount`는 frontend에서 신규 프로젝트의 budget으로 반영할 수 있습니다.

---

### Bookmarks

북마크는 Project 그룹에 포함됩니다.

- `POST /projects/:projectId/bookmark`: 성공 시 `201`, `isBookmarked: true`
- `DELETE /projects/:projectId/bookmark`: 성공 시 `204 No Content`
- `GET /projects?bookmarkedOnly=true`: 내 북마크 프로젝트 조회

---

### Applications

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/projects/:projectId/applications` | FREELANCER | 프로젝트 지원 |
| GET | `/projects/:projectId/applications` | CLIENT project owner | 해당 프로젝트 지원 목록 |
| GET | `/applications/me` | FREELANCER | 내 지원 목록 |
| GET | `/applications/:applicationId` | Project owner or applicant | 지원 상세 |
| PATCH | `/applications/:applicationId/status` | CLIENT project owner | 지원 수락/거절 |

#### Apply

```json
{
  "introduction": "프로젝트 경험을 바탕으로 안정적으로 개발하겠습니다.",
  "proposedAmount": 4000000,
  "estimatedDays": 30
}
```

- introduction: 10~2000자
- proposedAmount: 양의 정수
- estimatedDays: 1~365
- 동일 프로젝트에 중복 지원 불가
- 모집이 닫힌 프로젝트에는 지원 불가

#### Application status

`PATCH /applications/:applicationId/status`

```json
{
  "status": "ACCEPTED"
}
```

허용 값:

- `ACCEPTED`
- `REJECTED`

지원자를 수락하면:

1. 선택된 application을 `ACCEPTED` 처리
2. 다른 pending application을 자동 거절
3. 프로젝트 모집 종료
4. Project transaction status를 `PRICE_AGREEMENT`로 이동

---

### Price agreement

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/applications/:applicationId/price-offer` | CLIENT project owner | 선택 지원자에게 최종 금액 제안 |
| PATCH | `/applications/:applicationId/price-offer` | Selected FREELANCER | 최종 금액 수락/거절 |

#### Offer

```json
{
  "amount": 4500000
}
```

- `PRICE_AGREEMENT` 단계에서만 가능
- 기존 상태가 `NONE` 또는 `REJECTED`일 때 제안 가능
- 제안 후 `priceOfferStatus = PENDING`

#### Respond

```json
{
  "status": "ACCEPTED"
}
```

- `ACCEPTED`: Project transaction status → `CONTRACT_PENDING`
- `REJECTED`: CLIENT가 재제안 가능

---

### Contracts / E-sign

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/contracts` | CLIENT | 가격 합의 후 계약 생성 |
| GET | `/contracts/:contractId` | Contract parties | 계약 조회 |
| POST | `/contracts/:contractId/sign` | Contract parties | 현재 사용자 전자서명 |

#### `POST /contracts`

```json
{
  "applicationId": "uuid",
  "contractStartAt": "2026-11-01T00:00:00.000Z",
  "contractEndAt": "2026-12-01T00:00:00.000Z",
  "terms": "합의한 업무 범위와 납기, 검수 조건을 준수합니다."
}
```

- `contractStartAt`, `contractEndAt` 생략 시 프로젝트 작업 기간을 사용
- `terms`: 10~5000자
- 가격 합의가 완료된 선택 application만 계약 생성 가능
- 동일 프로젝트/application 계약 중복 생성 불가
- 생성 상태: `DRAFT`

#### Signing

- 한 명 서명: `PARTIALLY_SIGNED`
- 양측 모두 서명: `SIGNED`
- 양측 서명 완료 시 Project transaction status → `PAYMENT_PENDING`

---

### Payments / Escrow

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/contracts/:contractId/payment` | CLIENT contract owner | Toss 결제 주문 준비 |
| POST | `/payments/confirm` | CLIENT contract owner | Toss 결제 승인 및 escrow 상태 반영 |
| GET | `/payments/:paymentId` | Contract parties | 결제/정산 상태 조회 |

#### Prepare payment

SIGNED 계약에 대해 payment order를 준비합니다.

- 신규 생성: `201 Created`
- 이미 존재하는 `READY` payment 재사용: `200 OK`
- Project가 `PAYMENT_PENDING` 단계여야 함

#### Confirm payment

```json
{
  "paymentKey": "toss-payment-key",
  "orderId": "workbridge_order_id",
  "amount": 4500000
}
```

서버는 요청 amount/orderId를 기존 payment와 검증한 뒤 Toss sandbox API를 호출합니다.

성공 시:

1. Toss 승인 완료
2. Payment → `PAID`
3. 내부 escrow 처리 → `ESCROWED`
4. Project → `IN_PROGRESS`
5. platform fee / settlement amount 계산

현재 MVP 정산 규칙:

- 플랫폼 수수료: 10%
- 프리랜서 정산액: 90%
- 실제 외부 payout이 아니라 WorkBridge 내부 payment status 기반 sandbox settlement

주요 오류:

- `400`: payment 데이터 불일치
- `401`: 미인증
- `403`: 계약 CLIENT가 아님
- `404`: payment 없음
- `409`: 현재 상태에서 confirm 불가
- `502`: Toss 승인 실패/외부 API 오류
- `503`: Toss server key 미설정

---

### Delivery / Completion / Settlement

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/contracts/:contractId/delivery` | Contract parties | 납품 조회 |
| POST | `/contracts/:contractId/delivery` | Contract FREELANCER | 최종 납품 제출 |
| POST | `/contracts/:contractId/delivery/upload-url` | Contract FREELANCER | private Storage 업로드 signed URL 발급 |
| POST | `/contracts/:contractId/delivery/download-url` | Contract parties | 제출 첨부파일 다운로드 signed URL 발급 |
| PATCH | `/deliveries/:deliveryId/approve` | Contract CLIENT | 납품 승인 + 프로젝트 완료 + 정산 release |

#### Submit delivery

```json
{
  "message": "최종 작업물을 전달드립니다.",
  "resultUrl": "https://example.com/result",
  "attachmentUrls": [
    "deliveries/contract-id/file.pdf"
  ]
}
```

- message: 10~5000자
- resultUrl: 선택, http/https
- attachmentUrls: 최대 5개
- contract당 최종 납품 1건
- 텍스트/resultUrl만으로도 제출 가능

#### Upload URL

```json
{
  "filename": "result.pdf",
  "contentType": "application/pdf",
  "size": 1048576
}
```

제한:

- 파일 최대 10 MiB
- attachment 최대 5개
- 허용 확장자/MIME:
  - PDF
  - ZIP
  - PNG / JPG / JPEG / WEBP
  - TXT
  - DOCX
  - XLSX
  - PPTX
- private Supabase Storage object path 사용
- public URL을 DB에 저장하지 않음

#### Approve delivery

CLIENT 승인 성공 시 하나의 DB transaction에서:

1. Delivery → `APPROVED`
2. Project → `COMPLETED`
3. ESCROWED Payment → `RELEASED`
4. 완료/리뷰 요청 notification 생성

정산 처리 실패 시 approval transaction 전체가 rollback됩니다.

추가 세부 사항은 [DELIVERIES.md](./DELIVERIES.md)를 참고합니다.

---

### Reviews

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/contracts/:contractId/reviews` | Contract parties | 완료된 계약 상대방 리뷰 작성 |
| GET | `/contracts/:contractId/reviews` | Contract parties | 계약 양측 리뷰 조회 |
| GET | `/users/:userId/reviews` | Authenticated | 특정 사용자가 받은 리뷰/평점 요약 |

#### Create review

```json
{
  "rating": 5,
  "content": "소통이 빠르고 결과물 완성도가 높았습니다.",
  "tags": ["빠른 소통", "높은 완성도", "재협업 희망"]
}
```

- rating: 1~5 정수
- content: 10~1000자
- reviewee는 client에서 받지 않고 서버가 자동으로 계약 상대방으로 결정
- 프로젝트가 `COMPLETED` 상태일 때만 작성 가능
- 동일 계약에서 동일 방향 리뷰는 1회만 가능
- 자기 자신 리뷰 불가

허용 tag:

- 빠른 소통
- 요구사항 명확
- 일정 준수
- 높은 완성도
- 재협업 희망
- 친절한 응대
- 꼼꼼한 피드백

`GET /users/:userId/reviews`는 평균 평점, 리뷰 개수, 최근 리뷰를 반환합니다.

---

### Notifications

모든 notification API는 인증이 필요합니다.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/notifications` | Authenticated | 내 알림 목록 |
| GET | `/notifications/unread-count` | Authenticated | 읽지 않은 알림 개수 |
| PATCH | `/notifications/read-all` | Authenticated | 전체 읽음 처리 |
| PATCH | `/notifications/:notificationId/read` | Notification owner | 단일 알림 읽음 처리 |

현재 구현된 notification type:

- `NEW_APPLICATION`
- `APPLICATION_ACCEPTED`
- `APPLICATION_REJECTED`
- `APPLICATION_AUTO_REJECTED`
- `PROJECT_CLOSED`
- `PRICE_OFFERED`
- `PRICE_OFFER_ACCEPTED`
- `PRICE_OFFER_REJECTED`
- `CONTRACT_SIGN_REQUEST`
- `CONTRACT_SIGNED`
- `PAYMENT_COMPLETED`
- `DELIVERY_SUBMITTED`
- `PROJECT_COMPLETED`
- `REVIEW_REQUEST`

## 3. Main transaction lifecycle

```text
Project NONE
  ↓ CLIENT accepts one application
PRICE_AGREEMENT
  ↓ FREELANCER accepts final price
CONTRACT_PENDING
  ↓ contract created + both parties sign
PAYMENT_PENDING
  ↓ Toss sandbox payment confirmed / escrowed
IN_PROGRESS
  ↓ FREELANCER submits delivery
  ↓ CLIENT approves delivery
COMPLETED
  ↓ payment RELEASED
  ↓ mutual reviews
```

Related state transitions:

```text
Application
PENDING → ACCEPTED | REJECTED

PriceOffer
NONE/REJECTED → PENDING → ACCEPTED | REJECTED

Contract
DRAFT → PARTIALLY_SIGNED → SIGNED

Payment
READY → PAID → ESCROWED → RELEASED

Delivery
SUBMITTED → APPROVED
```

## 4. Authorization summary

| Feature | CLIENT | FREELANCER | Guest |
| --- | ---: | ---: | ---: |
| 프로젝트 목록/상세 | Yes | Yes | Yes |
| 프로젝트 등록/수정/삭제 | Yes (owner) | No | No |
| AI 견적 분석 | Yes | No | No |
| 북마크 | Yes | Yes | No |
| 프로젝트 지원 | No | Yes | No |
| 지원자 선택 | Yes (owner) | No | No |
| 최종 금액 제안 | Yes (owner) | No | No |
| 최종 금액 응답 | No | Yes (selected applicant) | No |
| 계약 생성 | Yes (owner) | No | No |
| 계약 서명 | Yes (party) | Yes (party) | No |
| 결제 | Yes (contract client) | No | No |
| 납품 제출 | No | Yes (contract freelancer) | No |
| 납품 승인 | Yes (contract client) | No | No |
| 리뷰 | Yes (party) | Yes (party) | No |
| 알림 | Yes | Yes | No |

## 5. Integration notes

### Google OAuth

- 지원 provider: Google
- 시작 endpoint: `GET /auth/google`
- callback: `GET /auth/google/callback`
- callback 성공 시 refresh cookie를 설정하고 frontend `/oauth/callback`으로 redirect합니다.

### OpenAI

- API: OpenAI Responses API
- `OPENAI_API_KEY`: 필수
- `OPENAI_MODEL`: 선택
- 현재 fallback model: `gpt-6-luna`
- strict JSON schema 형태로 견적 결과를 받습니다.
- 분석 성공/실패 결과는 `AIPriceAnalysis`에 기록됩니다.

### Toss Payments

- 테스트/제출 환경에서는 Toss Payments sandbox를 사용합니다.
- 결제 확정은 backend가 Toss server key로 수행합니다.
- 결제 후 서비스 내부에서 escrow/settlement 상태를 관리합니다.

### Supabase Storage

- 납품 파일은 private bucket을 사용합니다.
- frontend가 service role key를 사용하지 않습니다.
- backend가 업로드/다운로드용 signed URL을 발급합니다.

## 6. Documentation sources

현재 구현의 최종 source of truth:

1. Express route definitions
2. Zod request schemas
3. Service business rules
4. Prisma schema
5. 이 문서

Swagger UI는 `/api-docs`에서 확인할 수 있으며, 코드의 `@openapi` annotation이 적용된 endpoint를 제공합니다.
