# 본성 스테이지 서버 연결 확인

외부 본성 스테이지 서버를 GitHub Pages 또는 Vercel UI에 연결하기 전에 다음을 확인합니다.

```bash
BONSUNG_API_BASE_URL=https://your-stage-server.example pnpm run verify:stage-release
BONSUNG_SERVER_VERIFY_BASE_URL=https://your-stage-server.example pnpm run verify:stage-server
```

정상 조건:

- API 주소가 HTTPS입니다.
- API 주소가 localhost가 아닙니다.
- `/health`가 본성 스테이지 서비스를 반환합니다.
- Admin, Manager, Coach, Artist 권한 검증이 통과합니다.
- 데이터 저장소가 지속 모드입니다.
- 더미/프리뷰 데이터 fallback이 없습니다.

연결이 확인되면 `NEXT_PUBLIC_BONSUNG_API_BASE_URL`에 같은 주소를 설정합니다. Vercel UI와 API를 같은 프로젝트에서 운영할 때는 `/api/stage`을 사용합니다.
