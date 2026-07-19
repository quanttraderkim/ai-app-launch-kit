# References And Observation Notes

이 문서는 색상 수집형 격자 퍼즐의 장르와 상호작용을 분석할 때 확인한 공개 링크를 기록한다. 링크는 구현 아이디어의 근거를 추적하기 위한 것이며, 연결된 영상·이미지·텍스트·레벨·브랜드를 이 repo의 에셋으로 사용할 권리를 부여하지 않는다. 모든 관찰은 2026-07-12 기준이며, 링크와 앱 동작은 이후 바뀔 수 있다.

## Official Product Sources

[Google Play의 Drop Away: Color Puzzle 페이지](https://play.google.com/store/apps/details?id=com.brewgames.dropaway&hl=en)와 [Apple App Store의 제품 페이지](https://apps.apple.com/us/app/drop-away-color-puzzle/id6648791704)는 분석 대상 앱의 식별과 공식 설명, 지원 플랫폼을 교차 확인하는 용도로만 사용한다. 스토어 아이콘, 스크린샷, preview, 설명 문구와 review를 다운로드하거나 프로젝트 자료로 복사하지 않는다.

[공식 Help Center의 장애물 설명](https://rollic.helpshift.com/hc/en/30-drop-away/faq/1043-what-are-the-obstacles/)은 후속 mechanic의 이름과 존재 여부를 확인할 때 참고한다. first proof에는 이 목록을 구현 요구사항으로 가져오지 않으며, 향후 기능도 자체 이름, 자체 표현과 자체 level design으로 다시 설계한다. [공식 Help Center의 booster 설명](https://rollic.helpshift.com/hc/en/30-drop-away/faq/1039-what-is-a-booster-what-are-they-for/) 역시 제품 범위 조사 자료일 뿐, first proof와 MVP의 필수 범위가 아니다.

## Gameplay Video Observations

[기본 플레이 영상](https://www.youtube.com/watch?v=Icen6syhvB0)은 성공 장면에서 보이는 상호작용을 제한적으로 관찰하는 자료다. `00:00` 부근에서는 두 칸 크기의 색상 블록과 같은 색 대상의 수집·완료 흐름, `00:07` 부근에서는 세로 방향 shape의 이동, `00:14` 부근에서는 L자 shape와 여러 색이 있는 보드 구성을 확인하는 데 사용했다. 이 영상만으로 실패 입력, 매우 빠른 drag, pointer release 시점, 다른 색 대상의 충돌 여부를 확정할 수 없으므로 그런 항목은 “원작 사실”이 아니라 `DecisionLog`의 프로젝트 규칙으로 다룬다.

[레벨 175 플레이 영상](https://www.youtube.com/watch?v=AjgMtEUy5hY)은 `00:00` 이후에 보이는 별 표식의 특수 상호작용이 장르 확장 사례로 존재한다는 점만 참고한다. 별 규칙은 first proof 범위가 아니고, 영상의 level layout을 전사하거나 유사하게 재구성하지 않는다.

YouTube 링크는 영상 게시자가 변경하거나 삭제할 수 있다. 프로젝트에는 영상 파일, 오디오, 자막 전문, 썸네일, frame capture를 저장하지 않고 URL, 타임스탬프와 짧은 추상 관찰만 남긴다. 구현에 중요한 규칙은 반드시 자체 spec과 test로 다시 정의한다.

## Algorithm Research Sources

아래 자료는 2026-07-19에 확인한 algorithm 설계 근거다. 논문의 level이나 표현물을 복제하는 자료가 아니라 탐색, 생성, 난이도 측정 방법을 비교하기 위한 1차 출처로만 사용한다.

[Hart, Nilsson, Raphael의 A* 원 논문](https://doi.org/10.1109/TSSC.1968.300136)은 admissible heuristic을 쓰는 최소 비용 graph search의 출발점이다. 이 예제의 A*도 실제 MoveResolver 전이를 edge로 사용하고 실제 남은 이동량을 넘지 않는 Manhattan lower bound만 heuristic으로 사용한다.

[Bridson의 fast Poisson-disk sampling 논문](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)은 최소 간격을 가진 blue-noise 배치가 단순 균일 난수의 군집을 줄이는 기반을 제공한다. 이 프로젝트는 연속 Euclidean sampler를 그대로 복사하지 않고 정수 grid, Manhattan 거리, region reservation과 seeded tie-break에 맞춰 자체 알고리즘을 명시한다.

[Data Driven Sokoban Puzzle Generation with Monte Carlo Tree Search](https://doi.org/10.1609/aiide.v12i1.12859)는 simulated play로 풀이 가능성을 유지하며 사용자 연구로 난이도 feature를 보정한 사례다. [Procedurally Puzzling](https://doi.org/10.1609/aiide.v20i1.31873)은 solver 반복량과 사람의 주관적 난이도 관계를 조사했고, [Generalized Entropy and Solution Information](https://doi.org/10.1609/aiide.v20i1.31872)은 player knowledge를 고려한 puzzle entropy 계열 지표를 제안한다. 이 근거 때문에 `AlgorithmSystem.md`는 최단 길이 하나 대신 raw difficulty vector를 저장하고 사용자 관찰 전에는 임의 난이도 label을 확정하지 않는다.

[Interactive Constrained MAP-Elites의 dungeon design 연구](https://arxiv.org/abs/1906.05175)와 [PCG through Quality Diversity](https://arxiv.org/abs/1907.04053)는 한 개 fitness 최고점보다 여러 behavior 구간의 좋은 후보를 보존하는 방법을 설명한다. 이 프로젝트의 후속 archive는 최단 길이, branching, 방향 전환, 분산과 Hole 수를 behavior dimension 후보로 삼되 모든 후보에 independent solver gate를 유지한다.

[PCGRL 논문](https://arxiv.org/abs/2001.09212)은 level design을 순차적인 reinforcement-learning 문제로 구성한다. 학습과 reward 검증 비용이 큰 방식이므로 현재 kit에는 구현하지 않고, deterministic constraint generator와 solver 자료가 충분히 쌓인 뒤 비교 대상으로만 둔다.

[Google OR-Tools의 constraint programming 설명](https://developers.google.com/optimization/cp)과 [CP-SAT status 계약](https://developers.google.com/optimization/cp/cp_solver)은 integer constraint 배치 prototype의 후보 구현 근거다. 특히 `FEASIBLE`, `INFEASIBLE`, `UNKNOWN`을 구분하는 방식은 이 프로젝트가 solver budget 초과를 `validation-inconclusive`로 처리하는 원칙과 맞는다. 정적 CP-SAT 배치 통과는 gameplay solver를 대신하지 않는다.

[Microsoft Research의 TrueSkill 원 논문](https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/)은 실력의 평균만이 아니라 불확실성을 함께 추적하는 Bayesian rating 사례다. 이 프로젝트에서 직접 multiplayer rating을 구현한다는 뜻은 아니며, 장기적으로 다음 레벨을 고르는 player model이 적은 관찰을 확정적 실력으로 오판하지 않게 하는 참고다.

## Evidence Classification

`Observed`는 공개 화면에서 직접 확인할 수 있는 제한된 동작, `Official description`은 스토어 또는 Help Center가 설명한 기능, `Project decision`은 이 게임이 재미와 구현 명확성을 위해 독자적으로 선택한 규칙, `Hypothesis`는 아직 재현하지 못한 추정이다. GameSpec에는 마지막 구현 규칙만 쓰되, 외부 사실처럼 보일 수 있는 항목은 이 분류와 source를 연결한다.

새 관찰을 추가할 때 아래 형식을 사용한다.

```text
Checked on: <YYYY-MM-DD>
Source URL: <PUBLIC_URL>
Timestamp or section: <LOCATION>
Classification: Observed | Official description | Project decision | Hypothesis
Abstract observation: <SHORT_MECHANIC_DESCRIPTION>
What this does not prove: <LIMITS>
Project decision/test affected: <PATH_OR_NONE>
```

## Copyright And Originality Gate

외부 자료를 봐야만 답할 수 있는 질문은 먼저 “핵심 게임성에 필요한가”를 확인한다. 필요하지 않으면 자체 규칙으로 설계하고, 필요하면 링크와 관찰 한계를 남긴 뒤 독립적인 표현과 test case로 변환한다. 원작 화면을 옆에 두고 픽셀 단위로 맞추거나 원작 레벨의 좌표·색 순서·시간 제한을 데이터로 옮기지 않는다.

공개 빌드 전에는 제목과 store copy가 고유한지, 모든 이미지·폰트·음향의 권리를 설명할 수 있는지, tutorial과 marketing screenshot이 자체 제작 level인지 확인한다. 권리 상태가 불명확한 파일은 placeholder로도 repo에 포함하지 않고, 자체 제작 기하 도형으로 대체한다.
