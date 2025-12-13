---
name: "상속보다 조합 선호하기"
scope: repo
tags:
  - react
  - composition
  - design-patterns
---

## 규칙: 상속보다 조합(Composition)을 선호하기

### 왜 필요한가 (유연성 + 재사용성)

React에서는 상속보다 조합이 더 유연하고 재사용 가능한 코드를 만듭니다.

- 상속은 부모-자식 관계를 강하게 결합시키고
- 조합은 컴포넌트를 독립적으로 재사용할 수 있게 합니다.

---

## 코드 예시: 상속 vs 조합

### 안티 패턴 예시 (상속 패턴)

```tsx
class BaseButton extends React.Component {
  handleClick = () => {
    // 공통 로직
    this.onClick();
  }

  onClick() {
    // 하위 클래스에서 구현
  }

  render() {
    return <button onClick={this.handleClick}>Base</button>;
  }
}

class SubmitButton extends BaseButton {
  onClick() {
    // Submit 로직
  }
}
```

### 문제점 (냄새)

- React에서는 클래스 컴포넌트보다 함수 컴포넌트를 권장합니다.
- 상속은 컴포넌트 간 결합도를 높입니다.
- 재사용성이 떨어집니다.

---

## 개선안: 조합 패턴 사용

```tsx
function Button({ onClick, children, variant = 'default' }) {
  const handleClick = () => {
    // 공통 로직
    onClick?.();
  };

  return (
    <button onClick={handleClick} className={variant}>
      {children}
    </button>
  );
}

function SubmitButton({ onSubmit }) {
  return (
    <Button onClick={onSubmit} variant="primary">
      Submit
    </Button>
  );
}
```

- `Button` 컴포넌트를 조합하여 `SubmitButton`을 만듭니다.
- 각 컴포넌트가 독립적이고 재사용 가능합니다.

---

## 이 프로젝트에서의 적용 원칙

1. **함수 컴포넌트와 조합 패턴 사용**
   - 클래스 컴포넌트와 상속 대신
   - 함수 컴포넌트와 조합 패턴을 사용합니다.

2. **children prop 활용**
   - 컴포넌트를 조합할 때 `children` prop을 적극 활용합니다.

3. **고차 컴포넌트(HOC)보다 조합**
   - HOC보다는 조합 패턴을 선호합니다.
   - 필요시 Context API를 함께 사용합니다.

4. **컴포넌트를 작고 독립적으로 유지**
   - 작은 컴포넌트를 조합하여 큰 컴포넌트를 만듭니다.
   - 각 컴포넌트는 하나의 책임만 가집니다.

이 원칙을 지키면, **유연하고 재사용 가능한 컴포넌트 구조**를 만들 수 있습니다.

