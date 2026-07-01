# Version.3 외부 서버 후보 검토 기준

Version.3의 공개 경로는 Apps Script가 아니라 별도 서버를 기준으로 운영합니다. Base44, Lovable, 별도 Node 서버 중 어떤 후보를 사용하더라도 아래 계약을 통과해야 실제 학원 운영 서버로 볼 수 있습니다.

## 공통 통과 기준

- `https` 공개 URL을 제공해야 합니다.
- `VERSION3_API_BASE_URL` 또는 `NEXT_PUBLIC_VERSION3_API_BASE_URL`로 Next UI에 연결할 수 있어야 합니다.
- `pnpm run verify:version3-server`를 외부 URL 대상으로 통과해야 합니다.
- `pnpm run verify:version3-release`를 운영 배포 설정으로 통과해야 합니다.
- 계정 비밀번호는 `/accounts`, `/bootstrap`, `/data-export` 응답에 노출하지 않아야 합니다.
- 계정 비밀번호는 DB나 파일에 평문으로 저장하지 않고 해시로 저장해야 합니다.
- 계정 상태 변경, 비밀번호 초기화, 권한 변경은 대상 계정의 기존 세션을 무효화해야 합니다.
- 계정 관리자는 자기 자신의 계정 중지, 관리자 비밀번호 초기화, 권한 편집을 할 수 없어야 합니다.
- 계정 생성은 필수 로그인 ID와 이름, 중복 없는 로그인 ID, 8자 이상 초기 비밀번호를 서버에서 검증해야 합니다.
- 비밀번호 초기화는 8자 이상 임시 비밀번호만 허용해야 합니다.
- 수강생 계정은 실제 학생 기록에 연결되어야 하며, 존재하지 않는 학생 ID나 이미 활성 계정에 연결된 학생 ID를 거부해야 합니다.
- 새로 만든 `invited` 계정은 초기 비밀번호로 로그인할 수 있어야 하며, 첫 로그인 뒤 `active`로 전환되고 비밀번호 변경을 요구해야 합니다.
- 반복 로그인 실패는 잠시 제한해야 하며, 응답에는 사용자가 나중에 다시 시도할 수 있음을 알 수 있는 오류와 재시도 기준을 제공해야 합니다.
- 반복 로그인 실패로 제한이 걸린 사건은 `login_throttled` 감사 로그로 남겨야 하며, 대상 유형은 `security`, metadata에는 실패 횟수와 제한 시간을 포함해야 합니다.
- `auditLogs`에는 계정, 학생, 수강, 수업, 출결, 레슨노트, 예약, 수납, 업무, 상담요청, 공지, 데이터 내보내기 변경 이력이 남아야 합니다.
- `/data-export`는 비밀번호가 제거된 백업 가능한 JSON을 내려주고, 요청 자체를 `export_data` 감사 로그로 남겨야 합니다.
- `/data-import`는 대표 계정만 실행할 수 있어야 하며, 가져오기 요청 자체를 `import_data` 감사 로그로 남겨야 합니다.
- `/data-backups`는 대표 계정만 조회할 수 있어야 하며, 백업 파일의 전체 서버 경로를 노출하지 않아야 합니다.
- 백업 파일에는 계정 비밀번호가 없어야 하므로, 가져오기 시 기존 계정 비밀번호를 보존하거나 새 서버에서는 임시 비밀번호를 해시로 저장하고 다음 로그인 때 변경을 요구해야 합니다.

## 필수 API 계약

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /bootstrap`
- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/{id}/status`
- `PATCH /accounts/{id}/password`
- `PATCH /accounts/{id}/permissions`
- `GET /account-history`
- `GET /audit-logs`
- `GET /data-quality`
- `GET /data-export`
- `POST /data-import`
- `GET /data-backups`
- `POST /actions/{action}`

## 필수 역할

- 대표: 전체 관리, 계정/권한/운영/공지/데이터 점검
- 매니저: 운영 관리, 학생/수강/수납/상담/공지
- 강사: 담당 학생, 담당 수업, 출결, 레슨노트, 배정된 상담요청
- 수강생: 본인 일정, 본인 예약, 본인 수납, 본인 상담요청 생성

## Base44 후보 사용 기준

Base44는 데이터 모델, 인증, 백엔드 함수, 배포가 한 플랫폼에 묶이는 후보로 검토합니다.

- 현재 repo에는 `base44/config.jsonc`가 없으므로 아직 Base44 프로젝트가 아닙니다.
- 새 후보를 만들 때는 별도 브랜치나 별도 작업 폴더에서 Base44 프로젝트를 초기화합니다.
- 엔티티는 `Account`, `Student`, `Teacher`, `Enrollment`, `Lesson`, `Attendance`, `LessonNote`, `Room`, `Reservation`, `Payment`, `Task`, `ConsultationRequest`, `Notice`, `AuditLog` 기준으로 나눕니다.
- 백엔드 함수는 Version.3 API 계약과 같은 이름 또는 같은 동작을 제공해야 합니다.
- Base44 SDK 사용 시 인증은 `loginViaEmailPassword`, 함수 호출은 `functions.invoke`, 엔티티 조회는 `entities.EntityName.filter/list/get/create/update/delete` 계열을 기준으로 확인합니다.
- 배포 전에는 `npx base44 whoami`로 로그인 상태를 확인해야 하며, 미로그인 상태에서는 CLI 작업을 진행하지 않습니다.

## Lovable 후보 사용 기준

Lovable은 빠르게 풀스택 후보를 만들고 Version.3 계약과 비교하는 용도로 검토합니다.

- UI를 새로 만드는 목적보다 Version.3 서버 API 후보를 빠르게 세우는 목적이 우선입니다.
- 생성된 앱은 공식 Next UI를 대체하지 않고, `/auth/login`, `/bootstrap`, `/actions/{action}` 같은 서버 계약을 맞추는지 확인합니다.
- 후보가 만들어지면 외부 URL을 `VERSION3_SERVER_VERIFY_BASE_URL`에 넣고 `pnpm run verify:version3-server`를 실행합니다.
- 검증 통과 전에는 GitHub Pages 운영 변수 `VERSION3_API_BASE_URL`에 연결하지 않습니다.

## 별도 Node 서버 후보 사용 기준

현재 `server/version3-local-server.mjs`는 운영 서버 확정 전 계약 검증용 기준 서버입니다.

- 실제 운영에 쓰려면 영구 DB, 비밀번호 해싱, HTTPS, 백업/복구, 접근 로그, 관리자 계정 발급 절차를 추가해야 합니다.
- 로컬 파일 저장 방식은 개발과 전환 검증용이며, 장기 운영 DB로 간주하지 않습니다.
- 운영 후보가 확정되면 로컬 서버는 테스트 더블 또는 계약 문서로 남기고, 최후반 정리 단계에서 보존/삭제를 결정합니다.

## 다음 실행 순서

1. Base44 후보 또는 Lovable 후보 중 하나를 선택합니다.
2. 후보 서버에 Version.3 필수 API를 먼저 만듭니다.
3. 외부 URL로 `pnpm run verify:version3-server`를 통과시킵니다.
4. GitHub 저장소 변수 `VERSION3_API_BASE_URL`에 검증된 HTTPS URL을 등록합니다.
5. `pnpm run verify:version3-release`와 Pages 배포 검증을 통과한 뒤 운영 연결로 전환합니다.

## Docker/Render 별도 서버 후보

외부 서비스 선택 전에도 Version.3 서버 계약을 실제 호스팅 후보에서 시험할 수 있도록 `Dockerfile`, `.dockerignore`, `render.yaml`을 추가했습니다.

- Docker 이미지는 `server/version3-local-server.mjs`만 실행합니다.
- `/health`는 로그인 없이 서버 상태를 확인하는 헬스체크입니다.
- 외부 호스팅에서는 `VERSION3_SERVER_HOST=0.0.0.0`을 사용합니다.
- 운영 데이터 파일은 `/data/version3-data.json`처럼 컨테이너 밖 디스크에 두어야 합니다.
- `VERSION3_LOCAL_SERVER_PASSWORD`는 반드시 기본값이 아닌 긴 임시 비밀번호로 설정합니다.
- `VERSION3_ALLOWED_ORIGINS`에는 공식 Pages origin만 넣습니다. 예: `https://ethicsjayden31.github.io`
- Render 예시는 `/data` 디스크를 붙여 JSON 운영 데이터가 컨테이너 재시작으로 사라지지 않게 합니다.

이 Docker/Render 방식은 Base44나 Lovable 확정 전의 실제 서버 후보 검증용입니다. 장기 최종 운영에서는 관리형 DB, 백업/복구 절차, 접근 로그, 관리자 계정 발급 절차를 별도로 확정해야 합니다.
