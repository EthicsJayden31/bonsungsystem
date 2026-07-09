import { spawn } from "node:child_process";

const serverPort = process.env.VERSION3_LOCAL_SERVER_PORT || "4303";
const nextPort = process.env.VERSION3_NEXT_PORT || "3000";
const serverUrl = `http://127.0.0.1:${serverPort}`;
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const adminPassword = process.env.VERSION3_ADMIN_INITIAL_PASSWORD || "bonsung_2020_03";
const defaultSeedPassword = process.env.VERSION3_LOCAL_SERVER_PASSWORD || "bonsung1";

const children = [];

start(
  "Version.3 local server",
  process.execPath,
  ["server/version3-local-server.mjs"],
  {
    ...process.env,
    VERSION3_LOCAL_SERVER_PORT: serverPort,
    VERSION3_LOCAL_SERVER_PASSWORD: defaultSeedPassword,
    VERSION3_ADMIN_INITIAL_PASSWORD: adminPassword
  }
);

start(
  "Next Version.3 UI",
  pnpm,
  ["dev", "--hostname", "127.0.0.1", "--port", nextPort],
  {
    ...process.env,
    NEXT_PUBLIC_VERSION3_API_BASE_URL: process.env.NEXT_PUBLIC_VERSION3_API_BASE_URL || serverUrl
  }
);

console.log(`Version.3 local mode`);
console.log(`- UI: http://127.0.0.1:${nextPort}/login/`);
console.log(`- Server: ${serverUrl}`);
console.log(`- Admin seed password: ${adminPassword}`);
console.log(`- Manager/Coach/Artist seed password: ${defaultSeedPassword}`);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => {
  for (const child of children) child.kill();
});

function start(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit"
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code == null || code === 0) return;
    console.error(`${label} exited with code ${code}.`);
    shutdown();
  });
}

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}
