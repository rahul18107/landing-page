import React from 'react';

const STEPS = [
  {
    num: '01',
    title: 'Pair',
    desc: 'Connect the smartwatch you already own. No new device, no extra charger, no second band. XOOZ runs on the hardware already on your wrist.'
  },
  {
    num: '02',
    title: 'Capture',
    desc: 'Your watch is the microphone. Record the moments you choose, with a visible indicator on screen and a one-tap pause whenever you want privacy.'
  },
  {
    num: '03',
    title: 'Summarize',
    desc: 'XOOZ transcribes and distills the day into a clean recap: who you met, what was decided, and what you promised to follow up on.'
  },
  {
    num: '04',
    title: 'Recall',
    desc: 'Search your week in plain language. "What did Sarah say about the launch?" gets you the moment, the context, and the quote in seconds.'
  },
  {
    num: '05',
    title: 'Stay present',
    desc: 'No notes to take, no gadget to remember. Your day is remembered for you, so you can stay in the conversation instead of managing it.'
  }
];

const THEM = [
  'Buy a second device (~$150+)',
  'Charge it every night',
  'Clip it on, remember to bring it',
  'Basic transcripts and a recorder app'
];

const US = [
  'Use the watch you already own ($0 hardware)',
  'Charges exactly as it always has',
  'Nothing new to carry or forget',
  'Daily recaps, search, and action items'
];

export default function HowItWorks() {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  const labelStyle = {
    fontFamily: "'Glonimove', sans-serif",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  };

  return (
    <section
      id="how-it-works"
      style={{
        background: '#F5F8E2',
        color: '#1A1A1A',
        padding: isMobile ? '80px 24px' : '120px 48px',
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* Editorial Subhead & Manifesto */}
        <div style={{ maxWidth: 780, marginBottom: isMobile ? 40 : 56 }}>
          <span
            style={{
              ...labelStyle,
              color: '#F75E59',
              display: 'block',
              marginBottom: 16
            }}
          >
            How it works
          </span>

          <h2
            style={{
              fontFamily: "'Glonimove', sans-serif",
              fontWeight: 900,
              fontSize: isMobile ? 32 : 54,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#1A1A1A',
              margin: '0 0 24px'
            }}
          >
            Your watch records.
            <br />
            XOOZ remembers.
          </h2>

          <p
            style={{
              fontFamily: "'Glonimove', sans-serif",
              fontWeight: 500,
              fontSize: isMobile ? 16 : 20,
              lineHeight: 1.6,
              color: 'rgba(26, 26, 26, 0.75)',
              margin: 0
            }}
          >
            Dedicated AI recorders ask you to buy, charge, and carry a second device, a microphone you
            wear. XOOZ is the software layer instead: it turns the smartwatch already on your wrist into a
            discreet recorder, then turns every day into a searchable, summarized memory.
          </p>
        </div>

        {/* 5 Minimalist Steps */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1.5px solid rgba(26, 26, 26, 0.15)'
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.num}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '100px 240px 1fr',
                alignItems: 'baseline',
                gap: isMobile ? 12 : 36,
                padding: isMobile ? '28px 0' : '40px 0',
                borderBottom: '1px solid rgba(26, 26, 26, 0.1)',
                transition: 'background 0.2s ease'
              }}
            >
              <span
                style={{
                  fontFamily: "'Glonimove', sans-serif",
                  fontWeight: 900,
                  fontSize: isMobile ? 18 : 24,
                  letterSpacing: '-0.02em',
                  color: '#F75E59'
                }}
              >
                {step.num}
              </span>

              <h3
                style={{
                  fontFamily: "'Glonimove', sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 22 : 28,
                  letterSpacing: '-0.03em',
                  color: '#1A1A1A',
                  margin: 0
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  fontFamily: "'Glonimove', sans-serif",
                  fontWeight: 500,
                  fontSize: isMobile ? 15 : 17,
                  lineHeight: 1.6,
                  color: 'rgba(26, 26, 26, 0.75)',
                  margin: 0,
                  maxWidth: 580
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison — concise, no extra hardware */}
        <div
          style={{
            marginTop: isMobile ? 48 : 72,
            background: '#1A1A1A',
            color: '#F5F8E2',
            borderRadius: 24,
            padding: isMobile ? '28px 22px' : '44px 44px 40px'
          }}
        >
          <span style={{ ...labelStyle, color: '#F75E59', display: 'block', marginBottom: 14 }}>
            The comparison
          </span>

          <h3
            style={{
              fontFamily: "'Glonimove', sans-serif",
              fontWeight: 900,
              fontSize: isMobile ? 26 : 38,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#F5F8E2',
              margin: '0 0 12px'
            }}
          >
            Cheaper by design.
          </h3>

          <p
            style={{
              fontFamily: "'Glonimove', sans-serif",
              fontWeight: 500,
              fontSize: isMobile ? 15 : 17,
              lineHeight: 1.6,
              color: 'rgba(245, 248, 226, 0.7)',
              margin: '0 0 28px',
              maxWidth: 560
            }}
          >
            You already own the microphone. You only need the software.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 16 : 24
            }}
          >
            {/* Them */}
            <div
              style={{
                border: '1px solid rgba(245, 248, 226, 0.16)',
                borderRadius: 18,
                padding: isMobile ? '20px 18px' : '24px 24px'
              }}
            >
              <p style={{ ...labelStyle, color: 'rgba(245, 248, 226, 0.5)', margin: '0 0 14px' }}>
                Dedicated AI recorder
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {THEM.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "'Glonimove', sans-serif",
                      fontWeight: 500,
                      fontSize: 15,
                      lineHeight: 1.45,
                      color: 'rgba(245, 248, 226, 0.55)',
                      paddingLeft: 18,
                      position: 'relative'
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: 'rgba(245, 248, 226, 0.3)' }}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Us */}
            <div
              style={{
                border: '1px solid rgba(247, 94, 89, 0.45)',
                borderRadius: 18,
                padding: isMobile ? '20px 18px' : '24px 24px',
                background: 'rgba(247, 94, 89, 0.08)'
              }}
            >
              <p style={{ ...labelStyle, color: '#F75E59', margin: '0 0 14px' }}>XOOZ</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {US.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "'Glonimove', sans-serif",
                      fontWeight: 500,
                      fontSize: 15,
                      lineHeight: 1.45,
                      color: 'rgba(245, 248, 226, 0.9)',
                      paddingLeft: 18,
                      position: 'relative'
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: '#F75E59' }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p
            style={{
              fontFamily: "'Glonimove', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.5,
              color: 'rgba(245, 248, 226, 0.6)',
              margin: '24px 0 0'
            }}
          >
            No extra hardware. No extra charger. No extra thing to lose.
          </p>
        </div>

      </div>
    </section>
  );
}
