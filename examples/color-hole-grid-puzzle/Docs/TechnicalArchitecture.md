# Technical Architecture

이 문서는 엔진과 무관한 권위 상태, Unity 입력·표현 계층, 검증기와 솔버가 같은 규칙을 공유하도록 만드는 구조를 정의합니다. 첫 구현이 Unity가 아니어도 계층과 책임은 그대로 적용할 수 있습니다.

## Design Principle

핵심 원칙은 **결정적인 정수 격자 Model을 먼저 만들고, Unity는 입력 어댑터와 View로만 사용한다**입니다. Rigidbody, Collider와 애니메이션 위치는 게임 판정의 근거가 아닙니다.

```text
Level JSON
   |
LevelLoader -> SemanticValidator
   |
BoardModel <-> MoveResolver <-> StableEventQueue
   |                |
StateHasher      RulePipeline
   |
Unity View / Input Adapter

BoardModel + MoveResolver + EventQueue
   |
Solver / Generator / Headless Tests
```

## Suggested Project Boundaries

Unity 프로젝트로 옮길 때 아래처럼 runtime core와 표현 계층을 분리합니다. 실제 namespace와 폴더명은 프로젝트에 맞게 바꿀 수 있지만 의존 방향은 유지합니다.

```text
Assets/Game/Core/
  BoardModel.cs
  HoleState.cs
  PassengerState.cs
  MoveResolver.cs
  StableEventQueue.cs
  ObjectiveEvaluator.cs
  StateHasher.cs

Assets/Game/LevelData/
  LevelDefinition.cs
  LevelLoader.cs
  LevelSemanticValidator.cs

Assets/Game/Rules/
  IMovementRule.cs
  IOverlapRule.cs
  IEventReaction.cs
  ICompletionRule.cs

Assets/Game/UnityView/
  BoardPresenter.cs
  HoleView.cs
  PassengerView.cs
  DragInputAdapter.cs
  GameFeelTimeline.cs

Assets/Game/Editor/
  LevelValidationCommand.cs
  LevelSolver.cs
  LevelGenerator.cs

Assets/Tests/
  Core/
  LevelData/
  PlayMode/
```

`Core`와 `LevelData`의 논리 타입은 가능한 한 `UnityEngine`에 의존하지 않습니다. `Vector2Int` 대신 자체 `GridCell` record를 쓰면 headless .NET 테스트로도 실행할 수 있습니다. Unity 편의성을 위해 `Vector2Int`를 쓰더라도 GameObject, Transform, Physics API가 core에 들어가면 안 됩니다.

## BoardModel

BoardModel은 다음 runtime 상태를 소유합니다.

```text
board mask
active holes and their anchors/socket masks/status
active passengers and their cells/tags
obstacle and mechanism component states
spawn queues
timer state (first proof에서는 disabled)
level status
logical event queue
active drag identity, if any
```

점유 그리드를 중복된 영구 상태로 저장하기보다 Hole의 `anchor + shapeOffsets`에서 계산합니다. 성능이 필요하면 한 논리 tick 동안만 캐시하고, Hole 전이나 제거 뒤에는 명시적으로 무효화합니다. anchor와 occupancy cache가 서로 다른 상태가 되는 것을 막기 위해서입니다.

BoardModel 외부에는 가변 collection을 직접 노출하지 않습니다. View는 immutable snapshot 또는 읽기 전용 projection을 받습니다.

## MoveResolver

MoveResolver만 Hole anchor와 Passenger 수집 상태를 변경할 수 있습니다. 입력 어댑터는 pointer를 board 좌표로 변환해 목표 anchor를 요청할 뿐 직접 Transform이나 Model을 이동시키지 않습니다.

### Path Sweep

현재 anchor와 목표 anchor 사이를 endpoint 한 번으로 판정하면 빠른 드래그가 장애물을 관통합니다. 다음 방식으로 경로를 구성합니다.

1. pointer의 연속 board 좌표에서 목표 정수 anchor를 계산합니다.
2. 현재 anchor와 목표 사이의 직교 한 칸 전이 목록을 만듭니다.
3. 대각선 변화는 누적 이동량이 큰 축부터 한 칸씩 처리합니다.
4. 각 한 칸 전이에 `CanEnter`, collection, event resolution을 실행합니다.
5. 막히면 그 축의 이동만 멈추고 다른 축이 가능한 경우 벽을 따라 slide할 수 있게 합니다.
6. Hole이 완료되면 남은 경로를 버리고 active drag를 종료합니다.

Grid DDA, supercover line 또는 누적 cell-boundary crossing 방식 중 하나를 사용할 수 있습니다. 어떤 방식을 선택하든 동일한 pointer sample 목록이 같은 cell transition 목록을 생성해야 합니다.

### CanEnter

`CanEnter`는 다음 순서로 검사하면 디버깅 이유를 명확히 반환할 수 있습니다.

```text
OutOfBoard
InactiveMaskCell
OverlapsHole
OverlapsSolidObstacle
PassengerMismatch
PassengerSlotAlreadyFilled
MovementRuleRejected
Allowed
```

단순 bool 대신 reason enum을 반환하면 잘못된 이동 시 red flash, 디버그 overlay와 테스트 assertion에서 같은 정보를 사용할 수 있습니다.

## StableEventQueue

한 번의 전이로 여러 Passenger가 수집되고 Hole 제거가 다른 장치를 열 수 있으므로, side effect를 메서드 여기저기에서 즉시 실행하지 않습니다. 이벤트를 큐에 넣고 priority와 stable key로 정렬해 완전히 해석합니다.

권장 정렬 키는 `(phase, sourceEntityId, localSlotIndex, sequence)`입니다. ID는 level data에서 고정되므로 같은 입력은 같은 이벤트 순서를 만듭니다.

```text
Phase 10: PassengerCollected
Phase 20: HoleCompleted
Phase 30: HoleRemoved
Phase 40: DeviceUpdated
Phase 50: SpawnOrReveal
Phase 60: ObjectiveEvaluated
Phase 70: WinOrFailCommitted
```

이벤트 처리기가 같은 종류의 이벤트를 다시 만들 수 있으므로, 큐가 빌 때까지 처리하되 한 logical tick의 최대 event 수를 두어 순환 링크를 명확한 오류로 중단합니다. 최대치에 도달하면 레벨 ID와 마지막 이벤트 체인을 출력합니다.

## Rule Composition

특수 기능은 큰 상속 트리나 `switch (obstacleType)` 한 곳에 모두 넣지 않습니다. 아래 작은 정책으로 core transition을 확장합니다.

```text
IMovementRule     anchor 또는 edge 전이를 허용하는가
IOverlapRule      특정 footprint와 Passenger/terrain 겹침을 허용하는가
IDragGateRule     이 Hole을 지금 잡을 수 있는가
IEventReaction    특정 논리 이벤트에 어떻게 반응하는가
ICompletionRule   채운 Hole을 지금 제거할 수 있는가
ISpawnRule        어떤 조건에서 무엇을 생성하는가
```

예를 들어 Rail은 허용 anchor graph를 검사하는 `IMovementRule`, Snake는 `HoleRemoved`를 받아 tail segment를 하나 줄이는 `IEventReaction`, Stitched Hole은 연결된 group이 모두 찼는지 확인하는 `ICompletionRule`로 구현할 수 있습니다.

규칙 컴포넌트도 Model만 변경하고 View를 직접 호출하지 않습니다. 필요한 연출은 논리 이벤트를 View가 구독해 재생합니다.

## Unity Input Adapter

DragInputAdapter의 책임은 제한적입니다.

```text
screen pointer -> board plane 위치 변환
hit-test 결과로 Hole ID 선택
grab offset 유지
MoveResolver에 desired anchor 전달
pointer release/cancel 전달
pause와 input lock 준수
```

Hole 선택은 Collider raycast를 사용할 수 있지만, 선택 이후 충돌과 이동 판정은 Physics에 맡기지 않습니다. 카메라는 플레이 중 고정된 orthographic 또는 고정 perspective를 사용하여 pointer-to-grid 변환이 흔들리지 않게 합니다.

## View And Animation

Presenter는 Model snapshot과 이벤트를 읽어 다음을 표현합니다.

- 선택 시 Hole lift, outline과 shadow
- 승인 이동의 위치 보간
- 막힌 이동 reason에 따른 짧은 피드백
- Passenger가 정확한 로컬 슬롯으로 들어가는 곡선 트윈
- Hole 완료 후 sink/fade와 board cell 강조
- 승리·실패 결과 연출

논리 제거는 애니메이션보다 먼저 끝납니다. 입력을 잠가야 하는 짧은 연출이 있다면 `LevelController`의 presentation lock을 사용하되 Model을 애니메이션 완료 시점까지 반쯤 남겨두지 않습니다.

## Level Loading And Validation

로드는 두 단계입니다.

1. JSON Schema가 타입, 필수 필드와 기본 범위를 검사합니다.
2. SemanticValidator가 게임 의미상 불변식을 검사합니다.

SemanticValidator는 mask 행 길이, ID 중복, shape offset 중복과 4방향 연결성, 초기 footprint의 board 이탈, 초기 엔티티 겹침, `initialFilledSlots` 범위, 색별 슬롯 수와 Passenger 수, dangling link를 확인합니다. 실제로 풀 수 있는지는 Solver가 담당합니다.

오류는 첫 문제만 `false`로 반환하지 말고 가능한 검증 오류를 모아 다음처럼 출력합니다.

```text
LEVEL_INVALID spread-demo-002
- HOLE_OUT_OF_MASK green_l at anchor (6, 4), slot 2 -> (8, 5)
- DUPLICATE_ID passenger red_02
```

## Solver

Solver가 게임과 별도의 단순화된 이동 규칙을 가지면 “검증은 통과하지만 실제 플레이는 막히는” 레벨이 생깁니다. Solver는 같은 BoardModel, MoveResolver와 StableEventQueue를 호출합니다.

Solver 상태 키에는 최소한 다음이 들어갑니다.

```text
각 active Hole의 anchor, occupiedSlotMask, runtime status
active Passenger bitset 또는 정렬된 cell/tag 상태
mechanism component state
spawn queue indices
timer를 제외한 objective state
```

탐색용 transposition key에는 논리 tick, event sequence, 마지막 거부 이유와 animation 상태처럼 이후 합법 행동을 바꾸지 않는 이력을 넣지 않습니다. Replay 검증용 state hash에는 tick을 포함할 수 있으므로 두 키의 목적과 이름을 분리합니다. 오른쪽으로 한 칸 이동했다 되돌아온 상태는 replay 이력은 다르지만 solver에서는 같은 상태입니다.

타이머는 first proof 범위 밖이며, 이후 도입해도 Solver는 먼저 시간을 무시하고 논리적 풀이 가능성을 검사합니다. 시간 제한 적합성은 solver의 최소 경로 길이와 실제 플레이 테스트 분포를 별도로 사용합니다.

사람 수집과 장치 발동은 이동 경로 중간에 일어나므로 Solver의 action을 단순 `(hole, destination)`으로 정의하면 안 됩니다. 한 칸 전이를 기본 edge로 사용하거나, capture/event가 없는 연속 구간만 하나의 macro action으로 합칩니다.

작은 보드는 BFS로 최단 경로를 증명하고, 큰 보드는 A* 또는 IDA*와 transposition table로 반복 상태를 제거합니다. A* heuristic은 실제 남은 비용을 넘지 않는 하한이어야 합니다. 첫 구현은 각 색의 남은 Passenger가 유효 슬롯에 들어갈 수 있는 anchor까지의 Manhattan 거리 하한을 사용하며, 성능이 부족하면 event가 없는 연속 이동을 macro action으로 합치고 deadlock pruning을 추가합니다. Solver 선택, 난이도 vector와 생성 algorithm의 전체 계약은 `AlgorithmSystem.md`를 따릅니다.

## Generator Contract

LevelGenerator는 자유 형식 텍스트를 받아 AI가 한 번에 JSON을 만들어내는 도구가 아닙니다. `LevelDesignAndGeneration.md`의 결정적 파이프라인을 구현합니다. Level JSON에는 Schema가 허용하는 seed, algorithm, constraints, repair·solver 설정과 trace만 저장합니다. 다음 파생 결과는 runtime LevelDefinition이 아니라 CI artifact 또는 `GeneratedReports/<LEVEL_ID>.validation.json` sidecar에 남깁니다.

```text
schema version과 level canonical hash
generator tool version 또는 generator commit hash
spread metrics
difficulty metrics
rejection reasons
recorded replay와 independent solver 통계
authored override 여부
```

sidecar report는 Level JSON Schema의 일부가 아니며 게임 빌드에 포함할 필요가 없습니다. 같은 schema, seed, generator version과 constraints는 같은 레벨을 만들어야 합니다. 생성된 레벨을 손으로 수정했다면 seed 재생성 결과와 동일하다고 주장하지 않고 report의 `authoredOverride`를 true로 기록합니다.

## State Hash And Replay

StateHasher는 dictionary 순회 순서나 GameObject instance ID에 의존하지 않습니다. 엔티티를 고정 ID로 정렬하고 primitive 값만 직렬화해 hash를 만듭니다.

테스트 replay는 frame timestamp가 아니라 다음 논리 입력을 기록합니다.

```text
SelectHole(holeId, grabbedSlot)
MoveIntent(targetAnchor)
Release
PauseChanged(value)
```

서로 다른 frame rate와 pointer sample 빈도로 replay해도 승인된 cell transition 목록과 최종 state hash가 같아야 합니다.

## Failure Diagnostics

AI 에이전트가 문제를 추측으로 고치지 않도록 다음 정보를 로그에 남깁니다.

```text
level id and seed
pre-state hash
requested and accepted anchor path
first rejected transition and reason
collected passenger/slot pairs
event chain
post-state hash
```

Solver가 실패하면 “unsolvable”만 출력하지 말고 탐색한 상태 수, 가장 깊은 진행, 남은 Hole/Passenger와 첫 dead-end transition을 기록합니다. Generator가 후보를 버릴 때도 spread 실패인지 solvability 실패인지 구분합니다.

## Implementation Stop Conditions

다음 중 하나라도 발생하면 View 기능 추가를 멈추고 core를 먼저 수정합니다.

- 같은 replay가 실행마다 다른 state hash를 만듭니다.
- 빠른 드래그가 중간 blocker를 통과합니다.
- restart 후 초기 hash가 달라집니다.
- Solver와 실제 MoveResolver가 같은 입력에 다른 결과를 만듭니다.
- 레벨 생성기가 seed와 rejection reason을 재현하지 못합니다.
- 애니메이션 callback 없이는 논리 레벨이 완료되지 않습니다.
