# Version.3 Vercel API + Google Sheets

This is the direct server-side Google Sheets storage path. The Vercel API Function runs Version.3 and stores state in Google Sheets through the Google Sheets API.

## Required environment

```env
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_SESSION_SECRET=<long-random-secret>
VERSION3_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_ALLOWED_ORIGINS=<official-vercel-origin>
```

You can provide the service account through `VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON`, or through `VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL` plus `VERSION3_GOOGLE_PRIVATE_KEY`.

## Setup and verification

```bash
pnpm run setup:version3-google-sheets
pnpm run migrate:version3-google-sheets
pnpm run verify:version3-google-sheets
pnpm run verify:version3-vercel-api
```

## Sheets created by the adapter

- `_version3_state`: the canonical Version.3 state snapshot
- `_version3_sessions`: hashed server sessions
- Mirror tabs such as `students`, `teachers`, `lessons`, `consultations`, `payments`, `accounts_public`, `audit_logs`

## Security

Do not commit spreadsheet IDs for private deployments, service account JSON, private keys, session secrets, real passwords, or exported data.
