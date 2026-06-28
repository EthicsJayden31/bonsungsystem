# Bonsung Music Academy Intranet

본성뮤직 인트라넷은 GitHub Pages에 배포되는 Next.js 기반 운영 화면입니다.
현재 공식 운영 기준 브랜치는 `codex/v1-intranet`이며, 공개 주소는 다음과 같습니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 현재 운영 기준

- 공식 화면: Next.js App Router (`app/`)
- 데이터 연동: Apps Script + Google Sheets (`google-apps-script/Code.gs`)
- 기존 실사용 화면: `/legacy-preview/`로 보존 (`pages-preview/`)
- preview 데이터: 실사용 세션이 없거나 Apps Script 연결이 실패할 때만 사용

`pages-preview/`는 아직 삭제하지 않습니다. Next UI의 저장 기능이 충분히 검증될 때까지 기존 Apps Script 운영 화면을 안전망으로 유지합니다.

## 주요 경로

| 경로 | 용도 |
| --- | --- |
| `/` | 공식 홈 |
| `/login/` | Apps Script 실사용 로그인 및 preview 로그인 |
| `/dashboard/` | 운영 대시보드 |
| `/students/` | 학생 목록과 상세 관리 |
| `/teachers/` | 강사별 데이터 조회 |
| `/practice-rooms/` | 강의실/연습실 예약 |
| `/data-quality/` | 데이터 점검 |
| `/profile-settings/` | 개인화 설정 |
| `/legacy-preview/` | 기존 Apps Script 운영 화면 |

## 유지할 핵심 파일

```text
app/                       Next.js 공식 운영 화면
components/                공통 레이아웃, 목록, 상세, 예약 컴포넌트
lib/                       세션, 권한, Apps Script 클라이언트, 데이터 변환
google-apps-script/Code.gs Apps Script API 원본
pages-preview/             legacy 운영 화면 원본
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
```

배포 후에는 다음 공개 경로를 확인합니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
https://ethicsjayden31.github.io/bonsungsystem/login/
https://ethicsjayden31.github.io/bonsungsystem/dashboard/
https://ethicsjayden31.github.io/bonsungsystem/legacy-preview/
```

## 보안 원칙

- `.env`, 비밀번호, API 키, Apps Script `SETUP_KEY`는 커밋하지 않습니다.
- Google Sheets는 공개 공유하지 않습니다.
- teacher 권한에는 수납 정보, 보호자 연락처, 내부 메모 같은 민감 정보를 노출하지 않습니다.
- student 계정은 Next 공식 UI가 아니라 `/legacy-preview/`로 이동합니다.
- preview 데이터는 운영 원본이 아닙니다.

## 다음 개발 방향

다음 작업은 `docs/project/operating-surfaces.md`의 기준을 따릅니다.

1. 학생별/강사별 데이터 조회와 관리 기능을 Next UI에 통합합니다.
2. 강의실/연습실 예약을 모바일 앱형 GUI로 개선합니다.
3. 개인화 설정을 실제 화면 밀도, 시작 화면, 목록 표시 방식에 연결합니다.
4. 모든 기능은 390px와 320px 모바일 폭에서 검증합니다.
