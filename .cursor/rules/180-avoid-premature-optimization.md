---
name: "성급한 최적화 피하기"
scope: repo
tags:
  - performance
  - readability
  - tradeoffs
---

## 규칙: 성급한 최적화를 피하고, 가독성과 유지보수성을 우선하기

### 왜 필요한가 (가독성 + 성능)

코드를 작성할 때 성능 최적화를 너무 일찍 적용하면:

- 코드가 복잡해져서 이해하기 어려워지고
- 실제 성능 문제가 발생하기 전에 불필요한 최적화를 하게 되며
- 유지보수가 어려워집니다.

> "Premature optimization is the root of all evil" - Donald Knuth

---

## 코드 예시: 불필요한 useMemo 사용

### 안티 패턴 예시

```tsx
function ProductList({ products }) {
  const sortedProducts = useMemo(() => {
    return products.sort((a, b) => a.price - b.price);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(p => p.inStock);
  }, [sortedProducts]);

  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 문제점 (냄새)

- `products` 배열이 작고 자주 변경되지 않는데도 `useMemo`를 사용하고 있습니다.
- 실제 성능 문제가 있는지 확인하지 않고 최적화를 적용했습니다.
- 코드가 복잡해져서 읽기 어려워졌습니다.

---

## 개선안: 단순하게 작성하고, 필요할 때만 최적화

```tsx
function ProductList({ products }) {
  const sortedProducts = products.sort((a, b) => a.price - b.price);
  const filteredProducts = sortedProducts.filter(p => p.inStock);

  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- 먼저 **단순하고 읽기 쉬운 코드**를 작성합니다.
- 실제로 성능 문제가 발생하면 그때 최적화를 적용합니다.

---

## 이 프로젝트에서의 적용 원칙

1. **먼저 단순하게 작성하기**
   - `useMemo`, `useCallback`, `React.memo` 등을 사용하기 전에
   - 먼저 **단순한 코드**로 작성하고 동작을 확인합니다.

2. **성능 문제가 실제로 발생했을 때만 최적화**
   - React DevTools Profiler로 성능을 측정하고
   - 실제 병목이 확인된 경우에만 최적화를 적용합니다.

3. **최적화는 가독성을 해치지 않는 범위에서**
   - 최적화로 인해 코드가 복잡해지면
   - 성능 향상과 가독성 저하를 비교하여 결정합니다.

4. **최적화 적용 시 주석으로 이유 명시**
   - 성능 최적화를 적용할 때는
   - 왜 이 최적화가 필요한지 주석으로 설명합니다.

이 원칙을 지키면, **읽기 쉽고 유지보수하기 좋은 코드**를 먼저 작성하고,  
실제 성능 문제가 발생했을 때만 최적화를 적용할 수 있습니다.

