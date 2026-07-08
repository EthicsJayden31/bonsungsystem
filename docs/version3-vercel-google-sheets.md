# Version.3 Vercel API + Google Sheets 운영 가이드

이 문서는 본성 스테이지 Version.3를 Vercel API Function으로 실행하고, 임시 운영 저장소로 Google Sheets를 사용하는 방법을 정리합니다. 기존 파일 기반 로컬 서버와 GitHub Pages 정적 빌드는 그대로 유지됩니다.

## 구조

- 브라우저 API 기준 주소: `NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3`
- Vercel Function: `api/version3/[...path].js`
- Vercel builds must use the default `pnpm run build` path. `GITHUB_PAGES=true` / `pnpm run build:pages` is only for the static GitHub Pages UI and will not expose the Version.3 API Function.
- 재사용 서버 핸들러: `server/version3-core.mjs`, `server/version3-local-server.mjs`
- 저장소 어댑터: `server/version3-storage.mjs`
- 저장 방식: `VERSION3_STORAGE_DRIVER=google-sheets`

`app/api` 대신 루트 `api/` 디렉터리를 사용합니다. GitHub Pages용 `next build` 정적 산출물과 App Router export 흐름을 건드리지 않으면서 Vercel Functions만 별도로 붙이기 위한 선택입니다.

## Google Sheets 저장소

정본 상태는 `_version3_state` 탭 한 줄에 저장합니다.

| state_id | revision | updated_at | data_json |
| --- | --- | --- | --- |
| main | 증가 숫자 | ISO 시간 | Version.3 전체 JSON |

세션은 `_version3_sessions` 탭에 저장합니다.

| token_hash | account_id | expires_at | created_at | last_seen_at | revoked_at |
| --- | --- | --- | --- | --- | --- |

클라이언트 토큰 원문은 저장하지 않고 `VERSION3_SESSION_SECRET` 기반 HMAC 해시만 저장합니다.

읽기 편의를 위해 다음 미러 탭을 만들 수 있습니다. 이 탭들은 운영 확인용이며 정본은 아닙니다.

`students`, `teachers`, `lessons`, `attendance`, `lesson_notes`, `consultations`, `payments`, `reservations`, `accounts_public`, `audit_logs`

## Vercel 환경변수

Vercel Project Settings의 Environment Variables에만 넣습니다. 저장소에 실제 값은 커밋하지 않습니다.

```env
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
VERSION3_GOOGLE_PRIVATE_KEY=<private-key-with-escaped-newlines>
VERSION3_SESSION_SECRET=<long-random-secret>
VERSION3_ALLOWED_ORIGINS=https://<your-vercel-domain>
VERSION3_SESSION_TTL_HOURS=12
VERSION3_OWNER_INITIAL_PASSWORD=<strong-owner-password>
VERSION3_LOCAL_SERVER_PASSWORD=<strong-seed-password>
```

기존 서버는 예전 admin 별칭도 읽을 수 있지만, 신규 Vercel 설정에서는 `VERSION3_OWNER_INITIAL_PASSWORD`를 사용합니다.

## Google Cloud 및 Sheets 설정

1. Google Cloud 프로젝트에서 Google Sheets API를 활성화합니다.
2. 서비스 계정을 만들고 JSON 키를 발급합니다.
3. 서비스 계정 이메일을 대상 스프레드시트에 편집자로 공유합니다.
4. JSON 키 전체를 `VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON`에 넣거나, JSON 키의 `client_email`을 `VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL`에 넣습니다.
5. 이메일/키 분리 방식을 쓰는 경우 JSON 키의 `private_key`를 `\n` 이스케이프 형태로 `VERSION3_GOOGLE_PRIVATE_KEY`에 넣습니다.
6. 스프레드시트 URL의 ID를 `VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID`에 넣습니다.

## 명령

```powershell
pnpm run setup:version3-google-sheets -- --dry-run
pnpm run setup:version3-google-sheets
pnpm run migrate:version3-google-sheets -- --file=.version3-local-data.json
pnpm run verify:version3-google-sheets
pnpm run verify:version3-vercel-api
```

기존 Google Sheets 상태를 덮어써야 할 때만 `--force`를 붙입니다.

```powershell
pnpm run migrate:version3-google-sheets -- --file=.version3-local-data.json --force
```

## 배포 절차

1. Vercel에 GitHub 저장소를 연결합니다.
2. Build Command는 기존 `pnpm run build`를 사용합니다.
3. Vercel 환경변수를 Production과 Preview에 분리해서 넣습니다.
4. `NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3`를 넣고 재배포합니다.
5. 배포 후 `/api/version3/health`가 응답하는지 확인합니다.
6. Owner 로그인, `/bootstrap`, 예약 충돌, 계정 세션 만료를 확인합니다.

## 보안 기준

- `NEXT_PUBLIC_*` 외의 값은 브라우저 번들에 노출하지 않습니다.
- Google 서비스 계정 키, 세션 비밀키, 초기 비밀번호는 저장소에 커밋하지 않습니다.
- `_version3_sessions`에는 토큰 원문이 아닌 `token_hash`만 저장합니다.
- `VERSION3_ALLOWED_ORIGINS`는 실제 Vercel 도메인만 허용하고 `*`를 쓰지 않습니다.
- 서비스 계정은 필요한 스프레드시트에만 편집 권한을 줍니다.
- Preview와 Production은 가능하면 별도 스프레드시트를 사용합니다.

## 한계

Google Sheets는 임시 저장소입니다. 동시 편집이 많으면 revision 충돌이 발생할 수 있고, Sheets API quota와 행/셀 크기 제한도 영향을 줍니다. 장기 운영 전환 시에는 PostgreSQL 같은 서버용 데이터베이스로 이전하는 것이 안전합니다.

## 롤백

문제가 생기면 Vercel 환경변수에서 `NEXT_PUBLIC_VERSION3_API_BASE_URL`를 기존 외부 서버 주소로 되돌리거나, `VERSION3_STORAGE_DRIVER`를 기존 파일/DB 방식으로 돌립니다. Google Sheets 이전 전의 JSON 파일 export는 검증이 끝날 때까지 보관합니다.
