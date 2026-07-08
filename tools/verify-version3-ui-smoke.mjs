#!/usr/bin/env node

import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "version3-ui-smoke-"));
const serverPassword = process.env.VERSION3_UI_SMOKE_PASSWORD || "version3-ui-password";
const ownerPassword = process.env.VERSION3_UI_SMOKE_OWNER_PASSWORD || "owner-ui-password";
const desktopViewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };
const checkedRoutes = [
  "/",
  "/login",
  "/dashboard",
  "/students",
  "/consultations",
  "/lessons",
  "/attendance",
  "/lesson-notes",
  "/practice-rooms",
  "/payments",
  "/accounts",
  "/data-quality",
  "/profile-settings",
  "/version3-test"
];
const roleCredentials = {
  owner: { loginId: "owner", password: ownerPassword },
  manager: { loginId: "manager", password: serverPassword },
  teacher: { loginId: "teacher", password: serverPassword },
  student: { loginId: "student", password: serverPassword }
};

const children = new Set();
const expectedConsoleErrors = [];
const unexpectedConsoleErrors = [];
let currentPhase = "startup";

try {
  const [serverPort, nextPort] = await Promise.all([freePort(), freePort()]);
  const serverBaseUrl = `http://127.0.0.1:${serverPort}`;
  const uiBaseUrl = `http://127.0.0.1:${nextPort}`;
  const dataFile = join(tempRoot, "version3-ui-smoke-data.json");

  const server = startProcess("Version.3 server", process.execPath, ["server/version3-local-server.mjs"], {
    VERSION3_LOCAL_SERVER_PORT: String(serverPort),
    VERSION3_LOCAL_SERVER_PASSWORD: serverPassword,
    VERSION3_OWNER_INITIAL_PASSWORD: ownerPassword,
    VERSION3_LOCAL_DATA_FILE: dataFile,
    VERSION3_DISABLE_LOCAL_BACKUPS: "true"
  });
  await waitForHttp(`${serverBaseUrl}/health`, "Version.3 server health");

  const nextBin = resolve(root, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin)) {
    throw new Error("Next.js CLI was not found in node_modules. Run pnpm install before UI smoke verification.");
  }
  startProcess("Next dev server", process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(nextPort)], {
    NEXT_PUBLIC_VERSION3_API_BASE_URL: serverBaseUrl,
    NEXT_TELEMETRY_DISABLED: "1"
  });
  await waitForHttp(`${uiBaseUrl}/login`, "Next login page", 90_000);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
  try {
    const context = await browser.newContext({ viewport: desktopViewport });
    await context.addInitScript(() => {
      window.__version3KeyWarnings = [];
      const originalError = console.error;
      console.error = (...args) => {
        if (String(args[0] || "").includes("same key")) {
          window.__version3KeyWarnings.push({
            args: args.map((arg) => String(arg)),
            stack: new Error().stack || ""
          });
        }
        originalError(...args);
      };
    });
    const page = await context.newPage();
    watchConsole(page, "desktop");

    await assertBadLogin(page, uiBaseUrl);
    await loginAs(page, uiBaseUrl, roleCredentials.owner);
    await assertRoutesLoad(page, uiBaseUrl, checkedRoutes);
    await assertRoleLinks(page, uiBaseUrl, "owner", {
      present: ["/accounts", "/payments", "/data-quality"],
      absent: []
    });

    for (const [role, credentials] of Object.entries(roleCredentials)) {
      await loginAs(page, uiBaseUrl, credentials);
      const expectations = role === "owner" || role === "manager"
        ? { present: ["/accounts", "/payments", "/data-quality"], absent: [] }
        : { present: ["/lesson-notes", "/practice-rooms"], absent: ["/accounts", "/payments", "/data-quality"] };
      await assertRoleLinks(page, uiBaseUrl, role, expectations);
    }

    await page.setViewportSize(mobileViewport);
    await loginAs(page, uiBaseUrl, roleCredentials.owner);
    await page.goto(`${uiBaseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, `Mobile dashboard overflow must be <= 2px, got ${overflow}px.`);
    await assertFirstControlActionable(page, "/dashboard mobile");

    await stopProcess(server);
    expectedConsoleErrors.push("server-failure-phase");
    await assertServerFailureFallback(page, uiBaseUrl);

    if (unexpectedConsoleErrors.length) {
      const keyWarningDetails = await page.evaluate(() => (window.__version3KeyWarnings || []).slice(0, 3)).catch(() => []);
      if (keyWarningDetails.length) {
        console.error("React key warning details:");
        console.error(JSON.stringify(keyWarningDetails, null, 2));
      }
      throw new Error(`Unexpected browser console errors:\n- ${unexpectedConsoleErrors.join("\n- ")}`);
    }

    console.log("Version.3 UI smoke verification passed.");
    console.log(`- desktop routes: ${checkedRoutes.length}`);
    console.log("- roles: owner, manager, teacher, student");
    console.log(`- mobile viewport: ${mobileViewport.width}x${mobileViewport.height}`);
    console.log("- server failure fallback: passed");
    await context.close();
  } finally {
    await browser.close();
  }
} finally {
  await stopAllProcesses();
  rmSync(tempRoot, { recursive: true, force: true });
}

function startProcess(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.add(child);
  child.stdout.on("data", (chunk) => {
    if (process.env.VERSION3_UI_SMOKE_VERBOSE === "true") process.stdout.write(`[${label}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (process.env.VERSION3_UI_SMOKE_VERBOSE === "true" || /error|failed|EADDRINUSE/i.test(text)) {
      process.stderr.write(`[${label}] ${text}`);
    }
  });
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (code && code !== 0) {
      unexpectedConsoleErrors.push(`${label} exited early with code ${code}${signal ? ` (${signal})` : ""}`);
    }
  });
  return child;
}

async function stopAllProcesses() {
  await Promise.all(Array.from(children, (child) => stopProcess(child)));
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  await new Promise((resolveStop) => {
    child.once("close", resolveStop);
    child.kill();
    setTimeout(resolveStop, 2_000).unref();
  });
}

function watchConsole(page, scope) {
  page.on("console", async (message) => {
    const text = message.text();
    if (message.type() !== "error") return;
    if (isExpectedConsoleError(text)) return;
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => "")));
    const detail = values.length ? ` ${values.map((value) => String(value)).join(" | ")}` : "";
    unexpectedConsoleErrors.push(`${scope}/${currentPhase}: ${text}${detail}`);
  });
  page.on("pageerror", (error) => {
    unexpectedConsoleErrors.push(`${scope}/${currentPhase}: ${error.message}`);
  });
}

function isExpectedConsoleError(text) {
  if (/favicon\.ico/i.test(text)) return true;
  if (/401|Unauthorized/i.test(text)) return true;
  if (expectedConsoleErrors.includes("server-failure-phase") && /Failed to fetch|ERR_CONNECTION_REFUSED|fetch/i.test(text)) return true;
  return false;
}

async function assertBadLogin(page, uiBaseUrl) {
  currentPhase = "bad-login";
  await prepareLoginPage(page, uiBaseUrl);
  await page.locator('input[name="loginId"]').fill("owner");
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.locator('button[type="submit"]').click();
  const message = await waitForAlertText(page);
  assert(/401|password|login/i.test(message), `Wrong password must show a login failure, got: ${message}`);
}

async function loginAs(page, uiBaseUrl, credentials) {
  currentPhase = `login:${credentials.loginId}`;
  await prepareLoginPage(page, uiBaseUrl);
  await page.locator('input[name="loginId"]').fill(credentials.loginId);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => (
    Boolean(window.localStorage.getItem("bonsung_server_session_token")) &&
    Boolean(window.localStorage.getItem("bonsung_server_current_user"))
  ), null, { timeout: 15_000 });
  const token = await page.evaluate(() => window.localStorage.getItem("bonsung_server_session_token"));
  assert(Boolean(token), `${credentials.loginId} login must store a server session token.`);
}

async function assertRoutesLoad(page, uiBaseUrl, routes) {
  for (const route of routes) {
    currentPhase = `route:${route}`;
    await page.goto(`${uiBaseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    assert(bodyText.trim().length > 20, `${route} must render visible content.`);
    assert(!/Unhandled Runtime Error|Application error|server session is required/i.test(bodyText), `${route} must not render an application/session error.`);
    await assertFirstControlActionable(page, route);
  }
}

async function assertRoleLinks(page, uiBaseUrl, role, expectations) {
  currentPhase = `role-links:${role}`;
  await page.goto(`${uiBaseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Array.from(document.querySelectorAll("a[href]")).some((anchor) => {
    try {
      return new URL(anchor.href).pathname.includes("dashboard");
    } catch {
      return false;
    }
  }), null, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  const hrefs = await page.$$eval("a[href]", (anchors) => Array.from(new Set(anchors.map((anchor) => {
    try {
      return new URL(anchor.href).pathname.replace(/\/$/, "") || "/";
    } catch {
      return "";
    }
  }).filter(Boolean))));
  for (const href of expectations.present) {
    assert(hrefs.includes(href), `${role} menu must include ${href}.`);
  }
  for (const href of expectations.absent) {
    assert(!hrefs.includes(href), `${role} menu must not include ${href}.`);
  }
}

async function assertFirstControlActionable(page, label) {
  const control = page.locator("button:visible, a:visible").first();
  if ((await control.count()) === 0) return;
  await control.click({ trial: true, timeout: 5_000 });
  assert(true, `${label} first visible control is actionable.`);
}

async function assertServerFailureFallback(page, uiBaseUrl) {
  currentPhase = "server-failure-fallback";
  await prepareLoginPage(page, uiBaseUrl);
  await page.locator('input[name="loginId"]').fill("owner");
  await page.locator('input[name="password"]').fill(ownerPassword);
  await page.locator('button[type="submit"]').click();
  const message = await waitForAlertText(page, 15_000);
  assert(message.trim().length > 0, "Server failure must show a login error message.");
}

async function prepareLoginPage(page, uiBaseUrl) {
  await page.goto(`${uiBaseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="loginId"]').waitFor({ timeout: 10_000 });
  await page.locator('input[name="password"]').waitFor({ timeout: 10_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(750);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function waitForAlertText(page, timeout = 10_000) {
  await page.waitForFunction(() => {
    const alert = Array.from(document.querySelectorAll('[role="alert"]'))
      .find((item) => item.textContent?.trim());
    return Boolean(alert?.textContent?.trim());
  }, null, { timeout });
  return await page.evaluate(() => {
    const alert = Array.from(document.querySelectorAll('[role="alert"]'))
      .find((item) => item.textContent?.trim());
    return alert?.textContent?.trim() || "";
  });
}

async function waitForHttp(url, label, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${label} did not become ready at ${url}. Last error: ${lastError}`);
}

async function freePort() {
  return await new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const candidates = [
      process.env.PLAYWRIGHT_MODULE_PATH,
      process.env.PLAYWRIGHT_NODE_MODULE_DIR ? findPnpmPackage(process.env.PLAYWRIGHT_NODE_MODULE_DIR, "playwright") : "",
      process.env.PLAYWRIGHT_NODE_MODULE_DIR ? resolve(process.env.PLAYWRIGHT_NODE_MODULE_DIR, "playwright", "index.mjs") : "",
      resolve(root, "node_modules", "playwright", "index.mjs")
    ].filter(Boolean);

    let lastError = "";
    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue;
      try {
        return await import(pathToFileURL(candidate).href);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    if (lastError) throw new Error(`Playwright was found but could not be loaded: ${lastError}`);
  }
  throw new Error("Playwright is required for UI smoke verification. Install it or set PLAYWRIGHT_NODE_MODULE_DIR.");
}

function findPnpmPackage(nodeModuleDir, packageName) {
  const pnpmDir = resolve(nodeModuleDir, ".pnpm");
  if (!existsSync(pnpmDir)) return "";
  const prefix = `${packageName}@`;
  const packageDir = readdirSync(pnpmDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => entry.name)
    .sort()
    .at(-1);
  return packageDir ? resolve(pnpmDir, packageDir, "node_modules", packageName, "index.mjs") : "";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
