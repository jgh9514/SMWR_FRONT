---
name: "폼의 응집도 생각하기"
scope: repo
tags:
  - cohesion
  - forms
  - validation
---

## 규칙: 폼의 응집도를 필드 단위 vs 폼 전체 단위로 의식적으로 선택하기

### 왜 필요한가 (응집도)

프론트엔드 개발에서는 Form으로 사용자 입력을 받는 경우가 매우 많습니다.  
이때:

- 모든 필드를 하나의 거대한 로직으로 관리하거나
- 반대로, 필요한 응집도 없이 여기저기 흩어진 검증/상태를 갖게 되면

폼을 이해하고 수정하는 것이 점점 어려워집니다.

> 폼을 설계할 때 “변경의 단위가 필드 단위인지, 폼 전체 단위인지”를 먼저 생각하고,  
> 그에 맞게 **필드 단위 응집** 또는 **폼 전체 단위 응집**을 의도적으로 선택해야 합니다.

---

## 1. 필드 단위 응집도

### 개념

필드 단위 응집은 **각 입력 요소(필드)를 독립적으로 관리**하는 방식입니다.

- 각 필드가 고유의 검증 로직과 상태를 가짐
- 필드별 변경이 다른 필드에 거의 영향을 주지 않음
- 특정 필드만 유지보수/재사용하기 쉬움

### 코드 예시 (필드 단위 응집)

```tsx
import { useForm } from "react-hook-form";

export function Form() {
  const {
    register,
    formState: { errors },
    handleSubmit
  } = useForm({
    defaultValues: {
      name: "",
      email: ""
    }
  });

  const onSubmit = handleSubmit((formData) => {
    // 폼 데이터 제출 로직
    console.log("Form submitted:", formData);
  });

  return (
    <form onSubmit={onSubmit}>
      <div>
        <input
          {...register("name", {
            validate: (value) =>
              isEmptyStringOrNil(value) ? "이름을 입력해주세요." : ""
          })}
          placeholder="이름"
        />
        {errors.name && <p>{errors.name.message}</p>}
      </div>

      <div>
        <input
          {...register("email", {
            validate: (value) => {
              if (isEmptyStringOrNil(value)) {
                return "이메일을 입력해주세요.";
              }

              if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                return "유효한 이메일 주소를 입력해주세요.";
              }

              return "";
            }
          })}
          placeholder="이메일"
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <button type="submit">제출</button>
    </form>
  );
}

function isNil(value: unknown): value is null | undefined {
  return value == null;
}

type NullableString = string | null | undefined;

function isEmptyStringOrNil(value: NullableString): boolean {
  return isNil(value) || value.trim() === "";
}
```

### 언제 필드 단위 응집을 선택하면 좋은가?

- **독립적인 검증이 필요할 때**
  - 이메일 형식 검사, 전화번호 유효성 검증, 아이디 중복 확인, 추천 코드 유효성 확인 등
  - 각 필드가 복잡한 검증 로직(비동기 포함)을 개별적으로 가질 때

- **재사용이 필요할 때**
  - 같은 “이메일 입력 + 검증” 필드를 여러 폼에서 재사용하고 싶을 때
  - 공통 입력 필드를 독립된 컴포넌트/Hook으로 쪼개어 재사용하는 경우

---

## 2. 폼 전체 단위 응집도

### 개념

폼 전체 응집은 **모든 필드의 검증 로직이 폼 전체에 종속**되는 방식입니다.

- 폼 전체의 흐름/규칙을 한 곳에서 관리
- 필드 간 의존성이 강한 경우 유리
- 변경 단위가 “폼 전체”일 때 적합

### 코드 예시 (폼 전체 응집)

```tsx
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("유효한 이메일 주소를 입력해주세요.")
});

export function Form() {
  const {
    register,
    formState: { errors },
    handleSubmit
  } = useForm({
    defaultValues: {
      name: "",
      email: ""
    },
    resolver: zodResolver(schema)
  });

  const onSubmit = handleSubmit((formData) => {
    // 폼 데이터 제출 로직
    console.log("Form submitted:", formData);
  });

  return (
    <form onSubmit={onSubmit}>
      <div>
        <input {...register("name")} placeholder="이름" />
        {errors.name && <p>{errors.name.message}</p>}
      </div>

      <div>
        <input {...register("email")} placeholder="이메일" />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <button type="submit">제출</button>
    </form>
  );
}
```

### 언제 폼 전체 단위 응집을 선택하면 좋은가?

- **단일 기능을 나타낼 때**
  - 결제 정보, 배송 정보처럼 모든 필드가 하나의 완결된 비즈니스 로직을 구성하는 경우
  - “이 폼 = 하나의 기능/도메인” 인 상황

- **단계별 입력이 필요할 때 (Wizard Form)**
  - 회원가입, 설문조사 등 단계별로 진행되는 폼
  - 이전 단계 입력값이 다음 단계의 유효성/옵션에 영향을 주는 경우

- **필드 간 의존성이 있을 때**
  - 비밀번호/비밀번호 확인, 시작일/종료일, 합계/할인/최종 금액 등
  - 여러 필드가 서로를 참조하거나 함께 유효해야 하는 경우

폼 전체 단위 응집을 선택하면:

- 폼 전체의 검증 흐름을 한 곳에서 관리할 수 있어 간결해지고
- 상태가 중앙 집중적으로 관리되어 폼 전체를 이해하기 쉬운 대신,
- 필드별 재사용성은 떨어질 수 있습니다.

---

## 3. 필드 단위 vs 폼 전체 단위 응집도 선택 기준

### 필드 단위 응집이 더 적합한 경우

- 검증/상태 변경의 단위가 **필드 단위**일 때
- 필드별 고유 검증이 많고, 서로 간 의존성이 낮을 때
- 같은 필드를 여러 폼에서 재사용하고 싶을 때

### 폼 전체 단위 응집이 더 적합한 경우

- 검증/상태 변경의 단위가 **폼 전체 단위**일 때
- 필드 간 의존성이 높고, “이 폼 자체가 하나의 기능”일 때
- 단계별 입력/복잡한 흐름이 있는 폼일 때

---

## 이 프로젝트에서의 적용 원칙

1. **폼을 설계할 때 먼저 “변경 단위”를 생각하기**
   - “이 폼은 나중에 필드를 각각 따로 바꿀 가능성이 큰가?”
     - → 그렇다면 **필드 단위 응집**을 우선 고려
   - “이 폼은 도메인 비즈니스 규칙이 자주 바뀌고, 항상 폼 전체로 생각해야 하는가?”
     - → 그렇다면 **폼 전체 단위 응집**을 우선 고려

2. **혼합 사용도 가능하지만, 의도를 명확히**
   - 일부 필드는 재사용 가능한 필드 컴포넌트/Hook(필드 단위 응집)을 사용하고,
   - 폼 전체의 스키마/흐름은 zod/yup 등으로 중앙에서 관리(폼 전체 응집)하는 **혼합 전략**도 유효합니다.
   - 이 경우 “어디까지가 필드 책임이고, 어디부터가 폼 책임인지”를 팀에서 합의합니다.

3. **복잡해지면 스키마 기반 검증을 우선 검토**
   - 필드 간 의존성이 늘어나고, 비즈니스 규칙이 복잡해질수록:
     - 필드별 inline 검증보다 zod/yup 같은 **스키마 기반 폼 전체 검증**을 도입하는 것이 유지보수에 유리합니다.

이 원칙을 지키면, 폼 관련 코드를 볼 때 “어디가 변경 단위인지, 어떤 수준에서 응집되어 있는지”를 쉽게 이해할 수 있고,  
필드/폼 단위 변경이 필요할 때 적절한 수준에서 안전하게 리팩터링할 수 있습니다.


