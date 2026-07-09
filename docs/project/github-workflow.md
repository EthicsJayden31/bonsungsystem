# GitHub 연동 운영 방식

## Repository

- 저장소: `EthicsJayden31/bonsungsystem`
- 운영 Pages 주소: `https://ethicsjayden31.github.io/bonsungsystem/`
- 기본 작업 브랜치 접두사: `codex/`

## Issue 작성

GitHub에서 새 Issue를 만들 때 다음 템플릿 중 하나를 선택합니다.

- `페이지 코드 분석 및 유지보수`
- `세부 기능 설정 조정 및 개선`
- `페이지 디자인 및 GUI 조정`

각 템플릿은 자동으로 대응 label을 붙이도록 구성되어 있습니다.

## Label 규칙

| label | 의미 |
| --- | --- |
| `area:maintenance` | 코드 분석, 유지보수, 버그 조사, 정리 |
| `area:feature-settings` | 기능 설정, 운영 정책, 권한, 데이터 동작 |
| `area:gui` | 화면 구성, 모바일, 버튼, 폼, 시각 디자인 |
| `priority:high` | 운영 사용에 직접 영향을 주는 긴급 작업 |
| `priority:normal` | 일반 개선 작업 |
| `needs:chrome-check` | Chrome 화면 확인 필요 |
| `needs:server-contract` | 본성 스테이지 서버 계약 또는 운영 데이터 확인 필요 |
| `needs:apps-script` | 전환 보조 Apps Script 또는 Google Sheets 확인 필요 |

## PR 작성

PR 설명에는 다음을 포함합니다.

- 작업 분류
- 구현 요약
- 검증 결과
- 운영 반영 시 주의사항
- 남은 작업

## 운영 배포

GitHub Pages는 `.github/workflows/pages.yml`로 배포됩니다.
운영 반영 전에는 기능 브랜치에서 충분히 검증하고, `BONSUNG_API_BASE_URL`이 실제 HTTPS 서버를 가리키는지 확인합니다. 배포 브랜치 또는 main 반영 후에는 Pages workflow의 release configuration, server contract, operating surfaces 검증이 모두 성공해야 합니다.
