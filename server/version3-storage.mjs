import { createHash, createHmac, createSign } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export async function createVersion3StorageAdapter(options = {}) {
  const driver = normalizeStorageDriver(options.driver, options.databaseUrl);
  if (driver === "postgres") {
    if (!options.databaseUrl) throw new Error("VERSION3_DATABASE_URL is required when VERSION3_STORAGE_DRIVER=postgres.");
    const adapter = new PostgresStorageAdapter(options.databaseUrl);
    await adapter.initialize();
    return adapter;
  }
  if (driver === "google-sheets") {
    const adapter = new GoogleSheetsStorageAdapter(options);
    await adapter.initialize();
    return adapter;
  }
  if (driver === "memory") return new MemoryStorageAdapter();
  return new FileStorageAdapter({
    dataFileSetting: options.dataFileSetting || ".version3-local-data.json",
    backupEnabled: options.backupEnabled !== false
  });
}

export function hashSessionToken(token) {
  const secret = String(process.env.VERSION3_SESSION_SECRET || "");
  if (secret) return createHmac("sha256", secret).update(String(token || "")).digest("base64url");
  return createHash("sha256").update(String(token || "")).digest("base64url");
}

function normalizeStorageDriver(value, databaseUrl) {
  const driver = String(value || "").trim().toLowerCase();
  if (driver === "postgres" || driver === "google-sheets" || driver === "file" || driver === "memory") return driver;
  if (databaseUrl) return "postgres";
  return "file";
}

class MemoryStorageAdapter {
  mode = "memory";
  persistenceEnabled = false;
  backupEnabled = false;
  dataFilePath = "";
  supportsSyncOutbox = false;

  async loadState() {
    return null;
  }

  async saveState() {
    return;
  }

  async listBackups() {
    return [];
  }

  async createSession() {
    return;
  }

  async readSession() {
    return null;
  }

  async deleteSession() {
    return 0;
  }

  async deleteAccountSessions() {
    return 0;
  }

  async keepOnlySession() {
    return 0;
  }

  async markSyncPending() {
    return { supported: false, storageMode: this.mode };
  }

  async syncStatus() {
    return {
      supported: false,
      storageMode: this.mode,
      pending: false,
      pendingRevision: 0,
      lastSyncedRevision: 0,
      syncingRevision: 0,
      leaseUntil: "",
      lastEnqueuedAt: "",
      lastAttemptAt: "",
      lastSuccessAt: "",
      lastError: "",
      failedAttempts: 0
    };
  }

  async claimPendingSync() {
    return null;
  }

  async completePendingSync() {
    return;
  }
}

class FileStorageAdapter extends MemoryStorageAdapter {
  constructor({ dataFileSetting, backupEnabled }) {
    super();
    const setting = String(dataFileSetting || "").trim();
    if (!setting || setting.toLowerCase() === "memory") {
      this.mode = "memory";
      this.persistenceEnabled = false;
      this.backupEnabled = false;
      this.dataFilePath = "";
      return;
    }
    this.mode = "file";
    this.persistenceEnabled = true;
    this.backupEnabled = backupEnabled;
    this.dataFilePath = resolve(process.cwd(), setting);
  }

  async loadState() {
    if (!this.persistenceEnabled || !existsSync(this.dataFilePath)) return null;
    return JSON.parse(readFileSync(this.dataFilePath, "utf8"));
  }

  async saveState(snapshot) {
    if (!this.persistenceEnabled) return;
    mkdirSync(dirname(this.dataFilePath), { recursive: true });
    if (this.backupEnabled && existsSync(this.dataFilePath)) {
      copyFileSync(this.dataFilePath, backupPathFor(this.dataFilePath));
    }
    const tempPath = `${this.dataFilePath}.${process.pid}.tmp`;
    writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
    renameSync(tempPath, this.dataFilePath);
  }

  async listBackups() {
    if (!this.persistenceEnabled || !this.backupEnabled || !existsSync(dirname(this.dataFilePath))) return [];
    const directory = dirname(this.dataFilePath);
    const prefix = `${basename(this.dataFilePath)}.`;
    return readdirSync(directory)
      .filter((name) => name.startsWith(prefix) && name.endsWith(".bak"))
      .map((name) => {
        const stats = statSync(resolve(directory, name));
        return {
          name,
          sizeBytes: stats.size,
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

class PostgresStorageAdapter extends MemoryStorageAdapter {
  mode = "postgres";
  persistenceEnabled = true;
  backupEnabled = true;
  dataFilePath = "postgres://version3_state";
  supportsSyncOutbox = true;

  constructor(databaseUrl) {
    super();
    this.databaseUrl = databaseUrl;
    this.pool = null;
  }

  async initialize() {
    const { Pool } = await import("pg");
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      max: Number(process.env.VERSION3_DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    });
    await this.withClient(async (client) => {
      await client.query("set statement_timeout = '10s'");
      await client.query(`
        create table if not exists version3_state (
          id text primary key,
          data jsonb not null,
          revision bigint not null default 0,
          updated_at timestamptz not null default now()
        )
      `);
      await client.query(`
        create table if not exists version3_sessions (
          token_hash text primary key,
          account_id text not null,
          expires_at timestamptz not null,
          created_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now()
        )
      `);
      await client.query("create index if not exists version3_sessions_account_idx on version3_sessions (account_id)");
      await client.query("create index if not exists version3_sessions_expires_idx on version3_sessions (expires_at)");
      await client.query(`
        create table if not exists version3_sync_state (
          id text primary key,
          pending_revision bigint not null default 0,
          last_synced_revision bigint not null default 0,
          syncing_revision bigint,
          lease_until timestamptz,
          last_enqueued_at timestamptz,
          last_attempt_at timestamptz,
          last_success_at timestamptz,
          last_error text,
          failed_attempts integer not null default 0,
          updated_at timestamptz not null default now()
        )
      `);
    });
  }

  async loadState() {
    return this.withClient(async (client) => {
      const result = await client.query("select data from version3_state where id = $1", ["main"]);
      return result.rows[0]?.data || null;
    });
  }

  async saveState(snapshot) {
    await this.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("set local statement_timeout = '10s'");
        await client.query(
          "insert into version3_state (id, data, revision, updated_at) values ($1, $2::jsonb, 0, now()) on conflict (id) do nothing",
          ["main", JSON.stringify(snapshot)]
        );
        await client.query("select revision from version3_state where id = $1 for update", ["main"]);
        await client.query(
          "update version3_state set data = $2::jsonb, revision = revision + 1, updated_at = now() where id = $1",
          ["main", JSON.stringify(snapshot)]
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async listBackups() {
    return [];
  }

  async createSession(tokenHash, session) {
    await this.withClient(async (client) => {
      await client.query(
        `
          insert into version3_sessions (token_hash, account_id, expires_at, created_at, last_seen_at)
          values ($1, $2, $3, now(), now())
          on conflict (token_hash)
          do update set account_id = excluded.account_id, expires_at = excluded.expires_at, last_seen_at = now()
        `,
        [tokenHash, session.accountId, session.expiresAt]
      );
    });
  }

  async readSession(tokenHash) {
    if (!tokenHash) return null;
    return this.withClient(async (client) => {
      await client.query("delete from version3_sessions where expires_at <= now()");
      const result = await client.query(
        "update version3_sessions set last_seen_at = now() where token_hash = $1 and expires_at > now() returning account_id, expires_at",
        [tokenHash]
      );
      const row = result.rows[0];
      return row ? { accountId: row.account_id, expiresAt: new Date(row.expires_at).toISOString() } : null;
    });
  }

  async deleteSession(tokenHash) {
    if (!tokenHash) return 0;
    return this.withClient(async (client) => {
      const result = await client.query("delete from version3_sessions where token_hash = $1", [tokenHash]);
      return result.rowCount || 0;
    });
  }

  async deleteAccountSessions(accountId, exceptTokenHash = "") {
    return this.withClient(async (client) => {
      const result = await client.query(
        "delete from version3_sessions where account_id = $1 and ($2 = '' or token_hash <> $2)",
        [accountId, exceptTokenHash]
      );
      return result.rowCount || 0;
    });
  }

  async keepOnlySession(activeTokenHash, accountId) {
    return this.withClient(async (client) => {
      const result = await client.query(
        "delete from version3_sessions where account_id = $2 and token_hash <> $1",
        [activeTokenHash, accountId]
      );
      return result.rowCount || 0;
    });
  }

  async markSyncPending(reason = "database-save") {
    return this.withClient(async (client) => {
      await client.query("set statement_timeout = '10s'");
      await client.query(
        `
          insert into version3_sync_state (id, pending_revision, last_enqueued_at, last_error, updated_at)
          values ('main', 0, now(), null, now())
          on conflict (id) do nothing
        `
      );
      const result = await client.query(
        `
          update version3_sync_state
          set pending_revision = greatest(
                pending_revision,
                coalesce((select revision from version3_state where id = 'main'), pending_revision)
              ),
              last_enqueued_at = now(),
              last_error = case when failed_attempts = 0 then null else last_error end,
              updated_at = now()
          where id = 'main'
          returning pending_revision, last_synced_revision
        `
      );
      const row = result.rows[0] || {};
      return {
        supported: true,
        storageMode: this.mode,
        pendingRevision: Number(row.pending_revision || 0),
        lastSyncedRevision: Number(row.last_synced_revision || 0)
      };
    });
  }

  async syncStatus() {
    return this.withClient(async (client) => {
      await client.query("set statement_timeout = '10s'");
      await client.query(
        `
          insert into version3_sync_state (id, pending_revision, last_synced_revision, updated_at)
          values ('main', 0, 0, now())
          on conflict (id) do nothing
        `
      );
      const result = await client.query(
        `
          select
            coalesce((select revision from version3_state where id = 'main'), 0) as local_revision,
            pending_revision,
            last_synced_revision,
            syncing_revision,
            lease_until,
            last_enqueued_at,
            last_attempt_at,
            last_success_at,
            last_error,
            failed_attempts
          from version3_sync_state
          where id = 'main'
        `
      );
      return postgresSyncStatus(this.mode, result.rows[0] || {});
    });
  }

  async claimPendingSync({ force = false, leaseSeconds = 90 } = {}) {
    return this.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("set local statement_timeout = '10s'");
        await client.query(
          `
            insert into version3_sync_state (id, pending_revision, last_synced_revision, updated_at)
            values ('main', 0, 0, now())
            on conflict (id) do nothing
          `
        );
        const result = await client.query(
          `
            select
              s.data,
              s.revision as local_revision,
              q.pending_revision,
              q.last_synced_revision,
              q.syncing_revision,
              q.lease_until,
              q.failed_attempts
            from version3_state s
            cross join version3_sync_state q
            where s.id = 'main' and q.id = 'main'
            for update
          `
        );
        const row = result.rows[0];
        if (!row) {
          await client.query("commit");
          return null;
        }

        const localRevision = Number(row.local_revision || 0);
        const pendingRevision = Math.max(Number(row.pending_revision || 0), localRevision);
        const lastSyncedRevision = Number(row.last_synced_revision || 0);
        const leaseActive = row.lease_until && new Date(row.lease_until).getTime() > Date.now();
        if (!force && (pendingRevision <= lastSyncedRevision || leaseActive)) {
          await client.query("commit");
          return null;
        }

        await client.query(
          `
            update version3_sync_state
            set pending_revision = $1,
                syncing_revision = $2,
                lease_until = now() + ($3 || ' seconds')::interval,
                last_attempt_at = now(),
                updated_at = now()
            where id = 'main'
          `,
          [pendingRevision, localRevision, String(Math.max(30, Number(leaseSeconds || 90)))]
        );
        await client.query("commit");
        return {
          revision: localRevision,
          pendingRevision,
          lastSyncedRevision,
          snapshot: row.data
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async completePendingSync(revision, result = {}) {
    const targetRevision = Number(revision || 0);
    await this.withClient(async (client) => {
      await client.query("set statement_timeout = '10s'");
      if (result.ok) {
        await client.query(
          `
            update version3_sync_state
            set last_synced_revision = greatest(last_synced_revision, $1),
                syncing_revision = null,
                lease_until = null,
                last_success_at = now(),
                last_error = null,
                failed_attempts = 0,
                updated_at = now()
            where id = 'main'
          `,
          [targetRevision]
        );
        return;
      }

      await client.query(
        `
          update version3_sync_state
          set syncing_revision = null,
              lease_until = null,
              last_error = $2,
              failed_attempts = failed_attempts + 1,
              updated_at = now()
          where id = 'main' and ($1 = 0 or syncing_revision = $1 or syncing_revision is null)
        `,
        [targetRevision, String(result.error || "Apps Script sync failed.").slice(0, 2000)]
      );
    });
  }

  async withClient(callback) {
    const client = await this.pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }
}

class GoogleSheetsStorageAdapter extends MemoryStorageAdapter {
  mode = "google-sheets";
  persistenceEnabled = true;
  backupEnabled = false;

  constructor(options = {}) {
    super();
    const serviceAccount = googleServiceAccountCredentials({
      serviceAccountEmail: options.googleServiceAccountEmail,
      privateKey: options.googlePrivateKey,
      serviceAccountJson: options.googleServiceAccountJson,
      serviceAccountJsonFile: options.googleServiceAccountJsonFile
    });
    this.spreadsheetId = stringEnv(options.googleSheetsSpreadsheetId || process.env.VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID);
    this.serviceAccountEmail = serviceAccount.serviceAccountEmail;
    this.privateKey = serviceAccount.privateKey;
    this.stateSheet = stringEnv(options.stateSheet || process.env.VERSION3_GOOGLE_SHEETS_STATE_SHEET || "_version3_state");
    this.sessionsSheet = stringEnv(options.sessionsSheet || process.env.VERSION3_GOOGLE_SHEETS_SESSIONS_SHEET || "_version3_sessions");
    this.writeMirrors = process.env.VERSION3_GOOGLE_SHEETS_WRITE_MIRRORS !== "false";
    this.dataFilePath = this.spreadsheetId ? `google-sheets://${this.spreadsheetId}/${this.stateSheet}` : "google-sheets://missing";
    this.accessToken = "";
    this.accessTokenExpiresAt = 0;
    this.loadedRevision = null;
  }

  async initialize() {
    this.assertConfigured();
    await this.ensureSchema();
  }

  assertConfigured() {
    const missing = missingGoogleSheetsEnv({
      spreadsheetId: this.spreadsheetId,
      serviceAccountEmail: this.serviceAccountEmail,
      privateKey: this.privateKey
    });
    if (missing.length) throw new Error(`Google Sheets storage is missing required environment values: ${missing.join(", ")}`);
  }

  async ensureSchema() {
    const titles = await this.sheetTitles();
    const requiredTabs = [this.stateSheet, this.sessionsSheet, ...(this.writeMirrors ? mirrorSheetNames() : [])];
    const requests = requiredTabs
      .filter((title) => !titles.has(title))
      .map((title) => ({ addSheet: { properties: { title } } }));
    if (requests.length) await this.batchUpdateSpreadsheet({ requests });

    await this.batchUpdateValues([
      { range: `${this.stateSheet}!A1:D1`, values: [["state_id", "revision", "updated_at", "data_json"]] },
      { range: `${this.sessionsSheet}!A1:F1`, values: [["token_hash", "account_id", "expires_at", "created_at", "last_seen_at", "revoked_at"]] },
      ...(this.writeMirrors ? mirrorHeaderUpdates() : [])
    ]);
  }

  async loadState() {
    const row = await this.mainStateRow();
    if (!row) {
      this.loadedRevision = 0;
      return null;
    }
    this.loadedRevision = numberValue(row[1], 0);
    const raw = row[3] || "";
    return raw ? JSON.parse(raw) : null;
  }

  async saveState(snapshot) {
    const current = await this.mainStateRow();
    const currentRevision = current ? numberValue(current[1], 0) : 0;
    if (this.loadedRevision !== null && currentRevision !== this.loadedRevision) {
      await retryRevisionRead();
      const latest = await this.mainStateRow();
      const latestRevision = latest ? numberValue(latest[1], 0) : 0;
      if (latestRevision !== this.loadedRevision) {
        const error = new Error("Google Sheets state revision changed before save. Retry the Version.3 action.");
        error.statusCode = 409;
        throw error;
      }
    }

    const nextRevision = currentRevision + 1;
    const updatedAt = new Date().toISOString();
    await this.batchUpdateValues([
      {
        range: `${this.stateSheet}!A2:D2`,
        values: [["main", String(nextRevision), updatedAt, JSON.stringify(snapshot)]]
      }
    ]);
    this.loadedRevision = nextRevision;
    if (this.writeMirrors) await this.writeMirrorTabs(snapshot);
  }

  async initializeState(snapshot, { force = false } = {}) {
    const current = await this.mainStateRow();
    if (current && !force) {
      const error = new Error("Google Sheets Version.3 state already exists. Use --force to overwrite it.");
      error.statusCode = 409;
      throw error;
    }
    this.loadedRevision = current ? numberValue(current[1], 0) : 0;
    await this.saveState(snapshot);
  }

  async listBackups() {
    return [];
  }

  async createSession(tokenHash, session) {
    const rows = await this.sessionRows();
    const now = new Date().toISOString();
    const nextRows = upsertSessionRow(rows, {
      tokenHash,
      accountId: session.accountId,
      expiresAt: session.expiresAt,
      createdAt: now,
      lastSeenAt: now,
      revokedAt: ""
    });
    await this.writeSessionRows(nextRows);
  }

  async readSession(tokenHash) {
    if (!tokenHash) return null;
    const rows = await this.sessionRows();
    const now = Date.now();
    const row = rows.find((item) => item[0] === tokenHash);
    if (!row || row[5] || new Date(row[2]).getTime() <= now) return null;
    row[4] = new Date().toISOString();
    await this.writeSessionRows(rows);
    return { accountId: row[1], expiresAt: new Date(row[2]).toISOString() };
  }

  async deleteSession(tokenHash) {
    if (!tokenHash) return 0;
    const rows = await this.sessionRows();
    const row = rows.find((item) => item[0] === tokenHash && !item[5]);
    if (!row) return 0;
    row[5] = new Date().toISOString();
    await this.writeSessionRows(rows);
    return 1;
  }

  async deleteAccountSessions(accountId, exceptTokenHash = "") {
    const rows = await this.sessionRows();
    const now = new Date().toISOString();
    let count = 0;
    for (const row of rows) {
      if (row[1] === accountId && row[0] !== exceptTokenHash && !row[5]) {
        row[5] = now;
        count += 1;
      }
    }
    if (count) await this.writeSessionRows(rows);
    return count;
  }

  async keepOnlySession(activeTokenHash, accountId) {
    const rows = await this.sessionRows();
    const now = new Date().toISOString();
    let count = 0;
    for (const row of rows) {
      if (row[1] === accountId && row[0] !== activeTokenHash && !row[5]) {
        row[5] = now;
        count += 1;
      }
    }
    if (count) await this.writeSessionRows(rows);
    return count;
  }

  async mainStateRow() {
    const values = await this.valuesGet(`${this.stateSheet}!A2:D2`);
    const row = values[0] || null;
    return row && row[0] ? row : null;
  }

  async sessionRows() {
    const values = await this.valuesGet(`${this.sessionsSheet}!A2:F`);
    return values
      .filter((row) => row[0])
      .map((row) => [row[0] || "", row[1] || "", row[2] || "", row[3] || "", row[4] || "", row[5] || ""]);
  }

  async writeSessionRows(rows) {
    await this.batchClearValues([`${this.sessionsSheet}!A2:F`]);
    if (!rows.length) return;
    await this.batchUpdateValues([{ range: `${this.sessionsSheet}!A2:F${rows.length + 1}`, values: rows }]);
  }

  async writeMirrorTabs(snapshot) {
    const updates = mirrorDefinitions().map(({ sheet, headers, rows }) => ({
      range: `${sheet}!A1:${columnName(headers.length)}${Math.max(1, rows(snapshot).length + 1)}`,
      values: [headers, ...rows(snapshot)]
    }));
    await this.batchClearValues(updates.map((item) => item.range.replace(/!A1:.+$/, "!A:Z")));
    await this.batchUpdateValues(updates);
  }

  async sheetTitles() {
    const data = await this.sheetsFetch("GET", "?fields=sheets.properties.title");
    return new Set((data.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
  }

  async valuesGet(range) {
    const data = await this.sheetsFetch("GET", `/values/${encodeURIComponent(range)}?majorDimension=ROWS`);
    return data.values || [];
  }

  async batchUpdateValues(data) {
    if (!data.length) return;
    await this.sheetsFetch("POST", "/values:batchUpdate", {
      valueInputOption: "RAW",
      data
    });
  }

  async batchClearValues(ranges) {
    if (!ranges.length) return;
    await this.sheetsFetch("POST", "/values:batchClear", { ranges });
  }

  async batchUpdateSpreadsheet(body) {
    await this.sheetsFetch("POST", ":batchUpdate", body);
  }

  async sheetsFetch(method, path, body) {
    const token = await this.googleAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}${path}`;
    return fetchWithBackoff(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body == null ? undefined : JSON.stringify(body)
    });
  }

  async googleAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000) return this.accessToken;
    const now = Math.floor(Date.now() / 1000);
    const assertion = [
      base64UrlJson({ alg: "RS256", typ: "JWT" }),
      base64UrlJson({
        iss: this.serviceAccountEmail,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
      })
    ].join(".");
    const signature = createSign("RSA-SHA256").update(assertion).end().sign(this.privateKey, "base64url");
    const response = await fetchWithBackoff("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${assertion}.${signature}`
      })
    });
    this.accessToken = response.access_token;
    this.accessTokenExpiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
    return this.accessToken;
  }
}

export function googleSheetsSetupSummary() {
  return {
    requiredEnv: [
      "VERSION3_STORAGE_DRIVER=google-sheets",
      "VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID",
      "VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON or VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL",
      "VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON or VERSION3_GOOGLE_PRIVATE_KEY",
      "VERSION3_SESSION_SECRET"
    ],
    requiredTabs: ["_version3_state", "_version3_sessions", ...mirrorSheetNames()],
    stateHeaders: ["state_id", "revision", "updated_at", "data_json"],
    sessionHeaders: ["token_hash", "account_id", "expires_at", "created_at", "last_seen_at", "revoked_at"]
  };
}

export function googleServiceAccountCredentials(values = {}) {
  const inlineJson = parseGoogleServiceAccountJson(
    values.serviceAccountJson || process.env.VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON,
    "VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON"
  );
  const fileJson = parseGoogleServiceAccountJsonFile(
    values.serviceAccountJsonFile || process.env.VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON_FILE
  );

  return {
    serviceAccountEmail: stringEnv(
      values.serviceAccountEmail ||
      process.env.VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      inlineJson.client_email ||
      fileJson.client_email
    ),
    privateKey: restorePrivateKey(
      values.privateKey ||
      process.env.VERSION3_GOOGLE_PRIVATE_KEY ||
      inlineJson.private_key ||
      fileJson.private_key
    )
  };
}

export function missingGoogleSheetsEnv(values = {}) {
  const missing = [];
  const serviceAccount = googleServiceAccountCredentials({
    serviceAccountEmail: values.serviceAccountEmail,
    privateKey: values.privateKey,
    serviceAccountJson: values.serviceAccountJson,
    serviceAccountJsonFile: values.serviceAccountJsonFile
  });
  if (!stringEnv(values.spreadsheetId || process.env.VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID)) missing.push("VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!serviceAccount.serviceAccountEmail) missing.push("VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL or VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccount.privateKey) missing.push("VERSION3_GOOGLE_PRIVATE_KEY or VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!stringEnv(process.env.VERSION3_SESSION_SECRET)) missing.push("VERSION3_SESSION_SECRET");
  return missing;
}

function parseGoogleServiceAccountJsonFile(value) {
  const file = stringEnv(value);
  if (!file) return {};
  try {
    return parseGoogleServiceAccountJson(readFileSync(resolve(file), "utf8"), "VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON_FILE");
  } catch (error) {
    if (String(error?.message || "").includes("service account JSON")) throw error;
    throw new Error(`Google Sheets service account JSON file in VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON_FILE could not be read.`);
  }
}

function parseGoogleServiceAccountJson(value, source) {
  const raw = stringEnv(value);
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Google Sheets service account JSON in ${source} must be valid JSON.`);
  }
  return {
    client_email: stringEnv(parsed.client_email),
    private_key: restorePrivateKey(parsed.private_key)
  };
}

function backupPathFor(path) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${path}.${stamp}.bak`;
}

function mirrorDefinitions() {
  return [
    { sheet: "students", headers: ["id", "name", "status", "teacher_id", "teacher_name"], rows: (state) => rowsFor(state.students, ["id", "name", "status", "teacherId", "teacherName"]) },
    { sheet: "teachers", headers: ["id", "name", "major", "role"], rows: (state) => rowsFor(state.teachers, ["id", "name", "major", "role"]) },
    { sheet: "lessons", headers: ["id", "student_id", "teacher_id", "starts_at", "status"], rows: (state) => rowsFor(state.lessons, ["id", "studentId", "teacherId", "startsAt", "status"]) },
    { sheet: "attendance", headers: ["id", "lesson_id", "student_id", "status", "makeup_needed"], rows: (state) => rowsFor(state.attendance, ["id", "lessonId", "studentId", "status", "makeupNeeded"]) },
    { sheet: "lesson_notes", headers: ["id", "lesson_id", "student_id", "teacher_id", "date"], rows: (state) => rowsFor(state.lessonNotes, ["id", "lessonId", "studentId", "teacherId", "date"]) },
    { sheet: "consultations", headers: ["id", "student_id", "student_name", "status", "assigned_to"], rows: (state) => rowsFor(state.consultations, ["id", "studentId", "studentName", "status", "assignedTo"]) },
    { sheet: "payments", headers: ["id", "student_id", "title", "status", "amount"], rows: (state) => rowsFor(state.payments, ["id", "studentId", "title", "status", "amount"]) },
    { sheet: "reservations", headers: ["id", "room_id", "student_id", "starts_at", "ends_at", "status"], rows: (state) => rowsFor(state.reservations, ["id", "roomId", "studentId", "startsAt", "endsAt", "status"]) },
    { sheet: "accounts_public", headers: ["id", "login_id", "name", "role", "status", "linked_student_id"], rows: (state) => rowsFor(publicAccountsForMirror(state.accounts), ["id", "loginId", "name", "role", "status", "linkedStudentId"]) },
    { sheet: "audit_logs", headers: ["id", "actor_id", "action", "target_type", "target_id", "created_at"], rows: (state) => rowsFor(state.auditLogs, ["id", "actorId", "action", "targetType", "targetId", "createdAt"]) }
  ];
}

function mirrorSheetNames() {
  return mirrorDefinitions().map((item) => item.sheet);
}

function mirrorHeaderUpdates() {
  return mirrorDefinitions().map(({ sheet, headers }) => ({ range: `${sheet}!A1:${columnName(headers.length)}1`, values: [headers] }));
}

function rowsFor(items = [], keys = []) {
  return (Array.isArray(items) ? items : []).map((item) => keys.map((key) => serializeCell(item?.[key])));
}

function publicAccountsForMirror(accounts = []) {
  return (Array.isArray(accounts) ? accounts : []).map(({ password, ...account }) => account);
}

function serializeCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnName(count) {
  let index = count;
  let name = "";
  while (index > 0) {
    index -= 1;
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26);
  }
  return name || "A";
}

function upsertSessionRow(rows, session) {
  const nextRows = rows.filter((row) => row[0] !== session.tokenHash);
  nextRows.unshift([session.tokenHash, session.accountId, session.expiresAt, session.createdAt, session.lastSeenAt, session.revokedAt]);
  return nextRows;
}

function postgresSyncStatus(storageMode, row = {}) {
  const localRevision = Number(row.local_revision || 0);
  const pendingRevision = Math.max(Number(row.pending_revision || 0), localRevision);
  const lastSyncedRevision = Number(row.last_synced_revision || 0);
  const leaseUntil = row.lease_until ? new Date(row.lease_until).toISOString() : "";
  const syncingRevision = Number(row.syncing_revision || 0);
  return {
    supported: true,
    storageMode,
    pending: pendingRevision > lastSyncedRevision,
    localRevision,
    pendingRevision,
    lastSyncedRevision,
    syncingRevision,
    leaseUntil,
    lastEnqueuedAt: row.last_enqueued_at ? new Date(row.last_enqueued_at).toISOString() : "",
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : "",
    lastSuccessAt: row.last_success_at ? new Date(row.last_success_at).toISOString() : "",
    lastError: row.last_error || "",
    failedAttempts: Number(row.failed_attempts || 0)
  };
}

async function retryRevisionRead() {
  await new Promise((resolveRetry) => setTimeout(resolveRetry, 150));
}

async function fetchWithBackoff(url, options, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : {};
      if (response.ok) return parsed;
      const error = new Error(parsed.error?.message || `Google Sheets request failed with ${response.status}.`);
      error.statusCode = response.status === 429 ? 503 : response.status;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts - 1) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await new Promise((resolveBackoff) => setTimeout(resolveBackoff, 250 * 2 ** attempt));
  }
  throw lastError || new Error("Google Sheets request failed.");
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function restorePrivateKey(value) {
  return stringEnv(value).replace(/\\n/g, "\n");
}

function stringEnv(value) {
  return String(value || "").trim();
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
