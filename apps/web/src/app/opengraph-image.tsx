import { ImageResponse } from 'next/og';

export const alt =
  'Abhiyantri Setu: home services, house construction and materials in Greater Noida';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The social card shown when the site is shared on WhatsApp, Facebook or X. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: 'linear-gradient(135deg, #F6EFE3 0%, #F3DFC2 100%)',
        color: '#1A3A52',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 30, letterSpacing: 6, color: '#E07B1F', fontWeight: 700 }}>
        ABHIYANTRI SETU · GREATER NOIDA
      </div>
      <div style={{ fontSize: 78, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
        Build, Renovate,
      </div>
      <div style={{ fontSize: 78, fontWeight: 800, color: '#F28C28', lineHeight: 1.05 }}>
        Repair & Maintain.
      </div>
      <div style={{ fontSize: 32, marginTop: 32, color: '#4A5B6B' }}>
        Verified pros, clear quotes, payments released only when work is done.
      </div>
    </div>,
    size,
  );
}
