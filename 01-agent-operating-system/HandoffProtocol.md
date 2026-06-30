# Handoff Protocol

에이전트가 길게 작업하거나 다른 세션으로 넘길 때는 이 형식을 사용합니다. 목적은 다음 사람이 같은 상태를 재현하고 바로 이어서 작업할 수 있게 만드는 것입니다.

## Required Handoff Fields

```text
Project:
Repo path:
Current branch:
Latest commit:
Uncommitted changes:
Build/version:
Validation performed:
Known blockers:
Next action:
Do not touch:
```

`Latest commit`은 가능하면 원격에 push된 commit hash를 씁니다. `Uncommitted changes`가 있다면 왜 남아 있는지, 배포 빌드에 포함되었는지, 다음 사람이 커밋해야 하는지 분명히 적습니다.

## Release Handoff Rule

TestFlight, App Store, Play Console, web production에 올라간 결과물은 반드시 commit hash와 연결되어야 합니다. 커밋되지 않은 소스에서 만든 빌드를 올렸다면 즉시 release drift로 기록하고, 같은 소스를 최소 커밋으로 보존하는 일을 다음 최우선 작업으로 둡니다.
