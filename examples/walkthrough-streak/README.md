# Walkthrough: "Streak" — idea to first release handoff

이 폴더는 가상의 작은 앱 **Streak**을 아이디어에서 첫 proof, 릴리스 핸드오프까지 이 kit으로 끌고 간 예시입니다. 실제 앱 구현은 없습니다 — 목적은 각 kit 문서가 **어느 단계에서 어떻게 쓰이는지**를 한눈에 보여주는 것입니다. 모든 계정·빌드 값은 placeholder입니다(→ `08-security/`).

## Streak이 뭔가요

하루에 한 번 "오늘 완료" 버튼을 눌러 습관 하나(예: 물 마시기)를 기록하고, 연속 일수(streak)가 쌓이는 걸 보는 앱. 한 화면, 한 탭, 로컬 저장만.

## 단계별 흐름과 사용한 kit 문서

| 단계 | 하는 일 | 이 kit 문서 | 이 워크스루의 산출물 |
|------|---------|-------------|----------------------|
| 1. 아이디어 → PRD | 사용자·핵심가치·첫 proof 범위를 좁힌다 | `02-product-prd/PRD.template.md` | [`PRD.md`](PRD.md) |
| 2. 첫 proof 계획 | 첫 proof를 demoable slice로 쪼갠다 | `02-product-prd/Iteration.template.md`, `examples/unity-ios-minimal/README.md` | [`Iteration-01.md`](Iteration-01.md) |
| 3. 환경·계정 준비 | 빌드 환경과 ASC 계정을 준비한다 | `03-ios-unity-setup/EnvironmentChecklist.md`, `04-app-store-connect-testflight/AppStoreConnectSetup.md` | (계정값은 로컬에만) |
| 4. 만들며 검증 | 시뮬레이터로 화면을 눈으로 확인한다 | `04-app-store-connect-testflight/VisualVerification.md` | Iteration-01의 Validation Path |
| 5. 배포 | 커밋된 소스에서 빌드해 TestFlight로 올린다 | `04-app-store-connect-testflight/TestFlightRunbook.md`(경로 B), `05-release-runbooks/GitSourceOfTruth.md` | [`ReleaseHandoff.md`](ReleaseHandoff.md) |
| 6. 핸드오프 | 빌드↔커밋 연결·검증·노출을 기록한다 | `05-release-runbooks/ReleaseChecklist.md`, `07-templates/` | [`ReleaseHandoff.md`](ReleaseHandoff.md) |

## "good enough" 기준 (이 예시 기준)

- **Week 1**: PRD의 First Usable Proof가 한 문장으로 좁혀졌고, 환경·계정 체크리스트가 통과한다.
- **First proof**: 앱을 열어 "오늘 완료"를 한 번 탭하면 streak이 0→1이 되고, 앱을 껐다 켜도 1이 유지된다. 핵심 행동까지 1탭.
- **Release handoff**: TestFlight 빌드 번호가 Git commit과 연결되고, 시뮬레이터 시각 검증 기록이 있고, 어떤 테스터 그룹에 노출됐는지가 적혀 있다.

첫 사용자는 이 세 문서를 순서대로 읽으면, 자기 앱에서 "week 1 / 첫 proof / 핸드오프"가 각각 어떤 모습인지 복사할 패턴을 얻습니다.
