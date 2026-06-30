# Visual Verification

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

## 여러 단계 자동 진행 (autoplay)

여러 입력을 거쳐야 보이는 화면은, 앱에 **autoplay 모드**(환경변수로 켜지는, 정해진 입력을 자동 재생하는 경로)를 넣어두면 한 번에 진행시킬 수 있습니다. 단, 자동 진행 로직과 핵심 규칙을 함께 바꾸면 어긋날 수 있으니, 규칙을 바꾼 뒤에는 autoplay 경로도 같이 점검합니다.

## 주의 / 한계

- `xcrun simctl`에는 **임의 좌표를 탭하는 명령이 없습니다.** UI를 실제로 눌러야 한다면 `idb`(facebook/idb) 같은 별도 도구가 필요합니다. 가능하면 위의 proof state / autoplay로 우회하세요.
- 시뮬레이터 캡처는 레이아웃·색·에셋 확인용입니다. **사운드, 햅틱, 실제 터치감, 성능**은 실기에서만 제대로 확인됩니다.
- 동적 효과(화면 흔들림, 애니메이션)는 정지 스크린샷으로 안 보입니다. 필요하면 `xcrun simctl io booted recordVideo <OUT>.mp4`로 짧게 녹화하세요.
- Unity batchmode 빌드는 라이선스 경고 로그가 떠도 export 자체는 진행되는 경우가 많습니다. 성공/실패는 로그 마지막의 결과 줄로 판단하세요.
