# 본성뮤직 아카데미 인트라넷 v1

본성뮤직 아카데미의 직원, 강사, 수강생이 설치 없이 사용하는 내부 운영 웹앱입니다. GitHub Pages에서 화면을 제공하고, 비공개 Google Sheets와 시트에 연결된 Apps Script 웹앱이 데이터 저장·로그인·권한 검사를 담당합니다.

## 운영 웹앱

```text
https://ethicsjayden31.github.io/bonsungsystem/
```

현재 구현된 핵심 흐름:

- 아이디와 비밀번호 로그인
- `admin`, `staff`, `teacher`, `student` 권한별 자동 이동
- 초기 비밀번호 강제 변경
- 직원의 계정 생성, 사용 중지, 비밀번호 초기화
- 직원의 수강생 등록·수정·담당 강사 배정
- 강사의 담당 수강생 조회와 수업일지 작성
- 수강생의 본인 수업일지 읽기
- 모바일 세로 전용 레이아웃
- API 연결 전 데모 모드

## Google Sheets 연결

운영 DB:

[본성뮤직 인트라넷 운영 DB v1](https://docs.google.com/spreadsheets/d/1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0/edit)

시트 탭:

- `계정`: 로그인 계정, 비밀번호 해시, 권한, 사용 상태
- `수강생`: 학생·보호자 기본 정보, 상태, 담당 강사
- `수업일지`: 수업 내용, 과제, 다음 목표, 출결
- `세션`: 로그인 세션, 만료 시간
- `설정`: 학원명, 시간대, 스키마 버전

Apps Script 설치와 초기 관리자 생성은 [docs/google-sheets-setup.md](docs/google-sheets-setup.md)를 따릅니다.

## 권한

| 권한 | 기능 |
| --- | --- |
| admin | 전체 계정·수강생·수업일지 관리 |
| staff | 직원·강사·수강생 계정 관리, 수강생 관리, 전체 수업일지 |
| teacher | 담당 수강생 조회, 본인 수업일지 작성 |
| student | 본인 수업일지 읽기 |

직원은 관리자 계정을 생성·중지·초기화할 수 없습니다. 수강생 계정에는 내부 메모가 반환되지 않습니다.

## 데모 로그인

첫 화면에서 `데모 데이터로 먼저 둘러보기`를 선택합니다.

| 아이디 | 비밀번호 | 권한 |
| --- | --- | --- |
| `admin` | `bonsung1` | 관리자 |
| `staff` | `bonsung1` | 직원 |
| `teacher` | `bonsung1` | 강사 |
| `student` | `bonsung1` | 수강생 |

데모 데이터는 해당 브라우저에만 저장되며 실제 Google Sheets에는 기록되지 않습니다.

## GitHub Pages 배포

`.github/workflows/pages.yml`이 `pages-preview/` 폴더를 배포합니다. 저장소 `Settings > Pages`의 Source는 `GitHub Actions`로 설정합니다.

자세한 내용은 [docs/github-pages.md](docs/github-pages.md)를 참고합니다.

## 로컬 확인

정적 웹앱이므로 [pages-preview/index.html](pages-preview/index.html)을 Chrome에서 열어 확인할 수 있습니다. 별도의 빌드 과정은 필요하지 않습니다.

저장소에는 기존 Next.js·Prisma 기반 v1 구조도 남아 있지만, 현재 GitHub Pages 운영 경로는 `pages-preview/`와 `google-apps-script/`입니다.

## 보안

- `.env`, 비밀번호, Apps Script `SETUP_KEY`를 커밋하지 않습니다.
- Google Sheets는 공개 공유하지 않습니다.
- 계정 비밀번호는 평문이 아닌 salt가 적용된 해시로 저장합니다.
- Apps Script 배포 URL은 브라우저 로컬 저장소에만 보관합니다.
- 실제 개인정보를 넣기 전에 Google Workspace의 공유·접근 정책을 확인합니다.
