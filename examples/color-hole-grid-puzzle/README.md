# Color-Hole Grid Puzzle Example

이 폴더는 색이 지정된 다중 칸 블록을 격자에서 움직여 같은 색의 승객을 수집하는 모바일 퍼즐을, AI 에이전트와 함께 독자적으로 설계하고 구현하기 위한 문서 중심 예시입니다. 상용 게임 `Drop Away: Color Puzzle`을 장르와 상호작용 연구 자료로 참고하지만, 이름·캐릭터·그래픽·UI·사운드·문구·레벨 배치·수치·코드를 복제하는 프로젝트가 아닙니다. 최종 프로젝트는 자체 제목, 자체 시각 언어, 자체 레벨과 자체 에셋을 가져야 합니다.

이 예시는 완성된 Unity 프로젝트나 원작 자료를 포함하지 않습니다. 대신 에이전트가 규칙을 추측해서 서로 다른 게임을 만들지 않도록 제품 목표, 권위 상태, 이동 판정, 레벨 형식, 테스트 기준과 단계별 완료 조건을 문서와 작은 샘플 데이터로 연결합니다. 구현 대상은 Unity 2D 세로형 모바일 앱을 기본값으로 삼지만, 순수 격자 규칙 계층은 다른 엔진에서도 재사용할 수 있습니다.

## Reading Order

먼저 kit 루트의 `README.md`, `AGENTS.md`, `08-security/SanitizationPolicy.md`를 읽습니다. 이어서 이 폴더의 `AGENTS.md`, `Docs/PRD.md`, `Docs/GameSpec.md`, `Docs/TechnicalArchitecture.md`, `Docs/LevelFormat.md`, `Docs/LevelDesignAndGeneration.md`, `Docs/AcceptanceTests.md`, `Docs/ImplementationPlan.md` 순서로 읽습니다. 구현 중 판단이 갈리면 `Docs/DecisionLog.md`를 확인하고, 외부 관찰의 근거와 한계는 `Docs/References.md`에서 확인합니다.

```text
color-hole-grid-puzzle/
  AGENTS.md
  README.md
  Docs/
    PRD.md
    GameSpec.md
    TechnicalArchitecture.md
    LevelFormat.md
    LevelDesignAndGeneration.md
    AcceptanceTests.md
    ImplementationPlan.md
    DecisionLog.md
    References.md
  Schemas/
    level.schema.json
  Levels/
    tutorial-001.json
    spread-demo-002.json
  WebDemo/
    index.html
    styles.css
    src/
    data/
    tests/
```

## Browser Playable Proof

[`WebDemo`](WebDemo/README.md)는 이 문서 계약을 엔진과 무관한 JavaScript로 실행하는 작은 검증용 웹 앱입니다. Play 탭은 `tutorial-001`의 1×2 수집 트레이, 한 칸씩 검사하는 드래그, 부분 충전, 제거, 승리와 재시작만 구현합니다. Spread Audit 탭은 `spread-demo-002`를 플레이 레벨이나 자동 생성 결과라고 가장하지 않고, 색별 거리·구역과 전체 2×2·3×3 밀도 계산을 읽기 전용으로 보여줍니다.

로컬 실행과 테스트, Vercel preview 배포 방법은 [`WebDemo/README.md`](WebDemo/README.md)에 있습니다. 이 웹 proof가 Unity 모바일 proof를 대신하지는 않지만, 같은 레벨 데이터와 규칙 계층으로 문서가 실제 코드로 옮겨지는지 빠르게 확인할 수 있습니다.

## First Playable Proof

첫 playable scene은 6×6 안팎의 한 화면 보드, 회전하지 않는 1×2 블록 하나, 같은 색 승객 두 명, 보드 경계 충돌, 부분 수집, 완전 충전 후 제거, 승리 표시와 재시작까지로 제한합니다. 사용자는 블록을 집어 직교 방향으로 움직이고, 같은 색 승객이 있는 칸을 지나며 한 명씩 수집한 뒤 블록을 제거해 한 레벨을 끝낼 수 있어야 합니다. 타이머, 다른 Hole, 다른 색 Passenger, 광고, 코인, 부스터, 복잡한 장애물, 메타 진행, 원격 서버와 스토어 결제는 playable scene에 넣지 않습니다.

proof가 끝났다는 기준은 화면이 그럴듯해 보이는 것이 아니라 같은 입력이 항상 같은 논리 결과를 만들고, 빠른 드래그로 경계를 관통하거나 대각선 모서리를 자를 수 없으며, 부분 충전과 제거가 자동 테스트와 실제 터치에서 모두 재현되는 것입니다. 다른 Hole, wall과 다른 색 Passenger 충돌은 playable scene에 추가하지 않고 순수 모델 fixture로 검증합니다. 구체적인 테스트는 `Docs/AcceptanceTests.md`를 source of truth로 사용합니다.

## First Agent Prompt

새 프로젝트 repo를 만든 뒤 이 예시 폴더를 `Docs`와 함께 복사하거나, 에이전트가 두 repo를 동시에 읽을 수 있게 한 다음 아래 프롬프트로 시작합니다.

```text
너는 독자적인 color-hole grid puzzle의 제품·구현 파트너다.

먼저 kit의 README.md, AGENTS.md, 08-security/SanitizationPolicy.md와
examples/color-hole-grid-puzzle/README.md, AGENTS.md, Docs의 연결 문서를
읽어라. 외부 게임은 규칙 연구의 참고자료일 뿐이며 이름, 에셋, UI,
사운드, 레벨, 스토어 문구를 복제하거나 다운로드해서 repo에 넣지 마라.

대상 프로젝트의 현재 Git 상태와 Unity 버전을 확인하고, 아직 코드를
작성하지 말고 먼저 Docs/ImplementationPlan.md의 Phase 0 결과를 보고하라.
불명확한 선택은 숨기지 말고 Docs/DecisionLog.md에 가정, 이유, 검증 방법을
기록하라. 첫 목표는 tutorial-001 한 레벨의 playable proof이며 타이머,
광고, 부스터, 메타게임은 범위 밖이다.

구현은 정수 격자 상태를 권위 상태로 두고 이동 경로를 한 칸씩 판정하라.
물리엔진이나 애니메이션이 규칙 상태를 직접 바꾸면 안 된다. 게임과
테스트가 동일한 MoveResolver를 사용하게 만들고, 각 단계가 끝날 때 관련
자동 테스트와 수동 smoke test를 실행하라. 완료 보고에는 변경 파일,
검증 명령과 결과, 남은 가정, 다음 한 단계를 포함하라.
```

## Build And Validation Flow

`Docs/ImplementationPlan.md`의 Phase 0부터 순서대로 진행하고, 각 phase의 완료 조건을 통과하기 전에는 새 장애물이나 polish 작업을 시작하지 않습니다. 레벨 데이터는 `Schemas/level.schema.json`과 `Levels/tutorial-001.json`을 기준으로 읽고, 게임 규칙의 예상 결과는 `Docs/GameSpec.md`와 `Docs/AcceptanceTests.md`를 함께 기준으로 삼습니다. 문서와 코드가 충돌하면 임의로 코드를 맞추지 말고 결정 로그를 갱신한 뒤 한쪽을 source of truth로 확정합니다.

## When AI-Generated Levels Look Clumped

AI에게 “여러 색을 적당히 흩어 배치해줘”라고만 지시하지 않습니다. `Docs/LevelDesignAndGeneration.md`는 같은 색끼리의 최소 Manhattan 거리·최대 연결 군집뿐 아니라, 색을 무시한 전체 occupied region과 2×2·3×3 밀집도까지 수치로 검사합니다. seeded farthest-point 배치와 repair mutation을 적용한 뒤 실제 `MoveResolver`를 사용하는 독립 Solver가 풀 수 있는 후보만 채택합니다. `Levels/spread-demo-002.json`은 세 색 아홉 명이 같은 색끼리도, 전체 군중으로도 몰리지 않는 검증 예시입니다.

첫 playable proof를 만드는 동안에는 자동 생성기를 구현하지 않습니다. core 이동이 `tutorial-001`과 first-proof acceptance를 통과한 뒤에만 생성기 단계로 이동하며, 생성 후보가 분산 지표나 solver 관문을 실패하면 제약을 몰래 낮추지 않고 해당 seed를 폐기합니다.

공개 전에는 kit 루트에서 다음 검사를 실행합니다.

```sh
bash scripts/check-no-secrets.sh .
git status --short
```

Unity 프로젝트에서는 선택한 `<UNITY_VERSION>`을 고정하고 EditMode 테스트, PlayMode smoke test, 실제 세로 화면 터치 확인을 차례로 수행합니다. 정확한 실행 명령은 프로젝트 생성 후 해당 repo의 `README.md`에 기록하며, 검증하지 못한 항목은 성공으로 표시하지 않습니다.

## Public And Copyright Safety

외부 영상과 스토어 페이지는 링크와 관찰 메모만 남깁니다. 영상 파일, 캡처 프레임, 앱 추출물, 캐릭터 모델, 원본 아이콘, 음원, 상용 레벨 데이터는 이 repo에 저장하지 않습니다. 임시 그래픽도 직접 만든 기하 도형과 명확히 구별되는 색·패턴을 사용하고, 출시 전에는 색만으로 상태를 구별하지 않는 자체 디자인으로 교체합니다. 실제 bundle identifier, Apple Team ID, tester 이메일과 key는 항상 `<BUNDLE_ID>` 같은 placeholder로 남깁니다.
