# Google Sheets 운영 DB 연결

운영 데이터 파일:

[본성뮤직 인트라넷 운영 DB v1](https://docs.google.com/spreadsheets/d/1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0/edit)

일반 사용자는 Google Sheet 주소를 입력하거나 연결 설정을 할 필요가 없습니다. 운영자가 Apps Script를 한 번 배포하고 `pages-preview/config.js`에 URL을 등록하면 모든 사용자는 로그인 화면에서 바로 시작합니다.

## 데이터 구조

Apps Script는 시작 시 필요한 시트와 헤더가 있는지 확인하고 누락된 시트를 자동 생성합니다.

| 시트 | 핵심 데이터 |
| --- | --- |
| `계정` | 계정, 역할, 비밀번호 해시, 사용 상태 |
| `수강생` | 학생·보호자 정보, 전공, 목표, 상태 |
| `수강등록` | 수강생, 강사, 과목, 기간, 반복 요일·시간 |
| `수업일정` | 개별 수업 날짜·시간·상태 |
| `수업일지` | 수업 내용, 과제, 목표, 출결, 내부 메모 |
| `수업일지템플릿` | 강사별 반복 작성 문구 |
| `이용기록` | 로그인·화면 조회·데이터 변경 이벤트 |
| `세션` | 세션 토큰과 만료 시간, 숨김 시트 |
| `설정` | 학원명, 시간대, 스키마 버전 |

## Apps Script 배포

1. 운영 Google Sheet에서 `확장 프로그램 > Apps Script`를 엽니다.
2. 기본 `Code.gs`를 저장소의 `google-apps-script/Code.gs` 내용으로 교체합니다.
3. `배포 > 새 배포 > 웹 앱`을 선택합니다.
4. 실행 사용자는 운영 DB 소유 계정으로 선택합니다.
5. GitHub Pages에서 호출할 수 있도록 조직 정책에 맞는 접근 권한을 선택합니다.
6. 배포 후 `/exec`로 끝나는 웹앱 URL을 복사합니다.
7. `pages-preview/config.js`의 `apiEndpoint` 값에 URL을 입력합니다.

```javascript
window.BONSUNG_CONFIG = {
  apiEndpoint: "https://script.google.com/macros/s/배포_ID/exec"
};
```

운영 사용자는 이 설정을 볼 필요가 없으며 브라우저별 연결 작업도 하지 않습니다.

## 코드 변경 후 업데이트

Apps Script 코드를 변경한 경우 기존 웹앱 배포를 새 버전으로 업데이트합니다. 배포 URL을 유지하면 `config.js`는 다시 수정할 필요가 없습니다.

## 초기 관리자

현재 운영 DB에는 초기 `admin` 계정이 생성되어 있습니다. 임시 비밀번호는 저장소에 기록하지 않고 관리자에게 별도로 전달합니다. 첫 로그인 후 새 비밀번호로 변경합니다.

새 Google Sheet 복사본을 만들 때만 다음 절차를 사용합니다.

1. Apps Script의 스크립트 속성에 긴 임의 문자열인 `SETUP_KEY`를 등록합니다.
2. 아래 임시 함수를 추가하고 한 번 실행합니다.
3. 생성이 끝나면 임시 함수와 `SETUP_KEY`를 삭제합니다.

```javascript
function createFirstAdmin() {
  bootstrapAdmin({
    setupKey: "스크립트 속성의 SETUP_KEY",
    loginId: "admin",
    password: "8자 이상의 초기 비밀번호",
    name: "원장 관리자",
    email: ""
  });
}
```

## 권한과 개인정보

- `admin`: 전체 접근 및 이용 현황 조회
- `staff`: 운영 데이터 관리, 관리자 계정 변경 제한
- `teacher`: 본인 담당 수강생·수업·수업일지
- `student`: 본인 수강·수업일지, 내부 메모 제외

Google Sheet는 공개 공유하지 않습니다. Apps Script가 모든 요청에서 세션과 역할을 다시 검사하므로 화면 메뉴를 숨기는 것만으로 권한을 처리하지 않습니다.

## 연결 확인

배포 URL을 브라우저에서 열었을 때 `ok: true`와 서비스 정보가 표시되어야 합니다. 이후 GitHub Pages 로그인 화면이 바로 나타나는지 확인합니다.

연결 실패 시 화면에는 운영자용 URL 입력란 대신 일반적인 서비스 연결 오류와 재시도 버튼만 표시됩니다.
