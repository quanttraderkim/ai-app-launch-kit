# Color-Hole Web Proof

이 폴더는 `Docs/GameSpec.md`의 first playable proof를 브라우저에서 실행하는 정적 데모입니다. Play 화면은 `tutorial-001`만 플레이하며 정수 격자 상태, 한 칸씩 진행하는 직교 sweep, 슬롯별 수집, 부분 충전, 완료 제거, 승리와 재시작을 보여줍니다. 같은 core의 독립 BFS/A*는 기록된 `solutionTrace`를 입력으로 읽지 않고 tutorial의 최단 풀이와 난이도 vector를 계산합니다. Spread Audit은 후속 제작 예제인 `spread-demo-002`의 분산 수치를 읽기 전용으로 계산합니다. 자동 레벨 생성기, 큰 다중-Hole 레벨의 solver 인증과 Unity 모바일 빌드는 이 폴더의 구현 범위가 아닙니다.

`data/`의 JSON은 정적 배포가 상위 경로에 의존하지 않게 canonical `../Levels/` 파일을 복사한 것입니다. `tests/core.test.mjs`가 두 쌍을 구조적으로 비교하므로 한쪽만 바뀌면 테스트가 실패합니다. 게임 좌표나 규칙을 HTML에 다시 하드코딩하지 않고 브라우저와 테스트가 같은 `src/core.mjs`를 사용합니다.

## Run Locally

예시 폴더에서 아래 명령을 실행한 뒤 `http://localhost:4173`을 엽니다. `file://`로 직접 열면 브라우저의 JSON fetch 정책 때문에 실행되지 않을 수 있습니다.

```sh
python3 -m http.server 4173 --directory WebDemo
```

순수 모델 테스트는 외부 패키지 설치 없이 Node.js 20 이상에서 실행합니다.

```sh
node --test WebDemo/tests/core.test.mjs
```

## Vercel Preview

Vercel CLI에 로그인한 환경에서 반드시 이 폴더를 프로젝트 root로 지정합니다. 공개 템플릿에는 실제 계정 scope나 프로젝트 식별자를 기록하지 않습니다.

```sh
vercel link --cwd WebDemo --scope <VERCEL_SCOPE> --project <VERCEL_PROJECT_NAME>
vercel deploy --cwd WebDemo --scope <VERCEL_SCOPE>
```

preview URL에서 모바일 폭과 데스크톱 폭으로 Play, Restart, Auto replay, Spread Audit을 확인한 뒤에만 production 배포를 진행합니다. `.vercel/`의 로컬 연결 정보는 저장소 루트 `.gitignore`에 포함되어 있으며 token을 명령 인자나 문서에 넣지 않습니다.

## Test Hook

브라우저 자동 검증은 `window.__PUZZLE_TEST__`의 snapshot, event log, state hash, reset, move, recorded replay, distribution report와 difficulty report를 읽을 수 있습니다. 이 hook은 테스트 관찰과 결정적인 명령 입력을 위한 것이며 DOM 위치나 애니메이션 callback으로 모델 상태를 수정하지 않습니다.
