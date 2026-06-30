# App Store Connect Setup

이 문서는 iOS 앱을 TestFlight로 올리기 위해 필요한 App Store Connect 준비 흐름입니다. 실제 계정값은 공개 repo에 쓰지 않고 placeholder로 남깁니다.

## Required Decisions

앱을 올리기 전에 앱 이름, bundle identifier, primary language, SKU, category, age rating 방향을 정합니다. 처음에는 완벽한 스토어 페이지보다 TestFlight 업로드 가능 상태가 더 중요합니다.

## Bundle ID

Apple Developer에서 App ID 또는 Identifier를 만들 때 bundle identifier를 정합니다.

```text
<BUNDLE_ID>
```

일반적으로 reverse-domain 형식을 씁니다. 예: `com.example.myapp`. 공개 문서에는 실제 개인 도메인이나 프로젝트 bundle id를 넣지 않습니다.

## App Store Connect App Record

App Store Connect에서 새 앱을 만들고 bundle id를 연결합니다. 앱 이름은 나중에 바꿀 수 있지만, bundle id는 프로젝트와 signing에 직접 연결되므로 초기에 신중히 정합니다.

필요한 값은 아래처럼 문서에 남깁니다.

```text
App name: <APP_NAME>
Bundle ID: <BUNDLE_ID>
SKU: <SKU>
Primary language: <PRIMARY_LANGUAGE>
Apple Team ID: <APPLE_TEAM_ID>
```

## API Key

자동 업로드나 메타데이터 자동화를 쓰려면 App Store Connect API key가 필요할 수 있습니다. `.p8` 파일 내용은 절대 repo에 넣지 않습니다. key id, issuer id도 공개 repo에는 placeholder로 둡니다.

```text
ASC key id: <ASC_KEY_ID>
ASC issuer id: <ASC_ISSUER_ID>
Private key path: <PATH_TO_PRIVATE_KEY_P8>
```

개인 프로젝트에서는 이 값을 macOS Keychain, 1Password, GitHub Actions Secrets 같은 안전한 저장소에 둡니다.

## Export Compliance

암호화 기능을 쓰지 않는 단순 앱도 App Store Connect에서 export compliance 질문을 받을 수 있습니다. 프로젝트에 맞게 답해야 하며, iOS 앱에서는 필요한 경우 `ITSAppUsesNonExemptEncryption` 값을 설정합니다. 법적 판단이 필요한 경우 사용자가 직접 확인해야 합니다.
