import React from 'react';
import { ArrowRight } from 'lucide-react';
import useIsMobile from '../lib/useIsMobile';

// Same trimmed logo asset as the navbar — e_trim cuts the transparent padding.
const BRAND_LOGO_URL =
  'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/e_trim/Bold_XO_OZ_Geometric_Logo.png';

export default function Footer({ onOpenWaitlist }) {
  const isMobile = useIsMobile();

  return (
    <footer
      id="vision"
      style={{
        background: '#F5F8E2',
        color: '#1A1A1A',
        paddingTop: isMobile ? 64 : 96,
        paddingBottom: isMobile ? 48 : 64,
        position: 'relative',
        borderTop: '1.5px solid rgba(26, 26, 26, 0.12)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          width: '100%',
          margin: '0 auto',
          padding: isMobile ? '0 24px' : '0 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 40 : 56,
          boxSizing: 'border-box'
        }}
      >
        {/* Vision & Brand Summary Row */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-end',
            gap: 32
          }}
        >
          <div style={{ maxWidth: 540 }}>
            <img
              src={BRAND_LOGO_URL}
              alt="XOOZ"
              draggable={false}
              style={{ height: 30, width: 'auto', display: 'block', marginBottom: 12 }}
            />

            <p
              style={{
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: '#1A1A1A',
                lineHeight: 1.5,
                margin: '0 0 8px'
              }}
            >
              XOOZ turns the smartwatch you already wear into a personal memory layer, with no extra
              device, no extra charger, and nothing new to remember.
            </p>

            <p
              style={{
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 13,
                color: 'rgba(26, 26, 26, 0.6)',
                lineHeight: 1.5,
                margin: 0
              }}
            >
              *Currently a product concept in development. Smartwatch capture, transcription, and AI
              features are subject to technical validation.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onOpenWaitlist}
            data-cursor="pointer"
            style={{
              background: '#1A1A1A',
              color: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              padding: '14px 28px',
              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s ease, transform 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F75E59';
              e.currentTarget.style.color = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1A1A1A';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            <span>Sign up</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Navigation & Copyright Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            borderTop: '1px solid rgba(26, 26, 26, 0.1)',
            paddingTop: 24,
            fontSize: 13,
            color: 'rgba(26, 26, 26, 0.6)',
            fontWeight: 500
          }}
        >
          <div>© {new Date().getFullYear()} XOOZ. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>
              How it works
            </a>
            <a href="#watch-compatibility" style={{ color: 'inherit', textDecoration: 'none' }}>
              Watches
            </a>
            <a href="#privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
              Privacy
            </a>
            <a href="#hero" style={{ color: 'inherit', textDecoration: 'none' }}>
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
