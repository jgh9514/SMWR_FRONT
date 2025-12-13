# GitHub Actions CI/CD 파이프라인

이 디렉토리에는 GitHub Actions를 사용한 자동화된 빌드 및 배포 워크플로우가 포함되어 있습니다.

## 워크플로우 파일

- `build-and-deploy.yaml` - Next.js 빌드, Docker 이미지 생성 및 Kubernetes 배포

## 작동 방식

### 트리거 조건

1. **자동 실행**: `main` 또는 `master` 브랜치에 푸시 시
2. **수동 실행**: GitHub Actions 탭에서 `workflow_dispatch`로 수동 실행 가능

### 실행 단계

#### 1. Build and Push Job

1. 코드 체크아웃
2. Node.js 20 설정
3. pnpm 설치 및 의존성 설치
4. TypeScript 타입 체크
5. Next.js 프로덕션 빌드
6. Docker 이미지 빌드 및 Docker Hub에 푸시

#### 2. Deploy Job (main/master 브랜치만)

1. kubectl 설정
2. Kubernetes 클러스터에 배포
3. 배포 상태 확인

## 필요한 GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 Secrets를 설정해야 합니다:

### 필수 Secrets

1. **DOCKER_USERNAME**
   - Docker Hub 사용자 이름
   - 예: `gilhwanjeon`

2. **DOCKER_PASSWORD**
   - Docker Hub 비밀번호 또는 Access Token
   - Access Token 사용 권장 (보안상 더 안전)

3. **KUBECONFIG** (Kubernetes 배포 시 필요)
   - Kubernetes 클러스터 설정 파일 (base64 인코딩)
   - 생성 방법:
     ```bash
     cat ~/.kube/config | base64
     ```

## Docker Hub Access Token 생성 방법

1. Docker Hub에 로그인
2. Account Settings > Security > New Access Token
3. 토큰 이름 입력 (예: `github-actions`)
4. 권한: Read & Write 선택
5. 생성된 토큰을 `DOCKER_PASSWORD` Secret에 저장

## Kubernetes 배포 설정 (선택사항)

Kubernetes 자동 배포를 사용하지 않으려면:

1. `build-and-deploy.yaml`에서 `deploy` job을 제거하거나
2. `deploy` job의 `if` 조건을 수정하여 비활성화

## 사용 방법

### 자동 실행

```bash
# main 브랜치에 푸시하면 자동으로 실행됩니다
git add .
git commit -m "Update code"
git push origin main
```

### 수동 실행

1. GitHub 저장소로 이동
2. Actions 탭 클릭
3. "Build and Deploy" 워크플로우 선택
4. "Run workflow" 버튼 클릭
5. 브랜치 선택 후 실행

## 워크플로우 확인

GitHub 저장소의 Actions 탭에서 워크플로우 실행 상태를 확인할 수 있습니다:

- ✅ 성공: 모든 단계가 성공적으로 완료됨
- ❌ 실패: 어느 단계에서 오류 발생 (로그 확인 가능)
- 🟡 진행 중: 현재 실행 중

## 문제 해결

### Docker Hub 로그인 실패

- `DOCKER_USERNAME`과 `DOCKER_PASSWORD` Secret이 올바르게 설정되었는지 확인
- Docker Hub Access Token이 만료되지 않았는지 확인

### Kubernetes 배포 실패

- `KUBECONFIG` Secret이 올바르게 설정되었는지 확인
- Kubernetes 클러스터에 접근 권한이 있는지 확인
- Deployment 이름이 `smwr-front`인지 확인

### 빌드 실패

- TypeScript 타입 오류 확인
- Next.js 빌드 오류 확인
- Actions 탭의 로그에서 상세 오류 메시지 확인

## 커스터마이징

### 다른 Docker 레지스트리 사용

`build-and-deploy.yaml`의 `env` 섹션에서 `DOCKER_IMAGE`를 수정:

```yaml
env:
  DOCKER_IMAGE: your-registry.com/your-image
```

### 다른 브랜치에서도 실행

`on.push.branches`에 브랜치 추가:

```yaml
on:
  push:
    branches:
      - main
      - develop  # 추가
```

### 배포 환경별 분리

환경별로 다른 Kubernetes 네임스페이스나 클러스터를 사용하려면 워크플로우를 수정하세요.

