# Visual Verification

> **Last verified:** 2026-07-02 · **Verified with:** Unity 6000.3.18f1 batchmode, `xcodebuild -sdk iphonesimulator`, `xcrun simctl`(iPhone 17), macOS 15+ · **Scope:** 시뮬레이터 빌드·부팅·스크린샷 검증 · **Known drift risk:** `simctl` 서브커맨드와 기본 시뮬레이터 기기명이 Xcode 버전마다 바뀝니다.

빌드가 컴파일·업로드에 성공해도 화면에서 레이아웃이 깨지거나, 에셋이 안 보이거나, 색이 뒤집힐 수 있습니다. **시뮬레이터에서 핵심 화면을 캡처해 눈으로 확인**하면 깨진 빌드를 테스터에게 보내기 전에 잡습니다. "검증을 증거로 남긴다"는 접근으로, 자동화된 시각 확인을 빠른 피드백 루프로 씁니다.

## 기본 흐름 (네이티브 / Unity 공통)

```sh
# 1) 시뮬레이터용 빌드 (Unity면 batchmode로 sim export, 네이티브면 sdk iphonesimulator)
xcodebuild -project <XCODE_PROJECT> -scheme <SCHEME> \
  -sdk iphonesimulator -configuration Release \
  -derivedDataPath <DERIVED_DATA_DIR> build CODE_SIGNING_ALLOWED=NO

# 2) 시뮬레이터 부팅 + 설치 + 실행
xcrun simctl boot "<SIMULATOR_NAME>"            # 예: iPhone 17
xcrun simctl install booted "<APP_BUNDLE_PATH>" # ...Build/Products/.../<App>.app
xcrun simctl launch booted "<BUNDLE_ID>"

# 3) 잠시 기다린 뒤 스크린샷
sleep 10
xcrun simctl io booted screenshot <OUTPUT>.png
```

캡처한 png를 열어 **버튼이 안 잘렸는지, 핵심 오브젝트가 즉시 읽히는지, 색·에셋이 의도대로인지**를 확인합니다.

## 특정 화면을 강제로 띄우기 (proof state)

초기 화면만으로는 깊은 상태(결과 화면, 변경 후 상태 등)를 못 봅니다. 앱이 **환경변수로 특정 상태를 렌더**하도록 만들어두면, 시뮬레이터에서 그 상태를 바로 캡처할 수 있습니다.

```sh
# 앱이 시작 시 환경변수를 읽어 해당 화면을 그리도록 구현해두면:
SIMCTL_CHILD_<APP_PROOF_STATE_ENV>=<STATE_NAME> \
  xcrun simctl launch booted "<BUNDLE_ID>"
sleep 8
xcrun simctl io booted screenshot <OUTPUT>.png
```

`simctl launch`는 `SIMCTL_CHILD_` 접두사가 붙은 환경변수를 앱 프로세스로 그대로 전달합니다. 앱에서 그 값을 읽어 시작 상태를 분기하면 자동화된 시각 회귀 검증이 가능합니다.

## 반복 개선 루프 (레이아웃을 눈으로 수렴)

절대 좌표로 배치된 UI는 값만 바꿔서는 결과를 예측하기 어렵습니다. **변경 → 빌드 → 스크린샷 → 다음 조정**을 짧게 반복해 눈으로 수렴시키는 게 가장 빠릅니다. 한 번에 완벽을 노리기보다, 매 라운드에 가장 거슬리는 문제 하나~둘만 고치고 다시 찍습니다.

- 시작 화면과 함께, 사용자가 실제로 본 **깊은 상태(proof state)**도 매번 같이 캡처하면 회귀와 개선을 한눈에 비교할 수 있습니다.
- 빌드가 느리면(수 분) 명백한 개선 여러 개를 한 라운드에 묶되, 원인 추적이 어려워지지 않을 만큼만 묶습니다.
- 각 라운드 스크린샷을 남겨두면 "무엇이 좋아졌나"를 근거로 판단할 수 있습니다.

## 여러 단계 자동 진행 (autoplay)

여러 입력을 거쳐야 보이는 화면은, 앱에 **autoplay 모드**(환경변수로 켜지는, 정해진 입력을 자동 재생하는 경로)를 넣어두면 한 번에 진행시킬 수 있습니다. 단, 자동 진행 로직과 핵심 규칙을 함께 바꾸면 어긋날 수 있으니, 규칙을 바꾼 뒤에는 autoplay 경로도 같이 점검합니다.

## 주의 / 한계

- `xcrun simctl`에는 **임의 좌표를 탭하는 명령이 없습니다.** UI를 실제로 눌러야 한다면 `idb`(facebook/idb) 같은 별도 도구가 필요합니다. 가능하면 위의 proof state / autoplay로 우회하세요.
- 시뮬레이터 캡처는 레이아웃·색·에셋 확인용입니다. **사운드, 햅틱, 실제 터치감, 성능**은 실기에서만 제대로 확인됩니다.
- 동적 효과(화면 흔들림, 애니메이션)는 정지 스크린샷으로 안 보입니다. 필요하면 `xcrun simctl io booted recordVideo <OUT>.mp4`로 짧게 녹화하세요.
- Unity batchmode 빌드는 라이선스 경고 로그가 떠도 export 자체는 진행되는 경우가 많습니다. 성공/실패는 로그 마지막의 결과 줄로 판단하세요.

## 언어 QA 함정 2가지 (실측)

**스테일 빌드**: 시뮬레이터에 예전 빌드가 남아 있으면 `simctl launch`는 그걸 실행한다. 로컬라이징을 넣고 "영어로 안 나온다"며 코드를 의심하기 전에, **언어 QA 직전에는 반드시 재설치**부터. (`simctl install` 후 launch)

```sh
xcrun simctl launch <DEVICE> <BUNDLE_ID> -AppleLanguages "(en)"   # 언어 강제
```

**상태 직행 런치 인자**: 스크린샷·QA용으로 특정 화면(사망/상점/보스 등)에 바로 들어가는 런치 인자를 앱에 심어두면, 헤드리스 검증과 스토어 스크린샷 재촬영이 명령 한 줄이 된다. 인자 하나 추가할 때 실제 상태(타이머·잠금 등)까지 재현해야 스토어 컷이 실플레이와 일치한다.

## 스토어 스크린샷 자동 촬영 함정 2가지 (실측)

1. **부팅 중 install → launch가 "Application failed preflight checks"로 실패.**
   `simctl boot` 직후 install은 성공한 것처럼 보여도 launch가 거부될 수 있다.
   순서: `simctl bootstatus <기기> -b`로 부팅 완료 대기 → uninstall → install → launch
2. **동적 장면(추격 등)은 타이밍 대기로 못 잡는다.** 적 스폰이 플레이어 위치 기준이면
   "접근 중" 구도 자체가 존재하지 않는 경우가 있다. sleep 값을 바꿔가며 반복하지 말고,
   **컷 전용 debug launch arg를 만들어 장면을 결정론적으로 연출**하라 (proof state의 확장).
   예: 추적자를 플레이어 N타일 뒤에 chasing 상태로 강제 배치하는 `-shotChase`

## 시뮬레이터 위생

- 오디오가 들어간 앱은 검증 후 반드시 `simctl terminate` — 시뮬레이터에 남은 앱의 BGM이 계속 재생된다 (에어팟 쓰는 사람이 옆에 있다면 특히)
- 검증 세션이 끝나면 `xcrun simctl shutdown all` 습관화
- 사운드 자체의 검증: 저역(80Hz 미만)이 지배하는 소리는 폰 스피커에서 왜곡된 웅웅거림이 된다. 합성 오디오라면 간단한 DFT로 대역 분포를 확인할 수 있다
