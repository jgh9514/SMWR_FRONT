---
name: "복잡한 조건에 이름 붙이기"
scope: repo
tags:
  - readability
  - refactoring
  - conditions
---

## 규칙: 복잡한 조건식에는 의미 있는 이름을 붙인다

### 왜 필요한가 (가독성)

조건식이 길고 중첩이 많을수록, 코드를 읽는 사람이:

- `&&`, `||`, `!` 연산자와
- 여러 단계의 `filter`, `some`, `every` 같은 콜백

을 동시에 따라가야 해서 **조건이 무엇을 의미하는지 직관적으로 이해하기 어렵습니다.**  
복잡한 조건에 **의도를 드러내는 이름**을 붙이면, 코드의 목적을 한눈에 파악할 수 있고  
“세부 구현”은 필요할 때만 내려가서 읽으면 되므로 가독성이 크게 좋아집니다.

---

## 코드 예시: 상품 필터링

### 안티 패턴 예시

```ts
const result = products.filter((product) =>
  product.categories.some(
    (category) =>
      category.id === targetCategory.id &&
      product.prices.some((price) => price >= minPrice && price <= maxPrice)
  )
);
```

### 문제점 (냄새)

- `filter` / `some` / `&&` / 중첩된 콜백이 한 번에 얽혀 있어서,
  - “같은 카테고리인지”
  - “가격이 범위 안인지”
  - “카테고리/가격 조건이 동시에 만족해야 하는지”
  를 **읽는 사람이 직접 추적해 해석해야** 합니다.
- 조건이 “무엇을 의미하는지”보다 “어떻게 계산하는지”가 더 먼저 눈에 들어와서, 의도를 파악하기 어렵습니다.

---

### 개선안: 조건에 이름 붙이기

```ts
const matchedProducts = products.filter((product) => {
  return product.categories.some((category) => {
    const isSameCategory = category.id === targetCategory.id;
    const isPriceInRange = product.prices.some(
      (price) => price >= minPrice && price <= maxPrice
    );

    return isSameCategory && isPriceInRange;
  });
});
```

- `isSameCategory`, `isPriceInRange` 라는 이름만으로도
  - “같은 카테고리”
  - “가격이 범위 안에 있음”
  이라는 **의도**를 바로 이해할 수 있습니다.
- 이제 이 코드를 읽을 때는
  - “카테고리가 같고”
  - “가격이 범위 안에 있는 상품만 필터링한다”
  는 **문장 수준의 의미**만 기억하면 되고, 실제 비교식은 필요할 때만 내려가서 보면 됩니다.

---

## 조건식에 이름을 붙일지 결정하는 기준

### 이름을 붙이는 것이 좋은 경우

1. **복잡한 로직을 다룰 때**
   - 조건문/함수 안에서 여러 줄에 걸쳐 복잡한 로직이 처리될 때
   - 예: 여러 컬렉션 연산(`filter`, `map`, `some`)과 논리 연산자가 중첩된 경우
   - → 의도를 설명하는 이름(예: `isEligibleForDiscount`, `isValidOrderAmount`)을 붙여 별도 변수/함수로 분리합니다.

2. **재사용 가능성이 있을 때**
   - 동일하거나 유사한 조건이 여러 곳에서 반복될 가능성이 있을 때
   - → 변수나 헬퍼 함수로 추출해 재사용하면, 코드 중복이 줄고 유지보수가 쉬워집니다.

3. **단위 테스트가 필요할 때**
   - 특정 조건이 비즈니스적으로 중요한 규칙일 때 (예: “무료 배송 조건”, “취소 가능 여부”)
   - → 별도 함수로 분리하면, 해당 조건만 독립적으로 단위 테스트를 작성할 수 있습니다.

### 이름을 붙이지 않아도 괜찮은 경우

1. **로직이 매우 간단할 때**

```ts
const doubled = arr.map((x) => x * 2);
```

- 이 정도의 단순한 연산은 이름을 추가로 붙이는 것보다,  
  **한 줄로 읽는 편이 더 직관적**일 수 있습니다.

2. **한 번만 쓰이고, 복잡하지 않을 때**

```ts
const hasItems = items.length > 0;
```

- 이미 충분히 짧고 명확한 경우, 추가로 함수를 만드는 것이 오히려 과도한 추상화가 될 수 있습니다.

---

## 이 프로젝트에서의 적용 원칙

1. **조건이 한 줄을 넘기고, 연산자가 2개 이상이면 이름 붙이기 검토**
   - 예: `if (a && b && c)` / `if (!a || (b && c))` / 중첩된 `filter/some/every`
   - → 의미 단위로 잘라 `const isXxx = ...` 또는 `function isXxx(...)` 형태로 분리합니다.

2. **비즈니스 규칙에는 항상 이름을 준다**
   - “무료 배송 여부”, “주문 가능 여부”, “옵션 선택이 유효한지” 등 도메인 규칙은
     - `isFreeShipping(order)`, `canPlaceOrder(order)`, `isValidOptions(selection)` 처럼
     - **도메인 용어가 녹아 있는 이름**을 가진 함수/변수로 감쌉니다.

3. **페이지/컴포넌트에서는 ‘조건식’보다 ‘이름’이 먼저 보이게**
   - JSX 안에서:

```tsx
if (shouldShowEmptyState) {
  return <EmptyState />;
}
```

   - 처럼 “왜 이 UI를 보여주는지”를 조건 이름으로 드러내고,  
     `shouldShowEmptyState` 내부의 구체 조건은 별도 로직으로 분리합니다.

4. **중복 조건은 반드시 공통 함수/변수로 추출**
   - 같은 조건식이 여러 파일/컴포넌트에 반복된다면
     - 공통 유틸/도메인 헬퍼로 뽑아서 **단일 소스**로 관리합니다.

이 원칙을 지키면, 조건식을 읽는 사람은 **“무슨 조건인지(의도)”만 기억하면 되고**,  
실제 “어떻게 계산하는지(구현)”는 필요할 때만 파고들면 되기 때문에, 전체 코드의 가독성이 크게 향상됩니다.


