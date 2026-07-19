# Game Specification: Color Hole Grid Puzzle

이 문서는 첫 playable proof의 규칙 원본(source of truth)입니다. 영상에서 관찰한 장르의 핵심을 참고하되, 특정 게임의 코드·레벨·이름·그래픽·UI를 복제하지 않고 자체 규칙과 자체 레벨로 구현합니다. 구현과 테스트가 충돌하면 이 문서와 `DecisionLog.md`를 먼저 확인하고, 규칙을 바꿔야 한다면 코드보다 문서를 먼저 수정합니다.

## First Playable Proof

플레이어는 고정 방향의 색상 Hole을 격자 위에서 드래그합니다. Hole의 빈 로컬 슬롯이 같은 색 Passenger가 있는 칸에 들어오면 Passenger가 슬롯에 수집됩니다. 모든 슬롯이 채워진 Hole은 보드에서 제거되어 공간을 열고, 모든 필수 Passenger와 Hole을 제거하면 레벨을 완료합니다.

첫 proof에는 작은 직사각형 보드, 회전하지 않는 1×2 Hole 하나, 같은 색 Passenger 두 명, 부분 충전, 경계 충돌, 제거, 승리와 재시작만 포함합니다. 타이머, L형과 여러 Hole, 비정형 board mask, 회전, 광고, 결제, 부스터, 메타 진행과 특수 장애물은 proof가 통과한 뒤 별도 단계로 추가합니다.

## Coordinate System

좌표 `(0, 0)`은 보드 왼쪽 위입니다. X는 오른쪽으로, Y는 아래쪽으로 증가합니다. JSON의 `board.mask[0]`이 Y=0 행이며 문자열의 첫 문자가 X=0 칸입니다.

`1`은 활성 칸, `0`은 보드 밖 또는 사용할 수 없는 칸입니다. 화면상의 3D 또는 2D 위치는 이 논리 좌표를 표현할 뿐이며 게임 규칙을 소유하지 않습니다.

## Domain Objects

### Board

Board는 너비, 높이, 활성 칸 mask와 현재 엔티티 상태를 가집니다. 활성 칸이 아닌 위치에는 Hole이 한 칸이라도 들어갈 수 없습니다. Board는 정수 격자 상태의 유일한 권위(authority)입니다.

### Hole

Hole은 다음 값으로 구성됩니다.

```text
id
colorId
anchor
shapeOffsets[]
occupiedSlotMask
traits[]
runtimeStatus = Idle | Dragging | Completing | Removed
```

Hole의 실제 점유 칸은 `anchor + shapeOffsets[i]`입니다. `shapeOffsets` 배열의 순서는 고정된 로컬 슬롯 인덱스입니다. 기본 Hole에서는 폴리오미노의 각 칸이 Passenger 한 명을 받는 슬롯이며, `occupiedSlotMask[i]`가 그 슬롯의 충전 상태입니다.

Hole은 회전하지 않습니다. 모양과 슬롯 순서는 레벨이 끝날 때까지 변하지 않으며 평행 이동만 합니다. 일부 슬롯이 채워져도 footprint 전체는 다른 Hole에 대한 충돌물로 유지됩니다. 모든 슬롯이 채워져 Hole이 제거될 때에만 공간이 비워집니다.

### Passenger

Passenger는 `id`, `colorId`, `cell`, `tags`를 가집니다. 첫 proof에서 `tags`는 빈 배열만 사용하지만 이후 Star, Key 같은 규칙을 추가할 수 있도록 데이터 필드는 유지합니다.

Passenger가 수집되면 Board의 Passenger 점유에서 제거되고, 수집한 Hole의 정확한 로컬 슬롯으로 이전됩니다. 보드 위 Passenger와 Hole 내부 Passenger를 같은 목록에 중복 보관하지 않습니다.

## Input And Movement

Pointer down은 가장 위에 보이는 이동 가능한 Hole 하나만 선택합니다. 선택할 때 `grabOffset`을 저장하여, 손가락이 Hole 중앙이 아닌 곳을 잡더라도 Hole이 갑자기 점프하지 않게 합니다. 멀티터치로 두 Hole을 동시에 움직이는 것은 첫 proof에서 허용하지 않습니다.

Pointer 위치를 최종 목적지로 바로 적용하지 않습니다. 현재 anchor에서 목표 anchor까지 정수 칸 경계를 지날 때마다 한 칸씩 전이합니다. 빠른 드래그도 같은 전이 목록을 통과하므로 중간 장애물을 건너뛸 수 없습니다.

대각선 입력은 직교 이동으로 분해합니다. 기본 축 우선순위는 누적 이동량이 더 큰 축이며, 같으면 X 다음 Y로 고정합니다. 각 직교 전이를 별도로 검증하고, 두 축이 막힌 모서리를 대각선으로 잘라 통과하지 못하게 합니다.

Pointer release 시 렌더링 위치는 마지막으로 승인된 정수 anchor로 부드럽게 정렬됩니다. 논리 위치는 이미 정수 anchor이므로 release 애니메이션이 게임 상태를 다시 변경하지 않습니다.

## Transition Validation

한 칸 이동 후보는 아래 조건을 모두 만족해야 합니다.

1. Hole의 새 footprint가 모두 활성 board mask 안에 있어야 합니다.
2. 새 footprint가 다른 활성 Hole이나 고정 solid obstacle과 겹치면 안 됩니다.
3. 새 footprint의 로컬 슬롯이 Passenger와 겹칠 때 해당 슬롯이 비어 있고 Passenger가 수집 가능해야 합니다.
4. 비어 있지 않은 로컬 슬롯이나 색이 다른 Passenger와의 겹침은 이동을 막습니다.
5. Hole trait 또는 board edge rule이 해당 방향 전이를 허용해야 합니다.

첫 proof의 채택 규칙은 `mismatchedPassenger = solid`입니다. 이는 장르 분석에서 남아 있던 모호성을 프로젝트 차원에서 명시적으로 고정한 것입니다.

## Collection

승인된 한 칸 전이 직후, 새 footprint 아래의 Passenger를 검사합니다. `shapeOffsets` 인덱스 오름차순으로 검사하여 여러 명이 동시에 겹쳐도 결과가 항상 같습니다.

다음 조건을 모두 만족하는 Passenger만 수집합니다.

```text
해당 로컬 슬롯이 비어 있음
Passenger.colorId == Hole.colorId
Passenger tags가 Hole traits와 호환됨
```

수집 시점은 JSON 규칙 `on-cell-entry`입니다. 손가락을 놓을 때까지 기다리지 않습니다. 한 번의 긴 드래그 중 여러 anchor를 지나며 여러 Passenger를 수집할 수 있습니다. 마지막 빈 슬롯이 채워지면 그 즉시 Hole을 `Completing`으로 바꾸고 해당 드래그의 추가 이동을 중단합니다.

```pseudo
function TryMoveOneCell(hole, nextAnchor):
    transition = BuildTransition(hole, hole.anchor, nextAnchor)
    if not CanEnter(transition):
        return Blocked

    hole.anchor = nextAnchor

    for slotIndex in hole.shapeOffsets.indicesAscending:
        passenger = PassengerAt(hole.anchor + hole.shapeOffsets[slotIndex])
        if passenger != null and CanCollect(hole, slotIndex, passenger):
            RemovePassengerFromBoard(passenger)
            hole.occupiedSlotMask.Set(slotIndex)
            Events.Enqueue(PassengerCollected(hole.id, passenger.id, slotIndex))

    ResolveEventsInStableOrder()
    return hole.runtimeStatus == Completing ? Completed : Moved
```

## Event Resolution Order

논리 이벤트는 애니메이션 callback에 의존하지 않고 아래 순서로 끝까지 해석합니다.

```text
PassengerCollected
-> HoleCompleted
-> HoleRemoved
-> DeviceUpdated
-> SpawnOrReveal
-> ObjectiveEvaluated
-> WinOrFailCommitted
```

같은 이벤트를 두 번 처리하지 않도록 각 runtime entity는 상태 전이와 event emission 여부를 기록합니다. 여러 Passenger가 마지막 이동에서 동시에 들어가도 `HoleCompleted`와 `HoleRemoved`는 각각 정확히 한 번만 발생해야 합니다.

View는 이 이벤트를 읽어 Passenger 낙하, Hole 채움, 제거 효과와 사운드를 재생합니다. View나 트윈 callback이 Model의 Passenger를 지우거나 Hole을 제거해서는 안 됩니다.

## Restart And Deferred Timer

첫 proof에서는 타이머를 사용하지 않으며 level data의 `timeLimitSeconds`를 0으로 둡니다. Restart는 레벨 정의를 다시 읽어 runtime state를 새로 만들고 초기 state hash가 최초 로드와 동일한지 확인합니다. View 오브젝트를 현재 위치에서 되감아 Model처럼 사용하는 방식은 금지합니다.

MVP 이후 타이머를 도입할 때는 첫 번째 승인된 Hole 이동부터 시작합니다. 선택만 하고 움직이지 않았거나 막힌 이동만 시도한 경우 시작하지 않습니다. Pause, 앱 background, 승리·실패 결과 연출 중에는 감소하지 않습니다.

시간이 0이 되면 현재 논리 전이와 이벤트 큐를 먼저 안정 상태까지 처리합니다. 그 결과가 승리라면 승리를 우선하고, 아니라면 시간 초과 실패로 전환합니다. 이 후속 규칙을 구현할 때 `AcceptanceTests.md`에 timer acceptance ID를 활성화합니다.

## Objectives

첫 proof의 승리 조건은 다음 항목이 모두 참인 것입니다.

```text
active required Passenger 수 == 0
active required Hole 수 == 0
required spawn queue 수 == 0
unresolved logical event 수 == 0
```

현재 데이터에는 장애물과 spawn queue가 비어 있지만 objective 판정은 이를 고려하는 형태로 작성합니다. 이후 Elevator나 Hidden 같은 장치를 추가할 때 조기 승리가 발생하지 않게 하기 위해서입니다.

실패 조건은 타이머 종료 또는 데이터로 정의된 명시적 fail event입니다. 단순히 현재 움직일 수 있는 Hole이 없다는 이유로 자동 실패시키지 않습니다. 첫 proof에서는 교착 상태에서 Restart를 사용할 수 있습니다.

## State Invariants

아래 불변식은 모든 승인된 전이와 이벤트 해석 후에 유지되어야 합니다.

- 모든 활성 Hole footprint는 board mask 안에 있습니다.
- 두 활성 Hole footprint는 서로 겹치지 않습니다.
- 활성 Passenger는 하나의 활성 board cell에만 존재합니다.
- 같은 board cell에 활성 Passenger가 둘 이상 존재하지 않습니다.
- Hole의 채워진 로컬 슬롯 수와 수집된 Passenger 표현 수가 같습니다.
- Removed Hole은 board occupancy와 input hit-test에 존재하지 않습니다.
- 동일한 level JSON, seed와 입력 전이 목록은 프레임률에 관계없이 동일한 state hash를 만듭니다.

## Deliberately Deferred Mechanics

첫 proof 이후에만 타이머, L형과 여러 Hole, 비정형 mask, 이동 제약, 등장 큐, 특수 매칭과 다른 장치를 검토합니다. 확장 규칙은 `TechnicalArchitecture.md`의 rule component 경계를 사용하고 core MoveResolver를 우회하지 않습니다.

원작의 광고, 코인 가격, 결과 화면 문구, 레벨 배치, 캐릭터 모델과 UI를 따라 만드는 것은 이 예시의 목표가 아닙니다. 장르 메커니즘을 검증한 뒤 자체적인 테마·규칙·난이도 곡선을 설계합니다.
