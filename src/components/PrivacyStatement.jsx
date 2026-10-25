import React from 'react';
import useIsMobile from '../lib/useIsMobile';

const PRINCIPLES = [
  {
    title: 'Explicit Recording Indicator',
    body: 'A visible indicator on your watch and in the app shows exactly when audio is being captured. If the indicator is off, nothing is recording.'
  },
  {
    title: 'Zero AI Model Training',
    body: 'Your voice, transcripts, and personal memory summaries are strictly private. We never sell, share, or use your conversations to train public AI models.'
  },
  {
    title: 'One-Tap Mute',
    body: 'Pause capture with a single tap on your watch or in the app. While it is paused nothing is captured, and the off state stays visible at a glance.'
  }
];

export default function PrivacyStatement() {
  const isMobile = useIsMobile();

  return (
    <section
      id="privacy"
      style={{
        background: '#1A1A1A',
        color: '#F5F8E2',
        padding: isMobile ? '80px 24px' : '130px 48px',
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: 760, marginBottom: isMobile ? 48 : 72 }}>
          <span
            style={{
              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#F75E59',
              display: 'block',
              marginBottom: 16
            }}
          >
            Privacy by Design
          </span>

          <h2
            style={{
              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 900,
              fontSize: isMobile ? 32 : 54,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#F5F8E2',
              margin: '0 0 24px'
            }}
          >
            Your life. Your voice.
            <br />
            Strictly yours.
          </h2>

          <p
            style={{
              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: isMobile ? 16 : 20,
              lineHeight: 1.6,
              color: 'rgba(245, 248, 226, 0.75)',
              margin: 0
            }}
          >
            A memory assistant is only as meaningful as the trust you place in it. XOOZ is engineered
            from first principles with explicit consent, transparent indicators, and zero data compromise.
          </p>
        </div>

        {/* 3 Minimal Principles (Clean typography, no generic cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 36 : 48,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: isMobile ? 36 : 48
          }}
        >
          {PRINCIPLES.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 900,
                  fontSize: 14,
                  color: '#F75E59',
                  letterSpacing: '0.04em'
                }}
              >
                0{idx + 1}
              </div>

              <h3
                style={{
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: '#F5F8E2',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}
              >
                {item.title}
              </h3>

              <p
                style={{
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'rgba(245, 248, 226, 0.7)',
                  margin: 0
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
