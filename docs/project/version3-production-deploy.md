# Version.3 공개 서버 배포 점검표

이 문서는 본성뮤직 Version.3를 실제 학원 운영 서버에 올리고, 공개 GitHub Pages UI와 연결하기 위한 기준입니다. 최종 운영에서는 학생, 강사, 매니저, 대표 계정과 학원 운영 데이터가 Apps Script가 아니라 별도 Version.3 서버에 저장되어야 합니다.

## 1. 서버 환경값

외부 서버에는 `.env.production.example`을 기준으로 환경값을 넣습니다.

- `NODE_ENV=production`
- `VERSION3_SERVER_HOST=0.0.0.0`
- `VERSION3_LOCAL_SERVER_PASSWORD`: 기본값 `version3` 금지, 12자 이상의 임시 비밀번호 사용
- `VERSION3_ALLOWED_ORIGINS`: 공식 UI 주소만 입력, 예: `https://ethicsjayden31.github.io`
- `VERSION3_LOCAL_DATA_FILE`: `/data/version3-data.json`처럼 영구 디스크 경로 사용
- `VERSION3_SESSION_TTL_HOURS`: 보통 12시간

배포 전에 서버 환경값은 다음 명령으로 확인합니다.

```bash
pnpm run verify:version3-production-env
```

## 2. 데이터 보존

운영 데이터는 컨테이너 내부 임시 공간이 아니라 외부 서버의 영구 디스크에 저장해야 합니다. Render 예시는 `render.yaml`에서 `/data` 디스크를 붙이고, 서버가 `/data/version3-data.json`에 데이터를 저장하게 합니다.

데이터를 바꾸기 전 서버는 기존 JSON 파일을 `.bak` 백업 파일로 복사합니다. 대표 계정은 `/data-backups`에서 백업 목록을 확인할 수 있고, `/data-export`로 전체 운영 데이터를 JSON으로 내려받을 수 있습니다.

## 3. 서버 이미지

GitHub Actions의 `Build Version.3 Server Image` 워크플로우는 Version.3 서버 Docker 이미지를 GitHub Container Registry에 올립니다.

이미지 태그:

```text
ghcr.io/ethicsjayden31/bonsung-version3-server:codex-v1-intranet
```

2026-07-01 기준 확인된 digest:

```text
sha256:ca0f49d1e9df82b728807311f18a680fb14b7c3fb1f15cbb682267b14094f0d2
```

외부 호스트에서 이 이미지를 실행할 때는 반드시 `/data` 같은 영구 디스크를 붙이고 `VERSION3_LOCAL_DATA_FILE=/data/version3-data.json`을 사용합니다.

## 4. 외부 서버 단독 검증

서버가 외부 HTTPS 주소에서 켜지면 GitHub Actions에서 `Verify External Version.3 Server`를 수동 실행합니다.

입력값 `server_url`에는 실제 서버 주소를 넣습니다.

```text
https://your-version3-server.example.com
```

이 워크플로우는 두 가지를 확인합니다.

- `verify:version3-release`: URL이 공개 HTTPS 주소인지, localhost가 아닌지, 전환용 Apps Script/Preview 플래그가 꺼져 있는지 확인합니다.
- `verify:version3-server`: 로그인, 계정, 권한, 학생 등록, 강사 등록, 일방향 상담요청, 공지, 감사 로그, 데이터 내보내기/가져오기, 백업 목록 API가 실제 서버에서 동작하는지 확인합니다.

이 검증은 서버만 시험하는 용도입니다. 이 단계만으로 공개 UI가 서버에 연결되지는 않습니다.

## 5. 공개 UI 연결

실제로 공개 GitHub Pages UI를 외부 서버에 연결할 때는 `Deploy GitHub Pages Preview` 워크플로우를 수동 실행합니다.

입력값:

- `server_url`: 실제 외부 HTTPS Version.3 서버 URL
- `save_verified_server_url`: 보통 `true`

이 워크플로우는 먼저 `server_url`로 `verify:version3-release`와 `verify:version3-server`를 실행합니다. 두 검증을 모두 통과한 경우에만 `VERSION3_API_BASE_URL` 저장소 변수를 저장하고, 같은 URL을 `NEXT_PUBLIC_VERSION3_API_BASE_URL`로 주입해 공개 UI를 다시 빌드합니다.

즉, 검증되지 않은 서버 URL은 공개 UI에 연결하지 않습니다.

## 6. 첫 운영 순서

1. 외부 서버에 Version.3 서버 이미지를 배포합니다.
2. `/health`가 정상인지 확인합니다.
3. `verify:version3-production-env` 기준에 맞는 환경값을 사용합니다.
4. `Verify External Version.3 Server`로 서버 단독 검증을 실행합니다.
5. 통과하면 `Deploy GitHub Pages Preview`를 `server_url`과 함께 수동 실행합니다.
6. 공개 점검 페이지 `version3-inspection.html`에서 같은 서버 URL을 넣고 `/health`를 확인합니다.
7. 대표 계정으로 로그인해 임시 비밀번호를 즉시 변경합니다.
8. 실제 대표, 매니저, 강사, 수강생 계정을 등록합니다.
9. 학생 등록 화면에서 학생 기록을 만들고, 이어서 수강생 계정을 연결합니다.
10. 공지 작성, 상담요청, 데이터 내보내기, 감사 로그를 실제 운영 계정으로 확인합니다.

## 7. 완료로 보지 않는 상태

아래 중 하나라도 해당하면 최종 운영 완료가 아닙니다.

- 서버 URL이 `http://127.0.0.1:4303` 또는 `localhost` 같은 로컬 주소입니다.
- 공개 UI가 Apps Script나 Preview 데이터에 의존합니다.
- 서버 데이터 파일이 `memory` 또는 컨테이너 임시 경로에 있습니다.
- 대표 계정의 임시 비밀번호가 기본값입니다.
- 실제 외부 HTTPS 서버 URL로 `verify:version3-server`를 통과하지 않았습니다.
- `Deploy GitHub Pages Preview`가 검증된 `server_url`로 성공하지 않았습니다.

## 8. 관련 문서

- `docs/project/version3-verified-connection.md`: 검증된 서버 URL이 공개 UI에 연결되는 절차
- `docs/project/operating-surfaces.md`: Version.3 화면, 권한, 서버 계약 기준
- `docs/project/external-server-candidates.md`: 외부 서버 후보 검토
- `public/version3-inspection.html`: 온라인 임시 점검 페이지
