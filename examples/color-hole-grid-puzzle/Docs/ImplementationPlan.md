# Implementation Plan

이 계획은 문서를 읽은 AI 에이전트가 한 번에 전체 게임을 만들려 하지 않고, 결정론적인 first playable proof를 작은 검증 단위로 완성하게 하는 실행 순서다. Unity 2D와 C#을 기본 경로로 설명하지만, 엔진 API보다 순수 격자 모델과 동일한 완료 조건을 우선한다. 각 phase는 이전 phase의 검증이 통과한 뒤 시작하고, 실패가 남아 있으면 다음 기능을 붙이지 않는다.

## Target Project Shape

대상 Unity repo에서는 규칙과 표현을 물리적으로 분리한다. 이름은 프로젝트에 맞게 바꿀 수 있지만 책임 경계는 유지한다.

```text
Assets/
  Game/
    Core/             # 엔진 오브젝트에 의존하지 않는 BoardState, MoveResolver, 규칙
    Data/             # level DTO, loader, validation result
    Input/            # pointer를 격자 의도로 변환
    Presentation/     # MonoBehaviour, view, animation, audio, haptics
  Tests/
    EditMode/         # 순수 규칙과 level validation
    PlayMode/         # scene wiring, drag, 결과 화면 smoke test
Docs/
  PRD.md
  DecisionLog.md
  Handoff.md
```

`Core`는 `UnityEngine.Vector2`, Transform, Collider, time delta에 의존하지 않고 정수 좌표와 명시적인 command/result 타입만 다룬다. `Presentation`은 모델 결과를 읽어 화면을 갱신할 수 있지만 직접 승객을 삭제하거나 블록을 완료 상태로 바꿀 수 없다.

## Phase 0: Baseline And Scope Lock

에이전트는 먼저 대상 repo의 branch와 dirty worktree, Unity Editor 버전, 설치된 package, 현재 scene과 테스트 실행 방법을 확인한다. 이 예시 문서를 대상 프로젝트의 `Docs`에 복사하거나 링크하고, `<UNITY_VERSION>`, orientation, 지원하는 첫 플랫폼과 실행 명령을 프로젝트 README에 기록한다. 외부 게임 에셋이나 캡처가 repo에 이미 있다면 삭제 권한을 임의로 가정하지 말고 사용을 중단한 상태로 사용자에게 보고한다.

완료 조건은 first proof의 포함 범위와 제외 범위가 PRD에 연결되고, `tutorial-001`을 한 문장으로 설명할 수 있으며, 빈 EditMode 테스트 한 개와 빈 PlayMode scene을 로컬에서 실행할 수 있는 것이다. Unity 설치나 테스트 runner가 막히면 코어 규칙의 순수 C# 테스트 경로를 먼저 확보하고 blocker를 handoff에 남긴다.

## Phase 1: Pure Grid Domain

정수 `GridCell`, 사용 가능한 칸을 나타내는 `BoardMask`, 고정된 로컬 offset 목록을 가진 `HoleState`, 보드 위의 `PassengerState`, 전체 `BoardState`를 만든다. Hole 내부에 들어간 승객과 보드 위 승객은 같은 점유물로 중복 관리하지 않으며, 수집된 로컬 슬롯은 비트마스크 또는 크기가 고정된 동등한 구조로 저장한다. 모든 id, 색과 shape offset은 load 시점에 검증한다.

이 phase에서는 화면이나 드래그를 만들지 않는다. 샘플 상태를 생성하고 직렬화와 무관한 순수 테스트로 shape footprint, board mask 포함 여부, 슬롯 수와 점유 mask, 중복 id, 중복 offset을 검증한다.

완료 조건은 1×1, 1×2, L형 footprint가 anchor 기준으로 예상 칸을 반환하고, 보드 밖 또는 잘못된 level 데이터가 사용자에게 설명 가능한 validation error를 내며, 테스트 실행 순서에 관계없이 상태가 같게 생성되는 것이다.

## Phase 2: Deterministic Move Resolver

`MoveResolver`가 현재 `BoardState`와 한 칸의 직교 이동 의도를 받아 `MoveResult`와 다음 상태를 반환하게 한다. 한 칸 이동은 보드 mask, 다른 Hole footprint, 고체 장애물과 수집 불가능한 승객을 고정된 순서로 검사한다. 이동 실패는 상태를 바꾸지 않고 `OutOfBoard`, `OverlapsHole`, `PassengerMismatch`처럼 `TechnicalArchitecture.md`에 정의된 이유를 반환한다.

여러 칸 드래그는 목표 위치로 순간 이동시키지 않는다. 별도의 path tracer가 시작 anchor에서 목표 anchor까지 직교 step 목록을 만들고, resolver가 각 step을 순서대로 처리해 첫 invalid step 직전에서 멈춘다. X와 Y가 동시에 달라질 때 적용할 축 우선순위는 `Docs/GameSpec.md`와 `Docs/DecisionLog.md`에 고정하며, 같은 입력은 같은 path가 되어야 한다.

완료 조건은 느린 드래그와 한 프레임의 긴 드래그가 같은 경로에서 같은 결과를 만들고, 벽 뒤로 순간 이동하지 않으며, 두 고체 사이의 대각선 모서리를 자르지 않는 것이다. 이 조건은 View 없이 EditMode 테스트로 먼저 통과시킨다.

## Phase 3: Collection, Completion And Win

유효한 한 칸 이동이 끝날 때 Hole footprint와 보드 승객을 비교한다. 같은 색이고 대응 로컬 슬롯이 비어 있으면 승객을 보드 컬렉션에서 제거하고 그 슬롯을 채운다. 같은 step에서 여러 후보가 생길 수 있으므로 local slot index와 passenger id 같은 안정적인 순서를 문서에 고정한다. 수집, Hole 완성, Hole 제거, 승리 판정은 하나의 명시적 event queue에서 순서대로 처리한다.

논리 이벤트는 애니메이션 완료를 기다리지 않는다. 첫 proof의 승리는 필수 승객과 활성 Hole이 모두 해결되고 처리할 이벤트가 없을 때 발생하며, 완료되지 않은 Hole이나 보드 승객이 남아 있으면 승리하지 않는다. 재시작은 최초 level snapshot에서 새 상태를 만들고 이전 animation callback이나 입력 capture를 폐기한다.

완료 조건은 첫 승객 뒤에 부분 충전 Hole이 남고, 두 번째 승객 뒤에만 Hole이 제거되며, 다른 색 승객을 수집하지 않는 것이다. 수집과 제거가 같은 step에서 일어나도 승리 판정이 한 번만 발생하고, 재시작 후 모든 id와 slot mask가 초기값으로 돌아와야 한다.

## Phase 4: Input And Presentation

한 개의 `DragController`가 pointer down에서 선택된 Hole과 grab offset을 저장하고, pointer move를 board-local 좌표와 목표 grid anchor로 바꿔 path command를 보낸다. pointer가 UI 위에 있거나 완료된 Hole을 가리키면 drag를 시작하지 않는다. multi-touch는 first proof에서 첫 pointer만 소유권을 갖게 하고, 취소·앱 background·scene 종료 시 capture를 명시적으로 해제한다.

View는 모델 anchor를 화면 좌표로 보간하고, 막힌 이동에는 마지막 유효 anchor를 표시한다. 수집과 제거 연출 중에도 권위 상태는 이미 확정되어 있어야 하며, 연출 callback이 중복 호출되어도 모델 이벤트를 다시 적용하지 않는다. 임시 그래픽은 자체 제작 도형과 패턴만 사용한다.

완료 조건은 마우스와 실제 touch에서 같은 칸을 선택할 수 있고, 손가락을 빠르게 움직여도 관통하지 않으며, drag 취소 후 다음 입력이 정상 동작하는 것이다. 해상도와 safe area가 다른 세로 화면 두 종류에서 보드와 재시작 UI가 잘리지 않아야 한다.

## Phase 5: Data-Driven Tutorial Level

`Docs/LevelFormat.md`, `Schemas/level.schema.json`, `Levels/tutorial-001.json`을 기준으로 loader를 만든다. JSON 문법 검증 뒤 schema와 의미 검증을 분리해, 잘못된 shape, 겹친 초기 배치, 보드 밖 승객, 존재하지 않는 색처럼 사람이 수정할 수 있는 오류 메시지를 반환한다. runtime은 성공적으로 검증된 immutable definition에서 새 `BoardState`를 생성한다.

완료 조건은 scene 코드에 승객 좌표가 하드코딩되지 않고, 샘플 JSON만 바꿔 보드가 바뀌며, 잘못된 level이 조용히 잘못 그려지는 대신 로드를 중단하고 원인을 보여주는 것이다. tutorial-001은 first proof의 자동 테스트 fixture와 실제 playable scene에서 같은 데이터를 사용한다.

## Phase 6: Acceptance Gate

`Docs/AcceptanceTests.md`의 first proof 항목을 자동 테스트와 수동 smoke test로 실행한다. playable scene과 touch smoke test에서는 보드 경계, 부분 충전, 완전 충전 제거, 빠른 드래그, 대각선 corner cut, 승리 1회, 재시작과 입력 취소를 확인한다. Hole 간 겹침, wall과 다른 색 Passenger는 작은 순수 모델 fixture로 검증하며 tutorial scene에 억지로 추가하지 않는다. 테스트 실패를 임시 예외나 특정 level id 분기로 우회하지 않는다.

완료 조건은 EditMode와 PlayMode 결과, 사용한 Unity 버전, 테스트 기기 또는 simulator, 알려진 차이를 handoff에 남기고, secret 검사와 `git status --short` 결과까지 확인하는 것이다. 수동 항목을 실행하지 못했으면 proof는 “자동 테스트 완료, 기기 검증 대기”로 보고한다.

## Phase 7: Player Validation And MVP Expansion

first proof를 3~5명에게 설명 없이 보여 주고 첫 행동, 막힌 지점, 오조작과 완료 시간을 개인 식별정보 없이 기록한다. 플레이어가 목표를 이해하지 못하면 장애물이나 새 시스템을 추가하지 말고 색·패턴, 선택 피드백, 목표 표현을 먼저 고친다. 핵심 이동이 안정된 뒤에만 여러 Hole과 색, 선택적 타이머, 한 종류의 특수 규칙을 각각 별도 iteration으로 추가한다.

새 규칙은 `GameSpec`, level schema, sample level, resolver 테스트, acceptance test와 decision log를 같은 변경에서 갱신한다. 다른 블록 제거 후 생성되는 대기열 같은 기능을 추가하면 승리 조건과 event queue도 함께 확장한다. solver를 만들 때는 런타임과 다른 간이 규칙을 복제하지 말고 동일 resolver를 호출한다.

## Phase 8: Level Authoring And Spread Generator

first proof와 Phase 7의 플레이 검증이 끝난 뒤에만 `Docs/LevelDesignAndGeneration.md`를 구현한다. 먼저 runtime `MoveResolver`를 그대로 사용하는 recorded trace replay와 독립 solver를 만들고, `spread-demo-002`의 고정 기대값을 검증한다. 그다음 seeded farthest-point 배치, 색별 거리·군집·region, 전체 region·2×2·3×3 측정과 repair mutation을 순서대로 추가한다.

웹 예제의 tutorial용 BFS/A*와 difficulty vector는 solver 계약을 작게 실행해 보는 선행 slice다. 이것이 구현되어 있어도 다중-Hole `spread-demo-002`의 독립 해답, macro-action 탐색, generator와 repair가 통과하지 않으면 Phase 8 완료로 표시하지 않는다. 상세 알고리즘 선택과 공정한 난이도 적응 정책은 `Docs/AlgorithmSystem.md`를 따른다.

AI에게 완성 레벨 JSON을 자유 형식으로 생성하게 하지 않는다. AI는 board와 난이도 의도를 제안할 수 있지만, 실제 Passenger 위치는 결정적인 generator와 validator가 선택하고 모든 rejection reason을 기록한다. 분산 지표를 통과해도 recorded trace 또는 독립 solver가 실패하면 레벨을 폐기하며, solver budget 초과를 성공이나 unsolvable로 표시하지 않는다.

완료 조건은 `AcceptanceTests.md`의 `GEN-*`, `REV-*`, `SOL-*`, `EXAMPLE-*`가 통과하고, 같은 seed로 100회 생성한 canonical JSON hash가 같으며, 일부러 같은 색을 붙인 fixture를 제한된 mutation 안에 고치거나 명시적으로 실패하는 것이다. 실제 캠페인에 넣을 레벨은 생성 seed, constraint 결과, solver 탐색량과 검토한 플레이 감각을 함께 handoff에 남긴다.

## Final Handoff Template

```text
Project: <PROJECT_NAME>
Repo path: <REPO_PATH>
Current branch: <BRANCH>
Latest commit: <COMMIT_HASH>
Uncommitted changes: <NONE_OR_FILE_AND_REASON>
Unity version: <UNITY_VERSION>
Implemented phase: <PHASE>
Validation performed: <COMMANDS_AND_REAL_RESULTS>
Manual device check: <DEVICE_OR_NOT_RUN>
Known assumptions/blockers: <ITEMS>
Next action: <ONE_CONCRETE_ACTION>
Do not touch: <USER_OWNED_CHANGES>
```
