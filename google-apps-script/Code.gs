const SPREADSHEET_ID = "1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0";
const TIMEZONE = "Asia/Seoul";
const SESSION_HOURS = 12;

const SHEETS = {
  accounts: "계정",
  students: "수강생",
  lessonLogs: "수업일지",
  sessions: "세션",
  settings: "설정",
  enrollments: "수강등록",
  lessons: "수업일정",
  usage: "이용기록",
  templates: "수업일지템플릿",
  registrations: "등록결제",
  rooms: "공간",
  reservations: "공간예약",
  workLogs: "근태",
  meetings: "회의",
  calendarEvents: "학원일정",
  tasks: "업무",
  classTypes: "수업종류",
  accountRequests: "계정요청"
};

const SCHEMA = {
  계정: ["account_id", "login_id", "password_hash", "password_salt", "role", "name", "email", "phone", "linked_student_id", "active", "must_change_password", "created_at", "updated_at", "account_type", "employee_position", "permissions_json", "profile_intro", "theme"],
  수강생: ["student_id", "name", "birth_date", "phone", "guardian_name", "guardian_phone", "major", "goal", "status", "teacher_id", "enrolled_at", "memo", "created_at", "updated_at"],
  수업일지: ["log_id", "lesson_date", "student_id", "teacher_id", "subject", "lesson_content", "homework", "next_goal", "practice_request", "attendance_status", "internal_memo", "created_at", "updated_at", "absence_reason", "makeup_date", "lesson_number"],
  세션: ["token", "account_id", "expires_at", "created_at"],
  설정: ["key", "value", "description", "updated_at"],
  수강등록: ["enrollment_id", "student_id", "teacher_id", "subject", "start_date", "end_date", "status", "weekly_day", "start_time", "duration_minutes", "room", "memo", "created_at", "updated_at"],
  수업일정: ["lesson_id", "lesson_date", "start_time", "duration_minutes", "student_id", "teacher_id", "subject", "status", "room", "memo", "enrollment_id", "created_at", "updated_at", "absence_reason", "makeup_date", "lesson_number"],
  이용기록: ["event_id", "occurred_at", "account_id", "role", "action", "target_type", "target_id", "metadata", "date_key"],
  수업일지템플릿: ["template_id", "teacher_id", "title", "subject", "lesson_content", "homework", "next_goal", "practice_request", "active", "created_at", "updated_at", "scope"],
  등록결제: ["registration_id", "student_id", "enrollment_id", "registration_type", "period_start", "period_end", "amount", "paid_at", "next_due_date", "payment_status", "payment_method", "memo", "created_by", "created_at", "updated_at"],
  공간: ["room_id", "room_type", "name", "active", "sort_order", "created_at", "updated_at"],
  공간예약: ["reservation_id", "room_id", "reserved_by", "reservation_date", "start_time", "end_time", "purpose", "status", "memo", "created_at", "updated_at"],
  근태: ["work_log_id", "account_id", "work_date", "clock_in_at", "clock_out_at", "memo", "created_at", "updated_at"],
  회의: ["meeting_id", "title", "meeting_date", "start_time", "end_time", "location", "agenda", "participant_ids", "created_by", "status", "created_at", "updated_at"],
  학원일정: ["event_id", "title", "event_date", "start_time", "end_time", "event_type", "audience", "description", "created_by", "status", "created_at", "updated_at"],
  업무: ["task_id", "title", "assignee_id", "due_date", "status", "priority", "memo", "created_by", "created_at", "updated_at"],
  수업종류: ["class_type_id", "name", "category", "active", "sort_order", "created_at", "updated_at"],
  계정요청: ["request_id", "login_id", "password_hash", "password_salt", "name", "email", "phone", "requested_role", "message", "status", "reviewed_by", "reviewed_at", "review_memo", "created_account_id", "created_at", "updated_at"]
};

const ROLES = ["admin", "staff", "teacher", "student"];
const ACCOUNT_TYPES = ["admin", "staff", "student"];
const EMPLOYEE_POSITIONS = ["owner", "manager", "employee", "teacher"];
const ENROLLMENT_STATUSES = ["active", "paused", "completed", "canceled"];
const LESSON_STATUSES = ["예정", "완료", "결석", "보강예정", "취소"];
const PAYMENT_STATUSES = ["청구예정", "청구완료", "납부완료", "미납", "환불", "취소"];
const RESERVATION_STATUSES = ["예약", "사용완료", "취소", "노쇼"];
const RESERVATION_PURPOSES = ["레슨", "이론수업", "회의", "연습"];
const CLASS_TYPE_CATEGORIES = ["레슨", "이론수업", "그룹수업"];
const PUBLIC_SETTING_DEFAULTS = {
  login_context_title: "오늘의 수업부터\n수강생 성장 기록까지",
  login_context_body: "관리자는 운영 흐름을 확인하고, 강사는 수업에 집중하며, 수강생은 자신의 학습 기록을 한곳에서 확인합니다.",
  login_popup_enabled: "true",
  login_popup_title: "본성뮤직 운영 안내",
  login_popup_body: "계정이 없는 구성원은 신규 계정 요청을 제출해 주세요. 관리자 승인 후 로그인할 수 있습니다."
};
const REQUEST_CACHE = {};

function doGet() {
  try {
    return success(health());
  } catch (error) {
    return failure(error);
  }
}

function doPost(event) {
  try {
    Object.keys(REQUEST_CACHE).forEach((key) => delete REQUEST_CACHE[key]);
    ensureSchema();
    const request = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const action = request.action;

    if (action === "health") return success(health());
    if (action === "bootstrapAdmin") return success(bootstrapAdmin(request));
    if (action === "login") return success(login(request.loginId, request.password));
    if (action === "requestAccount") return success(requestAccount(request.accountRequest));

    const currentUser = requireSession(request.token);
    if (action === "bootstrap") return success(getBootstrapData(currentUser));
    if (action === "logout") return success(logout(currentUser, request.token));
    if (action === "listAccounts") return success(listAccounts(currentUser));
    if (action === "createAccount") return success(createAccount(currentUser, request.account));
    if (action === "updateAccountStatus") return success(updateAccountStatus(currentUser, request.accountId, request.active));
    if (action === "updateAccount") return success(updateAccount(currentUser, request.account));
    if (action === "resetAccountPassword") return success(resetAccountPassword(currentUser, request.accountId, request.password));
    if (action === "changePassword") return success(changePassword(currentUser, request.currentPassword, request.newPassword));
    if (action === "listStudents") return success(listStudents(currentUser));
    if (action === "createStudent") return success(createStudent(currentUser, request.student));
    if (action === "updateStudent") return success(updateStudent(currentUser, request.student));
    if (action === "listEnrollments") return success(listEnrollments(currentUser));
    if (action === "createEnrollment") return success(createEnrollment(currentUser, request.enrollment));
    if (action === "listLessons") return success(listLessons(currentUser));
    if (action === "createLesson") return success(createLesson(currentUser, request.lesson));
    if (action === "updateLesson") return success(updateLesson(currentUser, request.lesson));
    if (action === "listLessonLogs") return success(listLessonLogs(currentUser));
    if (action === "createLessonLog") return success(createLessonLog(currentUser, request.log));
    if (action === "listLessonTemplates") return success(listLessonTemplates(currentUser));
    if (action === "createLessonTemplate") return success(createLessonTemplate(currentUser, request.template));
    if (action === "deleteLessonTemplate") return success(deleteLessonTemplate(currentUser, request.templateId));
    if (action === "getMyOverview") return success(getMyOverview(currentUser));
    if (action === "getUsageSummary") return success(getUsageSummary(currentUser));
    if (action === "recordPageView") return success(recordPageView(currentUser, request.page));
    if (action === "listRegistrations") return success(listRegistrations(currentUser));
    if (action === "createRegistration") return success(createRegistration(currentUser, request.registration));
    if (action === "listRooms") return success(listRooms(currentUser));
    if (action === "updateRoom") return success(updateRoom(currentUser, request.room));
    if (action === "listReservations") return success(listReservations(currentUser));
    if (action === "createReservation") return success(createReservation(currentUser, request.reservation));
    if (action === "updateReservationStatus") return success(updateReservationStatus(currentUser, request.reservationId, request.status));
    if (action === "listWorkLogs") return success(listWorkLogs(currentUser));
    if (action === "clockWork") return success(clockWork(currentUser, request.mode));
    if (action === "listMeetings") return success(listMeetings(currentUser));
    if (action === "createMeeting") return success(createMeeting(currentUser, request.meeting));
    if (action === "listCalendar") return success(listCalendar(currentUser));
    if (action === "createCalendarEvent") return success(createCalendarEvent(currentUser, request.calendarEvent));
    if (action === "updateProfile") return success(updateProfile(currentUser, request.profile));
    if (action === "updateAccountPermissions") return success(updateAccountPermissions(currentUser, request.accountId, request.permissions));
    if (action === "listTasks") return success(listTasks(currentUser, request.accountId));
    if (action === "createTask") return success(createTask(currentUser, request.task));
    if (action === "listClassTypes") return success(listClassTypes(currentUser));
    if (action === "createClassType") return success(createClassType(currentUser, request.classType));
    if (action === "updateClassType") return success(updateClassType(currentUser, request.classType));
    if (action === "listAccountRequests") return success(listAccountRequests(currentUser));
    if (action === "reviewAccountRequest") return success(reviewAccountRequest(currentUser, request.requestId, request.decision, request.review));
    if (action === "updatePublicSettings") return success(updatePublicSettings(currentUser, request.settings));

    throw new Error("지원하지 않는 작업입니다.");
  } catch (error) {
    return failure(error);
  }
}

function health() {
  ensureSchema();
  const settings = rowsAsObjects(SHEETS.settings);
  return {
    academyName: settingValue(settings, "academy_name") || "본성뮤직 아카데미",
    schemaVersion: settingValue(settings, "schema_version") || "5",
    service: "Bonsung Music Intranet API",
    publicConfig: publicSettings(settings)
  };
}

function bootstrapAdmin(request) {
  const setupKey = PropertiesService.getScriptProperties().getProperty("SETUP_KEY");
  if (!setupKey || request.setupKey !== setupKey) throw new Error("초기 설정 키가 올바르지 않습니다.");
  if (rowsAsObjects(SHEETS.accounts).length > 0) throw new Error("이미 계정이 등록되어 있습니다.");
  if (!request.loginId || !request.password || request.password.length < 8) throw new Error("관리자 아이디와 8자 이상의 비밀번호가 필요합니다.");

  const now = nowIso();
  const salt = Utilities.getUuid();
  const account = {
    account_id: makeId("acc"),
    login_id: String(request.loginId).trim(),
    password_hash: hashPassword(request.password, salt),
    password_salt: salt,
    role: "admin",
    name: request.name || "admin",
    email: request.email || "",
    phone: request.phone || "",
    linked_student_id: "",
    active: true,
    must_change_password: false,
    created_at: now,
    updated_at: now,
    account_type: "admin",
    employee_position: "owner",
    permissions_json: "{}",
    profile_intro: "",
    theme: "system"
  };
  appendObject(SHEETS.accounts, account);
  PropertiesService.getScriptProperties().deleteProperty("SETUP_KEY");
  logEvent(account, "bootstrap_admin", "account", account.account_id, {});
  return true;
}

function login(loginId, password) {
  cleanupSessions();
  const normalizedLoginId = String(loginId || "").trim();
  const account = rowsAsObjects(SHEETS.accounts).find((item) => item.login_id === normalizedLoginId);
  if (!account || !asBoolean(account.active)) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  if (account.password_hash !== hashPassword(String(password || ""), account.password_salt)) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const token = Utilities.getUuid() + Utilities.getUuid();
  const now = new Date();
  appendObject(SHEETS.sessions, {
    token,
    account_id: account.account_id,
    expires_at: new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
    created_at: now.toISOString()
  });
  logEvent(account, "login", "account", account.account_id, {});
  return { token, user: publicAccount(account) };
}

function logout(user, token) {
  logEvent(user, "logout", "account", user.account_id, {});
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
  if (!canViewAccounts(user) && !canManageOperations(user)) throw new Error("계정을 조회할 권한이 없습니다.");
  const loginEvents = rowsAsObjects(SHEETS.usage).filter((item) => item.action === "login");
  return rowsAsObjects(SHEETS.accounts).map((account) => {
    const logins = loginEvents.filter((item) => item.account_id === account.account_id)
      .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
    return Object.assign(publicAccount(account), {
      last_login_at: logins[0] ? logins[0].occurred_at : "",
      login_count: logins.length,
      recent_logins: logins.slice(0, 10).map((item) => item.occurred_at)
    });
  });
}

function createAccount(user, input) {
  if (!canManageAccounts(user)) throw new Error("계정을 생성할 권한이 없습니다.");
  if (!input || !input.login_id || !input.name || !input.password) throw new Error("이름, 아이디, 초기 비밀번호를 입력해 주세요.");
  if (String(input.password).length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  if (!ROLES.includes(input.role)) throw new Error("올바르지 않은 권한입니다.");
  if (input.role === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 계정은 관리자만 만들 수 있습니다.");
  if (rowsAsObjects(SHEETS.accounts).some((item) => item.login_id === String(input.login_id).trim())) throw new Error("이미 사용 중인 아이디입니다.");

  const now = nowIso();
  const salt = Utilities.getUuid();
  const account = {
    account_id: makeId("acc"),
    login_id: String(input.login_id).trim(),
    password_hash: hashPassword(input.password, salt),
    password_salt: salt,
    role: input.role,
    name: String(input.name).trim(),
    email: input.email || "",
    phone: input.phone || "",
    linked_student_id: input.role === "student" ? input.linked_student_id || "" : "",
    active: true,
    must_change_password: true,
    created_at: now,
    updated_at: now,
    account_type: input.role === "admin" ? "admin" : input.role === "student" ? "student" : "staff",
    employee_position: input.role === "teacher" ? "teacher" : input.employee_position || (input.role === "admin" ? "owner" : "employee"),
    permissions_json: JSON.stringify(input.permissions || {}),
    profile_intro: "",
    theme: "system"
  };
  appendObject(SHEETS.accounts, account);
  logEvent(user, "create_account", "account", account.account_id, { role: account.role });
  return publicAccount(account);
}

function requestAccount(input) {
  if (!input || !input.login_id || !input.name || !input.password) {
    throw new Error("이름, 로그인 아이디와 비밀번호를 입력해 주세요.");
  }
  const loginId = String(input.login_id).trim();
  const name = String(input.name).trim();
  const password = String(input.password);
  const requestedRole = ["staff", "teacher", "student"].includes(input.requested_role) ? input.requested_role : "staff";
  if (!/^[a-zA-Z0-9._-]{4,40}$/.test(loginId)) throw new Error("아이디는 영문, 숫자, 점, 밑줄, 하이픈으로 4자 이상 입력해 주세요.");
  if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
  if (rowsAsObjects(SHEETS.accounts).some((item) => String(item.login_id).toLowerCase() === loginId.toLowerCase())) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }
  if (rowsAsObjects(SHEETS.accountRequests).some((item) =>
    String(item.login_id).toLowerCase() === loginId.toLowerCase() && item.status === "대기"
  )) {
    throw new Error("같은 아이디로 검토 중인 요청이 있습니다.");
  }
  const now = nowIso();
  const salt = Utilities.getUuid();
  const accountRequest = {
    request_id: makeId("req"),
    login_id: loginId,
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    name,
    email: String(input.email || "").trim(),
    phone: String(input.phone || "").trim(),
    requested_role: requestedRole,
    message: String(input.message || "").slice(0, 500),
    status: "대기",
    reviewed_by: "",
    reviewed_at: "",
    review_memo: "",
    created_account_id: "",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.accountRequests, accountRequest);
  logEvent(null, "request_account", "account_request", accountRequest.request_id, { requested_role: requestedRole });
  return { requestId: accountRequest.request_id, status: accountRequest.status };
}

function listAccountRequests(user) {
  if (!canReviewAccountRequests(user)) throw new Error("계정 요청을 조회할 권한이 없습니다.");
  return rowsAsObjects(SHEETS.accountRequests)
    .map(safeAccountRequest)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function reviewAccountRequest(user, requestId, decision, review) {
  if (!canReviewAccountRequests(user)) throw new Error("계정 요청을 승인할 권한이 없습니다.");
  const accountRequest = findObject(SHEETS.accountRequests, "request_id", requestId);
  if (!accountRequest) throw new Error("계정 요청을 찾을 수 없습니다.");
  if (accountRequest.status !== "대기") throw new Error("이미 처리된 계정 요청입니다.");
  if (!["approve", "reject"].includes(decision)) throw new Error("승인 또는 반려를 선택해 주세요.");

  const now = nowIso();
  const reviewMemo = String(review && review.memo || "").slice(0, 500);
  if (decision === "reject") {
    updateObject(SHEETS.accountRequests, "request_id", requestId, {
      status: "반려",
      reviewed_by: user.account_id,
      reviewed_at: now,
      review_memo: reviewMemo,
      password_hash: "",
      password_salt: "",
      updated_at: now
    });
    logEvent(user, "reject_account_request", "account_request", requestId, {});
    return { status: "반려" };
  }

  const loginId = String(accountRequest.login_id).trim();
  if (rowsAsObjects(SHEETS.accounts).some((item) => String(item.login_id).toLowerCase() === loginId.toLowerCase())) {
    throw new Error("이미 같은 아이디의 계정이 존재합니다.");
  }
  const role = ["staff", "teacher", "student"].includes(review && review.role) ? review.role : accountRequest.requested_role;
  const employeePosition = role === "teacher"
    ? "teacher"
    : role === "staff" && EMPLOYEE_POSITIONS.includes(review && review.employee_position)
      ? review.employee_position
      : role === "staff" ? "employee" : "";
  const account = {
    account_id: makeId("acc"),
    login_id: loginId,
    password_hash: accountRequest.password_hash,
    password_salt: accountRequest.password_salt,
    role,
    name: String(accountRequest.name).trim(),
    email: accountRequest.email || "",
    phone: accountRequest.phone || "",
    linked_student_id: role === "student" ? String(review && review.linked_student_id || "") : "",
    active: true,
    must_change_password: true,
    created_at: now,
    updated_at: now,
    account_type: role === "student" ? "student" : "staff",
    employee_position: employeePosition,
    permissions_json: "{}",
    profile_intro: "",
    theme: "system"
  };
  appendObject(SHEETS.accounts, account);
  updateObject(SHEETS.accountRequests, "request_id", requestId, {
    status: "승인",
    reviewed_by: user.account_id,
    reviewed_at: now,
    review_memo: reviewMemo,
    created_account_id: account.account_id,
    password_hash: "",
    password_salt: "",
    updated_at: now
  });
  logEvent(user, "approve_account_request", "account_request", requestId, { account_id: account.account_id, role });
  return { status: "승인", account: publicAccount(account) };
}

function safeAccountRequest(item) {
  return {
    request_id: item.request_id,
    login_id: item.login_id,
    name: item.name,
    email: item.email || "",
    phone: item.phone || "",
    requested_role: item.requested_role,
    message: item.message || "",
    status: item.status,
    reviewed_by: item.reviewed_by || "",
    reviewed_at: item.reviewed_at || "",
    review_memo: item.review_memo || "",
    created_account_id: item.created_account_id || "",
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function updateAccountStatus(user, accountId, active) {
  if (!canManageAccounts(user)) throw new Error("계정을 관리할 권한이 없습니다.");
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (account.account_id === user.account_id) throw new Error("현재 로그인한 계정은 중지할 수 없습니다.");
  if (normalizedAccountType(account) === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 계정은 변경할 수 없습니다.");

  updateObject(SHEETS.accounts, "account_id", accountId, {
    active: Boolean(active),
    updated_at: nowIso()
  });
  if (!active) deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  logEvent(user, active ? "activate_account" : "deactivate_account", "account", accountId, {});
  return true;
}

function updateAccount(user, input) {
  if (!canManageAccounts(user)) throw new Error("계정을 관리할 권한이 없습니다.");
  if (!input || !input.account_id || !input.name || !ROLES.includes(input.role)) throw new Error("계정 정보가 올바르지 않습니다.");
  const account = findObject(SHEETS.accounts, "account_id", input.account_id);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (normalizedAccountType(account) === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 계정은 변경할 수 없습니다.");
  if (input.role === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 계정은 관리자만 지정할 수 있습니다.");
  const accountType = input.role === "admin" ? "admin" : input.role === "student" ? "student" : "staff";
  const position = input.role === "teacher" ? "teacher" : accountType === "staff" && EMPLOYEE_POSITIONS.includes(input.employee_position) ? input.employee_position : "";
  const patch = {
    name: String(input.name).trim(),
    role: input.role,
    account_type: accountType,
    employee_position: position,
    linked_student_id: accountType === "student" ? input.linked_student_id || "" : "",
    email: input.email || "",
    phone: input.phone || "",
    permissions_json: "{}",
    updated_at: nowIso()
  };
  updateObject(SHEETS.accounts, "account_id", input.account_id, patch);
  deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === input.account_id);
  logEvent(user, "update_account", "account", input.account_id, { role: input.role, employee_position: position });
  return publicAccount(Object.assign({}, account, patch));
}

function resetAccountPassword(user, accountId, password) {
  if (!canManageAccounts(user)) throw new Error("계정을 관리할 권한이 없습니다.");
  if (!password || String(password).length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (account.account_id === user.account_id) throw new Error("본인 비밀번호는 내 계정 메뉴에서 변경해 주세요.");
  if (normalizedAccountType(account) === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 계정은 변경할 수 없습니다.");

  const salt = Utilities.getUuid();
  updateObject(SHEETS.accounts, "account_id", accountId, {
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    must_change_password: true,
    updated_at: nowIso()
  });
  deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  logEvent(user, "reset_password", "account", accountId, {});
  return true;
}

function changePassword(user, currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 8) throw new Error("새 비밀번호는 8자 이상이어야 합니다.");
  if (user.password_hash !== hashPassword(String(currentPassword || ""), user.password_salt)) {
    throw new Error("현재 비밀번호가 올바르지 않습니다.");
  }
  const salt = Utilities.getUuid();
  updateObject(SHEETS.accounts, "account_id", user.account_id, {
    password_hash: hashPassword(newPassword, salt),
    password_salt: salt,
    must_change_password: false,
    updated_at: nowIso()
  });
  logEvent(user, "change_password", "account", user.account_id, {});
  return true;
}

function listStudents(user) {
  const students = rowsAsObjects(SHEETS.students);
  if (user.role === "teacher") {
    const assignedStudentIds = new Set(
      rowsAsObjects(SHEETS.enrollments)
        .filter((item) => item.teacher_id === user.account_id && item.status === "active")
        .map((item) => item.student_id)
    );
    return students
      .filter((item) => item.teacher_id === user.account_id || assignedStudentIds.has(item.student_id))
      .map(studentForTeacher);
  }
  if (user.role === "student") {
    return students.filter((item) => item.student_id === user.linked_student_id).map(studentForStudent);
  }
  return students;
}

function createStudent(user, input) {
  if (!capabilitiesFor(user).manageStudents) throw new Error("수강생을 관리할 권한이 없습니다.");
  if (!input || !input.name || !input.major) throw new Error("수강생 이름과 전공을 입력해 주세요.");
  const now = nowIso();
  const student = {
    student_id: makeId("stu"),
    name: String(input.name).trim(),
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
  logEvent(user, "create_student", "student", student.student_id, { status: student.status });
  return student;
}

function updateStudent(user, input) {
  if (!capabilitiesFor(user).manageStudents) throw new Error("수강생을 관리할 권한이 없습니다.");
  if (!input || !input.student_id || !input.name || !input.major) throw new Error("수강생 이름과 전공을 입력해 주세요.");
  if (!findObject(SHEETS.students, "student_id", input.student_id)) throw new Error("수강생을 찾을 수 없습니다.");

  const updated = {
    name: String(input.name).trim(),
    birth_date: input.birth_date || "",
    phone: input.phone || "",
    guardian_name: input.guardian_name || "",
    guardian_phone: input.guardian_phone || "",
    major: String(input.major).trim(),
    goal: input.goal || "",
    status: input.status || "상담중",
    teacher_id: input.teacher_id || "",
    enrolled_at: input.enrolled_at || "",
    memo: input.memo || "",
    updated_at: nowIso()
  };
  updateObject(SHEETS.students, "student_id", input.student_id, updated);
  logEvent(user, "update_student", "student", input.student_id, { status: updated.status });
  return Object.assign({ student_id: input.student_id }, updated);
}

function listEnrollments(user) {
  const accounts = rowsAsObjects(SHEETS.accounts);
  const students = rowsAsObjects(SHEETS.students);
  const rows = rowsAsObjects(SHEETS.enrollments);
  return visibleByRole(user, rows).map((item) => enrichEnrollment(item, accounts, students));
}

function createEnrollment(user, input) {
  if (!canManageOperations(user)) throw new Error("수강 등록을 관리할 권한이 없습니다.");
  if (!input || !input.student_id || !input.teacher_id || !input.subject || !input.start_date) {
    throw new Error("수강생, 강사, 과목, 시작일을 입력해 주세요.");
  }
  if (!findObject(SHEETS.students, "student_id", input.student_id)) throw new Error("수강생을 찾을 수 없습니다.");
  const teacher = findObject(SHEETS.accounts, "account_id", input.teacher_id);
  if (!teacher || teacher.role !== "teacher") throw new Error("강사 계정을 선택해 주세요.");

  const now = nowIso();
  const enrollment = {
    enrollment_id: makeId("enr"),
    student_id: input.student_id,
    teacher_id: input.teacher_id,
    subject: String(input.subject).trim(),
    start_date: input.start_date,
    end_date: input.end_date || "",
    status: ENROLLMENT_STATUSES.includes(input.status) ? input.status : "active",
    weekly_day: input.weekly_day === undefined ? "" : input.weekly_day,
    start_time: input.start_time || "",
    duration_minutes: Number(input.duration_minutes || 50),
    room: input.room || "",
    memo: input.memo || "",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.enrollments, enrollment);
  logEvent(user, "create_enrollment", "enrollment", enrollment.enrollment_id, {
    student_id: enrollment.student_id,
    teacher_id: enrollment.teacher_id,
    subject: enrollment.subject
  });
  return enrollment;
}

function listLessons(user) {
  const accounts = rowsAsObjects(SHEETS.accounts);
  const students = rowsAsObjects(SHEETS.students);
  const allLessons = rowsAsObjects(SHEETS.lessons);
  const explicitLessons = visibleByRole(user, allLessons).map((item) => enrichLesson(item, accounts, students));
  const recurringLessons = buildRecurringLessons(
    user,
    rowsAsObjects(SHEETS.enrollments),
    allLessons,
    accounts,
    students
  );
  return assignLessonNumbers(explicitLessons.concat(recurringLessons)).sort(compareLesson);
}

function createLesson(user, input) {
  if (!canManageOperations(user)) throw new Error("수업 일정을 관리할 권한이 없습니다.");
  if (!input || !input.lesson_date || !input.start_time || !input.student_id || !input.teacher_id || !input.subject) {
    throw new Error("수업일, 시간, 수강생, 강사, 과목을 입력해 주세요.");
  }
  const now = nowIso();
  const lesson = {
    lesson_id: makeId("les"),
    lesson_date: input.lesson_date,
    start_time: input.start_time,
    duration_minutes: Number(input.duration_minutes || 50),
    student_id: input.student_id,
    teacher_id: input.teacher_id,
    subject: String(input.subject).trim(),
    status: LESSON_STATUSES.includes(input.status) ? input.status : "예정",
    room: input.room || "",
    absence_reason: input.absence_reason || "",
    makeup_date: input.makeup_date || "",
    memo: input.memo || "",
    enrollment_id: input.enrollment_id || "",
    lesson_number: Number(input.lesson_number || 0),
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.lessons, lesson);
  logEvent(user, "create_lesson", "lesson", lesson.lesson_id, {
    student_id: lesson.student_id,
    teacher_id: lesson.teacher_id,
    subject: lesson.subject
  });
  return lesson;
}

function updateLesson(user, input) {
  if (!input || !input.lesson_id) throw new Error("수업을 찾을 수 없습니다.");
  const lesson = findObject(SHEETS.lessons, "lesson_id", input.lesson_id);
  if (!lesson) throw new Error("반복 일정에서 생성된 수업은 개별 수업으로 먼저 등록해야 합니다.");
  const canEdit = canManageOperations(user) || (normalizedPosition(user) === "teacher" && lesson.teacher_id === user.account_id);
  if (!canEdit) throw new Error("수업 상태를 변경할 권한이 없습니다.");
  const status = LESSON_STATUSES.includes(input.status) ? input.status : lesson.status;
  const patch = {
    status,
    absence_reason: ["결석", "취소"].includes(status) ? input.absence_reason || "" : "",
    makeup_date: ["결석", "취소", "보강예정"].includes(status) ? input.makeup_date || "" : "",
    memo: input.memo || "",
    updated_at: nowIso()
  };
  updateObject(SHEETS.lessons, "lesson_id", input.lesson_id, patch);
  logEvent(user, "update_lesson", "lesson", input.lesson_id, { status });
  return Object.assign({}, lesson, patch);
}

function listLessonLogs(user) {
  const accounts = rowsAsObjects(SHEETS.accounts);
  const students = rowsAsObjects(SHEETS.students);
  let logs = rowsAsObjects(SHEETS.lessonLogs);
  if (user.role === "teacher") logs = logs.filter((item) => item.teacher_id === user.account_id);
  if (user.role === "student") logs = logs.filter((item) => item.student_id === user.linked_student_id);

  return logs.map((item) => {
    const copy = enrichLog(item, accounts, students);
    if (!copy.lesson_number) copy.lesson_number = inferLessonNumber(copy, rowsAsObjects(SHEETS.lessons));
    if (user.role === "student") delete copy.internal_memo;
    return copy;
  }).sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)));
}

function createLessonLog(user, input) {
  if (!capabilitiesFor(user).writeLessonLogs) throw new Error("수업일지를 작성할 권한이 없습니다.");
  if (!input || !input.student_id || !input.lesson_date || !input.lesson_content) {
    throw new Error("수강생, 수업일, 수업 내용을 입력해 주세요.");
  }
  const student = findObject(SHEETS.students, "student_id", input.student_id);
  if (!student) throw new Error("수강생을 찾을 수 없습니다.");
  if (user.role === "teacher" && student.teacher_id !== user.account_id) {
    const assigned = rowsAsObjects(SHEETS.enrollments).some((item) =>
      item.student_id === input.student_id && item.teacher_id === user.account_id && item.status === "active"
    );
    if (!assigned) throw new Error("담당 수강생의 수업일지만 작성할 수 있습니다.");
  }

  const now = nowIso();
  const teacherId = user.role === "teacher" ? user.account_id : input.teacher_id || student.teacher_id || user.account_id;
  const log = {
    log_id: makeId("log"),
    lesson_date: input.lesson_date,
    student_id: input.student_id,
    teacher_id: teacherId,
    subject: input.subject || student.major || "",
    lesson_content: input.lesson_content,
    homework: input.homework || "",
    next_goal: input.next_goal || "",
    practice_request: input.practice_request || "",
    attendance_status: input.attendance_status || "출석",
    absence_reason: ["결석", "취소"].includes(input.attendance_status) ? input.absence_reason || "" : "",
    makeup_date: ["결석", "취소"].includes(input.attendance_status) ? input.makeup_date || "" : "",
    internal_memo: input.internal_memo || "",
    lesson_number: Number(input.lesson_number || inferLessonNumber({
      student_id: input.student_id,
      teacher_id: teacherId,
      lesson_date: input.lesson_date,
      subject: input.subject || student.major || ""
    }, rowsAsObjects(SHEETS.lessons))),
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.lessonLogs, log);
  logEvent(user, "create_lesson_log", "lesson_log", log.log_id, {
    student_id: log.student_id,
    teacher_id: log.teacher_id,
    subject: log.subject,
    attendance_status: log.attendance_status
  });
  return log;
}

function listLessonTemplates(user) {
  if (user.role === "student") return [];
  return rowsAsObjects(SHEETS.templates)
    .filter((item) => asBoolean(item.active) && (item.scope === "global" || item.teacher_id === user.account_id))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function createLessonTemplate(user, input) {
  requireRole(user, ["admin", "staff", "teacher"]);
  if (!input || !input.title || !input.lesson_content) throw new Error("템플릿 이름과 수업 내용을 입력해 주세요.");
  const now = nowIso();
  const template = {
    template_id: makeId("tpl"),
    teacher_id: user.role === "teacher" ? user.account_id : input.teacher_id || user.account_id,
    title: String(input.title).trim(),
    subject: input.subject || "",
    lesson_content: input.lesson_content || "",
    homework: input.homework || "",
    next_goal: input.next_goal || "",
    practice_request: input.practice_request || "",
    active: true,
    created_at: now,
    updated_at: now,
    scope: input.scope === "global" && user.role === "admin" ? "global" : "personal"
  };
  appendObject(SHEETS.templates, template);
  logEvent(user, "create_lesson_template", "lesson_template", template.template_id, { title: template.title });
  return template;
}

function deleteLessonTemplate(user, templateId) {
  requireRole(user, ["admin", "staff", "teacher"]);
  const template = findObject(SHEETS.templates, "template_id", templateId);
  if (!template) throw new Error("템플릿을 찾을 수 없습니다.");
  if (user.role === "teacher" && template.teacher_id !== user.account_id) throw new Error("본인 템플릿만 삭제할 수 있습니다.");
  updateObject(SHEETS.templates, "template_id", templateId, { active: false, updated_at: nowIso() });
  logEvent(user, "delete_lesson_template", "lesson_template", templateId, {});
  return true;
}

function getBootstrapData(user) {
  const accountType = normalizedAccountType(user);
  const capabilities = capabilitiesFor(user);
  return {
    user: publicAccount(user),
    students: listStudents(user),
    enrollments: listEnrollments(user),
    lessons: listLessons(user),
    overview: getMyOverview(user),
    registrations: listRegistrations(user),
    calendar: listCalendar(user),
    classTypes: listClassTypes(user),
    accountRequests: capabilities.reviewAccountRequests ? listAccountRequests(user) : [],
    publicConfig: publicSettings(rowsAsObjects(SHEETS.settings)),
    capabilities,
    accountType,
    employeePosition: normalizedPosition(user),
    loaded: {
      core: true,
      registrations: true,
      calendar: true
    }
  };
}

function listRegistrations(user) {
  if (user.role === "teacher") return [];
  const students = rowsAsObjects(SHEETS.students);
  const studentMap = objectMap(students, "student_id");
  let rows = rowsAsObjects(SHEETS.registrations);
  if (user.role === "student") rows = rows.filter((item) => item.student_id === user.linked_student_id);
  return rows.map((item) => Object.assign({}, item, {
    student_name: studentMap[item.student_id] ? studentMap[item.student_id].name : ""
  })).sort((a, b) => String(b.period_start).localeCompare(String(a.period_start)));
}

function createRegistration(user, input) {
  if (!canManageOperations(user)) throw new Error("등록 결제를 관리할 권한이 없습니다.");
  if (!input || !input.student_id || !input.period_start || !input.next_due_date) {
    throw new Error("수강생, 등록 시작일, 다음 결제 예정일을 입력해 주세요.");
  }
  if (!findObject(SHEETS.students, "student_id", input.student_id)) throw new Error("수강생을 찾을 수 없습니다.");
  const now = nowIso();
  const registration = {
    registration_id: makeId("reg"),
    student_id: input.student_id,
    enrollment_id: input.enrollment_id || "",
    registration_type: input.registration_type === "재등록" ? "재등록" : "신규등록",
    period_start: input.period_start,
    period_end: input.period_end || "",
    amount: Number(input.amount || 0),
    paid_at: input.paid_at || "",
    next_due_date: input.next_due_date,
    payment_status: PAYMENT_STATUSES.includes(input.payment_status) ? input.payment_status : "청구예정",
    payment_method: input.payment_method || "",
    memo: input.memo || "",
    created_by: user.account_id,
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.registrations, registration);
  logEvent(user, "create_registration", "registration", registration.registration_id, { student_id: registration.student_id });
  return registration;
}

function listRooms(user) {
  ensureDefaultRooms();
  const capabilities = user ? capabilitiesFor(user) : { reserveLessonRoom: true, reservePracticeRoom: true };
  return rowsAsObjects(SHEETS.rooms)
    .filter((item) => asBoolean(item.active) && (item.room_type === "lesson" ? capabilities.reserveLessonRoom : capabilities.reservePracticeRoom))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function updateRoom(user, input) {
  if (!capabilitiesFor(user).manageReservations) throw new Error("공간을 관리할 권한이 없습니다.");
  if (!input || !input.room_id || !String(input.name || "").trim()) throw new Error("공간 이름을 입력해 주세요.");
  updateObject(SHEETS.rooms, "room_id", input.room_id, {
    name: String(input.name).trim(),
    active: input.active === undefined ? true : Boolean(input.active),
    updated_at: nowIso()
  });
  logEvent(user, "update_room", "room", input.room_id, { name: input.name });
  return true;
}

function listReservations(user) {
  const rooms = objectMap(listRooms(user), "room_id");
  const accounts = objectMap(rowsAsObjects(SHEETS.accounts), "account_id");
  return rowsAsObjects(SHEETS.reservations)
    .filter((item) => {
      const room = rooms[item.room_id];
      if (!room) return canManageOperations(user);
      if (normalizedAccountType(user) === "student") return room.room_type === "practice";
      return true;
    })
    .map((item) => Object.assign({}, item, {
      room_name: rooms[item.room_id] ? rooms[item.room_id].name : "삭제된 공간",
      room_type: rooms[item.room_id] ? rooms[item.room_id].room_type : "",
      reserved_by_name: accounts[item.reserved_by] ? accounts[item.reserved_by].name : ""
    }))
    .sort((a, b) => (String(a.reservation_date) + String(a.start_time)).localeCompare(String(b.reservation_date) + String(b.start_time)));
}

function createReservation(user, input) {
  if (!input || !input.room_id || !input.reservation_date || !input.start_time || !input.end_time) {
    throw new Error("공간, 날짜, 시작과 종료 시간을 입력해 주세요.");
  }
  const room = findObject(SHEETS.rooms, "room_id", input.room_id);
  if (!room || !asBoolean(room.active)) throw new Error("사용할 수 없는 공간입니다.");
  const accountType = normalizedAccountType(user);
  const position = normalizedPosition(user);
  const capabilities = capabilitiesFor(user);
  if (room.room_type === "lesson" && !capabilities.reserveLessonRoom) throw new Error("레슨실 예약 권한이 없습니다.");
  if (room.room_type === "practice" && !capabilities.reservePracticeRoom) throw new Error("연습실 예약 권한이 없습니다.");
  if (accountType === "student" && room.room_type !== "practice") throw new Error("수강생은 연습실만 예약할 수 있습니다.");
  if (accountType === "staff" && position !== "teacher" && !canManageOperations(user)) throw new Error("예약 권한이 없습니다.");
  if (!RESERVATION_PURPOSES.includes(input.purpose)) throw new Error("예약 목적을 선택해 주세요.");
  if (accountType === "student" && input.purpose !== "연습") throw new Error("수강생은 연습 목적으로만 예약할 수 있습니다.");
  if (position === "teacher" && !["레슨", "이론수업", "연습"].includes(input.purpose)) throw new Error("강사는 레슨, 이론수업, 연습 목적으로 예약할 수 있습니다.");
  if (!/^\d{2}:00$/.test(String(input.start_time)) || input.end_time !== addMinutes(input.start_time, 60)) {
    throw new Error("공간 예약은 정각부터 1시간 단위로만 가능합니다.");
  }
  const collision = rowsAsObjects(SHEETS.reservations).some((item) =>
    item.room_id === input.room_id && item.reservation_date === input.reservation_date
    && item.status === "예약" && input.start_time < item.end_time && input.end_time > item.start_time
  );
  if (collision) throw new Error("선택한 시간에 이미 예약이 있습니다.");
  const now = nowIso();
  const reservation = {
    reservation_id: makeId("rsv"),
    room_id: input.room_id,
    reserved_by: user.account_id,
    reservation_date: input.reservation_date,
    start_time: input.start_time,
    end_time: input.end_time,
    purpose: input.purpose,
    status: "예약",
    memo: input.memo || "",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.reservations, reservation);
  logEvent(user, "create_reservation", "reservation", reservation.reservation_id, { room_id: reservation.room_id });
  return reservation;
}

function updateReservationStatus(user, reservationId, status) {
  if (!RESERVATION_STATUSES.includes(status)) throw new Error("올바르지 않은 예약 상태입니다.");
  const reservation = findObject(SHEETS.reservations, "reservation_id", reservationId);
  if (!reservation) throw new Error("예약을 찾을 수 없습니다.");
  const owner = reservation.reserved_by === user.account_id;
  if (!owner && !capabilitiesFor(user).manageReservations) throw new Error("예약을 변경할 권한이 없습니다.");
  updateObject(SHEETS.reservations, "reservation_id", reservationId, { status, updated_at: nowIso() });
  logEvent(user, "update_reservation", "reservation", reservationId, { status });
  return true;
}

function listWorkLogs(user) {
  if (normalizedAccountType(user) === "student") return [];
  const accounts = objectMap(rowsAsObjects(SHEETS.accounts), "account_id");
  let rows = rowsAsObjects(SHEETS.workLogs);
  if (!canManageOperations(user)) rows = rows.filter((item) => item.account_id === user.account_id);
  return rows.map((item) => Object.assign({}, item, {
    account_name: accounts[item.account_id] ? accounts[item.account_id].name : ""
  })).sort((a, b) => String(b.work_date + b.clock_in_at).localeCompare(String(a.work_date + a.clock_in_at)));
}

function clockWork(user, mode) {
  if (normalizedAccountType(user) !== "staff") throw new Error("직원과 강사만 출퇴근을 기록할 수 있습니다.");
  const current = rowsAsObjects(SHEETS.workLogs).find((item) =>
    item.account_id === user.account_id && item.work_date === todayKey() && !item.clock_out_at
  );
  if (mode === "in") {
    if (current) throw new Error("이미 출근 처리되었습니다.");
    const now = nowIso();
    const workLog = {
      work_log_id: makeId("wrk"),
      account_id: user.account_id,
      work_date: todayKey(),
      clock_in_at: now,
      clock_out_at: "",
      memo: "",
      created_at: now,
      updated_at: now
    };
    appendObject(SHEETS.workLogs, workLog);
    logEvent(user, "clock_in", "work_log", workLog.work_log_id, {});
    return workLog;
  }
  if (!current) throw new Error("출근 기록을 찾을 수 없습니다.");
  updateObject(SHEETS.workLogs, "work_log_id", current.work_log_id, { clock_out_at: nowIso(), updated_at: nowIso() });
  logEvent(user, "clock_out", "work_log", current.work_log_id, {});
  return true;
}

function listMeetings(user) {
  const accounts = objectMap(rowsAsObjects(SHEETS.accounts), "account_id");
  let rows = rowsAsObjects(SHEETS.meetings);
  if (normalizedAccountType(user) === "student") return [];
  if (normalizedAccountType(user) !== "admin") {
    rows = rows.filter((item) => splitIds(item.participant_ids).includes(user.account_id) || item.created_by === user.account_id);
  }
  return rows.map((item) => Object.assign({}, item, {
    participant_names: splitIds(item.participant_ids).map((id) => accounts[id] ? accounts[id].name : "").filter(Boolean),
    creator_name: accounts[item.created_by] ? accounts[item.created_by].name : ""
  })).sort((a, b) => String(a.meeting_date + a.start_time).localeCompare(String(b.meeting_date + b.start_time)));
}

function createMeeting(user, input) {
  if (!canManageMeetings(user)) throw new Error("회의를 예약할 권한이 없습니다.");
  if (!input || !input.title || !input.meeting_date || !input.start_time || !input.end_time) {
    throw new Error("회의명, 날짜, 시작과 종료 시간을 입력해 주세요.");
  }
  const accountMap = objectMap(rowsAsObjects(SHEETS.accounts), "account_id");
  const participants = (Array.isArray(input.participant_ids) ? input.participant_ids : splitIds(input.participant_ids))
    .filter((id) => accountMap[id] && normalizedAccountType(accountMap[id]) === "staff");
  if (normalizedAccountType(user) === "staff") participants.push(user.account_id);
  const now = nowIso();
  const meeting = {
    meeting_id: makeId("mtg"),
    title: String(input.title).trim(),
    meeting_date: input.meeting_date,
    start_time: input.start_time,
    end_time: input.end_time,
    location: input.location || "",
    agenda: input.agenda || "",
    participant_ids: unique(participants).join(","),
    created_by: user.account_id,
    status: "예정",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.meetings, meeting);
  logEvent(user, "create_meeting", "meeting", meeting.meeting_id, {});
  return meeting;
}

function listCalendar(user) {
  const events = rowsAsObjects(SHEETS.calendarEvents)
    .filter((item) => item.status !== "취소" && (item.audience === "전체" || normalizedAccountType(user) === "admin"));
  const lessons = listLessons(user).map((item) => ({
    calendar_id: "lesson:" + item.lesson_id,
    title: item.subject + " · " + item.student_name,
    date: item.lesson_date,
    start_time: item.start_time,
    end_time: addMinutes(item.start_time, item.duration_minutes || 50),
    type: String(item.subject || "").indexOf("이론") >= 0 ? "theory" : "lesson",
    detail: item.room || "",
    owner: item.teacher_name || ""
  }));
  const meetings = listMeetings(user).map((item) => ({
    calendar_id: "meeting:" + item.meeting_id,
    title: item.title,
    date: item.meeting_date,
    start_time: item.start_time,
    end_time: item.end_time,
    type: "meeting",
    detail: item.location || "",
    owner: item.creator_name || ""
  }));
  const academy = events.map((item) => ({
    calendar_id: "event:" + item.event_id,
    title: item.title,
    date: item.event_date,
    start_time: item.start_time,
    end_time: item.end_time,
    type: item.event_type || "academy",
    detail: item.description || "",
    owner: ""
  }));
  return lessons.concat(meetings, academy).sort((a, b) => String(a.date + a.start_time).localeCompare(String(b.date + b.start_time)));
}

function createCalendarEvent(user, input) {
  if (!canManageCalendar(user)) throw new Error("학원 일정을 관리할 권한이 없습니다.");
  if (!input || !input.title || !input.event_date) throw new Error("일정명과 날짜를 입력해 주세요.");
  const now = nowIso();
  const calendarEvent = {
    event_id: makeId("cal"),
    title: String(input.title).trim(),
    event_date: input.event_date,
    start_time: input.start_time || "",
    end_time: input.end_time || "",
    event_type: input.event_type || "행사",
    audience: input.audience || "전체",
    description: input.description || "",
    created_by: user.account_id,
    status: "예정",
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.calendarEvents, calendarEvent);
  logEvent(user, "create_calendar_event", "calendar_event", calendarEvent.event_id, {});
  return calendarEvent;
}

function updateProfile(user, input) {
  const patch = {
    name: normalizedAccountType(user) === "admin" && input && String(input.name || "").trim()
      ? String(input.name).trim().slice(0, 60)
      : user.name,
    email: input && input.email ? String(input.email).trim() : "",
    phone: input && input.phone ? String(input.phone).trim() : "",
    profile_intro: input && input.profile_intro ? String(input.profile_intro).slice(0, 500) : "",
    theme: input && ["system", "light", "dark"].includes(input.theme) ? input.theme : "system",
    updated_at: nowIso()
  };
  updateObject(SHEETS.accounts, "account_id", user.account_id, patch);
  logEvent(user, "update_profile", "account", user.account_id, {});
  return publicAccount(Object.assign({}, user, patch));
}

function updatePublicSettings(user, input) {
  if (!canManagePublicSettings(user)) throw new Error("로그인 화면 설정을 변경할 권한이 없습니다.");
  const next = {
    login_context_title: String(input && input.login_context_title || PUBLIC_SETTING_DEFAULTS.login_context_title).slice(0, 120),
    login_context_body: String(input && input.login_context_body || PUBLIC_SETTING_DEFAULTS.login_context_body).slice(0, 500),
    login_popup_enabled: asBoolean(input && input.login_popup_enabled) ? "true" : "false",
    login_popup_title: String(input && input.login_popup_title || PUBLIC_SETTING_DEFAULTS.login_popup_title).slice(0, 80),
    login_popup_body: String(input && input.login_popup_body || PUBLIC_SETTING_DEFAULTS.login_popup_body).slice(0, 500)
  };
  Object.keys(next).forEach((key) => upsertSetting(key, next[key], "로그인 전 화면 공개 설정"));
  logEvent(user, "update_public_settings", "settings", "login", {});
  return publicSettings(rowsAsObjects(SHEETS.settings));
}

function updateAccountPermissions(user, accountId, permissions) {
  if (!canManagePermissions(user)) throw new Error("권한을 수정할 수 없습니다.");
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (normalizedAccountType(account) === "admin" && normalizedAccountType(user) !== "admin") throw new Error("관리자 권한은 변경할 수 없습니다.");
  updateObject(SHEETS.accounts, "account_id", accountId, {
    permissions_json: JSON.stringify(permissions || {}),
    updated_at: nowIso()
  });
  deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  logEvent(user, "update_permissions", "account", accountId, {});
  return true;
}

function listTasks(user, accountId) {
  if (normalizedAccountType(user) === "student") return [];
  const targetId = accountId || user.account_id;
  if (targetId !== user.account_id && !canViewAccounts(user)) throw new Error("다른 직원의 업무를 조회할 권한이 없습니다.");
  return rowsAsObjects(SHEETS.tasks)
    .filter((item) => item.assignee_id === targetId)
    .sort((a, b) => String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31")));
}

function createTask(user, input) {
  if (normalizedAccountType(user) === "student") throw new Error("업무를 등록할 권한이 없습니다.");
  if (!input || !input.title) throw new Error("업무명을 입력해 주세요.");
  const assigneeId = input.assignee_id || user.account_id;
  if (assigneeId !== user.account_id && !canManageOperations(user)) throw new Error("다른 직원에게 업무를 배정할 권한이 없습니다.");
  const now = nowIso();
  const task = {
    task_id: makeId("tsk"),
    title: String(input.title).trim(),
    assignee_id: assigneeId,
    due_date: input.due_date || "",
    status: input.status || "할일",
    priority: input.priority || "보통",
    memo: input.memo || "",
    created_by: user.account_id,
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.tasks, task);
  logEvent(user, "create_task", "task", task.task_id, { assignee_id: assigneeId });
  return task;
}

function listClassTypes(user) {
  return rowsAsObjects(SHEETS.classTypes)
    .filter((item) => asBoolean(item.active))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function createClassType(user, input) {
  if (!canManageCalendar(user)) throw new Error("수업 종류를 관리할 권한이 없습니다.");
  if (!input || !String(input.name || "").trim() || !CLASS_TYPE_CATEGORIES.includes(input.category)) {
    throw new Error("수업 종류명과 분류를 입력해 주세요.");
  }
  const now = nowIso();
  const classType = {
    class_type_id: makeId("cls"),
    name: String(input.name).trim(),
    category: input.category,
    active: true,
    sort_order: Number(input.sort_order || rowsAsObjects(SHEETS.classTypes).length + 1),
    created_at: now,
    updated_at: now
  };
  appendObject(SHEETS.classTypes, classType);
  logEvent(user, "create_class_type", "class_type", classType.class_type_id, {});
  return classType;
}

function updateClassType(user, input) {
  if (!canManageCalendar(user)) throw new Error("수업 종류를 관리할 권한이 없습니다.");
  if (!input || !input.class_type_id) throw new Error("수업 종류를 찾을 수 없습니다.");
  updateObject(SHEETS.classTypes, "class_type_id", input.class_type_id, {
    name: String(input.name || "").trim(),
    category: CLASS_TYPE_CATEGORIES.includes(input.category) ? input.category : "레슨",
    active: input.active === undefined ? true : asBoolean(input.active),
    sort_order: Number(input.sort_order || 0),
    updated_at: nowIso()
  });
  logEvent(user, "update_class_type", "class_type", input.class_type_id, {});
  return true;
}

function getMyOverview(user) {
  const accounts = rowsAsObjects(SHEETS.accounts);
  const students = rowsAsObjects(SHEETS.students);
  const allEnrollments = rowsAsObjects(SHEETS.enrollments);
  const allLessons = rowsAsObjects(SHEETS.lessons);
  const allLogs = rowsAsObjects(SHEETS.lessonLogs);
  const visibleEnrollments = visibleByRole(user, allEnrollments).map((item) => enrichEnrollment(item, accounts, students));
  const visibleLessons = visibleByRole(user, allLessons).map((item) => enrichLesson(item, accounts, students));
  const recurring = buildRecurringLessons(user, allEnrollments, allLessons, accounts, students);
  const upcoming = visibleLessons.concat(recurring)
    .filter((item) => String(item.lesson_date) >= todayKey() && item.status !== "취소")
    .sort(compareLesson)
    .slice(0, 40);

  if (user.role === "teacher") {
    const activeEnrollments = visibleEnrollments.filter((item) => item.status === "active");
    const subjects = unique(activeEnrollments.map((item) => item.subject).filter(Boolean));
    const studentIds = unique(activeEnrollments.map((item) => item.student_id));
    const recentLogs = allLogs.filter((item) => item.teacher_id === user.account_id)
      .map((item) => enrichLog(item, accounts, students))
      .sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)))
      .slice(0, 6);
    return {
      role: user.role,
      profile: publicAccount(user),
      stats: {
        activeStudents: studentIds.length,
        subjects: subjects.length,
        thisWeekLessons: upcoming.filter((item) => daysFromToday(item.lesson_date) <= 7).length,
        thisMonthLogs: recentMonthCount(allLogs.filter((item) => item.teacher_id === user.account_id), "lesson_date")
      },
      subjects,
      enrollments: activeEnrollments,
      upcoming,
      recentLogs
    };
  }

  if (user.role === "student") {
    const student = students.find((item) => item.student_id === user.linked_student_id) || {};
    const activeEnrollments = visibleEnrollments.filter((item) => item.status === "active");
    const startDates = activeEnrollments.map((item) => item.start_date).filter(Boolean).sort();
    return {
      role: user.role,
      profile: studentForStudent(student),
      stats: {
        activeCourses: activeEnrollments.length,
        enrolledDays: startDates.length ? dateDiffDays(startDates[0], todayKey()) + 1 : 0,
        upcomingLessons: upcoming.length,
        lessonLogs: allLogs.filter((item) => item.student_id === user.linked_student_id).length
      },
      subjects: unique(activeEnrollments.map((item) => item.subject).filter(Boolean)),
      enrollments: activeEnrollments,
      upcoming,
      recentLogs: allLogs.filter((item) => item.student_id === user.linked_student_id)
        .map((item) => {
          const copy = enrichLog(item, accounts, students);
          delete copy.internal_memo;
          return copy;
        })
        .sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)))
        .slice(0, 6)
    };
  }

  const activeStudents = students.filter((item) => item.status === "재원").length;
  const activeAccounts = accounts.filter((item) => asBoolean(item.active)).length;
  const teachers = accounts.filter((item) => item.role === "teacher" && asBoolean(item.active));
  const workload = teachers.map((teacher) => ({
    teacher_id: teacher.account_id,
    teacher_name: teacher.name,
    active_students: unique(allEnrollments.filter((item) => item.teacher_id === teacher.account_id && item.status === "active").map((item) => item.student_id)).length,
    next_7_days: upcoming.filter((item) => item.teacher_id === teacher.account_id && daysFromToday(item.lesson_date) <= 7).length,
    month_logs: recentMonthCount(allLogs.filter((item) => item.teacher_id === teacher.account_id), "lesson_date")
  }));
  const pastLessons = visibleLessons.filter((item) => item.lesson_date < todayKey() && item.status !== "취소");
  const completedAttendance = pastLessons.filter((lesson) => allLogs.some((log) =>
    log.lesson_date === lesson.lesson_date && log.student_id === lesson.student_id && log.teacher_id === lesson.teacher_id
  )).length;
  return {
    role: user.role,
    stats: {
      activeStudents,
      activeAccounts,
      thisMonthLogs: recentMonthCount(allLogs, "lesson_date"),
      attendanceRate: pastLessons.length ? Math.round(completedAttendance / pastLessons.length * 1000) / 10 : 0
    },
    todayLessons: upcoming.filter((item) => item.lesson_date === todayKey()),
    upcoming: upcoming.slice(0, 10),
    workload,
    recentLogs: allLogs.map((item) => enrichLog(item, accounts, students))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 6)
  };
}

function getUsageSummary(user) {
  requireRole(user, ["admin"]);
  const accounts = rowsAsObjects(SHEETS.accounts);
  const accountMap = objectMap(accounts, "account_id");
  const since30 = addDays(todayKey(), -29);
  const since7 = addDays(todayKey(), -6);
  const events = rowsAsObjects(SHEETS.usage)
    .filter((item) => item.date_key >= since30)
    .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));

  const actionCounts = {};
  const dailyCounts = {};
  events.forEach((item) => {
    actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
    dailyCounts[item.date_key] = (dailyCounts[item.date_key] || 0) + 1;
  });
  const daily = [];
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(todayKey(), offset);
    daily.push({ date, count: dailyCounts[date] || 0 });
  }

  return {
    todayEvents: events.filter((item) => item.date_key === todayKey()).length,
    last7Events: events.filter((item) => item.date_key >= since7).length,
    activeUsers7: unique(events.filter((item) => item.date_key >= since7).map((item) => item.account_id).filter(Boolean)).length,
    last30Events: events.length,
    daily,
    actions: Object.keys(actionCounts).map((action) => ({ action, count: actionCounts[action] })).sort((a, b) => b.count - a.count),
    recent: events.slice(0, 30).map((item) => ({
      event_id: item.event_id,
      occurred_at: item.occurred_at,
      account_id: item.account_id,
      account_name: accountMap[item.account_id] ? accountMap[item.account_id].name : "알 수 없음",
      role: item.role,
      action: item.action,
      target_type: item.target_type,
      target_id: item.target_id
    }))
  };
}

function recordPageView(user, page) {
  logEvent(user, "page_view", "page", String(page || ""), {});
  return true;
}

function visibleByRole(user, rows) {
  if (user.role === "teacher") return rows.filter((item) => item.teacher_id === user.account_id);
  if (user.role === "student") return rows.filter((item) => item.student_id === user.linked_student_id);
  return rows;
}

function buildRecurringLessons(user, allEnrollments, explicitLessons, accounts, students) {
  const visibleEnrollments = visibleByRole(user, allEnrollments).filter((item) =>
    item.status === "active" && item.weekly_day !== "" && item.start_time
  );
  const explicitKeys = {};
  explicitLessons.forEach((item) => {
    if (item.enrollment_id) explicitKeys[item.enrollment_id + "|" + item.lesson_date] = true;
  });
  const results = [];
  for (let offset = 0; offset <= 42; offset++) {
    const date = addDays(todayKey(), offset);
    const day = new Date(date + "T00:00:00+09:00").getDay();
    visibleEnrollments.forEach((item) => {
      if (Number(item.weekly_day) !== day) return;
      if (item.start_date && date < item.start_date) return;
      if (item.end_date && date > item.end_date) return;
      if (explicitKeys[item.enrollment_id + "|" + date]) return;
      results.push(enrichLesson({
        lesson_id: "recurring-" + item.enrollment_id + "-" + date,
        lesson_date: date,
        start_time: item.start_time,
        duration_minutes: item.duration_minutes || 50,
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        subject: item.subject,
        status: "예정",
        room: item.room || "",
        memo: item.memo || "",
        enrollment_id: item.enrollment_id,
        recurring: true
      }, accounts, students));
    });
  }
  return results;
}

function enrichEnrollment(item, accounts, students) {
  const accountMap = objectMap(accounts, "account_id");
  const studentMap = objectMap(students, "student_id");
  return Object.assign({}, item, {
    student_name: studentMap[item.student_id] ? studentMap[item.student_id].name : "",
    teacher_name: accountMap[item.teacher_id] ? accountMap[item.teacher_id].name : ""
  });
}

function enrichLesson(item, accounts, students) {
  const accountMap = objectMap(accounts, "account_id");
  const studentMap = objectMap(students, "student_id");
  return Object.assign({}, item, {
    student_name: studentMap[item.student_id] ? studentMap[item.student_id].name : "",
    teacher_name: accountMap[item.teacher_id] ? accountMap[item.teacher_id].name : ""
  });
}

function enrichLog(item, accounts, students) {
  const accountMap = objectMap(accounts, "account_id");
  const studentMap = objectMap(students, "student_id");
  return Object.assign({}, item, {
    student_name: studentMap[item.student_id] ? studentMap[item.student_id].name : "",
    teacher_name: accountMap[item.teacher_id] ? accountMap[item.teacher_id].name : ""
  });
}

function studentForTeacher(student) {
  return {
    student_id: student.student_id,
    name: student.name,
    phone: student.phone || "",
    major: student.major,
    goal: student.goal,
    status: student.status,
    teacher_id: student.teacher_id,
    enrolled_at: student.enrolled_at
  };
}

function studentForStudent(student) {
  return {
    student_id: student.student_id || "",
    name: student.name || "",
    major: student.major || "",
    goal: student.goal || "",
    status: student.status || "",
    teacher_id: student.teacher_id || "",
    enrolled_at: student.enrolled_at || ""
  };
}

function logEvent(user, action, targetType, targetId, metadata) {
  try {
    appendObject(SHEETS.usage, {
      event_id: makeId("evt"),
      occurred_at: nowIso(),
      account_id: user ? user.account_id : "",
      role: user ? user.role : "",
      action: action || "",
      target_type: targetType || "",
      target_id: targetId || "",
      metadata: JSON.stringify(metadata || {}).slice(0, 1000),
      date_key: todayKey()
    });
  } catch (error) {
    console.error("Usage log failed", error);
  }
}

function ensureSchema() {
  const schemaCache = CacheService.getScriptCache();
  if (schemaCache.get("bonsung-schema-v5-ready") === "true") return;
  const spreadsheet = db();
  Object.keys(SCHEMA).forEach((sheetName) => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    const headers = SCHEMA[sheetName];
    if (sheet.getLastColumn() < headers.length) {
      sheet.insertColumnsAfter(Math.max(sheet.getLastColumn(), 1), headers.length - sheet.getLastColumn());
    }
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
    const nextHeaders = headers.map((header, index) => current[index] || header);
    if (current.join("|") !== nextHeaders.join("|")) sheet.getRange(1, 1, 1, headers.length).setValues([nextHeaders]);
    sheet.setFrozenRows(1);
    if (sheetName === SHEETS.sessions) sheet.hideSheet();
  });
  ensureDefaultRooms();
  ensureDefaultClassTypes();
  ensurePublicSettings();
  migrateAdminIdentity();
  const schemaSetting = findObject(SHEETS.settings, "key", "schema_version");
  if (schemaSetting) {
    if (String(schemaSetting.value) !== "5") updateObject(SHEETS.settings, "key", "schema_version", { value: "5", updated_at: nowIso() });
  } else {
    appendObject(SHEETS.settings, { key: "schema_version", value: "5", description: "운영 데이터 스키마 버전", updated_at: nowIso() });
  }
  schemaCache.put("bonsung-schema-v5-ready", "true", 21600);
}

function db() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function rowsAsObjects(sheetName) {
  if (REQUEST_CACHE[sheetName]) return REQUEST_CACHE[sheetName].map((item) => Object.assign({}, item));
  const sheet = db().getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + " 시트를 찾을 수 없습니다.");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    REQUEST_CACHE[sheetName] = [];
    return [];
  }
  const headers = values[0].map(String);
  const rows = values.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const object = {};
    headers.forEach((header, index) => object[header] = normalizeCell(row[index]));
    return object;
  });
  REQUEST_CACHE[sheetName] = rows;
  return rows.map((item) => Object.assign({}, item));
}

function appendObject(sheetName, object) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = db().getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + " 시트를 찾을 수 없습니다.");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map((header) => object[header] === undefined ? "" : object[header]));
    delete REQUEST_CACHE[sheetName];
  } finally {
    lock.releaseLock();
  }
}

function findObject(sheetName, key, value) {
  return rowsAsObjects(sheetName).find((item) => String(item[key]) === String(value));
}

function updateObject(sheetName, key, value, patch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = db().getSheetByName(sheetName);
    const values = sheet.getDataRange().getValues();
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
    delete REQUEST_CACHE[sheetName];
  } finally {
    lock.releaseLock();
  }
}

function deleteRowsWhere(sheetName, predicate) {
  const sheet = db().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0].map(String);
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    const object = {};
    headers.forEach((header, index) => object[header] = normalizeCell(values[rowIndex][index]));
    if (predicate(object)) sheet.deleteRow(rowIndex + 1);
  }
  delete REQUEST_CACHE[sheetName];
}

function cleanupSessions() {
  const now = Date.now();
  deleteRowsWhere(SHEETS.sessions, (item) => new Date(item.expires_at).getTime() <= now);
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + password,
    Utilities.Charset.UTF_8
  );
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
    must_change_password: asBoolean(account.must_change_password),
    account_type: normalizedAccountType(account),
    employee_position: normalizedPosition(account),
    permissions: parsePermissions(account.permissions_json),
    profile_intro: account.profile_intro || "",
    theme: account.theme || "system"
  };
}

function ensureDefaultRooms() {
  const sheet = db().getSheetByName(SHEETS.rooms);
  if (!sheet || sheet.getLastRow() > 1) return;
  const now = nowIso();
  const defaults = [
    ["room-lesson-large-1", "lesson", "대형 레슨실 1", true, 1, now, now],
    ["room-lesson-medium-1", "lesson", "중형 레슨실 1", true, 2, now, now],
    ["room-lesson-small-1", "lesson", "소형 레슨실 1", true, 3, now, now],
    ["room-lesson-small-2", "lesson", "소형 레슨실 2", true, 4, now, now],
    ["room-practice-a", "practice", "연습실 A", true, 5, now, now],
    ["room-practice-b", "practice", "연습실 B", true, 6, now, now],
    ["room-practice-c", "practice", "연습실 C", true, 7, now, now]
  ];
  sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  delete REQUEST_CACHE[SHEETS.rooms];
}

function ensureDefaultClassTypes() {
  const sheet = db().getSheetByName(SHEETS.classTypes);
  if (sheet.getLastRow() > 1) return;
  const now = nowIso();
  const defaults = [
    ["cls-instrument", "전공 개인레슨", "레슨", true, 1, now, now],
    ["cls-theory", "기초 음악이론", "이론수업", true, 2, now, now],
    ["cls-ensemble", "앙상블", "그룹수업", true, 3, now, now]
  ];
  sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  delete REQUEST_CACHE[SHEETS.classTypes];
}

function ensurePublicSettings() {
  Object.keys(PUBLIC_SETTING_DEFAULTS).forEach((key) => {
    if (!findObject(SHEETS.settings, "key", key)) {
      appendObject(SHEETS.settings, {
        key,
        value: PUBLIC_SETTING_DEFAULTS[key],
        description: "로그인 전 화면 공개 설정",
        updated_at: nowIso()
      });
    }
  });
}

function migrateAdminIdentity() {
  if (findObject(SHEETS.settings, "key", "admin_identity_migrated_v1")) return;
  const legacyNames = ["시스템 관리자", "원장 관리자"];
  rowsAsObjects(SHEETS.accounts)
    .filter((item) => normalizedAccountType(item) === "admin" && legacyNames.includes(String(item.name)))
    .forEach((item) => updateObject(SHEETS.accounts, "account_id", item.account_id, { name: "admin", updated_at: nowIso() }));
  appendObject(SHEETS.settings, {
    key: "admin_identity_migrated_v1",
    value: "true",
    description: "시스템 관리자 표시 이름 1회 정리",
    updated_at: nowIso()
  });
}

function normalizedAccountType(account) {
  if (ACCOUNT_TYPES.includes(account.account_type)) return account.account_type;
  if (account.role === "admin") return "admin";
  if (account.role === "student") return "student";
  return "staff";
}

function normalizedPosition(account) {
  if (EMPLOYEE_POSITIONS.includes(account.employee_position)) return account.employee_position;
  if (account.role === "teacher") return "teacher";
  if (account.role === "admin") return "owner";
  if (account.role === "staff") return "employee";
  return "";
}

function parsePermissions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch (error) { return {}; }
}

function capabilitiesFor(user) {
  const type = normalizedAccountType(user);
  const position = normalizedPosition(user);
  const custom = parsePermissions(user.permissions_json);
  const defaults = {
    manageAccounts: type === "admin" || position === "owner",
    viewAccounts: type === "admin" || ["owner", "manager"].includes(position),
    manageOperations: type === "admin" || ["owner", "manager", "employee"].includes(position),
    managePermissions: type === "admin" || position === "owner",
    manageMeetings: type === "admin" || ["owner", "manager"].includes(position),
    manageCalendar: type === "admin" || ["owner", "manager"].includes(position),
    viewPayments: type !== "staff" || position !== "teacher",
    clockWork: type === "staff",
    viewStudents: type !== "student" || Boolean(user.linked_student_id),
    manageStudents: type === "admin" || ["owner", "manager", "employee"].includes(position),
    viewLessonLogs: true,
    writeLessonLogs: type === "admin" || type === "staff",
    viewReservations: true,
    manageReservations: type === "admin" || ["owner", "manager", "employee"].includes(position),
    reserveLessonRoom: type === "admin" || type === "staff",
    reservePracticeRoom: type === "admin" || type === "student" || type === "staff",
    viewTeam: type === "admin" || type === "staff",
    viewMeetings: type === "admin" || type === "staff",
    viewCalendar: true
  };
  defaults.reviewAccountRequests = type === "admin" || position === "owner";
  defaults.managePublicSettings = type === "admin" || position === "owner";
  Object.keys(custom).forEach((key) => {
    if (typeof custom[key] === "boolean") defaults[key] = custom[key];
  });
  return defaults;
}

function canViewAccounts(user) {
  return capabilitiesFor(user).viewAccounts;
}

function canManageAccounts(user) {
  return capabilitiesFor(user).manageAccounts;
}

function canManagePermissions(user) {
  return capabilitiesFor(user).managePermissions;
}

function canManageOperations(user) {
  return capabilitiesFor(user).manageOperations;
}

function canManageMeetings(user) {
  return capabilitiesFor(user).manageMeetings;
}

function canManageCalendar(user) {
  return capabilitiesFor(user).manageCalendar;
}

function canReviewAccountRequests(user) {
  return capabilitiesFor(user).reviewAccountRequests;
}

function canManagePublicSettings(user) {
  return capabilitiesFor(user).managePublicSettings;
}

function splitIds(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function addMinutes(time, minutes) {
  if (!time) return "";
  const parts = String(time).split(":").map(Number);
  const total = parts[0] * 60 + parts[1] + Number(minutes || 0);
  return ("0" + Math.floor(total / 60) % 24).slice(-2) + ":" + ("0" + total % 60).slice(-2);
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw new Error("이 작업을 수행할 권한이 없습니다.");
}

function settingValue(settings, key) {
  const item = settings.find((row) => row.key === key);
  return item ? item.value : "";
}

function publicSettings(settings) {
  const rows = settings || rowsAsObjects(SHEETS.settings);
  const result = {};
  Object.keys(PUBLIC_SETTING_DEFAULTS).forEach((key) => {
    result[key] = settingValue(rows, key) || PUBLIC_SETTING_DEFAULTS[key];
  });
  result.login_popup_enabled = asBoolean(result.login_popup_enabled);
  return result;
}

function upsertSetting(key, value, description) {
  const existing = findObject(SHEETS.settings, "key", key);
  if (existing) {
    updateObject(SHEETS.settings, "key", key, { value, description: description || existing.description || "", updated_at: nowIso() });
  } else {
    appendObject(SHEETS.settings, { key, value, description: description || "", updated_at: nowIso() });
  }
}

function objectMap(rows, key) {
  return rows.reduce((map, row) => {
    map[row[key]] = row;
    return map;
  }, {});
}

function unique(values) {
  return Array.from(new Set(values));
}

function asBoolean(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function normalizeCell(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  return value;
}

function makeId(prefix) {
  return prefix + "-" + Utilities.getUuid();
}

function nowIso() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayKey() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
}

function addDays(dateString, amount) {
  const date = new Date(dateString + "T12:00:00+09:00");
  date.setDate(date.getDate() + amount);
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd");
}

function dateDiffDays(fromDate, toDate) {
  const start = new Date(fromDate + "T12:00:00+09:00").getTime();
  const end = new Date(toDate + "T12:00:00+09:00").getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function daysFromToday(dateString) {
  return dateDiffDays(todayKey(), dateString);
}

function assignLessonNumbers(items) {
  const counters = {};
  return items.slice().sort(compareLesson).map((item) => {
    const key = item.enrollment_id || [item.student_id, item.teacher_id, item.subject].join("|");
    counters[key] = (counters[key] || 0) + 1;
    return Object.assign({}, item, { lesson_number: Number(item.lesson_number || counters[key]) });
  });
}

function inferLessonNumber(log, lessons) {
  const matching = lessons.filter((item) =>
    item.student_id === log.student_id
    && (!log.teacher_id || item.teacher_id === log.teacher_id)
    && (!log.subject || item.subject === log.subject)
    && String(item.lesson_date) <= String(log.lesson_date)
  );
  return Math.max(1, matching.length);
}

function compareLesson(a, b) {
  return (String(a.lesson_date) + " " + String(a.start_time || "")).localeCompare(
    String(b.lesson_date) + " " + String(b.start_time || "")
  );
}

function recentMonthCount(rows, dateKeyName) {
  const month = todayKey().slice(0, 7);
  return rows.filter((item) => String(item[dateKeyName] || "").slice(0, 7) === month).length;
}

function success(data) {
  return jsonResponse({ ok: true, data });
}

function failure(error) {
  return jsonResponse({ ok: false, error: error && error.message ? error.message : String(error) });
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
