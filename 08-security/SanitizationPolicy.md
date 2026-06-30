# Sanitization Policy

이 저장소는 public repo를 전제로 합니다. 기밀정보가 들어가면 학습 자료가 아니라 보안 사고가 됩니다.

## Never Commit

Apple Developer Team ID, 실제 bundle identifier, App Store Connect API key id와 issuer id, `.p8` private key, 인증서, provisioning profile, tester 이메일, 개인 Apple ID, 결제 정보, paid asset 원본, external API key, 서비스 access token, production database URL은 커밋하지 않습니다.

## Use Placeholders

실제 값이 필요한 자리에는 아래처럼 씁니다.

```text
<APPLE_TEAM_ID>
<BUNDLE_ID>
<ASC_KEY_ID>
<ASC_ISSUER_ID>
<PATH_TO_PRIVATE_KEY_P8>
<SUPPORT_URL>
```

## Screenshots

스크린샷에는 계정명, 이메일, Team ID, bundle id, tester 정보, 결제 정보가 보이지 않아야 합니다. 가려야 하는 스크린샷보다 텍스트 절차가 더 안전합니다.

## If A Secret Leaks

history에서 지우기 전에 먼저 해당 secret을 revoke하거나 rotate합니다. public remote에 push된 secret은 이미 노출된 것으로 간주합니다.
