# 본성 스테이지(통합 관리 시스템) 구축 현황

본성 스테이지는 본성뮤직아카데미 운영을 위해 구축 중인 Version.3 통합 관리 시스템입니다. 최종 목표는 GitHub Pages에 배포되는 공식 Next.js 화면이 별도 Version.3 서버와 연결되어, 학생·수업·상담·예약·수납·업무 기록을 실제 운영 데이터로 관리하는 것입니다.

현재 기준 브랜치는 `codex/v1-intranet`이며, 공개 UI 기준 주소는 다음과 같습니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 코드 구조

| 경로 | 역할 |
| --- | --- |
| `app/` | 공식 Next.js App Router 화면입니다. 로그인, 대시보드, 학생, 상담, 수업, 예약, 수납, 업무, 계정, 데이터 점검 화면이 들어 있습니다. |
| `components/` | 공통 레이아웃, 사이드바, 모바일 메뉴, 표, 상세 패널, 예약 보드 같은 재사용 UI입니다. |
| `lib/` | 권한, 세션, 서버 클라이언트, 테스트모드, 데이터 변환, 화면별 데이터 접근 로직입니다. |
| `server/` | Version.3 로컬/외부 서버 기준 구현입니다. 로그인, 계정, 업무 데이터, 감사 로그, 내보내기/가져오기, 백업 API를 제공합니다. |
| `public/` | 로고와 공개 정적 파일입니다. `version3-offline-inspection.html`은 GitHub Pages에서 테스트모드로 들어가는 임시 점검용 HTML입니다. |
| `tools/` | 서버 계약, 테스트모드, Pages 빌드, 운영 표면, 배포 환경값을 검증하는 스크립트입니다. |
| `docs/` | 운영 표면, 서버 배포, 외부 서버 후보, GitHub Pages 연결 기준 등 프로젝트 문서입니다. |
| `.github/workflows/` | GitHub Pages 배포와 Version.3 서버 이미지/외부 서버 검증 워크플로입니다. |

## 구현된 주요 기능

- 로그인/권한: `Admin`, `Manager`, `Coach`, `Artist` 4종 계정 체계가 적용되어 있습니다.
- 권한별 화면 제한: 계정 종류에 따라 홈 화면, 사이드바 메뉴, 데이터 노출 범위가 달라집니다.
- 계정 관리: 계정 목록, 계정 요청 승인, 비밀번호 초기화, 강제 비밀번호 변경, 권한 관리, 계정 이력과 감사 로그를 지원합니다.
- 학생/보호자: 학생 목록, 상세 정보, 담당 강사 연결, 수강생 계정 연결 흐름을 관리합니다.
- 상담: 상담요청 등록, 확인 처리, 담당자 배정, 후속 연락 상태, 읽음 처리 흐름을 지원합니다.
- 수강/수업: 수강 등록, 담당 강사, 프로그램, 수업 일정, 수업 상태를 관리하는 데이터 계약이 준비되어 있습니다.
- 출결/레슨노트: 출석·지각·결석·보강 필요 상태와 수업별 레슨노트 작성 흐름을 지원합니다.
- 공간 예약: 레슨실/연습실 예약, 1시간 단위 예약, 권한별 예약 범위, 예약 충돌 방지 로직이 들어 있습니다.
- 수납/등록: 등록·재등록, 납부 상태, 미납/확인 필요 항목을 운영 데이터로 관리합니다.
- 내부 운영: 업무, 근태, 회의, 일정, 공지, 운영 환경 설정 화면이 포함되어 있습니다.
- 데이터 관리: localStorage 테스트모드, 서버 데이터 파일 저장, 가져오기/내보내기, 백업, 감사 기록을 지원합니다.
- 테스트모드: `/version3-test/`는 실제 Next.js 화면을 localStorage 데이터로 실행합니다. 실제 화면과 테스트 화면의 차이는 데이터 저장 위치뿐이어야 합니다.

## 현재 반영된 초기 데이터

초기 데이터는 Notion을 런타임에 직접 연결하는 방식이 아니라, 필요한 정보만 코드 시드 데이터로 선별 반영하는 방식입니다.

- 직원·강사: 초기 강사/직원 8명과 미정 강사 표시 1건
- 수강생: 초기 수강생 28명
- 프로그램: `본성뮤직_업무노트 HQ`의 `프로그램 DB` 기준 7개
- 개원 일정: `본성뮤직_업무노트 HQ`의 `개원 일정 DB` 중 `공개`로 표시된 3개만 반영
- 수납 확인: 수강생별 확인 필요 항목
- 상담 후속 확인: 등록 상태가 확인 필요한 수강생 대상 상담 항목
- 운영 문서/업무: 개원 준비 체크리스트와 문서 작성 업무

현재 반영된 프로그램은 다음 7개입니다.

```text
본성 프리컬리지
본성 아티스트
보컬 리디자인
프로젝트 수업
교양교육
단기 목적형 수업
해피아워 클래스
```

현재 반영된 공개 개원 일정은 다음 3개입니다.

```text
2026-08-01 신규 수강상담 및 사전등록 시작
2026-08-18 파운딩멤버 보컬 수업 시작
2026-09-01 신규 등록자 수업 시작
```

`개원 일정 DB`에서 `비공개`로 표시된 일정은 시스템 초기 일정 데이터에 넣지 않습니다.

## 테스트 안내

로컬에서 실제 서버와 공식 UI를 함께 실행하려면 다음 명령을 사용합니다.

```text
pnpm run dev:version3
```

기본 접속 주소는 다음과 같습니다.

```text
UI: http://127.0.0.1:3000/login/
Server: http://127.0.0.1:4303
```

테스트 계정 ID는 다음과 같습니다.

```text
admin
manager
coach
artist
```

비밀번호는 공개 README에 적지 않습니다. 로컬 개발용 초기 비밀번호는 서버 환경변수와 운영자 보관값을 기준으로 확인합니다.

서버 없이 GitHub Pages 기준 점검 화면을 확인할 때는 다음 경로를 사용합니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/version3-offline-inspection.html
https://ethicsjayden31.github.io/bonsungsystem/version3-test/
```

변경 후 기본 검증 명령은 다음과 같습니다.

```text
pnpm run typecheck
pnpm run lint
pnpm run verify:version3-test-mode
pnpm run verify:version3-server
pnpm run build:pages
pnpm run verify:surfaces
```

배포 전 추가 검증은 다음 기준을 사용합니다.

```text
pnpm run verify:version3-cleanup
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm run verify:version3-release
```

## 데이터 관리 방식 안내

Version.3의 실제 운영 원본은 별도 서버 데이터입니다. GitHub Pages는 화면만 제공하고, 운영 데이터는 `NEXT_PUBLIC_VERSION3_API_BASE_URL`로 지정된 Version.3 서버에서 불러옵니다.

로컬 Version.3 서버는 기본적으로 `.version3-local-data.json`에 데이터를 저장합니다. 이 파일은 운영/개발 데이터이므로 Git에 올리지 않습니다.

```text
VERSION3_LOCAL_DATA_FILE=.version3-local-data.json
```

서버는 데이터 파일을 덮어쓰기 전에 `.bak` 백업 파일을 만들 수 있습니다. 일회성 검증처럼 재시작 때 데이터가 사라져도 되는 경우에만 다음 값을 사용합니다.

```text
VERSION3_LOCAL_DATA_FILE=memory
```

테스트모드인 `/version3-test/`는 브라우저의 localStorage를 사용합니다. 이 모드는 서버 없이 실제 화면을 점검하기 위한 용도이며, 최종 운영 데이터 원본으로 사용하지 않습니다.

운영 서버에서 반드시 관리해야 하는 주요 환경값은 다음과 같습니다.

```text
NODE_ENV=production
VERSION3_SERVER_HOST=0.0.0.0
VERSION3_ALLOWED_ORIGINS=https://ethicsjayden31.github.io
VERSION3_LOCAL_DATA_FILE=/data/version3-data.json
VERSION3_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
VERSION3_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
VERSION3_SESSION_TTL_HOURS=12
```

README, 커밋, 이슈, 공개 문서에는 실제 비밀번호, API 키, 세션 토큰, Apps Script 설정 키를 적지 않습니다.

## GitHub Pages 배포 방식

GitHub Pages 배포에서는 저장소 변수 `VERSION3_API_BASE_URL`을 사용해 공식 UI가 바라볼 Version.3 서버 주소를 주입합니다.

- 공개 배포 URL은 반드시 `https` 주소여야 합니다.
- `localhost`, `127.0.0.1`, `::1` 같은 개발 서버 주소는 공개 배포 기준에서 실패 처리됩니다.
- 외부 서버 검증은 `pnpm run verify:version3-server`로 확인합니다.
- Pages 배포 전에는 `pnpm run verify:version3-release`로 전환용 Preview/Apps Script 플래그가 꺼져 있는지 확인합니다.

## 운영 주의사항

- Notion DB는 현재 초기 데이터 선별 원본입니다. 시스템 실행 중 실시간으로 Notion DB를 직접 읽는 구조가 아닙니다.
- 프로그램과 공개 개원 일정은 `server/bonsung-initial-data.mjs`와 `lib/demo-data.ts`의 시드 데이터에 함께 반영합니다.
- 기존 로컬 서버 데이터에 남아 있는 예전 초기 개원 일정은 서버 시작 시 공개 일정 기준으로 정리됩니다. 사용자가 직접 추가한 일반 일정은 보존됩니다.
- `Coach` 권한에는 수납 정보, 보호자 연락처, 내부 메모 같은 민감 정보를 노출하지 않습니다.
- `Artist` 계정은 연결된 수강생 본인 데이터만 보는 것을 기준으로 합니다.
- `Admin`은 개인 업무 계정이 아니라 시스템 관리 기능을 모아 둔 계정입니다.
