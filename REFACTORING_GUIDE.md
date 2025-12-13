# 리팩토링 가이드

## 변경 사항

### 1. Axios 기반 API 클라이언트
- 기존 `fetch` 기반 API를 `axios`로 변경
- 위치: `src/lib/axios.ts`
- 인터셉터를 통한 자동 토큰 관리 및 에러 처리

### 2. React Query Hooks 구조
- 위치: `src/hooks/api/`
- `useApiQuery`: Query용 hooks
- `useApiMutation`: Mutation용 hooks
- 도메인별 hooks: `src/hooks/api/preference/`

### 3. API 클라이언트
- 위치: `src/lib/api/client.ts`
- `apiClient.post()`, `apiClient.get()`, `apiClient.put()`, `apiClient.delete()`

## 사용 방법

### Query (데이터 조회)

```typescript
import { useApiGetQuery } from '@/hooks/api';

// GET 요청
const { data, isLoading, error, refetch } = useApiGetQuery<DataType>(
  '/api/endpoint',
  { param1: 'value' },
  { enabled: true } // 옵션
);

// POST 요청 (수동 실행)
const { data, refetch } = useApiPostQuery<DataType>(
  '/api/endpoint',
  { searchData },
  { enabled: false }
);

// refetch() 호출로 실행
```

### Mutation (데이터 변경)

```typescript
import { useApiPostMutation } from '@/hooks/api';

const mutation = useApiPostMutation<ResponseType, RequestType>(
  '/api/endpoint',
  {
    onSuccess: (data) => {
      toast('저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['someKey'] });
    },
    onError: (error) => {
      toast('오류가 발생했습니다.', 'error');
    },
  }
);

// 사용
mutation.mutate({ data: 'value' });
```

### 도메인별 Custom Hooks

```typescript
// src/hooks/api/preference/useCodeGroup.ts 예시
import { useCodeGroupList, useCodeGroupSave } from '@/hooks/api/preference/useCodeGroup';

const { data: codeGroups, refetch } = useCodeGroupList(searchParams);
const saveMutation = useCodeGroupSave();

// 사용
saveMutation.mutate({
  insertRow: [...],
  updateRow: [...],
  deleteRow: [...]
});
```

## 마이그레이션 체크리스트

- [ ] `apiPost` 호출을 `useApiPostMutation` 또는 `useApiPostQuery`로 변경
- [ ] `async/await` 패턴을 React Query hooks로 변경
- [ ] 에러 처리를 `onError` 콜백으로 이동
- [ ] 성공 메시지를 `onSuccess` 콜백으로 이동
- [ ] 타입 정의 추가
- [ ] 불필요한 `useState` 제거 (React Query가 관리)

## 표준 문법 가이드

1. **타입 정의**: 모든 API 응답과 요청에 타입 정의
2. **함수 선언**: `const functionName = () => {}` 형식 사용
3. **비동기 처리**: React Query hooks 사용
4. **에러 처리**: try-catch 대신 React Query의 `onError` 사용
5. **로딩 상태**: React Query의 `isLoading`, `isFetching` 사용

