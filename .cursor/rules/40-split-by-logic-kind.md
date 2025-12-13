---
name: "로직 종류에 따라 합쳐진 함수 쪼개기"
scope: repo
tags:
  - readability
  - hooks
  - separation-of-concerns
---

## 규칙: 로직의 “종류” 기준으로 한 함수/Hook에 몰아넣지 않기

### 왜 필요한가 (가독성 + 성능)

쿼리 파라미터, 상태, API 호출 등 **성격이 비슷해 보이는 로직들을 “한 번에 관리하자”는 생각으로 한 Hook/함수 안에 모두 넣으면**:

- 한 번에 다루는 **맥락의 종류가 많아져서** 이해하기 어렵고,
- 새로운 요구사항이 생길 때마다 같은 함수/Hook에 계속 추가되면서
  - 책임이 무한정 커지고
  - 수정 시 영향을 예측하기 어려워지며
- 성능 측면에서도, 일부 값만 필요해도 **불필요한 리렌더링/재계산**이 발생하기 쉽습니다.

> “종류가 같아 보인다”는 이유만으로 한 곳에 합치기보다,  
> “함께 바뀌는가?”, “같은 맥락인가?”를 기준으로 나누는 것이 좋습니다.

---

## 코드 예시: `usePageState`

### 안티 패턴 예시

```ts
import moment, { Moment } from "moment";
import { useMemo } from "react";
import {
  ArrayParam,
  DateParam,
  NumberParam,
  useQueryParams
} from "use-query-params";

const defaultDateFrom = moment().subtract(3, "month");
const defaultDateTo = moment();

export function usePageState() {
  const [query, setQuery] = useQueryParams({
    cardId: NumberParam,
    statementId: NumberParam,
    dateFrom: DateParam,
    dateTo: DateParam,
    statusList: ArrayParam
  });

  return useMemo(
    () => ({
      values: {
        cardId: query.cardId ?? undefined,
        statementId: query.statementId ?? undefined,
        dateFrom:
          query.dateFrom == null ? defaultDateFrom : moment(query.dateFrom),
        dateTo: query.dateTo == null ? defaultDateTo : moment(query.dateTo),
        statusList: query.statusList as StatementStatusType[] | undefined
      },
      controls: {
        setCardId: (cardId: number) => setQuery({ cardId }, "replaceIn"),
        setStatementId: (statementId: number) =>
          setQuery({ statementId }, "replaceIn"),
        setDateFrom: (date?: Moment) =>
          setQuery({ dateFrom: date?.toDate() }, "replaceIn"),
        setDateTo: (date?: Moment) =>
          setQuery({ dateTo: date?.toDate() }, "replaceIn"),
        setStatusList: (statusList?: StatementStatusType[]) =>
          setQuery({ statusList }, "replaceIn")
      }
    }),
    [query, setQuery]
  );
}
```

### 문제점 (냄새)

#### 1) 가독성

- 이 Hook의 책임이 **“페이지가 필요로 하는 모든 쿼리 파라미터를 관리하는 것”** 으로 정의되어 있습니다.
  - 이렇게 되면, 새 쿼리 파라미터가 추가될 때마다 **무의식적으로 이 Hook에 계속 붙게 됩니다.**
  - 시간이 지날수록 Hook이 담당하는 영역이 넓어지고, 구현이 길어지며,
    - “이 Hook이 정확히 어떤 역할을 하는지”
    - “어디까지 책임지는지”
    를 파악하기 어려워집니다.

#### 2) 성능

- 이 Hook을 사용하는 컴포넌트는, `usePageState`가 관리하는 **어떤 쿼리 파라미터라도 변경되면 리렌더링** 됩니다.
  - 예: 한 컴포넌트에서 `cardId`만 쓰더라도 `dateFrom` / `dateTo`가 바뀌면 함께 리렌더링.
- 좋은 성능을 위해서는, 특정 상태 값이 업데이트되었을 때 **최소한의 부분만 리렌더링**되는 것이 중요합니다.
  - 이 Hook처럼 모든 값을 한 번에 묶으면, 이 원칙을 지키기 어렵습니다.

> 이 예시는 **결합도** 관점에서도 문제를 볼 수 있습니다.  
> 서로 관련성이 낮은 값들이 한 Hook 안에서 강하게 엮여 있기 때문입니다.

---

## 개선 예시: 쿼리 파라미터별 Hook 분리

```ts
import { NumberParam, useQueryParam } from "use-query-params";

export function useCardIdQueryParam() {
  const [cardId, _setCardId] = useQueryParam("cardId", NumberParam);

  const setCardId = useCallback((cardId: number) => {
    _setCardId({ cardId }, "replaceIn");
  }, []);

  return [cardId ?? undefined, setCardId] as const;
}
```

- `usePageState`가 맡고 있던 여러 책임 중 “cardId 쿼리 파라미터 관리”만 따로 뺀 Hook입니다.
- 장점:
  - **역할이 명확한 이름**: `useCardIdQueryParam` 라는 이름만 봐도 무엇을 하는 Hook인지 알 수 있습니다.
  - **변경 영향 범위 축소**:
    - 이 Hook을 수정했을 때 영향을 받는 부분은 **정말 cardId 관련 로직만**입니다.
    - 다른 쿼리 파라미터(`dateFrom`, `statusList` 등)에 영향을 줄 위험이 줄어듭니다.
  - **리렌더링 최소화**:
    - `cardId`를 사용하는 컴포넌트는 `cardId`가 바뀔 때만 리렌더링 됩니다.

동일한 패턴으로:

- `useStatementIdQueryParam`
- `useDateRangeQueryParam` (혹은 `useDateFromQueryParam` / `useDateToQueryParam`)
- `useStatusListQueryParam`

등으로 역할을 나눌 수 있습니다.

---

## 이 프로젝트에서의 적용 원칙

### 1. “페이지 전역 상태” Hook/함수는 최대한 경계 짓기

- `usePageState`, `useXxxAllState` 같은 이름으로 **페이지 전체의 상태/쿼리/필터/정렬 등을 한 번에 관리하는 Hook/함수**를 만들지 않도록 합니다.
  - 이미 존재한다면, 책임/필드 단위로 쪼개는 리팩터링을 우선 검토합니다.
- 대신:
  - 개별 책임/필드 단위 Hook (`useSelectedCategory`, `useSortOrder`, `useFilterQueryParam` 등)
  - 도메인 단위 Hook (`useCart`, `useOrder`, `useCatalogFilters` 등)
  로 나누어, **이름만 봐도 역할이 드러나게** 합니다.

### 2. 리렌더링 범위를 기준으로 나누기

다음과 같이 생각합니다:

- “이 Hook이 관리하는 값 중, **특정 값만 사용하는 컴포넌트**가 있을까?”
  - 있다면 → 그 값은 **별도의 Hook/상태로 분리**하는 후보입니다.
- “이 값을 바꿨을 때, 정말 이 Hook을 쓰는 **모든 컴포넌트가 다시 렌더링되어야 하나?**”
  - 아니라면 → 하나로 묶인 상태/쿼리를 잘게 쪼개야 합니다.

### 3. 로직의 “종류”가 아니라 “함께 바뀌는지”를 기준으로

- 나쁜 기준: “쿼리 파라미터니까, 다 `usePageState` 한 군데에서 관리하자”
- 좋은 기준:
  - “이 값들은 항상 같이 쓰이고, 같이 바뀌는가?”
  - “이 값들의 변경을 관찰해서 동일한 UI/동작을 수행하는가?”

**함께 쓰이고, 함께 변경되는 것들만** 같은 Hook/함수에 두고,  
그렇지 않다면 **분리**하는 것을 기본 원칙으로 삼습니다.

### 4. 이 규칙이 특히 중요한 곳

- 페이지 상단에 있는 “검색/필터/정렬 바”와 관련된 상태/쿼리 파라미터
- 장바구니, 주문, 카탈로그 등 **도메인 상태**를 한 곳에 몰아넣은 커스텀 훅
- `useSomethingState` 처럼 **너무 포괄적인 이름**으로 되어 있는 훅/함수

이런 곳에서 “한 번에 여러 종류의 로직을 다루고 있지 않은지” 확인하고,  

