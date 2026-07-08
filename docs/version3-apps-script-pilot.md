# Version.3 Apps Script 파일럿 운영 가이드

## 1. 결정

이번 파일럿은 Vercel API Route가 Google Sheets API를 직접 호출하는 방식을 멈추고, Vercel은 화면만 배포합니다. 데이터는 브라우저에서 Google Apps Script Web App을 호출하고, Apps Script가 Google Sheets 탭 DB를 읽고 씁니다.

```mermaid
flowchart LR
  U["운영자 브라우저"] --> V["Vercel Version.3 UI"]
  V --> A["Google Apps Script Web App"]
  A --> S["Google Sheets: 본성뮤직 인트라넷 운영 DB v2"]
```

## 2. 파일 위치

- Apps Script 본문: `apps-script/version3-apps-script.gs`
- 시트 준비 도구: `tools/prepare-version3-apps-script-sheets.mjs`
- 실행 명령: `pnpm run prepare:version3-apps-script-sheets`
- 보류 문서: `docs/version3-vercel-google-sheets.md`

## 3. Vercel 환경변수

```env
NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION=true
NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT=<Google Apps Script Web App URL>
```

브라우저 번들에는 `APPS_SCRIPT_SHARED_SECRET`, Google 서비스 계정 JSON, private key를 넣지 않습니다. 파일럿에서는 로그인 세션 토큰만 사용합니다.

`NEXT_PUBLIC_VERSION3_API_BASE_URL`은 비워둡니다. 이 값이 있으면 화면이 Version.3 서버나 Vercel API Route를 먼저 보려고 합니다.

## 4. Apps Script 배포

1. `본성뮤직 인트라넷 운영 DB v2` Google Sheets를 엽니다.
2. `확장 프로그램 > Apps Script`를 엽니다.
3. `apps-script/version3-apps-script.gs` 내용을 Apps Script 프로젝트에 붙여 넣습니다.
4. 독립 Apps Script 프로젝트라면 스크립트 속성에 `VERSION3_SPREADSHEET_ID=<spreadsheet-id>`를 넣습니다.
5. 선택 사항으로 `SETUP_KEY`와 `SESSION_HASH_SECRET`을 스크립트 속성에 넣습니다.
6. `배포 > 새 배포 > 웹 앱`으로 배포합니다.
7. 실행 권한은 본인, 접근 권한은 파일럿 범위에 맞춰 제한합니다.
8. 생성된 Web App URL을 Vercel의 `NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT`에 넣습니다.

## 5. 탭 구조

필수 탭은 다음과 같습니다.

`settings`, `accounts`, `account_requests`, `account_history`, `teachers`, `students`, `guardians`, `courses`, `enrollments`, `lessons`, `attendance`, `lesson_notes`, `rooms`, `reservations`, `payments`, `consultations`, `consultation_history`, `tasks`, `work_logs`, `meetings`, `calendar_events`, `notices`, `audit_logs`, `public_settings`

세션 토큰 저장을 위해 `sessions` 탭을 추가로 사용합니다. 모든 주요 운영 탭은 가능한 범위에서 `id`, `created_at`, `updated_at`, `deleted_at` 필드를 가집니다.

## 6. 초기 계정 정책

로그인 가능한 계정은 `admin` 하나만 생성합니다.

- 로그인 ID: `admin`
- 초기 비밀번호: `bonsung1`
- 역할: `owner`
- 저장 방식: 평문 비밀번호 저장 금지, `password_hash`, `password_salt`, `password_algorithm`, `must_change_password` 사용
- 첫 로그인 후 비밀번호 변경 권장

강사, 학생, 보호자 샘플은 업무 데이터로만 들어가며 로그인 계정으로 만들지 않습니다.

## 7. 시트 준비 도구

```powershell
pnpm run prepare:version3-apps-script-sheets -- --out version3-apps-script-sheets-export
```

도구는 각 탭의 CSV와 전체 JSON 시드를 만듭니다. 기본 시드는 admin 단일 계정만 포함합니다. 실제 학생 전화번호, 보호자 연락처, 납부 내역은 운영자가 직접 확인한 값만 입력합니다.

## 8. 지원 액션

Apps Script는 다음 액션을 제공합니다.

`health`, `login`, `logout`, `changePassword`, `bootstrap`, `getAccounts`, `createAccount`, `updateAccountStatus`, `resetAccountPassword`, `updateAccountPermissions`, `createAccountRequest`, `reviewAccountRequest`, `getAccountHistory`, `getAuditLogs`, `getDataQualityReport`, `dataExport`, `dataImport`, `createStudent`, `createConsultation`, `updateConsultationStatus`, `acknowledgeConsultation`, `createLesson`, `updateAttendance`, `createLessonLog`, `createReservation`, `createRegistration`, `createTask`, `clockWork`, `createMeeting`, `createCalendarEvent`, `createNotice`, `updatePublicSettings`

기존 화면 호환을 위해 `listAccounts`, `listAccountHistory`, `listAccountRequests`도 받습니다.

## 9. 권한과 보안

- 역할은 `owner`, `manager`, `teacher`, `student`를 사용합니다.
- 별칭은 `Admin/admin -> owner`, `Coach/coach -> teacher`, `Artist/artist -> student`로 정규화합니다.
- 쓰기 액션은 감사 로그를 남깁니다.
- 세션 토큰은 `sessions` 탭에 해시로 저장하고 만료 시간을 둡니다.
- 강사는 수납 데이터와 보호자 민감 연락처를 보지 못합니다.
- 수강생은 본인 연결 데이터만 볼 수 있습니다.
- `createAccount`, `createReservation`, `createLesson`, `updateAttendance`, `createLessonLog`, `createRegistration`, `dataImport`는 `LockService`를 사용합니다.

## 10. 중복과 참조 검사

- 중복 로그인 ID를 거부합니다.
- 수강생 계정은 학생 1명당 활성 계정 1개만 허용합니다.
- 같은 방의 겹치는 예약 시간을 거부합니다.
- 잘못된 학생, 강사, 방, 수업 참조를 거부합니다.
- 레슨노트는 반드시 기존 수업에 연결되어야 합니다.

## 11. 전체 흐름 점검

파일럿 수동 점검 순서는 다음입니다.

1. `health` 호출이 `ok: true`와 누락 탭 없음으로 응답하는지 확인합니다.
2. `admin / bonsung1`으로 로그인합니다.
3. 상담요청을 만듭니다.
4. 학생을 생성합니다.
5. 필요 시 학생 데이터만 만들고, 로그인 계정은 추가 생성하지 않습니다.
6. 수납 항목을 생성합니다.
7. 수업을 생성합니다.
8. 출결을 처리합니다.
9. 레슨노트를 작성합니다.
10. 연습실이나 강의실 예약을 만듭니다.
11. `audit_logs`에 쓰기 기록이 남는지 확인합니다.
12. 강사와 수강생 권한은 추후 계정 추가 테스트 때 별도로 검증합니다.

## 12. 검증 명령

```powershell
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run build:pages
pnpm run verify:version3-test-mode
pnpm run verify:version3-server
pnpm run verify:version3-opening-workflow
pnpm run verify:version3-feature-suite
```

Apps Script Web App 배포와 Google Sheets 실제 쓰기는 브라우저/Apps Script 콘솔에서 최종 확인합니다.

## 13. 한계와 다음 전환 계약

Apps Script 파일럿은 빠른 시연과 운영 데이터 구조 확인을 위한 단계입니다. 장기 운영에서는 별도 서버나 관리형 DB로 전환하고, 현재 액션 이름과 응답 구조를 API 계약으로 유지합니다.
