#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "stage-vercel-api-"));
const port = Number(process.env.BONSUNG_VERCEL_API_VERIFY_PORT || 4347);

process.env.BONSUNG_STORAGE_DRIVER = "file";
process.env.BONSUNG_LOCAL_DATA_FILE = join(tempDir, "stage-data.json");
process.env.BONSUNG_DISABLE_LOCAL_BACKUPS = "true";
process.env.BONSUNG_LOCAL_SERVER_PASSWORD = "bonsung1";
process.env.BONSUNG_ADMIN_INITIAL_PASSWORD = "admin-test-123";
process.env.BONSUNG_ALLOWED_ORIGINS = "http://127.0.0.1:3000,http://localhost:3000";

const apiModule = await import("../api/stage/[...path].js");
const handler = apiModule.default || apiModule.handler;
if (typeof handler !== "function") throw new Error("본성 스테이지 Vercel API handler was not exported as a function.");

const server = createServer((request, response) => handler(request, response));

try {
  await listen(server, port);
  const baseUrl = `http://127.0.0.1:${port}/api/stage`;
  const health = await request(baseUrl, "/health");
  assert(health.service === "bonsung-stage-server", "Vercel API health must return 본성 스테이지 service.");

  const login = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: "admin", password: "admin-test-123" }
  });
  assert(login.token && login.user?.role === "admin", "Vercel API admin login must return a token and admin role.");

  const bootstrap = await request(baseUrl, "/bootstrap", { token: login.token });
  assert(Array.isArray(bootstrap.students), "Vercel API bootstrap must return students.");
  assert(Array.isArray(bootstrap.courses), "Vercel API bootstrap must return programs.");

  const student = await request(baseUrl, "/actions/createStudent", {
    method: "POST",
    token: login.token,
    body: {
      student: {
        name: "Vercel API Verification Artist",
        status: "상담중",
        teacherId: "teacher-1",
        teacherName: "황휘현"
      }
    }
  });
  assert(student.id && student.student_id === student.id, "Vercel API createStudent must return a server student id.");

  const account = await request(baseUrl, "/accounts", {
    method: "POST",
    token: login.token,
    body: {
      account: {
        loginId: `vercel-artist-${Date.now()}`,
        name: "Vercel API Verification Artist",
        role: "artist",
        initialPassword: "artist-test-123",
        linkedStudentId: student.id
      }
    }
  });
  assert(account.role === "artist" && account.linkedStudentId === student.id, "Vercel API must create linked Artist accounts.");

  console.log(`본성 스테이지 Vercel API local verification passed: ${baseUrl}`);
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
