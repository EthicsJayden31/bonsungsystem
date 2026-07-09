# GitHub Pages 배포

GitHub Pages는 본성 스테이지의 공식 Next.js UI를 정적 파일로 배포합니다. 데이터 저장, 로그인, 권한 확인, 감사 로그는 `NEXT_PUBLIC_VERSION3_API_BASE_URL`이 가리키는 Version.3 API가 처리합니다.

## 운영 주소

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 배포 흐름

1. 의존성을 설치합니다.
2. 타입 검사와 린트를 실행합니다.
3. 정리 검증으로 생성물과 비밀 파일이 Git에 섞이지 않았는지 확인합니다.
4. 운영 API URL이 주어진 경우 HTTPS 주소인지 확인합니다.
5. Next.js 정적 사이트를 빌드합니다.
6. API URL이 주어진 경우 Version.3 서버 계약을 검증합니다.
7. `main` 또는 `codex/v1-intranet` 브랜치에서만 Pages에 배포합니다.

## 필수 저장소 변수

```text
VERSION3_API_BASE_URL=https://your-version3-server.example
```

이 값은 공개 배포에서 빈 값이면 안 됩니다. `localhost`, `127.0.0.1`, `http://` 주소는 운영 배포에 사용할 수 없습니다.

## 사용하지 않는 이전 경로

다음 경로는 현재 운영 배포 기준에서 제거되었습니다.

```text
pages-preview/
legacy-preview/
/version3-test/
public/version3-offline-inspection.html
```

운영 점검은 별도 프리뷰 앱이 아니라 공식 UI와 실제 Version.3 API 계약으로 진행합니다.
