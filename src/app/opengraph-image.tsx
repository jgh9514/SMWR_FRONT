import { ImageResponse } from 'next/og';

import { SITE_TITLE_DEFAULT } from '@/shared/lib/seo';

export const alt = SITE_TITLE_DEFAULT;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0b1220 0%, #1f4b99 50%, #3b82f6 100%)',
          color: '#ffffff',
          padding: '64px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, opacity: 0.88 }}>skyarena.gg</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>
            Sky Arena Summoner Search and Monster Statistics.
          </div>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.92 }}>
            Summoners War — siege, RTA, monster data
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.78 }}>
          Monster Search · RTA Stats · Battle History · Community
        </div>
      </div>
    ),
    size,
  );
}
