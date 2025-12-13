---
name: "동시에 실행되지 않는 코드 분리하기"
scope: repo
tags:
  - readability
  - react
  - components
---

## 규칙: 동시에 실행되지 않는 코드 분리하기

### 왜 필요한가 (가독성)

동시에 실행될 수 없는 코드(서로 배타적인 상태나 역할)가 **하나의 함수/컴포넌트 안에 섞여 있으면**:

- 구현부에 분기가 많이 생겨서, 어떤 역할을 하는지 한눈에 파악하기 어렵다.
- 코드를 읽는 사람이 한 번에 고려해야 하는 맥락(케이스)이 많아져서 피로도가 높아진다.

> 이 규칙의 목표는 “한 컴포넌트/함수는 가능한 한 **하나의 맥락**만 책임지게” 만드는 것이다.

---

## 안티 패턴 예시

다음 `SubmitButton` 컴포넌트는 사용자의 권한에 따라 동작이 다릅니다.

- 사용자가 보기 전용 권한(`"viewer"`)이면:
  - 버튼이 비활성화되고
  - 애니메이션이 재생되지 않습니다.
- 일반 사용자이면:
  - 버튼을 사용할 수 있고
  - 애니메이션도 재생됩니다.

```tsx
function SubmitButton() {
  const isViewer = useRole() === "viewer";

  useEffect(() => {
    if (isViewer) {
      return;
    }
    showButtonAnimation();
  }, [isViewer]);

  return isViewer ? (
    <TextButton disabled>Submit</TextButton>
  ) : (
    <Button type="submit">Submit</Button>
  );
}
```

이 코드는 하나의 컴포넌트 안에서 **두 가지 권한 상태(viewer / 일반 사용자)**를 모두 처리하고 있기 때문에:

- `useEffect` 안에서도 권한별 분기
- JSX `return` 부에서도 권한별 분기

가 교차되어 있어, 동시에 실행되지 않는 코드가 한 함수 안에 섞여 있습니다.  
읽는 사람 입장에서는 “viewer일 때”와 “viewer가 아닐 때”를 계속 오가며 머릿속으로 시뮬레이션해야 해서 가독성이 떨어집니다.

---

## 권장 패턴 예시 (개선안)

동일한 동작을 **역할별 전용 컴포넌트**로 분리하면 더 읽기 쉬워집니다.

```tsx
function SubmitButton() {
  const isViewer = useRole() === "viewer";

  return isViewer ? <ViewerSubmitButton /> : <AdminSubmitButton />;
}

function ViewerSubmitButton() {
  return <TextButton disabled>Submit</TextButton>;
}

function AdminSubmitButton() {
  useEffect(() => {
    showButtonAnimation();
  }, []);

  return <Button type="submit">Submit</Button>;
}
```

이렇게 분리하면:

- 상위 `SubmitButton`은 “viewer인가?” 라는 **단일 분기만** 관리합니다.
- `ViewerSubmitButton`은 “viewer일 때”만,  
  `AdminSubmitButton`은 “viewer가 아닐 때(관리자/일반 사용자)”만 다룹니다.

즉, 각 컴포넌트에서 한 번에 고려해야 할 맥락이 줄어들어 **가독성이 크게 향상**됩니다.

---

## 이 프로젝트에서의 적용 원칙

### 1. 상위는 “분기만”, 하위는 “구체 동작/뷰”만

- 페이지/컨테이너 컴포넌트(또는 상위 훅)는 **어떤 상태/결과인지 판단하는 분기만 담당**합니다.
- 실제 UI 렌더링이나 부수 효과(애니메이션, Toast, 네비게이션 등)는 **상태별 전용 컴포넌트/함수에서 처리**합니다.

예시(프로젝트 내 패턴):

- `OrderCompletePage`  
  - 상위: `isError` 여부만 보고 `OrderNotFoundView` / `OrderCompleteView` 중 하나를 선택
  - 하위: 각자 “에러 화면” / “성공 화면”만 책임

- `CartPage`  
  - 상위: 장바구니가 비었는지(`hasItems`)만 판단
  - 하위: `CartFilledSection` / `CartEmptySection` 으로 상태별 전용 UI 분리

### 2. 분리 기준 (이런 경우 반드시 쪼개기)

다음에 해당하면 “동시에 실행되지 않는 코드가 섞여 있다”고 보고 **전용 컴포넌트/함수로 분리**합니다.

- 하나의 컴포넌트/함수 안에:
  - **성공/실패/빈 상태** UI가 섞여 있는 경우
  - **권한별(viewer/admin 등)** UI를 동시에 처리하는 경우
  - **로드 중/완료/에러** 상태를 모두 복잡한 분기로 처리하는 경우
- `if / else`, 삼항(`condition ? A : B`) 안의 JSX 블록 길이가 길거나,  
  `useEffect` 안에서 상태별 `if (...) return` 분기가 여러 개 있는 경우

### 3. 분리하지 않아도 되는(과하지 않게 적용하는) 경우

다음은 규칙을 “참고”만 하고, 굳이 분리하지 않아도 되는 경우입니다.

- 텍스트 한 줄/표현만 다른 아주 작은 삼항:
  - 예: `title = isError ? "에러" : "정상";`
- UI가 아니라, **단순한 값 선택** (숫자/문자열 리터럴) 수준의 분기:
  - 예: `const color = isActive ? colors.blue500 : colors.grey500;`

이 경우까지 모두 전용 컴포넌트로 쪼개면 오히려 코드가 분산되어 읽기 힘들어질 수 있으므로,  
“**맥락이 다른 두 개 이상의 UI/로직 덩어리**가 한 함수 안에 섞여 있는지”를 기준으로 판단합니다.

---

## 요약 체크리스트

새 코드를 작성하거나 리팩터링할 때, 다음을 스스로 물어봅니다:

1. 이 함수/컴포넌트 안에 **서로 동시에 실행될 수 없는 케이스(역할/상태/결과)** 가 둘 이상 섞여 있지 않은가?
2. 성공/실패, 권한별, 로딩/완료 등 **완전히 다른 화면/동작**이 한 곳에서 처리되고 있지 않은가?
3. 상위는 “분기”만, 하위는 “구체 UI/로직”만 담당하도록 쪼갤 수 없는가?

“예”라고 느껴지면 → 이 규칙을 적용해서 **전용 컴포넌트/함수로 분리**합니다.


