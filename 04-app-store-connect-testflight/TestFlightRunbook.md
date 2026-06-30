# TestFlight Runbook

TestFlight는 “완성된 앱을 올리는 곳”이 아니라, 실제 사람이 만질 수 있는 빌드를 안전하게 배포하고 배우는 lane입니다. 모든 작은 변경을 올릴 필요는 없고, 사용자가 체감할 수 있는 iteration bundle이나 심각한 UX/hotfix 단위로 올립니다.

## Before Upload

- [ ] Git working tree가 깨끗하거나, 업로드에 포함되는 변경이 모두 커밋되어 있음
- [ ] version과 build number가 이전 업로드보다 올바르게 증가함
- [ ] bundle identifier가 App Store Connect 앱 레코드와 일치함
- [ ] signing team과 provisioning 상태가 유효함
- [ ] 실제 기기 또는 시뮬레이터에서 기본 실행 확인
- [ ] 개인정보, API key, debug overlay가 빌드에 노출되지 않음

## Build Identity

handoff에는 아래 정보를 남깁니다.

```text
App: <APP_NAME>
Bundle ID: <BUNDLE_ID>
Version: <VERSION>
Build: <BUILD_NUMBER>
Commit: <COMMIT_HASH>
Upload date: <YYYY-MM-DD>
Validation: <VALIDATION_RESULT>
```

## Upload Methods

Xcode Organizer, `xcrun altool`, Transporter, fastlane, App Store Connect API 기반 script 중 팀 상황에 맞는 방법을 씁니다. 초보자는 처음 한 번은 Xcode Organizer로 원리를 확인하고, 반복 업로드가 생기면 script로 자동화하는 방식이 안전합니다.

## After Upload

App Store Connect에서 processing이 끝났는지 확인합니다. 내부 테스트 그룹을 선택하고 build를 활성화합니다. export compliance, missing metadata, beta review, age rating 같은 추가 질문이 뜨면 한 번에 하나씩 처리합니다.

## Test Questions

테스터에게 “재미있나요?” 또는 “괜찮나요?”만 묻지 않습니다. 대신 사용자가 어디서 멈췄는지, 첫 가치 순간을 이해했는지, 다음 행동을 스스로 하고 싶었는지를 묻습니다.

```text
앱을 켜고 가장 처음으로 헷갈린 순간은 언제였나요?
핵심 행동을 한 뒤 화면에서 가장 먼저 본 것은 무엇인가요?
다시 열고 싶어진 순간이 있었나요, 아니면 끄고 싶어진 순간이 있었나요?
```
