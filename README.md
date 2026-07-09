# 본성 스테이지(통합 관리 시스템) 구축 현황

본성 스테이지는 본성뮤직아카데미 운영을 위한 Version.3 통합 관리 시스템입니다. 현재 방향은 테스트용 더미 페이지가 아니라, 공식 Next.js 화면이 Version.3 API에 로그인하고 운영 데이터를 서버 저장소에 저장하는 실제 인트라넷 시스템입니다.

## 코드 구조

| 경로 | 내용 |
| --- | --- |
| `app/` | 로그인, 홈, 대시보드, Artist, Coach, 상담, 수업, 출결, 레슨노트, 예약, 수납, 계정, 데이터 점검 화면 |
| `components/` | 공통 레이아웃, 사이드바, 모바일 메뉴, 표, 카드, 상세 패널, 예약 보드 |
| `lib/` | 역할/권한, 세션, 서버 클라이언트, 데이터 변환, 화면별 데이터 접근 로직 |
| `server/` | Version.3 API 서버, 계정/권한 처리, 저장소 어댑터, 감사 로그, 백업, Apps Script 동기화 |
| `api/version3/` | Vercel에서 Version.3 서버를 API Function으로 실행하는 진입점 |
| `apps-script/` | Google Apps Script 기반 운영 저장소/동기화 코드 |
| `tools/` | 로컬 서버 실행, Google Sheets 설정, 운영 검증, 배포 검증 도구 |
| `docs/` | 배포, 저장소, 운영 표면, 보안 점검 문서 |

## 구현된 주요 기능

- 로그인/권한: `Admin`, `Manager`, `Coach`, `Artist` 4개 계정 체계
- 계정 관리: 계정 생성, 계정 요청 승인/반려, 비밀번호 초기화, 권한 확인, 감사 로그
- Artist/보호자: Artist 기록, 보호자 연결, 담당 Coach 연결, 계정 연결 상태 확인
- 상담: 상담요청 접수, 상태 변경, 담당자 배정, 후속 이력
- 수강/수업: 수강 등록, 프로그램, Coach, 수업 일정, 수업 상태
- 출결/레슨노트: 출석·지각·결석·보강 필요, 수업별 레슨노트
- 공간 예약: 공간 예약 데이터 구조와 충돌 방지 로직
- 수납/등록: 등록·재등록, 납부 상태, 확인 필요 항목
- 내부 운영: 업무, 근태, 회의, 일정, 공지, 운영 환경 설정
- 데이터 관리: 가져오기/내보내기, 백업 목록, Google Sheets 저장소, 감사 로그

## 계정 역할

- `Admin`: 시스템 관리 계정입니다. 전체 데이터, 계정, 권한, 환경 설정, 로그 확인을 담당합니다.
- `Manager`: 대표·직원·매니저 운영 계정입니다. Artist, Coach, 상담, 수강, 수납, 계정 요청과 비밀번호 초기화를 처리합니다.
- `Coach`: 강사 계정입니다. 담당 Artist, 수업, 출결, 레슨노트, 예약 중심으로 사용합니다.
- `Artist`: 수강생 계정입니다. 본인 수업, 레슨노트, 예약, 공지, 상담요청 중심으로 사용합니다.

기존 `owner`, `teacher`, `student` 값은 저장 데이터 마이그레이션 과정에서 각각 `admin`, `coach`, `artist`로 정규화됩니다.

## 테스트 안내

로컬에서 공식 UI와 Version.3 서버를 함께 실행합니다.

```bash
pnpm run dev:version3
```

기본 접속 주소는 다음과 같습니다.

```text
UI: http://127.0.0.1:3000/login/
Server: http://127.0.0.1:4303
```

로컬 기본 계정 ID는 다음과 같습니다.

```text
admin
manager
coach
artist
```

검증 명령은 다음을 사용합니다.

```bash
pnpm run typecheck
pnpm run lint
pnpm run verify:version3-server
pnpm run verify:version3-vercel-api
pnpm run verify:version3-cleanup
pnpm run build
pnpm run build:pages
```

공개 배포 전에는 HTTPS Version.3 API 주소를 지정해 release 검증을 실행합니다.

```bash
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm run verify:version3-release
```

## 데이터 관리 방식 안내

운영 화면은 더 이상 `pages-preview`, `/version3-test`, localStorage 더미 데이터, 별도 오프라인 점검 HTML을 사용하지 않습니다. 실제 화면과 테스트 화면을 따로 만들지 않고, 같은 Next.js 화면이 어떤 저장소를 바라보는지만 달라집니다.

운영 저장소는 다음 방식 중 하나를 사용합니다.

- Vercel API + Google Sheets 저장소: `VERSION3_STORAGE_DRIVER=google-sheets`
- Vercel API + PostgreSQL + Apps Script 동기화: PostgreSQL에 먼저 저장하고 Apps Script로 미러링
- 외부 Version.3 서버 + 지속 파일 저장소: 서버 호스트의 영구 디스크에 JSON 저장

운영 비밀값은 README나 공개 문서에 기록하지 않습니다. 특히 Admin 초기 비밀번호, Google 서비스 계정 JSON, 세션 secret, Apps Script URL/비밀번호, 데이터베이스 URL은 Vercel 또는 서버 환경 변수로 관리합니다.

주요 환경 변수는 다음과 같습니다.

```text
NEXT_PUBLIC_VERSION3_API_BASE_URL=/api/version3
VERSION3_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_STORAGE_DRIVER=google-sheets
VERSION3_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
VERSION3_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
VERSION3_SESSION_SECRET=<long-random-secret>
```

## 배포 기준

GitHub Pages 정적 배포는 공식 UI를 배포하고, 실제 데이터 처리는 `NEXT_PUBLIC_VERSION3_API_BASE_URL`이 가리키는 Version.3 API가 담당합니다. Vercel 배포에서는 `/api/version3` API Function을 사용해 UI와 서버 계약을 같은 프로젝트 안에서 운영할 수 있습니다.

운영 배포에서는 다음이 없어야 합니다.

- `/version3-test`
- `pages-preview`
- `public/version3-offline-inspection.html`
- localStorage 기반 더미 운영 데이터
- `owner`, `teacher`, `student`를 실제 역할명으로 쓰는 계정 데이터
