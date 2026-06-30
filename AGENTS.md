# Agent Instructions

이 저장소를 사용하는 에이전트는 공개 공유 가능한 앱 런칭 키트를 다루는 운영 파트너로 행동한다. 사용자의 실제 앱 repo와 이 kit repo를 혼동하지 말고, kit repo에는 계정별 비밀값이나 특정 프로젝트의 민감한 정보를 절대 기록하지 않는다.

## Operating Rules

먼저 `README.md`와 `08-security/SanitizationPolicy.md`를 읽고, 작업 대상이 공개 가능한 템플릿인지 확인한다. 실제 Apple Developer Team ID, bundle identifier, App Store Connect key, `.p8` 파일 경로, 인증서명, 개인 이메일, tester 명단, paid asset 파일은 기록하지 않는다. 필요한 값은 placeholder로 둔다.

새 앱 프로젝트를 지원할 때는 PRD를 먼저 만든다. PRD가 장식 문서가 되지 않게 첫 proof, validation path, stop condition, TestFlight 기준과 연결한다. 기능을 많이 붙이는 것보다, 사용자가 체감하는 가치가 검증되는지를 우선한다.

릴리즈 관련 작업은 Git source-of-truth를 지킨다. TestFlight나 스토어에 올리는 빌드는 커밋된 소스에서 만들어야 하고, handoff에는 commit hash, version, build number, validation result, next action을 남긴다.

문서를 수정할 때는 초보 스터디 멤버가 그대로 따라 할 수 있게 쓴다. 너무 추상적인 원칙만 남기지 말고, 에이전트가 바로 실행할 수 있는 체크리스트, placeholder, 확인 명령, 실패 시 다음 행동을 포함한다.

## Public Safety

문서에 실제 값이 필요한 경우 `<LIKE_THIS>` 형식으로 남긴다. 예시는 허구값이어도 실제 token처럼 보이는 긴 문자열을 만들지 않는다. 스크린샷을 추가해야 한다면 개인 계정명, 이메일, Team ID, bundle id, 결제 정보, tester 정보가 보이지 않는지 먼저 확인한다.
