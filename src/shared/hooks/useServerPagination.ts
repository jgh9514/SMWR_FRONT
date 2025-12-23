'use client';

import { useState, useCallback } from 'react';

interface UseServerPaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
}

interface UseServerPaginationReturn {
  currentPage: number;
  itemsPerPage: number;
  setPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;
  paginationParams: {
    paging: number;
    offset: number;
  };
}

/**
 * 서버 사이드 페이지네이션 훅
 * @param options - 페이지네이션 옵션
 */
export function useServerPagination(
  options: UseServerPaginationOptions = {},
): UseServerPaginationReturn {
  const {
    initialPage = 1,
    itemsPerPage: initialItemsPerPage = 10,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const setPage = useCallback((page: number) => {
    if (page >= 1) {
      setCurrentPage(page);
    }
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    // totalItems가 있으면 계산, 없으면 현재 페이지 유지
    if (options.totalItems) {
      const totalPages = Math.ceil(options.totalItems / itemsPerPage);
      setCurrentPage(totalPages);
    }
  }, [options.totalItems, itemsPerPage]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  const handleSetItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로 이동
  }, []);

  const paginationParams = {
    paging: itemsPerPage,
    offset: currentPage,
  };

  return {
    currentPage,
    itemsPerPage,
    setPage,
    setItemsPerPage: handleSetItemsPerPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    reset,
    paginationParams,
  };
}

