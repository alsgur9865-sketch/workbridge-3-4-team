# WorkBridge

WorkBridge는 의뢰인과 프리랜서를 연결하는 양면형 외주 프로젝트 플랫폼 MVP입니다. 프로젝트 등록, 지원, 지원자 선정, 금액 협의, 계약, 샌드박스 결제, 납품, 정산, 알림, 북마크, AI 가격 분석, 상호 리뷰 기능을 포함합니다.

## 최종 기술 스택

- 프론트엔드: React, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui 스타일 컴포넌트
- 클라이언트 데이터 관리: TanStack Query, Zustand, Axios, React Hook Form, Zod
- 백엔드: Node.js, Express, TypeScript, Zod, JWT, bcrypt, Swagger/OpenAPI
- 데이터베이스: PostgreSQL, Prisma ORM 7
- 외부 서비스: Google OAuth, OpenAI API, Toss Payments Sandbox, Supabase Storage
- 배포: Vercel, Render, Supabase
- 협업 및 개발 도구: GitHub, npm workspaces, ESLint, Prettier, Vitest, Supertest

## 저장소 구조

```text
workbridge/
|- frontend/          React SPA
|- backend/           Express REST API 및 Prisma 스키마
|- packages/shared/   공용 상수 및 스키마
|- docs/              설정, ERD, 팀 문서
|- scripts/           로컬 설정 보조 스크립트
`- .github/workflows/ CI
```

## 사전 준비 사항

- Node.js 24 LTS
- npm 11 이상
- Git
- PostgreSQL 데이터베이스(가급적 Supabase 프로젝트 권장)

## 최초 실행

```bash
npm run setup:env
npm install
```

`backend/.env` 파일에 환경변수를 입력하고, 특히 `DATABASE_URL`을 설정한 뒤 다음 명령어를 실행합니다.

```bash
npm run db:migrate:init
npm run db:seed
npm run dev
```

기본 접속 주소:

- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:4000
- API 상태 확인: http://localhost:4000/api/v1/health
- Swagger UI: http://localhost:4000/api-docs

## 자주 사용하는 명령어

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:studio
npm run db:seed:showcase
```

`npm run db:seed:showcase` 명령어는 기존 개발 데이터를 삭제하지 않고 홈 화면용 프로젝트, 완료된 전체 거래 흐름 예시 1개, 개인정보를 포함하지 않는 리뷰 예시 데이터를 추가하거나 최신 상태로 갱신합니다. 이 명령어는 여러 번 실행해도 동일한 결과를 유지하도록 설계되어 있으며, `NODE_ENV=production` 환경에서는 실행되지 않도록 차단되어 있습니다.

GitHub, Supabase, Vercel, Render를 연결하기 전에는 `docs/SETUP.md`를 먼저 확인하세요.
