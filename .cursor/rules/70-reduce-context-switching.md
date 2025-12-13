---
name: "시점 이동 줄이기"
scope: repo
tags:
  - readability
  - refactoring
  - ergonomics
---

## 규칙: 시점 이동(Context Switching)을 최소화하기

### 왜 필요한가 (가독성)

코드를 읽을 때:

- 파일의 위/아래를 계속 왔다 갔다 하거나
- 여러 파일, 함수, 변수를 넘나들며

맥락을 쫓아다녀야 하는 상황을 **시점 이동(Context Switching)** 이라고 합니다.  
시점 이동이 많을수록:

- 동작을 이해하는 데 시간이 오래 걸리고
- 머릿속에 유지해야 하는 정보가 많아져 피로도가 올라가며
- 실수로 맥락을 놓치기 쉬워집니다.

> “위에서 아래로 한 번 읽으면서 동작이 보이도록” 코드를 구성하는 것이 목표입니다.

---

## 코드 예시: 권한별 버튼 제어

### 안티 패턴 예시

```tsx
function Page() {
  const user = useUser();
  const policy = getPolicyByRole(user.role);

  return (
    <div>
      <Button disabled={!policy.canInvite}>Invite</Button>
      <Button disabled={!policy.canView}>View</Button>
    </div>
  );
}

function getPolicyByRole(role) {
  const policy = POLICY_SET[role];

  return {
    canInvite: policy.includes("invite"),
    canView: policy.includes("view")
  };
}

const POLICY_SET = {
  admin: ["invite", "view"],
  viewer: ["view"]
};
```

### 문제점 (냄새)

Invite 버튼이 비활성화되는 이유를 이해하려면:

1. `policy.canInvite` 를 보고
2. `getPolicyByRole(user.role)` 로 올라가고
3. `POLICY_SET` 정의까지 내려가야 합니다.

즉, **최소 3번의 시점 이동**이 필요합니다.  
권한 체계가 매우 복잡하다면 이런 추상화가 유용할 수 있지만,  
지금처럼 간단한 경우에는 오히려:

- 로직이 여러 곳에 흩어져서
- “어떤 역할에게 어떤 버튼이 허용되는지”를 한눈에 보기 어렵게 만듭니다.

---

## 개선안 A: 요구사항을 코드에 그대로 드러내기

권한별 버튼 상태를 **요구사항 그대로** 펼쳐서,  
Page 컴포넌트 안에서만 읽어도 로직이 보이게 만들 수 있습니다.

```tsx
function Page() {
  const user = useUser();

  switch (user.role) {
    case "admin":
      return (
        <div>
          <Button disabled={false}>Invite</Button>
          <Button disabled={false}>View</Button>
        </div>
      );
    case "viewer":
      return (
        <div>
          <Button disabled={true}>Invite</Button>
          <Button disabled={false}>View</Button>
        </div>
      );
    default:
      return null;
  }
}
```

- 이 코드는 **위에서 아래로 한 번만 읽어도**:
  - admin: Invite, View 둘 다 가능
  - viewer: Invite 비활성, View 가능
  라는 요구사항을 바로 파악할 수 있습니다.
- `getPolicyByRole`, `POLICY_SET` 를 찾아갈 필요가 없습니다.

---

## 개선안 B: 한눈에 보이는 정책 객체로 정리하기

로직을 컴포넌트 안의 **정책 객체**로 관리하면,
여러 차례의 시점 이동 없이도 조건을 한눈에 파악할 수 있습니다.

```tsx
function Page() {
  const user = useUser();
  const policy = {
    admin: { canInvite: true, canView: true },
    viewer: { canInvite: false, canView: true }
  }[user.role];

  return (
    <div>
      <Button disabled={!policy.canInvite}>Invite</Button>
      <Button disabled={!policy.canView}>View</Button>
    </div>
  );
}
```

- `policy` 정의와 사용이 **같은 블록 안에** 있어,
  - “어떤 역할에게 어떤 권한이 있는지”
  를 Page 컴포넌트만 읽어도 이해할 수 있습니다.
- 별도 헬퍼 함수나 전역 상수로 눈을 옮길 필요가 없습니다.

---

## 이 프로젝트에서의 적용 원칙

1. **“한 번에 이해해야 하는 로직”은 최대한 가까이 둔다**
   - 컴포넌트에서 사용되는 상수/정책/매핑은
     - 가능하면 같은 파일, 같은 스코프 근처에 둡니다.
   - 권한/상태별 UI 제어 로직은
     - 추상화를 지나치게 쌓기보다, 페이지/컴포넌트 안에서 **위→아래로 읽히도록** 우선 설계합니다.

2. **간단한 요구사항일수록 추상화 계층을 줄인다**
   - 도메인 정책이 단순한데도:
     - 별도 `getXxx`, `POLICY_SET`, “전략 객체” 등으로 과도하게 쪼개져 있다면
     - 오히려 시점 이동만 늘어나게 됩니다.
   - 이럴 땐 요구사항을 거의 그대로 코드로 드러내는 것이 더 읽기 쉽습니다.

3. **“찾아 들어가야 이해되는 코드”를 줄이기**
   - “왜 이 버튼이 비활성화인지”, “왜 이 섹션이 보이는지”를 이해하기 위해
     - 여러 함수/파일을 타고 들어가야 한다면,
     - 조건/정책을 **해당 컴포넌트 근처로 끌어올릴 수 없는지** 검토합니다.

4. **시점 이동이 불가피할 때는 이름으로 보완**
   - 복잡한 정책/전략/룰이 별도 파일로 추출될 정도로 크다면:
     - `getPolicyByRole` 같은 일반적인 이름 대신
       - `getButtonVisibilityPolicyByRole`, `getOrderValidationPolicy` 처럼
       - “무엇을 위한 정책인지”를 이름으로 명확히 합니다.
   - 그래야 파일을 이동하더라도, **이름만 보고도 어느 정도 맥락을 유지**할 수 있습니다.

이 원칙을 지키면, 코드를 읽는 사람은 **한 파일/함수 안에서 최대한 많은 맥락을 해결**할 수 있고,  
필요 시에만 다른 곳으로 시점을 이동하면 되기 때문에 이해 속도와 안정성이 올라갑니다.


