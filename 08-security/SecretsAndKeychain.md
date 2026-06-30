# Secrets And Keychain

공개 repo에는 secret을 넣지 않습니다. 로컬 개발에서는 macOS Keychain, 1Password, 환경변수, 또는 GitHub Actions Secrets를 사용합니다. 이 문서는 macOS Keychain에 값을 저장하고 읽는 기본 패턴만 제공합니다.

## Store A Secret

```sh
security add-generic-password \
  -a "$USER" \
  -s "<SERVICE_NAME>" \
  -w "<SECRET_VALUE>" \
  -U
```

예를 들어 App Store Connect issuer id, key id, API private key 경로, 외부 이미지 생성 API key 등을 service name으로 구분해 저장할 수 있습니다. 실제 값은 터미널 history에 남을 수 있으므로, 가능한 경우 interactive prompt나 secret manager를 사용합니다.

## Read A Secret

```sh
security find-generic-password \
  -a "$USER" \
  -s "<SERVICE_NAME>" \
  -w
```

에이전트가 이 명령을 사용할 때는 secret 값을 답변이나 문서에 출력하지 않아야 합니다. 작동 여부만 “키체인에서 읽기 성공”처럼 보고합니다.

## .env Example

`.env`는 commit하지 않습니다. 공개 repo에는 `.env.example`만 둡니다.

```text
ASC_KEY_ID=<ASC_KEY_ID>
ASC_ISSUER_ID=<ASC_ISSUER_ID>
ASC_PRIVATE_KEY_PATH=<PATH_TO_PRIVATE_KEY_P8>
APPLE_TEAM_ID=<APPLE_TEAM_ID>
BUNDLE_ID=<BUNDLE_ID>
```
