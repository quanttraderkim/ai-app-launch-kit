# Iteration: <TITLE>

## Player/User Problem

<이번 iteration이 해결할 사용자 문제를 씁니다. 기능명이 아니라 사용자가 겪는 문제로 표현합니다.>

## Evidence Source

<PRD, 테스트 피드백, 데모 관찰, 로그, 직접 사용, 경쟁 제품 분석 등 근거를 씁니다.>

## Expected User-Value Outcome

<이 작업이 끝나면 사용자가 무엇을 더 잘 느끼거나 더 쉽게 할 수 있는지 씁니다.>

## Implementation Slices

각 slice는 **vertical slice**입니다. 한 slice가 데이터 → 로직 → UI → 검증을 한 번에 관통하고, 그 자체로 화면에서 보여줄 수 있어야(demoable) 합니다. "연출만", "로직만", "카피만" 같은 한 레이어짜리 작업으로 쪼개지 마세요 — 그러면 진전이 보이지 않고 곡선이 평평해집니다.

- [ ] <데이터→로직→UI→검증을 관통하는, demoable한 slice 1>
- [ ] <데이터→로직→UI→검증을 관통하는, demoable한 slice 2>
- [ ] <데이터→로직→UI→검증을 관통하는, demoable한 slice 3>

## Validation Path

<시뮬레이터, 실제 기기, TestFlight, 수동 테스트, 자동 테스트 중 무엇으로 검증할지 씁니다.>

## Stop Condition

<이 iteration이 실패하거나 중단되어야 하는 조건을 씁니다. 예: 핵심 행동까지 3탭을 넘으면 중단하고 UX를 다시 잡는다.>

## TestFlight Or Release Bundling Criterion

<이 변경만으로 배포할지, 다른 변경과 묶어야 하는지 기준을 씁니다. 모든 작은 수정마다 TestFlight를 올리지 않습니다.>
