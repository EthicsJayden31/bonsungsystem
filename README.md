# 본성뮤직 아카데미 인트라넷

본성뮤직 아카데미 내부 운영을 위한 설치형 없는 웹앱입니다. GitHub Pages가 화면을 제공하고, 비공개 Google Sheets와 Apps Script 웹앱이 데이터 저장, 로그인, 권한 검사를 담당합니다.

## 운영 주소

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

현재 운영 브랜치에는 기존 v1이 배포되어 있습니다. 이번 개선 버전은 기능 브랜치에서 검증한 뒤 운영 브랜치에 반영합니다.

## 주요 기능

- `admin`, `staff`, `teacher`, `student` 역할별 로그인과 메뉴 제한
- 관리자·직원용 계정, 수강생, 수강 등록, 반복 일정 관리
- 관리자용 로그인·페이지 조회·업무 처리 이용 현황
- 강사용 담당 수강생, 담당 과목, 예정 수업, 최근 수업일지 화면
- 수강생용 수강 과목, 수강 기간, 다음 수업, 학습 기록 화면
- 수업일지 템플릿, 이전 일지 불러오기, 자동 임시 저장
- 강사·수강생·과목·기간·내용 검색 필터
- 모바일 320px 이상에서 가로 스크롤 없이 세로로 재배치되는 화면
- 운영 API 연결 전 `?demo=1` 데모 모드

## 구조

```text
pages-preview/            GitHub Pages 정적 웹앱
  index.html
  config.js               Apps Script 배포 URL
  app.js                  화면, 상태, 권한별 업무 흐름
  styles.css              데스크톱·모바일 반응형 스타일
google-apps-script/
  Code.gs                 Google Sheets API, 인증, 권한, 이용 기록
docs/
  google-sheets-setup.md  운영 데이터와 Apps Script 연결
  github-pages.md         검증 및 배포 절차
```

저장소의 Next.js·Prisma 코드는 장기 확장용 초기 구조로 유지합니다. 현재 GitHub Pages 운영 경로는 `pages-preview/`와 `google-apps-script/`입니다.

## Google Sheets

운영 DB:

[본성뮤직 인트라넷 운영 DB v1](https://docs.google.com/spreadsheets/d/1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0/edit)

사용 시트:

| 시트 | 용도 |
| --- | --- |
| `계정` | 로그인 계정, 비밀번호 해시, 역할, 사용 상태 |
| `수강생` | 수강생·보호자 기본 정보, 상태, 기본 담당 강사 |
| `수강등록` | 과목, 강사, 수강 기간, 주간 반복 일정 |
| `수업일정` | 보강·임시 수업을 포함한 개별 일정 |
| `수업일지` | 수업 내용, 과제, 다음 목표, 출결 |
| `수업일지템플릿` | 강사별 빠른 작성 템플릿 |
| `이용기록` | 로그인, 페이지 조회, 주요 데이터 변경 기록 |
| `세션` | 로그인 세션과 만료 시간 |
| `설정` | 학원명, 시간대, 스키마 버전 |

연결과 배포 방법은 [Google Sheets 설정](docs/google-sheets-setup.md)을 따릅니다.

## 권한

| 역할 | 접근 범위 |
| --- | --- |
| admin | 모든 운영 데이터, 계정, 이용 현황 |
| staff | 계정·수강생·수강·일정·수업일지, 관리자 계정 변경 제외 |
| teacher | 본인 담당 수강생·수강·일정·수업일지 |
| student | 본인 수강·일정·수업일지, 내부 메모 제외 |

## 데모 확인

API가 배포되기 전에는 아래 주소로 화면을 확인합니다.

```text
pages-preview/index.html?demo=1
```

모든 데모 계정의 비밀번호는 `bonsung1`입니다.

| 아이디 | 역할 |
| --- | --- |
| `admin` | 관리자 |
| `staff` | 직원 |
| `teacher` | 강사 |
| `student` | 수강생 |

데모 데이터는 브라우저 로컬 저장소에만 기록되고 운영 Google Sheets에는 저장되지 않습니다.

## 검증

GitHub Actions는 정적 웹앱과 Apps Script의 JavaScript 문법을 검사합니다. 운영 반영 전에는 Chrome에서 관리자·강사·수강생 흐름과 390px·320px 모바일 화면을 직접 검증합니다.

자세한 절차는 [GitHub Pages 배포](docs/github-pages.md)를 참고합니다.

## 운영 기능 v3

등록·재등록, 공간 예약, 직원 직급과 근태, 회의, 통합 캘린더, 다크모드와 로그인 성능 개선은 [운영 기능 v3](docs/v3-operations.md)에 정리되어 있습니다.

운영 데이터와 분리된 로컬 테스트 화면:

```text
pages-preview/test.html
```

정적 파일 서버에서 `test.html`을 열면 관리자, 원장, 팀장, 사원, 강사, 수강생 계정으로 즉시 전환하면서 모든 기능을 샘플 데이터로 시험할 수 있습니다.

## 보안

- `.env`, 비밀번호, API 키, Apps Script `SETUP_KEY`를 커밋하지 않습니다.
- Google Sheets는 공개 공유하지 않습니다.
- 계정 비밀번호는 salt가 적용된 SHA-256 해시로 저장합니다.
- 운영 API URL은 공개 클라이언트 설정이므로 비밀값으로 취급하지 않습니다. 실제 데이터 보호는 서버의 세션·역할 검사로 수행합니다.
- 수강생에게는 보호자 연락처, 내부 메모, 이용 기록을 반환하지 않습니다.
