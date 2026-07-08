import { googleServiceAccountCredentials } from "../server/version3-storage.mjs";

const errors = [];
const warnings = [];

const nodeEnv = readEnv("NODE_ENV");
const password = readEnv("VERSION3_LOCAL_SERVER_PASSWORD");
const ownerPassword = readEnv("VERSION3_OWNER_INITIAL_PASSWORD") || readEnv("VERSION3_ADMIN_INITIAL_PASSWORD");
const host = readEnv("VERSION3_SERVER_HOST") || "127.0.0.1";
const allowedOrigins = splitCsv(readEnv("VERSION3_ALLOWED_ORIGINS") || "*");
const storageDriver = readEnv("VERSION3_STORAGE_DRIVER");
const databaseUrl = readEnv("VERSION3_DATABASE_URL");
const dataFile = readEnv("VERSION3_LOCAL_DATA_FILE") || ".version3-local-data.json";
const googleSheetsSpreadsheetId = readEnv("VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID");
const googleServiceAccountEmail = readEnv("VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL");
const googlePrivateKey = readEnv("VERSION3_GOOGLE_PRIVATE_KEY");
const googleServiceAccountJson = readEnv("VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON");
const googleServiceAccountJsonFile = readEnv("VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON_FILE");
const sessionSecret = readEnv("VERSION3_SESSION_SECRET");
const sessionTtl = readEnv("VERSION3_SESSION_TTL_HOURS") || "12";
const port = readEnv("PORT") || readEnv("VERSION3_LOCAL_SERVER_PORT") || "4303";

if (nodeEnv !== "production") {
  errors.push("NODE_ENV must be production for a public Version.3 server.");
}

if (!password) {
  errors.push("VERSION3_LOCAL_SERVER_PASSWORD must be set.");
} else {
  if (password === "version3") {
    errors.push("VERSION3_LOCAL_SERVER_PASSWORD must not use the local default value.");
  }
  if (password.length < 12) {
    errors.push("VERSION3_LOCAL_SERVER_PASSWORD should be at least 12 characters for public deployment.");
  }
}

if (!ownerPassword) {
  errors.push("VERSION3_OWNER_INITIAL_PASSWORD must be set.");
} else if (ownerPassword.length < 12) {
  errors.push("VERSION3_OWNER_INITIAL_PASSWORD should be at least 12 characters for public deployment.");
}

if (!["0.0.0.0", "::"].includes(host)) {
  warnings.push("VERSION3_SERVER_HOST is not a public bind address. Use 0.0.0.0 on most external hosts.");
}

if (!allowedOrigins.length || allowedOrigins.includes("*")) {
  errors.push("VERSION3_ALLOWED_ORIGINS must name the official UI origin and must not be *.");
}

for (const origin of allowedOrigins) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    errors.push(`VERSION3_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
    continue;
  }

  if (parsed.protocol !== "https:") {
    errors.push(`VERSION3_ALLOWED_ORIGINS must use https origins for public deployment: ${origin}`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    errors.push(`VERSION3_ALLOWED_ORIGINS must contain only origins, not paths or queries: ${origin}`);
  }
}

if (storageDriver && !["postgres", "google-sheets", "file", "memory"].includes(storageDriver)) {
  errors.push("VERSION3_STORAGE_DRIVER must be one of postgres, google-sheets, file, or memory.");
}

if (storageDriver === "postgres" || databaseUrl) {
  if (!databaseUrl) errors.push("VERSION3_DATABASE_URL must be set when VERSION3_STORAGE_DRIVER=postgres.");
} else if (storageDriver === "google-sheets") {
  let googleServiceAccount = { serviceAccountEmail: "", privateKey: "" };
  try {
    googleServiceAccount = googleServiceAccountCredentials({
      serviceAccountEmail: googleServiceAccountEmail,
      privateKey: googlePrivateKey,
      serviceAccountJson: googleServiceAccountJson,
      serviceAccountJsonFile: googleServiceAccountJsonFile
    });
  } catch (error) {
    errors.push(error?.message || "Google Sheets service account JSON is invalid.");
  }

  if (!googleSheetsSpreadsheetId) errors.push("VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID must be set when VERSION3_STORAGE_DRIVER=google-sheets.");
  if (!googleServiceAccount.serviceAccountEmail) errors.push("VERSION3_GOOGLE_SERVICE_ACCOUNT_EMAIL or VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON must be set when VERSION3_STORAGE_DRIVER=google-sheets.");
  if (!googleServiceAccount.privateKey) errors.push("VERSION3_GOOGLE_PRIVATE_KEY or VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON must be set when VERSION3_STORAGE_DRIVER=google-sheets.");
  if (!sessionSecret) {
    errors.push("VERSION3_SESSION_SECRET must be set when VERSION3_STORAGE_DRIVER=google-sheets.");
  } else if (sessionSecret.length < 32) {
    errors.push("VERSION3_SESSION_SECRET should be at least 32 characters for Google Sheets session hashing.");
  }
} else if (!dataFile || dataFile.toLowerCase() === "memory") {
  errors.push("VERSION3_LOCAL_DATA_FILE must point to a persistent file, not memory, unless VERSION3_DATABASE_URL is set.");
} else if (!dataFile.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(dataFile)) {
  warnings.push("VERSION3_LOCAL_DATA_FILE is relative. Use a host volume path such as /data/version3-data.json for public deployment.");
}

const parsedTtl = Number(sessionTtl);
if (!Number.isInteger(parsedTtl) || parsedTtl < 1 || parsedTtl > 24) {
  errors.push("VERSION3_SESSION_TTL_HOURS must be an integer from 1 to 24 for public deployment.");
}

const parsedPort = Number(port);
if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  errors.push("PORT or VERSION3_LOCAL_SERVER_PORT must be a valid TCP port.");
}

if (errors.length) {
  console.error("Version.3 production server environment verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log("Version.3 production server environment verified.");

function readEnv(key) {
  return (process.env[key] || "").trim();
}

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
