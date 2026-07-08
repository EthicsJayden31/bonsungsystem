import { createHash, randomBytes } from "node:crypto";

const DEFAULT_SYNC_TIMEOUT_MS = 55_000;

const APPS_SCRIPT_TABLES = {
  account_requests: ["id", "login_id", "password_hash", "password_salt", "password_algorithm", "name", "email", "phone", "requested_role", "linked_student_id", "message", "status", "reviewed_by", "reviewed_at", "review_memo", "created_account_id", "created_at", "updated_at", "deleted_at"],
  account_history: ["id", "account_id", "account_name", "actor_id", "actor_name", "action", "role", "permissions_before", "permissions_after", "memo", "occurred_at", "created_at", "updated_at", "deleted_at"],
  teachers: ["id", "account_id", "name", "major", "email", "phone", "status", "memo", "created_at", "updated_at", "deleted_at"],
  students: ["id", "name", "birth_date", "phone", "major", "goal", "status", "teacher_id", "teacher_name", "memo", "created_at", "updated_at", "deleted_at"],
  guardians: ["id", "student_id", "name", "relation", "phone", "email", "payer", "emergency", "memo", "created_at", "updated_at", "deleted_at"],
  courses: ["id", "name", "major", "teacher_id", "status", "tuition_amount", "memo", "created_at", "updated_at", "deleted_at"],
  enrollments: ["id", "student_id", "course_id", "teacher_id", "start_date", "end_date", "status", "memo", "created_at", "updated_at", "deleted_at"],
  lessons: ["id", "student_id", "teacher_id", "course_id", "lesson_date", "start_time", "duration_minutes", "room_id", "status", "memo", "created_at", "updated_at", "deleted_at"],
  attendance: ["id", "lesson_id", "student_id", "teacher_id", "status", "makeup_needed", "checked_at", "memo", "created_at", "updated_at", "deleted_at"],
  lesson_notes: ["id", "lesson_id", "student_id", "teacher_id", "lesson_date", "content", "homework", "next_goal", "practice_request", "internal_memo", "created_at", "updated_at", "deleted_at"],
  rooms: ["id", "name", "type", "capacity", "status", "memo", "created_at", "updated_at", "deleted_at"],
  reservations: ["id", "room_id", "room_name", "reserved_by", "reserved_by_name", "student_id", "teacher_id", "reservation_date", "start_time", "end_time", "purpose", "status", "memo", "created_at", "updated_at", "deleted_at"],
  payments: ["id", "student_id", "student_name", "enrollment_id", "registration_type", "program_name", "amount", "period_start", "next_due_date", "paid_at", "payment_status", "method", "memo", "created_at", "updated_at", "deleted_at"],
  consultations: ["id", "student_id", "student_name", "guardian_name", "phone", "channel", "major", "goal", "message", "status", "priority", "assigned_to", "assigned_to_name", "follow_up_date", "acknowledged_at", "status_updated_at", "unread_for_account_ids", "memo", "created_at", "updated_at", "deleted_at"],
  consultation_history: ["id", "consultation_id", "actor_id", "actor_name", "action", "status", "assigned_to", "assigned_to_name", "memo", "occurred_at", "created_at", "updated_at", "deleted_at"],
  tasks: ["id", "title", "assignee_id", "assignee_name", "due_date", "status", "priority", "memo", "created_at", "updated_at", "deleted_at"],
  work_logs: ["id", "account_id", "account_name", "work_date", "clock_in_at", "clock_out_at", "memo", "created_at", "updated_at", "deleted_at"],
  meetings: ["id", "title", "starts_at", "participant_ids", "participant_names", "status", "memo", "created_at", "updated_at", "deleted_at"],
  calendar_events: ["id", "title", "date", "start_time", "target_roles", "memo", "created_at", "updated_at", "deleted_at"],
  notices: ["id", "title", "category", "author_id", "author_name", "body", "target_roles", "pinned", "active", "created_at", "updated_at", "deleted_at"],
  audit_logs: ["id", "actor_id", "actor_name", "actor_role", "action", "target_type", "target_id", "target_name", "metadata_json", "created_at", "updated_at", "deleted_at"],
  public_settings: ["id", "key", "value", "updated_by", "created_at", "updated_at", "deleted_at"]
};

export function appsScriptSyncConfig(storage) {
  const enabled = truthyEnv(process.env.VERSION3_APPS_SCRIPT_SYNC_ENABLED);
  const endpoint = stringEnv(process.env.VERSION3_APPS_SCRIPT_ENDPOINT || process.env.NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT);
  const loginId = stringEnv(process.env.VERSION3_APPS_SCRIPT_SYNC_LOGIN_ID || "admin");
  const password = stringEnv(process.env.VERSION3_APPS_SCRIPT_SYNC_PASSWORD);
  const includeAccounts = truthyEnv(process.env.VERSION3_APPS_SCRIPT_SYNC_ACCOUNTS);
  const timeoutMs = Math.max(5_000, Number(process.env.VERSION3_APPS_SCRIPT_SYNC_TIMEOUT_MS || DEFAULT_SYNC_TIMEOUT_MS));
  const supportedStorage = Boolean(storage?.supportsSyncOutbox);
  const missing = [];
  if (!endpoint) missing.push("VERSION3_APPS_SCRIPT_ENDPOINT or NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT");
  if (!loginId) missing.push("VERSION3_APPS_SCRIPT_SYNC_LOGIN_ID");
  if (!password) missing.push("VERSION3_APPS_SCRIPT_SYNC_PASSWORD");
  if (!supportedStorage) missing.push("VERSION3_STORAGE_DRIVER=postgres");

  return {
    enabled,
    configured: enabled && missing.length === 0,
    supportedStorage,
    endpoint,
    loginId,
    password,
    includeAccounts,
    timeoutMs,
    missing
  };
}

export async function appsScriptSyncStatus(storage) {
  const config = appsScriptSyncConfig(storage);
  const outbox = typeof storage?.syncStatus === "function"
    ? await storage.syncStatus()
    : { supported: false, storageMode: storage?.mode || "unknown", pending: false };
  return {
    enabled: config.enabled,
    configured: config.configured,
    missing: config.missing,
    endpointConfigured: Boolean(config.endpoint),
    includeAccounts: config.includeAccounts,
    outbox,
    status: !config.enabled
      ? "disabled"
      : !config.configured
        ? "disconnected"
        : outbox.lastError
          ? "unstable"
          : outbox.pending
            ? "pending"
            : "connected"
  };
}

export async function markAppsScriptSyncPending(storage, reason = "database-save") {
  const config = appsScriptSyncConfig(storage);
  if (!config.enabled || !config.supportedStorage || typeof storage?.markSyncPending !== "function") return null;
  return storage.markSyncPending(reason);
}

export async function runAppsScriptOutboxSync(storage, options = {}) {
  const config = appsScriptSyncConfig(storage);
  if (!config.enabled) {
    return { synced: false, skipped: "disabled", status: await appsScriptSyncStatus(storage) };
  }
  if (!config.configured) {
    const error = new Error(`Apps Script sync is not configured: ${config.missing.join(", ")}`);
    error.statusCode = 503;
    throw error;
  }
  if (typeof storage?.claimPendingSync !== "function" || typeof storage?.completePendingSync !== "function") {
    const error = new Error("Apps Script sync requires a durable Version.3 outbox.");
    error.statusCode = 503;
    throw error;
  }

  const claim = await storage.claimPendingSync({ force: Boolean(options.force) });
  if (!claim) {
    return { synced: false, skipped: "no-pending-changes", status: await appsScriptSyncStatus(storage) };
  }

  try {
    const data = version3SnapshotToAppsScriptTables(claim.snapshot, { includeAccounts: config.includeAccounts });
    const result = await pushDataImport(config, data);
    await storage.completePendingSync(claim.revision, { ok: true });
    return {
      synced: true,
      revision: claim.revision,
      pendingRevision: claim.pendingRevision,
      tables: Object.keys(data),
      appsScript: result
    };
  } catch (error) {
    await storage.completePendingSync(claim.revision, { ok: false, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export function version3SnapshotToAppsScriptTables(snapshot, options = {}) {
  const state = snapshot && typeof snapshot === "object" ? snapshot : {};
  const teachersById = new Map((state.teachers || []).map((item) => [stringValue(item.id || item.accountId), item]));
  const studentsById = new Map((state.students || []).map((item) => [stringValue(item.id), item]));
  const roomsById = new Map((state.rooms || []).map((item) => [stringValue(item.id), item]));
  const accountsById = new Map((state.accounts || []).map((item) => [stringValue(item.id), item]));
  const lessonsById = new Map((state.lessons || []).map((item) => [stringValue(item.id), item]));

  const data = {
    account_requests: rowsFor(APPS_SCRIPT_TABLES.account_requests, state.accountRequests, (item) => ({
      id: item.id,
      login_id: item.loginId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      requested_role: item.requestedRole,
      linked_student_id: item.linkedStudentId,
      message: item.message,
      status: item.status,
      reviewed_by: item.reviewedBy,
      reviewed_at: item.reviewedAt,
      review_memo: item.reviewMemo,
      created_account_id: item.createdAccountId,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    account_history: rowsFor(APPS_SCRIPT_TABLES.account_history, state.accountHistory, (item) => ({
      id: item.id,
      account_id: item.accountId,
      account_name: item.accountName,
      actor_id: item.actorId,
      actor_name: item.actorName,
      action: item.action,
      role: item.role,
      permissions_before: item.beforePermissions,
      permissions_after: item.afterPermissions,
      memo: item.memo,
      occurred_at: item.occurredAt,
      created_at: item.createdAt || item.occurredAt,
      updated_at: item.updatedAt || item.occurredAt,
      deleted_at: item.deletedAt
    })),
    teachers: rowsFor(APPS_SCRIPT_TABLES.teachers, state.teachers, (item) => ({
      id: item.id,
      account_id: item.accountId || item.id,
      name: item.name,
      major: item.major,
      email: item.email,
      phone: item.phone,
      status: item.status || "active",
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    students: rowsFor(APPS_SCRIPT_TABLES.students, state.students, (item) => ({
      id: item.id,
      name: item.name,
      birth_date: item.birthDate || item.birth_date,
      phone: item.phone,
      major: item.major,
      goal: item.goal,
      status: item.status,
      teacher_id: item.teacherId,
      teacher_name: item.teacherName || teachersById.get(item.teacherId)?.name,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    guardians: rowsFor(APPS_SCRIPT_TABLES.guardians, state.guardians, (item) => ({
      id: item.id,
      student_id: item.studentId,
      name: item.name,
      relation: item.relation,
      phone: item.phone,
      email: item.email,
      payer: item.payer,
      emergency: item.emergency,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    courses: rowsFor(APPS_SCRIPT_TABLES.courses, state.courses, (item) => ({
      id: item.id,
      name: item.name,
      major: item.major,
      teacher_id: item.teacherId,
      status: item.status,
      tuition_amount: item.tuitionAmount,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    enrollments: rowsFor(APPS_SCRIPT_TABLES.enrollments, state.enrollments, (item) => ({
      id: item.id,
      student_id: item.studentId,
      course_id: item.courseId,
      teacher_id: item.teacherId,
      start_date: item.startDate,
      end_date: item.endDate,
      status: item.status,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    lessons: rowsFor(APPS_SCRIPT_TABLES.lessons, state.lessons, (item) => {
      const start = splitDateTime(item.startsAt || item.starts_at || item.lessonDate);
      return {
        id: item.id,
        student_id: item.studentId,
        teacher_id: item.teacherId,
        course_id: item.courseId,
        lesson_date: item.lessonDate || item.date || start.date,
        start_time: item.startTime || start.time,
        duration_minutes: item.duration,
        room_id: item.roomId,
        status: item.status,
        memo: item.memo,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt
      };
    }),
    attendance: rowsFor(APPS_SCRIPT_TABLES.attendance, state.attendance, (item) => {
      const lesson = lessonsById.get(item.lessonId);
      return {
        id: item.id,
        lesson_id: item.lessonId,
        student_id: item.studentId || lesson?.studentId,
        teacher_id: item.teacherId || lesson?.teacherId,
        status: item.status,
        makeup_needed: item.makeupNeeded,
        checked_at: item.checkedAt,
        memo: item.memo,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt
      };
    }),
    lesson_notes: rowsFor(APPS_SCRIPT_TABLES.lesson_notes, state.lessonNotes, (item) => ({
      id: item.id,
      lesson_id: item.lessonId,
      student_id: item.studentId,
      teacher_id: item.teacherId,
      lesson_date: item.date || item.lessonDate,
      content: item.content,
      homework: item.homework,
      next_goal: item.nextGoal,
      practice_request: item.practiceRequest,
      internal_memo: item.internalMemo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    rooms: rowsFor(APPS_SCRIPT_TABLES.rooms, state.rooms, (item) => ({
      id: item.id,
      name: item.name,
      type: item.type || item.location,
      capacity: item.capacity,
      status: item.status,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    reservations: rowsFor(APPS_SCRIPT_TABLES.reservations, state.reservations, (item) => {
      const start = splitDateTime(item.startsAt || item.starts_at);
      const end = splitDateTime(item.endsAt || item.ends_at);
      const student = studentsById.get(item.studentId);
      const room = roomsById.get(item.roomId);
      return {
        id: item.id,
        room_id: item.roomId,
        room_name: item.roomName || room?.name,
        reserved_by: item.requester || item.studentId,
        reserved_by_name: item.requester || item.studentName || student?.name,
        student_id: item.studentId,
        teacher_id: item.teacherId || student?.teacherId,
        reservation_date: item.reservationDate || start.date || end.date,
        start_time: item.startTime || start.time,
        end_time: item.endTime || end.time,
        purpose: item.purpose,
        status: item.status,
        memo: item.memo,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt
      };
    }),
    payments: rowsFor(APPS_SCRIPT_TABLES.payments, state.payments, (item) => {
      const student = studentsById.get(item.studentId);
      return {
        id: item.id,
        student_id: item.studentId,
        student_name: item.studentName || student?.name,
        enrollment_id: item.enrollmentId,
        registration_type: item.registrationType,
        program_name: item.title || item.programName,
        amount: item.amount,
        period_start: item.periodStart,
        next_due_date: item.dueDate || item.nextDueDate,
        paid_at: item.paidAt,
        payment_status: item.status || item.paymentStatus,
        method: item.method,
        memo: item.memo,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt
      };
    }),
    consultations: rowsFor(APPS_SCRIPT_TABLES.consultations, state.consultations, (item) => ({
      id: item.id,
      student_id: item.studentId,
      student_name: item.studentName,
      guardian_name: item.guardianName,
      phone: item.phone,
      channel: item.channel,
      major: item.major,
      goal: item.goal,
      message: item.message,
      status: item.status,
      priority: item.priority,
      assigned_to: item.assignedTo,
      assigned_to_name: item.assignedToName,
      follow_up_date: item.followUpDate,
      acknowledged_at: item.acknowledgedAt,
      status_updated_at: item.statusUpdatedAt,
      unread_for_account_ids: item.unreadForAccountIds,
      memo: item.memo,
      created_at: item.createdAt || item.date,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    consultation_history: rowsFor(APPS_SCRIPT_TABLES.consultation_history, state.consultationHistory, (item) => ({
      id: item.id,
      consultation_id: item.consultationId,
      actor_id: item.actorId,
      actor_name: item.actorName,
      action: item.action,
      status: item.status,
      assigned_to: item.assignedTo,
      assigned_to_name: item.assignedToName,
      memo: item.memo,
      occurred_at: item.occurredAt,
      created_at: item.createdAt || item.occurredAt,
      updated_at: item.updatedAt || item.occurredAt,
      deleted_at: item.deletedAt
    })),
    tasks: rowsFor(APPS_SCRIPT_TABLES.tasks, state.tasks, (item) => ({
      id: item.id,
      title: item.title,
      assignee_id: item.assigneeId,
      assignee_name: item.assigneeName || item.assignee,
      due_date: item.dueDate,
      status: item.status,
      priority: item.priority,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    work_logs: rowsFor(APPS_SCRIPT_TABLES.work_logs, state.workLogs, (item) => ({
      id: item.id,
      account_id: item.accountId,
      account_name: item.accountName,
      work_date: item.workDate,
      clock_in_at: item.clockInAt,
      clock_out_at: item.clockOutAt,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    meetings: rowsFor(APPS_SCRIPT_TABLES.meetings, state.meetings, (item) => ({
      id: item.id,
      title: item.title,
      starts_at: item.startsAt,
      participant_ids: item.participantIds,
      participant_names: item.participantNames,
      status: item.status,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    calendar_events: rowsFor(APPS_SCRIPT_TABLES.calendar_events, state.calendarEvents, (item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      start_time: item.startTime,
      target_roles: item.targetRoles,
      memo: item.memo,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    notices: rowsFor(APPS_SCRIPT_TABLES.notices, state.notices, (item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      author_id: item.authorId,
      author_name: item.authorName || item.author,
      body: item.body,
      target_roles: item.targetRoles,
      pinned: item.pinned,
      active: item.active ?? true,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    audit_logs: rowsFor(APPS_SCRIPT_TABLES.audit_logs, state.auditLogs, (item) => ({
      id: item.id,
      actor_id: item.actorId,
      actor_name: item.actorName,
      actor_role: item.actorRole || accountsById.get(item.actorId)?.role,
      action: item.action,
      target_type: item.targetType,
      target_id: item.targetId,
      target_name: item.targetName,
      metadata_json: item.metadata,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    })),
    public_settings: publicSettingsRows(state.publicSettings)
  };

  if (options.includeAccounts) data.accounts = accountRows(state.accounts);
  return data;
}

async function pushDataImport(config, data) {
  const login = await postAppsScript(config, {
    action: "login",
    loginId: config.loginId,
    password: config.password
  });
  const token = login?.data?.token;
  if (!token) throw new Error("Apps Script sync login did not return a token.");

  try {
    const imported = await postAppsScript(config, {
      action: "dataImport",
      token,
      data
    });
    return imported?.data || imported;
  } finally {
    await postAppsScript(config, { action: "logout", token }).catch(() => undefined);
  }
}

async function postAppsScript(config, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(`Apps Script response error (${response.status}).`);
    if (parsed.ok === false) throw new Error(parsed.error || "Apps Script sync request failed.");
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

function rowsFor(headers, items, mapper) {
  return (Array.isArray(items) ? items : []).map((item) => normalizeRow(headers, mapper(item || {})));
}

function normalizeRow(headers, item) {
  return headers.reduce((row, header) => {
    row[header] = serializeCell(item[header]);
    return row;
  }, {});
}

function publicSettingsRows(settings = {}) {
  const now = new Date().toISOString();
  const rows = [
    ["loginNotice", settings.loginNotice],
    ["academyPhone", settings.academyPhone],
    ["reservationGuide", settings.reservationGuide]
  ].filter(([, value]) => value != null);
  return rows.map(([key, value]) => normalizeRow(APPS_SCRIPT_TABLES.public_settings, {
    id: `public-setting-${key}`,
    key,
    value,
    updated_by: settings.updatedBy,
    created_at: settings.createdAt || settings.updatedAt || now,
    updated_at: settings.updatedAt || now,
    deleted_at: ""
  }));
}

function accountRows(accounts = []) {
  const tempPassword = stringEnv(process.env.VERSION3_APPS_SCRIPT_ACCOUNT_TEMP_PASSWORD);
  return rowsFor([
    "id", "login_id", "password_hash", "password_salt", "password_algorithm", "role", "status", "name", "email", "phone", "linked_student_id", "permissions_json", "must_change_password", "last_login_at", "created_at", "updated_at", "deleted_at"
  ], accounts, (item) => {
    const salt = tempPassword ? randomBytes(24).toString("hex") : "";
    return {
      id: item.id,
      login_id: item.loginId,
      password_hash: tempPassword ? hashPassword(tempPassword, salt) : "",
      password_salt: salt,
      password_algorithm: tempPassword ? "sha256:salt:password" : "",
      role: item.role === "owner" ? "owner" : item.role,
      status: item.status,
      name: item.name,
      email: item.email,
      phone: item.phone,
      linked_student_id: item.linkedStudentId,
      permissions_json: item.permissions,
      must_change_password: true,
      last_login_at: item.lastLoginAt,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt
    };
  });
}

function splitDateTime(value) {
  const text = stringValue(value);
  if (!text) return { date: "", time: "" };
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  return { date: match?.[1] || text.slice(0, 10), time: match?.[2] || "" };
}

function hashPassword(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`, "utf8").digest("hex");
}

function serializeCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function stringEnv(value) {
  return String(value || "").trim();
}

function truthyEnv(value) {
  return ["1", "true", "yes", "on"].includes(stringEnv(value).toLowerCase());
}

function stringValue(value) {
  return value == null ? "" : String(value);
}
