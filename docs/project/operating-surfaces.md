# 화면 구분 기준

본성뮤직 인트라넷에는 현재 두 개의 운영 표면이 있습니다.

## 1. 공식 Next UI

- 경로: `/`, `/login/`, `/dashboard/`, `/students/`, `/teachers/`, `/practice-rooms/` 등
- 목적: 앞으로 사용할 공식 브랜드 운영 화면
- 데이터:
  - Apps Script 세션 토큰이 있으면 Google Sheets 운영 데이터를 우선 사용합니다.
  - 세션이 없거나 연결이 실패하면 preview 데이터를 표시합니다.
- 저장:
  - 가능한 저장 액션은 Apps Script API로 전달합니다.
  - 실패하면 사용자에게 명확한 오류를 보여줘야 합니다.

## 2. legacy Apps Script 화면

- 경로: `/legacy-preview/`
- 원본: `pages-preview/`
- 목적: 기존 실사용 흐름 보존 및 비교 기준
- API: `pages-preview/config.js`의 Apps Script Web App URL

Next UI의 저장 기능이 충분히 안정화될 때까지 legacy 화면은 유지합니다.

## 권한 기준

| 권한 | 기준 |
| --- | --- |
| admin | 전체 메뉴와 데이터 점검 접근 가능 |
| staff | 운영 관리 메뉴 접근 가능, 관리자 설정 일부 제한 |
| teacher | 담당 학생/수업/출결/레슨노트/예약 중심, 수납 및 민감정보 차단 |
| student | Next UI가 아니라 `/legacy-preview/`로 이동 |

## 다음 구현 우선순위

1. 학생별/강사별 상세 데이터 조회와 관리
2. 모바일 앱형 강의실/연습실 예약 GUI
3. 개인화 설정의 실제 UI 반영
4. 데이터 점검과 저장 실패 안내 강화
