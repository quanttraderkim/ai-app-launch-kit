# Unity iOS Minimal Example

이 폴더는 실제 Unity 프로젝트를 포함하지 않습니다. 대신 에이전트가 새 Unity iOS 프로젝트를 만들 때 유지해야 할 최소 구조를 설명합니다. 공개 kit repo에 큰 binary asset이나 개인 signing 파일을 넣지 않기 위해 예시는 문서 중심으로 둡니다.

## Suggested Project Files

```text
MyGame/
  Assets/
  Packages/
  ProjectSettings/
  Docs/
    PRD.md
    ReleasePrep.md
    PlayerValueIterations.md
  Builds/
    ios/              # ignored or generated
```

## First Unity iOS Proof

첫 proof는 한 화면, 한 조작, 한 결과로 좁힙니다. 게임이라면 캐릭터 하나, 적 하나, 보상 하나, 성장 한 번처럼 사용자가 가치를 느끼는 가장 작은 루프를 닫습니다. 앱이라면 입력 하나, 결과 하나, 저장 또는 공유 하나로 충분합니다.

## Growing a Game Mechanic in Slices

게임 메커니즘(예: 드랍 → 조합 → 성장)을 추가할 때는 한 번에 다 만들지 말고 vertical slice로 끊습니다.

- **순수 모델과 UI를 분리한다.** 드랍/머지/장착 같은 규칙은 UnityEngine에 의존하지 않는 순수 C# 클래스로 두면 결정적이고 테스트 가능합니다. UI(슬롯·아이콘)는 그 모델을 읽어 그리기만 합니다.
- **slice마다 컴파일 + 시뮬레이터 검증.** Slice 1(드랍 → 슬롯 표시) → Slice 2(같은 것 머지 → 상위 tier) → Slice 3(색 패널 → 실제 아이콘)처럼, 각 단계를 배치 컴파일과 sim 스크린샷으로 확인하고 넘어갑니다.
- **기존 시스템 위에 점진적으로.** 새 성장(무기)을 기존 성장(강화)과 `max()`로 병행하면, 코어를 한 번에 갈아엎지 않고도 새 재미를 얹을 수 있습니다.
- **에셋은 반복 생성.** 아이콘·스프라이트는 PixelLab 같은 도구로 만들고, 어긋나면(예: 활이 막대처럼 나옴) 프롬프트를 고쳐 그 하나만 재생성합니다. 애니·스프라이트 생성의 구체적 파이프라인과 함정은 `03-ios-unity-setup/PixelArtAnimationPipeline.md`를 참고하세요.

## Reworking the Core Loop in Slices (static → moving)

작은 피처만 slice로 끊는 게 아니라 **코어 루프 자체를 크게 바꿀 때도** 같은 방식이 안전합니다. 정적 1:1 전투("탭해서 공격")를 던전을 이동하며 싸우는 자동 크롤러로 옮긴 경험:

- **상태 머신으로 나눈다.** `Advancing`(배경 스크롤 + walk 애니) ↔ `Fighting`(멈춰서 자동 공격)처럼 상태를 명시하면, 이동과 전투를 한 덩어리로 섞지 않고 각 상태를 따로 검증할 수 있습니다.
- **기존 규칙을 재사용한다.** 데미지·HP·처치·드랍/성장 규칙(순수 모델)은 그대로 두고 위에 이동·조우·자동 진행만 얹습니다. 코어를 새로 쓰지 않아 회귀가 적습니다.
- **수동 입력을 자동으로 대체.** "탭해서 공격"을 타이머 기반 자동 전투로 바꾸면, 중복된 수동 버튼(CTA)은 숨깁니다. idle 게임에 맞고 조작이 단순해집니다.
- **slice로 옮긴다.** Slice 1(배경 세로 스크롤 + walk 애니, 적 없음) → Slice 2(조우 → 자동 전투 → 처치 → 재개) → Slice 3(연속 몬스터·보스·성장 결합). 각 단계를 컴파일 + sim으로 확인하고 넘어갑니다.
- **자기 점검(self-check)은 sim 전용으로 취급.** 코어를 크게 바꾸면 UI 문자열에 묶인 검증이 깨질 수 있습니다. 그런 검증은 시뮬레이션 전용으로 두고 프로덕션과 분리하면, 재설계가 검증에 발목 잡히지 않습니다.

## Difficulty & Boss Curve by Reusing Assets

난이도 곡선과 보스는 **이미 만든 에셋을 조건 분기로 재사용**하면 적은 비용으로 붙습니다.

- **진행도에 따라 스프라이트/배경 교체.** 예: 일반 몹 → 강한 몹(깊이 3+) → 보스(깊이 5+), 배경도 풀밭 → 화산 아레나. 새 로직 없이 `SpriteForDepth(depth)` 같은 분기 하나로 시각이 확 달라집니다.
- **보스는 값 몇 개로 "진짜 싸움"처럼.** 5의 배수 깊이만 보스로 잡아 HP를 배수로 올리고, 라벨 색을 바꿔(예: 초록 → 빨강) 신호를 줍니다. 전용 보스 스프라이트가 없어도 기존 강한 몹을 크게·틴트해 대신할 수 있습니다.
- **스크롤 배경은 타일 두 장을 같은 스프라이트로.** 세로 스크롤을 두 장 번갈아 그릴 때 깊이가 바뀌어 배경 스프라이트를 교체하면 **두 장 모두** 바꿔야 합니다. 한 장만 바꾸면 스크롤 도중 두 배경이 번갈아 깜빡입니다(실제로 겪은 버그).

## Deploy Script Example

`deploy-testflight.sh.example`는 ASC API 자동 서명으로 TestFlight에 업로드하는 참고용 스크립트입니다. 그대로 실행하지 말고, placeholder를 본인 프로젝트 값으로 바꾸고 비밀값은 환경변수/키체인에서 주입한 뒤 본인 repo로 복사해 쓰세요. 단계별 설명은 `04-app-store-connect-testflight/TestFlightRunbook.md`의 경로 B에 있습니다.

## What Not To Copy Into Public Repo

Unity Library 폴더, DerivedData, iOS archive, `.ipa`, signing certificate, provisioning profile, paid asset 원본은 public template repo에 넣지 않습니다.
