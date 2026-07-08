# Version.3 Vercel API + Google Sheets 직접 연동 보류 문서

이 문서는 Vercel API Route가 Google Sheets API를 직접 호출하는 이전 후보안을 보존하기 위한 보류 문서입니다. 현재 파일럿의 기본 목표는 이 경로가 아닙니다.

## 보류 사유

- Vercel Function에서 Google 서비스 계정 키를 직접 관리해야 합니다.
- 서비스 계정 이메일, private key, 세션 비밀값이 모두 맞아야 하므로 시연 전 준비 부담이 큽니다.
- 현재 파일럿은 빠른 확인과 운영자 조정을 위해 `Vercel UI -> Google Apps Script Web App -> Google Sheets` 구조를 사용합니다.
- 이 경로는 향후 별도 서버나 안전한 API 계층으로 전환할 때 비교 후보로만 남깁니다.

## 보존된 코드 위치

- `api/version3/[...path].js`
- `server/version3-storage.mjs`
- `tools/setup-version3-google-sheets.mjs`
- `tools/migrate-version3-file-to-google-sheets.mjs`
- `tools/verify-version3-google-sheets.mjs`
- `tools/verify-version3-vercel-api-local.mjs`

## 사용하지 않는 환경변수

현재 Apps Script 파일럿에서는 아래 값을 Vercel 운영 환경에 넣지 않습니다.

```env
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
VERSION3_GOOGLE_PRIVATE_KEY=<private-key-with-escaped-newlines>
VERSION3_SESSION_SECRET=<long-random-secret>
```

특히 실제 스프레드시트 ID, 서비스 계정 JSON, private key는 이 문서와 저장소에 기록하지 않습니다.

## 재개 조건

이 후보를 다시 검토하려면 다음 조건을 먼저 만족해야 합니다.

- Vercel 환경변수 관리 권한과 키 회전 절차가 정해져 있어야 합니다.
- `/api/version3/health`가 설정 누락 없이 통과해야 합니다.
- 세션 토큰 저장, 감사 로그, 권한 필터링이 Apps Script 파일럿과 같은 수준으로 검증되어야 합니다.
- 운영 Google Sheet와 Preview Sheet를 분리하는 정책이 확정되어야 합니다.

## 현재 기준

현재 파일럿 기준 문서는 [version3-apps-script-pilot.md](./version3-apps-script-pilot.md)입니다.
