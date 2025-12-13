# Docker & Nginx 설정 가이드

Next.js 애플리케이션을 Docker와 Nginx로 배포하는 방법입니다.

## 📁 생성된 파일

- `Dockerfile` - Next.js 앱 빌드 및 실행용
- `docker-compose.yml` - Nginx와 Next.js 앱을 함께 실행
- `nginx.conf` - Nginx 리버스 프록시 설정
- `.dockerignore` - Docker 빌드 시 제외할 파일 목록

## 🚀 사용 방법

### 1. 환경 변수 설정 (선택사항)

`.env` 파일을 생성하여 환경 변수를 설정할 수 있습니다:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 2. Docker 이미지 빌드 및 실행

```bash
# Docker Compose로 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 3. 개별 서비스 관리

```bash
# Next.js 앱만 재시작
docker-compose restart nextjs-app

# Nginx만 재시작
docker-compose restart nginx

# 특정 서비스 로그 확인
docker-compose logs -f nextjs-app
docker-compose logs -f nginx
```

## 🔧 설정 설명

### Dockerfile

- **Multi-stage build** 사용으로 최적화된 이미지 생성
- **Standalone 모드** 사용으로 필요한 파일만 포함
- 보안을 위한 비root 사용자 실행

### docker-compose.yml

- **nextjs-app**: Next.js 애플리케이션 (포트 3000)
- **nginx**: 리버스 프록시 서버 (포트 80)
- 헬스 체크 포함

### nginx.conf

- Next.js 앱으로 모든 요청 프록시
- 정적 파일 캐싱 최적화
- Gzip 압축 활성화
- WebSocket 지원

## 🌐 접속

- **로컬**: http://localhost
- **Next.js 직접 접속**: http://localhost:3000 (개발/디버깅용)

## 📝 주의사항

1. **백엔드 API URL**: `NEXT_PUBLIC_API_URL` 환경 변수로 백엔드 API 주소를 설정하세요.
2. **HTTPS**: 프로덕션 환경에서는 SSL 인증서를 설정하여 HTTPS를 사용하세요.
3. **포트 변경**: 필요시 `docker-compose.yml`에서 포트를 변경할 수 있습니다.

## 🔍 문제 해결

### 포트 충돌
```bash
# 포트가 이미 사용 중인 경우
# docker-compose.yml에서 포트 번호 변경
ports:
  - "8080:80"  # 80 대신 다른 포트 사용
```

### 빌드 실패
```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 로그 확인
docker-compose logs nextjs-app
```

### Nginx 설정 테스트
```bash
# Nginx 설정 파일 문법 확인
docker-compose exec nginx nginx -t
```

## 🎯 프로덕션 배포

프로덕션 환경에서는 다음을 고려하세요:

1. **환경 변수**: `.env.production` 파일 사용
2. **HTTPS**: Let's Encrypt 등으로 SSL 인증서 설정
3. **로깅**: 로그 파일 관리 및 모니터링
4. **백업**: 정기적인 데이터 백업
5. **보안**: 방화벽 설정 및 보안 업데이트

