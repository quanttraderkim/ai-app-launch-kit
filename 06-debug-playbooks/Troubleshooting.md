# Troubleshooting

이 문서는 iOS/TestFlight 준비 중 자주 막히는 문제를 정리합니다. 실제 에러 메시지는 Xcode, App Store Connect, Apple Developer 정책 변경에 따라 달라질 수 있으므로, 마지막 판단은 현재 도구의 메시지를 기준으로 합니다.

## Apple Developer Team ID Missing

현상은 Xcode나 build script가 signing team을 찾지 못하는 것입니다. 먼저 Xcode Accounts에 Apple ID가 추가되어 있는지 확인하고, Apple Developer Program 권한이 있는 계정인지 봅니다. 프로젝트 설정에는 실제 값을 공개 문서에 쓰지 말고 `<APPLE_TEAM_ID>` placeholder로 둡니다.

## No Signing Certificate

키체인에 iOS Distribution 또는 Apple Distribution 인증서가 없거나 private key가 연결되지 않은 상태일 수 있습니다. Xcode의 “Automatically manage signing”을 켜서 생성 가능한지 확인하고, 조직 계정 권한이 필요한 경우 계정 owner가 처리해야 합니다.

## Provisioning Profile Error

bundle identifier와 App Store Connect 앱 레코드, Xcode project의 bundle identifier가 일치하는지 확인합니다. capability를 추가했다면 provisioning profile이 다시 생성되어야 할 수 있습니다.

## Build Number Already Used

TestFlight는 같은 version/build 조합을 다시 받을 수 없습니다. build number를 하나 올리고 다시 archive/upload합니다.

## Export Compliance Required

App Store Connect에서 암호화 관련 질문이 뜰 수 있습니다. 앱이 비면제 암호화를 쓰는지 확인해야 하며, 단순 앱이라도 프로젝트 설정에 `ITSAppUsesNonExemptEncryption`가 필요한 경우가 있습니다. 법적 판단은 사용자가 직접 확인합니다.

## App Processing Takes Too Long

업로드 직후에는 App Store Connect processing 시간이 걸릴 수 있습니다. 오래 멈추면 ASC의 build activity, 이메일 알림, missing compliance 정보를 확인합니다. 같은 build를 다시 올리는 대신 원인을 먼저 확인합니다.

## Secret Accidentally Committed

즉시 해당 secret을 revoke하거나 재발급합니다. Git history에서 제거하는 것만으로는 충분하지 않습니다. public repo에 push된 secret은 이미 노출된 것으로 취급합니다.
