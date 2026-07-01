# Troubleshooting

이 문서는 iOS/TestFlight 준비 중 자주 막히는 문제를 정리합니다. 실제 에러 메시지는 Xcode, App Store Connect, Apple Developer 정책 변경에 따라 달라질 수 있으므로, 마지막 판단은 현재 도구의 메시지를 기준으로 합니다.

## Apple Developer Team ID Missing

현상은 Xcode나 build script가 signing team을 찾지 못하는 것입니다. 먼저 Xcode Accounts에 Apple ID가 추가되어 있는지 확인하고, Apple Developer Program 권한이 있는 계정인지 봅니다. 프로젝트 설정에는 실제 값을 공개 문서에 쓰지 말고 `<APPLE_TEAM_ID>` placeholder로 둡니다.

## No Signing Certificate

키체인에 iOS Distribution 또는 Apple Distribution 인증서가 없거나 private key가 연결되지 않은 상태일 수 있습니다. 인증서를 직접 만들기 전에, **ASC API key + `signingStyle=automatic` 경로**(`04-app-store-connect-testflight/TestFlightRunbook.md`의 경로 B)를 먼저 시도하세요. 이 경로는 Xcode가 export 단계에서 배포 서명을 자동 처리하므로, 인증서를 수동 발급하지 않아도 되는 경우가 많습니다.

## Provisioning Profile Error

bundle identifier가 App Store Connect 앱 레코드, Xcode project 설정 세 곳에서 일치하는지 확인합니다. capability를 추가했다면 provisioning profile이 다시 생성되어야 할 수 있습니다. 자동 서명 경로에서는 `-allowProvisioningUpdates` 플래그가 이 갱신을 허용합니다.

## App Record Missing

자동 서명/업로드가 이유 없이 막히는 흔한 원인은 **App Store Connect에 해당 bundle id의 앱 레코드가 아직 없는 것**입니다. archive/export 전에 ASC에서 앱을 먼저 만들고 bundle id를 연결해야 합니다. `gh`나 ASC API로 앱 레코드 존재 여부를 먼저 확인하면 archive 시간을 낭비하지 않습니다.

## Build Number Already Used

TestFlight는 같은 version/build 조합을 다시 받을 수 없습니다. build number를 하나 올리고 다시 archive/upload합니다.

## App Processing Takes Too Long

업로드 직후에는 App Store Connect processing 시간이 걸립니다. 같은 build를 다시 올리는 대신, ASC API로 `processingState`를 확인하세요(`TestFlightRunbook.md`의 "Verify Build Status"). `VALID`가 되면 테스터 그룹에 활성화할 수 있습니다. 오래 멈추면 missing compliance나 metadata를 확인합니다.

## Audio Silent in Build

시뮬레이터나 실기에서 소리가 안 나면, **iOS 무음(링/사일런트) 스위치** 때문일 수 있습니다. 게임·미디어 앱은 보통 무음 스위치를 무시하도록 `AVAudioSession`을 **Playback 카테고리**로 설정해야 합니다. Unity 기본값은 Ambient(무음 스위치를 따름)라, 무음 모드에서 소리가 사라집니다. 작은 네이티브 코드(`.mm`)로 세션 카테고리를 Playback으로 바꾸면 해결됩니다. "사운드가 없다"는 피드백의 상당수는 음원 문제가 아니라 이 세션 설정 문제입니다.

## macOS Tooling Gaps

에이전트가 자주 부딪히는 기본 macOS 환경의 빈틈입니다.

- `timeout` 명령이 기본 macOS에 없습니다 → `brew install coreutils` 후 `gtimeout`을 쓰거나, 명령에서 빼세요.
- `xcrun simctl`에 **좌표를 탭하는 명령이 없습니다** → UI를 눌러 진행해야 한다면 proof state/autoplay로 우회하거나 `idb`를 씁니다(`VisualVerification.md`).
- ASC API JWT 생성에 `PyJWT`가 없으면 → 파이썬 `cryptography`로 ES256 서명을 직접 만들 수 있습니다(DER 서명을 `r||s` 64바이트로 변환).

## Unity Batchmode License Warning

Unity batchmode 빌드 로그에 라이선스 토큰 경고가 떠도 export 자체는 진행되는 경우가 많습니다. 성공/실패는 로그 중간의 경고가 아니라 **마지막 결과 줄**(`export succeeded` 또는 컴파일 에러)로 판단하세요.

## Uploaded Build Looks Unchanged to Testers

테스터가 "새 빌드인데 그대로다"라고 하면, 업로드가 안 된 것으로 단정하지 말고 **App Store Connect API로 사실을 확인**하세요. 기록이나 추측이 아니라 실제 상태가 답입니다. 흔한 원인은 세 가지입니다.

1. **테스터가 옛 빌드를 실행 중** — TestFlight 앱은 자동 업데이트가 아닙니다. `GET /v1/builds?filter[app]=<APP_ID>&sort=-uploadedDate` 로 최신 빌드 번호를 확인하고, 테스터가 그 번호를 설치했는지 확인하세요.
2. **새 빌드가 테스터 그룹에 노출 안 됨** — `GET /v1/builds/<BUILD_ID>/betaGroups` 로 빌드가 그룹에 들어갔는지 보고, 없으면 `POST /v1/betaGroups/<GROUP_ID>/relationships/builds` 로 추가합니다. `buildBetaDetail.internalBuildState` 도 함께 확인합니다.
3. **빌드 자체가 변경을 안 담음** — 커밋되지 않았거나 캐시된 소스로 빌드된 경우. 릴리즈는 커밋된 소스에서만 만들고, 업로드 전 시뮬레이터 시각 검증으로 화면을 눈으로 확인하세요(`04-app-store-connect-testflight/VisualVerification.md`).
4. **업로드는 성공했는데 빌드가 목록에 안 뜸** — `altool`이 `UPLOAD SUCCEEDED`(delivery UUID까지)를 찍었는데도 `/v1/builds`에 수십 분~수 시간 나타나지 않을 수 있습니다. `GET /v1/buildUploads/<UUID>` 의 `attributes.state`를 확인하세요. `state`가 `PROCESSING`이고 `errors`가 비어 있으면 업로드는 정상이고 **Apple 서버 처리가 지연**되는 것이니 기다립니다. **재업로드하지 마세요** — 같은 build 번호가 중복됩니다. `errors`에 내용이 있으면 그게 실패 원인입니다.

**테스터 피드백(스크린샷)도 API로 직접 볼 수 있습니다**: `GET /v1/apps/<APP_ID>/betaFeedbackScreenshotSubmissions?include=build&sort=-createdDate` 는 각 피드백의 코멘트·기기·**어느 빌드에 대한 것인지**·스크린샷 URL을 돌려줍니다. "어느 빌드가 문제인지"를 추측하지 말고 여기서 확정하세요.

## Secret Accidentally Committed

즉시 해당 secret을 revoke하거나 재발급합니다. Git history에서 제거하는 것만으로는 충분하지 않습니다. public repo에 push된 secret은 이미 노출된 것으로 취급합니다.
