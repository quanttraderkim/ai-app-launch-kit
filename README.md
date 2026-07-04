# AI App Launch Kit

AI 개발 스터디 멤버가 8주 안에 작은 앱 하나를 실제 배포 흐름까지 가져가기 위한 공개 런칭 키트입니다. 이 저장소는 특정 개인 계정이나 프로젝트의 복사본이 아니라, 에이전트에게 클론시켜 바로 사용할 수 있는 PRD, 개발환경, App Store Connect, TestFlight, 릴리즈 운영 템플릿 모음입니다.

목표는 간단합니다. 앱 아이디어를 정한 뒤, 에이전트와 함께 PRD를 만들고, 첫 playable proof 또는 usable proof를 만들고, Git을 기준으로 검증 가능한 변경만 쌓고, TestFlight 또는 스토어 제출 직전까지 반복하는 것입니다.

## How To Use

새 프로젝트를 시작할 때 에이전트에게 아래처럼 말하면 됩니다.

```text
이 저장소를 클론해서 README.md와 AGENTS.md를 먼저 읽고, 내 앱 프로젝트에 맞는 PRD, 개발환경 체크리스트, TestFlight 준비 문서를 만들어줘. 기밀정보는 절대 문서에 쓰지 말고 placeholder로 남겨.
```

처음 읽을 순서는 `00-start-here/Quickstart.md`, `01-agent-operating-system/AgentPrompt.md`, `02-product-prd/PRD.template.md`, `04-app-store-connect-testflight/TestFlightRunbook.md`입니다.

내 앱 repo에 기본 문서를 심고 싶다면 아래 스크립트를 쓸 수 있습니다.

```sh
scripts/bootstrap-project-docs.sh /path/to/my-app
```

## What This Kit Contains

`00-start-here`에는 스터디 운영 방식과 첫 세팅 순서가 있습니다. `01-agent-operating-system`에는 에이전트에게 맡길 역할과 handoff 규칙이 있습니다. `02-product-prd`에는 PRD와 iteration 템플릿이 있습니다. `03-ios-unity-setup`에는 Xcode, Unity, iOS 빌드 준비 체크리스트와, 게임용 픽셀아트·애니메이션 생성 파이프라인(`PixelArtAnimationPipeline.md`), 코드로 그린 UI를 게임처럼 다듬는 방법(`GameFeelUI.md`)이 있습니다. `04-app-store-connect-testflight`에는 App Store Connect와 TestFlight 준비 절차, ASC API 자동 서명 배포 경로, 시뮬레이터 시각 검증 방법, 그리고 스토어 문안·스크린샷·IAP·연령등급·테스터 피드백 수신까지 UI 없이 처리하는 ASC API 운영 런북(`ASCApiStoreOps.md`)이 있습니다. `05-release-runbooks`에는 릴리즈 체크리스트와 Git source-of-truth 규칙이 있습니다. `06-debug-playbooks`에는 자주 막히는 signing, provisioning, upload 문제 해결법이 있습니다. `08-security`에는 공개 repo에 절대 넣으면 안 되는 정보와 키체인 사용법이 있습니다.

## Non-Negotiables

이 저장소에는 Apple Developer Team ID, 실제 bundle identifier, App Store Connect API key, `.p8` private key, 인증서, provisioning profile, 개인 이메일, TestFlight tester 목록, 유료 에셋 원본, 서비스 비밀값을 넣지 않습니다. 모든 계정별 값은 `<APPLE_TEAM_ID>`, `<BUNDLE_ID>`, `<ASC_KEY_ID>`, `<ASC_ISSUER_ID>`, `<PATH_TO_PRIVATE_KEY_P8>`처럼 placeholder로 남깁니다.

릴리즈 빌드는 반드시 커밋된 소스에서 만들어야 합니다. TestFlight에 올라간 빌드와 Git의 commit hash가 연결되지 않으면, 다음 사람이 같은 상태를 재현할 수 없습니다.

## Recommended 8-Week Shape

1주차는 아이디어, PRD, 환경 세팅, 계정 준비입니다. 2주차는 첫 proof를 만듭니다. 3주차와 4주차는 핵심 사용자 가치 하나를 반복해서 높입니다. 5주차는 TestFlight 준비와 내부 테스트입니다. 6주차는 피드백 반영입니다. 7주차는 품질, crash, 메타데이터, 스크린샷을 정리합니다. 8주차는 제출 후보를 고정하고 회고를 남깁니다.

## License

MIT License. 개인 계정 정보와 외부 유료 에셋은 이 저장소의 라이선스 대상이 아닙니다.
