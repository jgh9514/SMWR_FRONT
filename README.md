# 전투 로그 분석 시스템 (SMWR_FRONT)

서머너즈워 점령전·실레나(RTA) 전투 데이터를 분석하고, 몬스터 검색·공지·길드 기능까지 한곳에서 쓸 수 있는 **웹 프론트엔드** 저장소입니다. 포트폴리오·제출 시 아래 요약과 앱 내 **`/about`** 프로젝트 소개 페이지를 함께 참고하면 됩니다.

## 한 줄 요약

- **Next.js(App Router) + TypeScript + MUI** 기반 SPA 성격의 포털
- **TanStack Query**로 서버 상태, **Recoil**로 클라이언트 상태
- **PWA** 지원, **TipTap** 에디터, **Recharts** 차트
- 백엔드는 동일 모노레포의 **SMWR_WAS**(Spring Boot) REST API와 연동

## 기술 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 16, React |
| 언어 | TypeScript |
| UI | MUI 7, Emotion, Tailwind 4(PostCSS) |
| 데이터 | TanStack Query v5, Axios, Recoil |
| 기타 | next-pwa, TipTap, Recharts, react-hot-toast |

## 주요 기능 (화면 기준)

- **홈**: 기능별 메뉴 허브, 길드·권한에 따른 노출
- **점령전**: 덱 검색, 상세, 최근 점령전, 전적 조회(길드 연동)
- **RTA**: 분석 대시보드, 몬스터별 통계
- **몬스터 검색**, **공지사항**, **문의**, **설정**, **관리자**(역할·메뉴·API·배치 등)

## 로컬 실행

패키지 매니저는 **Yarn 4**를 사용합니다.

```bash
cd SMWR_FRONT
cp .env.example .env.local
yarn install
yarn dev
```

브라우저에서 `http://localhost:3000` — **프로젝트 소개**는 `/about` 입니다.

### 빌드

```bash
yarn build
yarn start
```

품질 검사:

```bash
yarn lint:all
```

## 환경 변수

프로젝트 루트에 `.env.local`을 두고 설정합니다. `.env.example`을 복사해 사용할 수 있습니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 개발용 API 베이스 URL (기본: `http://localhost:8080/api/v1`) |
| `BACKEND_HOST` | 프로덕션 백엔드 호스트 |
| `BACKEND_PORT` | 프로덕션 백엔드 포트 |

Next.js 환경 파일 우선순위는 [공식 문서](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)를 따릅니다. (`.env.local`은 Git에 포함하지 않는 것을 권장합니다.)

## 저장소 구조 (요약)

- `src/app/` — App Router 페이지·레이아웃
- `src/features/` — 도메인별 UI·로직 (home, siege, auth 등)
- `src/shared/` — 공용 UI, 훅, 유틸, 프로바이더

백엔드·배포는 상위 디렉터리 **SMWR_WAS**, `k8s/`, `.github/workflows/`를 참고하세요.

## 라이선스·저작권

게임 데이터·상표는 각 권리자에게 있습니다. 본 프로젝트는 개인·포트폴리오 목적의 비공식 도구입니다.
