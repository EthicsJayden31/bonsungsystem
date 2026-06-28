# Review Fix Notes: 권한, 세션, 예약

이 문서는 최근 Codex Review에서 지적된 권한, 개인정보, 세션, 예약 관련 수정 기준을 정리한다.

## 운영 화면 구분

- Next 공식 UI: GitHub Pages의 `/`, `/login/`, `/dashboard/` 등 App Router 정적 화면이다.
- legacy-preview: 기존 Apps Script 운영 화면을 `/legacy-preview/` 아래에 보존한 화면이다.
- Next UI는 Apps Script 세션 토큰이 있으면 실사용 데이터를 먼저 읽고, 없거나 실패하면 preview 데이터를 보여준다.
- legacy-only 또는 student 계정은 Next UI 권한값을 유지하지 않고 legacy 화면으로 이동한다.

## 세션과 권한 저장소

- Next UI 권한 키는 `bonsung_role`이다.
- Apps Script 세션 키는 `bonsung_session_token`, 사용자 정보 키는 `bonsung_current_user`이다.
- preview 로그인, 실사용 로그인, 로그아웃, legacy-only 전환은 기존 세션 값을 먼저 정리해야 한다.
- GitHub Pages에서는 직접 이동 경로가 `/bonsungsystem` basePath를 포함해야 하므로 `assetPath` 기반 이동을 사용한다.

## 개인정보 노출 기준

- teacher 권한은 학생 목록과 학생 상세 모두에서 학생 연락처를 `권한 제한`으로 본다.
- teacher 권한은 보호자 연락처와 수납 정보를 볼 수 없다.
- 목록, 상세 패널, 모바일 카드가 동일한 마스킹 기준을 사용해야 한다.

## 예약 저장 기준

- 예약 목적값은 Apps Script backend와 일치해야 한다.
- admin/staff: `레슨`, `이론수업`, `회의`, `연습`
- teacher: `레슨`, `이론수업`, `연습`
- 예약 저장 성공 후 선택 슬롯과 자동 입력값은 초기화되어야 한다.
- 날짜, 공간, 시간대 필터를 바꾸면 현재 선택 슬롯과 상위 form prefill도 함께 초기화되어야 한다.
- 필터 결과가 비어도 필터 컨트롤은 유지되어야 하며, 빈 결과 메시지는 결과 영역에만 표시한다.

## 상세 보기 이동 기준

- 학생 상세와 강사 상세는 query/hash를 갱신한 뒤 실제 상세 패널로 스크롤되어야 한다.
- URL 예시는 `/students/?student=<id>#student-detail`, `/teachers/?teacher=<id>#teacher-detail`이다.

## 검증 시나리오

1. teacher preview 로그인 후 학생 목록과 학생 상세에서 연락처가 `권한 제한`으로 표시되는지 확인한다.
2. admin 또는 teacher 로그인 흔적이 있는 상태에서 legacy-only 계정으로 이동할 때 이전 `bonsung_role`이 남지 않는지 확인한다.
3. GitHub Pages 경로에서 legacy redirect가 `/bonsungsystem/legacy-preview/`로 동작하는지 확인한다.
4. 예약 가능한 slot 선택 후 저장 성공 시 같은 자동 입력값이 남아 중복 제출 가능한 상태가 되지 않는지 확인한다.
5. 예약 slot 선택 후 날짜, 공간, 시간대 필터를 바꾸면 선택 상태와 form prefill이 함께 사라지는지 확인한다.
6. 예약 목적 선택지가 frontend/backend 권한 기준과 일치하는지 확인한다.
7. 모바일 예약 화면에서 빈 필터 결과가 나와도 필터 컨트롤로 돌아갈 수 있는지 확인한다.
8. 학생/강사 상세 보기 클릭 후 상세 패널 위치로 이동하는지 확인한다.
9. 개인화 설정 저장 후 시작 화면, 화면 밀도, 모바일 메뉴 방식이 실제 UI에 반영되는지 확인한다.
10. preferences 관련 maximum update depth 또는 무한 렌더링 오류가 없는지 확인한다.
