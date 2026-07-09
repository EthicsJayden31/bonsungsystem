# Version.3 운영 표면

## 공식 운영 표면

- 화면: `app/`의 Next.js App Router 화면
- API: `/api/version3` 또는 외부 Version.3 서버
- 저장소: Google Sheets 어댑터, PostgreSQL + Apps Script 동기화, 또는 지속 파일 저장소
- 계정 역할: `admin`, `manager`, `coach`, `artist`

## 제거된 이전 표면

다음 표면은 더 이상 운영 기준으로 사용하지 않습니다.

- `pages-preview/`
- `google-apps-script/Code.gs`
- `/version3-test/`
- `public/version3-inspection.html`
- `public/version3-offline-inspection.html`
- Preview/localStorage 계정 초안
- demo 데이터 자동 보충

## 권한 기준

- Admin: 전체 데이터, 계정, 권한, 환경 설정, 감사 로그, 백업/가져오기 관리
- Manager: 운영 데이터, Artist/Coach, 상담, 수강, 수납, 계정 요청 승인, 비밀번호 초기화
- Coach: 담당 Artist, 수업, 출결, 레슨노트, 예약
- Artist: 본인 수업, 레슨노트, 예약, 공지, 상담요청

## 데이터 기준

서버 호출이 실패하면 화면은 더미 데이터를 대신 보여주지 않습니다. 연결 실패 상태를 표시하고, 운영자가 API와 저장소 상태를 확인해야 합니다.

서버가 빈 배열을 내려주면 화면도 빈 목록을 보여줍니다. 빈 화면을 채우기 위해 자동 샘플 데이터를 생성하지 않습니다.

## 검증 기준

```bash
pnpm run typecheck
pnpm run lint
pnpm run verify:version3-server
pnpm run verify:version3-vercel-api
pnpm run verify:version3-cleanup
pnpm run build
```

공개 배포 전에는 실제 HTTPS API 주소로 다음을 실행합니다.

```bash
VERSION3_API_BASE_URL=https://your-version3-server.example pnpm run verify:version3-release
```
