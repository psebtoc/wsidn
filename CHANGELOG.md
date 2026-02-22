# Changelog

All notable changes to WSIDN (What Should I Do Next) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.1] - 2026-02-22

### Fixed

- 터미널에서 Ctrl+V 붙여넣기 시 텍스트가 두 번 입력되는 버그 수정

---

## [0.2.0] - 2026-02-22

### Added

- **키보드 단축키 시스템**: 세션 전환, 패널 토글, 터미널 포커스 등 포괄적인 단축키 지원
- **터미널 복사/붙여넣기**: 마우스 선택 복사 및 Ctrl+V 붙여넣기 지원
- **링크 감지**: 터미널 내 URL 및 로컬 경로 호버 툴팁, 클릭 열기 지원
- **Session Manager**: Claude 프롬프트를 파싱해 Mind Tree를 자동으로 업데이트하는 기능
- **Mind Tree 세션 연동**: 새 Claude 세션 시작 시 Mind Tree 복사(clear/startup)
- **Mind Tree 프로젝트 범위 저장**: Mind Tree 데이터를 프로젝트 단위로 저장, Claude 게이팅 및 체크리스트 지원
- **Pane 최소화 개선**: 최소화된 pane을 타이틀바 pill로 표시, 기존 분할 트리 유지
- **Pane collapse-in-place**: 분할 레이아웃을 유지한 채 pane을 제자리에서 최소화
- **Chrome 스타일 탭**: 세션 탭 UI 개선, 악센트 컬러 피커 및 테마별 터미널 색상 오버라이드
- **테마 시스템**: 7가지 테마 프리셋과 탭 기반 설정 모달
- **Resume 서브메뉴 개선**: 검색 필드, 닫힌 시각 표시, 최신순 정렬
- **공유 UI 컴포넌트**: lucide-react 아이콘과 시맨틱 컬러 시스템 기반 공통 컴포넌트
- **i18n 지원**: react-i18next 기반 한국어/영어 다국어 지원
- **앱/프로젝트 설정**: 앱 설정 모달, 프로젝트 설정 패널, 창 위치/크기 영속성
- **테스트 스위트**: vitest 기반 테스트 15개 파일, 198개 테스트 케이스

### Fixed

- mindtree `updateItem` 호출 시 `projectId` 누락으로 IPC가 조용히 실패하던 버그 수정
- ConPTY 이중 리플로우로 인한 터미널 리사이즈 깨짐 현상 수정
- Windows 셸 인자 파싱 문제 해결 (`--system-prompt-file` + stdin 방식으로 전환)
- `sessions.json` 마이그레이션 코드가 resume 히스토리 로딩을 차단하던 버그 수정
- 세션 복원, stale 인디케이터 정리, resume 탐색, 인라인 이름 변경 버그 수정

### Refactored

- `todo` → `mindtree`로 도메인 네이밍 전면 변경, 세션별 스토어 격리 수정
- Worktree 생성을 Claude CLI의 `-w` 플래그에 위임
- 세션을 런타임 전용으로 분리, resume 히스토리 별도 저장소로 이동
- 레거시 todo 컴포넌트 및 훅 경로 정리

### Performance

- 앱 시작 시 흰 화면 깜빡임(white flash) 감소

---

## [0.1.0] - 2026-02-19

### Added

- **초기 릴리즈**: Electron + React 기반 Claude Code 세션 관리 앱
- **다중 PTY 세션**: 프로젝트별 여러 터미널 세션 관리
- **Pane 시스템**: 분할 레이아웃, 이름 지정, 워크스페이스 영속성, 최소화/복원
- **세션 컨텍스트 메뉴**: `claude`, `claude --dangerously-skip-permissions`, Worktree, Resume 옵션
- **Worktree 세션**: `git worktree` 기반 격리된 브랜치 세션 생성
- **Resume 기능**: 닫힌 Claude 세션 목록에서 `claude --resume`으로 재개
- **세션 타이틀 영속성**: Claude OSC 타이틀 이벤트 기반 세션 제목 유지
- **세션 인라인 이름 변경**: 탭 더블클릭으로 세션 이름 편집
