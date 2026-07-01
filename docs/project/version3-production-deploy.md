# Version.3 공개 서버 배포 점검표

이 문서는 Version.3 서버를 실제 운영용 외부 서버에 올릴 때 확인할 항목입니다. 최종 사용자 화면은 GitHub Pages 같은 공개 UI가 담당하고, 학원 데이터 저장과 로그인은 별도 Version.3 서버가 담당합니다.

## 1. 서버 환경값

외부 서버에는 `.env.production.example`의 값을 기준으로 환경변수를 넣습니다.

- `NODE_ENV=production`
- `VERSION3_SERVER_HOST=0.0.0.0`
- `VERSION3_LOCAL_SERVER_PASSWORD`: 기본값 `version3` 금지, 12자 이상 임시 비밀번호 사용
- `VERSION3_ALLOWED_ORIGINS`: 공식 UI 주소만 입력, 예: `https://ethicsjayden31.github.io`
- `VERSION3_LOCAL_DATA_FILE`: `/data/version3-data.json`처럼 영구 디스크 경로 사용
- `VERSION3_SESSION_TTL_HOURS`: 보통 12시간

배포 전에는 다음 명령으로 서버 환경값을 확인합니다.

```bash
pnpm run verify:version3-production-env
```

## 2. 데이터 보존

운영 데이터는 컨테이너 안 임시 공간이 아니라 외부 서버의 영구 디스크에 저장해야 합니다. Render 예시는 `render.yaml`에서 `/data` 디스크를 붙이고, 서버는 `/data/version3-data.json`에 데이터를 저장합니다.

데이터를 바꾸기 전에 서버는 기존 JSON 파일을 `.bak` 파일로 복사합니다. 대표 계정은 `/data-backups`에서 백업 목록을 볼 수 있고, `/data-export`로 전체 운영 데이터를 JSON으로 내려받을 수 있습니다.

## 3. 공개 UI 연결

서버가 먼저 정상 실행되고 `/health`가 열려야 합니다. 그다음 공개 UI 배포 환경에 다음 값을 넣습니다.

```bash
VERSION3_API_BASE_URL=https://your-version3-server.example.com
NEXT_PUBLIC_VERSION3_API_BASE_URL=https://your-version3-server.example.com
```

UI 배포 전에는 다음 명령을 통과해야 합니다.

```bash
pnpm run verify:version3-cleanup
pnpm run verify:version3-release
pnpm run verify:version3-server
```

`verify:version3-cleanup`은 `out`, `.next`, `.env`, Version.3 로컬 데이터 파일, `.bak` 백업 파일 같은 빌드 산출물과 운영 데이터가 Git 커밋에 들어가지 않도록 확인합니다.

`verify:version3-release`는 공개 URL이 HTTPS인지, 로컬 주소가 아닌지, Apps Script/Preview 전환 플래그가 꺼져 있는지 확인합니다.

`verify:version3-server`는 로그인, 권한, 학생/강사/계정 생성, 상담요청, 공지, 감사 로그, 데이터 내보내기/가져오기, 백업 목록까지 실제 서버 API가 맞게 작동하는지 확인합니다.

## 4. GitHub 서버 이미지

`.github/workflows/version3-server-image.yml`은 Version.3 서버 Docker 이미지를 GitHub Container Registry에 올리는 워크플로입니다. GitHub Actions에서 `Build Version.3 Server Image`를 수동 실행하거나, 서버 파일이 바뀐 상태로 `main` 또는 `codex/v1-intranet`에 푸시하면 이미지를 만들 수 있습니다.

이미지 이름은 다음 형식입니다.

```bash
ghcr.io/ethicsjayden31/bonsung-version3-server:codex-v1-intranet
```

2026-07-01 기준으로 익명 pull manifest 조회가 통과했습니다.

```bash
ghcr.io/ethicsjayden31/bonsung-version3-server@sha256:ee21d65a6464a40219c103d69e03b658e669b09ca20e07b39932e454dd75570e
```

외부 호스트가 Docker 이미지를 직접 실행할 수 있다면 이 이미지를 사용하고, 환경값은 `.env.production.example` 기준으로 넣습니다. 반드시 `/data` 같은 영구 디스크를 붙여 `VERSION3_LOCAL_DATA_FILE=/data/version3-data.json`이 실제로 보존되게 해야 합니다.

## 5. 외부 서버 검증 워크플로

외부 호스트에 서버가 뜨면 GitHub Actions에서 `Verify External Version.3 Server`를 수동 실행합니다. 입력값 `server_url`에는 실제 HTTPS 서버 주소를 넣습니다.

이 워크플로는 두 가지를 확인합니다.

- `verify:version3-release`: 서버 주소가 HTTPS이고 로컬 주소가 아닌지 확인합니다.
- `verify:version3-server`: 로그인, 권한, 계정, 상담요청, 공지, 감사 로그, 데이터 내보내기/가져오기, 백업 목록 API가 실제 외부 서버에서 작동하는지 확인합니다.

이 검증이 통과하기 전에는 GitHub Pages의 `VERSION3_API_BASE_URL` 변수를 바꾸지 않습니다.

## 6. 첫 운영 순서

1. 외부 서버에 Version.3 서버를 배포합니다.
2. `/health`가 정상인지 확인합니다.
3. `verify:version3-production-env`로 서버 환경값을 확인합니다.
4. `Verify External Version.3 Server` 워크플로를 외부 서버 URL 대상으로 실행합니다.
5. GitHub Pages 배포 환경에 Version.3 서버 URL을 넣습니다.
6. `verify:version3-cleanup`, `verify:version3-release`, `build:pages`를 통과시킵니다.
7. 대표 계정으로 로그인한 뒤 임시 비밀번호를 즉시 바꿉니다.
8. 실제 학생, 강사, 매니저, 수강생 계정을 등록합니다.

## 7. 아직 완료로 보지 않는 경우

아래 중 하나라도 남아 있으면 최종 운영 완료가 아닙니다.

- 서버 URL이 아직 `http://127.0.0.1:4303` 같은 로컬 주소입니다.
- 공개 UI가 Apps Script나 Preview 데이터에 의존합니다.
- 서버 데이터 파일이 `memory` 또는 컨테이너 임시 경로에 있습니다.
- 대표 계정의 임시 비밀번호가 기본값입니다.
- 실제 외부 HTTPS 서버 URL로 `verify:version3-server`를 통과하지 않았습니다.
