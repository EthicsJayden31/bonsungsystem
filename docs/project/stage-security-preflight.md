# 본성 스테이지 보안 사전 점검

## 공개 배포 전 확인

```bash
pnpm run typecheck
pnpm run lint
pnpm run verify:stage-production-env
pnpm run verify:stage-server
pnpm run verify:stage-cleanup
```

## 비밀값 관리

다음 값은 Git, README, 공개 문서, 브라우저 번들에 넣지 않습니다.

- `BONSUNG_ADMIN_INITIAL_PASSWORD`
- `BONSUNG_LOCAL_SERVER_PASSWORD`
- `BONSUNG_SESSION_SECRET`
- `BONSUNG_DATABASE_URL`
- `BONSUNG_GOOGLE_SERVICE_ACCOUNT_JSON`
- `BONSUNG_GOOGLE_PRIVATE_KEY`
- `BONSUNG_APPS_SCRIPT_SYNC_PASSWORD`
- `CRON_SECRET`

## 운영 원칙

- 운영 저장소는 `memory`를 사용하지 않습니다.
- 운영 CORS는 공식 UI origin만 허용합니다.
- 세션 토큰은 해시 저장소를 사용합니다.
- 데이터 내보내기에는 비밀번호와 세션 원문이 포함되면 안 됩니다.
- 보안 패치 후에는 Admin 초기 비밀번호, 저장소 secret, 배포 토큰을 회전합니다.
