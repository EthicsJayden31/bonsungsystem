# Google Sheets 전환 보조 연결

> Version.3의 기본 운영 데이터 원본은 별도 서버입니다. 이 문서는 legacy Apps Script 화면과 전환 검증을 위해 남겨둔 Google Sheets 연결 절차입니다. 공개 운영 배포의 기본 경로로 사용하지 않습니다.

전환 보조 데이터 파일:

[본성뮤직 인트라넷 운영 DB v1](https://docs.google.com/spreadsheets/d/1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0/edit)

일반 사용자는 Google Sheet 주소를 입력하거나 연결 설정을 할 필요가 없습니다. 전환 검증이 필요할 때 운영자가 Apps Script를 배포하고 `pages-preview/config.js`에 URL을 등록하면 legacy preview 화면에서 기존 흐름을 비교할 수 있습니다.

## 데이터 구조

Apps Script는 시작 시 필요한 시트와 헤더가 있는지 확인하고 누락된 시트를 자동 생성합니다.

| 시트 | 핵심 데이터 |
| --- | --- |
| `계정` | 계정, 역할, 비밀번호 해시, 사용 상태 |
| `수강생` | 보컬 수강생·보호자 정보, 목표, 상태 |
| `수강등록` | 수강생, 강사, 등록 기준, 기간, 반복 요일·시간 |
| `수업일정` | 개별 수업 날짜·시간·상태 |
| `수업일지` | 수업 내용, 과제, 목표, 출결, 내부 메모 |
| `수업일지템플릿` | 강사별 반복 작성 문구 |
| `이용기록` | 로그인·화면 조회·데이터 변경 이벤트 |
| `계정요청` | 로그인 전 신규 계정 요청과 승인·반려 이력 |
| `설정` | 로그인 화면 소개 문구와 운영 공지 팝업을 포함한 시스템 설정 |
| `세션` | 세션 토큰과 만료 시간, 숨김 시트 |
| `설정` | 학원명, 시간대, 스키마 버전 |

스키마 v6부터 수강생 분야는 `보컬`로 통일됩니다. `수업종류` 시트는 시니어, 프로 (입시·오디션), 아카데믹 (취미), 이벤트 (축가·행사)를 기본 등록 기준으로 사용하며, 운영 화면에서 명칭을 수정하거나 기준을 추가할 수 있습니다.

## Apps Script 배포

1. 운영 Google Sheet에서 `확장 프로그램 > Apps Script`를 엽니다.
2. 기본 `Code.gs`를 저장소의 `google-apps-script/Code.gs` 내용으로 교체합니다.
3. `배포 > 새 배포 > 웹 앱`을 선택합니다.
4. 실행 사용자는 운영 DB 소유 계정으로 선택합니다.
5. GitHub Pages에서 호출할 수 있도록 조직 정책에 맞는 접근 권한을 선택합니다.
6. 배포 후 `/exec`로 끝나는 웹앱 URL을 복사합니다.
7. `pages-preview/config.js`의 `apiEndpoint` 값에 URL을 입력합니다.
8. Version.3 공식 UI에서는 기본적으로 이 endpoint를 사용하지 않습니다. 전환 검증을 위해 `NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION=true`를 켠 경우에만 `NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT`를 같은 URL로 맞춥니다.

```javascript
window.BONSUNG_CONFIG = {
  apiEndpoint: "https://script.google.com/macros/s/배포_ID/exec"
};
```

운영 사용자는 이 설정을 볼 필요가 없으며 브라우저별 연결 작업도 하지 않습니다.

## 코드 변경 후 업데이트

Apps Script 코드를 변경한 경우 기존 웹앱 배포를 새 버전으로 업데이트합니다. 배포 URL을 유지하면 `config.js`와 `NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT`는 다시 수정할 필요가 없습니다.

## 초기 관리자

legacy 전환 보조 DB에는 초기 `admin` 계정이 생성되어 있을 수 있습니다. 임시 비밀번호는 저장소에 기록하지 않고 관리자에게 별도로 전달합니다. 첫 로그인 후 새 비밀번호로 변경합니다.

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

- `admin`: legacy 전체 접근 및 이용 현황 조회
- `staff`: legacy 운영 데이터 관리, 관리자 계정 변경 제한
- `teacher`: 본인 담당 수강생·수업·수업일지
- `student`: 본인 수강·수업일지, 내부 메모 제외

Google Sheet는 공개 공유하지 않습니다. 전환 보조 경로에서도 Apps Script가 모든 요청에서 세션과 역할을 다시 검사하므로 화면 메뉴를 숨기는 것만으로 권한을 처리하지 않습니다. Version.3 서버 운영 권한 기준은 `lib/version3-server-contract.ts`와 `docs/project/operating-surfaces.md`를 따릅니다.

## 연결 확인

전환 보조 배포 URL을 브라우저에서 열었을 때 `ok: true`와 서비스 정보가 표시되어야 합니다. 이후 legacy preview 또는 전환 플래그를 켠 GitHub Pages 로그인 화면에서 비교 검증합니다.

연결 실패 시 화면에는 운영자용 URL 입력란 대신 일반적인 서비스 연결 오류와 재시도 버튼만 표시됩니다.
