# Unity iOS Minimal Example

이 폴더는 실제 Unity 프로젝트를 포함하지 않습니다. 대신 에이전트가 새 Unity iOS 프로젝트를 만들 때 유지해야 할 최소 구조를 설명합니다. 공개 kit repo에 큰 binary asset이나 개인 signing 파일을 넣지 않기 위해 예시는 문서 중심으로 둡니다.

## Suggested Project Files

```text
MyGame/
  Assets/
  Packages/
  ProjectSettings/
  Docs/
    PRD.md
    ReleasePrep.md
    PlayerValueIterations.md
  Builds/
    ios/              # ignored or generated
```

## First Unity iOS Proof

첫 proof는 한 화면, 한 조작, 한 결과로 좁힙니다. 게임이라면 캐릭터 하나, 적 하나, 보상 하나, 성장 한 번처럼 사용자가 가치를 느끼는 가장 작은 루프를 닫습니다. 앱이라면 입력 하나, 결과 하나, 저장 또는 공유 하나로 충분합니다.

## What Not To Copy Into Public Repo

Unity Library 폴더, DerivedData, iOS archive, `.ipa`, signing certificate, provisioning profile, paid asset 원본은 public template repo에 넣지 않습니다.
