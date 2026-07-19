# Decision Log

이 문서는 외부 게임에서 관찰한 사실, 이 프로젝트가 독자적으로 채택한 규칙, 아직 검증하지 않은 가설을 섞지 않기 위한 기록이다. `Accepted`는 현재 구현과 테스트의 기준이고, `Verify`는 구현 기본값으로 사용할 수 있지만 플레이 테스트나 추가 관찰 뒤 바뀔 수 있으며, `Deferred`는 first proof 범위 밖이다.

| Date | Status | Decision | Rationale | Follow-up |
| --- | --- | --- | --- | --- |
| 2026-07-12 | Accepted | 공개 예시 이름을 `Color-Hole Grid Puzzle`로 사용한다. | 특정 상용 게임의 후속작이나 복제품으로 오인되지 않게 장르 중립적인 작업명을 쓴다. | 출시 전 고유 제목과 상표 충돌 여부를 별도로 확인한다. |
| 2026-07-12 | Accepted | 외부 게임은 추상 규칙 연구에만 사용하고 이름, 에셋, UI, 사운드, 문구, 레벨과 수치를 복제하지 않는다. | 기획 참고와 표현물 복제의 경계를 명확히 하고 공개 kit가 저작권 자료 저장소가 되는 것을 막는다. | 모든 에셋 출처와 자체 제작 여부를 release review에서 확인한다. |
| 2026-07-12 | Accepted | first proof 기본 경로는 Unity 2D 세로 화면이지만 Core 규칙은 Unity API에서 분리한다. | kit의 Unity iOS 흐름을 활용하면서 테스트와 향후 엔진 변경 가능성을 보존한다. | 대상 repo에서 `<UNITY_VERSION>`을 고정하고 README에 기록한다. |
| 2026-07-12 | Accepted | 정수 격자 `BoardState`를 유일한 권위 상태로 두고 물리엔진과 Transform은 표현에만 사용한다. | 빠른 드래그, 프레임률과 animation timing에 따라 퍼즐 결과가 달라지는 문제를 피한다. | EditMode에서 동일 command replay 결과를 비교한다. |
| 2026-07-12 | Accepted | Hole은 고정 polyomino이며 first proof에서는 회전하지 않고 직교 평행 이동만 한다. | 핵심 수집과 공간 제약을 먼저 검증하고 입력 상태 공간을 작게 유지한다. | 회전은 독자 레벨 설계에 가치가 확인될 때 별도 iteration으로 검토한다. |
| 2026-07-12 | Accepted | 여러 칸 pointer 이동도 path를 한 칸씩 추적하며, invalid step 직전에서 멈춘다. | 순간 이동 관통과 대각선 corner cut을 막고 느린 드래그와 빠른 드래그의 결과를 맞춘다. | 축 우선순위와 path test vector를 GameSpec과 AcceptanceTests에 고정한다. |
| 2026-07-12 | Verify | 같은 색 승객은 유효한 step으로 해당 칸에 들어오는 즉시 수집하고, 손을 놓는 시점까지 기다리지 않는다. | 이동 중 경로 선택이 상태를 바꾸는 퍼즐로 해석하면 피드백이 즉각적이고 resolver가 명확해진다. | 첫 사용자 테스트에서 중간 수집이 예측 가능한지 관찰한다. |
| 2026-07-12 | Verify | 다른 색 승객은 first proof에서 고체 점유물로 취급한다. | 색 선택이 이동 경로 제약으로 작동하고 충돌 규칙을 일관되게 설명할 수 있다. | 자체 레벨을 만들며 재미와 교착 영향을 확인하고 필요하면 명시적 rule variant로 바꾼다. |
| 2026-07-12 | Accepted | Hole의 로컬 shape offset마다 독립 슬롯을 두고 부분 충전을 bitmask 또는 동등한 결정적 구조로 저장한다. | 남은 인원 숫자만 저장하면 어떤 위치가 찼는지 필요한 규칙과 애니메이션을 정확히 재현할 수 없다. | 직렬화에는 runtime bitmask를 직접 넣지 않고 level 초기 상태 형식을 별도 정의한다. |
| 2026-07-12 | Accepted | 논리는 `PassengerCollected -> HoleCompleted -> HoleRemoved -> DeviceUpdated -> SpawnOrReveal -> ObjectiveEvaluated -> WinOrFailCommitted` 순서로 확정하고 View는 결과만 연출한다. | callback 중복과 animation race가 게임 결과를 바꾸지 않게 한다. | 확장 장애물 도입 시 event priority와 queue drain 조건을 테스트한다. |
| 2026-07-12 | Accepted | first proof는 한 tutorial level, 1×2 Hole, 두 승객, 충돌, 부분 충전, 제거, 승리와 재시작만 포함한다. | 핵심 조작을 검증하기 전에 타이머와 메타 시스템이 범위를 키우는 것을 막는다. | Acceptance Gate 통과 뒤 플레이 테스트 결과로 MVP iteration을 선택한다. |
| 2026-07-12 | Deferred | 타이머, 부스터, 엘리베이터와 특수 장애물, 광고, 재화, 자동 level generator와 solver는 first proof에서 구현하지 않는다. | 핵심 규칙의 이해도와 결정성을 먼저 확인해야 후속 시스템의 가치와 복잡도를 판단할 수 있다. | PRD의 stop condition을 통과한 뒤 한 기능씩 spec-test-data 세트로 제안한다. |
| 2026-07-12 | Accepted | 후속 레벨 생성기는 자연어 자유 배치 대신 seeded farthest-point와 색별 거리·군집·region, 전체 region·2×2·3×3 제약을 사용한다. | 같은 색끼리 떨어져 있어도 여러 색 Passenger 전체가 한곳에 몰리는 문제까지 재현 가능한 수치와 자동 테스트로 막는다. | first proof 통과 뒤 `GEN-*` acceptance ID 순서로 구현한다. |
| 2026-07-12 | Accepted | 생성 레벨은 기록된 forward trace replay와 trace를 읽지 않는 독립 solver를 모두 통과해야 채택한다. | 보기 좋은 분산 배치가 실제 이동 규칙에서는 풀리지 않는 문제를 막고, 기록 trace 자체의 오류도 잡는다. | solver budget 초과는 성공이나 unsolvable이 아니라 validation-inconclusive로 거부한다. |
| 2026-07-12 | Accepted | 문서 계약의 실행 가능성을 확인하는 첫 웹 proof는 `tutorial-001`만 플레이하고, `spread-demo-002`는 읽기 전용 분산 검사 화면으로 분리한다. | first proof에 생성기·solver·타이머를 구현한 것처럼 보이지 않으면서 핵심 이동과 비군집 지표를 각각 검증할 수 있다. | 웹 core 테스트와 모바일 브라우저 smoke 결과를 handoff에 기록하고 Unity proof와 혼동하지 않는다. |
| 2026-07-19 | Accepted | 퍼즐 알고리즘을 결정론적 규칙, 난이도 검증, 제약 기반 생성, 표현 엔진으로 분리하고 flood fill·중력·새 블록 queue는 match-and-fall 변형에서만 활성화한다. | 전달받은 일반 매치 퍼즐 구조를 현재 color-hole 규칙에 그대로 섞으면 다른 게임이 되고 solver와 replay 계약도 달라진다. | 새 mechanic은 `AlgorithmSystem.md`의 선택 모듈과 spec-test-data 세트로 추가한다. |
| 2026-07-19 | Accepted | 난이도 적응은 이미 검증된 다음 레벨 선택과 공개된 힌트·assist에 사용하고, 현재 보드의 색이나 방해물 확률을 플레이 도중 몰래 바꾸지 않는다. | 숨은 확률 조작은 같은 seed와 입력의 결과를 흔들고 플레이어가 배운 규칙, solver 증명과 공정성 검토를 약화한다. | 플레이 데이터가 생기면 skill uncertainty와 difficulty vector를 보정하되 assist 정책을 제품 규칙에 공개한다. |
| 2026-07-19 | Accepted | 웹 core에 같은 MoveResolver를 쓰는 BFS/A*, tick을 제외한 transposition key와 raw difficulty vector를 추가하고 tutorial만 독립 solver로 인증한다. | 문서의 solver 계약을 작은 실제 코드로 검증하면서 사람 데이터 없는 Easy/Hard 임의 분류를 피한다. | `SOL-KEY-001`, `SOL-TUTORIAL-001`, `SOL-ASTAR-001`, `DIFF-VECTOR-001`을 고정 회귀 테스트로 유지한다. |
| 2026-07-19 | Deferred | `spread-demo-002`의 independent solver 인증과 자동 생성기는 아직 완료로 표시하지 않는다. | 현재 구현의 진단 A*가 50,000 state budget에서 `validation-inconclusive`였고, 기록 trace와 분산 지표 통과만으로 독립 풀이를 증명할 수 없다. | macro-action A*, stronger admissible heuristic, deadlock pruning과 sidecar report를 구현한 뒤 전체 `SOL-*` gate를 다시 실행한다. |
| 2026-07-19 | Deferred | CP-SAT 배치와 MAP-Elites archive는 deterministic generator와 큰 레벨 solver가 안정된 뒤 구현한다. | 정적 제약 만족과 다양한 후보 보관은 유용하지만 실제 gameplay solvability를 대신하지 않으며 현재 proof의 필수 범위도 아니다. | generator rejection 자료와 difficulty vector가 쌓이면 작은 prototype으로 비교한다. |

## New Decision Template

```text
Date: <YYYY-MM-DD>
Status: Accepted | Verify | Deferred | Reversed
Question: <WHAT_WAS_AMBIGUOUS>
Decision: <CURRENT_PROJECT_RULE>
Evidence: <SPEC_TEST_OR_REFERENCE>
Rationale: <PLAYER_AND_TECHNICAL_REASON>
Affected files/tests: <PATHS>
Revisit when: <CONDITION>
```

기존 결정을 바꿀 때 행을 삭제하지 않는다. 새 날짜로 `Reversed` 또는 대체 결정을 추가하고, 영향을 받는 level과 test를 함께 기록해 이전 handoff가 왜 달라졌는지 추적할 수 있게 한다.
