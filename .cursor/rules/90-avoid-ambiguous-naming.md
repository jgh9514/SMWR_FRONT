---
name: "이름 겹치지 않게 관리하기"
scope: repo
tags:
  - predictability
  - naming
  - api-design
---

## 규칙: 같은 이름이면 같은 동작을 하게, 다른 동작이면 다른 이름을 쓰기

### 왜 필요한가 (예측 가능성)

같은 이름을 가진 함수나 변수는 **항상 동일한 동작**을 해야 합니다.  
작은 동작 차이라도:

- 코드를 읽는 사람의 **예상과 실제 동작이 어긋나고**
- 버그를 만들기 쉽고
- 디버깅을 복잡하게 만듭니다.

특히, **기존 라이브러리/표준 API와 같은 이름을 가진 “우리만의 함수”**를 만들면,  
사용자는 그 함수도 라이브러리/표준과 똑같이 동작할 것이라 기대하게 됩니다.

---

## 코드 예시: HTTP 모듈 감싸기

### 안티 패턴 예시

```ts
// http.ts
// 이 서비스는 `http`라는 라이브러리를 쓰고 있어요
import { http as httpLibrary } from "@some-library/http";

export const http = {
  async get(url: string) {
    const token = await fetchToken();

    return httpLibrary.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
```

### 문제점 (냄새)

- 외부 라이브러리와 새로 만든 모듈 둘 다 이름이 `http` 입니다.
- 코드를 읽는 사람은 `http.get` 이 **단순한 GET 요청**(원래 라이브러리의 동작)이라고 예상하지만,
  - 실제로는 **토큰을 가져오는 추가 작업**이 수행되고,
  - Authorization 헤더를 붙이는 등 “인증 로직”이 숨어 있습니다.
- 이처럼:
  - 이름은 같지만
  - 동작은 다른 경우
  → 예측 가능성이 떨어지고, 오해로 인한 버그와 디버깅 난이도가 커집니다.

---

## 개선안: 이름으로 동작 차이를 드러내기

```ts
// httpService.ts
// 이 서비스는 `http`라는 라이브러리를 쓰고 있어요
import { http as httpLibrary } from "@some-library/http";

// 라이브러리 함수명과 구분되도록 명칭을 변경했어요.
export const httpService = {
  async getWithAuth(url: string) {
    const token = await fetchToken();

    // 토큰을 헤더에 추가하는 등 인증 로직을 추가해요.
    return httpLibrary.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
```

- `httpService` 라는 이름만 봐도:
  - “우리 서비스에서 정의한 HTTP 헬퍼” 라는 점을 인지할 수 있고,
- `getWithAuth` 라는 이름으로:
  - 이 함수가 **인증이 필요한 요청을 보낸다**는 것을 분명히 알 수 있습니다.
- 라이브러리의 `http.get` 과:
  - 우리의 `httpService.getWithAuth` 는 이름 자체가 다르므로
  - 혼동될 여지를 줄일 수 있습니다.

---

## 이 프로젝트에서의 적용 원칙

1. **라이브러리/표준 API와 이름이 겹치지 않게 하기**
   - 예: `fetch`, `http`, `map`, `filter`, `reduce`, `useQuery`, `useMutation` 등
   - 이런 이름으로 “우리만의 함수/모듈”을 만들지 않습니다.
   - 꼭 감싸야 한다면:
     - `httpClient`, `httpService`, `safeFetch`, `authedFetch` 처럼
     - **원래 것과 다른 이름**을 사용해 의도적으로 구분합니다.

2. **동작이 다르면 이름도 달라야 한다**
   - 원래 함수와 “조금만 다르게” 동작하는 함수를 만들 때:
     - 같은 이름을 재사용하지 말고,
     - 변경점을 드러내는 이름(예: `getWithAuth`, `getCached`, `mapNonNull`)을 사용합니다.

3. **동작이 같다면 굳이 새 이름을 만들지 않는다**
   - 라이브러리/표준 API를 거의 그대로 호출만 할 경우:
     - 불필요하게 `wrapXxx`, `myXxx` 등 다른 이름을 만들기보다
     - 가능한 한 원래 API를 직접 사용하는 쪽으로 유지합니다.

4. **네이밍 리뷰 체크 포인트**
   - 함수를 처음 보는 사람이:
     - 이름만 보고 “어느 정도” 동작을 예측할 수 있는가?
     - 이 이름이 라이브러리/표준의 이름과 **헷갈리지 않는가?**
   - “헷갈릴 수 있다”면 → 이름을 바꾸는 것을 기본 선택으로 합니다.

이 원칙을 지키면, 코드의 이름만으로도 **어떤 모듈/함수인지, 어디서 온 것인지, 무엇을 하는지**를 예측할 수 있고,  
기존 라이브러리/표준과의 혼동을 줄여 코드베이스 전체의 예측 가능성과 안정성을 높일 수 있습니다.


