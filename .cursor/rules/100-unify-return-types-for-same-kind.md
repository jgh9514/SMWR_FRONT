---
name: "같은 종류의 함수는 반환 타입 통일하기"
scope: repo
tags:
  - predictability
  - api-design
  - hooks
  - validation
---

## 규칙: 같은 종류의 함수/Hook은 일관된 반환 타입을 사용한다

### 왜 필요한가 (예측 가능성)

API 호출, 유효성 검사 등 **같은 역할을 하는 함수/Hook들이 서로 다른 반환 타입**을 가지면:

- 코드를 쓸 때마다 “이건 data만 주나? Query 객체를 주나?”를 확인해야 하고
- 실수로 잘못된 방식으로 사용하기 쉽고
- 팀 전체의 코드 스타일이 제각각이 되어 예측 가능성이 떨어집니다.

> “같은 이름 패턴 & 같은 역할” → “같은 반환 타입” 이 되도록 맞추는 것이 목표입니다.

---

## 예시 1: 서버 API Hook (`useUser`, `useServerTime`)

### 안티 패턴 예시

```ts
import { useQuery } from "@tanstack/react-query";

function useUser() {
  const query = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser
  });

  return query;
}

function useServerTime() {
  const query = useQuery({
    queryKey: ["serverTime"],
    queryFn: fetchServerTime
  });

  return query.data;
}
```

### 문제점 (냄새)

- 둘 다 “서버 API를 호출하는 Hook”이지만:
  - `useUser` → React Query의 **Query 객체 전체**를 반환
  - `useServerTime` → **data만** 반환
- 이 패턴이 많아지면, 동료들은 각 Hook을 쓸 때마다:
  - “여기서는 `const { data } = useXxx()` 인가?”
  - “아니면 `const serverTime = useServerTime()` 처럼 바로 값이 오는가?”
  를 **매번 확인해야 합니다.**

---

### 개선안: API Hook은 모두 Query 객체를 반환

```ts
import { useQuery } from "@tanstack/react-query";

function useUser() {
  const query = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser
  });

  return query;
}

function useServerTime() {
  const query = useQuery({
    queryKey: ["serverTime"],
    queryFn: fetchServerTime
  });

  return query;
}
```

- “서버 상태를 가져오는 Hook” 이라는 공통 컨셉에 맞춰
  - 모두 `UseQueryResult<T>`(혹은 Query 객체)를 반환하도록 통일합니다.
- 사용하는 쪽에서는 항상:

```ts
const { data, isLoading, error } = useServerTime();
```

처럼 **일관된 패턴으로 사용**할 수 있습니다.

---

## 예시 2: 유효성 검사 함수 (`checkIsNameValid`, `checkIsAgeValid`)

### 안티 패턴 예시

```ts
/** 사용자 이름은 20자 미만이어야 해요. */
function checkIsNameValid(name: string) {
  const isValid = name.length > 0 && name.length < 20;

  return isValid;
}

/** 사용자 나이는 18세 이상 99세 이하의 자연수여야 해요. */
function checkIsAgeValid(age: number) {
  if (!Number.isInteger(age)) {
    return {
      ok: false,
      reason: "나이는 정수여야 해요."
    };
  }

  if (age < 18) {
    return {
      ok: false,
      reason: "나이는 18세 이상이어야 해요."
    };
  }

  if (age > 99) {
    return {
      ok: false,
      reason: "나이는 99세 이하이어야 해요."
    };
  }

  return { ok: true };
}
```

### 문제점 (냄새)

- 둘 다 “입력값이 유효한지 검사”한다는 역할은 같지만:
  - `checkIsNameValid` → `boolean` 반환
  - `checkIsAgeValid` → `{ ok: boolean; reason?: string }` 객체 반환
- 사용하는 입장에서:

```ts
if (checkIsNameValid(name)) {
  // 이름은 올바르게 검증
}

if (checkIsAgeValid(age)) {
  // 여기서는 항상 truthy (객체) → 버그!
}
```

- 반환 타입이 통일되어 있지 않기 때문에,
  - `if (checkIsAgeValid(age))` 처럼 잘못 사용해도
  - 타입/런타임 모두에서 바로 드러나지 않는 버그가 생길 수 있습니다.

---

### 개선안: 유효성 검사 함수 반환 타입 통일하기

```ts
type ValidationCheckReturnType = { ok: true } | { ok: false; reason: string };

/** 사용자 이름은 20자 미만이어야 해요. */
function checkIsNameValid(name: string): ValidationCheckReturnType {
  if (name.length === 0) {
    return {
      ok: false,
      reason: "이름은 빈 값일 수 없어요."
    };
  }

  if (name.length >= 20) {
    return {
      ok: false,
      reason: "이름은 20자 이상 입력할 수 없어요."
    };
  }

  return { ok: true };
}

/** 사용자 나이는 18세 이상 99세 이하의 자연수여야 해요. */
function checkIsAgeValid(age: number): ValidationCheckReturnType {
  if (!Number.isInteger(age)) {
    return {
      ok: false,
      reason: "나이는 정수여야 해요."
    };
  }

  if (age < 18) {
    return {
      ok: false,
      reason: "나이는 18세 이상이어야 해요."
    };
  }

  if (age > 99) {
    return {
      ok: false,
      reason: "나이는 99세 이하이어야 해요."
    };
  }

  return { ok: true };
}
```

- 이제 모든 유효성 검사 함수는 **같은 타입**을 반환합니다:
  - `{ ok: true }` 또는 `{ ok: false; reason: string }`
- 사용하는 쪽에서는 항상 다음과 같은 패턴을 기대할 수 있습니다.

```ts
const nameCheck = checkIsNameValid(name);
if (!nameCheck.ok) {
  showToast("warn", nameCheck.reason);
}
```

그리고 Discriminated Union 덕분에:

```ts
const ageCheck = checkIsAgeValid(age);

if (ageCheck.ok) {
  ageCheck.reason; // 타입 에러: ok가 true일 때는 reason이 없음
} else {
  ageCheck.reason; // ok가 false일 때만 접근 가능
}
```

- 컴파일러가 잘못된 접근을 잡아주어, **잘못된 사용을 예방**할 수 있습니다.

---

## 이 프로젝트에서의 적용 원칙

1. **서버 API Hook**
   - `useXxx` 형태로 React Query 기반 서버 상태를 가져오는 Hook은:
     - 모두 `UseQueryResult<T>` (Query 객체)를 반환하는 것을 기본으로 합니다.
   - 값만 필요한 경우:
     - 사용하는 쪽에서 `const { data } = useXxx()` 로 꺼내 쓰거나,
     - 별도의 `useXxxValue` 같은 “값만 반환하는” 이름의 Hook을 명시적으로 둡니다.

2. **유효성 검사 함수**
   - `checkIsXxxValid`, `validateXxx` 류 함수는:
     - 팀에서 합의한 **공통 반환 타입**(예: `{ ok: true } | { ok: false; reason: string }`)을 사용합니다.
   - boolean 형식만 필요한 경우에도:
     - 공통 타입을 유지하되, 사용하는 쪽에서 `result.ok` 를 쓰는 패턴으로 통일합니다.

3. **같은 prefix/suffix 를 쓰는 함수들은 동일한 계약(contract)을 가진다**
   - 예:
     - `useXxx` (서버 쿼리 Hook) → Query 객체
     - `useXxxValue` → 값만 반환
     - `checkIsXxxValid` → `ValidationCheckReturnType`
   - 이름 패턴이 같다면:
     - 반환 타입과 사용 방법도 **항상 동일**하게 맞춥니다.

4. **리뷰 시 체크 포인트**
   - “이 함수는 **이름이 비슷한 다른 함수들과 반환 타입이 일관적인가?**”
   - “이 Hook을 처음 쓰는 사람이 타입 선언을 보지 않고도, 어느 정도 사용법을 예측할 수 있는가?”

이 원칙을 지키면, 팀원 모두가 **이름 패턴만 보고도 반환 타입과 사용법을 예측**할 수 있고,  
비슷한 역할을 하는 함수/Hook을 실수 없이 재사용할 수 있습니다.


