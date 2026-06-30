# Release Checklist

이 체크리스트는 TestFlight 또는 스토어 제출 후보를 만들기 전에 사용합니다. 목적은 완벽주의가 아니라 재현 가능한 릴리즈입니다.

## Source

- [ ] 릴리즈 대상 변경이 모두 Git에 커밋됨
- [ ] 원격에 push됨
- [ ] commit hash가 handoff에 기록됨
- [ ] release notes가 현재 빌드와 일치함
- [ ] 공개 repo에 secret이 포함되지 않음

## Product

- [ ] PRD의 core value sentence와 이번 빌드의 목적이 연결됨
- [ ] scope creep 항목이 들어가지 않음
- [ ] 첫 사용자가 핵심 행동을 찾을 수 있음
- [ ] 주요 화면에서 텍스트나 버튼이 잘리지 않음

## Build

- [ ] version/build number가 증가함
- [ ] signing/provisioning이 유효함
- [ ] debug-only UI 또는 로그가 노출되지 않음
- [ ] 실제 기기 또는 동등한 환경에서 smoke test 완료

## Distribution

- [ ] TestFlight processing 상태 확인
- [ ] 내부 테스트 그룹 활성화
- [ ] export compliance 질문 처리
- [ ] tester에게 묻고 싶은 질문 3개 준비
