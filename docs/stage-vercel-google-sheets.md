# 본성 스테이지 Vercel API + Google Sheets

This is the direct server-side Google Sheets storage path. The Vercel API Function runs 본성 스테이지 and stores state in Google Sheets through the Google Sheets API.

## Required environment

```env
NEXT_PUBLIC_BONSUNG_API_BASE_URL=/api/stage
BONSUNG_STORAGE_DRIVER=google-sheets
BONSUNG_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
BONSUNG_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
BONSUNG_SESSION_SECRET=<long-random-secret>
BONSUNG_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
BONSUNG_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
BONSUNG_ALLOWED_ORIGINS=<official-vercel-origin>
```

You can provide the service account through `BONSUNG_GOOGLE_SERVICE_ACCOUNT_JSON`, or through `BONSUNG_GOOGLE_SERVICE_ACCOUNT_EMAIL` plus `BONSUNG_GOOGLE_PRIVATE_KEY`.

## Setup and verification

```bash
pnpm run setup:stage-google-sheets
pnpm run migrate:stage-google-sheets
pnpm run verify:stage-google-sheets
pnpm run verify:stage-vercel-api
```

## Sheets created by the adapter

- `_stage_state`: the canonical 본성 스테이지 state snapshot
- `_stage_sessions`: hashed server sessions
- Mirror tabs such as `students`, `teachers`, `lessons`, `consultations`, `payments`, `accounts_public`, `audit_logs`

## Security

Do not commit spreadsheet IDs for private deployments, service account JSON, private keys, session secrets, real passwords, or exported data.
