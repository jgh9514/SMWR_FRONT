---
name: "구현 상세 추상화하기"
scope: repo
tags:
  - readability
  - abstraction
  - react
---

## 규칙: 구현 상세를 추상화해서 맥락 수 줄이기

### 왜 필요한가 (가독성)

한 사람이 코드를 읽을 때 **동시에 머리에 올려둘 수 있는 맥락의 수는 제한**되어 있습니다.  
함수나 컴포넌트가 너무 많은 “구체적인 구현 상세”를 한 번에 노출하고 있으면:

- 이 코드가 **무슨 역할을 하는지 파악하기 어렵고**
- “지금 이 부분을 읽을 때 꼭 알아야 하는 정보”와 “당장 몰라도 되는 세부 구현”이 섞여
- 전체를 이해하기 위해 너무 많은 걸 동시에 기억해야 합니다.

따라서, 읽는 사람이 한 번에 고려해야 하는 맥락의 수를 줄이기 위해  
**구현 상세를 적절한 추상화(Wrapper/HOC/전용 컴포넌트/함수)로 감싸는 것**을 원칙으로 합니다.

---

## 코드 예시 1: `LoginStartPage`

### 안티 패턴 예시

```tsx
function LoginStartPage() {
  useCheckLogin({
    onChecked: (status) => {
      if (status === "LOGGED_IN") {
        location.href = "/home";
      }
    }
  });

  /* ... 로그인 관련 로직 ... */

  return <>{/* ... 로그인 관련 컴포넌트 ... */}</>;
}
```

### 문제점 (냄새)

- 로그인 여부를 확인하고, 로그인된 경우 홈으로 이동시키는 로직이 **구체적인 형태로 그대로 노출**되어 있습니다.
  - `useCheckLogin`, `onChecked`, `status`, `"LOGGED_IN"`, `location.href` 등
  - 이 페이지가 **“로그인 여부를 체크해서 이미 로그인된 사용자를 홈으로 보내는 역할”**이라는 의도를 파악하려면,  
    이 모든 디테일을 한 번에 따라가야 합니다.
- 실제 로그인 관련 UI/로직이 이 아래에 이어지면,  
  `LoginStartPage`의 역할을 이해하기 위해 **동시에 고려해야 하는 맥락이 과도하게 많아집니다.**

---

### 개선안 A: Wrapper 컴포넌트로 추상화

```tsx
function App() {
  return (
    <AuthGuard>
      <LoginStartPage />
    </AuthGuard>
  );
}

function AuthGuard({ children }) {
  const status = useCheckLoginStatus();

  useEffect(() => {
    if (status === "LOGGED_IN") {
      location.href = "/home";
    }
  }, [status]);

  return status !== "LOGGED_IN" ? children : null;
}

function LoginStartPage() {
  /* ... 로그인 관련 로직 ... */

  return <>{/* ... 로그인 관련 컴포넌트 ... */}</>;
}
```

- `LoginStartPage`는 이제 **“로그인 페이지 UI/로직”에만 집중**합니다.
- “이미 로그인된 사용자를 홈으로 보낸다”라는 책임은 **`AuthGuard`라는 추상화 이름만 봐도 이해**할 수 있고,
  세부 구현(status, `"LOGGED_IN"`, `location.href`)은 Wrapper 안에 감춰집니다.

---

### 개선안 B: HOC(Higher-Order Component)로 추상화

```tsx
function LoginStartPage() {
  /* ... 로그인 관련 로직 ... */

  return <>{/* ... 로그인 관련 컴포넌트 ... */}</>;
}

export default withAuthGuard(LoginStartPage);

// HOC 정의
function withAuthGuard(WrappedComponent) {
  return function AuthGuard(props) {
    const status = useCheckLoginStatus();

    useEffect(() => {
      if (status === "LOGGED_IN") {
        location.href = "/home";
      }
    }, [status]);

    return status !== "LOGGED_IN" ? <WrappedComponent {...props} /> : null;
  };
}
```

- `withAuthGuard` 라는 이름만으로도 “인증 관련 보호 로직이 감싸고 있다”라는 **의도가 드러납니다.**
- `LoginStartPage`를 읽을 때는 **로그인 화면 자체에만 집중**하면 되고,  
  인증 상태 체크/리다이렉트 구현 세부사항은 필요할 때 `withAuthGuard` 내부로 들어가 보면 됩니다.

---

## 코드 예시 2: `FriendInvitation`

### 안티 패턴 예시

```tsx
function FriendInvitation() {
  const { data } = useQuery(/* 생략.. */);

  // 이외 이 컴포넌트에 필요한 상태 관리, 이벤트 핸들러 및 비동기 작업 로직...

  const handleClick = async () => {
    const canInvite = await overlay.openAsync(({ isOpen, close }) => (
      <ConfirmDialog
        title={`${data.name}님에게 공유해요`}
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => close(false)}>
            닫기
          </ConfirmDialog.CancelButton>
        }
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={() => close(true)}>
            확인
          </ConfirmDialog.ConfirmButton>
        }
        /* 중략 */
      />
    ));

    if (canInvite) {
      await sendPush();
    }
  };

  // 이외 이 컴포넌트에 필요한 상태 관리, 이벤트 핸들러 및 비동기 작업 로직...

  return (
    <>
      <Button onClick={handleClick}>초대하기</Button>
      {/* UI를 위한 JSX 마크업... */}
    </>
  );
}
```

### 문제점 (냄새)

- **가독성**:
  - `FriendInvitation`이 “초대 페이지”라는 큰 책임 외에도
    - 오버레이를 열고
    - ConfirmDialog를 그리고
    - 사용자의 응답을 기다렸다가
    - 조건부로 `sendPush`를 호출하는 상세 구현까지 모두 갖고 있습니다.
  - 이 컴포넌트를 읽는 동안, 초대 UI/페이지 맥락과 confirm/overlay 구현 상세가 **뒤섞여서** 머릿속에 올라옵니다.

- **응집도**:
  - 실제로 동의를 받는 로직(`handleClick`)과 그 로직을 트리거하는 `<Button />` 사이의 **물리적 거리**가 멉니다.
  - 자주 함께 수정되는 코드(버튼 + 클릭 후 로직)가 떨어져 있어, 나중에 변경 시 함께 고치지 못할 위험이 커집니다.

---

### 개선안: 전용 컴포넌트로 추상화 (`<InviteButton />`)

```tsx
export function FriendInvitation() {
  const { data } = useQuery(/* 생략.. */);

  // 이외 이 컴포넌트에 필요한 상태 관리, 이벤트 핸들러 및 비동기 작업 로직...

  return (
    <>
      <InviteButton name={data.name} />
      {/* UI를 위한 JSX 마크업 */}
    </>
  );
}

function InviteButton({ name }) {
  return (
    <Button
      onClick={async () => {
        const canInvite = await overlay.openAsync(({ isOpen, close }) => (
          <ConfirmDialog
            title={`${name}님에게 공유해요`}
            cancelButton={
              <ConfirmDialog.CancelButton onClick={() => close(false)}>
                닫기
              </ConfirmDialog.CancelButton>
            }
            confirmButton={
              <ConfirmDialog.ConfirmButton onClick={() => close(true)}>
                확인
              </ConfirmDialog.ConfirmButton>
            }
            /* 중략 */
          />
        ));

        if (canInvite) {
          await sendPush();
        }
      }}
    >
      초대하기
    </Button>
  );
}
```

- `FriendInvitation`:
  - “초대 페이지 전체 흐름”에만 집중할 수 있습니다.
- `InviteButton`:
  - “사용자에게 동의를 받고, 동의하면 초대를 보내는 버튼”이라는 책임에만 집중합니다.
  - 버튼과 클릭 후 실행되는 로직이 **서로 가까이 있어** 응집도가 높고, 함께 수정하기도 쉽습니다.

---

## 추상화에 대한 메타포 (글 vs 코드)

토스 기술 블로그의 “선언적인 코드 작성하기”에서처럼, 코드를 글에 비유할 수 있습니다.

### 글에서의 추상화

> “왼쪽으로 10걸음 걸어라”

이 문장을 완전히 풀어 쓰면:

- “북쪽을 바라보았을 때 360도를 360등분한 각의 90배만큼 북반구에서 해시계의 바늘이 돌아가는 방향으로 돌아서,
- 동물이 육상에서 다리를 이용해 움직이는 가장 빠른 방법보다 느린, 신체를 한 지점에서 다른 지점으로 옮겨가는 행위를 10번 반복해라”

와 같이 쓸 수도 있지만, 이렇게 하면 **의도가 오히려 보이지 않게** 됩니다.  
적절한 단어(왼쪽, 걸음)를 사용한 추상화가 있기 때문에 문장이 읽기 쉬운 것입니다.

### 코드에서의 추상화

코드도 마찬가지입니다.

- 구현 상세(각도, 방향, 걸음의 정의)를 전부 드러내면:
  - “결국 이 코드가 무슨 역할을 하는지”를 잡기 어렵습니다.
- 적절한 추상화 레벨(예: `moveLeft(10)`, `requireLogin`, `InviteButton`)을 사용하면:
  - 지금 이 부분에서 **어떤 역할을 하는지**를 한눈에 파악할 수 있습니다.

> 한 번에 6~7개 이상의 맥락을 동시에 고려하지 않아도 읽을 수 있도록,  
> “지금 이 위치에서 알아야 할 것”과 “뒤로 감출 수 있는 구현 상세”를 나누어 추상화합니다.

---

## 이 프로젝트에서의 적용 원칙

1. **페이지는 “스토리” 위주로, 구현 상세는 하위로 내리기**
   - 페이지 컴포넌트/주요 컨테이너는
     - “어떤 순서로 어떤 일이 일어나는지(스토리)”를 중심으로 작성합니다.
   - 구체적인 구현(토스트 열기, 모달 열기, 옵션 계산, HTTP 세부 처리 등)은
     - 전용 컴포넌트/훅/유틸 함수로 내리되, **이름만으로 역할이 드러나게** 합니다.

2. **이름이 설명하는 수준까지 추상화**
   - `useCheckLoginStatus` vs `useQuery("/api/login/check", ...)`  
     → 전자가 “무엇을 하는지” 훨씬 잘 설명합니다.
   - `InviteButton` vs `Button` + 멀리 떨어진 `handleClick`  
     → 전자가 “무엇을 위한 버튼인지”를 훨씬 분명하게 보여줍니다.

3. **언제 추상화를 도입할지 기준**
   - 함수/컴포넌트 안에 다음 중 두 개 이상이 같이 보이면 추상화 후보입니다.
     - API 호출 세부 로직
     - UI 컴포넌트 트리
     - 복잡한 조건 분기
     - 모달/토스트/오버레이 세부 구현
   - “읽는 사람이 이 파일에서 꼭 알아야 하나?” 를 스스로 물어보고,
     - “아니오”라면 → 다른 이름 좋은 추상화로 빼서 감춥니다.

4. **추상화를 남용하지 않는 기준**
   - 단 한 번만 쓰이고, 길이도 2~3줄인 단순 로직만을 위해 파일/컴포넌트를 과도하게 쪼개지는 않습니다.
   - “이름이 더 읽기 쉽고, 역할이 더 분명해지는가?”를 기준으로 추상화를 도입합니다.


