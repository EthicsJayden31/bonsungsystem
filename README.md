# Bonsung Music Academy Intranet

## Version.3 Separate Server Mode

Version.3 is moving toward real academy operation on a separate server instead of Apps Script. To run the official Next UI with the local Version.3 server contract, use:

### 2026-07-02 15:32 role-based navigation and dashboard update

The official Next UI now changes the dashboard header, sidebar group labels, quick actions, stats, and panels by account role. Student accounts see a learning-focused home screen with notices, lessons, lesson notes, consultations, and room reservations, while owner and manager accounts keep the full operations view.

Student accounts no longer receive payment-view permission by default, and the Version.3 server/test bootstrap no longer exposes payment or enrollment/registration operation records to student sessions. Sidebar search only searches the visible role-approved menu copy, so hidden finance/registration routes do not appear through search.

Verification covered `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:surfaces`, `pnpm run verify:version3-server`, `pnpm run verify:version3-test-mode`, `pnpm run build:pages`, and browser checks on `/version3-test/` for student and owner roles.

### 2026-07-02 14:53 navigation usability update

The official Next UI now separates desktop sidebar scrolling from the page content scroll area. Desktop menu groups use collapsible button-style parent sections named `Operations`, `Academy Roster`, `Classes & Rooms`, and `Administration`, with role-limited child links shown inside each group.

Mobile bottom navigation is now fixed, opaque white, and layered below the full menu sheet so it does not drag, blur, or shift during page scrolling. This behavior is verified against the GitHub Pages static build output through `/version3-test/`.

### 2026-07-02 08:10 implementation status

The real Version.3 server contract now covers the core academy operation flow: role login and permission-gated menus, account requests and approval, password reset and forced password change, students and linked student accounts, consultations, enrollments, lessons, attendance, lesson notes, space reservations with overlap checks, registrations/payments, tasks, work logs, meetings, calendar events, notices, shared public settings, data export/import, backups, data quality checks, and audit logs.

`/version3-test/` is the temporary inspection entry for the official Next UI. It mirrors the real login and app screens; the only intended behavioral difference is that the data/session source is browser `localStorage` instead of the Version.3 server. A small grey `testing page` mark is the only user-facing test indicator. The source of truth for actual operation remains the Version.3 server API and the official Next UI.

`public/version3-offline-inspection.html` is now a lightweight guide/backup HTML that opens `/version3-test/`. It must not become a separate fake management app.

```text
pnpm run dev:version3
```

Default local access:

```text
UI: http://127.0.0.1:3000/login/
Server: http://127.0.0.1:4303
Seed login IDs: owner, manager, teacher, student
Seed password: version3
Local data file: .version3-local-data.json
```

To verify the Version.3 server contract:

```text
pnpm run verify:version3-server
```

If no external URL is provided, the verifier starts the local Version.3 server automatically. To verify a real server candidate, set either:

```text
VERSION3_SERVER_VERIFY_BASE_URL=https://your-version3-server.example
NEXT_PUBLIC_VERSION3_API_BASE_URL=https://your-version3-server.example
```

The local server persists account, notice, consultation, and audit-log changes to `VERSION3_LOCAL_DATA_FILE` by default. Before overwriting the local data file, it writes a timestamped `.bak` copy unless `VERSION3_DISABLE_LOCAL_BACKUPS=true` is set. Set `VERSION3_LOCAL_DATA_FILE=memory` only when you want a disposable run that resets on restart. Operators with the operations permission can also call `/data-export` to receive a password-redacted JSON export of the current Version.3 data.

Local server sessions expire after `VERSION3_SESSION_TTL_HOURS` hours, defaulting to 12. When an account password is reset, the next login is redirected to `/profile-settings?forcePasswordChange=1` and must complete `/auth/change-password` before using the rest of Version.3.

For GitHub Pages deployment, set the repository variable `VERSION3_API_BASE_URL` to the public Version.3 server URL. The Pages workflow injects it as `NEXT_PUBLIC_VERSION3_API_BASE_URL` during the static build, verifies the release configuration with `pnpm verify:version3-release`, checks generated/private file boundaries with `pnpm verify:version3-cleanup`, and runs `pnpm verify:version3-server` against the same server URL. Public deployment branches now fail if this URL is empty, points to localhost, does not use HTTPS, if transition-only Apps Script/legacy/Preview flags are enabled without an explicit transition override, or if build output/local Version.3 data files are visible to Git.

본성뮤직 인트라넷은 GitHub Pages에 배포되는 Next.js 기반 운영 화면입니다.
현재 공식 운영 기준 브랜치는 `codex/v1-intranet`이며, 공개 주소는 다음과 같습니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 현재 운영 기준

- 공식 화면: Next.js App Router (`app/`)
- 데이터 연동: 별도 Version.3 서버 우선 (`NEXT_PUBLIC_VERSION3_API_BASE_URL`)
- 기존 Apps Script 화면: 전환 검증이 필요할 때만 `/legacy-preview/`로 보존 (`NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true`)
- preview 데이터: `NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN=true` 점검 모드에서만 사용

`pages-preview/`와 `google-apps-script/`는 아직 삭제하지 않지만, 기본 공개 운영 경로로 되돌리지 않습니다. Version.3 최후반 정리 단계에서 실제 서버 운영 검증이 끝나면 삭제/보존 기준을 다시 결정합니다.

## 주요 경로

| 경로 | 용도 |
| --- | --- |
| `/` | 공식 홈 |
| `/login/` | Version.3 서버 로그인 |
| `/dashboard/` | 운영 대시보드 |
| `/students/` | 학생 목록과 상세 관리 |
| `/teachers/` | 강사별 데이터 조회 |
| `/practice-rooms/` | 강의실/연습실 예약 |
| `/tasks/` | 내부 업무, 근태, 회의, 일정 |
| `/accounts/` | 계정, 권한, 계정 요청 승인, 비밀번호 초기화 |
| `/data-quality/` | 데이터 점검 |
| `/profile-settings/` | 개인화 설정 |
| `/version3-test/` | 실제 Next 화면을 localStorage 데이터로 점검하는 테스트모드 |
| `/version3-offline-inspection.html` | `/version3-test/`로 이동하는 임시 점검용 HTML 안내 |
| `/legacy-preview/` | 전환 검증용 기존 Apps Script 운영 화면 |

## 유지할 핵심 파일

```text
app/                       Next.js 공식 운영 화면
components/                공통 레이아웃, 목록, 상세, 예약 컴포넌트
lib/                       세션, 권한, Version.3 서버 클라이언트, 데이터 변환
server/                    Version.3 로컬 서버 계약과 테스트 더블
google-apps-script/Code.gs 전환 보조 Apps Script API 원본
pages-preview/             전환 검증용 legacy 운영 화면 원본
public/brand/              브랜드 디자인 자산
tools/                     Pages 빌드와 운영 표면 검증 도구
docs/                      현재 운영과 배포에 필요한 문서만 유지
```

## 검증

변경 후 기본 검증은 다음 네 가지입니다.

```text
pnpm typecheck
pnpm lint
pnpm build:pages
pnpm verify:surfaces
pnpm verify:version3-test-mode
pnpm verify:version3-server
pnpm verify:version3-cleanup
```

공개 운영 배포 전에는 다음도 통과해야 합니다.

```text
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm verify:version3-release
```

배포 후에는 다음 공개 경로를 확인합니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
https://ethicsjayden31.github.io/bonsungsystem/login/
https://ethicsjayden31.github.io/bonsungsystem/dashboard/
```

## 보안 원칙

- `.env`, 비밀번호, API 키, Apps Script `SETUP_KEY`는 커밋하지 않습니다.
- Google Sheets는 공개 공유하지 않습니다.
- teacher 권한에는 수납 정보, 보호자 연락처, 내부 메모 같은 민감 정보를 노출하지 않습니다.
- 수강생 계정은 Version.3 서버 세션과 연결 학생 기준으로 본인 데이터만 봅니다.
- preview 데이터와 legacy 화면은 운영 원본이 아닙니다.

## 다음 개발 방향

다음 작업은 `docs/project/operating-surfaces.md`의 기준을 따릅니다.

1. 학생별/강사별 데이터 조회와 관리 기능을 Next UI에 통합합니다.
2. 강의실/연습실 예약을 모바일 앱형 GUI로 개선합니다.
3. 개인화 설정을 실제 화면 밀도, 시작 화면, 목록 표시 방식에 연결합니다.
4. 모든 기능은 390px와 320px 모바일 폭에서 검증합니다.
