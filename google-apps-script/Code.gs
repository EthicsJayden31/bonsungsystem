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
  templates: "수업일지템플릿"
};

const SCHEMA = {
  계정: ["account_id", "login_id", "password_hash", "password_salt", "role", "name", "email", "phone", "linked_student_id", "active", "must_change_password", "created_at", "updated_at"],
  수강생: ["student_id", "name", "birth_date", "phone", "guardian_name", "guardian_phone", "major", "goal", "status", "teacher_id", "enrolled_at", "memo", "created_at", "updated_at"],
  수업일지: ["log_id", "lesson_date", "student_id", "teacher_id", "subject", "lesson_content", "homework", "next_goal", "practice_request", "attendance_status", "internal_memo", "created_at", "updated_at"],
  세션: ["token", "account_id", "expires_at", "created_at"],
  설정: ["key", "value", "description", "updated_at"],
  수강등록: ["enrollment_id", "student_id", "teacher_id", "subject", "start_date", "end_date", "status", "weekly_day", "start_time", "duration_minutes", "room", "memo", "created_at", "updated_at"],
  수업일정: ["lesson_id", "lesson_date", "start_time", "duration_minutes", "student_id", "teacher_id", "subject", "status", "room", "memo", "enrollment_id", "created_at", "updated_at"],
  이용기록: ["event_id", "occurred_at", "account_id", "role", "action", "target_type", "target_id", "metadata", "date_key"],
  수업일지템플릿: ["template_id", "teacher_id", "title", "subject", "lesson_content", "homework", "next_goal", "practice_request", "active", "created_at", "updated_at", "scope"]
};

const ROLES = ["admin", "staff", "teacher", "student"];
const ENROLLMENT_STATUSES = ["active", "paused", "completed", "canceled"];
const LESSON_STATUSES = ["예정", "완료", "결석", "보강예정", "취소"];

function doGet() {
  try {
    return success(health());
  } catch (error) {
    return failure(error);
  }
}

function doPost(event) {
  try {
    ensureSchema();
    const request = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const action = request.action;

    if (action === "health") return success(health());
    if (action === "bootstrapAdmin") return success(bootstrapAdmin(request));
    if (action === "login") return success(login(request.loginId, request.password));

    const currentUser = requireSession(request.token);
    if (action === "logout") return success(logout(currentUser, request.token));
    if (action === "listAccounts") return success(listAccounts(currentUser));
    if (action === "createAccount") return success(createAccount(currentUser, request.account));
    if (action === "updateAccountStatus") return success(updateAccountStatus(currentUser, request.accountId, request.active));
    if (action === "resetAccountPassword") return success(resetAccountPassword(currentUser, request.accountId, request.password));
    if (action === "changePassword") return success(changePassword(currentUser, request.currentPassword, request.newPassword));
    if (action === "listStudents") return success(listStudents(currentUser));
    if (action === "createStudent") return success(createStudent(currentUser, request.student));
    if (action === "updateStudent") return success(updateStudent(currentUser, request.student));
    if (action === "listEnrollments") return success(listEnrollments(currentUser));
    if (action === "createEnrollment") return success(createEnrollment(currentUser, request.enrollment));
    if (action === "listLessons") return success(listLessons(currentUser));
    if (action === "createLesson") return success(createLesson(currentUser, request.lesson));
    if (action === "listLessonLogs") return success(listLessonLogs(currentUser));
    if (action === "createLessonLog") return success(createLessonLog(currentUser, request.log));
    if (action === "listLessonTemplates") return success(listLessonTemplates(currentUser));
    if (action === "createLessonTemplate") return success(createLessonTemplate(currentUser, request.template));
    if (action === "deleteLessonTemplate") return success(deleteLessonTemplate(currentUser, request.templateId));
    if (action === "getMyOverview") return success(getMyOverview(currentUser));
    if (action === "getUsageSummary") return success(getUsageSummary(currentUser));
    if (action === "recordPageView") return success(recordPageView(currentUser, request.page));

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
    schemaVersion: settingValue(settings, "schema_version") || "2",
    service: "Bonsung Music Intranet API"
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
    name: request.name || "원장 관리자",
    email: request.email || "",
    phone: request.phone || "",
    linked_student_id: "",
    active: true,
    must_change_password: false,
    created_at: now,
    updated_at: now
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
  requireRole(user, ["admin", "staff"]);
  return rowsAsObjects(SHEETS.accounts).map(publicAccount);
}

function createAccount(user, input) {
  requireRole(user, ["admin", "staff"]);
  if (!input || !input.login_id || !input.name || !input.password) throw new Error("이름, 아이디, 초기 비밀번호를 입력해 주세요.");
  if (String(input.password).length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  if (!ROLES.includes(input.role)) throw new Error("올바르지 않은 권한입니다.");
  if (user.role === "staff" && input.role === "admin") throw new Error("직원은 관리자 계정을 만들 수 없습니다.");
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
    updated_at: now
  };
  appendObject(SHEETS.accounts, account);
  logEvent(user, "create_account", "account", account.account_id, { role: account.role });
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
    updated_at: nowIso()
  });
  if (!active) deleteRowsWhere(SHEETS.sessions, (item) => item.account_id === accountId);
  logEvent(user, active ? "activate_account" : "deactivate_account", "account", accountId, {});
  return true;
}

function resetAccountPassword(user, accountId, password) {
  requireRole(user, ["admin", "staff"]);
  if (!password || String(password).length < 8) throw new Error("초기 비밀번호는 8자 이상이어야 합니다.");
  const account = findObject(SHEETS.accounts, "account_id", accountId);
  if (!account) throw new Error("계정을 찾을 수 없습니다.");
  if (account.account_id === user.account_id) throw new Error("본인 비밀번호는 내 계정 메뉴에서 변경해 주세요.");
  if (user.role === "staff" && account.role === "admin") throw new Error("직원은 관리자 계정을 변경할 수 없습니다.");

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
  requireRole(user, ["admin", "staff"]);
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
  requireRole(user, ["admin", "staff"]);
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
  requireRole(user, ["admin", "staff"]);
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
  return explicitLessons.concat(recurringLessons).sort(compareLesson);
}

function createLesson(user, input) {
  requireRole(user, ["admin", "staff"]);
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
    memo: input.memo || "",
    enrollment_id: input.enrollment_id || "",
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

function listLessonLogs(user) {
  const accounts = rowsAsObjects(SHEETS.accounts);
  const students = rowsAsObjects(SHEETS.students);
  let logs = rowsAsObjects(SHEETS.lessonLogs);
  if (user.role === "teacher") logs = logs.filter((item) => item.teacher_id === user.account_id);
  if (user.role === "student") logs = logs.filter((item) => item.student_id === user.linked_student_id);

  return logs.map((item) => {
    const copy = enrichLog(item, accounts, students);
    if (user.role === "student") delete copy.internal_memo;
    return copy;
  }).sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)));
}

function createLessonLog(user, input) {
  requireRole(user, ["admin", "staff", "teacher"]);
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
    internal_memo: input.internal_memo || "",
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
  const spreadsheet = db();
  Object.keys(SCHEMA).forEach((sheetName) => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    const headers = SCHEMA[sheetName];
    if (sheet.getLastColumn() < headers.length) {
      sheet.insertColumnsAfter(Math.max(sheet.getLastColumn(), 1), headers.length - sheet.getLastColumn());
    }
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const empty = current.every((value) => value === "");
    if (empty) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    if (sheetName === SHEETS.sessions) sheet.hideSheet();
  });
}

function db() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function rowsAsObjects(sheetName) {
  const sheet = db().getSheetByName(sheetName);
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
    const sheet = db().getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + " 시트를 찾을 수 없습니다.");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map((header) => object[header] === undefined ? "" : object[header]));
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
    must_change_password: asBoolean(account.must_change_password)
  };
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw new Error("이 작업을 수행할 권한이 없습니다.");
}

function settingValue(settings, key) {
  const item = settings.find((row) => row.key === key);
  return item ? item.value : "";
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
