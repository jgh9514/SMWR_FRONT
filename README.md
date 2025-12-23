# SMWR_FRONT
서머너즈워 종합 커뮤니티

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하여 환경 변수를 설정하세요.

`.env.example` 파일을 참고하여 `.env.local` 파일을 생성할 수 있습니다:

```bash
cp .env.example .env.local
```

### 환경 변수 목록

- `NEXT_PUBLIC_API_BASE_URL`: 개발 환경 API 서버 URL (기본값: `http://localhost:8080/api/v1`)
- `BACKEND_HOST`: 프로덕션 환경 백엔드 호스트 (기본값: `13.236.20.39`)
- `BACKEND_PORT`: 프로덕션 환경 백엔드 포트 (기본값: `30080`)

### Next.js 환경 변수 파일 우선순위

1. `.env.local` - 모든 환경에서 사용 (Git에 커밋되지 않음)
2. `.env.development` - 개발 환경에서만 사용
3. `.env.production` - 프로덕션 환경에서만 사용
4. `.env` - 모든 환경에서 사용

자세한 내용은 [Next.js 환경 변수 문서](https://nextjs.org/docs/basic-features/environment-variables)를 참고하세요.
