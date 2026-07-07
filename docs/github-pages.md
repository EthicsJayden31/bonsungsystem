# GitHub Pages 배포

본성뮤직 인트라넷 Version.3는 Next.js UI를 GitHub Pages 루트에 정적 배포하고, 인증과 데이터 저장은 별도 Version.3 서버가 처리합니다. Apps Script, legacy preview, Preview 로그인은 전환 검증이 필요할 때만 환경변수로 켜는 보조 경로입니다.

## 운영 주소

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 자동 배포

`.github/workflows/pages.yml`은 다음 순서로 실행됩니다.

1. legacy 파일과 Apps Script 원본의 JavaScript 문법을 확인합니다.
2. 운영 배포 브랜치에서는 `pnpm verify:version3-release`로 공개 서버 URL과 전환 플래그를 확인합니다.
3. `NEXT_PUBLIC_VERSION3_API_BASE_URL`을 주입해 Next.js 정적 사이트를 빌드합니다.
4. 운영 화면과 Version.3 서버 계약을 검증합니다.
5. `NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true`일 때만 `pages-preview/`를 `out/legacy-preview/`로 복사합니다.
6. `main` 또는 `codex/v1-intranet` 브랜치에서만 GitHub Pages에 배포합니다.

기능 브랜치와 pull request는 배포 없이 검증만 수행합니다.

## 필수 저장소 변수

운영 배포 전 GitHub 저장소 변수에 다음 값을 설정합니다.

```text
VERSION3_API_BASE_URL=https://your-version3-server.example
```

운영 배포에서 이 값은 비어 있으면 안 됩니다. `https` URL이어야 하고, `localhost` 또는 `127.0.0.1` 같은 개발 서버 주소를 사용할 수 없습니다.

다음 전환 플래그는 기본 운영 배포에서는 꺼져 있어야 합니다.

```text
ENABLE_APPS_SCRIPT_TRANSITION
ENABLE_LEGACY_PREVIEW
ENABLE_PREVIEW_LOGIN
```

정말로 전환 검증을 공개 배포에서 진행해야 할 때만 `VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS=true`를 임시로 설정합니다. 이 값은 운영 상태를 완화하는 예외이므로 검증이 끝나면 다시 제거합니다.

## 운영 반영 순서

1. 기능 브랜치에서 기본 검증을 통과합니다.
2. 실제 Version.3 서버 URL을 `VERSION3_API_BASE_URL`에 설정합니다.
3. 전환 플래그가 꺼져 있는지 확인합니다.
4. `codex/v1-intranet`에 병합합니다.
5. GitHub Pages 배포 완료 후 `/`, `/login/`, `/dashboard/`를 다시 확인합니다.
6. 서버 로그인으로 대표, 매니저, 강사, 수강생 세션이 생성되는지 확인합니다.
7. 학생 등록, 수강생 계정 생성, 상담요청, 공지 작성, 감사 로그 흐름을 확인합니다.

## Chrome 수동 검증

### 대표/매니저

- 로그인 후 대시보드가 서버 데이터로 표시되는지 확인합니다.
- 계정, 학생, 강사, 수업, 공지, 상담요청 저장이 서버에 반영되는지 확인합니다.
- `데이터 품질`에서 감사 로그와 운영 이벤트를 확인합니다.

### 강사

- 본인 담당 학생과 수업만 보이는지 확인합니다.
- 레슨노트 작성과 출결 변경이 권한 범위 안에서만 가능한지 확인합니다.
- 수납, 계정 관리, 민감한 개인정보가 보이지 않는지 확인합니다.

### 수강생

- 본인 수업, 레슨노트, 예약, 공지만 보이는지 확인합니다.
- 상담요청은 일방향 메시지로 생성되고 상태 변경 권한은 없는지 확인합니다.

### 모바일

- Chrome DevTools에서 390x844와 320x800을 확인합니다.
- 페이지 전체에 가로 스크롤이 없는지 확인합니다.
- 표가 모바일 카드로 바뀌고, 하단 메뉴와 입력 폼이 화면 안에 들어오는지 확인합니다.
- 긴 이름, 과목, 메모가 다른 요소와 겹치지 않는지 확인합니다.

## 보안 원칙

저장소 `Settings > Pages`의 Source는 `GitHub Actions`로 설정합니다. 비밀번호, 서버 비밀값, Sheet 편집 권한, Apps Script `SETUP_KEY` 같은 값은 GitHub Pages 소스에 넣지 않습니다.
