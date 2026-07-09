# Version.3 운영 배포 체크리스트

## 1. 필수 환경 변수

```text
NODE_ENV=production
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
VERSION3_SERVER_HOST=0.0.0.0
VERSION3_ALLOWED_ORIGINS=https://ethicsjayden31.github.io
VERSION3_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_SESSION_TTL_HOURS=12
```

Google Sheets 저장소를 쓸 때:

```text
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_SESSION_SECRET=<long-random-secret>
```

## 2. 검증

```bash
pnpm run verify:version3-production-env
pnpm run verify:version3-server
pnpm run verify:version3-vercel-api
pnpm run verify:version3-cleanup
```

외부 서버를 연결할 때:

```bash
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm run verify:version3-release
VERSION3_SERVER_VERIFY_BASE_URL=https://your-version3-server.example pnpm run verify:version3-server
```

## 3. 첫 운영 절차

1. Version.3 API를 배포합니다.
2. `/health`가 정상인지 확인합니다.
3. Google Sheets 또는 Apps Script 저장소 연결을 확인합니다.
4. Admin으로 로그인합니다.
5. Manager, Coach, Artist 계정을 실제 운영 기준에 맞게 정리합니다.
6. 상담, 수업, 출결, 수납, 공지, 데이터 내보내기, 감사 로그를 확인합니다.

## 4. 배포 불가 조건

- 운영 UI가 localhost API를 바라봄
- 운영 저장소가 `memory` 모드임
- 기본 비밀번호가 운영 환경에 남아 있음
- `pages-preview` 또는 `/version3-test` 기준 검증을 요구함
- 실제 역할 데이터가 `owner`, `teacher`, `student`로 남아 있음
