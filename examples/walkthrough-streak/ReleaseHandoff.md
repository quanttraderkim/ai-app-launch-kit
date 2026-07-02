# Release Handoff: Streak — first proof

> 예시 기록입니다. `05-release-runbooks/ReleaseChecklist.md`와 `07-templates/`를 따른 형태이며, 모든 계정·빌드 값은 placeholder입니다(→ `08-security/`).

## Build Identity

| Field | Value |
| --- | --- |
| Build number | `<BUILD_NUMBER>` |
| Git commit | `<COMMIT_HASH>` |
| Bundle id | `<BUNDLE_ID>` |
| App (ASC) | `<ASC_APP_ID>` |

**핵심 원칙**: TestFlight에 올라간 빌드는 반드시 커밋된 소스에서 나와야 하고, 위 build number ↔ commit이 연결돼야 다음 사람이 같은 상태를 재현한다(→ `05-release-runbooks/GitSourceOfTruth.md`).

## Verification (업로드 전)

- [x] 시뮬레이터 시각 검증(`<SIMULATOR_DEVICE>`): 실행 직후 streak 0 → "오늘 완료" 탭 → 1 → 앱 재실행 후에도 1 유지. (→ `VisualVerification.md`)
- [x] 핵심 행동 1탭 확인.
- [ ] 날짜 경계(하루 거름 → 리셋)는 이번 proof 범위 밖(Iteration-01 Slice 3).

## Upload & Processing

- 업로드 경로: ASC API 자동 서명(→ `TestFlightRunbook.md` 경로 B).
- processingState: `<PROCESSING | VALID>` — VALID 확인 후 노출. 업로드 성공 자체는 "테스터가 본다"는 뜻이 아니다.

## Tester Exposure

- 노출 그룹: `<INTERNAL_GROUP_NAME>` (internal). VALID + 그룹 노출까지 확인.
- 테스터 안내: TestFlight 앱은 자동 업데이트가 아니므로 최신 빌드 번호 `<BUILD_NUMBER>` 설치를 요청.

## Known Limits / Next

- 단일 습관, 알림 없음, 통계 없음(PRD의 Out of Scope).
- 다음: 첫 사람 반응(재방문 여부)을 보고 알림 도입 여부 결정(PRD Decision Log).

## Test Questions (첫 테스터에게)

1. "오늘 완료" 버튼의 의미가 바로 이해됐나요?
2. 숫자가 올라가는 걸 다시 보고 싶었나요?
3. 다음 날 다시 열었나요, 아니면 한 번 쓰고 말았나요?
