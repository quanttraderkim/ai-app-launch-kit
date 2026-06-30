# Git Source Of Truth

AI 에이전트와 앱을 만들 때 가장 흔한 위험은 “내 컴퓨터에서는 되는 상태”와 “repo에 남은 상태”가 달라지는 것입니다. 스터디에서는 Git을 source of truth로 둡니다.

## Rule

배포된 빌드, 공유된 데모, 제출 후보는 commit hash와 연결되어야 합니다. 커밋되지 않은 상태에서 만든 빌드는 재현할 수 없고, 다음 에이전트나 팀원이 이어받기 어렵습니다.

## Good Commit Shape

하나의 커밋은 하나의 의도를 가져야 합니다. 예를 들어 `Add first TestFlight runbook`, `Implement first onboarding proof`, `Fix iOS signing export setting`처럼 읽었을 때 목적이 드러나야 합니다.

## Dirty Worktree During Handoff

작업 중 dirty worktree가 있을 수는 있습니다. 하지만 handoff에는 어떤 파일이 바뀌었고, 그 변경이 빌드에 포함되었는지, 커밋해야 하는지, 버려도 되는지 분명히 적어야 합니다.

```text
Uncommitted changes:
- <FILE>: <WHY_CHANGED>, <IN_BUILD_OR_NOT>, <NEXT_ACTION>
```

## Release Drift

TestFlight나 production에 올라간 빌드가 커밋되지 않은 소스에서 만들어졌다면 release drift입니다. 다음 작업의 우선순위는 새 기능이 아니라 그 상태를 Git에 보존하고 검증하는 것입니다.
