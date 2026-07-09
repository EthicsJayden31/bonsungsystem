# 본성 스테이지 database migration guide

본성 스테이지 stores one operational state snapshot plus hashed sessions. File mode remains available for local/external server use, while PostgreSQL and Google Sheets are the production-oriented storage paths.

## Storage modes

- `file`: stores the 본성 스테이지 snapshot in `BONSUNG_LOCAL_DATA_FILE`.
- `postgres`: stores the snapshot in PostgreSQL JSONB and sessions as token hashes.
- `google-sheets`: stores the snapshot and sessions in Google Sheets through the server-side adapter.
- `memory`: disposable local verification only.

## PostgreSQL environment

```text
BONSUNG_STORAGE_DRIVER=postgres
BONSUNG_DATABASE_URL=postgres://user:password@host:5432/database
BONSUNG_DATABASE_POOL_MAX=5
BONSUNG_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
BONSUNG_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
BONSUNG_ALLOWED_ORIGINS=<official-ui-origin>
```

## Migration flow

1. Stop writes to the old file-backed server.
2. Back up the current `BONSUNG_LOCAL_DATA_FILE`.
3. Run a dry run.

```bash
BONSUNG_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:stage-file-to-db -- --file .stage-local-data.json --dry-run
```

4. If the summary is correct, write to PostgreSQL.

```bash
BONSUNG_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:stage-file-to-db -- --file .stage-local-data.json --yes
```

5. Start and verify the server.

```bash
BONSUNG_STORAGE_DRIVER=postgres BONSUNG_DATABASE_URL=postgres://user:password@host:5432/database BONSUNG_ADMIN_INITIAL_PASSWORD=replace-me BONSUNG_LOCAL_SERVER_PASSWORD=replace-me pnpm run server:stage
BONSUNG_STORAGE_DRIVER=postgres BONSUNG_DATABASE_URL=postgres://user:password@host:5432/database BONSUNG_ADMIN_INITIAL_PASSWORD=replace-me BONSUNG_LOCAL_SERVER_PASSWORD=replace-me pnpm run verify:stage-server
```

## Role normalization

The migration tool converts legacy role aliases into canonical 본성 스테이지 roles:

- `owner`, `admin`, `system` -> `admin`
- `staff`, `manager` -> `manager`
- `teacher`, `coach` -> `coach`
- `student`, `artist` -> `artist`

The same normalization applies to account requests, notice target roles, and calendar event target roles.

## Rollback

Keep the source JSON file and `.bak` files until the migrated server passes verification and a real-user smoke test. To roll back, stop the new server and restart file mode with the preserved `BONSUNG_LOCAL_DATA_FILE`.
