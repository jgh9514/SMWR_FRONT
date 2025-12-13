---
name: "책임을 하나씩 관리하기"
scope: repo
tags:
  - coupling
  - hooks
  - single-responsibility
---

## 규칙: 한 함수/Hook은 한 가지 책임만 갖게 하기

### 왜 필요한가 (결합도)

쿼리 파라미터, 상태, API 호출 등 **여러 종류의 로직을 한 함수/Hook에 몰아 넣으면**:

- 이 함수에 의존하는 코드가 점점 늘어나고
- 수정 시 영향을 받는 범위가 과도하게 커지며
- 시간이 지날수록 “건드리기 어려운 덩어리 코드”가 되기 쉽습니다.

> 한 함수/Hook당 책임을 하나로 좁히면,  
> 변경의 영향 범위를 예측하기 쉬운 **낮은 결합도**를 유지할 수 있습니다.

---

## 코드 예시: 페이지 전체 쿼리 상태 관리 Hook

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

- 이 Hook의 책임이 **“페이지에 필요한 모든 쿼리 파라미터를 관리하는 것”** 으로 정의되어 있습니다.
  - 페이지에 새로운 쿼리 파라미터가 추가될 때마다, 자연스럽게 이 Hook에 계속 붙을 가능성이 큽니다.
  - 시간이 지날수록 `usePageState` 는 점점 더 많은 필드/로직을 떠안게 됩니다.
- 페이지 내의 컴포넌트/다른 Hook 들이 이 Hook에 의존하게 되면:
  - 이 Hook을 수정할 때 영향을 받는 범위가 **페이지 전체**로 확대됩니다.
  - 작은 변경에도 예기치 않은 사이드 이펙트가 생기기 쉽습니다.

결과적으로, **결합도가 높은 거대한 Hook** 이 되어 유지보수가 점점 어려워집니다.

---

## 개선안: 책임을 쿼리 파라미터 단위로 분리하기

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

- `usePageState` 가 가지고 있던 여러 책임 중
  - “cardId 쿼리 파라미터 관리” 만 따로 떼낸 Hook입니다.
- 장점:
  - 이 Hook을 수정했을 때 영향을 받는 범위가 **cardId 관련 코드로 한정**됩니다.
  - 다른 쿼리 파라미터(`dateFrom`, `statusList` 등)에 의존하지 않으므로 결합도가 낮습니다.
  - 이름(`useCardIdQueryParam`)만으로도 “무엇을 관리하는지”를 알 수 있습니다.

동일한 패턴으로:

- `useStatementIdQueryParam`
- `useDateFromQueryParam`, `useDateToQueryParam`
- `useStatusListQueryParam`

등으로 책임 단위를 잘게 나눌 수 있습니다.

---

## 이 프로젝트에서의 적용 원칙

1. **“페이지 전역 Hook”에 지나치게 많은 책임을 주지 않기**
   - `usePageState`, `useXxxAllState` 처럼:
     - “이 페이지가 필요로 하는 모든 것”을 관리하는 Hook/함수는 최대한 지양합니다.
   - 이미 존재한다면:
     - 역할/필드 단위로 작은 Hook/함수로 쪼개는 리팩터링을 검토합니다.

2. **책임을 잘게 나눌 때의 기준**
   - “이 값을 수정/검증/조회하는 코드의 변경 범위는 어디까지인가?”
   - “이 로직을 바꿀 때, 정말 이 Hook을 사용하는 **모든 곳**이 영향을 받아야 하는가?”
   - “이 로직을 따로 떼서 썼을 때 더 재사용/이해하기 쉬운가?”

3. **쿼리 파라미터·상태·API 호출은 “역할 단위”로 나누기**
   - 나쁜 기준: “쿼리 파라미터니까 다 한 Hook에서 관리하자”
   - 좋은 기준:
     - “cardId는 cardId만, dateRange는 dateRange만, statusList는 statusList만 관리” 하도록 책임 분리

4. **작은 Hook/함수 여러 개를 조합하는 쪽으로 설계**
   - 상위 Hook/컴포넌트에서는:

```ts
const [cardId, setCardId] = useCardIdQueryParam();
const [statusList, setStatusList] = useStatusListQueryParam();
```

   - 처럼 **여러 작은 책임을 조합**해서 사용합니다.
   - 각 작은 Hook/함수는:
     - 타입/이름/반환값이 단순해지고
     - 재사용성과 테스트 용이성이 높아집니다.

이 원칙을 지키면, 각 Hook/함수는 “한 가지 책임”만 가지게 되고,  
수정 시 영향 범위를 쉽게 예측할 수 있는 **낮은 결합도**를 유지할 수 있습니다.


