# ASC API Store Ops — UI 없이 스토어 페이지 완성하기

> **Last verified:** 2026-07-05 · **Verified with:** App Store Connect API v1/v2, PyJWT(ES256), macOS · **Scope:** 앱 레코드 생성 이후의 거의 모든 스토어 작업을 API로 자동화 · **Known drift risk:** ASC API는 필수 필드가 조용히 늘어난다(연령 설문이 대표). 에러 detail을 그대로 읽으면 대부분 해결.

App Store Connect 웹 UI를 열지 않고도 문안, 스크린샷, 인앱결제, Game Center, 연령 등급, TestFlight 운영 전부를 스크립트로 처리할 수 있습니다. 에이전트 루프에 넣으면 "스토어 페이지 관리"가 코드 리뷰 가능한 자산이 됩니다.

## A. 먼저 볼 항목

- 인증: API Key(.p8)로 ES256 JWT 생성. `{"iss": <ISSUER_ID>, "aud": "appstoreconnect-v1", "exp": now+900}` + 헤더 `kid`. Python이면 PyJWT 하나로 끝
- **UI가 반드시 필요한 작업은 딱 2개**: 앱 레코드 최초 생성, App Privacy 선언(`appDataUsages` API는 404 — 존재하지 않음). 나머지는 전부 API
- 요청/응답은 JSON:API 규격. 실패 시 `errors[].detail`에 원인이 명시되므로 **detail을 끝까지 읽는 것**이 최고의 디버깅

## B. 바로 실행하는 순서 (신규 앱 기준)

1. 번들 ID 등록: `POST /v1/bundleIds` — UI 불필요
2. (UI) 앱 레코드 생성 — 이후 전부 API
3. capability 선언: `POST /v1/bundleIdCapabilities` — **엔타이틀먼트를 프로젝트에 넣었다면 여기도 반드시** (아래 함정 #1)
4. 문안: `appInfoLocalizations`(이름/부제) + `appStoreVersionLocalizations`(설명/키워드/프로모션/지원URL) PATCH
5. 카테고리: `PATCH /v1/appInfos` relationships
6. 스크린샷: 세트 생성 → 예약 → 청크 업로드 → MD5 커밋 (아래 C)
7. `primaryLocale` 변경: **기본 언어 스크린샷이 있어야** PATCH가 통과 (409 나면 스크린샷 먼저)
8. 연령 등급: `appInfos → ageRatingDeclaration` PATCH (아래 함정 #3)
9. IAP: `POST /v2/inAppPurchases` → 로컬라이제이션 → 가격 → 가용성 → 심사 스크린샷 (아래 함정 #2)
10. TestFlight: 내부 그룹 `hasAccessToAllBuilds: true`로 생성 + 팀원 `betaTesters` 등록 → 이후 빌드 자동 노출

## C. 스크린샷 업로드 플로우 (제일 헷갈리는 부분)

```
POST /v1/appScreenshotSets   (locale별, displayType: APP_IPHONE_67 — 6.9"도 이 세트)
POST /v1/appScreenshots      {fileName, fileSize} → 응답의 uploadOperations
각 operation: 지정된 url/method/headers로 바이너리 청크 PUT
PATCH /v1/appScreenshots/{id} {uploaded: true, sourceFileChecksum: <md5>}
```

- iPhone 17 Pro Max 시뮬레이터의 `simctl io screenshot`이 정확히 1320×2868로 나와 리사이즈 불필요
- 교체는 기존 것 DELETE 후 재업로드가 깔끔 (스크립트에 REPLACE 모드로 구현 추천)
- **함정: 업로드 디렉터리에 산출물 외 파일을 두지 말 것.** 검수용 콜라주가 스토어에 올라간 사고 사례 있음
- 로케일별로 그 언어의 스크린샷을 찍어야 함: `simctl launch <device> <bundle> -AppleLanguages "(ko)"`

## D. 함정 모음 (전부 실측)

1. **capability 불일치**: 프로젝트에 entitlement(예: Game Center)를 추가했는데 번들 ID에 capability를 안 켜면, **시뮬레이터 빌드는 통과하고 Release 서명에서만 실패**한다. 배포 직전에 터지는 유형이니 entitlement 추가 즉시 `bundleIdCapabilities`도 등록
2. **IAP**: 설명 필드는 55자 제한. 가격 스케줄 생성 시 included 임시 ID는 반드시 `${placeholder}` 문법(임의 문자열은 409). 등록 직후 상태 `MISSING_METADATA`는 심사 스크린샷만 올리면 `READY_TO_SUBMIT`로 바뀜
3. **연령 등급 설문**: 관계가 `appStoreVersions`가 아니라 `appInfos` 밑에 있음. 그리고 필수 필드가 계속 늘어남(lootBox, userGeneratedContent, advertising, ageAssurance, parentalControls 등) — 409의 detail이 부족한 필드를 하나씩 알려주니 그대로 채우면 됨
4. **Game Center**: 업적/리더보드 `vendorIdentifier`는 `grp.` 접두사 금지(그룹 예약어)
5. **TestFlight What to Test**(`betaBuildLocalizations.whatsNew`): 이모지 넣으면 `INVALID_TEXT`
6. **빌드 인제스천 지연**: 업로드 성공 후 빌드가 목록에 뜨기까지 수 분, VALID까지 5분~1시간. 폴링 간격 30초면 충분

## E. TestFlight 피드백 자동 수신 (에이전트 루프의 핵심 고리)

테스터가 TestFlight에서 남기는 스크린샷 피드백과 크래시를 API로 읽을 수 있습니다. 에이전트 루프의 매 반복 첫 액션으로 넣으면 **피드백 → 반영 → 다음 빌드 What to Test에 응답 명시**의 사이클이 자동화됩니다.

```
GET /v1/apps/<APP_ID>/betaFeedbackScreenshotSubmissions?sort=-createdDate
GET /v1/apps/<APP_ID>/betaFeedbackCrashSubmissions
GET /v1/betaTesters/<ID>/metrics/betaTesterUsages?period=P7D   (설치/세션/크래시 수)
```

- 피드백 `comment`, 기기 모델, OS 버전까지 옴. 응답 API는 없으므로 **다음 빌드의 What to Test 첫 줄에 반영 내역을 적는 것**이 실질적 회신
- 실사례: 테스터 피드백 수신 → 1분 내 감지 → 당일 반영 빌드 배포. 이 체감이 테스터의 두 번째 피드백을 부른다

## F. 권장 스크립트 구성

앱 repo의 `scripts/`에 최소 4개를 두면 운영이 안정됩니다 (전부 asc.env의 placeholder 값 참조, 커밋 금지):

- `deploy-testflight.sh` — 빌드 번호 자동 +1 → unsigned archive → `-exportArchive` 자동 서명 업로드
- `asc_build_status.sh` — processingState 폴링
- `asc_set_metadata.sh` — 문안/카테고리 일괄
- `asc_upload_screenshots.sh` — C 플로우 + REPLACE/로케일 필터

배포 전 프리플라이트로 **디바이스 아카이브 드라이런**(`CODE_SIGNING_ALLOWED=NO`)을 한 번 돌려두면 Release 전용 컴파일 오류를 창 밖에서 미리 잡습니다.
