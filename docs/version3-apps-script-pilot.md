# Apps Script 저장소 운영 메모

이 문서는 이전 프리뷰 앱 기준의 파일이 아니라, 현재 Version.3 API가 Apps Script/Google Sheets 계열 저장소와 연결될 때 확인할 항목을 정리합니다.

## 기준

- 공식 화면은 `app/`의 Next.js UI입니다.
- 브라우저 localStorage는 운영 데이터 원본이 아닙니다.
- Apps Script 코드는 `apps-script/version3-apps-script.gs`를 사용합니다.
- 역할명은 `admin`, `manager`, `coach`, `artist`입니다.

## 점검

```bash
pnpm run prepare:version3-apps-script-sheets
pnpm run setup:version3-google-sheets
pnpm run verify:version3-google-sheets
pnpm run verify:version3-server
```

## 초기 데이터

현재 초기 시트 생성기는 Admin 계정과 필수 헤더만 준비합니다. 실제 Artist, Coach, 프로그램, 일정 데이터는 Version.3 서버의 운영 seed 또는 Google Sheets 상태 데이터에서 관리합니다. 예전 테스트 수업, 테스트 예약, 테스트 출결 더미 데이터는 생성하지 않습니다.
