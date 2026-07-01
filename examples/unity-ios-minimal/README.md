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
- **에셋은 반복 생성.** 아이콘·스프라이트는 PixelLab 같은 도구로 만들고, 어긋나면(예: 활이 막대처럼 나옴) 프롬프트를 고쳐 그 하나만 재생성합니다.

## Deploy Script Example

`deploy-testflight.sh.example`는 ASC API 자동 서명으로 TestFlight에 업로드하는 참고용 스크립트입니다. 그대로 실행하지 말고, placeholder를 본인 프로젝트 값으로 바꾸고 비밀값은 환경변수/키체인에서 주입한 뒤 본인 repo로 복사해 쓰세요. 단계별 설명은 `04-app-store-connect-testflight/TestFlightRunbook.md`의 경로 B에 있습니다.

## What Not To Copy Into Public Repo

Unity Library 폴더, DerivedData, iOS archive, `.ipa`, signing certificate, provisioning profile, paid asset 원본은 public template repo에 넣지 않습니다.
