# 프로젝트 운영 기준

이 폴더는 본성뮤직 인트라넷을 앞으로 개발할 때 필요한 최소 운영 기준을 보관합니다.

## 기준 브랜치

- 배포 기준: `codex/v1-intranet`
- 작업 브랜치: `codex/` 접두사 사용
- 공개 URL: `https://ethicsjayden31.github.io/bonsungsystem/`

## 작업 원칙

1. 먼저 `codex/v1-intranet` 기준 worktree에서 작업 중인지 확인합니다.
2. 기능 구현 전 `docs/project/operating-surfaces.md`를 확인합니다.
3. Version.3 공식 화면과 별도 서버 계약을 우선 구현합니다. `pages-preview/`와 `google-apps-script/`는 전환 보조 경로이며 기본 운영 경로로 되돌리지 않습니다.
4. 계정 권한과 개인정보 변경은 대표, 매니저, 강사, 수강생 흐름을 각각 검증합니다.
5. 모바일 390px와 320px 화면도 완료 기준에 포함합니다.

## 관련 문서

- `docs/project/operating-surfaces.md`: Version.3 화면, 서버 계약, 운영 표면 기준
- `docs/project/external-server-candidates.md`: Base44, Lovable, 별도 Node 서버 후보 검토 기준
- `docs/project/version3-production-deploy.md`: Version.3 공개 서버 환경값, 데이터 보존, 배포 전 검증 점검표
- `docs/project/agent-team.md`: 팀장, 프로그래밍, 디자인, 데이터관리, 업무기록 역할 기준
- `docs/project/task-template.md`: 반복 작업 지시서 양식

## 기본 검증

```text
pnpm run typecheck
pnpm run lint
pnpm run build:pages
pnpm run verify:surfaces
pnpm run verify:version3-server
pnpm run verify:version3-production-env
pnpm run verify:version3-cleanup
```

공개 운영 배포 전에는 실제 서버 URL로 다음 검증도 통과해야 합니다.

```text
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm run verify:version3-release
```

배포 전에는 `/`, `/login/`, `/dashboard/` 공개 URL을 확인합니다. `NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true`로 전환 검증을 켠 경우에만 `/legacy-preview/`를 확인합니다.
