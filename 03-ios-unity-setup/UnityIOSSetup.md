# Unity iOS Setup

Unity로 iOS 앱을 만들 때는 게임 구현과 배포 설정을 분리해서 봅니다. 첫 proof는 Unity Editor에서 빠르게 검증하고, TestFlight lane은 별도 문서와 스크립트로 안정화합니다.

## Unity Project Settings

Player Settings에서 `Company Name`, `Product Name`, `Version`, `Bundle Identifier`를 설정합니다. 공개 문서에는 실제 값 대신 `<COMPANY_NAME>`, `<APP_NAME>`, `<BUNDLE_ID>`를 사용합니다. iPhone 세로 앱이라면 Orientation을 portrait 중심으로 고정하고, 첫 proof 전에는 iPad 대응이나 복잡한 해상도 정책을 미루는 것이 좋습니다.

## Build Number Policy

TestFlight에 같은 build number를 다시 올릴 수 없습니다. `Version`은 사용자가 보는 앱 버전이고, `Build`는 업로드마다 증가하는 내부 번호로 둡니다. 예: version `1.0`, build `1`, 다음 업로드는 version `1.0`, build `2`.

## Export Flow

Unity에서 iOS target으로 build하면 Xcode project가 생성됩니다. 이후 Xcode에서 signing/team을 확인하고 archive/upload를 진행합니다. 자동화할 때도 기본 원칙은 같습니다. Unity export가 성공했는지, Xcode archive가 성공했는지, App Store Connect upload가 성공했는지를 각각 분리해 기록합니다.

## Early Quality Gate

첫 proof의 그래픽이 임시여도 됩니다. 하지만 모바일 화면에서 버튼이 잘리지 않고, 주요 오브젝트가 즉시 읽히고, 한 손 조작이 불편하지 않아야 합니다. Unity로 고도화할 때는 단순히 에셋 수를 늘리는 것보다 피드백, 사운드, 타격감, 애니메이션 곡선, 숫자 가독성처럼 사용자가 바로 느끼는 품질에 먼저 투자합니다.
