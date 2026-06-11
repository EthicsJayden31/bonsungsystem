const SHEETS = {
  accounts: "계정",
  students: "수강생",
  lessonLogs: "수업일지",
  sessions: "세션",
  settings: "설정"
};

const ROLES = ["admin", "staff", "teacher", "student"];
const SESSION_HOURS = 12;

function doGet() {
  return jsonResponse({ ok: true, data: { service: "Bonsung Music Intranet API", version: "1" } });
}

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents || "{}");
    const action = request.action;
    if (action === "health") return success(health());
    if (action === "bootstrapAdmin") return success(bootstrapAdmin(request));
    if (action === "login") return success(login(request.loginId, request.password));

    const currentUser = requireSession(request.token);
    if (action === "logout") return success(logout(request.token));
    if (action === "listAccounts") return success(listAccounts(currentUser));
    if (action === "createAccount") return success(createAccount(currentUser, request.account));
    if (action === "updateAccountStatus") return success(updateAccountStatus(currentUser, request.accountId, request.active));
    if (action === "resetAccountPassword") return success(resetAccountPassword(currentUser, request.accountId, request.password));
    if (action === "changePassword") return success(changePassword(currentUser, request.currentPassword, request.newPassword));
    if (action === "listStudents") return success(listStudents(currentUser));
    if (action === "createStudent") return success(createStudent(currentUser, request.student));
    if (action === "updateStudent") return success(updateStudent(currentUser, request.student));
    if (action === "listLessonLogs") return success(listLessonLogs(currentUser));
    if (action === "createLessonLog") return success(createLessonLog(currentUser, request.log));
    throw new Error("지원하지 않는 작업입니다.");
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || String(error) });
  }
}

function health() {
  const settings = rowsAsObjects(SHEETS.settings);
  return {
    academyName: settingValue(settings, "academy_name") || "본성뮤직 아카데미",
    schemaVersion: settingValue(settings, "schema_version") || "1"
  };
}

function bootstrapAdmin(request) {
  const setupKey = PropertiesService.getScriptProperties().getProperty("SETUP_KEY");
  if (!setupKey || request.setupKey !== setupKey) throw new Error("초기 설정 키가 올바르지 않습니다.");
  if (rowsAsObjects(SHEETS.accounts).length > 0) throw new Error("이미 계정이 등록되어 있습니다.");
  if (!request.loginId || !request.password || request.password.length < 8) throw new Error("관리자 아이디와 8자 이상의 비밀번호가 필요합니다.");

  const now = new Date().toISOString();
  const salt = Utilities.getUuid();
  appendObject(SHEETS.accounts, {
    account_id: makeId("acc"),
    login_id: request.loginId,
    password_hash: hashPassword(request.password, salt),
    password_salt: salt,
    role: "admin",
    name: request.name || "원장 관리자",
    email: request.email || "",
    phone: request.phone || "",
    linked_student_id: "",
    active: true,
    must_change_password: false,
    created_at: now,
    updated_at: now
  });
  PropertiesService.getScriptProperties().deleteProperty("SETUP_KEY");
  return true;
}

function login(loginId, password) {
  cleanupSessions();
  const account = rowsAsObjects(SHEETS.accounts).find((item) => item.login_id === String(loginId || "").trim());
  if (!account || !asBoolean(account.active)) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  if (account.password_hash !== hashPassword(String(password || ""), account.password_salt)) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");

  const token = Utilities.getUuid() + Utilities.getUuid();
  const now = new Date();
  appendObject(SHEETS.sessions, {
    token,
    account_id: account.account_id,
    expires_at: new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
    created_at: now.toISOString()
  });
  return { token, user: publicAccount(account) };
}

function logout(token) {
  deleteRowsWhere(SHEETS.sessions, (item) => item.token === token);
  return true;
}

function requireSession(token) {
  cleanupSessions();
  const session = rowsAsObjects(SHEETS.sessions).find((item) => item.token === token);
  if (!session) throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  const account = rowsAsObjects(SHEETS.accounts).find((item) => item.account_id === session.account_id && asBoolean(item.active));
  if (!account) throw new Error("사용할 수 없는 계정입니다.");
  return account;
}

function listAccounts(user) {
  requireRole(user, ["admin", "staff"]);
  return rowsAsObjects(SHEETS.accounts).map(publicAccount);
}

function createAccount(user, input) {
  requireRole(user, ["admin", "staff"]);
  if (!input || !input.login_id || !input.name || !input.password) throw new Error("이름, 아이디, 초기 비밀번호를 입력해 주세요.");
  if (input.password.length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  if (!ROLES.includes(input.role)) throw new Error("올바르지 않은 권한입니다.");
  if (user.role === "staff" && input.role === "admin") throw new Error("직원은 관리자 계정을 만들 수 없습니다.");
  if (rowsAsObjects(SHEETS.accounts).some((item) => item.login_id === input.login_id)) throw new Error("이미 사용 중인 아이디입니다.");

  const now = new Date().toISOString();
  const salt = Utilities.getUuid();
  const account = {
    account_id: makeId("acc"),
    login_id: input.login_id.trim(),
    password_hash: hashPassword(input.password, salt),
    password_salt: salt,
    role: input.role,
    name: input.name.trim(),
    email: input.email || "",
    phone: input.phone || "",
    linked_student_id: input.role === "student" ? input.linked_student_id || "" : "",
    active: true,
    must_change_password: true,
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.accounts, account);
  return publicAccount(account);
}

function updateAccountStatus(user, accountId, active) {
  requireRole(user, ["admin", "staff"]);
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (account.account_id === user.account_id) throw new Error("현재 로그인한 계정은 중지할 수 없습니다.");
  if (user.role === "staff" && account.role === "admin") throw new Error("직원은 관리자 계정을 변경할 수 없습니다.");
  updateObject(SHEETS.accounts, "account_id", accountId, {
    active: Boolean(active),
    updated_at: new Date().toISOString()
  });
  if (!active) deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  return true;
}

function resetAccountPassword(user, accountId, password) {
  requireRole(user, ["admin", "staff"]);
  if (!password || password.length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (account.account_id === user.account_id) throw new Error("본인 비밀번호는 내 계정 메뉴에서 변경해 주세요.");
  if (user.role === "staff" && account.role === "admin") throw new Error("직원은 관리자 계정을 변경할 수 없습니다.");
  const salt = Utilities.getUuid();
  updateObject(SHEETS.accounts, "account_id", accountId, {
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    must_change_password: true,
    updated_at: new Date().toISOString()
  });
  deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  return true;
}

function changePassword(user, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error("새 비밀번호는 8자 이상이어야 합니다.");
  if (user.password_hash !== hashPassword(String(currentPassword || ""), user.password_salt)) throw new Error("현재 비밀번호가 올바르지 않습니다.");
  const salt = Utilities.getUuid();
  updateObject(SHEETS.accounts, "account_id", user.account_id, {
    password_hash: hashPassword(newPassword, salt),
    password_salt: salt,
    must_change_password: false,
    updated_at: new Date().toISOString()
  });
  return true;
}

function listStudents(user) {
  const students = rowsAsObjects(SHEETS.students);
  if (user.role === "teacher") return students.filter((item) => item.teacher_id === user.account_id);
  if (user.role === "student") return students.filter((item) => item.student_id === user.linked_student_id).map(studentForStudent);
  return students;
}

function createStudent(user, input) {
  requireRole(user, ["admin", "staff"]);
  if (!input || !input.name || !input.major) throw new Error("수강생 이름과 전공을 입력해 주세요.");
  const now = new Date().toISOString();
  const student = {
    student_id: makeId("stu"),
    name: input.name.trim(),
    birth_date: input.birth_date || "",
    phone: input.phone || "",
    guardian_name: input.guardian_name || "",
    guardian_phone: input.guardian_phone || "",
    major: input.major || "",
    goal: input.goal || "",
    status: input.status || "상담중",
    teacher_id: input.teacher_id || "",
    enrolled_at: input.enrolled_at || "",
    memo: input.memo || "",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.students, student);
  return student;
}

function updateStudent(user, input) {
  requireRole(user, ["admin", "staff"]);
  if (!input || !input.student_id || !input.name || !input.major) throw new Error("수강생 이름과 전공을 입력해 주세요.");
  if (!findObject(SHEETS.students, "student_id", input.student_id)) throw new Error("수강생을 찾을 수 없습니다.");
  const updated = {
    name: input.name.trim(),
    birth_date: input.birth_date || "",
    phone: input.phone || "",
    guardian_name: input.guardian_name || "",
    guardian_phone: input.guardian_phone || "",
    major: input.major.trim(),
    goal: input.goal || "",
    status: input.status || "상담중",
    teacher_id: input.teacher_id || "",
    enrolled_at: input.enrolled_at || "",
    memo: input.memo || "",
    updated_at: new Date().toISOString()
  };
  updateObject(SHEETS.students, "student_id", input.student_id, updated);
  return Object.assign({ student_id: input.student_id }, updated);
}

function listLessonLogs(user) {
  const logs = rowsAsObjects(SHEETS.lessonLogs);
  if (user.role === "teacher") return logs.filter((item) => item.teacher_id === user.account_id);
  if (user.role === "student") {
    return logs.filter((item) => item.student_id === user.linked_student_id).map((item) => {
      const copy = Object.assign({}, item);
      delete copy.internal_memo;
      return copy;
    });
  }
  return logs;
}

function createLessonLog(user, input) {
  requireRole(user, ["admin", "staff", "teacher"]);
  if (!input || !input.student_id || !input.lesson_date || !input.lesson_content) throw new Error("수강생, 수업일, 수업 내용을 입력해 주세요.");
  const student = rowsAsObjects(SHEETS.students).find((item) => item.student_id === input.student_id);
  if (!student) throw new Error("수강생을 찾을 수 없습니다.");
  if (user.role === "teacher" && student.teacher_id !== user.account_id) throw new Error("담당 수강생의 수업일지만 작성할 수 있습니다.");

  const now = new Date().toISOString();
  const log = {
    log_id: makeId("log"),
    lesson_date: input.lesson_date,
    student_id: input.student_id,
    teacher_id: user.role === "teacher" ? user.account_id : input.teacher_id || student.teacher_id || user.account_id,
    subject: input.subject || student.major || "",
    lesson_content: input.lesson_content,
    homework: input.homework || "",
    next_goal: input.next_goal || "",
    practice_request: input.practice_request || "",
    attendance_status: input.attendance_status || "출석",
    internal_memo: input.internal_memo || "",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.lessonLogs, log);
  return log;
}

function rowsAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + " 시트를 찾을 수 없습니다.");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const object = {};
    headers.forEach((header, index) => object[header] = normalizeCell(row[index]));
    return object;
  });
}

function appendObject(sheetName, object) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map((header) => object[header] === undefined ? "" : object[header]));
  } finally {
    lock.releaseLock();
  }
}

function findObject(sheetName, key, value) {
  return rowsAsObjects(sheetName).find((item) => item[key] === value);
}

function updateObject(sheetName, key, value, patch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    const values = sheet.getDataRange().getValues();
    if (!values.length) throw new Error(sheetName + " 시트가 비어 있습니다.");
    const headers = values[0].map(String);
    const keyIndex = headers.indexOf(key);
    if (keyIndex < 0) throw new Error(key + " 열을 찾을 수 없습니다.");
    const rowIndex = values.findIndex((row, index) => index > 0 && String(row[keyIndex]) === String(value));
    if (rowIndex < 0) throw new Error("수정할 항목을 찾을 수 없습니다.");
    const nextRow = values[rowIndex].slice();
    headers.forEach((header, index) => {
      if (Object.prototype.hasOwnProperty.call(patch, header)) nextRow[index] = patch[header];
    });
    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([nextRow]);
  } finally {
    lock.releaseLock();
  }
}

function deleteRowsWhere(sheetName, predicate) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const rows = rowsAsObjects(sheetName);
  for (let index = rows.length - 1; index >= 0; index--) {
    if (predicate(rows[index])) sheet.deleteRow(index + 2);
  }
}

function cleanupSessions() {
  const now = Date.now();
  deleteRowsWhere(SHEETS.sessions, (item) => new Date(item.expires_at).getTime() <= now);
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ":" + password, Utilities.Charset.UTF_8);
  return bytes.map((byte) => {
    const value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function publicAccount(account) {
  return {
    account_id: account.account_id,
    login_id: account.login_id,
    role: account.role,
    name: account.name,
    email: account.email || "",
    phone: account.phone || "",
    linked_student_id: account.linked_student_id || "",
    active: asBoolean(account.active),
    must_change_password: asBoolean(account.must_change_password)
  };
}

function studentForStudent(student) {
  return {
    student_id: student.student_id,
    name: student.name,
    major: student.major,
    goal: student.goal,
    status: student.status,
    teacher_id: student.teacher_id,
    enrolled_at: student.enrolled_at
  };
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw new Error("이 작업을 수행할 권한이 없습니다.");
}

function settingValue(settings, key) {
  const item = settings.find((row) => row.key === key);
  return item ? item.value : "";
}

function asBoolean(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function normalizeCell(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function makeId(prefix) {
  return prefix + "-" + Utilities.getUuid();
}

function success(data) {
  return jsonResponse({ ok: true, data });
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
