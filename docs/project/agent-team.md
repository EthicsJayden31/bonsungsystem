# 본성_인트라넷 대화 운영 가이드

이 프로젝트의 작업 대화는 모두 같은 로컬 프로젝트 폴더를 기준으로 사용합니다.

- 프로젝트 폴더: `C:\Users\breat\Documents\Codex\2026-06-07\mvp-next-js-app-router-typescript`
- 배포 확인용 worktree: `C:\Users\breat\Documents\Codex\2026-06-07\mvp-next-js-app-router-typescript-pages-deploy`
- GitHub 저장소: `EthicsJayden31/bonsungsystem`
- GitHub Pages 배포 브랜치: `codex/v1-intranet`

## 고정된 대화

| 대화 | 역할 | 사용 시점 |
| --- | --- | --- |
| `본성_인트라넷 구축_사전작업` | 초기 설계와 전체 배경 | 최초 설계 의도, Prisma/문서 초안을 다시 확인할 때 |
| `본성_인트라넷_팀장` | 작업 분해와 검토 | 여러 요청을 우선순위와 담당 영역으로 나눌 때 |
| `본성_인트라넷_디자인` | 화면과 GUI | 모바일, 레이아웃, 버튼, 문구, 사용성 조정 |
| `본성_인트라넷_관리` | 기능 설정과 데이터 운영 | 권한, Google Sheets, Apps Script, 운영 데이터 규칙 |
| `본성_인트라넷_프로그래밍` | 코드 분석과 구현 | 버그 수정, 리팩터링, 배포 코드 정리 |

## 중요한 운영 원칙

Codex의 각 대화는 자동으로 서로의 새 메시지를 공유하지 않습니다. 그래서 작업을 이어갈 때는 다음 중 하나를 사용합니다.

1. 이슈나 문서에 작업 지시를 남긴다.
2. 관련 대화에 같은 기준 브랜치와 확인할 파일을 명시한다.
3. 페이지 반영 작업은 반드시 `codex/v1-intranet` 브랜치 또는 배포 worktree에서 확인한다.

## 작업 분류

새 요청은 아래 세 분류 중 하나로 등록합니다.

- 페이지 코드 분석 및 유지보수: `area:maintenance`
- 세부 기능 설정 조정 및 개선: `area:feature-settings`
- 페이지 디자인 및 GUI 조정: `area:gui`

## 페이지 반영 체크리스트

1. 변경 파일이 `pages-preview/` 또는 `google-apps-script/` 중 어디에 해당하는지 확인한다.
2. GitHub Pages 화면 변경은 `codex/v1-intranet`에 푸시되어야 실제 온라인 주소에 반영된다.
3. Apps Script 변경은 GitHub 푸시만으로는 운영 API에 반영되지 않으므로, Apps Script 편집기에서 새 버전 배포가 필요하다.
4. 배포 후 GitHub Actions의 `Deploy GitHub Pages Preview` 성공 여부를 확인한다.
5. Chrome에서 운영 주소와 테스트 주소를 열어 실제 화면을 확인한다.

## 권장 작업 흐름

1. `본성_인트라넷_팀장`에서 요구사항을 분류한다.
2. 필요하면 `디자인`, `관리`, `프로그래밍` 대화로 세부 지시를 보낸다.
3. 최종 구현은 하나의 기준 브랜치에서 통합한다.
4. 배포 브랜치 `codex/v1-intranet`에 반영한다.
5. GitHub Pages와 Chrome에서 확인한다.
