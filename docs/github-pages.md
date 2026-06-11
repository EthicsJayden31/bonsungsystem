# GitHub Pages 웹앱

본성뮤직 인트라넷 v1은 GitHub Pages에서 설치 없이 실행되는 단일 페이지 웹앱이다. 실제 데이터는 비공개 Google Sheets에 저장하고, 시트에 연결된 Apps Script 웹앱이 로그인과 권한 검사를 담당한다.

## 웹앱 URL

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 동작 방식

- `pages-preview/`가 GitHub Pages 배포 대상이다.
- `pages-preview/app.js`가 로그인, 권한별 메뉴, 계정·수강생·수업일지 화면을 제공한다.
- `google-apps-script/Code.gs`가 Google Sheets 읽기·쓰기와 인증을 처리한다.
- API 주소와 세션 토큰은 사용자의 브라우저에만 저장된다.
- API 연결 전에는 데모 계정으로 업무 흐름을 확인할 수 있다.

## GitHub 설정

1. 저장소의 `Settings > Pages`로 이동한다.
2. `Build and deployment`의 Source를 `GitHub Actions`로 설정한다.
3. `Actions`에서 `Deploy GitHub Pages Preview` 워크플로를 실행한다.

## 운영 연결

Google Sheets와 Apps Script 설치 절차는 `docs/google-sheets-setup.md`를 따른다. Google Sheets 파일은 공개 공유하지 않는다.

GitHub Pages 소스는 누구나 열람할 수 있다. 비밀번호, Sheets 편집 권한, `SETUP_KEY` 같은 비밀값을 저장소에 커밋하면 안 된다.
