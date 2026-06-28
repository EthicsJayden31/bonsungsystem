# 프로젝트 운영 기준

이 폴더는 본성뮤직 인트라넷을 앞으로 개발할 때 필요한 최소 운영 기준만 보관합니다.

## 기준 브랜치

- 배포 기준: `codex/v1-intranet`
- 작업 브랜치: `codex/` 접두어 사용
- 공개 URL: `https://ethicsjayden31.github.io/bonsungsystem/`

## 작업 원칙

1. 먼저 `codex/v1-intranet` 기준 worktree에서 작업 중인지 확인합니다.
2. 기능 구현 전 `docs/project/operating-surfaces.md`를 확인합니다.
3. `pages-preview/`와 `google-apps-script/`는 legacy 실사용 흐름이므로 무심코 삭제하지 않습니다.
4. 저장/권한/개인정보 변경은 teacher, student, admin 흐름을 함께 검증합니다.
5. 모바일 390px와 320px 화면을 완료 기준에 포함합니다.

## 기본 검증

```text
pnpm typecheck
pnpm lint
pnpm build:pages
pnpm verify:surfaces
```

배포 후에는 `/`, `/login/`, `/dashboard/`, `/legacy-preview/` 공개 URL을 확인합니다.
