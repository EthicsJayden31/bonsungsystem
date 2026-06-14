# GitHub Pages 웹앱

본성뮤직 인트라넷은 `pages-preview/`를 GitHub Pages에 배포하는 정적 웹앱입니다. 데이터와 인증은 비공개 Google Sheets에 연결된 Apps Script가 처리합니다.

## 운영 주소

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

## 자동 배포

`.github/workflows/pages.yml`은 다음을 수행합니다.

1. `config.js`, `app.js`, `Code.gs` JavaScript 문법 검사
2. `pages-preview/` 배포 파일 업로드
3. 운영 브랜치에서만 GitHub Pages 배포

기능 브랜치는 문법 검사와 배포 파일 생성까지만 수행하며 운영 페이지를 변경하지 않습니다.

## 운영 반영 순서

1. 기능 브랜치에서 GitHub Actions 검사를 통과합니다.
2. Apps Script의 기존 웹앱 배포를 새 버전으로 업데이트합니다.
3. 배포 URL이 `pages-preview/config.js`에 들어 있는지 확인합니다.
4. Chrome에서 관리자, 강사, 수강생 역할을 검증합니다.
5. 운영 브랜치 `codex/v1-intranet`에 병합합니다.
6. Pages 배포 완료 후 운영 주소를 다시 검증합니다.

## Chrome 수동 검증

### 관리자

- 로그인 후 `오늘의 운영` 대시보드가 보이는지 확인
- 계정·수강생·수강 등록·개별 일정 생성
- `이용 현황`에서 로그인과 업무 이벤트 확인
- 수업일지 필터와 상세 화면 확인

### 강사

- 본인 담당 수강생과 수업만 보이는지 확인
- 담당 과목과 예정 수업 확인
- 이전 일지 불러오기, 템플릿, 임시 저장, 일지 작성 확인
- 다른 강사의 개인정보와 관리자 메뉴가 보이지 않는지 확인

### 수강생

- 본인 수강 과목, 수강 기간, 다음 수업 확인
- 본인 수업일지만 보이는지 확인
- 내부 메모와 운영 메뉴가 보이지 않는지 확인

### 모바일

- Chrome DevTools에서 390x844와 320x800 확인
- 페이지 전체에 가로 스크롤이 없는지 확인
- 표가 라벨이 포함된 세로 카드로 변환되는지 확인
- 하단 메뉴, 전체 메뉴, 입력 폼, 모달이 화면 너비 안에 들어오는지 확인
- 긴 이름·과목·메모가 잘리거나 다른 요소와 겹치지 않는지 확인

## GitHub 설정

저장소 `Settings > Pages`의 Source는 `GitHub Actions`로 설정합니다. 비밀번호, Sheet 편집 권한, `SETUP_KEY` 같은 비밀값은 GitHub Pages 소스에 넣지 않습니다.
