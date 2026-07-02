## 2026-07-02 14:53 PC/모바일 메뉴 사용성 개선

Version.3 공식 Next UI의 PC 화면은 좌측 사이드바와 우측 본문을 각각 독립 스크롤 영역으로 분리합니다. 화면 전체가 함께 밀리는 구조를 피하기 위해 AppShell 루트는 PC 폭에서 화면 높이에 고정하고, 사이드바 메뉴와 본문 컨테이너만 각각 스크롤됩니다.

사이드바 상위 메뉴는 버튼형 접기 구조로 바꿉니다. 상위 그룹명은 `Operations`, `Academy Roster`, `Classes & Rooms`, `Administration`을 사용하며, 각 그룹 안에 권한별로 허용된 하위 메뉴만 노출합니다. 기존처럼 `사람` 같은 추상적인 한국어 그룹명은 사용하지 않습니다.

모바일 하단 메뉴는 불투명 흰색 고정 바를 기준으로 합니다. 스크롤 중 하단 바가 끌려오거나 밀려 보이지 않아야 하며, 전체 메뉴 시트는 하단 바보다 높은 레이어에서 열려야 합니다. 점검 기준은 `/version3-test/`에서 실제 Next UI를 localStorage 데이터로 실행했을 때 같은 레이아웃과 동작이 보이는 것입니다.

## 2026-07-02 08:10 Version.3 실사용 핵심 기능 구현

Version.3의 목표를 임시 점검용 HTML이 아니라 실제 서버 기반 통합 관리 시스템 구축으로 재확인하고, 로컬 Version.3 서버와 공식 Next UI에 실사용 핵심 기능을 확장했습니다. 서버는 이제 계정 요청 생성/승인/반려, 권한별 계정 요청 조회, 근태 기록, 회의 생성, 일정 생성, 공개 운영 환경 설정 저장을 지원합니다. 기존 학생, 상담요청, 수강, 수업, 출결, 레슨노트, 공간 예약, 수납, 업무, 공지, 데이터 내보내기/가져오기, 백업, 감사 로그 계약과 함께 `/bootstrap`으로 다시 조회됩니다.

공식 UI에서는 `/accounts/`에 `계정 요청 승인` 영역을 추가해 대표 계정이 대기 요청을 검토하고 초기 비밀번호와 연결 학생을 지정해 실제 계정으로 전환할 수 있게 했습니다. `/tasks/`는 단순 업무 목록에서 `내부 운영` 화면으로 확장되어 업무, 근태, 회의, 일정을 한 화면에서 확인하고 저장할 수 있습니다. `/profile-settings/`에는 대표 권한의 운영 환경 설정 폼을 추가해 로그인 안내, 학원 연락처, 공간 예약 안내 문구를 서버에 저장할 수 있게 했습니다.

임시 점검용 HTML인 `/version3-offline-inspection.html`은 서버 없는 보조 점검판입니다. 이 파일은 localStorage를 사용해 계정 요청 승인, 학생/수업/상담/예약, 출결/레슨노트, 수납, 내부 운영, 공지, 운영 환경 설정, JSON 내보내기, 브라우저 백업, 감사 기록을 눌러볼 수 있게 했지만, 실제 운영 원본은 Version.3 서버 API와 공식 Next UI입니다. 따라서 앞으로 기능을 수정할 때는 먼저 서버와 공식 UI를 고치고, HTML은 같은 흐름을 확인하는 보조판으로 맞춥니다.

검증은 `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm run verify:version3-server`, 오프라인 HTML 스크립트 파싱으로 통과했습니다. 브라우저 점검에서는 `http://127.0.0.1:3000/login/` 대표 로그인 후 `/tasks/`의 근태·회의·일정 영역, `/accounts/`의 계정 요청 승인 영역, `/version3-offline-inspection.html` 로그인 화면이 정상 표시되는 것을 확인했습니다.

## 2026-07-01 계정 생성 완료 후 대시보드 복귀 및 항목 정리

대시보드 `우선 처리 목록`에서 `계정 · 수강생 계정 생성 필요` 항목을 눌러 계정 입력 화면으로 이동할 때 `returnTo=/dashboard` 값을 함께 전달합니다. 계정 생성이 성공하면 계정 화면은 안전한 내부 경로인지 확인한 뒤 대시보드로 돌아갑니다. Preview에서는 생성된 수강생 계정 초안과 계정 변경 이력을 `bonsung_preview_account_drafts_v1`, `bonsung_preview_account_history_v1` 저장소에 보존하므로 페이지 새로고침이나 대시보드 왕복 뒤에도 새 계정 연결 상태가 유지됩니다. 새 Preview 로그인 또는 로그아웃 시에는 이 임시 초안 저장소를 함께 비워 실제 세션과 섞이지 않게 했습니다.

브라우저 검증 기준으로 대표 Preview에서 `계정 · 최서연 · 수강생 계정 생성 필요` 항목을 눌러 `최서연 수강생 / student2` 초안을 추가하면 자동으로 `/dashboard/`로 복귀하고, 복귀 후 새로고침해도 같은 계정 필요 항목과 `student-2` 계정 생성 링크가 다시 나타나지 않습니다. `/accounts/` 화면에는 전체 계정 5개, 연결됨 2명, `최서연 수강생 / student2 / 초안`이 표시되며 연결 학생 후보에서 최서연은 제외됩니다. 강사 Preview 대시보드는 계정 항목과 계정 링크를 계속 노출하지 않습니다.

## 2026-07-01 대시보드 우선 처리 목록에 수강생 계정 누락 연결

대시보드의 `우선 처리 목록`은 이제 상담요청, 출결, 수납, 업무뿐 아니라 `계정` 항목도 표시합니다. 대표/매니저처럼 계정 현황을 볼 수 있는 계정은 학생 목록과 계정 목록을 비교해 수강생 계정이 아직 연결되지 않은 재원/상담 학생을 `수강생 계정 생성 필요`로 확인할 수 있고, `확인`을 누르면 `/accounts?student={studentId}#create-account`로 이동합니다. 이 흐름은 앞서 만든 학생 목록/상세/학생 등록 후 계정 생성 진입과 같은 계정 생성 프리셋 계약을 공유합니다.

Preview 검증 기준으로 대표 대시보드에는 `계정 · 최서연 · 수강생 계정 생성 필요`가 우선 처리 목록에 표시되고, 해당 `확인` 링크는 계정 생성 폼에 `최서연 수강생`, `student2`, 연결 학생 `최서연`을 자동 입력합니다. 강사 Preview에서는 계정 항목과 계정 링크가 노출되지 않습니다. 별도 서버 전환 시 서버가 `dashboardWorkQueue` 엔티티에 `kind=계정`, `sourceType=accounts`, `href=/accounts?student=...#create-account`를 직접 내려주면 클라이언트는 같은 표면을 그대로 사용할 수 있습니다.

## 2026-07-01 학생 등록 후 수강생 계정 생성 연결

학생 빠른 등록 폼에 `등록 후 수강생 계정 만들기` 선택지를 추가했습니다. 대표/매니저가 실사용 Apps Script 세션에서 학생을 저장할 때 이 선택지를 켜면, `createStudent`가 반환한 새 `student_id`를 사용해 `/accounts?student={studentId}#create-account`로 이동합니다. 계정 화면은 같은 학생 ID를 받아 수강생 역할, 학생 이름 기반 계정명, 제안 로그인 ID, 연결 학생을 미리 채웁니다.

Preview 검증 기준으로 대표 화면의 학생 등록 폼에는 체크박스가 표시되고 클릭 시 선택 상태가 유지됩니다. 강사 화면은 기존처럼 학생 등록 폼 자체가 보이지 않으며 `등록 후 수강생 계정 만들기` 선택지도 노출되지 않습니다. Preview 모드에서는 저장이 일어나지 않으므로 외부 데이터 변경 없이 저장 필요 안내만 표시됩니다. 별도 서버 전환 시에는 학생 생성 API가 생성된 학생 ID를 반환하고, 클라이언트는 그 ID로 계정 생성 프리셋을 여는 구조를 유지하면 됩니다.

## 2026-07-01 계정 없는 학생의 수강생 계정 생성 진입

학생 목록과 학생 상세의 `계정 필요` 상태는 이제 단순 안내가 아니라 계정 생성 흐름으로 이어집니다. 대표/매니저가 학생 목록의 `계정 필요` 또는 학생 상세의 `계정 관리로 이동`을 누르면 `/accounts?student={studentId}#create-account`로 이동하고, 계정 입력 폼은 `수강생` 역할, 학생 이름 기반 계정명, 제안 로그인 ID, 연결 학생을 미리 채웁니다.

Preview 검증 기준으로 `최서연` 상세에서 계정 관리로 이동하면 계정 입력 폼에 `최서연 수강생`, `student2`, 연결 학생 `최서연`이 자동 입력됩니다. 임시 비밀번호를 넣고 Preview 초안을 추가하면 전체 계정은 5개, 연결 가능 학생은 1명, 연결됨은 2명으로 바뀌고 `최서연`은 새 계정 후보에서 제외됩니다. 별도 서버 전환 시에도 학생 상세/목록의 계정 누락 상태는 계정 생성 화면의 학생 프리셋과 연결되어야 하며, 저장 단계에서는 서버가 `role=student`와 `linkedStudentId` 중복을 최종 검증해야 합니다.

## 2026-07-01 학생 상세의 수강생 계정 상태 연결

학생 상세 패널은 대표/매니저처럼 학생 관리 권한이 있는 계정에게 `수강생 계정` 블록을 표시합니다. 연결된 수강생 계정이 있으면 로그인 ID, 계정 상태, 이름, 최근 로그인 시각을 보여주고, 연결된 계정이 없으면 `계정 필요`와 `계정 관리로 이동` 링크를 표시합니다. 강사 화면에서는 같은 학생 상세를 열어도 수강생 계정 블록을 숨기고, 연락처와 보호자 연락처는 기존처럼 `권한 제한`으로 유지합니다.

Preview 검증 기준으로 대표 화면에서 `이도윤` 상세는 `student` 로그인 ID와 `비밀번호 변경 필요` 상태를 표시하고, `최서연` 상세는 `계정 필요` 및 계정 관리 이동 버튼을 표시합니다. 강사 화면에서 `이도윤` 상세는 계정 블록을 표시하지 않고 연락처/보호자 연락처를 제한합니다. 별도 서버 전환 시 학생 상세 API도 목록과 같은 `studentAccount` 또는 `linkedStudentAccountStatus` 요약을 내려주어야 하며, 권한 없는 역할에는 계정 연결 정보를 내려주지 않는 방향이 안전합니다.

## 2026-07-01 학생 목록의 계정 연결 상태 표시

학생 관리 화면은 대표/매니저처럼 학생 관리 권한이 있는 계정에게 학생별 수강생 계정 연결 상태를 표시합니다. 연결된 수강생 계정이 있으면 `연결됨`, `비밀번호 변경 필요`, `초안`, `계정 중지` 상태를 보여주고, 연결 계정이 없으면 `계정 필요`로 표시해 계정 생성 누락을 바로 찾을 수 있게 했습니다.

Preview 검증 기준으로 대표 화면은 `이도윤`에 `비밀번호 변경 필요`, `최서연`과 `문하준`에 `계정 필요`를 표시합니다. 강사 화면은 담당 학생 1명만 표시하고 연락처/메모 권한 제한을 유지하며, 계정 연결 상태는 표시하지 않습니다. 별도 서버 전환 시 학생 목록 API는 운영자 권한에서 `linkedStudentAccountStatus` 또는 `studentAccount` 요약을 함께 내려주면 같은 UI를 서버 계산 결과로 대체할 수 있습니다.

## 2026-07-01 수강생 계정과 학생 기록 1:1 연결

계정 관리 화면의 수강생 계정 생성은 학생 기록과 1:1로 연결되어야 합니다. 이미 수강생 계정과 연결된 학생은 새 계정 입력의 `연결 학생` 후보에서 제외하고, 클라이언트 데이터 훅과 Apps Script 임시 연결층도 같은 중복 연결을 거부합니다.

Preview 검증 기준으로 기존 `수강생 계정`은 `이도윤`과 연결되어 있으므로 새 계정 후보에는 `최서연`, `문하준`만 표시됩니다. `최서연 수강생` Preview 초안을 생성하면 전체 계정은 5개, 연결 가능 학생은 1명, 연결됨은 2명으로 바뀌고, 후보에는 `문하준`만 남습니다. 별도 서버 전환 시 `accounts.linkedStudentId`는 수강생 계정에서 필수이며 학생 1명당 활성 수강생 계정 1개를 유지해야 합니다.

## 2026-07-01 공지 대상과 고정 공지 계약

공지 서버 계약에 `targetRoles`, `pinned`, `active` 필드를 명시하고, 현재 Next UI의 `Notice` 데이터에도 같은 값을 추가했습니다. 기본 공지는 `전체` 대상으로 유지하되, 대표/매니저는 작성 시 대상을 `전체`, `대표/매니저`, `강사`, `수강생` 중에서 고르고 상단 고정 여부를 저장 요청에 포함할 수 있습니다.

`useOperationsData`는 현재 역할이 공지의 `targetRoles`에 포함될 때만 해당 공지를 노출합니다. Preview 검증 기준으로 대표/매니저/강사는 2건을 보고, 수강생은 수강생 대상이 아닌 `강사 레슨노트 작성 기준` 공지를 보지 않아 1건만 봅니다. Apps Script 임시 연결층도 `공지문서` 스키마에 `target_roles`, `pinned` 컬럼을 추가하고, `listNotices`에서 대상 역할 필터와 고정 우선 정렬을 적용합니다.

## 2026-07-01 공지 작성 권한 계약

Version.3 공지/문서 화면은 모든 계정이 공지를 열람하되, 작성 폼과 `createNotice` 저장 액션은 대표와 매니저에게만 노출합니다. 권한 키는 `manageNotices`로 분리했고, 기본 권한은 대표/매니저 `true`, 강사/수강생 `false`입니다. 계정 권한 편집 화면도 같은 권한 그룹을 읽으므로 별도 서버 전환 시 `accounts.permissions.manageNotices`와 서버 저장 액션의 권한 검사를 같은 이름으로 이관하면 됩니다.

Apps Script 임시 연결층의 `createNotice`도 `canManageNotices`를 통해 대표 또는 매니저 역할인지 먼저 확인한 뒤 저장합니다. 브라우저 Preview 기준으로 대표와 매니저는 `공지 저장` 폼이 표시되고, 강사와 수강생은 공지 목록만 표시되며 작성 컨트롤은 숨겨집니다.

## 2026-07-01 dashboardWorkQueue 서버 계약 준비

대시보드 `우선 처리 목록` 조립 로직을 `lib/dashboard-work-queue.ts`로 분리했습니다. 현재는 권한 필터가 적용된 `OperationsData`에서 상담요청, 출결, 보강, 수납, 업무 항목을 조립하지만, 별도 서버 전환 후에는 서버가 `dashboardWorkQueue`를 직접 내려줄 수 있도록 `lib/version3-server-contract.ts`에 `Version3DashboardWorkItem`과 `dashboardWorkQueue` 엔티티 계약을 추가했습니다.

`dashboardWorkQueue` 항목은 `kind`, `sourceType`, `sourceId`, `title`, `ownerName`, `href`, `priority`, `tone`, `status`, `dueAt`을 가집니다. 정렬은 `urgent`, `high`, `normal` 우선순위와 마감일 기준으로 처리합니다. 실사용 서버에서는 권한이 적용된 계정별 작업 큐를 내려주는 것이 최종 목표이며, 현재 클라이언트는 서버 응답이 있으면 그 목록을 우선 사용하고 없으면 preview/Apps Script 데이터를 바탕으로 같은 계약의 목록을 만듭니다.

## 2026-07-01 대시보드 우선 처리 목록

Version.3 대시보드는 상담요청, 출결 미처리, 보강 확인, 수납 확인, 내부 업무를 `우선 처리 목록`으로 모아 보여줍니다. 이 목록은 `useOperationsData`에서 이미 필터링된 현재 계정의 운영 데이터만 사용하므로, 대표는 전체 운영 이슈를 보고 강사는 담당 학생 또는 배정된 상담요청 중심으로 보며 수강생은 본인 상담요청과 본인 수납 확인만 봅니다.

모바일 빠른 카드에는 `상담요청` 카드를 추가했습니다. 대표 Preview에서는 상담요청, 출결, 수납, 업무가 함께 표시되고, 강사 Preview에서는 수납 없이 담당 범위 상담요청만 표시되며, 수강생 Preview에서는 본인 상담요청과 본인 수납 확인만 표시됨을 브라우저에서 확인했습니다. 세 Preview 모두 콘솔 오류 없이 모바일 폭에서 가로 넘침이 없었습니다.

## 2026-07-01 권한 기반 운영 데이터 필터

Version.3 Next UI는 계정 권한을 메뉴와 페이지 접근뿐 아니라 실제 운영 데이터 노출 범위에도 적용합니다. `useOperationsData`는 현재 로그인 계정의 역할, 계정 ID, 연결된 학생 ID, 권한 override를 기준으로 학생, 보호자, 수업, 출결, 레슨노트, 예약, 수납, 상담요청, 계정/팀 정보를 필터링합니다. 입력 폼도 같은 기준을 사용해 `manageStudents`, `manageOperations`, `writeLessonLogs`, `reserveLessonRoom`, `reservePracticeRoom`, `viewPayments + manageOperations` 권한이 있는 경우에만 표시합니다.

브라우저 확인 기준으로 강사 Preview는 수납 메뉴와 `/payments/` 직접 접근이 차단되고, 담당 학생 1명과 해당 레슨노트만 표시됩니다. 학생 등록 폼은 숨겨지고 레슨노트 작성 폼은 유지됩니다. 수강생 Preview는 본인 수납 1건만 확인 가능하며 수납 등록 폼은 숨겨지고, 연습실 예약 폼은 표시됩니다.

# 화면 구분 기준

본성뮤직 인트라넷에는 현재 두 개의 운영 표면이 있습니다.

## 1. 공식 Next UI

- 경로: `/`, `/login/`, `/dashboard/`, `/accounts/`, `/students/`, `/teachers/`, `/practice-rooms/` 등
- 목적: Version.3 공개 경로를 대체할 공식 브랜드 운영 화면
- 데이터:
  - 기본 운영 모드는 별도 Version.3 서버를 우선 사용합니다.
  - 서버 세션이 있으면 `/bootstrap`, `/accounts`, `/account-history`, `/audit-logs`, `/data-quality`, `/actions/{action}` 계약을 기준으로 데이터를 읽고 저장합니다.
  - 서버 연결이 실패해도 기본 운영 모드에서는 Preview 데이터를 대신 표시하지 않고 `연결 실패` 상태를 보여줍니다.
  - Apps Script 전환 데이터와 Preview 데이터는 각각 `NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION=true`, `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN=true`일 때만 보조 경로로 사용합니다.
- 저장:
  - 저장 액션은 Version.3 서버의 `/actions/{action}`와 계정 API를 우선 호출합니다.
  - 새 화면의 데이터 계약은 `lib/version3-server-contract.ts`를 기준으로 잡습니다.
  - 실패하면 사용자에게 명확한 오류를 보여줘야 합니다.

## 2. legacy Apps Script 화면

- 경로: `/legacy-preview/`
- 원본: `pages-preview/`
- 목적: 전환 검증이 필요할 때 기존 Apps Script 흐름을 비교하는 보조 기준
- API: `pages-preview/config.js`의 Apps Script Web App URL

legacy 화면은 기본 공개 빌드에 포함하지 않습니다. `NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true`일 때만 산출물에 포함하며, 최후반 정리 단계에서 삭제/보존 기준을 결정합니다.

## 권한 기준

| 권한 | 기준 |
| --- | --- |
| 대표 | 전체 운영, 계정 관리, 공지 작성, 데이터 점검 접근 가능 |
| 매니저 | 상담요청 접수, 학생·강사·수업 관리, 공지 작성, 계정 현황 확인 |
| 강사 | 담당 학생/수업/출결/레슨노트/예약 중심, 수납 및 민감정보 차단 |
| 수강생 | 공지, 내 수업, 레슨노트, 연습실 예약, 일방향 상담요청 |

## 계정 관리 기준

계정 관리는 대표가 생성, 중지/재개, 비밀번호 초기화, 권한 상세 편집을 수행하는 운영 화면입니다. 매니저는 계정 현황을 확인하되 실사용 저장 권한은 제한합니다. 수강생 계정은 학생 기록과 연결되어야 하며, 비밀번호 초기화 후에는 다음 로그인 때 변경이 필요하도록 `mustChangePassword`를 켭니다. 현재 로그인한 계정은 화면과 Apps Script 연결층 모두에서 중지 또는 비밀번호 초기화 대상에서 제외합니다. 계정 생성, 중지/재개, 비밀번호 초기화, 권한 변경은 `이용기록`을 계정 변경 이력으로 변환해 화면에 표시합니다. 권한 상세 편집은 허용된 권한 키만 저장하고, 권한 변경 이력에는 변경 전후값을 남깁니다. Version.3 Next UI는 `viewAccounts`, `manageAccounts`, `managePermissions`, `viewPayments`, `viewStudents`, `viewLessonLogs`, `viewReservations`, `viewTeam`, `manageOperations` 같은 권한 키를 메뉴 노출과 페이지 접근 판정에 사용하기 시작했습니다. 별도 서버 전환 시 `accounts` 엔티티는 `status`, `mustChangePassword`, `linkedStudentId`, `lastLoginAt`, `permissions`를 운영 필드로 두고, `updateAccountStatus`, `resetAccountPassword`, `updateAccountPermissions` 액션은 감사 로그와 세션 무효화를 함께 처리해야 합니다. `auditLogs`는 `targetType=account`, `targetId`, `actorId`, `action`, `createdAt`, 변경 전후 metadata를 남겨야 합니다.

## 상담요청 상태 기준

| 상태 | 의미 |
| --- | --- |
| 접수됨 | 수강생 또는 운영자가 새 요청을 남겼고 매니저 확인 전입니다. |
| 확인 중 | 매니저가 확인했고 내부 처리 중입니다. |
| 전달 필요 | 담당 강사나 대표에게 전달해야 합니다. |
| 종결 | 추가 조치 없이 닫을 수 있는 요청입니다. |

상담요청은 Q&A 게시판이 아니라 상태가 있는 일방향 메시지입니다. 대표와 매니저는 요청별 담당자를 대표, 매니저, 강사 계정 중에서 배정할 수 있고, Apps Script 임시 연결층도 수강생 계정 배정을 거부합니다. 상태와 담당자 변경은 이용기록을 상담요청 이력으로 변환해 최근 변경 이력에 표시합니다. 별도 서버 전환 시 `consultationRequests` 엔티티는 `studentId`, `status`, `assignedTo`, `statusUpdatedAt`을 필수 운영 필드로 두고, `auditLogs`는 `consultationId`, `actorId`, `action`, `status`, `assignedTo`, `createdAt`을 추적해야 합니다.

Version.3 별도 서버도 같은 기준을 강제합니다. 수강생 계정은 `createConsultation`으로 본인 상담요청을 만들 수 있지만 `updateConsultationStatus`는 실행할 수 없습니다. 상태 변경과 담당자 배정은 `manageOperations` 권한이 있는 대표/매니저만 수행하며, 담당자는 대표·매니저·강사 계정 또는 강사 기록만 허용하고 수강생 계정은 거부합니다. 서버 검증은 수강생의 직접 상태 변경 실패, 대표의 강사 배정 성공, 수강생 담당자 배정 실패, 감사 로그 생성을 함께 확인합니다.

## 다음 구현 우선순위

1. Version.3 계정 관리와 학생 계정 연결 안정화
2. 별도 서버용 데이터 모델, 감사 로그, 세션 정책 구체화
3. 상담요청 알림과 대시보드 할 일 연결
4. 데이터 점검과 저장 실패 안내 강화
## 2026-07-01 Version.3 서버 모드 실행 및 Pages 주입 절차 추가

로컬 개발에서 별도 서버와 공식 Next UI를 한 번에 띄울 수 있도록 `pnpm run dev:version3` 명령을 추가했습니다. 이 명령은 `server/version3-local-server.mjs`를 `http://127.0.0.1:4303`에서 실행하고, Next UI에는 `NEXT_PUBLIC_VERSION3_API_BASE_URL=http://127.0.0.1:4303`을 주입해 `/login/`부터 서버 로그인 경로를 사용할 수 있게 합니다. 기본 검증 계정은 `owner`, `manager`, `teacher`, `student`이며 기본 비밀번호는 `version3`입니다.

로컬 Version.3 서버는 기본적으로 `.version3-local-data.json`에 계정, 상담요청, 공지, 감사 로그 변경을 저장합니다. 이 파일은 저장소에 커밋하지 않는 운영 데이터이며, 임시 검증처럼 재시작 후 데이터가 남지 않아야 하는 경우에만 `VERSION3_LOCAL_DATA_FILE=memory`를 사용합니다. 서버 계약에는 `/audit-logs` 조회와 `data-quality.summary.auditLogs` 카운트도 포함되어, 계정 생성/중지/비밀번호 초기화/권한 변경, 상담요청 생성/상태 변경, 공지 작성이 감사 로그로 남는지 확인합니다.

반복 로그인 실패도 운영 감사 대상입니다. 같은 로그인 ID로 짧은 시간 안에 비밀번호를 5회 틀리면 서버는 잠시 로그인을 제한하고, `login_throttled` 감사 로그를 `targetType=security`로 남깁니다. 데이터 품질 화면에서는 이 기록을 `로그인 제한`과 `보안`으로 표시하므로 대표/매니저가 계정 점검 중 이상 로그인 시도를 확인할 수 있습니다.

운영 후보 서버로 띄울 때는 `VERSION3_SERVER_HOST`로 바인딩 주소를 지정할 수 있습니다. 로컬 개발은 기본값 `127.0.0.1`을 유지하고, Render/Fly.io 같은 외부 호스팅에서 필요한 경우에만 `0.0.0.0`을 사용합니다. 공개 호스트 또는 `NODE_ENV=production`에서는 기본 비밀번호 `version3`과 전체 허용 CORS(`VERSION3_ALLOWED_ORIGINS=*`)로 서버가 시작되지 않도록 막았습니다. 운영 서버는 반드시 긴 초기 비밀번호와 공식 Pages 출처만 허용하는 `VERSION3_ALLOWED_ORIGINS`를 지정해야 합니다. `/health`는 로그인 없이 서버 상태를 확인하는 헬스체크이며, 서버 검증도 이 엔드포인트를 먼저 확인합니다.

Version.3 서버 세션은 `VERSION3_SESSION_TTL_HOURS` 기준으로 만료됩니다. 비밀번호가 초기화된 계정은 로그인 응답의 `mustChangePassword=true`를 받아 `/profile-settings?forcePasswordChange=1`로 이동하고, AppShell은 비밀번호 변경 전 다른 운영 화면 접근을 다시 개인 설정 화면으로 돌려보냅니다. 개인 설정 화면의 `Version.3 계정 보안` 카드는 `/auth/change-password`를 호출해 계정별 저장 비밀번호를 바꾸고, 성공하면 현재 세션 사용자 캐시의 `mustChangePassword`를 해제합니다. 로그아웃은 `/auth/logout`으로 서버 세션을 무효화한 뒤 브라우저 세션을 정리합니다.

로컬 Version.3 서버는 계정 비밀번호를 평문으로 저장하지 않고 `scrypt` 해시로 저장합니다. 기존 `.version3-local-data.json`에 평문 비밀번호가 남아 있는 경우 서버 시작 시 자동으로 해시 값으로 마이그레이션하고 저장 파일을 갱신합니다. 실제 별도 서버 후보도 비밀번호 해시 저장, 로그인 검증, 초기화 후 강제 변경, 응답/내보내기 비밀번호 비노출 기준을 모두 만족해야 합니다.

계정 상태 변경, 비밀번호 초기화, 권한 변경은 대상 계정의 기존 서버 세션을 즉시 무효화합니다. 본인이 직접 비밀번호를 변경할 때는 현재 세션만 유지하고 같은 계정의 다른 세션은 종료합니다. 감사 로그 metadata에는 `invalidatedSessions` 값을 남겨 운영자가 어떤 계정 변경이 기존 접속을 끊었는지 확인할 수 있게 합니다.

대표처럼 계정 관리 권한이 있는 계정도 자기 자신의 계정 상태, 관리자 비밀번호 초기화, 권한 편집은 서버에서 거부합니다. 본인 비밀번호 변경은 `/auth/change-password`와 개인 설정 화면만 사용합니다. 이 기준은 실수로 대표 계정을 중지하거나 권한을 제거해 운영 접근이 끊기는 일을 막기 위한 최소 안전장치입니다.

계정 생성과 비밀번호 초기화는 서버가 최종 검증합니다. 로그인 ID와 이름은 필수이고, 로그인 ID는 대소문자와 관계없이 중복될 수 없으며, 초기/임시 비밀번호는 최소 8자 이상이어야 합니다. 수강생 계정은 실제 학생 기록에 연결되어야 하고, 존재하지 않는 학생 ID로는 계정을 만들 수 없습니다. UI 검증은 편의 기능일 뿐이며 실제 운영 서버도 같은 API 검증을 반드시 가져야 합니다.

새로 만든 계정은 `invited` 상태로 시작하지만 초기 비밀번호로 로그인할 수 있습니다. 첫 로그인에 성공하면 서버가 계정을 `active`로 전환하고, `mustChangePassword=true` 상태를 유지해 개인 설정 화면에서 비밀번호를 바꾸도록 안내합니다. 이 흐름은 수강생 계정을 만든 뒤 학생에게 로그인 ID와 임시 비밀번호를 전달하는 실제 운영 절차를 위한 기준입니다.

로그인 실패가 짧은 시간에 반복되면 서버가 같은 로그인 ID의 시도를 잠시 제한합니다. 로컬 Version.3 서버는 10분 안에 5회 실패한 로그인 ID를 5분 동안 차단하고 `retryAfterSeconds`를 함께 내려줍니다. 성공 로그인은 해당 로그인 ID의 실패 기록을 초기화합니다. 실제 운영 서버 후보도 무제한 로그인 시도를 허용하지 않아야 하며, 다중 서버 환경에서는 이 실패 카운트를 공유 저장소에 보관해야 합니다.

GitHub Pages 배포 워크플로에는 저장소 변수 `VERSION3_API_BASE_URL`을 `NEXT_PUBLIC_VERSION3_API_BASE_URL`로 주입하는 절차를 추가했습니다. 실제 운영 서버 URL이 이 변수에 설정되면 정적 빌드된 Version.3 UI가 해당 별도 서버를 바라보며, 배포 중 `pnpm verify:version3-server`가 같은 URL의 `/auth/login`, `/bootstrap`, `/accounts`, `/account-history`, `/actions/{action}`, `/data-quality` 계약을 검사합니다. 운영 배포 브랜치에서는 `pnpm verify:version3-release`도 먼저 실행해 서버 URL이 비어 있거나, `https`가 아니거나, localhost 개발 서버를 가리키거나, 전환용 Apps Script/legacy/Preview 플래그가 켜진 상태를 차단합니다. 별도 서버가 없는 상태의 로컬 계약 검증은 개발/PR 검증에서만 허용하고, 공개 운영 배포의 성공 조건으로 사용하지 않습니다.

## 2026-07-01 공개 배포 서버 URL 필수 검증

Version.3가 공개 경로를 대체하는 목표에 맞춰 운영 배포에는 실제 별도 서버 URL이 필수입니다. `tools/verify-version3-release.mjs`는 `VERSION3_API_BASE_URL`, `NEXT_PUBLIC_VERSION3_API_BASE_URL`, `VERSION3_SERVER_VERIFY_BASE_URL` 중 하나를 읽어 공개 배포에 적합한 URL인지 확인합니다. URL은 절대 주소여야 하고 `https`를 사용해야 하며, `localhost`, `127.0.0.1`, `::1` 같은 개발 서버를 가리키면 실패합니다.

이 검증은 `main` 또는 `codex/v1-intranet` 배포 브랜치에서 pull request가 아닌 실제 Pages 배포가 실행될 때 적용됩니다. 기본값에서는 `NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION`, `NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW`, `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN`이 켜져 있으면 실패합니다. 전환 훈련처럼 예외가 필요한 경우에만 `VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS=true`를 임시로 지정할 수 있습니다.

## 2026-07-01 운영 데이터 참조 무결성 강화

Version.3 서버 저장 액션은 잘못된 참조 ID로 빈 운영 기록을 만들지 않도록 더 엄격하게 검증합니다. 수강 등록은 유효한 학생과 강사가 모두 있어야 하며, 출결 변경은 유효한 수업과 해당 수업의 학생이 일치해야 합니다. 레슨노트는 같은 학생, 강사, 날짜에 대응되는 기존 수업이 있을 때만 저장되고 수업 내용이 비어 있으면 거부합니다. 예약은 종료 시간이 시작 시간보다 늦어야 하며, 입력된 학생 참조가 있으면 실제 학생 기록과 일치해야 합니다. 공지는 제목과 본문, 최소 1개의 유효한 대상 권한이 필요합니다.

데이터 품질 점검에는 `reference-integrity` 항목과 `summary.brokenReferences` 카운트를 추가했습니다. 이 값은 수강, 수업, 출결, 레슨노트, 예약, 수납이 존재하지 않는 학생·강사·수업·공간을 가리키는지 확인합니다. 실제 서버 후보도 같은 기준을 통과해야 운영 화면에서 데이터가 그럴듯하게 보이지만 내부적으로는 끊어진 상태가 되는 문제를 줄일 수 있습니다.

## 2026-07-01 운영 데이터 백업과 내보내기 기준

로컬 Version.3 서버는 `VERSION3_LOCAL_DATA_FILE`에 저장하기 전 기존 데이터 파일을 타임스탬프가 붙은 `.bak` 파일로 복사합니다. 이 백업은 개발·전환 검증 중 실수로 계정, 상담요청, 공지, 감사 로그가 덮어써졌을 때 되돌릴 수 있는 최소 안전장치입니다. 임시 검증처럼 백업이 필요 없는 환경에서는 `VERSION3_DISABLE_LOCAL_BACKUPS=true`를 지정할 수 있고, 완전한 일회성 서버는 `VERSION3_LOCAL_DATA_FILE=memory`를 사용합니다.

운영 권한 계정은 `/data-export`에서 현재 Version.3 데이터를 JSON으로 내려받을 수 있습니다. 내보내기 응답에는 `schema`, `exportedAt`, `exportedBy`, `persistence` 정보가 포함되고, 계정 비밀번호 필드는 제거됩니다. 서버는 내보내기 요청을 `export_data` 감사 로그로 남긴 뒤 그 기록까지 포함한 내보내기 파일을 생성합니다. 실제 별도 서버 후보도 같은 원칙으로 운영자가 백업 가능한 데이터 경로를 제공해야 합니다.

대표 계정은 `/data-import`로 이전에 내려받은 Version.3 JSON을 다시 가져올 수 있습니다. 가져오기는 운영 데이터를 교체하는 작업이므로 매니저가 아니라 대표만 실행할 수 있고, 서버는 `import_data` 감사 로그를 남깁니다. 백업 파일에는 비밀번호가 들어 있지 않으므로, 같은 서버에서 복구할 때는 기존 계정 비밀번호를 보존하고, 새 서버로 옮길 때 기존 비밀번호가 없는 계정에는 화면에서 입력한 임시 비밀번호를 해시로 저장한 뒤 다음 로그인 때 변경을 요구합니다. 데이터 품질 화면은 `백업 가져오기`와 `가져오기 임시 비밀번호` 입력을 제공해 운영자가 내보내기/가져오기 왕복을 직접 처리할 수 있게 했습니다.

서버가 자동으로 만드는 `.bak` 파일은 대표 계정만 `/data-backups`에서 목록을 확인할 수 있습니다. 응답에는 백업 활성 여부, 데이터 파일 이름, 백업 파일명, 크기, 생성시각만 포함하고 서버의 전체 파일 경로는 노출하지 않습니다. 이 목록은 “서버가 정말 백업을 만들고 있는지”를 확인하는 운영 점검용이며, 실제 복구는 `/data-export`로 내려받은 JSON 또는 서버 디스크의 백업 파일을 확인한 뒤 `/data-import`로 진행합니다.

## 2026-07-01 Version.3 별도 서버 검증 하네스 추가

Apps Script가 아닌 별도 서버 기반 운영으로 전환하기 위해 로컬 Version.3 서버 스캐폴드와 서버 계약 검증 명령을 추가했습니다. `server/version3-local-server.mjs`는 `/auth/login`, `/bootstrap`, `/accounts`, `/account-history`, `/actions/{action}`, `/data-quality`를 제공하며, 대표/매니저/강사/수강생 계정과 권한, 수강생 계정 1:1 연결, 일방향 상담요청, 대표/매니저 공지 작성 권한을 같은 서버 응답 계약으로 확인할 수 있게 합니다.

검증 명령은 `pnpm run verify:version3-server`입니다. 별도 환경변수가 없으면 로컬 서버를 임시로 띄워 계약을 검사하고, 실제 서버 후보가 준비되면 `VERSION3_SERVER_VERIFY_BASE_URL` 또는 `NEXT_PUBLIC_VERSION3_API_BASE_URL`을 지정해 같은 검증을 외부 서버에 적용할 수 있습니다. 이 기준을 통과해야 공식 로그인 화면의 `/auth/login` 우선 경로와 대시보드/계정/데이터 품질/저장 액션의 서버 우선 경로가 실제 운영 서버에서도 안전하게 동작한다고 볼 수 있습니다.

## 2026-07-01 Version.3 서버 로그인 우선 경로 추가

공식 로그인 화면이 이제 별도 서버 설정을 먼저 확인합니다. `NEXT_PUBLIC_VERSION3_API_BASE_URL`이 설정된 환경에서는 로그인 폼 제출 시 Apps Script가 아니라 Version.3 서버의 `/auth/login`을 먼저 호출하고, 성공 응답의 `token`과 `user`를 `bonsung_server_session_token`, `bonsung_server_current_user`에 저장합니다. 이 서버 세션이 있으면 현재 사용자 판별, 대시보드/계정/데이터 품질 데이터 로딩, 저장 액션은 서버 경로를 우선 사용합니다.

서버가 설정된 운영 환경에서 로그인 실패가 발생하면 Apps Script로 조용히 우회하지 않고 서버 로그인 오류를 사용자에게 보여주는 방향으로 두었습니다. 이는 전환기 데이터가 Apps Script와 별도 서버 사이에서 섞이는 일을 줄이기 위한 운영 기준입니다. `NEXT_PUBLIC_VERSION3_API_BASE_URL`이 없는 개발/전환 환경에서는 기존 Apps Script 로그인과 Preview 역할 로그인 흐름이 유지됩니다.

## 2026-07-01 로그인 화면 레이아웃 관리 기준

로그인 화면은 화면 크기와 관계없이 상단, 중단, 하단의 세로 구조를 유지합니다. 상단은 로고와 `BONSUNG MUSIC ACADEMY`, `본성 스테이지`, `교육행정운영 통합 관리 시스템`, `BONSUNG MUSIC A NEW BEGINNING`이 들어가는 브랜드 영역입니다. 중단은 실제 인증 입력 영역으로, 흰색 틀 안에 `ID`, `PW`, `LOGIN`과 `※계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.` 문구만 둡니다. 하단은 저작권/소유 문구 영역으로 `@Bonsungmusicacademy Alrights Reserved`를 표시합니다.

추후 로그인 화면을 수정할 때는 이 세 구역의 역할을 섞지 않습니다. 안내, 공지, 계정 요청 같은 운영 정보가 추가되더라도 상단 브랜드 영역, 중단 로그인 영역, 하단 소유 문구 영역 중 어디에 들어갈 정보인지 먼저 정한 뒤 편집합니다. 데스크톱에서도 좌우 2단 배치로 되돌리지 않고, 모바일과 데스크톱 모두 같은 상단-중단-하단 흐름을 기준으로 검증합니다.

## 2026-07-01 별도 서버 우선 연결 경로 추가

Version.3 Next UI에 Apps Script보다 먼저 확인하는 별도 서버 연결층을 추가했습니다. 브라우저 환경변수 `NEXT_PUBLIC_VERSION3_API_BASE_URL`이 있고, 클라이언트 저장소에 `bonsung_server_session_token`이 있으면 `lib/version3-server-client.ts`가 `Authorization: Bearer ...` 방식으로 Version.3 서버를 호출합니다. 같은 로그아웃/세션 초기화 흐름에서 `bonsung_server_session_token`, `bonsung_server_current_user`, Apps Script 세션, Preview 역할/계정 초안 저장소를 함께 정리합니다.

현재 클라이언트가 우선 호출하는 서버 API는 `/bootstrap`, `/accounts`, `/account-history`, `/audit-logs`, `/actions/{action}`, `/data-quality`입니다. 서버 세션이 유효하면 대시보드, 계정 관리, 데이터 품질 점검, 감사 로그, 주요 저장 액션은 `source=server`로 표시되고, 서버 세션이 없으면 기존 Apps Script 실사용 연결, Preview/Fallback 순서로 내려갑니다. 실제 운영 서버가 붙기 전까지는 이 경로가 계약 기준이며, 서버는 `lib/version3-server-contract.ts`의 계정, 권한, 대시보드 우선 처리 목록, 감사 로그 계약을 맞춰 내려주면 됩니다.
## 2026-07-01 학생 등록 별도 서버 계약

학생 관리 화면의 빠른 등록은 `createStudent` 저장 액션을 통해 Version.3 별도 서버에도 학생 기록을 만들 수 있습니다. 서버는 `manageStudents` 권한이 있는 대표/매니저 계정만 학생을 생성할 수 있게 하고, 생성된 학생에는 `id`와 Apps Script 호환용 `student_id`를 같은 값으로 내려줍니다. 이 값은 학생 등록 후 `수강생 계정 만들기` 선택지가 켜져 있을 때 `/accounts?student={studentId}#create-account`로 이어져 수강생 계정 생성의 연결 학생 프리셋으로 사용됩니다.

로컬 Version.3 서버는 학생 생성 시 `create_student` 감사 로그를 남기며, 서버 검증은 대표의 학생 생성 성공, 강사의 학생 생성 거부, 생성된 학생 ID를 사용한 수강생 계정 생성까지 확인합니다. 실제 운영 서버도 같은 계약을 맞춰야 학생 데이터와 수강생 계정 데이터가 Apps Script가 아닌 서버 기준으로 이어집니다.

## 2026-07-01 운영 입력 저장 액션 서버 확장

Version.3 서버의 `/actions/{action}` 저장 계약을 학생/상담/공지 중심에서 수강, 수업, 출결, 레슨노트, 공간 예약, 수납, 내부 업무까지 확장했습니다. 현재 서버 검증은 `createEnrollment`, `createLesson`, `updateAttendance`, `createLessonLog`, `createReservation`, `createRegistration`, `createTask`, `createNotice`가 실제 DB 배열에 기록되고 `/bootstrap`으로 다시 조회되는지 확인합니다. 강사 계정은 담당 수업 출결과 레슨노트만 기록할 수 있고, 예약은 같은 방의 겹치는 시간대를 거부합니다.

서버가 모르는 액션은 더 이상 성공처럼 응답하지 않고 `Unsupported Version.3 action` 오류를 반환합니다. 이는 새 UI의 저장 버튼이 잘못된 액션명이나 미구현 서버 계약으로 데이터를 보냈을 때 조용히 유실되는 문제를 막기 위한 기준입니다. ResourcePage의 저장 안내 문구도 Version.3 서버 우선 흐름으로 바꿔, 실사용자는 공개 경로의 새 화면에서 별도 서버에 기록된다는 점을 기준으로 이해하게 했습니다.

## 2026-07-01 운영 기본값 서버 전용 전환

Version.3 공개 경로의 기본 운영 모드는 별도 서버 전용입니다. `NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION`, `NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW`, `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN`이 `true`일 때만 Apps Script 전환 로그인, legacy 비교 화면, Preview 계정 진입이 노출됩니다. 기본 빌드에서는 홈, 로그인, AppShell 내부 메뉴에 legacy 링크가 보이지 않고, `tools/preserve-legacy-preview.mjs`도 `out/legacy-preview` 산출물을 만들지 않습니다.

강사 기록도 서버 운영 입력 범위에 포함했습니다. `createTeacher` 액션은 대표/매니저처럼 운영 관리 권한이 있는 계정만 호출할 수 있고, 생성된 강사 기록은 `/bootstrap.teachers`로 다시 조회됩니다. 클라이언트는 서버가 내려준 `teachers` 배열을 직접 읽으며, 강사 화면의 빠른 등록은 Version.3 서버 저장을 호출합니다. 서버 검증은 강사 생성, `/bootstrap` 재조회, `create_teacher` 감사 로그를 확인합니다.

## 2026-07-01 서버 실패 시 Preview 데이터 차단

운영 기본 모드에서는 Version.3 서버 호출이 실패해도 demo/preview 데이터를 대신 표시하지 않습니다. `useOperationsData`는 `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN=true`일 때만 preview 데이터를 fallback으로 사용하고, 기본값에서는 `emptyOperationsData`를 사용해 목록을 비운 뒤 `연결 실패` 상태를 표시합니다. 이 기준은 서버 장애나 권한 오류가 실제 학생, 계정, 수업 데이터처럼 보이는 문제를 막기 위한 운영 안전장치입니다.

서버 호출이 성공했지만 특정 배열이 비어 있는 경우에도 demo 데이터를 자동 보충하지 않습니다. 예를 들어 운영 서버가 `students`, `courses`, `reservations`, `notices`를 빈 배열로 내려주면 Version.3 화면도 빈 목록을 보여줍니다. Preview 보강 데이터는 `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN=true`인 점검 모드에서만 사용합니다.

계정 관리도 같은 기준을 따릅니다. Preview 로그인이 꺼져 있으면 초기 계정 목록과 계정 변경 이력은 비어 있고, 서버 계정 API가 실패하면 기존 preview 계정이나 초안을 남기지 않습니다. 계정 생성, 중지/재개, 비밀번호 초기화, 권한 변경은 Version.3 서버 세션 없이 preview 초안으로 저장되지 않고 명시 오류를 반환합니다. 오래된 브라우저 저장소에 `bonsung_role` Preview 값이 남아 있어도 `ENABLE_PREVIEW_LOGIN`이 꺼진 기본 운영 모드에서는 AppShell과 `useCurrentUser`가 이를 사용자 세션으로 인정하지 않습니다.

## 2026-07-01 상담요청 직접 링크 강조

대시보드의 상담요청 알림과 우선 처리 목록은 `/consultations?request={consultationId}`로 이동합니다. 상담요청 화면은 이 `request` 값을 클라이언트에서 읽어 해당 요청을 `요청 바로 확인` 카드로 표시하고, 현재 필터가 해당 요청을 숨기고 있으면 `전체` 필터로 보정합니다. 요청 카드는 `consultation-request-focus` 위치로 스크롤되며, 같은 요청은 목록에서도 가장 위로 올라옵니다.

요청 ID가 현재 계정 권한 범위에 없거나 서버 동기화가 늦어 목록에서 찾을 수 없으면 요청 ID와 함께 찾을 수 없다는 안내를 표시합니다. 이 기준은 `tools/verify-operating-surfaces.mjs`에서 `useRequestedConsultationId`, `RequestedConsultationPanel`, `consultation-request-focus` 신호로 확인합니다.

## 2026-07-01 상담요청 미확인/확인 처리 계약

상담요청 데이터에 `unreadForAccountIds` 필드를 추가해 어떤 계정이 아직 확인하지 않았는지 서버가 직접 내려줄 수 있게 했습니다. 수강생이 `createConsultation`으로 새 요청을 만들면 대표/매니저 계정이 미확인 대상으로 잡히고, 대표/매니저가 `updateConsultationStatus`로 담당자를 배정하면 처리한 계정은 미확인 대상에서 빠지며 새 담당 계정은 미확인 대상으로 들어갑니다.

대시보드 `상담요청 알림`은 현재 계정 ID가 `unreadForAccountIds`에 포함된 요청을 `미확인`으로 표시하고 `확인 처리` 버튼을 보여줍니다. 서버 세션에서는 이 버튼이 `/actions/acknowledgeConsultation`을 호출해 현재 계정을 미확인 대상에서 제거하고 `acknowledge_consultation` 감사 로그를 남깁니다. Preview에서는 화면 상태만 먼저 반영해 운영 흐름을 점검합니다.

## 2026-07-01 대시보드 상담요청 알림 연결

대시보드 통계 카드 아래에 `상담요청 알림` 영역을 추가했습니다. 이 영역은 종결되지 않은 상담요청 중 최대 3건을 역할별로 표시하고, 새 접수는 `새 요청`, 전달이 필요한 건은 `전달 필요`, 강사 화면에서는 `강사 확인`, 수강생 화면에서는 `내 요청`으로 구분합니다. 각 알림은 `/consultations?request={consultationId}`로 연결되어 우선 처리 목록을 보기 전에도 운영자가 바로 상담요청 화면으로 이동할 수 있습니다.

별도 서버 전환 시 서버가 `/bootstrap`의 `consultations` 또는 `dashboardWorkQueue`에 최신 상담요청 상태를 내려주면 같은 알림 표면이 즉시 반영됩니다. 이 기준은 `tools/verify-operating-surfaces.mjs`에서 `buildConsultationAlerts`와 `상담요청 알림` 신호로 확인합니다.
