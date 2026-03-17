import { ImageResponse } from 'next/og';

export const alt = '전투 로그 분석 시스템';
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
        <div style={{ display: 'flex', fontSize: 28, opacity: 0.88 }}>
          Summoners War Analytics
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700 }}>
            전투 로그 분석 시스템
          </div>
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.92 }}>
            점령전, 실레나, 몬스터 데이터를 빠르게 탐색하고 분석하세요.
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
