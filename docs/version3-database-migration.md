# Version.3 database migration guide

Version.3 stores one operational state snapshot plus hashed sessions. File mode remains available for local/external server use, while PostgreSQL and Google Sheets are the production-oriented storage paths.

## Storage modes

- `file`: stores the Version.3 snapshot in `VERSION3_LOCAL_DATA_FILE`.
- `postgres`: stores the snapshot in PostgreSQL JSONB and sessions as token hashes.
- `google-sheets`: stores the snapshot and sessions in Google Sheets through the server-side adapter.
- `memory`: disposable local verification only.

## PostgreSQL environment

```text
VERSION3_STORAGE_DRIVER=postgres
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database
VERSION3_DATABASE_POOL_MAX=5
VERSION3_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_ALLOWED_ORIGINS=<official-ui-origin>
```

## Migration flow

1. Stop writes to the old file-backed server.
2. Back up the current `VERSION3_LOCAL_DATA_FILE`.
3. Run a dry run.

```bash
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:version3-file-to-db -- --file .version3-local-data.json --dry-run
```

4. If the summary is correct, write to PostgreSQL.

```bash
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:version3-file-to-db -- --file .version3-local-data.json --yes
```

5. Start and verify the server.

```bash
VERSION3_STORAGE_DRIVER=postgres VERSION3_DATABASE_URL=postgres://user:password@host:5432/database VERSION3_ADMIN_INITIAL_PASSWORD=replace-me VERSION3_LOCAL_SERVER_PASSWORD=replace-me pnpm run server:version3
VERSION3_STORAGE_DRIVER=postgres VERSION3_DATABASE_URL=postgres://user:password@host:5432/database VERSION3_ADMIN_INITIAL_PASSWORD=replace-me VERSION3_LOCAL_SERVER_PASSWORD=replace-me pnpm run verify:version3-server
```

## Role normalization

The migration tool converts legacy role aliases into canonical Version.3 roles:

- `owner`, `admin`, `system` -> `admin`
- `staff`, `manager` -> `manager`
- `teacher`, `coach` -> `coach`
- `student`, `artist` -> `artist`

The same normalization applies to account requests, notice target roles, and calendar event target roles.

## Rollback

Keep the source JSON file and `.bak` files until the migrated server passes verification and a real-user smoke test. To roll back, stop the new server and restart file mode with the preserved `VERSION3_LOCAL_DATA_FILE`.
