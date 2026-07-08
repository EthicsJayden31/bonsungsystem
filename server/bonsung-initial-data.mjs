const importedAt = "2026-07-07";

export const bonsungInitialTeachers = [
  { id: "teacher-kang-eunmi", name: "강은미", major: "Director", role: "Director", team: ["Educational Team", "Performance Team"], workType: "상시", memo: "대표/원장, 교육철학, 전체 운영 방향, 대외 브랜드 대표성" },
  { id: "teacher-1", name: "황휘현", major: "수석 강사", role: "수석 강사", team: ["Educational Team"], workType: "확인 필요", memo: "수석 강사, 교육 운영 핵심 담당" },
  { id: "teacher-choi-hyeryeong", name: "최혜령", major: "수석 강사", role: "수석 강사", team: ["Educational Team"], workType: "확인 필요", memo: "수석 강사, 교육 운영 핵심 담당" },
  { id: "teacher-lee-seonghyeon", name: "이성현", major: "강사", role: "강사", team: ["Educational Team"], workType: "확인 필요", memo: "강사" },
  { id: "teacher-kim-saemi", name: "김새미", major: "강사", role: "강사", team: ["Educational Team"], workType: "확인 필요", memo: "강사" },
  { id: "staff-cho-youngjin", name: "조영진", major: "Student Success", role: "Student Success Manager", team: ["Student Success Team", "Operations Team"], workType: "상시", memo: "학생관리, 상담, 학사관리, 멘토링" },
  { id: "staff-jinho", name: "진호", major: "Operations", role: "Finance & Operations Manager", team: ["Operations Team"], workType: "확인 필요", memo: "재무, 행정, 운영관리" },
  { id: "staff-kim-jaeeun", name: "김재은", major: "Brand", role: "Brand Producer", team: ["Creative Team"], workType: "확인 필요", memo: "브랜드, 콘텐츠, SNS, 제작 관련 업무" },
  { id: "teacher-unassigned", name: "미정", major: "미정", role: "강사", team: ["Educational Team"], workType: "확인 필요", memo: "Notion 수강생 DB에서 담당 강사가 아직 정해지지 않은 학생용 임시 배정값" }
];

export const bonsungInitialCourses = [
  { id: "course-precollege", name: "본성 프리컬리지", major: "입시 및 예비 음악가 과정", teacherId: "teacher-kang-eunmi", status: "준비중", type: "핵심", target: "입시생, 예비 전공자", team: ["대표", "강사", "운영", "콘텐츠"], memo: "보컬, 싱어송라이터, 화성학, 작곡, 교양수업" },
  { id: "course-artist", name: "본성 아티스트", major: "성인 전문과정, 작품 제작형 교육", teacherId: "teacher-kang-eunmi", status: "운영 예정", type: "핵심", target: "성인 취미·전문 지향 수강생", team: ["대표", "강사", "콘텐츠", "공연"], memo: "공연, 녹음, 촬영, 브랜딩 연계" },
  { id: "course-vocal-redesign", name: "보컬 리디자인", major: "목소리·호흡·자기표현 회복형 보컬 교육", teacherId: "teacher-kang-eunmi", status: "준비중", type: "핵심", target: "청소년, 성인, 음성 사용 직업군", team: ["대표", "강사", "운영", "콘텐츠"], memo: "치료가 아닌 음악 기반 보이스 케어형 교육으로 운영" },
  { id: "course-project", name: "프로젝트 수업", major: "공연, 녹음, 촬영, 커버 콘텐츠 등 결과물 중심 교육", teacherId: "teacher-kang-eunmi", status: "준비중", type: "확장", target: "전체 수강생 중 참여자", team: ["대표", "강사", "콘텐츠", "공연"], memo: "일정, 참여 학생, 촬영 동의, 아카이브 관리" },
  { id: "course-liberal-arts", name: "교양교육", major: "생각하는 음악가 양성", teacherId: "teacher-kang-eunmi", status: "준비중", type: "확장", target: "프리컬리지, 심화 수강생", team: ["대표", "강사"], memo: "한국근대대중음악, 대중예술과 미학, 음악산업, AI 세대 음악가론" },
  { id: "course-short-goal", name: "단기 목적형 수업", major: "단기 목표 달성을 위한 맞춤 수업", teacherId: "staff-cho-youngjin", status: "준비중", type: "단기", target: "축가, 대회, 발표, 면접 등 특정 목적 수강생", team: ["대표", "강사", "운영"], memo: "목표일, 곡목, 필요한 회차, 리허설 여부 관리" },
  { id: "course-happy-hour", name: "해피아워 클래스", major: "오전 시간대 유휴 공간 활용, 커뮤니티 형성", teacherId: "staff-cho-youngjin", status: "준비중", type: "보조", target: "시니어, 주부, 오전 가능 성인", team: ["대표", "강사", "운영"], memo: "간단한 그룹 수업, 건강한 노래 활동, 장기 수강 전환" }
];

const rawStudents = [
  ["jang-yunho", "장윤호", "등록 확정"], ["moon-hongjae", "문홍재", "등록 확정"], ["shin-dongwoo", "신동우", "등록 확정"],
  ["moon-jihwan", "문지환", "등록 확정"], ["choi-hoon", "최훈", "등록 확정"], ["jung-youngjin", "정영진", "등록 확정"],
  ["shin-hogeun", "신호근", "등록 확정"], ["lee-minjin", "이민진", "등록 확정"], ["lim-seunghyun", "임승현", "등록 확정"],
  ["kim-taeji-new", "(신) 김태지", "확인 필요"], ["seo-minyeop", "서민엽", "등록 확정"], ["cho-youngjin-new", "(신) 조영진", "확인 필요"],
  ["moon-insu", "문인수", "등록 확정"], ["kim-youngseok", "김영석", "등록 확정"], ["park-soyoung", "박소영", "등록 확정"],
  ["lee-seonje", "이선제", "등록 확정"], ["oh-sanghoon", "오상훈", "등록 확정"], ["lee-jisu-new", "(신) 이지수", "확인 필요"],
  ["moon-daeseong", "문대성", "등록 확정"], ["choi-junmyeong", "최준명", "등록 확정"], ["hwang-donggyu", "황동규", "등록 확정"],
  ["park-jaedong", "박재동", "등록 확정"], ["kim-taehyeong", "김태형(?)", "등록 확정"], ["jang-sejin", "장세진", "등록 확정"],
  ["ha-hyeyoung-new", "(신) 하혜영", "확인 필요"], ["kim-mijin", "김미진", "등록 확정"], ["lee-seonghyeon-new", "(신) 이성현", "확인 필요"],
  ["ji-dasom", "지다솜", "등록 확정"]
];

const pendingStudents = rawStudents.filter(([, , registrationStatus]) => registrationStatus === "확인 필요");

export const bonsungInitialStudents = rawStudents.map(([slug, name, registrationStatus]) => ({
  id: `student-${slug}`,
  name,
  birthDate: "",
  phone: "",
  major: "미정",
  goal: "Notion 수강생 DB 초기 이관",
  status: registrationStatus === "등록 확정" ? "재원" : "등록대기",
  registrationStatus,
  paymentStatus: "확인 필요",
  contentConsent: "확인 필요",
  enrolledAt: "",
  memo: "본성뮤직 초기 운영 자료 for Monster Crew > 수강생 DB에서 이관. 담당 강사, 프로그램, 수업 시간, 보호자 연락처는 추가 확인 필요.",
  teacherId: "teacher-unassigned",
  teacherName: "미정"
}));

export const bonsungInitialConsultations = pendingStudents.map(([slug, name], index) => ({
  id: `consult-initial-${index + 1}`,
  studentId: `student-${slug}`,
  studentName: name,
  guardianName: "",
  phone: "",
  channel: "Notion 초기 운영 자료",
  major: "미정",
  goal: "신규 사전등록 상태 확인",
  date: importedAt,
  followUpDate: "",
  status: "접수됨",
  priority: "높음",
  memo: "수강생 DB에서 등록 상태가 '확인 필요'로 표시되어 상담/등록 확정 여부 확인 필요.",
  assignedTo: "manager-1",
  assignedToName: "조영진",
  statusUpdatedAt: importedAt,
  unreadForAccountIds: ["manager-1"]
}));

export const bonsungInitialConsultationHistory = bonsungInitialConsultations.map((item, index) => ({
  id: `consult-history-initial-${index + 1}`,
  consultationId: item.id,
  actorId: "manager-1",
  actorName: "조영진",
  action: "create_consultation",
  status: item.status,
  assignedTo: item.assignedTo,
  assignedToName: item.assignedToName,
  occurredAt: `${importedAt}T09:${String(10 + index).padStart(2, "0")}:00+09:00`
}));

export const bonsungInitialPayments = rawStudents.map(([slug, name], index) => ({
  id: `payment-initial-${index + 1}`,
  studentId: `student-${slug}`,
  title: "초기 등록 수납 확인",
  amount: 0,
  status: "확인 필요",
  dueDate: "",
  paidAt: "",
  memo: `${name} - Notion 수강생 DB 결제 상태: 확인 필요`
}));

const operatingDocumentRows = [
  ["opening-checklist", "개원 준비 체크리스트", "개원 준비", "공사, 장비, 강의실, 상담 공간, 홈페이지/SNS 오픈 확인", 1],
  ["student-registration-sheet", "수강생 등록 현황표", "학생 관리", "사전등록생, 기존 수강생, 신규 상담자 통합 관리", 2],
  ["consulting-manual", "상담 프로세스 매뉴얼", "상담/등록", "문의 접수부터 등록까지 표준 절차 정리", 3],
  ["class-room-schedule", "수업 시간표 및 강의실 배정표", "수업 운영", "8월 18일 이후 실제 수업 운영 기준", 4],
  ["teacher-student-assignment", "강사별 담당 학생표", "학생 관리", "담당 강사, 학생 상태, 수업 시작일 정리", 5],
  ["lesson-record-template", "수업 기록 템플릿", "수업 운영", "강사용 피드백 및 과제 기록 양식", 6],
  ["sns-content-calendar", "SNS 콘텐츠 캘린더", "콘텐츠", "초기 30개 콘텐츠 업로드 일정 관리", 7],
  ["homepage-materials", "홈페이지 자료 준비표", "콘텐츠", "강사 소개, 프로그램 설명, FAQ, 상담 신청 자료 정리", 8],
  ["performance-project-sheet", "공연/프로젝트 운영표", "공연/프로젝트", "쇼케이스, 버스킹, 녹음, 촬영 일정 관리", 9],
  ["privacy-content-consent", "개인정보 및 콘텐츠 동의서", "동의/보안", "학생 사진, 영상, 음성 활용 동의 관리", 10]
];

export const bonsungInitialDocumentTasks = [
  {
    id: "task-initial-student-assignment",
    title: "초기 수강생 프로그램·담당 강사 배정",
    assignee: "조영진",
    dueDate: "2026-08-01",
    status: "진행중",
    priority: "높음",
    memo: "수강생 DB에 프로그램, 담당 강사, 요일/시간이 비어 있어 등록 확정자부터 실제 배정 필요."
  },
  ...operatingDocumentRows.map(([slug, title, category, purpose, rank]) => ({
    id: `task-doc-${slug}`,
    title: `운영 문서 작성: ${title}`,
    assignee: "조영진",
    dueDate: "",
    status: "할일",
    priority: rank <= 3 ? "높음" : rank <= 7 ? "보통" : "낮음",
    memo: `[${category}] ${purpose}`
  }))
];

const openingScheduleRows = [
  ["consulting-start", "신규 수강상담 및 사전등록 시작", "2026-08-01", "", "높음", ["대표", "운영", "강사", "재무"], "상담 프로세스와 등록 양식 준비"],
  ["founding-vocal-start", "파운딩멤버 보컬 수업 시작", "2026-08-18", "", "높음", ["대표", "운영", "강사"], "첫 수업 안내, 출결, 피드백 기록"],
  ["new-student-class-start", "신규 등록자 수업 시작", "2026-09-01", "", "높음", ["대표", "운영", "강사", "재무"], "신규생 시간표, 담당 강사, 결제 상태 확인"]
];

export const bonsungInitialCalendarEvents = openingScheduleRows.map(([slug, title, date, endDate, priority, teams, checkpoint]) => {
  const targetRoles = teamsToRoles(teams);
  return {
    id: `calendar-opening-${slug}`,
    calendar_event_id: `calendar-opening-${slug}`,
    title,
    date,
    endDate,
    startTime: "",
    start_time: "",
    targetRoles,
    target_roles: targetRoles.join(","),
    createdBy: "manager-1",
    created_by: "manager-1",
    status: "예정",
    priority,
    memo: `${checkpoint} / 담당팀: ${teams.join(", ")}`
  };
});

export const bonsungInitialNotices = [
  { id: "notice-initial-data", title: "본성 스테이지 초기 운영 데이터 반영", category: "운영공지", author: "강은미", updatedAt: importedAt, body: "직원, 수강생, 프로그램, 공개 개원 일정, 운영 문서 초기 데이터는 Notion '본성뮤직_업무노트 HQ'와 초기 운영 DB에서 필요한 항목만 선별해 반영했습니다.", targetRoles: ["owner", "manager", "teacher", "student"], pinned: true, active: true },
  { id: "notice-student-data-followup", title: "수강생 배정 정보 추가 확인 필요", category: "학생관리", author: "조영진", updatedAt: importedAt, body: "현재 수강생 DB에는 담당 강사, 프로그램, 수업 요일/시간, 보호자 연락처가 비어 있습니다. 실제 운영 전 등록 확정자부터 배정을 완료해야 합니다.", targetRoles: ["owner", "manager", "teacher"], pinned: true, active: true }
];

function teamsToRoles(teams) {
  const roles = new Set();
  if (teams.includes("대표")) roles.add("owner");
  if (teams.some((team) => ["운영", "재무", "콘텐츠", "공연"].includes(team))) roles.add("manager");
  if (teams.includes("강사")) roles.add("teacher");
  return Array.from(roles.size ? roles : new Set(["manager"]));
}
