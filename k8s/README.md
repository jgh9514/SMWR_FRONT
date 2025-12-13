# Kubernetes 배포 가이드

이 디렉토리에는 Kubernetes 클러스터에 SMWR Front 애플리케이션을 배포하기 위한 매니페스트 파일들이 포함되어 있습니다.

## 파일 구조

- `deployment.yaml` - 애플리케이션 배포 정의
- `service.yaml` - 클러스터 내부 서비스 정의
- `configmap.yaml` - 환경 변수 설정 (ConfigMap)
- `ingress.yaml` - 외부 접근을 위한 Ingress 설정 (선택사항)

## 사전 요구사항

1. Kubernetes 클러스터 (v1.19 이상)
2. kubectl 설치 및 클러스터 접근 권한
3. Docker 이미지가 레지스트리에 푸시되어 있어야 함

## 사용 방법

### 1. Docker 이미지 푸시

먼저 Docker 이미지를 레지스트리에 푸시해야 합니다:

```bash
# 이미지 태그 지정
docker tag smwr_front-nextjs-app:latest gilhwanjeon/smwr_front-nextjs-app:latest

# 레지스트리에 푸시
docker push gilhwanjeon/smwr_front-nextjs-app:latest
```

### 2. ConfigMap 설정

`configmap.yaml` 파일에서 백엔드 API URL을 설정합니다:

```yaml
data:
  api-url: "http://your-backend-service:8080"
```

### 3. Ingress 설정 (선택사항)

외부 도메인을 사용하는 경우 `ingress.yaml`에서 도메인을 설정합니다:

```yaml
rules:
- host: your-domain.com
```

### 4. 배포

모든 리소스를 배포:

```bash
# ConfigMap 생성
kubectl apply -f k8s/configmap.yaml

# Deployment 및 Service 생성
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Ingress 생성 (선택사항)
kubectl apply -f k8s/ingress.yaml
```

### 5. 배포 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=smwr-front

# Deployment 상태 확인
kubectl get deployment smwr-front

# Service 확인
kubectl get service smwr-front-service

# 로그 확인
kubectl logs -f deployment/smwr-front
```

### 6. 롤링 업데이트

새 이미지가 푸시된 후:

```bash
# 이미지 업데이트를 위한 재시작
kubectl rollout restart deployment/smwr-front

# 롤아웃 상태 확인
kubectl rollout status deployment/smwr-front
```

## 환경 변수

환경 변수는 `deployment.yaml`의 `env` 섹션에서 설정할 수 있습니다. 민감한 정보는 Secret을 사용하세요:

```bash
# Secret 생성 예시
kubectl create secret generic smwr-front-secrets \
  --from-literal=api-key=your-api-key
```

그리고 `deployment.yaml`에서 참조:

```yaml
env:
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: smwr-front-secrets
      key: api-key
```

## 리소스 제한

현재 설정된 리소스:
- 요청: CPU 250m, Memory 256Mi
- 제한: CPU 500m, Memory 512Mi

필요에 따라 `deployment.yaml`의 `resources` 섹션을 수정하세요.

## 헬스 체크

애플리케이션은 `/health` 엔드포인트를 통해 헬스 체크를 수행합니다:
- Liveness Probe: 30초 후 시작, 10초마다 체크
- Readiness Probe: 10초 후 시작, 5초마다 체크

## 트러블슈팅

### Pod가 시작되지 않는 경우

```bash
# Pod 이벤트 확인
kubectl describe pod <pod-name>

# 로그 확인
kubectl logs <pod-name>
```

### 이미지를 가져올 수 없는 경우

```bash
# 이미지 Pull 정책 확인
kubectl describe pod <pod-name> | grep ImagePullPolicy

# 이미지가 레지스트리에 존재하는지 확인
docker pull gilhwanjeon/smwr_front-nextjs-app:latest
```

### 서비스에 연결할 수 없는 경우

```bash
# Service 엔드포인트 확인
kubectl get endpoints smwr-front-service

# Pod 레이블 확인
kubectl get pods --show-labels
```

