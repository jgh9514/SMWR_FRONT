---
name: "Props Drilling 지우기"
scope: repo
tags:
  - coupling
  - react
  - composition
---

## 규칙: Props Drilling 대신 조합(Composition)과 Context를 적절히 사용하기

### 왜 필요한가 (결합도)

Props Drilling은 **부모에서 깊은 자식까지 같은 prop을 여러 계층에 걸쳐 전달하는 것**을 말합니다.  
이 현상은 곧:

- 부모와 자식 컴포넌트 사이에 **강한 결합도**가 생겼음을 의미하고,
- prop 이름/타입이 바뀌면 이를 사용하는 모든 중간 컴포넌트를 함께 수정해야 하며,
- 사용하지 않는 컴포넌트도 “단지 전달만 하기 위해” prop을 알아야 하는 상황을 만듭니다.

> Props Drilling이 심할수록, 컴포넌트 트리를 이해·수정하기 어려워지고,  
> 불필요한 중간 추상화가 생겨 컴포넌트의 역할과 의도가 흐려집니다.

---

## 코드 예시: `ItemEditModal` 의 Props Drilling

### 안티 패턴 예시

```tsx
function ItemEditModal({ open, items, recommendedItems, onConfirm, onClose }) {
  const [keyword, setKeyword] = useState("");

  // 다른 ItemEditModal 로직 ...

  return (
    <Modal open={open} onClose={onClose}>
      <ItemEditBody
        items={items}
        keyword={keyword}
        onKeywordChange={setKeyword}
        recommendedItems={recommendedItems}
        onConfirm={onConfirm}
        onClose={onClose}
      />
      {/* ... 다른 ItemEditModal 컴포넌트 ... */}
    </Modal>
  );
}

function ItemEditBody({
  keyword,
  onKeywordChange,
  items,
  recommendedItems,
  onConfirm,
  onClose
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
        <Button onClick={onClose}>닫기</Button>
      </div>
      <ItemEditList
        keyword={keyword}
        items={items}
        recommendedItems={recommendedItems}
        onConfirm={onConfirm}
      />
    </>
  );
}
```

### 문제점 (냄새)

- `ItemEditModal` → `ItemEditBody` → `ItemEditList` 로:
  - `keyword`, `onKeywordChange`, `items`, `recommendedItems`, `onConfirm`, `onClose` 등이 계속 전달됩니다.
- 중간 컴포넌트 `ItemEditBody` 는:
  - 일부 값만 실제로 사용하고,
  - 나머지는 단순히 전달만 하는 “파이프 역할”을 하고 있습니다.
- 만약 `recommendedItems` 기능이 사라진다면:
  - 이 prop을 전달하는 **모든 컴포넌트**에서 삭제 작업을 해야 합니다.
- 결과적으로:
  - 불필요하게 많은 컴포넌트가 동일한 prop에 의존하게 되어 결합도가 높아집니다.

---

## 개선안 A: 조합(Composition) 패턴 활용

조합 패턴을 사용하면, 부모에서 필요한 자식을 직접 구성함으로써  
중간 컴포넌트가 “단지 전달만 하기 위한 props”를 알 필요가 없게 만들 수 있습니다.

```tsx
function ItemEditModal({ open, items, recommendedItems, onConfirm, onClose }) {
  const [keyword, setKeyword] = useState("");

  return (
    <Modal open={open} onClose={onClose}>
      <ItemEditBody keyword={keyword} onKeywordChange={setKeyword} onClose={onClose}>
        <ItemEditList
          keyword={keyword}
          items={items}
          recommendedItems={recommendedItems}
          onConfirm={onConfirm}
        />
      </ItemEditBody>
    </Modal>
  );
}

function ItemEditBody({ children, keyword, onKeywordChange, onClose }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
        <Button onClick={onClose}>닫기</Button>
      </div>
      {children}
    </>
  );
}
```

- `ItemEditBody` 는:
  - 자신이 직접 사용하는 props(`keyword`, `onKeywordChange`, `onClose`)만 알고,
  - 리스트 렌더링은 `children` 으로 위임합니다.
- `items`, `recommendedItems`, `onConfirm` 은:
  - 더 이상 `ItemEditBody` 를 거치지 않고
  - 부모에서 직접 `ItemEditList` 에 전달됩니다.

이렇게 하면:

- 중간 컴포넌트의 역할이 **자신의 UI/로직에만 집중**하게 되고,
- 단순히 전달만 하던 props가 줄어들어 결합도가 낮아집니다.

---

## 개선안 B: Context API 활용

조합 패턴으로도 여전히 깊은 트리에서 Props Drilling 이 남아있다면,  
해당 트리 전체에서 자주 쓰이는 값들을 Context 로 승격시킬 수 있습니다.

```tsx
function ItemEditModal({ open, onConfirm, onClose }) {
  const [keyword, setKeyword] = useState("");

  return (
    <Modal open={open} onClose={onClose}>
      <ItemEditBody
        keyword={keyword}
        onKeywordChange={setKeyword}
        onClose={onClose}
      >
        <ItemEditList keyword={keyword} onConfirm={onConfirm} />
      </ItemEditBody>
    </Modal>
  );
}

function ItemEditList({ keyword, onConfirm }) {
  const { items, recommendedItems } = useItemEditModalContext();

  // items, recommendedItems 를 Context 에서 직접 읽어서 사용
  // ...
}
```

- `items`, `recommendedItems` 는 더 이상 props 로 전달되지 않고,
  - `ItemEditModal` 내부 전용 Context (`useItemEditModalContext`) 로 관리됩니다.
- 하위 컴포넌트는:
  - 필요한 값만 Context 에서 직접 구독하면 되고,
  - 중간 컴포넌트는 이 값들을 알 필요가 없습니다.

---

## Context 사용에 대한 주의점

Context API 는 매우 쉽게 Props Drilling 을 없앨 수 있지만,

- **모든 Drilling 되는 값을 Context 로 올릴 필요는 없습니다.**
  - 컴포넌트의 역할과 의도를 드러내는 props (예: `onConfirm`, `variant`, `size`) 는
    - 그대로 props 로 두는 것이 더 읽기 쉬운 경우가 많습니다.
  - “단지 다른 곳으로 전달하기 위한 값”으로만 쓰이고,
    - 해당 컴포넌트의 역할을 설명하지 못하는 props 라면
    - 조합/Context 를 고려할 만합니다.

권장 순서:

1. **먼저 children을 활용한 조합 패턴으로 depth 줄이기**
2. 그래도 여전히 깊고 복잡한 Drilling 이 남아 있다면,
   - 그때 **최후의 수단으로 Context API** 를 도입하기

---

## 이 프로젝트에서의 적용 원칙

1. **중간 컴포넌트가 “단지 전달만 하는 props”를 가지고 있는지 항상 확인**
   - 그 props 를 실제로 사용하지 않고 아래로 넘기기만 한다면:
     - 조합 패턴으로 구조를 다시 짤 수 있는지 먼저 검토합니다.

2. **컴포넌트의 역할/의도를 드러내는 props 는 그대로 유지**
   - 예: `onConfirm`, `title`, `variant`, `size` 등
   - 이런 props 는 컴포넌트가 무엇을 하는지 설명하므로,
     - 무조건 Context 로 옮기지 않습니다.

3. **여러 단계에서 동일한 데이터가 필요하면, 도메인 전용 Context 고려**
   - 예: “장바구니 편집 모달”, “주문 요약 패널” 처럼
     - 특정 영역에서만 공유되는 상태는
     - 해당 영역 전용 Context 로 관리합니다.

4. **Props Drilling 제거의 목표는 “depth 줄이기 + 역할 명확화”**
   - 단순히 Drilling 을 없애는 것 자체가 목표가 아니라,
   - 불필요한 중간 추상화를 줄이고,
   - 각 컴포넌트가 **자기 역할에만 집중**하도록 만드는 것이 목표입니다.

이 원칙을 지키면, 컴포넌트 트리가 더 얕고 명확해지고,  
각 컴포넌트가 어떤 데이터를 왜 사용하는지 이해하기 쉬워져 유지보수성이 높아집니다.


