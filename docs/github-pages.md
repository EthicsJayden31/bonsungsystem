# GitHub Pages 프리뷰

GitHub Pages는 정적 호스팅입니다. 따라서 이 배포는 운영용 보안 인트라넷이 아니라 화면 확인용 프리뷰입니다.

## 프리뷰 URL

저장소 Pages가 활성화되면 다음 주소에서 확인합니다.

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 동작 방식

- `pages-preview/index.html`은 GitHub Pages 전용 단일 정적 프리뷰입니다.
- `.github/workflows/pages.yml`이 `pages-preview/`를 GitHub Pages artifact로 배포합니다.
- 로그인은 Pages 프리뷰 전용 `localStorage` 역할 선택 방식입니다.
- Next.js 앱 전체 정적 export는 `npm run build:pages`로 별도 확인할 수 있습니다.

## GitHub 설정

1. GitHub 저장소 `Settings > Pages`로 이동합니다.
2. `Build and deployment`의 source를 `GitHub Actions`로 설정합니다.
3. `Actions` 탭에서 `Deploy GitHub Pages Preview` workflow를 실행합니다.

## 보안 주의

GitHub Pages 프리뷰는 정적 파일이므로 실제 인증, DB, 개인정보 보호를 보장하지 않습니다. 실제 운영은 Vercel, PostgreSQL, Auth.js 기반으로 배포해야 합니다.
