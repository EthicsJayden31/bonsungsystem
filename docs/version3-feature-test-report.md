# 본성 스테이지 Version.3 기능 검증 보고서

## 1. 테스트 일시

- 2026-07-08 19:31:01 +09:00

## 2. 테스트 대상 브랜치/커밋

- 브랜치: `codex/v1-intranet`
- 기준 커밋: `b4ffff558c1da5184b28ca6bacc98dc32a02c1b1`
- 상태: 기존 Version.3/보안/DB 전환 관련 미커밋 변경 위에서 추가 검증 및 최소 수정 진행

## 3. 테스트 환경

- OS/Shell: Windows, PowerShell
- Node.js: bundled runtime v24.14.0
- Package manager: pnpm 11.0.7
- Framework: Next.js 15.5.18, React 19.2.7
- UI 검증: Playwright Chromium, 1440x900 desktop 및 390x844 mobile
- Base44: `base44/config.jsonc` 없음, `base44` CLI 미설치로 적용 대상 아님
- Browser plugin: `node_repl js` 도구가 없어 사용 불가, Playwright로 대체 검증

## 4. 저장소 모드별 결과

- memory: 통과
- file: 통과, 임시 파일 모드에서 기능 스위트 실행 및 정리 확인
- postgres: `VERSION3_DATABASE_URL` 미제공으로 건너뜀

## 5. 역할별 결과

- owner: 로그인, 전체 메뉴, 계정/권한/수납/데이터 점검, 운영 액션 통과
- manager: 로그인, 운영/학생/상담/수납, 제한된 계정 관리 흐름 통과
- teacher: 담당 학생/수업/출결/레슨노트/예약 범위 통과, 계정/수납/데이터 점검 메뉴 비노출 확인
- student: 본인 수업/레슨노트/상담요청/연습실 예약 범위 통과, 계정/수납/데이터 점검 메뉴 비노출 확인

## 6. 기능별 결과

- auth/session: 정상 로그인, 오답 로그인 실패, 로그아웃, 비밀번호 변경, mustChangePassword 흐름, 세션 토큰 보호 통과
- accounts/permissions: 계정 생성, 중복 loginId 차단, 중복 학생 연결 차단, pause/reactivate, self mutation 차단, 비밀번호 초기화, 권한 편집, 요청 승인/거절, 이력 기록 통과
- students: 생성, 계정 연결 handoff, teacher/student 범위 필터링, teacher 개인정보 마스킹 통과
- consultations: 학생 요청, owner/manager 조회, 상태 변경, 담당자 배정, 이력, unread acknowledge, 담당 teacher 범위 통과
- lessons: 수업 생성, 출결 pending 자동 생성, 이름/id 입력, 누락 참조 차단, 역할별 범위 통과
- attendance: 미처리/출석/지각/결석/보강 필요 상태, 수업 상태 반영, student 수정 차단 통과
- lesson notes: 기존 수업 기준 작성, 누락 수업/내용 차단, 과제/다음 목표/연습 요청 저장, student internal memo 비노출 통과
- reservations: room slot 예약, 역할별 목적 제한, 중복/시간 역전 차단, student linkedStudentId 사용 통과
- payments: owner/manager 등록, 상태/금액 검증, teacher/student 금지, 대시보드 미납 항목 반영 통과
- internal ops/worklogs/meetings/notices: 업무, 근태, 회의, 일정, 공지 target role, 공개 설정 권한, 감사 로그 통과
- data schema/export/import: data-quality, export, safe import dry-run, audit log, file persistence, memory reset 통과

## 7. UI 테스트 결과

- `/`, `/login`, `/dashboard`, `/students`, `/consultations`, `/lessons`, `/attendance`, `/lesson-notes`, `/practice-rooms`, `/payments`, `/accounts`, `/data-quality`, `/profile-settings`, `/version3-test` 로드 통과
- 로그인 실패 메시지 표시 통과
- owner/manager/teacher/student 역할별 메뉴 노출/비노출 통과
- desktop 1440x900 및 mobile 390x844 통과
- mobile dashboard 가로 overflow 2px 이하 통과
- 첫 번째 표시 control actionability 통과
- 서버 중단 시 로그인 오류 fallback 표시 통과
- 브라우저 console/pageerror: 최종 UI smoke 기준 오류 없음

## 8. 발견한 결함 목록

1. student bootstrap 응답의 lesson note에 `internalMemo`가 노출될 수 있음
2. teacher bootstrap 응답의 student/guardian 원자료에 phone/memo 등 민감 정보가 포함될 수 있음
3. 서버 상담 데이터는 `id`를 내려주지만 UI 매핑이 `consultation_id`만 읽어 상담 id가 빈 문자열로 변환됨
4. 대시보드 우선 처리 표에서 같은 행 안의 Badge/Link가 동일 key를 사용함
5. Browser plugin과 Base44 CLI는 현재 작업 환경에서 사용할 수 없음

## 9. 수정한 결함 목록

1. server bootstrap lesson note 응답에 student용 internal memo 제거 필터 추가
2. server bootstrap student/guardian 응답에 teacher용 개인정보 마스킹 필터 추가
3. `mapConsultation`, `mapConsultationHistory`가 camelCase 및 `id` 필드를 함께 수용하도록 수정
4. 대시보드 우선 처리 표의 Badge/Link key를 역할이 드러나는 고유 key로 수정
5. `verify-version3-feature-suite` 및 `verify-version3-ui-smoke` 추가, 운영 표면 검증 대상에 반영

## 10. 보류한 결함과 이유

- PostgreSQL 실 DB 검증: `VERSION3_DATABASE_URL`이 제공되지 않아 연결 테스트 보류
- 외부 HTTPS release 검증: 검증할 공개 `VERSION3_API_BASE_URL`이 없어 `verify:version3-release` 보류
- Base44 검증: 저장소에 Base44 설정이 없고 CLI가 설치되어 있지 않아 적용 대상 아님
- Browser plugin 검증: 현재 Codex 세션에 browser/node_repl 도구가 없어 Playwright로 대체

## 11. 실행 명령과 결과

- `pnpm run typecheck`: 통과
- `pnpm run lint`: 통과
- `pnpm run verify:security-baseline`: 통과
- `pnpm run audit:prod`: 통과, known vulnerability 없음
- `pnpm run verify:version3-test-mode`: 통과
- `pnpm run verify:version3-server`: 통과
- `pnpm run verify:version3-opening-workflow`: 통과
- `pnpm run verify:version3-feature-suite`: 통과, 23 passed / 0 failed
- `pnpm run verify:version3-ui-smoke`: 통과
- `pnpm run verify:version3-production-env`: 통과
- `pnpm run build:pages`: 통과
- `pnpm run verify:surfaces`: 통과
- `pnpm run verify:version3-release`: 공개 HTTPS 서버 URL 미제공으로 미실행

## 12. 다음 QA 권장 사항

- 운영 반영 전 실제 `VERSION3_DATABASE_URL`로 PostgreSQL 모드 재검증
- 외부 HTTPS 서버 배포 후 `verify:version3-release`와 `verify:version3-server`를 실제 URL 기준으로 실행
- 실제 운영 계정 전환 전 owner 초기 비밀번호, allowed origins, persistent data path, backups enabled 상태 재확인
- 상담/레슨노트/수납/예약의 CSV 또는 기존 자료 import dry-run을 운영 샘플로 별도 수행
- 교차 브라우저가 필요하면 Chromium 외 Firefox/WebKit UI smoke도 추가
