# Level Data Format

레벨은 코드에 하드코딩하지 않고 JSON으로 정의합니다. `Schemas/level.schema.json`은 구조 검증용이고, 이 문서는 각 필드의 게임 의미와 Schema만으로 검사할 수 없는 조건을 설명합니다.

## Coordinate And Mask Rules

좌표 `(0, 0)`은 왼쪽 위이며 X는 오른쪽, Y는 아래로 증가합니다. `board.mask[y][x]`가 `1`이면 활성 칸이고 `0`이면 Hole과 Passenger가 존재할 수 없는 칸입니다.

```json
"board": {
  "width": 6,
  "height": 6,
  "origin": "top-left",
  "mask": [
    "111111",
    "111111",
    "110011",
    "111111",
    "111111",
    "111111"
  ]
}
```

Schema는 mask가 문자열 배열인지 검사하지만 각 문자열 길이가 `width`인지, 행 수가 `height`인지까지 완전히 보장하지 못합니다. SemanticValidator에서 확인합니다.

## Top-Level Fields

```text
schemaVersion   데이터 형식 버전. 현재 1
id              저장·로그·테스트에서 사용하는 안정적인 고유 ID
board           크기와 활성 칸 mask
rules           이동·수집·타이머 규칙
generation      seed, 분산 제약, repair와 solver 검증 설정
holes           시작 Hole 목록
passengers      시작 Passenger 목록
obstacles       첫 proof에서는 빈 배열
reverseGenerationTrace  역생성 제작 기록과 검증 증거
solutionTrace   실제 MoveResolver로 replay할 수 있는 정방향 풀이 증거
```

## Rules

첫 proof에서는 모호한 동작을 레벨마다 다르게 두지 않고 아래 값으로 고정합니다.

```json
"rules": {
  "timeLimitSeconds": 0,
  "mismatchedPassenger": "solid",
  "collectionTiming": "on-cell-entry",
  "dragPath": "orthogonal-sweep",
  "diagonalTieBreak": "horizontal-first",
  "win": {
    "clearPassengers": true,
    "completeRequiredHoles": true,
    "emptySpawnQueues": true
  }
}
```

`timeLimitSeconds`의 0은 타이머 비활성을 뜻하며 first proof는 반드시 0입니다. proof 이후 타이머 iteration에서만 양수를 사용합니다. 나머지 규칙은 `schemaVersion: 1`에서 고정하며 다른 값은 새 버전과 acceptance test 없이 허용하지 않습니다.

## Hole

```json
{
  "id": "orange-line",
  "colorId": "orange",
  "anchor": {"x": 1, "y": 2},
  "shape": [
    {"x": 0, "y": 0},
    {"x": 1, "y": 0}
  ],
  "initialFilledSlots": [],
  "traits": []
}
```

Hole의 실제 칸은 `anchor + shape[i]`입니다. `shape` 순서가 로컬 슬롯 인덱스이므로, 파일을 보기 좋게 정렬한다는 이유로 런타임에서 순서를 다시 바꾸면 안 됩니다. 모든 offset은 고유해야 하고 `(0, 0)`을 포함하는 것을 권장합니다.

첫 proof의 shape는 상하좌우로 연결된 하나의 폴리오미노여야 합니다. 대각선만 닿는 칸이나 분리된 두 조각은 SemanticValidator가 거부합니다. `initialFilledSlots`는 shape 배열의 인덱스이며 중복되거나 범위를 벗어나면 안 됩니다.

Hole, Passenger와 obstacle ID는 레벨 전체의 하나의 namespace에서 반드시 고유해야 합니다. Trace와 향후 장치 연결이 타입 접두사 없이 ID를 참조하므로 타입이 달라도 같은 ID를 재사용할 수 없습니다.

## Passenger

```json
{
  "id": "orange-01",
  "colorId": "orange",
  "cell": {"x": 4, "y": 0},
  "tags": []
}
```

Passenger는 활성 mask 칸에 있어야 하며 다른 Passenger와 같은 칸을 공유할 수 없습니다. 첫 proof에서는 시작 Hole footprint와도 겹칠 수 없습니다. `tags`는 확장 호환성을 위해 존재하지만 빈 배열만 사용합니다.

각 색의 Passenger 총수와 같은 색 Hole의 비어 있는 슬롯 총수는 첫 proof에서 같아야 합니다.

```text
PassengerCount(color)
== Sum(HoleShapeCount(color) - InitialFilledSlotCount(color))
```

향후 spawn queue가 Passenger를 추가하면 queue 안의 수까지 포함해 계산합니다.

## Generation And Spread Constraints

`generation`은 runtime 플레이 규칙이 아니라 레벨 제작과 검증에 사용하는 editor metadata입니다. first proof runtime은 이 값을 게임 판정에 쓰지 않지만, 같은 색 Passenger가 한곳에 몰리는 문제와 해답 유무를 재현 가능하게 검사하기 위해 예제 데이터에 함께 둡니다.

```json
"generation": {
  "seed": 42017,
  "algorithm": "seeded-farthest-point-blue-noise",
  "candidateOrdering": "missing-region-then-distance-then-density",
  "tieBreak": "seeded-hash-then-y-x",
  "constraints": {
    "appliesTo": "passengers-only",
    "minimumSameColorManhattanDistance": 3,
    "maximumSameColorClusterSize": 1,
    "clusterAdjacency": "orthogonal",
    "regionGrid": {"columns": 2, "rows": 2},
    "minimumRegionsPerColor": 2,
    "maximumSameColorInAny2x2": 1,
    "minimumOccupiedRegionsTotal": 2,
    "maximumPassengersPerRegion": 1,
    "maximumPassengersInAny2x2": 1,
    "maximumPassengersInAny3x3": 1
  },
  "repair": {
    "maximumMutations": 32,
    "maximumSeedAttempts": 8,
    "operators": ["relocate-worst", "swap-across-regions"]
  },
  "solverValidation": {
    "algorithm": "bfs",
    "maximumVisitedStates": 100000,
    "requireRecordedTraceReplay": true,
    "requireIndependentSolution": true
  }
}
```

각 값의 의미는 다음과 같습니다.

| Field | Meaning |
| --- | --- |
| `seed` | 생성과 repair가 재현되도록 하는 정수 seed |
| `minimumSameColorManhattanDistance` | 같은 색 Passenger 모든 쌍의 허용 최소 맨해튼 거리 |
| `maximumSameColorClusterSize` | 상하좌우로 연결된 같은 색 Passenger component의 최대 크기 |
| `regionGrid` | board를 분산 측정용 구역으로 나누는 열·행 수 |
| `minimumRegionsPerColor` | 같은 색이 차지해야 하는 최소 region 수 |
| `maximumSameColorInAny2x2` | 어떤 2×2 window 안에도 들어갈 수 있는 같은 색 Passenger 최대 수 |
| `minimumOccupiedRegionsTotal` | 색과 무관하게 Passenger가 존재해야 하는 최소 region 수 |
| `maximumPassengersPerRegion` | 한 region에 들어갈 수 있는 전체 Passenger 최대 수 |
| `maximumPassengersInAny2x2` | 어떤 2×2 window 안에도 들어갈 수 있는 전체 Passenger 최대 수 |
| `maximumPassengersInAny3x3` | 어떤 3×3 window 안에도 들어갈 수 있는 전체 Passenger 최대 수 |

region은 `regionX = min(columns - 1, floor(x * columns / width))`와 같은 공식으로 계산합니다. 색별 거리와 군집만 검사하면 서로 다른 색 Passenger가 한곳에 함께 몰리는 경우를 놓치므로, 전체 occupied region과 2×2·3×3 density도 반드시 함께 검사합니다. 비정형 보드가 좁은 통로로 완전히 분리되는 경우에는 후속 schema에서 flood-fill zone을 추가할 수 있습니다. 정확한 배치, repair와 solver 검증은 `LevelDesignAndGeneration.md`를 따릅니다.

Tutorial도 이 예시에서는 같은 색 두 명을 서로 다른 region에 두어 분산 기준을 작게 검증합니다. 이후 학습 목적상 인접 배치가 필요하면 constraints를 조용히 무시하지 말고 별도 level config와 acceptance 기대값으로 명시합니다.

## Obstacles And Future Spawn Queues

첫 proof의 예제 파일에서는 둘 다 빈 배열입니다.

```json
"obstacles": []
```

현재 obstacle schema는 자체 제작 고정 wall만 허용하며 first proof 샘플에서는 빈 배열입니다. 새 장애물이나 spawn queue를 추가할 때 자유 형식 object를 바로 넣지 말고 Schema 버전을 올리거나 discriminated object schema를 추가합니다. 안정적인 `id`, 위치, 초기 state와 연결 대상 ID를 명시하고 SemanticValidator에 dangling link 검사를 추가합니다.

`rules.win.emptySpawnQueues`는 이후 queue를 도입했을 때 조기 승리를 막기 위해 미리 고정한 objective policy입니다. 현재 schema에는 실제 queue 데이터가 없으므로 항상 충족됩니다.

## Recorded Reverse And Solution Traces

`reverseGenerationTrace`는 완성 상태에서 Passenger 수집을 되돌려 초기 배치를 만든 제작 기록이고, `solutionTrace`는 그 결과를 실제 규칙으로 해결하는 정방향 증거입니다. 둘은 runtime이 플레이어에게 정답을 노출하기 위한 데이터가 아니라 editor validation fixture입니다.

각 solution step의 `path`는 현재 Hole anchor에서 시작하고 모든 연속 점의 Manhattan 거리가 1이어야 합니다. `expectedCollections`는 실제 수집 Passenger와 로컬 slot index를 고정하며 `expectedHoleRemoved`는 step 종료 결과를 확인합니다. reverse trace의 Hole 순서와 path는 solution trace의 역순이어야 합니다.

기록된 trace replay만 통과해서는 충분하지 않습니다. `generation.solverValidation.requireIndependentSolution`이 true이면 solution trace를 읽지 않는 독립 Solver도 같은 MoveResolver로 승리 상태를 찾아야 합니다. 세부 불변식은 `LevelDesignAndGeneration.md`와 `AcceptanceTests.md`의 `REV-*`, `SOL-*` 항목을 따릅니다.

## Semantic Validation

JSON Schema 통과는 레벨이 올바르거나 풀린다는 뜻이 아닙니다. 로드 직후 다음 검사를 순서와 무관하게 모두 실행하고 오류를 한 번에 보고합니다.

```text
LVL-S01 schemaVersion 지원 여부
LVL-S02 board mask 행 수와 각 행 길이
LVL-S03 mask 문자 값이 0 또는 1인지
LVL-S04 모든 entity ID 고유성
LVL-S05 shape offset 고유성 및 4방향 연결성
LVL-S06 초기 Hole footprint가 활성 mask 안인지
LVL-S07 초기 Hole끼리 겹치지 않는지
LVL-S08 Passenger가 활성 mask 안이고 서로 겹치지 않는지
LVL-S09 Passenger가 시작 Hole footprint와 겹치지 않는지
LVL-S10 initialFilledSlots가 고유하고 shape 범위 안인지
LVL-S11 색별 빈 슬롯 수와 전체 Passenger 수가 맞는지
LVL-S12 generation constraints가 현재 Passenger 수와 보드 크기에서 달성 가능한지
LVL-S13 reverse/solution trace의 ID, 슬롯, 경로 연속성과 역관계
```

Generation constraints가 달성 불가능할 수 있습니다. 예를 들어 작은 4×4 보드에 한 색 8명을 두면서 최소 거리 3을 요구하면 생성기는 무한 반복하면 안 됩니다. 빠른 capacity bound를 계산해 `SPREAD_CONSTRAINTS_IMPOSSIBLE`로 거부하고 명시적인 config 변경을 제안합니다.

## Solvability Validation

SemanticValidator 다음에 Solver를 실행합니다. Solver가 제한 시간 또는 state budget 안에 풀이를 찾으면 다음 메타데이터를 에디터 보고서에 남깁니다.

```text
solution found
logical cell steps
capture events
hole removal order
visited states
maximum frontier
solution state hash
```

Solver가 budget을 초과한 경우 `unsolvable`이라고 단정하지 않고 `validation-inconclusive`로 구분합니다. 생성기는 inconclusive 후보를 캠페인에 자동 채택하지 않습니다.

## Format Migration

`schemaVersion`을 올릴 때 loader에서 암묵적으로 필드를 추측하지 않습니다. `v1 -> v2` migration을 별도 함수로 만들고 원본 ID, 이전·이후 JSON hash와 변경 내용을 로그에 남깁니다. 레벨 파일을 저장할 때 shape 순서와 entity ID를 유지하여 replay와 solver proof가 무효화되는 범위를 명확히 합니다.

## Example Files

`Levels/tutorial-001.json`은 기본 수집과 Hole 제거를 가르치는 작은 레벨입니다. `Levels/spread-demo-002.json`은 같은 색 Passenger가 몰리지 않게 generation constraints를 적용한 예시입니다. 생성 알고리즘과 제약 선택은 `LevelDesignAndGeneration.md`, 기대 동작은 `AcceptanceTests.md`를 함께 읽습니다.
