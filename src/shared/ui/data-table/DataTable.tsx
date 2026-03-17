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

type TableRowData = object;
type TableColumnKey<T extends TableRowData> = Extract<keyof T, string>;

export interface TableColumn<T extends TableRowData = TableRowData> {
  title: string;
  key: TableColumnKey<T>;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[TableColumnKey<T>], row: T, index: number) => ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T extends TableRowData = TableRowData> extends Omit<TableProps, 'children'> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | number | null;
  mobile?: boolean;
}

export default function DataTable<T extends TableRowData = TableRowData>({
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
  const responsiveMobile = useMediaQuery(theme.breakpoints.down('md'));
  const mobile = mobileProp ?? responsiveMobile;

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
            const rawRowKey =
              getRowKey?.(row, index) ??
              ('id' in row && row.id != null ? row.id : index);
            const rowKey =
              typeof rawRowKey === 'string' || typeof rawRowKey === 'number'
                ? rawRowKey
                : index;
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
                  const value = row[col.key];
                  return (
                    <TableCell key={col.key} align={col.align || 'left'}>
                      {col.render ? col.render(value, row, index) : (value as ReactNode)}
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

