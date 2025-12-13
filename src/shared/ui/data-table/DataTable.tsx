'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableProps,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactNode } from 'react';
import EmptyState from '../empty-state/EmptyState';

export interface TableColumn<T = any> {
  title: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T = any> extends Omit<TableProps, 'children'> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | number | null;
  mobile?: boolean;
}

export default function DataTable<T = any>({
  columns,
  data,
  emptyMessage,
  getRowKey,
  onRowClick,
  selectedRowKey,
  mobile: mobileProp,
  ...tableProps
}: DataTableProps<T>) {
  const theme = useTheme();
  const mobile = mobileProp ?? useMediaQuery(theme.breakpoints.down('md'));

  const visibleColumns = mobile ? columns.filter((col) => !col.hideOnMobile) : columns;

  if (data.length === 0) {
    return (
      <TableContainer>
        <Table {...tableProps}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell key={col.key} align={col.align || 'left'}>
                  {col.title}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={visibleColumns.length} align="center" sx={{ border: 'none', py: 0 }}>
                <EmptyState message={emptyMessage} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table {...tableProps}>
        <TableHead>
          <TableRow>
            {visibleColumns.map((col) => (
              <TableCell key={col.key} align={col.align || 'left'}>
                {col.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => {
            const rowKey = getRowKey ? getRowKey(row, index) : (row as any).id || index;
            const isSelected = selectedRowKey !== undefined && selectedRowKey === rowKey;

            return (
              <TableRow
                key={rowKey}
                hover={!!onRowClick}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                sx={onRowClick ? { cursor: 'pointer' } : undefined}
                selected={isSelected}
              >
                {visibleColumns.map((col) => {
                  const value = (row as any)[col.key];
                  return (
                    <TableCell key={col.key} align={col.align || 'left'}>
                      {col.render ? col.render(value, row, index) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

