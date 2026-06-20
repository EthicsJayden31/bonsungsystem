# 본성_인트라넷 화면 구분 기준

본성뮤직 인트라넷은 당분간 두 화면을 명확히 분리해 운영한다.

## 1. 공식 Next UI

- 경로: `/`, `/login`, `/dashboard`, `/students` 등 Next.js App Router 화면
- 목적: 본성뮤직 브랜드 UI와 향후 공식 운영 화면의 기준
- 데이터 원칙:
  - Apps Script 세션 토큰(`bonsung_session_token`)이 있으면 Apps Script `bootstrap` 데이터를 먼저 읽는다.
  - 세션이 없거나 연결에 실패하면 기능 점검용 preview 데이터를 표시한다.
  - 화면에는 현재 데이터 소스를 `실사용 Apps Script 데이터`, `기능 점검 Preview 데이터`, `Preview fallback 데이터`로 표시한다.
- 저장 원칙:
  - v1 통합 전까지 Next 화면의 빠른 등록 버튼은 기능 점검용이다.
  - 실제 저장은 `/legacy-preview/` 실사용 화면에서 먼저 처리한다.

## 2. 실사용 Apps Script 화면

- 경로: `/legacy-preview/`
- 목적: Google Sheets와 Apps Script에 연결된 실제 운영 화면
- API 계약:
  - endpoint: `pages-preview/config.js`의 `window.BONSUNG_CONFIG.apiEndpoint`
  - method: `POST`
  - header: `Content-Type: text/plain;charset=utf-8`
  - body: `{ action, token, ...payload }`
  - response: 성공 `{ ok: true, data }`, 실패 `{ ok: false, error }`
- 로그인:
  - `login` action은 토큰 없이 호출한다.
  - 로그인 성공 후 `{ token, user }`를 저장하고, 이후 `bootstrap`으로 운영 데이터를 읽는다.

## 3. 기능 점검 Preview

- Next UI의 역할 선택 로그인은 preview 확인용이다.
- `pages-preview`의 `?demo=1` 또는 `BONSUNG_TEST_MODE`는 로컬/테스트 데이터 확인용이다.
- preview 데이터는 권한 흐름과 화면 배치를 점검하기 위한 것이며, 운영 원본으로 보지 않는다.

## 4. 권한 주의사항

- teacher 권한은 수납/결제 데이터를 보지 않는다.
- teacher 학생 목록은 담당 학생 또는 활성 수강등록으로 연결된 학생만 보여준다.
- teacher에게 보호자 연락처, 결제 정보, 타 강사 학생, 전체 계정 정보가 노출되지 않도록 유지한다.
- 학생/보호자/수납/내부 메모는 Google Sheets 원본과 화면 노출 기준을 분리해 검토한다.

## 5. 향후 이관 순서

1. Next 대시보드와 학생 목록을 Apps Script `bootstrap` 데이터로 읽기.
2. 상담, 수업, 출결, 레슨노트, 연습실, 수납 화면을 같은 데이터 계약으로 연결.
3. 저장 기능은 `createStudent`, `createEnrollment`, `createLesson`, `createLessonLog`, `createReservation`, `createRegistration` 순서로 연결.
4. `getDataQualityReport`를 추가해 중복, 누락, 상태 불일치, 참조 깨짐, 예약 충돌을 점검한다.
5. 모든 저장 기능이 Next UI로 이관되기 전까지 `/legacy-preview/`는 유지한다.
