'use client';

import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_ITEMS_PER_PAGE } from '@/shared/constants';

interface UsePaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  paginatedData: T[];
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

/**
 * 페이지네이션 훅
 * @param data - 페이지네이션할 데이터 배열
 * @param options - 페이지네이션 옵션
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {},
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
    totalItems = data.length,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / itemsPerPage);
  }, [totalItems, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }, [data, currentPage, itemsPerPage]);

  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage(currentPage + 1);
  }, [currentPage, setPage]);

  const prevPage = useCallback(() => {
    setPage(currentPage - 1);
  }, [currentPage, setPage]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const goToLastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages, setPage]);

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedData,
    setPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
  };
}

