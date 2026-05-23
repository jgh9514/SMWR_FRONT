'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Pagination,
  TextField,
  Typography,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { PageBanner, PageHeader } from '@/shared/ui';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/validation';
import { useGuildRecruitmentList } from '@/features/guild-recruitment/hooks/useGuildRecruitment';
import { isAuthenticated } from '@/shared/utils/auth';

const THUMBNAIL_PLACEHOLDER = '/images/guild-thumbnail-placeholder.png';

function formatPostedAt(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ko-KR');
}

function stripHtml(html?: string) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function GalleryCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={160} />
      <CardContent sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={22} />
        <Skeleton variant="text" width="40%" height={18} sx={{ mt: 0.5 }} />
        <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} />
      </CardContent>
    </Card>
  );
}

export default function GuildRecruitmentListClient() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const limit = DEFAULT_PAGE_SIZE;

  const params = useMemo(() => ({ page, limit, search: search.trim() || undefined }), [page, limit, search]);

  const { data, isLoading, isFetching, isError } = useGuildRecruitmentList(params, {
    refetchOnWindowFocus: false,
  });

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const goWrite = () => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    router.push('/guild-recruitment/write');
  };

  const showSkeleton = isLoading || (isFetching && list.length === 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
        <PageHeader
          title="길드원 모집"
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={goWrite}>
              글쓰기
            </Button>
          }
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          길드명·서버·전시즌 등급·모집 내용을 올려 길드원을 모집할 수 있습니다.
        </Typography>

        {/* 검색 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            size="small"
            label="검색 (길드명·서버·내용)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1 }}
          />
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>
            검색
          </Button>
        </Box>

        {/* 에러 */}
        {isError && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            목록을 불러오지 못했습니다.
          </Typography>
        )}

        {/* 갤러리 그리드 */}
        {!isError && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              {showSkeleton
                ? Array.from({ length: limit }).map((_, i) => <GalleryCardSkeleton key={i} />)
                : list.length === 0
                ? null
                : list.map((row) => (
                    <Card
                      key={String(row.post_id)}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s, transform 0.2s',
                        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                      }}
                    >
                      <CardActionArea
                        onClick={() => router.push(`/guild-recruitment/${row.post_id}`)}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', flex: 1 }}
                      >
                        {/* 썸네일 영역 */}
                        {row.thumbnail_url ? (
                          <CardMedia
                            component="img"
                            height={160}
                            image={row.thumbnail_url}
                            alt={`${row.guild_name} 썸네일`}
                            sx={{ objectFit: 'cover' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 160,
                              bgcolor: 'action.hover',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            <Typography variant="h4" component="div" sx={{ fontSize: '2.5rem', lineHeight: 1 }}>
                              🛡️
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {row.server_name}
                            </Typography>
                          </Box>
                        )}

                        {/* 카드 본문 */}
                        <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                            <Chip
                              label={row.server_name}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Chip
                              label={row.last_season_grade}
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            noWrap
                            sx={{ fontSize: '0.95rem', lineHeight: 1.3 }}
                          >
                            {row.guild_name}
                          </Typography>
                          {row.content_preview && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.4,
                                flex: 1,
                              }}
                            >
                              {stripHtml(row.content_preview)}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 'auto',
                              pt: 1,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="caption" color="text.disabled" noWrap>
                              {row.user_name || '-'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {formatPostedAt(row.crt_date)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
            </Box>

            {/* 빈 상태 */}
            {!showSkeleton && list.length === 0 && (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ mb: 1, opacity: 0.3 }}>🛡️</Typography>
                <Typography color="text.secondary">
                  {search ? `"${search}" 검색 결과가 없습니다.` : '등록된 글이 없습니다.'}
                </Typography>
                {search && (
                  <Button sx={{ mt: 2 }} variant="outlined" size="small" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                    검색 초기화
                  </Button>
                )}
              </Box>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
