const STORAGE = {
  endpoint: "bonsung_api_endpoint",
  token: "bonsung_session_token",
  user: "bonsung_current_user",
  demo: "bonsung_demo_mode",
  demoData: "bonsung_demo_data_v2"
};

const ROLE_LABELS = { admin: "관리자", staff: "직원", teacher: "강사", student: "수강생" };
const STATUS_OPTIONS = ["상담중", "등록대기", "재원", "휴원", "퇴원"];
const ATTENDANCE_OPTIONS = ["출석", "지각", "결석", "취소"];
const root = document.getElementById("app");

const state = {
  endpoint: localStorage.getItem(STORAGE.endpoint) || "",
  token: localStorage.getItem(STORAGE.token) || "",
  user: readJson(STORAGE.user),
  demo: localStorage.getItem(STORAGE.demo) === "true",
  page: "dashboard",
  accounts: [],
  students: [],
  lessonLogs: [],
  editingStudentId: null,
  loading: false,
  message: ""
};

const demoSeed = {
  accounts: [
    { account_id: "acc-admin", login_id: "admin", role: "admin", name: "원장 관리자", email: "admin@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-staff", login_id: "staff", role: "staff", name: "운영 직원", email: "staff@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-teacher", login_id: "teacher", role: "teacher", name: "김강사", email: "teacher@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-student", login_id: "student", role: "student", name: "이보컬", email: "", phone: "", linked_student_id: "stu-1", active: true, must_change_password: false }
  ],
  students: [
    { student_id: "stu-1", name: "이보컬", birth_date: "2008-04-12", phone: "010-0000-0001", guardian_name: "이보컬 보호자", guardian_phone: "010-0000-1001", major: "보컬", goal: "입시 준비", status: "재원", teacher_id: "acc-teacher", enrolled_at: "2026-06-01", memo: "" },
    { student_id: "stu-2", name: "최피아노", birth_date: "2010-08-20", phone: "010-0000-0002", guardian_name: "최피아노 보호자", guardian_phone: "010-0000-1002", major: "재즈피아노", goal: "취미 연주", status: "등록대기", teacher_id: "acc-teacher", enrolled_at: "", memo: "시간 조율 중" }
  ],
  lessonLogs: [
    { log_id: "log-1", lesson_date: "2026-06-10", student_id: "stu-1", teacher_id: "acc-teacher", subject: "보컬", lesson_content: "호흡과 발성 연결 연습", homework: "립트릴 10분", next_goal: "고음 구간 안정화", practice_request: "주 4회 녹음", attendance_status: "출석", internal_memo: "" }
  ]
};

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDemoData() {
  const stored = readJson(STORAGE.demoData);
  if (stored) return stored;
  localStorage.setItem(STORAGE.demoData, JSON.stringify(demoSeed));
  return structuredClone(demoSeed);
}

function saveDemoData(data) {
  localStorage.setItem(STORAGE.demoData, JSON.stringify(data));
}

async function api(action, payload = {}) {
  if (state.demo) return demoApi(action, payload);
  if (!state.endpoint) throw new Error("Google Apps Script API 주소를 먼저 연결해 주세요.");
  const response = await fetch(state.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result.data;
}

function demoApi(action, payload) {
  const data = getDemoData();
  if (action === "health") return { academyName: "본성뮤직 아카데미", schemaVersion: "1" };
  if (action === "login") {
    const account = data.accounts.find((item) => item.login_id === payload.loginId && item.active);
    if (!account || payload.password !== "bonsung1") throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    return { token: `demo-${account.account_id}`, user: account };
  }
  if (action === "dashboard") return { accounts: data.accounts.length, students: data.students.length, logs: data.lessonLogs.length };
  if (action === "listAccounts") return data.accounts;
  if (action === "createAccount") {
    if (data.accounts.some((item) => item.login_id === payload.account.login_id)) throw new Error("이미 사용 중인 아이디입니다.");
    const { password: _password, ...accountInput } = payload.account;
    const account = { ...accountInput, account_id: uid("acc"), active: true, must_change_password: true };
    data.accounts.push(account); saveDemoData(data); return account;
  }
  if (action === "updateAccountStatus") {
    const account = data.accounts.find((item) => item.account_id === payload.accountId);
    if (!account) throw new Error("계정을 찾을 수 없습니다.");
    account.active = payload.active;
    saveDemoData(data);
    return account;
  }
  if (action === "resetAccountPassword") {
    const account = data.accounts.find((item) => item.account_id === payload.accountId);
    if (!account) throw new Error("계정을 찾을 수 없습니다.");
    account.must_change_password = true;
    saveDemoData(data);
    return true;
  }
  if (action === "changePassword") {
    state.user.must_change_password = false;
    const account = data.accounts.find((item) => item.account_id === state.user.account_id);
    if (account) account.must_change_password = false;
    saveDemoData(data);
    return true;
  }
  if (action === "listStudents") return visibleStudents(data.students);
  if (action === "createStudent") {
    const student = { ...payload.student, student_id: uid("stu") };
    data.students.push(student); saveDemoData(data); return student;
  }
  if (action === "updateStudent") {
    const index = data.students.findIndex((item) => item.student_id === payload.student.student_id);
    if (index < 0) throw new Error("수강생을 찾을 수 없습니다.");
    data.students[index] = { ...data.students[index], ...payload.student };
    saveDemoData(data);
    return data.students[index];
  }
  if (action === "listLessonLogs") return visibleLogs(data.lessonLogs);
  if (action === "createLessonLog") {
    const log = { ...payload.log, log_id: uid("log"), teacher_id: state.user.account_id };
    data.lessonLogs.unshift(log); saveDemoData(data); return log;
  }
  if (action === "logout") return true;
  throw new Error("지원하지 않는 데모 작업입니다.");
}

function visibleStudents(students) {
  if (!state.user) return [];
  if (state.user.role === "teacher") return students.filter((item) => item.teacher_id === state.user.account_id);
  if (state.user.role === "student") return students.filter((item) => item.student_id === state.user.linked_student_id);
  return students;
}

function visibleLogs(logs) {
  if (!state.user) return [];
  if (state.user.role === "teacher") return logs.filter((item) => item.teacher_id === state.user.account_id);
  if (state.user.role === "student") return logs.filter((item) => item.student_id === state.user.linked_student_id);
  return logs;
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setBusy(true, "");
  try {
    const result = await api("login", { loginId: form.get("loginId"), password: form.get("password") });
    state.token = result.token;
    state.user = result.user;
    state.page = result.user.must_change_password ? "profile" : defaultPage(result.user.role);
    localStorage.setItem(STORAGE.token, result.token);
    localStorage.setItem(STORAGE.user, JSON.stringify(result.user));
    await refreshData();
  } catch (error) {
    setBusy(false, error.message);
  }
}

function defaultPage(role) {
  if (role === "teacher" || role === "student") return "lesson-logs";
  return "dashboard";
}

async function refreshData() {
  setBusy(true, "");
  try {
    const jobs = [api("listStudents"), api("listLessonLogs")];
    if (["admin", "staff"].includes(state.user.role)) jobs.push(api("listAccounts"));
    const [students, lessonLogs, accounts = []] = await Promise.all(jobs);
    state.students = students;
    state.lessonLogs = lessonLogs;
    state.accounts = accounts;
    setBusy(false, "");
  } catch (error) {
    if (/세션|로그인|token/i.test(error.message)) return logout();
    setBusy(false, error.message);
  }
}

function setBusy(loading, message) {
  state.loading = loading;
  state.message = message;
  render();
}

function logout() {
  api("logout").catch(() => {});
  state.token = "";
  state.user = null;
  state.accounts = [];
  state.students = [];
  state.lessonLogs = [];
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
  render();
}

function useDemo() {
  state.demo = true;
  state.endpoint = "";
  localStorage.setItem(STORAGE.demo, "true");
  localStorage.removeItem(STORAGE.endpoint);
  render();
}

async function connectApi(event) {
  event.preventDefault();
  const endpoint = new FormData(event.currentTarget).get("endpoint").trim();
  state.endpoint = endpoint;
  state.demo = false;
  setBusy(true, "");
  try {
    await api("health");
    localStorage.setItem(STORAGE.endpoint, endpoint);
    localStorage.setItem(STORAGE.demo, "false");
    setBusy(false, "연결되었습니다. 계정으로 로그인해 주세요.");
  } catch (error) {
    state.endpoint = "";
    setBusy(false, error.message);
  }
}

function resetConnection() {
  logout();
  state.endpoint = "";
  state.demo = false;
  localStorage.removeItem(STORAGE.endpoint);
  localStorage.removeItem(STORAGE.demo);
  render();
}

function navigate(page) {
  state.page = page;
  render();
}

async function createAccount(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.active = true;
  values.linked_student_id ||= "";
  setBusy(true, "");
  try {
    await api("createAccount", { account: values });
    await refreshData();
    state.message = "계정이 생성되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createStudent(event) {
  event.preventDefault();
  const student = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createStudent", { student });
    await refreshData();
    state.message = "수강생이 등록되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateStudent(event) {
  event.preventDefault();
  const student = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("updateStudent", { student });
    state.editingStudentId = null;
    await refreshData();
    state.message = "수강생 정보가 수정되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function toggleAccount(accountId, active) {
  setBusy(true, "");
  try {
    await api("updateAccountStatus", { accountId, active });
    await refreshData();
    state.message = active ? "계정 사용을 재개했습니다." : "계정 사용을 중지했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function resetAccountPassword(accountId) {
  const password = window.prompt("새 초기 비밀번호를 입력하세요. 8자 이상이어야 합니다.");
  if (!password) return;
  setBusy(true, "");
  try {
    await api("resetAccountPassword", { accountId, password });
    await refreshData();
    state.message = "비밀번호를 초기화했습니다. 사용자는 다음 로그인 후 비밀번호를 변경해야 합니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function changePassword(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (values.newPassword !== values.confirmPassword) {
    state.message = "새 비밀번호 확인이 일치하지 않습니다.";
    render();
    return;
  }
  setBusy(true, "");
  try {
    await api("changePassword", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    });
    state.user.must_change_password = false;
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    state.page = defaultPage(state.user.role);
    state.message = "비밀번호가 변경되었습니다.";
    await refreshData();
  } catch (error) { setBusy(false, error.message); }
}

function beginStudentEdit(studentId) {
  state.editingStudentId = studentId;
  render();
}

function cancelStudentEdit() {
  state.editingStudentId = null;
  render();
}

async function createLessonLog(event) {
  event.preventDefault();
  const log = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createLessonLog", { log });
    await refreshData();
    state.message = "수업일지가 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

function menusFor(role) {
  const all = [
    ["dashboard", "대시보드", ["admin", "staff"]],
    ["accounts", "계정 관리", ["admin", "staff"]],
    ["students", "수강생 관리", ["admin", "staff", "teacher"]],
    ["lesson-logs", role === "student" ? "내 수업일지" : "수업일지", ["admin", "staff", "teacher", "student"]],
    ["profile", "내 계정", ["admin", "staff", "teacher", "student"]]
  ];
  return all.filter(([, , roles]) => roles.includes(role));
}

function render() {
  if (!state.user) return renderAuth();
  const menus = menusFor(state.user.role);
  if (state.user.must_change_password) state.page = "profile";
  if (!menus.some(([key]) => key === state.page)) state.page = defaultPage(state.user.role);
  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <p class="brand">본성뮤직</p>
        <p class="sidebar-sub">Academy Intranet v1</p>
        <nav class="nav">${menus.map(([key, label]) => `<button class="${state.page === key ? "active" : ""}" onclick="navigate('${key}')">${label}</button>`).join("")}</nav>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="identity"><strong>${escapeHtml(state.user.name)}</strong><span>${ROLE_LABELS[state.user.role]} 계정</span></div>
          <div class="top-actions">
            <button class="btn secondary small config-label" onclick="resetConnection()">연결 설정</button>
            <button class="btn secondary small" onclick="logout()">로그아웃</button>
          </div>
        </header>
        <main class="content">${state.message ? `<div class="notice">${escapeHtml(state.message)}</div>` : ""}${renderPage()}</main>
      </section>
      <nav class="mobile-nav">${menus.map(([key, label]) => `<button class="${state.page === key ? "active" : ""}" onclick="navigate('${key}')">${label}</button>`).join("")}<button onclick="logout()">로그아웃</button></nav>
    </div>`;
  labelResponsiveTables();
}

function renderAuth() {
  const connected = state.demo || state.endpoint;
  root.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel">
        <p class="brand">본성뮤직 아카데미</p>
        <h1>${connected ? "인트라넷 로그인" : "운영 데이터 연결"}</h1>
        <p class="auth-copy">${connected ? "발급받은 아이디와 비밀번호를 입력하세요." : "Google Sheets와 연결된 Apps Script 웹앱 주소를 입력하세요."}</p>
        ${connected ? `
          <form class="form-stack" onsubmit="login(event)">
            <label class="field"><span>아이디</span><input name="loginId" autocomplete="username" required /></label>
            <label class="field"><span>비밀번호</span><input name="password" type="password" autocomplete="current-password" required /></label>
            <button class="btn" ${state.loading ? "disabled" : ""}>${state.loading ? "확인 중..." : "로그인"}</button>
          </form>
          ${state.demo ? `<p class="muted" style="font-size:12px;margin-top:14px">체험 계정: admin, staff, teacher, student / 비밀번호: bonsung1</p>` : ""}
          <button class="text-btn" onclick="resetConnection()">연결 주소 변경</button>
        ` : `
          <form class="form-stack" onsubmit="connectApi(event)">
            <label class="field"><span>Apps Script 웹앱 주소</span><input name="endpoint" type="url" placeholder="https://script.google.com/macros/s/.../exec" required /></label>
            <button class="btn" ${state.loading ? "disabled" : ""}>${state.loading ? "연결 확인 중..." : "Google Sheets 연결"}</button>
          </form>
          <div class="connection-box">
            <button class="btn secondary" onclick="useDemo()">데모 데이터로 먼저 둘러보기</button>
          </div>
        `}
        <p class="status-line ${state.message && !/연결되었습니다/.test(state.message) ? "error" : "success"}">${escapeHtml(state.message)}</p>
      </section>
      <section class="auth-context">
        <p class="brand">BONSUNG MUSIC</p>
        <h1>수강생과 수업 기록을<br />한곳에서 관리합니다.</h1>
        <p>직원은 계정과 수강생을 관리하고, 강사는 담당 수업일지를 작성하며, 수강생은 본인의 기록만 확인합니다.</p>
      </section>
    </main>`;
}

function labelResponsiveTables() {
  root.querySelectorAll("table").forEach((table) => {
    const labels = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        cell.dataset.label = labels[index] || "정보";
      });
    });
  });
}

function renderPage() {
  if (state.page === "accounts") return renderAccounts();
  if (state.page === "students") return renderStudents();
  if (state.page === "lesson-logs") return renderLessonLogs();
  if (state.page === "profile") return renderProfile();
  return renderDashboard();
}

function renderDashboard() {
  const activeStudents = state.students.filter((item) => item.status === "재원").length;
  const recentLogs = state.lessonLogs.slice(0, 5);
  return `
    <div class="page-heading"><div><h1>대시보드</h1><p>현재 등록 정보와 최근 수업 기록입니다.</p></div><button class="btn secondary small" onclick="refreshData()">새로고침</button></div>
    <section class="stats">
      <div class="stat"><span>전체 수강생</span><strong>${state.students.length}</strong></div>
      <div class="stat"><span>재원 수강생</span><strong>${activeStudents}</strong></div>
      <div class="stat"><span>등록 계정</span><strong>${state.accounts.length}</strong></div>
      <div class="stat"><span>수업일지</span><strong>${state.lessonLogs.length}</strong></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>최근 수업일지</h2></div>
      ${logsTable(recentLogs)}
    </section>`;
}

function renderAccounts() {
  const studentOptions = state.students.map((item) => `<option value="${escapeHtml(item.student_id)}">${escapeHtml(item.name)}</option>`).join("");
  const roleOptions = state.user.role === "admin"
    ? `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option><option value="admin">관리자</option>`
    : `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option>`;
  return `
    <div class="page-heading"><div><h1>계정 관리</h1><p>직원, 강사, 수강생의 로그인 계정을 발급합니다.</p></div></div>
    <div class="layout-grid">
      <section class="panel">
        <div class="panel-head"><h2>계정 목록</h2><span class="badge">${state.accounts.length}명</span></div>
        ${state.accounts.length ? `<div class="table-wrap"><table><thead><tr><th>이름</th><th>아이디</th><th>권한</th><th>연결 수강생</th><th>상태</th><th>관리</th></tr></thead><tbody>${state.accounts.map((item) => {
          const canManage = item.account_id !== state.user.account_id && (state.user.role === "admin" || item.role !== "admin");
          return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.login_id)}</td><td>${ROLE_LABELS[item.role] || item.role}</td><td>${escapeHtml(studentName(item.linked_student_id) || "-")}</td><td><span class="badge ${item.active ? "success" : "warn"}">${item.active ? "사용" : "중지"}</span></td><td>${canManage ? `<div class="row-actions"><button class="btn secondary small" onclick="toggleAccount('${item.account_id}', ${!item.active})">${item.active ? "사용 중지" : "사용 재개"}</button><button class="btn secondary small" onclick="resetAccountPassword('${item.account_id}')">비밀번호 초기화</button></div>` : "-"}</td></tr>`;
        }).join("")}</tbody></table></div>` : empty("등록된 계정이 없습니다.")}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>새 계정</h2></div>
        <form class="panel-body form-grid" onsubmit="createAccount(event)">
          <label class="field"><span>이름</span><input name="name" required /></label>
          <label class="field"><span>로그인 아이디</span><input name="login_id" required /></label>
          <label class="field"><span>초기 비밀번호</span><input name="password" type="password" minlength="8" required /></label>
          <label class="field"><span>권한</span><select name="role" required>${roleOptions}</select></label>
          <label class="field"><span>연결 수강생</span><select name="linked_student_id"><option value="">해당 없음</option>${studentOptions}</select></label>
          <label class="field"><span>이메일</span><input name="email" type="email" /></label>
          <label class="field"><span>연락처</span><input name="phone" /></label>
          <div class="form-actions"><button class="btn">계정 생성</button></div>
        </form>
      </section>
    </div>`;
}

function renderStudents() {
  const canEdit = ["admin", "staff"].includes(state.user.role);
  const teachers = state.accounts.filter((item) => item.role === "teacher" && item.active);
  const editingStudent = state.students.find((item) => item.student_id === state.editingStudentId);
  const formStudent = editingStudent || {};
  const formTitle = editingStudent ? "수강생 수정" : "수강생 등록";
  const formHandler = editingStudent ? "updateStudent(event)" : "createStudent(event)";
  return `
    <div class="page-heading"><div><h1>수강생 관리</h1><p>${canEdit ? "수강생 기본 정보와 담당 강사를 관리합니다." : "본인이 담당하는 수강생입니다."}</p></div></div>
    <div class="${canEdit ? "layout-grid" : ""}">
      <section class="panel">
        <div class="panel-head"><h2>수강생 목록</h2><span class="badge">${state.students.length}명</span></div>
        ${state.students.length ? `<div class="table-wrap"><table><thead><tr><th>이름</th><th>전공</th><th>상태</th><th>보호자</th><th>연락처</th><th>담당 강사</th>${canEdit ? "<th>관리</th>" : ""}</tr></thead><tbody>${state.students.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.major)}</td><td><span class="badge ${item.status === "재원" ? "success" : ""}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.guardian_name || "-")}</td><td>${escapeHtml(item.guardian_phone || item.phone || "-")}</td><td>${escapeHtml(accountName(item.teacher_id) || "-")}</td>${canEdit ? `<td><button class="btn secondary small" onclick="beginStudentEdit('${item.student_id}')">수정</button></td>` : ""}</tr>`).join("")}</tbody></table></div>` : empty("등록된 수강생이 없습니다.")}
      </section>
      ${canEdit ? `<section class="panel"><div class="panel-head"><h2>${formTitle}</h2>${editingStudent ? `<button class="btn secondary small" onclick="cancelStudentEdit()">취소</button>` : ""}</div><form class="panel-body form-grid two" onsubmit="${formHandler}">
        ${editingStudent ? `<input name="student_id" type="hidden" value="${escapeHtml(formStudent.student_id)}" />` : ""}
        <label class="field"><span>이름</span><input name="name" value="${escapeHtml(formStudent.name || "")}" required /></label>
        <label class="field"><span>생년월일</span><input name="birth_date" type="date" value="${escapeHtml(dateInputValue(formStudent.birth_date))}" /></label>
        <label class="field"><span>연락처</span><input name="phone" value="${escapeHtml(formStudent.phone || "")}" /></label>
        <label class="field"><span>전공</span><input name="major" value="${escapeHtml(formStudent.major || "")}" required /></label>
        <label class="field"><span>보호자 이름</span><input name="guardian_name" value="${escapeHtml(formStudent.guardian_name || "")}" /></label>
        <label class="field"><span>보호자 연락처</span><input name="guardian_phone" value="${escapeHtml(formStudent.guardian_phone || "")}" /></label>
        <label class="field"><span>상태</span><select name="status">${STATUS_OPTIONS.map((item) => `<option ${formStudent.status === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="field"><span>담당 강사</span><select name="teacher_id"><option value="">미지정</option>${teachers.map((item) => `<option value="${item.account_id}" ${formStudent.teacher_id === item.account_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
        <label class="field wide"><span>목표</span><input name="goal" value="${escapeHtml(formStudent.goal || "")}" /></label>
        <label class="field"><span>등록일</span><input name="enrolled_at" type="date" value="${escapeHtml(dateInputValue(formStudent.enrolled_at))}" /></label>
        <label class="field wide"><span>메모</span><textarea name="memo">${escapeHtml(formStudent.memo || "")}</textarea></label>
        <div class="form-actions wide"><button class="btn">${editingStudent ? "수정 저장" : "수강생 등록"}</button></div>
      </form></section>` : ""}
    </div>`;
}

function renderProfile() {
  return `
    <div class="page-heading"><div><h1>내 계정</h1><p>로그인 비밀번호를 변경합니다.</p></div></div>
    ${state.user.must_change_password ? `<div class="notice">초기 비밀번호를 사용 중입니다.<br />계속 사용하려면 새 비밀번호로 변경해 주세요.</div>` : ""}
    <section class="panel profile-panel">
      <div class="panel-head"><h2>비밀번호 변경</h2></div>
      <form class="panel-body form-grid" onsubmit="changePassword(event)">
        <label class="field"><span>현재 비밀번호</span><input name="currentPassword" type="password" autocomplete="current-password" required /></label>
        <label class="field"><span>새 비밀번호</span><input name="newPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
        <label class="field"><span>새 비밀번호 확인</span><input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
        <div class="form-actions"><button class="btn">비밀번호 변경</button></div>
      </form>
    </section>`;
}

function renderLessonLogs() {
  const canWrite = ["admin", "staff", "teacher"].includes(state.user.role);
  return `
    <div class="page-heading"><div><h1>${state.user.role === "student" ? "내 수업일지" : "수업일지"}</h1><p>${canWrite ? "수업 내용, 과제와 다음 목표를 기록합니다." : "강사가 작성한 수업 기록을 확인합니다."}</p></div></div>
    <div class="${canWrite ? "layout-grid" : ""}">
      <section class="panel"><div class="panel-head"><h2>수업 기록</h2><span class="badge">${state.lessonLogs.length}건</span></div>${logsTable(state.lessonLogs)}</section>
      ${canWrite ? `<section class="panel"><div class="panel-head"><h2>새 수업일지</h2></div><form class="panel-body form-grid" onsubmit="createLessonLog(event)">
        <label class="field"><span>수업일</span><input name="lesson_date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></label>
        <label class="field"><span>수강생</span><select name="student_id" required><option value="">선택</option>${state.students.map((item) => `<option value="${item.student_id}">${escapeHtml(item.name)} · ${escapeHtml(item.major)}</option>`).join("")}</select></label>
        <label class="field"><span>과목</span><input name="subject" required /></label>
        <label class="field"><span>출결</span><select name="attendance_status">${ATTENDANCE_OPTIONS.map((item) => `<option>${item}</option>`).join("")}</select></label>
        <label class="field"><span>수업 내용</span><textarea name="lesson_content" required></textarea></label>
        <label class="field"><span>과제</span><textarea name="homework"></textarea></label>
        <label class="field"><span>다음 수업 목표</span><textarea name="next_goal"></textarea></label>
        <label class="field"><span>연습 요청</span><textarea name="practice_request"></textarea></label>
        <label class="field"><span>내부 메모</span><textarea name="internal_memo"></textarea></label>
        <div class="form-actions"><button class="btn">수업일지 저장</button></div>
      </form></section>` : ""}
    </div>`;
}

function logsTable(logs) {
  if (!logs.length) return empty("작성된 수업일지가 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>수업일</th><th>수강생</th><th>강사</th><th>과목</th><th>출결</th><th>수업 내용</th><th>다음 목표</th></tr></thead><tbody>${logs.map((item) => `<tr><td>${escapeHtml(item.lesson_date)}</td><td>${escapeHtml(studentName(item.student_id) || item.student_id)}</td><td>${escapeHtml(accountName(item.teacher_id) || state.user.name)}</td><td>${escapeHtml(item.subject)}</td><td><span class="badge ${item.attendance_status === "출석" ? "success" : "warn"}">${escapeHtml(item.attendance_status)}</span></td><td class="wrap">${escapeHtml(item.lesson_content)}</td><td class="wrap">${escapeHtml(item.next_goal || "-")}</td></tr>`).join("")}</tbody></table></div>`;
}

function studentName(id) { return state.students.find((item) => item.student_id === id)?.name; }
function accountName(id) { return state.accounts.find((item) => item.account_id === id)?.name; }
function dateInputValue(value) { return value ? String(value).slice(0, 10) : ""; }
function empty(message) { return `<div class="empty"><strong>${escapeHtml(message)}</strong><span>새 항목이 등록되면 이곳에 표시됩니다.</span></div>`; }

window.login = login;
window.logout = logout;
window.useDemo = useDemo;
window.connectApi = connectApi;
window.resetConnection = resetConnection;
window.navigate = navigate;
window.refreshData = refreshData;
window.createAccount = createAccount;
window.createStudent = createStudent;
window.updateStudent = updateStudent;
window.toggleAccount = toggleAccount;
window.resetAccountPassword = resetAccountPassword;
window.changePassword = changePassword;
window.beginStudentEdit = beginStudentEdit;
window.cancelStudentEdit = cancelStudentEdit;
window.createLessonLog = createLessonLog;

if (state.user) refreshData(); else render();
