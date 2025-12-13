'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { PageBanner, PageHeader } from '@/shared/ui';
import { useDbTables, useEntityTables, useDdlComparison } from '@/features/admin/hooks';
import type { TableInfo, DifferenceInfo } from '@/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ddl-tabpanel-${index}`}
      aria-labelledby={`ddl-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DdlComparisonPage() {
  const [tabValue, setTabValue] = useState(0);
  const [schema, setSchema] = useState('public');
  const [inputSchema, setInputSchema] = useState('public');

  // API 호출
  const { 
    data: dbData, 
    isLoading: isLoadingDb, 
    error: dbError,
    refetch: refetchDb 
  } = useDbTables(schema);

  const { 
    data: entityData, 
    isLoading: isLoadingEntity, 
    error: entityError,
    refetch: refetchEntity 
  } = useEntityTables();

  const { 
    data: comparisonData, 
    isLoading: isLoadingComparison, 
    error: comparisonError,
    refetch: refetchComparison 
  } = useDdlComparison(schema);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSchemaChange = () => {
    setSchema(inputSchema);
  };

  const handleRefresh = () => {
    if (tabValue === 0) {
      refetchDb();
    } else if (tabValue === 1) {
      refetchEntity();
    } else {
      refetchComparison();
    }
  };

  // 차이점을 타입별로 그룹화
  const groupedDifferences = useMemo(() => {
    if (!comparisonData?.differences) return {};

    const groups: Record<string, DifferenceInfo[]> = {
      missing_in_db: [],
      missing_in_entity: [],
      column_mismatch: [],
      type_mismatch: [],
    };

    comparisonData.differences.forEach((diff) => {
      groups[diff.type].push(diff);
    });

    return groups;
  }, [comparisonData]);

  // 테이블 렌더링 컴포넌트
  const renderTableInfo = (table: TableInfo) => (
    <Accordion key={table.tableName}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography sx={{ fontWeight: 600 }}>{table.tableName}</Typography>
          {table.comment && (
            <Typography variant="body2" color="text.secondary">
              {table.comment}
            </Typography>
          )}
          <Chip 
            label={`${table.columns.length} 컬럼`} 
            size="small" 
            sx={{ ml: 'auto' }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>컬럼명</TableCell>
                <TableCell>데이터 타입</TableCell>
                <TableCell>Nullable</TableCell>
                <TableCell>기본값</TableCell>
                <TableCell>설명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {table.columns.map((column) => (
                <TableRow key={column.columnName}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {column.columnName}
                      {column.isPrimaryKey && (
                        <Chip label="PK" size="small" color="primary" />
                      )}
                      {column.isForeignKey && (
                        <Chip label="FK" size="small" color="secondary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{column.dataType}</TableCell>
                  <TableCell>
                    {column.nullable ? (
                      <Chip label="Yes" size="small" color="success" />
                    ) : (
                      <Chip label="No" size="small" color="error" />
                    )}
                  </TableCell>
                  <TableCell>{column.defaultValue || '-'}</TableCell>
                  <TableCell>{column.comment || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );

  // 차이점 렌더링
  const renderDifferences = (type: string, differences: DifferenceInfo[]) => {
    if (differences.length === 0) return null;

    const typeConfig = {
      missing_in_db: {
        icon: <ErrorIcon color="error" />,
        title: 'DB에 없는 테이블',
        color: 'error' as const,
      },
      missing_in_entity: {
        icon: <WarningIcon color="warning" />,
        title: 'Entity에 없는 테이블',
        color: 'warning' as const,
      },
      column_mismatch: {
        icon: <WarningIcon color="warning" />,
        title: '컬럼 불일치',
        color: 'warning' as const,
      },
      type_mismatch: {
        icon: <ErrorIcon color="error" />,
        title: '타입 불일치',
        color: 'error' as const,
      },
    };

    const config = typeConfig[type as keyof typeof typeConfig];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {config.icon}
            <Typography variant="h6">{config.title}</Typography>
            <Chip label={differences.length} color={config.color} size="small" />
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>테이블</TableCell>
                  <TableCell>컬럼</TableCell>
                  <TableCell>DB 값</TableCell>
                  <TableCell>Entity 값</TableCell>
                  <TableCell>설명</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {differences.map((diff, index) => (
                  <TableRow key={index}>
                    <TableCell>{diff.tableName}</TableCell>
                    <TableCell>{diff.columnName || '-'}</TableCell>
                    <TableCell>{diff.dbValue || '-'}</TableCell>
                    <TableCell>{diff.entityValue || '-'}</TableCell>
                    <TableCell>{diff.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageBanner />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <PageHeader title="DDL 비교 도구" />

        {/* 스키마 설정 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="스키마"
                value={inputSchema}
                onChange={(e) => setInputSchema(e.target.value)}
                size="small"
                sx={{ width: 200 }}
              />
              <Button
                variant="contained"
                onClick={handleSchemaChange}
                disabled={isLoadingDb || isLoadingEntity || isLoadingComparison}
              >
                적용
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={isLoadingDb || isLoadingEntity || isLoadingComparison}
              >
                새로고침
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 탭 */}
        <Card>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="DDL 비교 탭"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<StorageIcon />} 
              iconPosition="start" 
              label="DB 테이블" 
            />
            <Tab 
              icon={<CodeIcon />} 
              iconPosition="start" 
              label="Entity 테이블" 
            />
            <Tab 
              icon={<CompareArrowsIcon />} 
              iconPosition="start" 
              label="비교 결과" 
            />
          </Tabs>

          {/* DB 테이블 탭 */}
          <TabPanel value={tabValue} index={0}>
            {isLoadingDb ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : dbError ? (
              <Alert severity="error">
                DB 테이블 정보를 불러올 수 없습니다: {(dbError as Error).message}
              </Alert>
            ) : dbData ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    스키마: <strong>{dbData.schema}</strong> | 
                    총 테이블 수: <strong>{dbData.totalCount}</strong>
                  </Typography>
                </Box>
                {dbData.tables.map((table) => renderTableInfo(table))}
              </>
            ) : null}
          </TabPanel>

          {/* Entity 테이블 탭 */}
          <TabPanel value={tabValue} index={1}>
            {isLoadingEntity ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : entityError ? (
              <Alert severity="error">
                Entity 테이블 정보를 불러올 수 없습니다: {(entityError as Error).message}
              </Alert>
            ) : entityData ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    총 Entity 수: <strong>{entityData.totalCount}</strong>
                  </Typography>
                </Box>
                {entityData.entities.map((table) => renderTableInfo(table))}
              </>
            ) : null}
          </TabPanel>

          {/* 비교 결과 탭 */}
          <TabPanel value={tabValue} index={2}>
            {isLoadingComparison ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : comparisonError ? (
              <Alert severity="error">
                비교 결과를 불러올 수 없습니다: {(comparisonError as Error).message}
              </Alert>
            ) : comparisonData ? (
              <>
                {/* 요약 */}
                {comparisonData.summary && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StorageIcon color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              DB 테이블
                            </Typography>
                            <Typography variant="h5">
                              {comparisonData.summary.totalDbTables ?? 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CodeIcon color="secondary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Entity
                            </Typography>
                            <Typography variant="h5">
                              {comparisonData.summary.totalEntityTables ?? 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon color="success" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              일치
                            </Typography>
                            <Typography variant="h5">
                              {comparisonData.summary.matchedCount ?? 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ErrorIcon color="error" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              차이점
                            </Typography>
                            <Typography variant="h5">
                              {comparisonData.summary.differenceCount ?? 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* 일치하는 테이블 */}
                {comparisonData.matchedTables && comparisonData.matchedTables.length > 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="h6">일치하는 테이블</Typography>
                        <Chip 
                          label={comparisonData.matchedTables.length} 
                          color="success" 
                          size="small" 
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {comparisonData.matchedTables.map((table) => (
                          <Chip key={table} label={table} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* 차이점 */}
                {Object.entries(groupedDifferences).map(([type, differences]) =>
                  renderDifferences(type, differences)
                )}

                {comparisonData.summary && comparisonData.summary.differenceCount === 0 && (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    DB와 Entity가 완벽하게 일치합니다!
                  </Alert>
                )}
              </>
            ) : null}
          </TabPanel>
        </Card>
      </Container>
    </Box>
  );
}

