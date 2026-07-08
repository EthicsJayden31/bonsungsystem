# Version.3 database migration guide

Version.3 now has a storage adapter boundary. The existing JSON file mode remains supported, and PostgreSQL can be enabled when an operational database is ready.

## Storage modes

- `file`: reads and writes the Version.3 snapshot to `VERSION3_LOCAL_DATA_FILE`; this is the default when no database URL is set.
- `postgres`: stores the main Version.3 snapshot in PostgreSQL JSONB and stores server sessions by token hash.
- `memory`: non-persistent test mode only. Do not use for production.

The server auto-selects PostgreSQL when `VERSION3_DATABASE_URL` is set. `VERSION3_STORAGE_DRIVER` can be set explicitly to `file`, `postgres`, or `memory`.

## PostgreSQL schema

The server creates these tables if they do not exist:

- `version3_state`: one row keyed by `id='main'`, with `data jsonb`, `revision`, and `updated_at`.
- `version3_sessions`: hashed session token rows with `account_id`, `expires_at`, `created_at`, and `last_seen_at`.

The server also creates indexes on `version3_sessions.account_id` and `version3_sessions.expires_at`.

## Environment variables

- `VERSION3_DATABASE_URL`: PostgreSQL connection string. Treat it as a secret.
- `VERSION3_STORAGE_DRIVER`: optional storage mode override.
- `VERSION3_DATABASE_POOL_MAX`: optional database pool limit, default `5`.
- `VERSION3_LOCAL_DATA_FILE`: JSON source file in file mode and source path for migration.
- `VERSION3_OWNER_INITIAL_PASSWORD`: initial owner account password.
- `VERSION3_LOCAL_SERVER_PASSWORD`: seed password for manager, teacher, and student accounts.
- `VERSION3_ALLOWED_ORIGINS`: comma-separated official UI origins.
- `VERSION3_SESSION_TTL_HOURS`: session lifetime.

Never commit real values for passwords, database URLs, session tokens, exports, local data files, or backup files.

## Migration flow

1. Stop writes to the old file-backed server.
2. Keep a copy of the current `VERSION3_LOCAL_DATA_FILE`.
3. Run a dry run:

```bash
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:version3-file-to-db -- --file .version3-local-data.json --dry-run
```

4. If the summary is correct, write to PostgreSQL:

```bash
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:version3-file-to-db -- --file .version3-local-data.json --yes
```

5. Only use `--replace` after taking a backup/export of the current PostgreSQL row:

```bash
VERSION3_DATABASE_URL=postgres://user:password@host:5432/database pnpm run migrate:version3-file-to-db -- --file .version3-local-data.json --yes --replace
```

6. Start the server with PostgreSQL enabled:

```bash
VERSION3_STORAGE_DRIVER=postgres VERSION3_DATABASE_URL=postgres://user:password@host:5432/database VERSION3_OWNER_INITIAL_PASSWORD=replace-me VERSION3_LOCAL_SERVER_PASSWORD=replace-me pnpm run server:version3
```

7. Verify the server:

```bash
VERSION3_STORAGE_DRIVER=postgres VERSION3_DATABASE_URL=postgres://user:password@host:5432/database VERSION3_OWNER_INITIAL_PASSWORD=replace-me VERSION3_LOCAL_SERVER_PASSWORD=replace-me pnpm run verify:version3-server
```

## Role normalization during migration

The migration tool converts legacy role aliases into canonical Version.3 roles:

- `admin` and `system` -> `owner`
- `staff` -> `manager`
- `coach` -> `teacher`
- `artist` -> `student`

The same normalization is applied to account requests, notice target roles, and calendar event target roles.

## Rollback notes

Keep the source JSON file and its `.bak` files until the PostgreSQL deployment has passed verification and real users have completed a smoke test. To roll back, stop the PostgreSQL-backed server and restart file mode with the preserved `VERSION3_LOCAL_DATA_FILE`.
