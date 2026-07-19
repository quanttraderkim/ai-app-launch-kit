# Integrated Puzzle Algorithm System

이 문서는 퍼즐 구현을 “물리, 난이도, 생성”의 세 엔진으로 나누는 설명을 이 프로젝트의 실제 규칙과 연결한다. 세 엔진이라는 상위 구분은 유용하지만, 모든 매치 퍼즐 알고리즘을 한 게임에 넣어서는 안 된다. 이 예제의 core loop는 Hole을 직교 이동해 같은 색 Passenger를 슬롯에 수집하는 방식이므로 flood fill, 낙하, 새 블록 생성은 기본 규칙이 아니다. 그런 기능은 별도의 match-and-fall 규칙 변형을 만들 때만 선택적으로 붙인다.

현재 채택하는 구조는 `결정론적 규칙 엔진`, `검증 가능한 난이도 엔진`, `제약 기반 생성 엔진`, `표현 엔진`의 네 경계다. AI 에이전트는 이 경계를 넘어 임의 좌표나 확률을 런타임에 직접 바꾸지 않는다.

```text
Player input
    -> integer path sweep
    -> MoveResolver
    -> stable logical event queue
    -> canonical state / replay
    -> presentation events

Authoring intent
    -> templates and constraints
    -> deterministic placement / repair
    -> recorded trace replay
    -> independent BFS, A* or IDA* solver
    -> difficulty vector and quality-diversity archive
    -> human review

Player history
    -> skill estimate with uncertainty
    -> choose one already validated next level
    -> visible hint or assist policy when requested
```

## 1. 결정론적 규칙 엔진

권위 상태는 `GameSpec.md`의 정수 BoardModel이다. Pointer나 Transform의 끝 위치를 곧바로 적용하지 않고, 현재 anchor에서 목표 anchor까지 한 칸씩 직교 전이를 만든다. 각 전이는 board mask, 다른 Hole, wall, Passenger 색과 슬롯 점유를 같은 순서로 검사한다. 승인된 전이 뒤에만 수집을 적용하고, `PassengerCollected -> HoleCompleted -> HoleRemoved -> DeviceUpdated -> SpawnOrReveal -> ObjectiveEvaluated -> WinOrFailCommitted` 순서로 큐를 끝까지 비운다.

탐색용 상태 키와 replay 검사용 상태 hash는 목적이 다르다. Replay hash에는 논리 tick을 포함해 같은 입력 기록이 같은 진행 이력을 만들었는지 확인할 수 있다. Solver의 transposition key에는 tick, event sequence, 마지막 UI 오류처럼 미래의 합법 행동을 바꾸지 않는 값을 넣지 않는다. 오른쪽으로 한 칸 갔다가 되돌아온 상태를 새 퍼즐 상태로 계속 세면 탐색 공간이 무한히 커지기 때문이다.

매치-and-fall 변형을 별도로 만든다면 같은 엔진 안에 다음 규칙 모듈을 추가할 수 있다. 배치 직후 같은 색 연결 요소는 BFS/DFS flood fill 또는 Union-Find로 찾고, 기준 크기 이상을 stable cell order로 제거한다. 중력은 각 열을 아래에서 위로 한 번 압축하는 stable compaction으로 처리하며, 빈칸 생성과 연쇄 match는 고정 logical tick의 event queue로 반복한다. 새 조각은 seed로 고정한 queue에서 꺼내고 애니메이션 callback이 flood fill이나 낙하를 다시 실행하지 않는다. 이 모듈을 활성화하지 않은 color-hole 레벨에 중력이나 새 색 확률을 섞지 않는다.

## 2. Solver와 난이도 엔진

난이도를 “최소 이동 횟수” 하나로만 정하면 같은 길이인데 생각의 부담이 전혀 다른 레벨을 구별하지 못한다. 먼저 실제 MoveResolver를 사용하는 독립 solver로 해답과 탐색 통계를 구하고, 다음 값을 하나의 `difficulty vector`로 저장한다.

| Metric | 의미 |
| --- | --- |
| `optimalCellSteps` | 독립 solver가 찾은 최단 한 칸 전이 수 |
| `recordedCellSteps` | 제작 trace의 한 칸 전이 수 |
| `recordedSolutionSlack` | 기록 풀이가 최단 풀이보다 더 긴 정도 |
| `visitedStates`, `expandedStates` | solver가 실제로 검사한 상태 공간 크기 |
| `maximumFrontier` | 탐색 중 유지한 후보 상태의 최대 수 |
| `averageLegalBranching` | 확장 상태당 가능한 합법 전이 평균 |
| `directionChanges`, `reversals` | 기록 경로가 요구하는 방향 전환과 명시적 되돌림 |
| `activeHoleChoicesAtStart` | 시작 시 선택 가능한 Hole 수의 첫 근사치 |
| `deadEndRatio` | 진행이 늘어난 뒤 승리로 이어지지 않는 상태의 비율 |
| `solutionCountCap` | 상한까지 센 최단 또는 근최단 해답 수 |

작은 보드는 BFS가 최단 거리를 단순하고 확실하게 증명한다. 상태 수가 커지면 A*에 admissible lower bound를 사용하고, frontier 메모리가 문제가 되면 IDA*와 transposition table을 검토한다. 이 예제의 첫 A* lower bound는 색마다 남은 Passenger가 들어갈 수 있는 anchor까지의 최소 Manhattan 거리 중 최댓값을 구하고, 서로 다른 색의 값을 합한다. 장애물은 거리를 줄일 수 없으므로 하한으로 사용할 수 있다. 이후에는 수집 이벤트가 없는 연속 이동을 macro action으로 합치고, 이미 증명된 deadlock pattern을 가지치기하며, 반복되는 모양에는 pattern database를 추가할 수 있다.

Solver가 state budget을 다 썼을 때 반환값은 `validation-inconclusive`다. 이는 해답을 찾지 못했다는 실행 결과이지 `unsolvable`의 증명이 아니다. Frontier가 완전히 빌 때에만 현재 모델과 유한 상태 공간에서 `unsolvable`이라고 판정할 수 있다.

난이도 vector를 곧바로 Easy, Medium, Hard로 바꾸지 않는다. Solver 노력과 사람이 느끼는 어려움의 관계는 게임마다 다르므로, 먼저 플레이 테스트의 완료 여부, 재시도, 힌트 사용, 초과 이동, 완료 시간을 익명 집계해 vector와 보정한다. Solver 반복량과 주관적 난이도의 상관을 조사한 연구와 puzzle entropy 연구는 유용한 출발점이지만, 이 게임의 사용자 데이터 없이 임의 가중치 하나를 “정답 난이도”라고 부르지 않는다.

## 3. 생성 엔진

AI가 자연어만 보고 Passenger 좌표를 한 번에 출력하는 방식은 후보 제안에만 쓴다. 최종 레벨은 다음 결정적 pipeline을 통과한다.

```text
1. difficulty target과 mechanic template 선택
2. 완료 순서와 수집 anchor를 reverse construction으로 생성
3. geometry-feasible 후보 칸 계산
4. seeded farthest-point와 blue-noise 제약으로 Passenger 배치
5. region reservation과 local/global density 검사
6. violation tuple을 줄이는 deterministic repair
7. recorded solution trace를 실제 MoveResolver로 replay
8. trace를 읽지 않는 independent solver 실행
9. difficulty vector 계산
10. quality-diversity archive에 넣고 사람 검토
```

현재 `LevelDesignAndGeneration.md`의 farthest-point, 같은 색 Manhattan 거리, 연결 군집, region, 2×2·3×3 제약은 그대로 유지한다. 더 복잡한 board에서는 inactive mask로 분리된 flood-fill zone의 점유 하한, 통로 폭, Hole 시작 위치에서의 reachability, 색별 수집 anchor의 접근 가능성을 추가한다.

후보가 자주 repair 한도를 넘으면 CP-SAT 또는 ASP 같은 constraint solver를 `배치 feasibility` 단계에 사용할 수 있다. 각 Passenger의 cell을 정수 변수로 두고 cell 유일성, mask 포함, 색별 거리, region quota, window density를 hard constraint로 표현한다. 다만 “정적 배치가 제약을 만족한다”는 사실은 실제 Hole 이동으로 풀린다는 뜻이 아니므로, 마지막 independent gameplay solver를 절대 생략하지 않는다. Constraint solver가 `UNKNOWN` 또는 제한 시간 종료를 반환한 경우도 미검증으로 취급한다.

한 개의 fitness 점수만 최적화하면 모든 레벨이 비슷한 모양으로 수렴한다. 충분한 후보가 생긴 뒤에는 MAP-Elites 같은 quality-diversity 방식을 사용해 `최단 경로 길이 × 평균 branching × 방향 전환 × Passenger 분산 × Hole 수` 구간마다 가장 좋은 검증 레벨을 보관한다. 캠페인은 이 archive에서 난이도와 mechanic 목표에 맞는 서로 다른 레벨을 선택한다. 강화학습 기반 PCGRL은 학습 환경, reward 검증, 재현성 비용이 더 크므로 이 작은 공개 kit의 우선 구현이 아니다.

## 4. 플레이어 모델과 공정한 적응

플레이어 적응은 현재 퍼즐의 정답을 몰래 바꾸는 기능이 아니라, 다음에 보여 줄 검증된 레벨과 공개된 도움의 강도를 고르는 기능이다. 초기에는 복잡한 ML보다 평균 이동 초과율, 실패·재시도, 힌트 사용, 완료 시간의 robust rolling estimate로 충분하다. 데이터가 쌓이면 skill 평균과 불확실성을 함께 관리하는 Bayesian rating 또는 item-response 모델로 확장할 수 있다.

```text
observation = completion, retries, hints, excessMoves, normalizedTime
player estimate = skill mean + uncertainty
level estimate = calibrated difficulty vector
selection = already-validated level near the target success band
assist = explicit hint, undo, route prefix, timer relief or easier retry
```

같은 seed로 시작한 현재 보드의 색 확률을 플레이 도중 몰래 바꾸거나, 잘하는 플레이어에게 방해 색을 주는 정책은 기본값으로 금지한다. 이는 replay와 solver 증명을 무효화하고 플레이어가 배운 규칙을 흔든다. 별도의 match-and-fall 게임에서 next-piece queue가 꼭 필요하다면 시작 seed와 queue 정책을 기록하고, assist mode가 queue를 바꿀 수 있다는 사실을 제품 규칙으로 공개하며, 실험군·대조군과 공정성 지표를 둔다. Pity는 “N회 실패 후 힌트 버튼 활성화”처럼 보이는 도움으로 구현하는 편이 이 프로젝트의 원칙에 맞다.

## 5. AI 에이전트의 역할

AI 에이전트는 mechanic template, difficulty target, 보드 mask 후보, 제약값과 repair 이유를 제안할 수 있다. 결정적 도구가 좌표를 정하고 validator와 solver가 합격 여부를 판정하며, 사람은 읽기 쉬움과 재미를 검토한다. 에이전트가 generator 실패를 숨기기 위해 constraint를 낮추거나, recorded trace를 independent solution으로 재사용하거나, solver budget 초과를 성공으로 표시하면 안 된다.

에이전트의 레벨 생성 요청에는 최소한 다음 계약을 준다.

```text
목표 difficulty vector와 사용할 mechanic template을 먼저 제안하라.
직접 최종 좌표 JSON을 확정하지 말고 deterministic generator 입력을 만들어라.
생성 후보마다 schema, semantic, spread, recorded replay, independent solver를 실행하라.
실패한 seed와 rejection reason을 보존하고 constraint를 자동 완화하지 마라.
합격 후보는 solver 통계와 canonical hash가 포함된 sidecar report로 제출하라.
사람 검토 전에는 campaign level로 표시하지 마라.
```

## 6. 테스트와 성능

예제 기반 테스트 외에 property-based 또는 seeded fuzz test로 “승인 전이는 항상 invariant를 보존한다”, “막힌 전이는 search key를 바꾸지 않는다”, “solver action replay는 같은 승리 state를 만든다”를 검사한다. Metamorphic test로 엔티티 배열 순서를 바꾸거나 ID를 일관되게 치환해도 규칙 결과가 같고, View animation 속도를 바꿔도 canonical state가 같아야 한다. 생성기는 같은 seed를 여러 번 실행해 canonical JSON과 rejection chain이 동일한지 확인한다.

표현 성능은 논리와 별도로 다룬다. 동시에 많은 Passenger가 사라질 때는 view object pooling, effect batching, 한 frame의 DOM 또는 Unity hierarchy 변경 합치기, 화면 밖 effect 생략을 사용할 수 있다. Model은 모든 논리 이벤트를 보존하되 View가 같은 종류의 순수 장식 event를 한 animation batch로 묶을 수 있다. Fixed logical tick과 render interpolation을 분리하면 저사양 기기의 frame drop이 퍼즐 결과를 바꾸지 않는다.

## 7. 현재 구현 상태와 다음 순서

`WebDemo/src/core.mjs`에는 BFS와 A*, tick을 제외한 transposition key, state budget의 inconclusive 구분, solver action replay와 difficulty vector 계산이 들어 있다. `tutorial-001`은 기록 trace를 제거한 상태에서도 독립 BFS가 최단 6칸 풀이를 찾는다. 이 작은 proof는 solver 계약이 실제 코드로 작동함을 보이지만 Phase 8 전체 완료를 뜻하지 않는다.

`spread-demo-002`는 계속 분산 지표와 recorded trace용 샘플이다. 여러 Hole이 있는 큰 상태 공간에 대해서는 macro-action A*, stronger admissible heuristic, deadlock pruning과 명시적 장기 실행 budget을 추가한 뒤 `SOL-INDEPENDENT-001`을 통과해야 한다. 그 전에는 이 샘플을 independent-solver-certified 또는 자동 생성 캠페인 레벨이라고 표시하지 않는다.

후속 구현 우선순위는 macro-action A*와 solver report sidecar, flood-fill zone을 포함한 semantic validator, CP-SAT 배치 prototype, deterministic large-neighborhood repair, MAP-Elites archive, 사용자 테스트로 보정한 level sequencing 순이다. PCGRL과 실시간 개인화 확률 조정은 이 도구들의 데이터와 검증이 쌓인 뒤에도 별도 실험으로만 검토한다.
