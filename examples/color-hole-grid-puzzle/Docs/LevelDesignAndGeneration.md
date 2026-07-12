# Level Design And Generation

이 문서는 색상별 승객을 같은 색 Hole의 로컬 슬롯에 수집하는 독자적인 격자 퍼즐의 레벨 제작 계약이다. 장르의 일반적인 아이디어만 참고하며, 특정 상용 게임의 이름, 레벨 배치, 캐릭터, UI, 음향, 애니메이션 또는 추출한 에셋을 복제하지 않는다. 예제의 색 이름과 단순 도형은 규칙을 설명하기 위한 중립적인 데이터다.

첫 playable proof의 범위는 수동 작성한 `tutorial-001`, 1×2 Hole 하나, Passenger 두 명, 비활성 타이머뿐이다. `timeLimitSeconds: 0`은 카운트다운과 시간 실패를 만들지 않는다는 뜻이다. seeded 배치, repair, reverse generation과 독립 solver는 이 proof를 통과한 뒤 구현하는 후속 범위이며, 생성기 구현을 첫 플레이 검증의 선행 조건으로 만들지 않는다. 다만 첫 레벨에도 설계 검증용 generation 설정과 trace를 함께 두어 후속 도구가 같은 파일을 재사용할 수 있게 한다.

## 좌표와 권위 상태

레벨 형식은 [`../Schemas/level.schema.json`](../Schemas/level.schema.json)을 따른다. `(0, 0)`은 왼쪽 위이고 X는 오른쪽, Y는 아래로 증가한다. `board.mask[y][x]`가 `1`인 칸만 사용할 수 있으며, mask의 행 수는 `height`, 모든 행의 길이는 `width`와 같아야 한다.

Hole의 실제 점유 칸은 `anchor + shape[slotIndex]`다. `shape`의 배열 순서는 영구적인 슬롯 번호이므로 정렬하거나 다시 저장해서는 안 된다. 같은 색 Passenger가 비어 있는 해당 슬롯과 겹치면 `on-cell-entry` 시점에 수집된다. 다른 색 Passenger는 예제 규칙에서 고체 충돌물이고, 빠른 드래그도 인접한 정수 anchor를 하나씩 통과하는 `orthogonal-sweep`으로 해석한다. 논리는 순수한 격자 모델이 먼저 확정하고 화면과 애니메이션은 그 결과만 표현한다.

JSON Schema는 자료형과 필수 필드를 검사하지만, 서로 다른 배열 사이의 관계까지는 검사하지 못한다. 따라서 구현에는 별도의 semantic validator가 필요하다. 이 validator는 ID 유일성, mask 크기, shape 연결성과 중복 offset, 슬롯 번호 범위, 초기 footprint와 엔티티의 겹침, 모든 좌표의 playable 여부, 색별 Hole 용량과 Passenger 수의 일치, trace 참조와 경로 연속성을 검사해야 한다. 스키마 검증만 통과한 레벨은 아직 출시 가능한 레벨이 아니다.

## Passenger가 몰리지 않는 배치 계약

무작위 셔플로 빈칸을 고르면 같은 색 세 명이 붙거나, 서로 다른 색이어도 전체 Passenger가 한쪽 구석에 몰리는 경우가 자주 생긴다. 이 예시는 seed가 고정된 farthest-point 선택과 blue-noise 거부 조건을 함께 사용한다. 아래 값은 모두 `generation.constraints`에 저장되며 Hole이 아니라 `passengers-only`에 적용된다.

| 필드 | 정확한 의미 |
| --- | --- |
| `minimumSameColorManhattanDistance` | 같은 `colorId`의 모든 Passenger 쌍에서 `abs(dx) + abs(dy)`의 최솟값이다. 값보다 가까운 후보는 blue-noise 위반이다. |
| `maximumSameColorClusterSize` | 같은 색 Passenger를 상하좌우로 연결했을 때 생기는 연결 요소 하나의 최대 크기다. 대각선 접촉은 군집으로 세지 않는다. |
| `regionGrid` | 보드를 균등한 열×행 구역으로 나눈다. `regionX = min(columns-1, floor(x*columns/width))`이고 Y도 같은 방식이다. |
| `minimumRegionsPerColor` | 한 색이 차지해야 하는 서로 다른 region 수다. 이 값은 해당 색 Passenger 수와 전체 region 수보다 클 수 없다. |
| `maximumSameColorInAny2x2` | 보드의 모든 2×2 창에서 같은 색 Passenger 수의 상한이다. mask가 꺼진 칸은 세지 않지만 창 자체는 검사한다. |
| `minimumOccupiedRegionsTotal` | 색과 무관하게 Passenger가 한 명 이상 있어야 하는 region 수의 하한이다. |
| `maximumPassengersPerRegion` | 한 region에 들어갈 수 있는 전체 Passenger 수의 상한이다. |
| `maximumPassengersInAny2x2` | 보드의 모든 2×2 창에 들어갈 수 있는 전체 Passenger 수의 상한이다. |
| `maximumPassengersInAny3x3` | 보드의 모든 3×3 창에 들어갈 수 있는 전체 Passenger 수의 상한이다. 작은 보드에서는 존재하는 범위만 검사한다. |

색별 거리, 군집, region과 전체 density는 서로 대체하는 지표가 아니다. 예를 들어 각 색이 멀리 떨어져 있어도 빨강·파랑·초록이 같은 2×2 안에 하나씩 있으면 전체 군중은 몰려 보인다. 반대로 전체가 퍼져 있어도 같은 색 두 명이 붙어 있으면 색별 제약을 실패한다. 모든 제약을 동시에 통과해야 한다.

## Seeded farthest-point / blue-noise 알고리즘

`schemaVersion: 1`은 플랫폼 기본 `Random`이나 구현마다 variant가 다른 PRNG를 사용하지 않습니다. 모든 순서와 tie-break는 아래의 unsigned 32비트 FNV-1a로 계산합니다. 문자열의 정수는 부호 없는 10진수이며 앞에 0을 붙이지 않고, 구분자는 ASCII `|`, 문자열 encoding은 UTF-8입니다.

```text
FNV1a32(text):
    hash = 2166136261
    for byte in UTF8(text):
        hash = hash XOR byte
        hash = (hash * 16777619) modulo 2^32
    return hash

color order key    = (FNV1a32(seed + "|" + colorId), ordinal colorId)
candidate key      = (FNV1a32(seed + "|" + colorId + "|" + x + "|" + y), y, x)
next attempt seed  = FNV1a32(originalSeed + "|" + attemptIndex) AND 0x7FFFFFFF
```

Reference vector는 다음과 같습니다. `FNV1a32("1103|orange") = 199927524 (0x0BEAA6E4)`, `FNV1a32("1103|orange|3|1") = 188663266 (0x0B3EC5E2)`, `FNV1a32("424242|2") = 1483404589 (0x586AF52D)`입니다. Unity, editor tool과 CI가 이 세 값을 모두 통과하기 전에는 generator를 실행하지 않습니다.

먼저 Hole의 완료 순서와 슬롯별 수집 anchor를 역방향으로 구성해 “수집 가능한 후보 칸”만 만든다. 후보 칸은 playable이고 다른 엔티티와 겹치지 않으며 `cell = collectionAnchor + shape[slotIndex]`를 만족해야 한다. 또한 해당 anchor까지의 forward trace suffix를 실제 `MoveResolver`로 재생할 수 있어야 한다.

각 색의 다음 Passenger를 놓을 때 후보를 다음 순서로 비교한다. 먼저 전체 occupied region quota에 필요한 새 region, 다음으로 해당 색의 region quota에 필요한 새 region을 우선한다. 그다음 기존 같은 색 Passenger까지의 최소 Manhattan 거리가 큰 후보, 반경 3 안의 전체 Passenger 수가 적은 후보, 같은 색 수가 적은 후보, seeded hash가 작은 후보, Y와 X가 작은 후보 순이다. 남은 Passenger 수와 아직 필요한 region 수가 같아지면 새 region이 아닌 후보는 제외해 quota를 예약한다. 같은 색이 아직 하나도 없으면 최소 거리는 `width + height`로 취급한다.

```text
for color in StableSeededColorOrder:
    for slot in ReverseConstructionOrder(color):
        candidates = GeometryAndTraceFeasibleCells(slot)
        candidates = ApplyGlobalAndColorRegionReservation(candidates)

        clean = candidates where
            pairwiseManhattan >= minimumDistance and
            largestOrthogonalCluster <= maximumCluster and
            sameColorEvery2x2Count <= maximumSameColorIn2x2 and
            totalPassengersInRegion <= maximumPassengersPerRegion and
            totalEvery2x2Count <= maximumPassengersIn2x2 and
            totalEvery3x3Count <= maximumPassengersIn3x3

        if clean is not empty:
            chosen = max(clean, newGlobalRegion, newColorRegion, minDistance,
                         -allColorLocalDensity, -sameColorLocalDensity,
                         -seededHash, -y, -x)
        else:
            chosen = min(candidates, violationTuple, seededHash, y, x)
            mark chosen for repair

        PlacePassengerAndRecordCollectionAnchor(chosen)
```

`clean`이 비었다고 제약을 영구적으로 낮추지 않는다. 일단 위반량이 가장 작은 임시 후보를 놓고 repair 단계로 넘기며, repair가 끝날 때까지 고치지 못하면 그 seed의 결과 전체를 버린다. 생성 도중 숨겨진 비결정성이 생기지 않도록 사전 컬렉션은 ID로 정렬하고, 동일 점수 후보는 반드시 명시된 tie-break로 고른다. 이 재현성은 `GEN-SEED-001`로 검증한다.

## Reverse generation과 풀이 증거

완성된 빈 보드에서 시작해 마지막에 제거될 Hole부터 되살리면, Passenger를 먼저 무작위로 뿌리고 나중에 억지로 해답을 찾는 것보다 해답 뼈대를 만들기 쉽다. Hole을 마지막 수집 anchor에 복원하고 마지막 수집부터 하나씩 취소한다. 취소할 때 슬롯을 비우고 `cell = collectionAnchor + shape[slotIndex]` 위치에 Passenger를 되살린다. 그 후 forward path를 뒤집은 `reversePath`를 따라 초기 anchor까지 되돌린다. 역방향 절차는 제작 기록이며 실제 플레이 규칙은 아니므로, 최종 유효성은 반드시 동일한 `MoveResolver`로 forward path를 재생해 판단한다.

`reverseGenerationTrace`와 `solutionTrace`에는 다음 불변식이 있다. reverse 단계의 Hole 순서는 solution 단계의 정확한 역순이고, `restoreAtAnchor`는 `reversePath`의 첫 anchor이자 forward path의 마지막 anchor다. `reversePath`는 해당 forward path를 그대로 뒤집은 배열이며 마지막 anchor는 직렬화된 Hole의 초기 anchor다. `undoCollections`는 `expectedCollections`의 역순이고, 각 `cell`은 Hole의 해당 slot offset을 `collectionAnchor`에 더한 값이다. 이 관계는 `REV-001`과 `REV-002`에서 자동 검사한다.

기록 trace는 생성기의 디버그 메모가 아니라 레벨 데이터의 풀이 증거다. 경로의 첫 점은 현재 anchor와 같고 이후 모든 점은 Manhattan 거리 1이어야 한다. trace replay 중 실제 수집 순서와 슬롯 번호, Hole 제거 여부가 `expectedCollections` 및 `expectedHoleRemoved`와 다르면 레벨을 거부한다.

## Repair mutation

초기 배치가 색별 또는 전체 region quota, 거리, 군집, 2×2·3×3 규칙을 어기면 `generation.repair.operators`를 고정 순서로 적용한다. `relocate-worst`는 전체 위반에 가장 많이 기여한 Passenger를 다른 trace-feasible 칸으로 옮기고, `swap-across-regions`는 서로 다른 색의 두 Passenger 위치를 맞바꿔 두 색과 전체 분포를 함께 개선한다. 위치가 바뀌면 해당 슬롯의 `collectionAnchor`와 영향을 받은 forward trace suffix를 다시 계산한다. `reroute-trace-suffix`는 Passenger 위치를 유지하면서 충돌이 생긴 suffix만 결정적인 최단 경로로 다시 찾는다.

mutation 평가는 다음 lexicographic tuple을 사용한다. 앞 항목이 먼저 줄어야 하고 뒤 항목의 개선으로 앞 항목의 악화를 상쇄할 수 없다.

```text
(
  invalidGeometryCount,
  recordedTraceReplayFailureCount,
  missingGlobalRegionCount,
  totalRegionPassengerOverflow,
  totalGlobal2x2Excess,
  totalGlobal3x3Excess,
  missingColorRegionCount,
  totalManhattanDistanceDeficit,
  totalClusterExcess,
  totalSameColor2x2Excess,
  totalRecordedPathLength
)
```

strict하게 tuple을 줄이는 mutation만 채택하고, 동률이면 위에 정의한 candidate hash와 엔티티 ID ordinal 순으로 결정합니다. 매 채택 뒤 semantic validation과 recorded trace replay를 다시 실행합니다. `maximumMutations` 안에 0 tuple을 만들지 못하면 결과를 폐기하고 `FNV1a32("originalSeed|attemptIndex") & 0x7FFFFFFF`로 다음 시드를 만듭니다. `attemptIndex`는 1부터 시작하며 성공한 derived seed를 최종 `generation.seed`에 기록합니다. `maximumSeedAttempts`까지 실패하면 “생성 불가”를 반환하고, 제약을 몰래 완화하거나 풀이 검사를 생략하지 않습니다.

## 마지막 solver validation

출시 후보는 다음 관문을 순서대로 통과한다. 먼저 JSON Schema와 semantic validator를 실행하고, 그다음 기록된 `solutionTrace`를 게임과 같은 `MoveResolver`로 replay한다. 마지막으로 trace를 초기 힌트로 주지 않은 독립 BFS, A* 또는 IDA* solver가 상태 hash 기반 중복 제거를 사용해 해답을 하나 이상 찾아야 한다. solver와 게임은 이동·수집·이벤트 resolver를 공유하되, solver가 기록 trace를 정답으로 읽어서는 안 된다.

`maximumVisitedStates`를 소진한 것은 성공도 “풀 수 없음”의 증명도 아니다. 이 경우 레벨은 검증 미완료로 거부하거나 더 큰 명시적 예산으로 다시 실행한다. recorded replay 통과만으로 solver 관문을 대신하지 않는다. 이 두 경로를 분리해야 trace 작성 실수와 solver 또는 resolver의 회귀를 서로 잡을 수 있다.

## 예제 레벨의 분포

[`../Levels/tutorial-001.json`](../Levels/tutorial-001.json)은 Orange 두 명을 두 region에 나눠 놓는다. 최소 같은 색 거리는 3이고, 가장 큰 군집과 모든 2×2의 같은 색 최대치는 각각 1이다. 전체로도 두 region을 사용하며 한 region과 2×2·3×3에는 최대 한 명만 있다.

[`../Levels/spread-demo-002.json`](../Levels/spread-demo-002.json)은 생성기 후속 검증용으로 3×3 region을 사용하며 Red와 Blue의 최소 거리는 5, Green은 6이다. 세 색 모두 서로 다른 region 세 곳을 사용하고 군집 크기 및 색별 2×2 최대치가 1이다. 전체 Passenger는 6개 region에 걸쳐 있고, 한 region과 모든 2×2·3×3에는 최대 두 명만 있다.

새 레벨을 추가할 때는 숫자를 낮춰 통과시키기 전에 실제 플레이에서 색이 한곳에 뭉쳐 읽기 어려운지 먼저 본다. 제약을 바꿀 합당한 이유가 있다면 레벨별 데이터에 명시하고 acceptance 결과와 solver 탐색량을 함께 남긴다.
