import React, { useState, useEffect, useRef } from 'react';
import {
  supabaseConfigured,
  startGoogleSignup,
} from '../lib/supabase';
import GoogleMark from './GoogleMark.jsx';
import useIsMobile from '../lib/useIsMobile';

const TICKER_WORDS = [
  "conversations",
  "ideas",
  "commitments",
  "decisions",
  "memories",
  "insights"
];

/* The rotating word lives in its own component so a tick only re-renders this
   one span (previously the whole hero — mockup included — re-rendered every
   2.2s). The width still eases from word to word so the trailing "again."
   drifts with it, like the reference. */
function RotatingWord({ words }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [widths, setWidths] = useState([]);
  const measureRef = useRef(null);

  // Ruler pass: measure each candidate at the live font size so the wrapper
  // can ease to the exact width of the word that is coming in.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const host = measureRef.current;
      if (!host) return;
      const next = [];
      for (const child of host.children) {
        next.push(Math.round(child.getBoundingClientRect().width * 2) / 2);
      }
      setWidths((prev) =>
        prev.length === next.length && prev.every((w, i) => w === next[i]) ? prev : next
      );
    };

    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { measure(); }).catch(() => {});
    }
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [words]);

  useEffect(() => {
    let swap = 0;
    const interval = setInterval(() => {
      setVisible(false);
      swap = setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setVisible(true);
      }, 250);
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(swap);
    };
  }, [words]);

  const width = widths[index];

  return (
    <span
      style={{
        display: 'inline-block',
        width: width ? `${width}px` : undefined,
        verticalAlign: 'bottom',
        overflow: 'hidden',
        transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <strong
        style={{
          fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
          fontWeight: 900,
          color: '#1A1A1A',
          textDecoration: 'underline',
          textDecorationColor: '#1A1A1A',
          textUnderlineOffset: '4px',
          display: 'inline-block',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s ease, transform 0.25s ease',
          whiteSpace: 'nowrap'
        }}
      >
        {words[index]}
      </strong>

      {/* Off-screen ruler — same type as the visible word, laid out once. */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 0,
          overflow: 'hidden',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}
      >
        {words.map((word) => (
          <span key={word} style={{ display: 'inline-block', fontWeight: 900 }}>
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function Hero({ onJoinWaitlist }) {
  const [googleError, setGoogleError] = useState('');

  const heroRef = useRef(null);
  const deviceRef = useRef(null);

  // Rotating ticker removed from the hero: it lives in <RotatingWord /> so the
  // mockup is never re-rendered on a timer.

  // Scroll Interaction (Umano's physical margin & 3D tilt formula)
  useEffect(() => {
    let raf = 0;
    let lastInset = -1;
    let lastRadius = -1;
    let lastY = -1;
    let isMobile = window.innerWidth <= 768;

    const onResize = () => {
      isMobile = window.innerWidth <= 768;
      lastInset = -1;
      lastRadius = -1;
    };

    const apply = () => {
      raf = 0;
      const hero = heroRef.current;
      const device = deviceRef.current;
      if (!hero || !device) return;

      const scrollY = window.scrollY;
      // Well past the hero there is nothing left to animate — bail so we are
      // not writing styles on every scroll frame down in the card section.
      if (scrollY > window.innerHeight * 2.4) return;

      const progress = Math.min(1, scrollY / 150);

      // These two are layout-affecting. Writing them with a fresh sub-pixel
      // value on every frame reflowed the whole document; half-pixel steps
      // keep the edge smooth while cutting the writes by ~7x.
      const inset = Math.round(progress * 20) / 2;
      const radius = Math.round(progress * 42);

      if (inset !== lastInset) {
        lastInset = inset;
        hero.style.marginLeft = `${inset}px`;
        hero.style.marginRight = `${inset}px`;
      }

      if (radius !== lastRadius) {
        lastRadius = radius;
        hero.style.borderBottomLeftRadius = `${radius}px`;
        hero.style.borderBottomRightRadius = `${radius}px`;
      }

      if (Math.abs(scrollY - lastY) > 0.5) {
        lastY = scrollY;
        // Pure translate: the old perspective+rotateX tilted the phone, but a
        // changing 3D rotation forces Chrome to re-raster the whole mockup
        // layer every frame. The drift alone reads the same and stays on the
        // compositor.
        const translateY = isMobile ? scrollY * 0.1 : scrollY * 0.28;
        device.style.transform = `translate3d(0, ${translateY}px, 0)`;
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    apply();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Hero CTA: straight to Google's consent screen — no popup, no email form.
  // The App-level auth listener completes the waitlist entry on return.
  const handleGoogleSignup = async () => {
    setGoogleError('');
    if (!supabaseConfigured) {
      setGoogleError('The backend is not configured yet. Supabase keys are missing.');
      return;
    }
    const oauthError = await startGoogleSignup();
    if (oauthError) {
      setGoogleError('Could not start Google sign-in. Please try again.');
    }
  };

  // Live breakpoint: a shared hook, so resizing across 768px re-lays out the
  // hero instead of freezing whichever variant rendered first.
  const isMobile = useIsMobile();

  return (
    <section
      ref={heroRef}
      id="hero"
      style={{
        position: 'relative',
        background: '#F75E59',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: isMobile ? 120 : 148,
        paddingBottom: isMobile ? 24 : 42,
        // No willChange here: margin/border-radius are layout properties, they
        // never get their own compositor layer — the hint was dead weight.
        transition: 'border-radius 0.2s ease, margin 0.2s ease'
      }}
    >
      {/* Top Editorial Copy Container */}
      <div
        style={{
          textAlign: 'center',
          padding: isMobile ? '20px 20px 0' : '32px 32px 0',
          maxWidth: isMobile ? 440 : 760,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Main Headline */}
        <h1
          style={{
            fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: isMobile ? 40 : 78,
            lineHeight: isMobile ? '46px' : '82px',
            letterSpacing: isMobile ? '-1px' : '-2px',
            color: '#1A1A1A',
            margin: 0,
            WebkitFontSmoothing: 'antialiased'
          }}
        >
          Your Day,
          <br />
          Remembered.
        </h1>

        {/* Dynamic Category Ticker Subtitle */}
        <p
          style={{
            fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: isMobile ? 18 : 24,
            lineHeight: isMobile ? '28px' : '34px',
            letterSpacing: '-0.3px',
            color: '#1A1A1A',
            margin: '20px 0 0',
            maxWidth: 620
          }}
        >
          Software for the watch you already wear.
          <br />
          Never lose your{' '}
          <RotatingWord words={TICKER_WORDS} />{' '}
          again.
        </p>

        {/* Primary CTA — straight to Google sign-up preview */}
        <div style={{ marginTop: 32, width: '100%', maxWidth: 440 }}>
          <button
            type="button"
            onClick={handleGoogleSignup}
            data-cursor="pointer"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background: '#1A1A1A',
              color: '#ffffff',
              border: '2px solid #1A1A1A',
              borderRadius: 9999,
              padding: '18px 24px',
              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 16px 36px rgba(26, 26, 26, 0.15)',
              transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = '#F5F8E2';
              e.currentTarget.style.color = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#1A1A1A';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            <GoogleMark size={20} />
            <span>Continue with Google</span>
          </button>

          {googleError && (
            <p
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                margin: '12px 0 0',
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#1A1A1A'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#1A1A1A',
                  flexShrink: 0
                }}
              />
              {googleError}
            </p>
          )}
        </div>
      </div>

      {/* Product Device Mockup (Phone in Hand with Generated iPhone Video) */}
      <div
        ref={deviceRef}
        style={{
          position: 'relative',
          width: 891,
          height: 634,
          marginTop: isMobile ? 'auto' : 32,
          flexShrink: 0,
          transformOrigin: isMobile ? '50% 100%' : '50% 40%',
          willChange: 'transform'
        }}
      >
        {/* Real Transparent WebP Mockup of Two Hands Holding Phone */}
        <img
          src="/phone-hands.webp"
          alt="Hands holding XOOZ memory app"
          fetchpriority="high"
          style={{
            position: 'absolute',
            top: -31,
            left: -85,
            width: 1061,
            height: 707,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />

        {/* Screen Cutout — measured from phone-hands.webp: the display glass sits at
            x 1574-2521 / y 332-2415 (of 4096x2731), mapped onto the 1061x707 img
            which is placed at (-85, -31). The video covers the cutout at 85%
            height (src still applied to the remaining 15% — see bg #E8E7E6). */}
        <div
          style={{
            position: 'absolute',
            left: 323,
            top: 55,
            width: 246,
            height: 541,
            background: '#E8E7E6',
            borderRadius: 38,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.06)'
          }}
        >
          {/* Cloudinary Generated iPhone Video replacing the mock screen UI */}
          <video
            src="https://res.cloudinary.com/vx59z5ll/video/upload/so_0.5/gemini_generated_video_407c5c74.mp4"
            poster="/screen-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            fetchpriority="high"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '85%',
              objectFit: 'cover',
              pointerEvents: 'none',
              display: 'block'
            }}
          />
        </div>

        {/* Dynamic Island — the bezel pill baked into the mockup image gets covered
            by the video, so it is re-drawn on top of the video (measured: 78x23
            device px, 7px below the screen top, centered). */}
        <div
          style={{
            position: 'absolute',
            top: 62,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 78,
            height: 23,
            background: '#0B0B0C',
            borderRadius: 9999,
            pointerEvents: 'none'
          }}
        />
      </div>
    </section>
  );
}
