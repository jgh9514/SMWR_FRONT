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
