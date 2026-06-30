# Environment Checklist

새 멤버가 개발을 시작하기 전에 확인할 환경입니다. 모든 항목이 첫날 끝나지 않아도 되지만, 배포 목표가 iOS라면 Apple Developer와 Xcode signing 문제는 늦게 발견할수록 더 비쌉니다.

## Common

- [ ] Git 설치 및 GitHub 계정 준비
- [ ] GitHub CLI 로그인 확인
- [ ] 에디터 또는 IDE 설치
- [ ] 프로젝트 repo 생성
- [ ] `.gitignore`에 secret, build output, archive 파일 제외
- [ ] README에 로컬 실행 방법 기록

## iOS Native

- [ ] Xcode 설치
- [ ] Xcode Command Line Tools 선택
- [ ] Apple Developer Program 가입 여부 확인
- [ ] Xcode Accounts에 Apple ID 추가
- [ ] 실제 iPhone 연결 또는 시뮬레이터 준비
- [ ] Bundle Identifier 결정: `<BUNDLE_ID>`
- [ ] Signing Team 확인: `<APPLE_TEAM_ID>`

## Unity iOS

- [ ] Unity Hub 설치
- [ ] 프로젝트 Unity Editor 버전 고정
- [ ] iOS Build Support 설치
- [ ] Xcode 설치 및 라이선스 동의
- [ ] Unity Player Settings에서 portrait/landscape 방향 결정
- [ ] Bundle Identifier와 Version/Build Number 결정
- [ ] iOS export 후 Xcode build가 되는지 확인

## Optional Tools

- [ ] fastlane 또는 custom upload script 검토
- [ ] App Store Connect API key 준비
- [ ] 디자인/에셋 생성 도구의 API key는 키체인 또는 secret manager에 저장
- [ ] crash/reporting SDK는 첫 proof 이후 검토
