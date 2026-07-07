const errors = [];
const warnings = [];

const nodeEnv = readEnv("NODE_ENV");
const password = readEnv("VERSION3_LOCAL_SERVER_PASSWORD");
const host = readEnv("VERSION3_SERVER_HOST") || "127.0.0.1";
const allowedOrigins = splitCsv(readEnv("VERSION3_ALLOWED_ORIGINS") || "*");
const dataFile = readEnv("VERSION3_LOCAL_DATA_FILE") || ".version3-local-data.json";
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

if (!dataFile || dataFile.toLowerCase() === "memory") {
  errors.push("VERSION3_LOCAL_DATA_FILE must point to a persistent file, not memory.");
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

