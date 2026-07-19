# Acceptance Tests

이 문서의 ID는 구현 작업, 자동 테스트 이름, PR 설명에서 공통으로 사용한다. 테스트는 화면 오브젝트 없이 실행 가능한 순수 격자 모델을 기본으로 하고, 입력과 애니메이션 테스트만 엔진의 플레이 모드에서 추가한다. 레벨 생성기, 독립 solver, 실제 게임은 같은 이동·수집 resolver를 사용해야 하지만, solver가 `solutionTrace`를 정답 입력으로 읽어서는 안 된다.

first playable proof의 필수 gate는 `LVL-*`, `MOV-*`, `COL-*`, `EVT-*`, `WIN-001`, `TIME-OFF-001`, `DET-REPLAY-001`과 tutorial replay입니다. `GEN-*`, `REV-*`, `SOL-*`와 `spread-demo-002` 독립 검증은 proof와 플레이 테스트가 끝난 뒤 구현하는 level-authoring gate입니다. 후속 gate가 아직 구현되지 않았다는 이유로 first proof를 막지는 않지만, 자동 생성 레벨을 배포 후보로 부를 수는 없습니다.

## 스키마와 semantic validation

| ID | 합격 조건 |
| --- | --- |
| `LVL-SCHEMA-001` | 두 예제 JSON이 Draft 2020-12 스키마를 통과하고 알 수 없는 필드, 잘못된 enum, 음수 좌표를 거부한다. |
| `LVL-MASK-001` | mask 행 수가 `height`, 각 행 길이가 `width`와 다르면 거부하고 `0` 칸의 엔티티를 거부한다. |
| `LVL-ID-001` | Hole, Passenger, obstacle ID가 전체 레벨에서 유일하지 않거나 trace가 없는 ID를 참조하면 거부한다. |
| `LVL-SHAPE-001` | shape offset은 중복 없이 상하좌우로 연결되어야 하며 모든 초기 footprint가 보드 안에 있어야 한다. `initialFilledSlots`가 shape 범위를 벗어나면 거부한다. |
| `LVL-OCCUPANCY-001` | 초기 Hole footprint, Passenger, obstacle 사이에 허용되지 않은 겹침이 하나라도 있으면 거부한다. |
| `LVL-CAPACITY-001` | 초기 빈 슬롯 수와 해당 색 Passenger 수가 다르고 별도 spawn source도 없으면 거부한다. |

위 테스트의 잘못된 입력은 예제 파일을 복사해 메모리에서 한 필드만 변형해 만든다. invalid fixture를 통과시키기 위해 실제 예제를 훼손하거나 validator가 자동 수정해서는 안 된다.

## 이동과 수집 모델

| ID | 합격 조건 |
| --- | --- |
| `MOV-SWEEP-001` | 긴 드래그를 한 프레임에 입력해도 인접 anchor를 순서대로 검사하며 중간의 wall, 다른 Hole 또는 다른 색 Passenger를 관통하지 않는다. |
| `MOV-DIAGONAL-001` | 대각선 포인터 변화는 `diagonalTieBreak`에 따라 직교 이동으로 분해되고 막힌 모서리를 잘라 통과하지 않는다. |
| `COL-SLOT-001` | Passenger는 겹친 로컬 `slotIndex`가 비어 있고 색이 일치할 때만 그 슬롯으로 이동한다. 이미 찬 슬롯이나 다른 색과 겹치면 수집하지 않는다. |
| `COL-PARTIAL-001` | 일부 슬롯만 채운 Hole은 보드에 남아 충돌하며, 마지막 빈 슬롯이 채워질 때 정확히 한 번 제거된다. |
| `EVT-ORDER-001` | 한 anchor 진입에서 `PassengerCollected → HoleCompleted → HoleRemoved → DeviceUpdated → SpawnOrReveal → ObjectiveEvaluated → WinOrFailCommitted` 순서가 항상 같다. |
| `WIN-001` | Passenger, 필수 Hole, spawn queue 또는 처리 대기 이벤트가 하나라도 남으면 승리하지 않는다. 모두 사라진 뒤에만 한 번 승리한다. |
| `TIME-OFF-001` | `timeLimitSeconds: 0`에서는 카운트다운을 시작하지 않고 시간 실패를 발생시키지 않는다. |
| `TIME-ON-001` | MVP 후속 타이머를 구현한 경우에만 활성화한다. 양수일 때 첫 유효 이동부터 감소하고 pause, background와 결과 연출 중에는 감소하지 않는다. |
| `DET-REPLAY-001` | 같은 레벨, seed, 입력 경로를 30/60/120fps 조건으로 replay했을 때 최종 canonical state hash가 같다. |

## Passenger 분산 생성

| ID | 합격 조건 |
| --- | --- |
| `GEN-SEED-001` | 같은 schema version, level config와 seed로 100회 생성해 canonical JSON hash, repair 횟수, trace가 모두 같다. 컬렉션 열거 순서를 바꿔도 결과가 같다. |
| `GEN-HASH-001` | FNV-1a reference vector 세 개가 문서의 10진수와 16진수 값에 정확히 일치하고, color/candidate/attempt seed key가 플랫폼 기본 Random을 호출하지 않는다. |
| `GEN-BLUE-001` | 작은 고정 후보 집합에서 선택된 칸이 같은 색 기존 배치까지의 최소 Manhattan 거리를 최대로 만든다. 동률이면 region 우선, local density, seeded hash, Y, X 순서가 재현된다. |
| `GEN-DIST-001` | 각 색의 모든 Passenger 쌍이 `minimumSameColorManhattanDistance` 이상이다. 평균 거리나 가장 먼 쌍만 검사해서는 안 된다. |
| `GEN-CLUSTER-001` | 상하좌우 flood fill로 계산한 모든 같은 색 연결 요소 크기가 `maximumSameColorClusterSize` 이하이다. |
| `GEN-REGION-001` | 문서의 region 공식으로 계산한 각 색의 distinct region 수가 `minimumRegionsPerColor` 이상이다. 마지막 배치 직전에도 남은 수로 quota 달성이 가능한지 예약한다. |
| `GEN-2X2-001` | `(x,y)`를 왼쪽 위로 하는 가능한 모든 2×2 창과 모든 색을 검사했을 때 같은 색 수가 설정 상한 이하이다. |
| `GEN-GLOBAL-REGION-001` | 색을 무시한 occupied region 수가 `minimumOccupiedRegionsTotal` 이상이고 모든 region의 전체 Passenger 수가 `maximumPassengersPerRegion` 이하이다. |
| `GEN-GLOBAL-WINDOW-001` | 색을 무시한 모든 2×2와 3×3 창의 전체 Passenger 수가 각각 `maximumPassengersInAny2x2`, `maximumPassengersInAny3x3` 이하이다. |
| `GEN-REPAIR-001` | 의도적으로 같은 색 또는 서로 다른 색 Passenger를 한곳에 붙인 입력에서 repair mutation마다 violation tuple이 strict하게 감소하고, 완료 후 색별 거리·군집·region과 전체 region·2×2·3×3, trace replay를 모두 통과한다. |
| `GEN-REPAIR-002` | 해결 불가능한 좁은 보드에서는 `maximumMutations × maximumSeedAttempts` 안에 종료하고 명시적인 생성 실패를 반환한다. 제약값을 낮추거나 미검증 레벨을 반환하지 않는다. |

`GEN-SEED-001`의 canonical JSON은 객체 키를 ordinal 정렬하고 배열 순서는 보존하며 공백 없이 UTF-8로 직렬화한다. 생성 시간과 로그처럼 결과와 무관한 값은 레벨 JSON에 넣지 않는다.

## Reverse trace와 solver

| ID | 합격 조건 |
| --- | --- |
| `REV-001` | `reverseGenerationTrace`의 Hole 순서가 `solutionTrace`의 역순이고, 각 `reversePath`가 forward path의 정확한 역순이며 시작·끝 anchor가 일치한다. |
| `REV-002` | 모든 undo 항목에서 `cell == collectionAnchor + shape[slotIndex]`이고 undo 수집 순서가 expected 수집 순서의 역순이다. reverse trace로 복원한 초기 Hole anchor와 Passenger 집합이 직렬화된 초기 상태와 같다. |
| `SOL-TRACE-001` | 기록된 forward path의 모든 연속 anchor 사이 Manhattan 거리가 1이며 실제 replay의 Passenger ID, slot index, Hole 제거 결과가 expected 값과 정확히 같다. 전체 trace 종료 후 필수 Passenger, 필수 Hole, spawn queue와 event queue가 모두 비고 `WinOrFailCommitted(Win)`이 정확히 한 번 발생해야 한다. |
| `SOL-INDEPENDENT-001` | 기록 trace를 읽지 않은 독립 solver가 `maximumVisitedStates` 안에서 승리 상태를 찾고, 찾은 경로를 실제 resolver로 재생해 다시 승리한다. |
| `SOL-BUDGET-001` | solver가 탐색 예산을 소진하면 성공이나 unsolvable로 표시하지 않고 `validation-inconclusive`로 거부한다. |

## 예제별 고정 기대값

| 레벨 | Passenger / Hole | 색별 최소 거리·region | 색별 군집·2×2 최대 | 전체 occupied region / region 최대 | 전체 2×2 / 3×3 최대 | solution 단계 |
| --- | --- | --- | --- | --- | --- | --- |
| `tutorial-001` | 2 / 1 | Orange 3 · 2 regions | 1 · 1 | 2 / 1 | 1 / 1 | 1 |
| `spread-demo-002` | 9 / 3 | Red 5, Blue 5, Green 6 · 각 3 regions | 각 1 · 각 1 | 6 / 2 | 2 / 2 | 3 |

`EXAMPLE-001`은 위 두 파일이 모든 `LVL-*`, `GEN-DIST-001`, `GEN-CLUSTER-001`, `GEN-REGION-001`, `GEN-2X2-001`, `GEN-GLOBAL-*`, `REV-*`, `SOL-TRACE-001`을 통과하는지 검사한다. `EXAMPLE-002`는 표의 고정 기대값을 직접 비교해 validator가 항상 빈 성공을 반환하는 오류를 잡는다. `EXAMPLE-003`은 독립 solver를 실행하고 탐색 상태 수와 찾은 해답 길이를 테스트 로그에 남긴다.

## 웹 proof의 solver 실행 slice

아래 항목은 `WebDemo`가 solver 계약을 문서에만 두지 않고 tutorial에서 실행하는지 확인한다. 이 작은 slice가 통과해도 `spread-demo-002`의 `SOL-INDEPENDENT-001`, generator와 repair가 끝난 것은 아니다.

| ID | 합격 조건 |
| --- | --- |
| `SOL-KEY-001` | 수집이나 장치 변화 없이 한 칸 갔다 되돌아오면 replay hash의 tick 이력은 달라도 solver transposition key는 초기값과 같다. |
| `SOL-TUTORIAL-001` | `solutionTrace`를 제거한 `tutorial-001`을 독립 BFS가 같은 MoveResolver로 6 cell step 안에 해결하고, solver action을 새 게임에 replay하면 승리한다. |
| `SOL-ASTAR-001` | admissible Manhattan lower bound를 사용하는 A*도 tutorial을 6 cell step으로 해결하며 BFS보다 더 긴 해답을 최적이라고 반환하지 않는다. |
| `SOL-STATUS-001` | state budget 1에서는 `validation-inconclusive`, frontier를 모두 소진한 격리 fixture에서는 `unsolvable`을 반환해 두 상태를 구분한다. |
| `DIFF-VECTOR-001` | tutorial의 optimal/recorded/slack은 6/6/0이고 방향 전환 3, 즉시 역전 0, 수집 2를 보고한다. 사용자 자료 없이 Easy/Hard 문자열을 생성하지 않는다. |

## 공개 예시와 완료 기준

`IP-001`은 사람이 확인하는 공개 전 점검이다. 상용 게임 명칭은 출처를 식별하는 README, AGENTS와 References의 설명 문맥에서만 nominative reference로 허용한다. 프로젝트 제목, 제품 UI, 마케팅 문구와 샘플 레벨 ID에는 그 명칭이나 상표를 사용하지 않는다. 실제 레벨 좌표, 추출·트레이싱한 캐릭터나 UI, 음원, 영상 프레임, 상표 그래픽 또는 유료 에셋은 예시 폴더에 없어야 하며, 자체 JSON, 중립적인 색 ID와 자체 문장만 사용한다.

구현 완료는 스키마 통과만을 뜻하지 않는다. first-proof 완료는 위에 지정한 first-proof gate와 `IP-001`을 통과해야 합니다. 자동 생성 레벨의 배포 후보 완료는 추가로 모든 `GEN-*`, `REV-*`, `SOL-*`, `EXAMPLE-*`와 독립 solver 검증을 통과해야 합니다. 현재 phase에 필수인 항목 하나라도 미완료면 그 phase의 검증된 배포 후보로 표시하지 않습니다.
