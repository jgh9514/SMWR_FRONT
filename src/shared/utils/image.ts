/**
 * 이미지 URL 유틸리티
 * CloudFront CDN을 통해 S3에 저장된 이미지 파일에 접근
 * 이미지 경로 예시: /monster/banner.jpg, /images/Wind_a/Julien_Wind_a_Icon.png
 */

import { getCdnImageUrl } from '@/shared/lib/env';

/**
 * CloudFront CDN을 통한 이미지 URL 생성
 * @param imageUrl - API에서 받은 이미지 경로 (예: /images/Wind_a/Julien_Wind_a_Icon.png, /monster/banner.jpg)
 * @returns CloudFront CDN을 통한 완전한 이미지 URL (예: https://dyjduzi8vf2k4.cloudfront.net/images/Wind_a/Julien_Wind_a_Icon.png)
 */
export const getMonsterImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    // 기본 이미지도 CloudFront CDN 사용
    return getCdnImageUrl('/images/default-monster.png');
  }

  // 이미 전체 URL인 경우 그대로 반환
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // CloudFront CDN URL 사용
  const cdnUrl = getCdnImageUrl(imageUrl);
  
  return cdnUrl;
};

/**
 * SSG/SSR에 안전한 이미지 URL
 * - 상대 경로는 그대로 유지하여 hydration mismatch를 피한다.
 * - 절대 URL만 그대로 통과시킨다.
 */
export const getRenderableImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    return '/images/default-monster.png';
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
};

/**
 * 정적 이미지 URL (public 폴더)
 * @param imagePath - public 폴더 기준 경로 (예: /images/icon.png)
 */
export const getStaticImageUrl = (imagePath: string): string => {
  return imagePath;
};

/** MyBatis `mapUnderscoreToCamelCase` → JSON 키가 `effectIconPath`인 경우가 있어 스네이크/카멜 둘 다 허용 */
export type SkillEffectIconFields = {
  effect_icon_path?: string | null;
  effect_icon_filename?: string | null;
  effectIconPath?: string | null;
  effectIconFilename?: string | null;
};

/**
 * 스킬 이펙트 아이콘 — `skill_effect_master.icon_path` 조인값(`effect_icon_path` / `effectIconPath`)
 */
export function resolveSkillEffectImageUrl(ef: SkillEffectIconFields): string | null {
  const path = pickNonEmpty(ef.effect_icon_path, ef.effectIconPath);
  if (path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const clean = path.startsWith('/') ? path : `/${path}`;
    return getCdnImageUrl(clean);
  }
  const fn = pickNonEmpty(ef.effect_icon_filename, ef.effectIconFilename);
  if (!fn) return null;
  if (fn.startsWith('http://') || fn.startsWith('https://')) return fn;

  const fromCdn = getCdnImageUrl(`/skill-effects/${fn}`);
  if (fromCdn.startsWith('http://') || fromCdn.startsWith('https://')) {
    return fromCdn;
  }
  // Swarfarm: buff_ / debuff_ 모두 herders/images/buffs/ (동일 폴더)
  const folder =
    fn.startsWith('buff_') || fn.startsWith('debuff_') ? 'buffs' : 'skill-effects';
  return `https://swarfarm.com/static/herders/images/${folder}/${encodeURIComponent(fn)}`;
}

function pickNonEmpty(
  ...vals: (string | null | undefined)[]
): string | undefined {
  for (const v of vals) {
    if (v == null) continue;
    const t = String(v).trim();
    if (t !== '') return t;
  }
  return undefined;
}

/** SWEX OSS 프로필 이미지 (channel_uid = 파일명, wizard_id 와 별개) */
const SWEX_PLAYER_IMAGE_BASE = 'https://swex.oss-cn-hangzhou.aliyuncs.com/playerImage';

export function getSwexPlayerImageUrl(
  channelUid: string | number | null | undefined,
): string {
  const id = pickNonEmpty(
    channelUid != null ? String(channelUid) : undefined,
  );
  const file = id ?? 'default';
  return `${SWEX_PLAYER_IMAGE_BASE}/${file}.jpg`;
}

const CDN_IMAGE_PATH_PREFIXES = ['/images/', '/monster/', '/siege/', '/rune/'] as const;

/** CloudFront·상대 경로 → `/images/...` 또는 `/monster/...` (허용 프리픽스만) */
export function extractMonsterImagePath(src: string | null | undefined): string | null {
  if (!src || !src.trim()) {
    return '/images/default-monster.png';
  }

  const trimmed = src.trim();
  if (trimmed.startsWith('data:')) {
    return null;
  }

  let path: string;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  } else {
    path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  if (path.includes('..')) {
    return null;
  }

  if (!CDN_IMAGE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }

  return path;
}

/** PNG/html-to-image 캡처용 동일 출처 프록시 (Ingress: `/api/*` → WAS 이므로 `/cdn-image` 사용) */
const CDN_IMAGE_PROXY_PATH = '/cdn-image';

/**
 * html2canvas 등 캡처용 — `/cdn-image` 동일 출처 프록시 URL.
 * (브라우저 → CloudFront 직접 fetch는 CORS·SW opaque 응답으로 막힘)
 */
export function toCanvasExportImageUrl(src: string | null | undefined): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  const trimmed = src?.trim() ?? '';
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  const path = extractMonsterImagePath(src);
  if (!path) {
    return trimmed;
  }

  return `${origin}${CDN_IMAGE_PROXY_PATH}?path=${encodeURIComponent(path)}`;
}

/** @deprecated {@link toCanvasExportImageUrl} 사용 */
export const toSameOriginMonsterImageUrl = toCanvasExportImageUrl;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return null;
    return blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

/**
 * 캡처 전 `<img>`를 data URL로 인라인. 완료 후 restore()로 원복.
 * - CDN 이미지: `/cdn-image` 프록시 경유 (Ingress `/api/*` 회피)
 * - 외부 이미지 (element icon 등): direct CORS fetch 시도, 실패 시 원본 유지
 */
export async function inlineImagesForHtml2Canvas(root: Element): Promise<() => void> {
  const images = Array.from(root.querySelectorAll('img'));
  const restores: Array<{ img: HTMLImageElement; src: string; crossOrigin: string | null }> = [];
  const defaultPlaceholder = await fetchAsDataUrl(
    `${typeof window !== 'undefined' ? window.location.origin : ''}/images/default-monster.png`,
  );

  await Promise.all(
    images.map(async (img) => {
      const attrSrc = img.getAttribute('src') ?? img.src;
      if (!attrSrc || attrSrc.startsWith('data:')) return;

      restores.push({ img, src: img.src, crossOrigin: img.crossOrigin });

      const proxyUrl = toCanvasExportImageUrl(attrSrc);
      if (proxyUrl.includes(CDN_IMAGE_PROXY_PATH)) {
        const dataUrl = await fetchAsDataUrl(proxyUrl);
        if (dataUrl) {
          img.src = dataUrl;
          img.removeAttribute('crossorigin');
          return;
        }
        if (defaultPlaceholder) {
          img.src = defaultPlaceholder;
          img.removeAttribute('crossorigin');
        }
        return;
      }

      // 외부 이미지 (static.lucksack.gg 등) → CORS fetch 시도
      if (attrSrc.startsWith('http://') || attrSrc.startsWith('https://')) {
        try {
          const res = await fetch(attrSrc, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
          if (!res.ok) throw new Error(`direct ${res.status}`);
          img.src = await blobToDataUrl(await res.blob());
          img.removeAttribute('crossorigin');
        } catch { /* 원본 src 유지 */ }
      }
    }),
  );

  return () => {
    for (const { img, src, crossOrigin } of restores) {
      img.src = src;
      if (crossOrigin) img.crossOrigin = crossOrigin;
      else img.removeAttribute('crossorigin');
    }
  };
}
