# Agent Instructions

이 폴더에서 작업하는 에이전트는 상용 게임 복제자가 아니라 독자적인 색상 수집형 격자 퍼즐의 제품·개발 파트너로 행동한다. `Drop Away: Color Puzzle`과 외부 플레이 영상은 추상적인 규칙을 관찰하는 자료일 뿐이다. 원작의 이름, 브랜드, 캐릭터, UI 배치, 색 조합, 음향, 문구, 레벨, 수치, 광고 소재, 스크린샷 또는 추출 에셋을 복제하지 않는다.

## Required Reading

작업 전에 kit 루트의 `README.md`, `AGENTS.md`, `08-security/SanitizationPolicy.md`를 읽고, 이 폴더에서는 `README.md`, `Docs/PRD.md`, `Docs/GameSpec.md`, `Docs/TechnicalArchitecture.md`, `Docs/LevelFormat.md`, `Docs/LevelDesignAndGeneration.md`, `Docs/AcceptanceTests.md`, `Docs/ImplementationPlan.md`, `Docs/DecisionLog.md` 순서로 읽는다. 특정 규칙의 외부 근거가 필요할 때만 `Docs/References.md`를 확인한다.

문서 사이의 우선순위는 플레이어 가치와 범위는 `Docs/PRD.md`, 게임 규칙은 `Docs/GameSpec.md`, 코드 책임과 상태 흐름은 `Docs/TechnicalArchitecture.md`, 직렬화 형식은 `Docs/LevelFormat.md`와 JSON Schema, 완료 판정은 `Docs/AcceptanceTests.md` 순이다. 충돌을 발견하면 조용히 한 문서를 덮어쓰지 말고 `Docs/DecisionLog.md`에 충돌과 선택을 기록한다.

## Non-Negotiable Game Rules

게임 판정의 권위 상태는 정수 격자 기반의 순수 데이터 모델이다. Rigidbody, Collider의 우연한 접촉 결과, Transform 좌표, tween 진행률 또는 애니메이션 이벤트를 규칙의 source of truth로 사용하지 않는다. 블록은 first proof에서 회전하지 않고 직교 방향으로만 이동하며, 빠른 드래그도 시작 칸에서 목표 칸까지 한 칸씩 검사한다. 대각선 입력은 결정적인 직교 단계로 분해하고 막힌 모서리를 잘라 통과시키지 않는다.

Hole의 각 shape offset은 독립된 로컬 수용 슬롯이다. 같은 색 승객을 유효한 빈 슬롯으로 밟는 순간 수집하며, 부분 충전 상태는 슬롯 비트마스크 또는 동등하게 결정적인 값으로 보존한다. 다른 색 승객, 보드 밖, 비활성 칸, 다른 블록과 고체 장애물은 first proof에서 통과할 수 없다. 논리 상태와 이벤트 결과를 먼저 확정한 뒤 View가 그 결과를 애니메이션으로 표현한다.

게임 런타임과 레벨 검증 도구 또는 solver는 가능한 한 동일한 `MoveResolver`와 이벤트 해석기를 사용한다. 컬렉션 순회 순서와 동시 이벤트 순서는 명시적으로 고정하여 플랫폼이나 프레임률에 따라 결과가 달라지지 않게 한다. 레벨은 코드에 하드코딩하지 않고 문서화된 데이터 형식으로 로드한다.

레벨 생성 작업에서는 자연어 감각으로 Passenger를 자유 배치하지 않는다. `Docs/LevelDesignAndGeneration.md`의 seed, 색별 거리·군집·region, 전체 region·2×2·3×3 제약과 repair 순서를 따르고, 기록 trace replay와 독립 solver를 모두 통과하지 못한 후보는 폐기한다. 생성 도구는 first playable proof를 통과한 뒤에만 구현한다.

## Working Method

작업을 시작할 때 현재 branch, dirty worktree, 엔진 버전, 실행 가능한 테스트를 확인한다. 사용자의 기존 변경을 보존하고, 한 번에 `Docs/ImplementationPlan.md`의 한 phase 또는 더 작은 검증 가능한 slice만 진행한다. 범위 밖 기능을 발견하면 구현하지 말고 backlog 또는 decision log에 남긴다.

모호한 규칙은 임의로 원작과 같다고 주장하지 않는다. 현재 프로젝트에 필요한 독자적 규칙을 선택하고 `Docs/DecisionLog.md`에 선택, 이유, 플레이어 영향, 확인할 테스트를 기록한다. 선택이 core loop를 바꾸거나 이미 만든 레벨을 무효화하면 사용자 결정을 받아야 하며, 그렇지 않은 구현 세부사항은 테스트 가능한 기본값으로 진행한다.

새 규칙에는 순수 모델 자동 테스트를 먼저 또는 같은 변경 안에서 추가한다. 입력과 View 연결에는 PlayMode 또는 동등한 통합 테스트를 추가하고, 실제 터치·세로 화면·일시정지처럼 자동화하기 어려운 항목은 수동 smoke test 결과를 기록한다. 실패한 검증을 우회하거나 테스트를 삭제해서 완료 상태를 만들지 않는다.

## Completion And Handoff

한 단계는 코드 작성, 관련 테스트 통과, 문서와 샘플 데이터 동기화, 공개 안전 검사까지 끝나야 완료다. handoff에는 현재 branch와 commit, 변경 파일, 실행한 검증과 실제 결과, 알려진 가정·blocker, 다음 하나의 행동, 건드리지 말아야 할 사용자 변경을 적는다. 배포 또는 공유 빌드는 반드시 커밋된 소스와 commit hash에 연결한다.

이 공개 예시에는 실제 Apple 계정값, bundle identifier, tester 정보, key, 인증서, provisioning profile, 유료 에셋 또는 저작권 자료를 넣지 않는다. 외부 자료가 필요하면 다운로드하지 말고 `Docs/References.md`에 URL, 확인 날짜, 필요한 타임스탬프와 추상적인 관찰만 남긴다.
