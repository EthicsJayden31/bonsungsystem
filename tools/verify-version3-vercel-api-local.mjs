#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "version3-vercel-api-"));
const port = Number(process.env.VERSION3_VERCEL_API_VERIFY_PORT || 4347);

process.env.VERSION3_STORAGE_DRIVER = "file";
process.env.VERSION3_LOCAL_DATA_FILE = join(tempDir, "version3-data.json");
process.env.VERSION3_DISABLE_LOCAL_BACKUPS = "true";
process.env.VERSION3_LOCAL_SERVER_PASSWORD = "version3";
process.env.VERSION3_OWNER_INITIAL_PASSWORD = "owner-test-123";
process.env.VERSION3_ALLOWED_ORIGINS = "http://127.0.0.1:3000,http://localhost:3000";

const apiModule = await import("../api/version3/[...path].js");
const handler = apiModule.default || apiModule.handler;
if (typeof handler !== "function") throw new Error("Version.3 Vercel API handler was not exported as a function.");

const server = createServer((request, response) => handler(request, response));

try {
  await listen(server, port);
  const baseUrl = `http://127.0.0.1:${port}/api/version3`;
  const health = await request(baseUrl, "/health");
  assert(health.service === "bonsung-version3-server", "Vercel API health must return Version.3 service.");

  const login = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: "owner", password: "owner-test-123" }
  });
  assert(login.token && login.user?.role === "owner", "Vercel API owner login must return a token and owner role.");

  const bootstrap = await request(baseUrl, "/bootstrap", { token: login.token });
  assert(Array.isArray(bootstrap.students), "Vercel API bootstrap must return students.");

  const reservationBody = {
    reservation: {
      room_id: "room-1",
      student_id: "student-jang-yunho",
      reservation_date: "2036-01-15",
      start_time: "07:00",
      end_time: "08:00"
    }
  };
  const reservation = await request(baseUrl, "/actions/createReservation", {
    method: "POST",
    token: login.token,
    body: reservationBody
  });
  assert(reservation.id, "Vercel API reservation creation must return a reservation id.");

  const duplicate = await request(baseUrl, "/actions/createReservation", {
    method: "POST",
    token: login.token,
    body: reservationBody,
    allowFailure: true
  });
  assert(duplicate.status === 409, "Vercel API duplicate reservation must return 409.");

  console.log(`Version.3 Vercel API local verification passed: ${baseUrl}`);
} finally {
  await close(server);
  rmSync(tempDir, { recursive: true, force: true });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      "Content-Type": "application/json"
    },
    body: options.body == null ? undefined : JSON.stringify(options.body)
  });
  const parsed = await response.json();
  if (!response.ok && !options.allowFailure) throw new Error(parsed.error || `Request failed with ${response.status}.`);
  return response.ok ? parsed.data : { status: response.status, error: parsed.error };
}

function listen(server, nextPort) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(nextPort, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
