# Version.3 production deployment checklist

This checklist keeps the public GitHub Pages UI connected to a separate Version.3 server. The public UI must not depend on preview data, localStorage-only operations, or Apps Script transition paths for production use.

## 1. Required environment

Use `.env.production.example` as the public server baseline.

- `NODE_ENV=production`
- `VERSION3_SERVER_HOST=0.0.0.0`
- `VERSION3_LOCAL_SERVER_PASSWORD`: seed password for manager, teacher, and student accounts; must not be `version3`.
- `VERSION3_OWNER_INITIAL_PASSWORD`: initial owner/system account password; set as a private secret and change after first login.
- `VERSION3_ALLOWED_ORIGINS`: official UI origin only, for example `https://ethicsjayden31.github.io`.
- `VERSION3_LOCAL_DATA_FILE`: persistent JSON file path such as `/data/version3-data.json` when file storage is used.
- `VERSION3_STORAGE_DRIVER`: optional `file`, `memory`, or `postgres`; omit for automatic file/Postgres selection.
- `VERSION3_DATABASE_URL`: optional PostgreSQL connection string. When set, Version.3 stores state in JSONB and server sessions as token hashes.
- `VERSION3_DATABASE_POOL_MAX`: optional PostgreSQL pool limit, default `5`.
- `VERSION3_SESSION_TTL_HOURS`: usually `12`.

Verify the server environment before publishing it:

```bash
pnpm run verify:version3-production-env
```

## 2. Data storage

File mode remains the default and writes to `VERSION3_LOCAL_DATA_FILE`. Keep that path on a host volume, not inside a disposable container filesystem. File mode creates `.bak` copies before overwriting existing data.

PostgreSQL mode is enabled by setting `VERSION3_DATABASE_URL` or `VERSION3_STORAGE_DRIVER=postgres`. The server creates `version3_state` for the main JSONB snapshot and `version3_sessions` for hashed session tokens. Session tokens are never stored in plaintext in PostgreSQL.

For file-to-PostgreSQL migration steps, see `docs/version3-database-migration.md`.

Migration is exposed as `migrate:version3-file-to-db` so operators can dry-run the existing JSON file before writing it to PostgreSQL.

## 3. Docker and Render

The `Build Version.3 Server Image` workflow publishes:

```text
ghcr.io/ethicsjayden31/bonsung-version3-server
```

Render deployments may use `render.yaml`. In file mode, mount `/data` and set `VERSION3_LOCAL_DATA_FILE=/data/version3-data.json`. In PostgreSQL mode, set `VERSION3_DATABASE_URL` as a secret and keep the database backup/restore plan outside the repo.

Do not commit real passwords, database URLs, API keys, export files, local data files, or backup files.

## 4. External server verification

After the server is reachable at an HTTPS URL, run the `Verify External Version.3 Server` workflow with `server_url`.

It runs:

- `verify:version3-release`: confirms a public HTTPS API URL and blocks transition-only preview flags unless explicitly allowed.
- `verify:version3-server`: checks login, role permissions, account requests, student creation, lessons, reservations, consultations, export/import guards, `/data-backups`, and audit logs.

The opening workflow can be checked locally or against a target server:

```bash
pnpm run verify:version3-opening-workflow
```

For an external server, set `VERSION3_OPENING_WORKFLOW_BASE_URL` and the matching owner/seed passwords through environment variables.

## 5. Public UI connection

Run `Deploy GitHub Pages Preview` with:

- `server_url`: verified HTTPS Version.3 server URL.
- `save_verified_server_url`: normally `true`.

The workflow verifies the server, saves `VERSION3_API_BASE_URL`, injects it as `NEXT_PUBLIC_VERSION3_API_BASE_URL`, and rebuilds the GitHub Pages UI.

## 6. First production run

1. Deploy the Version.3 server.
2. Confirm `/health`.
3. Run `verify:version3-production-env`.
4. Run `verify:version3-server` against the deployed server.
5. Run `verify:version3-opening-workflow`.
6. Connect GitHub Pages through the verified `server_url`.
7. Log in as owner and immediately change the initial password.
8. Create real manager, teacher, and student accounts.
9. Confirm notices, consultations, payments, lessons, reservations, exports, and audit logs from real accounts.

## 7. Not production-ready if

- The public UI still points to localhost or a transition preview mode.
- The server uses memory storage.
- File storage is running without a persistent volume.
- Production secrets use local defaults.
- `verify:version3-server` or `verify:version3-opening-workflow` has not passed for the deployed URL.
