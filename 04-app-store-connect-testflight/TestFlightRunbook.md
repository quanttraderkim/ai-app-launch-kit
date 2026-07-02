# TestFlight Runbook

TestFlight는 "완성된 앱을 올리는 곳"이 아니라, 실제 사람이 만질 수 있는 빌드를 안전하게 배포하고 배우는 lane입니다. 모든 작은 변경을 올릴 필요는 없고, 사용자가 체감할 수 있는 iteration bundle이나 심각한 UX/hotfix 단위로 올립니다.

## Before Upload

- [ ] Git working tree가 깨끗하거나, 업로드에 포함되는 변경이 모두 커밋되어 있음
- [ ] version과 build number가 이전 업로드보다 올바르게 증가함
- [ ] bundle identifier가 App Store Connect 앱 레코드와 일치함
- [ ] signing team과 provisioning 상태가 유효함
- [ ] **시뮬레이터 또는 실기에서 핵심 화면을 눈으로 확인** (아래 "Visual Verification" 참고)
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

## Upload — 두 가지 경로

### 경로 A — 처음 한 번은 Xcode Organizer로 원리 이해

Xcode에서 `Product > Archive` → Organizer에서 `Distribute App` → `App Store Connect` → `Upload`. 한 번은 GUI로 archive/sign/upload가 어떤 단계인지 눈으로 보는 게 좋습니다.

### 경로 B — 반복 업로드는 ASC API 자동 서명 스크립트 (실전 권장)

**초보자가 가장 많이 막히는 곳은 배포 인증서와 provisioning profile을 수동으로 만드는 단계입니다.** App Store Connect API key + `signingStyle=automatic`을 쓰면 이 단계를 Xcode가 알아서 처리하므로, 인증서를 직접 발급하지 않고도 업로드할 수 있습니다.

**준비 (한 번만)**
- App Store Connect → Users and Access → Integrations에서 **API Key 생성** → `.p8` 파일, **Key ID**, **Issuer ID** 확보
- `.p8`/key id/issuer id를 키체인이나 `.env`에 저장 (절대 커밋 금지 — `08-security/SecretsAndKeychain.md`)
- 프로젝트 설정에 **Apple Team ID**와 **Automatic signing** 활성화
- App Store Connect에 **해당 bundle id의 앱 레코드**가 이미 존재해야 함

**빌드 → 업로드 (값은 전부 placeholder)**

```sh
# 0) Unity 프로젝트라면: Unity batchmode로 iOS 디바이스용 Xcode 프로젝트를 먼저 export.
#    네이티브 iOS 프로젝트라면 이 단계는 생략하고 바로 1)부터.

# 1) unsigned archive — 서명은 다음 export 단계에서 ASC API가 자동 처리
xcodebuild -project <XCODE_PROJECT> -scheme <SCHEME> \
  -configuration Release -archivePath <ARCHIVE_PATH> \
  -destination 'generic/platform=iOS' \
  archive CODE_SIGNING_ALLOWED=NO

# 2) ExportOptions.plist 작성 (자동 서명 + 업로드)
cat > ExportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string><APPLE_TEAM_ID></string>
  <key>signingStyle</key><string>automatic</string>
</dict>
</plist>
PLIST

# 3) export + 업로드 (ASC API로 인증 → Xcode가 배포 서명까지 자동 수행)
xcodebuild -exportArchive -archivePath <ARCHIVE_PATH> \
  -exportPath <EXPORT_DIR> -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath <PATH_TO_PRIVATE_KEY_P8> \
  -authenticationKeyID <ASC_KEY_ID> \
  -authenticationKeyIssuerID <ASC_ISSUER_ID>
```

성공하면 로그에 `** ARCHIVE SUCCEEDED **`, `Progress 100%: Upload succeeded.`, `** EXPORT SUCCEEDED **`가 보입니다.

> **핵심**: `signingStyle=automatic` + ASC API 인증을 쓰면 배포 인증서를 직접 발급/관리하지 않아도 됩니다. "No signing certificate"로 막히던 초보자 단계를 통째로 건너뜁니다. 실제 명령 패턴은 `examples/`의 deploy 스크립트 예시를 참고하세요.

## Verify Build Status (VALID)

**업로드 성공 ≠ TestFlight에서 바로 사용 가능.** Apple이 처리를 끝내고 상태가 `VALID`가 되어야 내부 테스터 그룹에 노출할 수 있습니다. App Store Connect API로 확인할 수 있습니다.

```sh
# ASC API는 ES256 JWT 인증을 씁니다.
# - PyJWT가 있으면 jwt.encode(...) 한 줄
# - 없으면 python `cryptography`로 수동 서명 가능 (decode_dss_signature → r||s 64바이트)
# JWT 생성 후:
#   GET https://api.appstoreconnect.apple.com/v1/builds?filter[app]=<APP_ID>&sort=-version
# 응답의 attributes.processingState 를 확인: VALID / PROCESSING / INVALID
```

`processingState`가 `VALID`이면 TestFlight 내부 테스트 그룹에 빌드를 활성화할 수 있습니다. `PROCESSING`이면 몇 분 더 기다립니다.

## After Upload

App Store Connect에서 processing이 끝났는지 확인합니다. 내부 테스트 그룹을 선택하고 build를 활성화합니다. export compliance, missing metadata, beta review, age rating 같은 추가 질문이 뜨면 한 번에 하나씩 처리합니다.

**업로드 성공이 "테스터가 새 빌드를 본다"는 뜻은 아닙니다.** processing이 `VALID`가 되고, 그 빌드가 테스터 그룹에 노출되어야 합니다. API로 확인·활성화할 수 있습니다: `GET /v1/builds/<BUILD_ID>/betaGroups` 로 노출 여부를 보고, 없으면 `POST /v1/betaGroups/<GROUP_ID>/relationships/builds` 로 추가합니다. TestFlight 앱은 자동 업데이트가 아니므로 테스터에게 최신 빌드 번호를 설치하라고 안내하세요. (빌드가 그대로처럼 보일 때의 진단은 `06-debug-playbooks/Troubleshooting.md` 참고.)

## Deploy Cadence & Processing Quota

하루에 빌드를 너무 자주 올리면 App Store Connect의 빌드 처리가 밀려, `PROCESSING`에서 `VALID`까지 평소 수분이던 게 훨씬 오래 걸릴 수 있습니다(처리 큐/쿼터). 실전 교훈:

- **커밋은 자주, 정규 배포는 하루 1~2회로 묶습니다.** 예: 아침·저녁 정해진 시각에만 업로드하고, 그 사이 변경은 커밋으로만 쌓습니다.
- **배포 사이의 확인은 시뮬레이터 시각 검증으로** 대체합니다(→ `VisualVerification.md`). 매 변경마다 TestFlight에 올려 눈으로 볼 필요가 없습니다.
- 업로드 후 `VALID`까지 보통 수분~십수분입니다. 한꺼번에 여러 개를 몰아 올리면 더 밀리니, 정말 테스터에게 보낼 것만 올립니다.
- 배포할 실질 변경이 없으면 정규 시각이라도 건너뜁니다.

## Visual Verification (업로드 전 권장)

겉으로 빌드가 성공해도 레이아웃·에셋·색이 깨질 수 있습니다. 업로드 전 **시뮬레이터에서 핵심 화면을 캡처해 눈으로 확인**하면 깨진 빌드를 테스터에게 보내기 전에 잡습니다. 상세 방법은 `04-app-store-connect-testflight/VisualVerification.md` 참고.

## Test Questions

테스터에게 "재미있나요?" 또는 "괜찮나요?"만 묻지 않습니다. 대신 사용자가 어디서 멈췄는지, 첫 가치 순간을 이해했는지, 다음 행동을 스스로 하고 싶었는지를 묻습니다.

```text
앱을 켜고 가장 처음으로 헷갈린 순간은 언제였나요?
핵심 행동을 한 뒤 화면에서 가장 먼저 본 것은 무엇인가요?
다시 열고 싶어진 순간이 있었나요, 아니면 끄고 싶어진 순간이 있었나요?
```
