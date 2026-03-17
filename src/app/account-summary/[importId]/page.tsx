'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  LinearProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DataTable from '@/shared/ui/data-table/DataTable';
import type { TableColumn } from '@/shared/ui/data-table/DataTable';
import { Avatar, Badge, CardActionArea, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { useAccountSummaryImportDetail, useRuneScoreSummary, useSwexMonsterCatalog, useSwexRuneList } from '@/hooks/api';
import type { SwexMonsterCatalogItem, SwexRuneItem } from '@/features/account-summary/types/account-summary';

type AttributeKey = 'fire' | 'water' | 'wind' | 'light' | 'dark';

const attributeIcons: Record<Exclude<AttributeKey, 'all'>, string> = {
  fire: '/images/Fire_Icon.png',
  water: '/images/Water_Icon.png',
  wind: '/images/Wind_Icon.png',
  light: '/images/Light_Icon.png',
  dark: '/images/Dark_Icon.png',
};

const attributeLabels: Record<AttributeKey, string> = {
  fire: '불',
  water: '물',
  wind: '바람',
  light: '빛',
  dark: '어둠',
};

const attributeToDbValue: Record<AttributeKey, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  light: 'Light',
  dark: 'Dark',
};

const getMonsterAttributeKey = (monsterElemental?: string | null): AttributeKey | null => {
  if (!monsterElemental) return null;
  const e = monsterElemental.toLowerCase();
  if (e === 'fire' || e === '불') return 'fire';
  if (e === 'water' || e === '물') return 'water';
  if (e === 'wind' || e === '바람') return 'wind';
  if (e === 'light' || e === '빛') return 'light';
  if (e === 'dark' || e === '어둠') return 'dark';
  return null;
};

export default function AccountSummaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const importIdRaw = params?.importId as string | undefined;
  const importId = importIdRaw ? Number(importIdRaw) : NaN;

  const [activeTab, setActiveTab] = useState<'monster' | 'rune'>('monster');
  const [keyword, setKeyword] = useState('');
  // 요청사항: 전체 탭 제거, 불속성 기본
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeKey>('fire');

  const detailQuery = useAccountSummaryImportDetail(
    { import_id: importId },
    { enabled: Number.isFinite(importId) },
  );
  
  const runeScoreQuery = useRuneScoreSummary(
    { import_id: importId },
    { enabled: Number.isFinite(importId) },
  );

  const monsterCatalogQuery = useSwexMonsterCatalog(
    {
      import_id: importId,
      limit: 400,
      offset: 0,
      keyword: keyword.trim() || undefined,
      monster_elemental: attributeToDbValue[selectedAttribute],
    },
    { enabled: Number.isFinite(importId) && activeTab === 'monster' },
  );

  const runeQuery = useSwexRuneList(
    { import_id: importId, limit: 50, offset: 0 },
    { enabled: Number.isFinite(importId) && activeTab === 'rune' },
  );

  const runeColumns = useMemo<TableColumn<SwexRuneItem>[]>(
    () => [
      { title: '룬ID', key: 'rune_id' },
      { title: '유닛ID', key: 'unit_id', hideOnMobile: true },
      { title: '슬롯', key: 'slot' },
      { title: '세트', key: 'set_id' },
      { title: '강화', key: 'level' },
      { title: '등급', key: 'grade', hideOnMobile: true },
    ],
    [],
  );

  if (!Number.isFinite(importId)) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">유효하지 않은 import_id 입니다.</Alert>
      </Container>
    );
  }

  const detail = detailQuery.data;
  const summary = detail?.import;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            계정 요약 상세
          </Typography>
          <Typography variant="body2" color="text.secondary">
            import_id: {importId}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/account-summary')}>
          이력으로
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="요약" />
        <CardContent>
          {detailQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {!detail?.hasData ? (
            <Alert severity="warning">해당 임포트를 찾을 수 없습니다.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  닉네임
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {summary?.wizard_name ?? '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  wizard_id
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {summary?.wizard_id ?? '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  업로드일시
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {summary?.uploaded_at ?? '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  몬스터 수
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {summary?.unit_count ?? 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  룬 수
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {summary?.rune_count ?? 0}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="룬 점수 요약" />
        <CardContent>
          {runeScoreQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {!runeScoreQuery.data?.hasData ? (
            <Alert severity="info">룬 점수 요약 데이터를 계산할 수 없습니다.</Alert>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Top 10 합산 (룬 기준: 신속/폭주/절망)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    신속 Top10 합산 (상위 {runeScoreQuery.data?.top10?.swift?.considered ?? 0}/{runeScoreQuery.data?.top10?.swift?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.top10?.swift?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    폭주 Top10 합산 (상위 {runeScoreQuery.data?.top10?.violent?.considered ?? 0}/{runeScoreQuery.data?.top10?.violent?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.top10?.violent?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    절망 Top10 합산 (상위 {runeScoreQuery.data?.top10?.despair?.considered ?? 0}/{runeScoreQuery.data?.top10?.despair?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.top10?.despair?.sum ?? 0}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                General Rune Score (전체 룬 합산)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    신속 (n={runeScoreQuery.data?.general?.swift?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.swift?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    폭주 (n={runeScoreQuery.data?.general?.violent?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.violent?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    절망 (n={runeScoreQuery.data?.general?.despair?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.despair?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    의지 (n={runeScoreQuery.data?.general?.will?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.will?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    반격 (n={runeScoreQuery.data?.general?.revenge?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.revenge?.sum ?? 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    기타 (n={runeScoreQuery.data?.general?.others?.count ?? 0})
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {runeScoreQuery.data?.general?.others?.sum ?? 0}
                  </Typography>
                </Box>
              </Box>

              {runeScoreQuery.data?.scoreFormula && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  점수식: {runeScoreQuery.data.scoreFormula}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="상세 목록(상위 50)" />
        <CardContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab value="monster" label="몬스터" />
            <Tab value="rune" label="룬" />
          </Tabs>

          {activeTab === 'monster' && (
            <>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="몬스터 이름/ID로 검색"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={selectedAttribute}
                  onChange={(_, v) => setSelectedAttribute(v)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  aria-label="속성 필터"
                  sx={{
                    minHeight: { xs: 44, sm: 52 },
                    '& .MuiTab-root': {
                      minHeight: { xs: 44, sm: 52 },
                      minWidth: 0,
                      px: { xs: 1, sm: 1.5 },
                    },
                  }}
                >
                  {(['fire', 'water', 'wind', 'light', 'dark'] as const).map((attr) => (
                    <Tab
                      key={attr}
                      value={attr}
                      icon={
                        <Box
                          component="img"
                          src={getMonsterImageUrl(attributeIcons[attr])}
                          alt={attributeLabels[attr]}
                          sx={{ width: 22, height: 22 }}
                        />
                      }
                      aria-label={attributeLabels[attr]}
                    />
                  ))}
                </Tabs>
              </Box>

              {monsterCatalogQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)', md: 'repeat(8, 1fr)' },
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                {(monsterCatalogQuery.data?.items || []).map((m: SwexMonsterCatalogItem) => {
                  const owned = (m.owned_count || 0) > 0;
                  const img = getMonsterImageUrl(m.image_url);
                  const attrKey = getMonsterAttributeKey(m.monster_elemental);
                  const attrIcon = attrKey ? getMonsterImageUrl(attributeIcons[attrKey]) : null;
                  return (
                    <Card key={m.monster_id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <CardActionArea
                        onClick={() => router.push(`/monster-detail/${m.monster_id}`)}
                        sx={{
                          p: 1,
                          textAlign: 'center',
                          opacity: owned ? 1 : 0.55,
                          filter: owned ? 'none' : 'grayscale(1)',
                        }}
                      >
                        <Badge
                          badgeContent={m.owned_count || 0}
                          color={owned ? 'primary' : 'default'}
                          overlap="circular"
                          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                          <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <Avatar
                              src={img}
                              alt={m.kr_name}
                              sx={{ width: 56, height: 56, mx: 'auto', mb: 0.5, bgcolor: 'background.paper' }}
                            />
                            {attrIcon && (
                              <Box
                                component="img"
                                src={attrIcon}
                                alt={attrKey ? attributeLabels[attrKey] : ''}
                                sx={{
                                  position: 'absolute',
                                  left: -2,
                                  bottom: 6,
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  bgcolor: 'rgba(0,0,0,0.1)',
                                }}
                              />
                            )}
                          </Box>
                        </Badge>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, lineHeight: 1.2 }}>
                          {m.kr_name}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                총 {monsterCatalogQuery.data?.total ?? 0}종 (보유 0은 회색으로 표시)
              </Typography>
            </>
          )}

          {activeTab === 'rune' && (
            <>
              {runeQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
              <DataTable<SwexRuneItem>
                columns={runeColumns}
                data={runeQuery.data?.items || []}
                emptyMessage="룬 데이터가 없습니다."
                size="small"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                총 {runeQuery.data?.total ?? 0}건
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}


