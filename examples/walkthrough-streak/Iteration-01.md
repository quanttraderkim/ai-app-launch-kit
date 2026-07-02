# Iteration: First proof — tap to record today's streak

> 예시 문서입니다. `02-product-prd/Iteration.template.md`를 채운 것입니다.

## Player/User Problem

습관을 오늘 지켰는지 남기고 이어가고 싶은데, 대부분의 트래커는 설정·계정·화면이 많아 첫날에 지친다.

## Evidence Source

`PRD.md`의 First Usable Proof. 아직 사용자 데이터는 없고, 첫 proof로 핵심 행동이 성립하는지 본다.

## Expected User-Value Outcome

앱을 열면 오늘 지켰는지 한 번의 탭으로 남기고, 연속 숫자가 올라가는 걸 즉시 본다. 다시 열면 이어져 있다.

## Implementation Slices

각 slice는 데이터→로직→UI→검증을 관통하는 vertical slice다.

- [x] **Slice 1**: 홈 화면(큰 streak 숫자 + "오늘 완료" 버튼). 탭하면 메모리상 streak +1이 화면에 즉시 반영된다.
- [x] **Slice 2**: 로컬 저장(UserDefaults: 현재 streak + 마지막 완료 날짜). 앱 재실행 시 유지, 오늘 이미 완료면 버튼이 "오늘 완료됨"으로 비활성.
- [ ] **Slice 3**: 날짜 경계 처리 — 어제 완료했으면 오늘 이어가고, 하루를 걸렀으면 streak을 1로 리셋.

## Validation Path

시뮬레이터 시각 검증(→ `04-app-store-connect-testflight/VisualVerification.md`): (1) 실행 직후 streak 0, (2) 탭 후 1로 바뀜, (3) 앱 종료 후 재실행해도 1 유지. 날짜 경계는 기기 날짜를 바꿔 수동 확인.

## Stop Condition

핵심 행동(열기→탭→기록)이 1탭을 넘거나, 재실행 후 streak이 유지되지 않으면 중단하고 저장 구조부터 다시 잡는다.

## TestFlight Or Release Bundling Criterion

첫 proof는 단독으로 TestFlight 내부 그룹에 올려 첫 사람 반응을 본다(핵심 행동이 성립하는지가 목적). 이후 작은 수정은 묶어서 하루 1~2회로 올린다(→ `TestFlightRunbook.md`의 Deploy Cadence & Processing Quota).
