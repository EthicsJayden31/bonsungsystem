# 프로젝트 운영 메모

본성 스테이지 Version.3의 기준 운영 표면은 공식 Next.js UI와 Version.3 API입니다. 테스트 전용 프리뷰 앱, localStorage 더미 운영 데이터, 이전 역할명은 새 작업의 기준으로 사용하지 않습니다.

## 현재 기준

1. UI는 `app/`의 공식 화면만 사용합니다.
2. 데이터 저장은 Version.3 API가 담당합니다.
3. 저장소는 Google Sheets 어댑터, PostgreSQL + Apps Script 동기화, 또는 외부 서버의 지속 파일 저장소 중 하나를 사용합니다.
4. 역할명은 `admin`, `manager`, `coach`, `artist`로 통일합니다.
5. 배포 전 `typecheck`, `lint`, `verify:version3-server`, `verify:version3-cleanup`, `build`를 확인합니다.

## 작업 시 주의

- 이전 `pages-preview`, `/version3-test`, `version3-offline-inspection.html` 흐름을 되살리지 않습니다.
- 새 기능은 실제 운영 화면과 API 계약에 먼저 구현합니다.
- 문서나 환경 예시에 실제 비밀번호와 secret을 적지 않습니다.
- Notion 기록은 사용자가 다시 요청하기 전까지 수행하지 않습니다.
