# Sprint 3 B — 납품, 비공개 파일, 완료 처리

## 현재 범위와 통합 경계

- 기준: `develop` c9afe4b (결제/정산 PR #19 포함).
- 실제 JWT의 사용자와 계약 당사자를 비교한다. 의뢰인은 Project.clientId, 프리랜서는 Contract.application.freelancerId이다.
- 제출은 선택된 지원서의 SIGNED 계약 + Project.IN_PROGRESS + Payment.ESCROWED에서만 가능하다.
- Delivery.contractId의 기존 unique 제약과 계약 행 잠금으로 최종 제출 1회를 보장한다. DB 스키마 변경/마이그레이션은 없다.
- A의 결제/정산 PR #19를 반영해 `releasePaymentForContract`를 같은 데이터베이스 트랜잭션으로 연결했다. 결제·수수료 계산은 복제하지 않는다.
- C의 리뷰 PR #18은 자동 병합하지 않았다. 완료 알림과 화면 링크는 C팀이 요청한 `/contracts/:contractId/review`를 사용한다.

## API

기준 경로 `/api/v1`. 모든 요청은 JWT 인증 필수이며, 계약 당사자만 조회할 수 있다.

| Method | Path                                         | 설명                                                      |
| ------ | -------------------------------------------- | --------------------------------------------------------- |
| GET    | /contracts/:contractId/delivery              | 납품/당사자/프로젝트 상태/가능한 행동/업로드 정책 조회    |
| POST   | /contracts/:contractId/delivery              | 계약 프리랜서의 최종 제출                                 |
| POST   | /contracts/:contractId/delivery/upload-url   | 계약 프리랜서의 일회성 객체 경로와 signed upload URL 발급 |
| POST   | /contracts/:contractId/delivery/download-url | 실제 제출에 포함된 파일의 임시 다운로드 URL 발급          |
| PATCH  | /deliveries/:deliveryId/approve              | 계약 CLIENT의 승인, 프로젝트 완료 및 에스크로 정산        |

제출 입력:

```json
{
  "message": "완성한 결과물 설명 (10~5000자)",
  "resultUrl": "https://example.com/result",
  "attachmentUrls": ["contract-uuid/freelancer-uuid/object-uuid/result.pdf"]
}
```

resultUrl은 선택 값이며 http/https만 허용한다. attachmentUrls는 **공개 URL이 아니라 서버 발급 객체 경로 배열**이다. 최대 5개, 중복 불가. 파일 없는 설명/링크 제출은 Storage 키 없이도 작동한다.

업로드 입력: `{ filename, contentType, size }`. 응답: `{ path, signedUrl }`. 브라우저는 반환 URL에 PUT FormData로 업로드한다. 앱 JWT, 쿠키, 관리자 키를 Storage에 전달하지 않는다. 업로드 성공한 경로만 최종 제출한다. 제출 시 서버가 실제 Storage 객체의 존재·크기·MIME를 다시 확인한다.

다운로드 입력: `{ path }`. 제출 기록에 포함된 경로인지 검사 후 60초 signed URL을 발급한다. 링크를 발급받은 사람은 만료 전 링크를 공유할 수 있으므로 로그/외부 공유에 포함하지 않는다. 조회/서명 URL 응답은 `Cache-Control: no-store`이다.

주요 오류: 인증 없음 401, 타 계약/역할 403, 없는 계약/첨부 404, 진행 단계/중복 409, 입력 오류 400, 저장소 설정/정산 무결성 오류 503.

## Supabase 준비 (관리자 작업, 자동 실행하지 않음)

1. **Private bucket**을 만든다. 권장 이름은 `deliveries`이다.
2. 파일당 크기 제한을 **10 MiB (10485760 bytes) 이하**로 설정한다. 제한이 없거나 더 큰 버킷에는 업로드 URL을 발급하지 않는다.
3. 필요하면 버킷 MIME 허용 목록도 아래 정책과 맞춘다. 공개/anon 사용자에게 객체 읽기·쓰기 권한을 열지 않는다.
4. 백엔드에만 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`을 설정한다. 기존 버킷 기본값 `workbridge-files`는 유지하므로 deliveries 사용 시 이름을 명시한다.
5. 관리자 키를 VITE_ 변수, 프론트 코드, GitHub 커밋에 넣지 않는다.
6. 개발/운영 브라우저에서 실제 업로드·다운로드 및 저장소 장애를 점검한다. 키와 버킷이 없는 로컬 자동 테스트는 SDK를 대체하므로 실제 Supabase 검증과 다르다.

정책: PDF, ZIP, PNG, JPG/JPEG, WebP, TXT, DOCX, XLSX, PPTX. 파일명은 120자 이하 문자/숫자 시작, 문자·숫자·공백·점·밑줄·하이픈 허용. 파일 확장자와 실제 저장 MIME 모두 검사한다. 악성코드 스캔은 구현 범위에 포함하지 않으므로 알 수 없는 첨부파일 실행에 주의한다.

Signed upload URL은 Supabase의 기본 만료 시간(현재 2시간)을 따른다. `upsert=false`로 기존 파일 덮어쓰기를 막는다. 폼에서 첨부 취소하거나 제출하지 않은 업로드는 즉시 삭제하지 않는다. 운영 시 만료 시간 이후 제출에 참조되지 않는 객체만 정리하는 정책을 별도로 적용해야 한다. 버킷 이름을 변경하면 기존 납품 경로가 다른 버킷을 가리키므로 기존 파일 이전 계획 없이 변경하지 않는다.

공식 참고: [Signed upload](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl), [Signed download](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl).

## A팀 정산 연결

`backend/src/features/deliveries/delivery.service.ts`의 `ReleaseContractPayment`:

```ts
type ReleaseContractPayment = (
  contractId: string,
  transaction: Prisma.TransactionClient,
) => Promise<unknown>;
```

라우터는 `createDeliveryRouter(releasePaymentForContract)`로 등록한다. `releasePaymentForContract`는 선택적으로 전달받은 `Prisma.TransactionClient`를 저장소까지 전달하므로 납품 승인과 정산이 같은 트랜잭션에서 처리된다. 인자 없이 호출하는 기존 결제 테스트와 사용 방식도 유지한다.

승인 처리 순서:

1. CLIENT 본인 확인 → 계약 행 잠금 → 진행/결제 상태 재확인.
2. Delivery.SUBMITTED → APPROVED, approvedAt 기록.
3. Project.IN_PROGRESS → COMPLETED 조건부 변경.
4. 같은 transaction으로 A의 정산 함수 호출. A가 Payment.RELEASED, releasedAt, platformFee, settlementAmount를 기록한다.
5. 같은 transaction으로 Payment.RELEASED와 필수 정산 기록을 확인한다.
6. 양 당사자에게 PROJECT_COMPLETED, REVIEW_REQUEST 생성.

오류나 무효한 정산 결과는 전체 트랜잭션을 롤백한다. 이는 MVP 내부 정산 상태 처리 경계이며 실제 은행 송금 기능이 아니다. 외부 송금까지 필요하면 DB 롤백으로 되돌릴 수 없으므로 별도 설계가 필요하다.

## C팀 리뷰 연결

REVIEW_REQUEST의 targetUrl과 완료 화면 링크는 `/contracts/:contractId/review`이다. C PR #18 병합 후 실제 리뷰 화면이 제공된다. 계약 화면은 납품 진입 링크만 추가했다. C의 projectTransactionStatus 추가와 계약 화면 변경을 병합 시 보존한다.

## 화면과 검증

`/contracts/:contractId/delivery`: 프리랜서 제출 폼, 의뢰인 확인/다운로드/승인, 완료 후 리뷰 이동. 로그인/대기/오류/재시도/정산 준비 상태를 구분한다. 조회 캐시는 사용자 ID와 역할로 분리하고 계정 또는 계약 변경 시 입력 상태를 초기화한다.

검증 명령:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

추가 수동 검증: 로컬 전용 DB에서 CLIENT/FREELANCER 계정으로 제출·조회·중복 차단·알림 확인. 동시 승인·정산 실패 롤백·중복 정산 방지, C 병합 후 리뷰 이동을 검증한다. 공유 DB 초기화·시드 또는 실제 결제를 실행하지 않는다.

### 2026-10-14 로컬 확인 결과

- 타입 검사, ESLint, 전체 테스트 275개(프론트 81, 백엔드 194), 빌드 통과. 이 PR에서 새 테스트 71개를 추가했다.
- 실제 로컬 PostgreSQL: 동시 제출 201/409, 제출/알림 각 1건, 타 사용자 403, 미인증 401 확인.
- 정산 어댑터 실패 시 납품/프로젝트/결제/알림 전체 롤백 확인. 동시 승인 시 정산 호출 1회와 양측 완료/리뷰 알림 확인.
- 브라우저: 프리랜서 설명·링크 제출 → 의뢰인 알림 → 납품 상세 조회까지 확인. 최신 정산 함수 연결 후 실제 브라우저 승인 흐름은 재검증한다.
- Storage SDK 경계는 자동 테스트로 검증했으며 실제 Supabase 전송은 미검증이다. 실제 Toss 결제, C 리뷰 화면, 배포 E2E도 별도 통합 검증이 필요하다.
- 로컬 검증용 Payment는 `LOCAL_TEST_FIXTURE`이며 실제 결제/송금이 아니다.
- 프론트 단일 번들 500 kB 초과 경고는 비차단 경고로 남아 있다. GitHub CI는 업로드 후 별도로 확인해야 한다.
