# Version.3 Vercel/PostgreSQL -> Apps Script Sync

This path stores user writes in the Version.3 API first, then mirrors the current state to Apps Script/Google Sheets. The browser does not call Apps Script directly during normal operation.

```mermaid
flowchart LR
  UI["Version.3 UI"] --> API["/api/version3"]
  API --> DB["PostgreSQL version3_state"]
  DB --> Q["version3_sync_state"]
  Cron["Vercel Cron"] --> Sync["/api/version3/sync/apps-script"]
  Sync --> Script["Apps Script dataImport"]
  Script --> Sheets["Google Sheets 운영 DB"]
```

## Required environment

```env
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
NEXT_PUBLIC_ENABLE_BUFFERED_APPS_SCRIPT_SYNC=true

VERSION3_STORAGE_DRIVER=postgres
VERSION3_DATABASE_URL=<postgres-connection-url>
VERSION3_LOCAL_SERVER_PASSWORD=<long-random-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_SESSION_SECRET=<long-random-session-secret>
VERSION3_ALLOWED_ORIGINS=<official-vercel-origin>

VERSION3_APPS_SCRIPT_SYNC_ENABLED=true
VERSION3_APPS_SCRIPT_ENDPOINT=<google-apps-script-web-app-url>
VERSION3_APPS_SCRIPT_SYNC_LOGIN_ID=admin
VERSION3_APPS_SCRIPT_SYNC_PASSWORD=<apps-script-admin-password>
CRON_SECRET=<long-random-cron-secret>
VERSION3_APPS_SCRIPT_SYNC_ACCOUNTS=false
```

## Notes

- `VERSION3_APPS_SCRIPT_SYNC_ACCOUNTS=false` is the default so Apps Script account rows are not overwritten accidentally.
- Vercel Hobby plans only allow once-per-day cron jobs. The project cron is set to `0 18 * * *`, which runs once daily around 03:00 KST. Use manual sync when immediate mirroring is needed.
- If `CRON_SECRET` is set, sync requests must include `Authorization: Bearer <CRON_SECRET>`.

## Manual sync

```powershell
curl -X POST https://<vercel-domain>/api/version3/sync/apps-script `
  -H "Authorization: Bearer <CRON_SECRET>" `
  -H "Content-Type: application/json" `
  -d "{\"force\":true}"
```

## Status

Managers/Admins can inspect `/sync/status` through the Version.3 API. A healthy state has no pending revision and no recent sync error.
