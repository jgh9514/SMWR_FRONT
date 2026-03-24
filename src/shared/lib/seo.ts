import type { Metadata } from 'next';
import { getSiteUrl } from '@/shared/lib/env';

const SITE_NAME = '전투 로그 분석 시스템';
const DEFAULT_DESCRIPTION =
  '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼';
const DEFAULT_KEYWORDS = ['서머너즈워', '점령전', '실레나', 'RTA', '몬스터 검색', '전투 로그'];
const DEFAULT_OG_IMAGE = '/icons/ci_active.png';

interface BuildMetadataOptions {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  type?: 'website' | 'article';
  noIndex?: boolean;
  image?: string | null;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function sanitizeMetaDescription(
  value: string | null | undefined,
  fallback: string = DEFAULT_DESCRIPTION,
  maxLength = 160,
): string {
  const normalized = value
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

export function buildPublicMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  keywords = [],
  type = 'website',
  noIndex = false,
  image,
  imageAlt,
  publishedTime,
  modifiedTime,
  authors,
}: BuildMetadataOptions): Metadata {
  const mergedKeywords = [...DEFAULT_KEYWORDS, ...keywords];
  const metaImage = image || DEFAULT_OG_IMAGE;
  const imageDescriptor = [
    {
      url: metaImage,
      alt: imageAlt || title,
    },
  ];
  const openGraphBase = {
    title,
    description,
    url: path,
    siteName: SITE_NAME,
    locale: 'ko_KR' as const,
    images: imageDescriptor,
  };
  const openGraph =
    type === 'article'
      ? {
          ...openGraphBase,
          type: 'article' as const,
          publishedTime,
          modifiedTime,
          authors,
        }
      : {
          ...openGraphBase,
          type: 'website' as const,
        };

  return {
    title,
    description,
    keywords: Array.from(new Set(mergedKeywords)),
    alternates: {
      canonical: path,
    },
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [metaImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}

export function getAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getAbsoluteUrl(item.path),
    })),
  };
}

export function serializeJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildNoIndexMetadata(title?: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}
