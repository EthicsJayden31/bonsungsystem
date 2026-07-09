# Google Sheets / Apps Script 저장소 설정

본성 스테이지는 Vercel 또는 별도 Version.3 API 서버에서 운영 화면을 실행하고, 운영 데이터는 Google Sheets 계열 저장소에 보관할 수 있습니다. 브라우저가 직접 Google Sheet 주소를 입력하거나 더미 프리뷰 화면을 여는 구조가 아닙니다.

## 권장 방식 1: 서버 측 Google Sheets 어댑터

서버가 Google Sheets API를 사용해 `_version3_state`와 `_version3_sessions` 시트에 전체 상태와 세션을 저장합니다.

필수 환경 변수:

```text
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_SESSION_SECRET=<long-random-secret>
```

설정 확인:

```bash
pnpm run setup:version3-google-sheets
pnpm run verify:version3-google-sheets
```

기존 파일 데이터를 Google Sheets 상태 시트로 옮길 때:

```bash
pnpm run migrate:version3-google-sheets
```

## 권장 방식 2: Vercel/PostgreSQL 버퍼 + Apps Script 동기화

사용자 입력은 먼저 Version.3 API가 PostgreSQL에 저장하고, 별도 동기화 작업이 Apps Script Web App으로 미러링합니다.

필수 환경 변수 예시:

```text
VERSION3_STORAGE_DRIVER=postgres
VERSION3_DATABASE_URL=<postgres-url>
NEXT_PUBLIC_ENABLE_BUFFERED_APPS_SCRIPT_SYNC=true
VERSION3_APPS_SCRIPT_SYNC_ENABLED=true
VERSION3_APPS_SCRIPT_ENDPOINT=<google-apps-script-web-app-url>
VERSION3_APPS_SCRIPT_SYNC_LOGIN_ID=admin
VERSION3_APPS_SCRIPT_SYNC_PASSWORD=<apps-script-admin-password>
CRON_SECRET=<long-random-secret>
```

## Apps Script 코드

Apps Script 코드는 `apps-script/version3-apps-script.gs`를 사용합니다. 이전 `google-apps-script/Code.gs` 경로는 제거되었습니다.

초기 계정 역할은 다음 네 가지입니다.

```text
admin
manager
coach
artist
```

기존 `owner`, `teacher`, `student` 값이 들어온 경우 Apps Script와 Version.3 서버는 각각 `admin`, `coach`, `artist`로 정규화합니다.

## 보안 원칙

- Google Sheet 자체를 공개 공유하지 않습니다.
- 서비스 계정 JSON, Apps Script Web App URL, 동기화 비밀번호는 Git에 올리지 않습니다.
- 브라우저 localStorage를 운영 데이터 원본으로 사용하지 않습니다.
- 운영 점검은 공식 UI와 Version.3 API를 통해 진행합니다.
