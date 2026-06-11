# Google Sheets 운영 DB 연결

운영 데이터 파일: [본성뮤직 인트라넷 운영 DB v1](https://docs.google.com/spreadsheets/d/1TSrqeLgrgcVdj6LD4nf9rFs4Lko95HMoerOBIvfqbZ0/edit)

GitHub Pages는 공개 정적 웹앱이므로 Google Sheets를 브라우저에서 직접 읽지 않는다. 시트에 연결된 Apps Script 웹앱이 인증과 권한 검사를 수행한다.

## Apps Script 설치

1. 운영 DB를 연다.
2. `확장 프로그램 > Apps Script`를 연다.
3. 기본 `Code.gs` 내용을 지우고 저장소의 `google-apps-script/Code.gs` 내용을 붙여넣는다.
4. `프로젝트 설정 > 스크립트 속성`에 `SETUP_KEY`를 추가한다. 값은 길고 임의적인 일회성 문자열로 정한다.
5. `배포 > 새 배포 > 웹 앱`을 선택한다.
6. 실행 사용자는 `나`, 액세스 권한은 실제 사용할 Google Workspace 정책에 맞춰 선택한다. GitHub Pages에서 접근하려면 외부 요청이 가능한 배포 설정이 필요하다.
7. 배포 후 `/exec`로 끝나는 웹앱 URL을 복사한다.

## 초기 관리자

연결된 운영 DB에는 `admin` 초기 관리자 계정이 생성되어 있다. 임시 비밀번호는 저장소에 기록하지 않고 관리자에게 별도로 전달한다. 첫 로그인 직후 반드시 새 비밀번호로 변경한다.

새 Google Sheets 복사본을 따로 구축할 때만 Apps Script 편집기에서 아래 임시 함수를 추가하고 한 번 실행한다. 실행 후 함수와 `SETUP_KEY` 속성을 삭제한다.

```javascript
function createFirstAdmin() {
  const result = bootstrapAdmin({
    setupKey: "스크립트 속성에 등록한 SETUP_KEY",
    loginId: "admin",
    password: "8자 이상의 초기 비밀번호",
    name: "원장 관리자",
    email: ""
  });
  console.log(result);
}
```

관리자 계정으로 로그인한 뒤 웹앱의 `계정 관리`에서 직원, 강사, 수강생 계정을 생성한다.

새로 생성되거나 비밀번호가 초기화된 계정은 다음 로그인 직후 `내 계정` 화면으로 이동한다. 사용자는 현재 비밀번호와 새 비밀번호를 입력해야 다른 업무 메뉴를 사용할 수 있다.

## 웹앱 연결

1. GitHub Pages 웹앱을 연다.
2. 첫 화면의 `Apps Script 웹앱 주소`에 배포 URL을 입력한다.
3. `Google Sheets 연결`을 누른다.
4. 발급한 아이디와 비밀번호로 로그인한다.

API 주소와 세션 토큰은 사용 중인 브라우저의 로컬 저장소에만 보관한다. 시트 공유 설정은 비공개로 유지한다.

## 권한

| 권한 | 접근 범위 |
| --- | --- |
| admin | 전체 계정, 수강생, 수업일지 |
| staff | 계정 관리, 수강생 관리, 전체 수업일지 |
| teacher | 본인 담당 수강생, 본인이 작성한 수업일지 |
| student | 본인 수업일지 읽기 |

직원은 관리자 계정을 생성할 수 없고, 수강생에게는 내부 메모가 반환되지 않는다.

계정 관리에서는 계정 사용 중지·재개와 초기 비밀번호 재발급이 가능하다. 직원은 관리자 계정에 이 작업을 수행할 수 없으며, 현재 로그인한 본인 계정도 중지할 수 없다.

수강생 관리에서는 기본 정보, 보호자 연락처, 상태, 담당 강사, 목표와 메모를 등록하고 수정할 수 있다.
