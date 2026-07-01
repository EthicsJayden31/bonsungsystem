export const bonsungInitialTeachers = [
  { id: "teacher-kang-eunmi", name: "강은미", major: "Director", role: "Director", team: ["Educational Team", "Performance Team"], workType: "상시", memo: "대표/원장, 교육철학, 전체 운영 방향, 대외 브랜드 대표성" },
  { id: "teacher-1", name: "황휘현", major: "Head Coach", role: "Head Coach", team: ["Educational Team"], workType: "확인 필요", memo: "수석 강사, 교육 운영 핵심 담당" },
  { id: "teacher-choi-hyeryeong", name: "최혜령", major: "Head Coach", role: "Head Coach", team: ["Educational Team"], workType: "확인 필요", memo: "수석 강사, 교육 운영 핵심 담당" },
  { id: "teacher-lee-seonghyeon", name: "이성현", major: "Coach", role: "Coach", team: ["Educational Team"], workType: "확인 필요", memo: "강사" },
  { id: "teacher-kim-saemi", name: "김새미", major: "Coach", role: "Coach", team: ["Educational Team"], workType: "확인 필요", memo: "강사" },
  { id: "staff-cho-youngjin", name: "조영진", major: "Student Success", role: "Student Success Manager", team: ["Student Success Team", "Operations Team"], workType: "상시", memo: "학생관리, 상담, 학사관리, 멘토링" },
  { id: "staff-jinho", name: "진호", major: "Operations", role: "Finance & Operations Manager", team: ["Operations Team"], workType: "확인 필요", memo: "재무, 행정, 운영관리" },
  { id: "staff-kim-jaeeun", name: "김재은", major: "Brand", role: "Brand Producer", team: ["Creative Team"], workType: "확인 필요", memo: "브랜드, 콘텐츠, SNS, 제작 관련 업무" },
  { id: "teacher-unassigned", name: "미정", major: "Unassigned", role: "Coach", team: ["Educational Team"], workType: "확인 필요", memo: "Notion 수강생 DB에서 담당 강사가 아직 정해지지 않은 학생용 임시 배정값" }
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
  memo: "본성뮤직 초기 운영 자료 for Monster Crew > 수강생 DB에서 이관",
  teacherId: "teacher-unassigned",
  teacherName: "미정"
}));
