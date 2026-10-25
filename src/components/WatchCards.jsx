import React, { useEffect, useRef, useState, useCallback } from 'react';
import { emitCardProgress } from '../lib/cardProgress';
import useIsMobile from '../lib/useIsMobile';

const WATCHES = [
  {
    id: 1,
    brand: 'Apple',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Titanium_Smartwatch_on_Black_Background.png',
    bg: '#E7E8E6',
  },
  {
    id: 2,
    brand: 'Samsung',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Silver_Smartwatch_on_Black_Background.png',
    bg: '#E7E8E6',
  },
  {
    id: 3,
    brand: 'Google',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Minimalist_Mint_Smartwatch_on_Black.png',
    bg: '#EDE7DB',
  },
  {
    id: 4,
    brand: 'Garmin',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Luxurious_Gold_Garmin_Watch_on_Black.png',
    bg: '#EDE7DB',
  },
  {
    id: 5,
    brand: 'Xiaomi',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Color-Gradient_09_28_Smartwatch.png',
    bg: '#EDE7DB',
  },
  {
    id: 6,
    brand: 'CMF',
    image:
      'https://res.cloudinary.com/vx59z5ll/image/upload/f_auto/q_auto/Gunmetal_Smartwatch_on_Black_Background.png',
    bg: '#E7E8E6',
  },
];

const BASE_GAP = 33;
const CARD_WIDTH = 320;
const START_PAD = 172;
const END_PAD = 80;
// Breathing room between the intro copy and the card row once the pin has
// been lifted into place (see measure() below).
const INTRO_CARD_GAP = 72;
// Distance from the top of the pinned stage to the card row. Capped so tall
// screens do not park the row in the middle of the viewport with a hole above
// it (the cap also keeps the section from pinning before its intro is read).
const CARD_TOP_MAX = 240;
// Share of the viewport height the row rests at the end of the pin. Without
// it the horizontal travel finishes on the exact frame the section unpins, so
// the last card is whisked away the moment it lands. This is the settle beat.
const END_HOLD = 0.5;
// Exponential smoothing time constant (ms). Time-based so the motion feels
// identical on 60Hz and 120Hz displays.
const SMOOTH_MS = 90;
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/* Reveal choreography — mirrors the reference site:
   cards rise from below with a slight tilt that unwinds as they settle. */
const REVEAL_RISE = 80; // px travelled on the way up
const REVEAL_SKEW = 3; // deg of tilt released on arrival
const REVEAL_TRIGGER = 0.85; // reveal once the card's left edge passes 85% of the viewport
const REVEAL_THROTTLE = 350; // ms between two consecutive reveals
const MEDIA_ZOOM = 1.15; // media starts zoomed in and settles to 1
const PARALLAX_MAX = 10; // max per-card parallax offset in px (kept subtle)
const PARALLAX_DAMPING = 0.08; // how strongly the smoothing lag fans the cards out

function trackContentWidth(startPad) {
  return (
    WATCHES.length * CARD_WIDTH +
    Math.max(WATCHES.length - 1, 0) * BASE_GAP +
    startPad +
    END_PAD
  );
}

export default function WatchCards() {
  const pinRef = useRef(null);
  const stickyRef = useRef(null);
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const introHeadingRef = useRef(null);

  const itemRefs = useRef([]); // outer wrappers — carry the parallax offset
  const revealRefs = useRef([]); // inner wrappers — carry the slide-up reveal
  const mobileRevealRefs = useRef([]);
  const revealedRef = useRef(WATCHES.map(() => false));
  const nextRevealAt = useRef(0);

  const currentX = useRef(START_PAD);
  const targetX = useRef(START_PAD);
  // Cached layout — measured on resize/font load only, never per frame.
  const geom = useRef({
    pinTop: 0,
    scrollable: 1,
    // Scroll distance over which the track actually travels. The tail of the
    // pin (scrollable - travelScroll) is an end hold: the row is already at its
    // final position while the section is still pinned, so the last card gets
    // to settle instead of being carried off-screen the instant it arrives.
    travelScroll: 1,
    maxTravel: 0,
    viewportW: 0,
    startPad: START_PAD,
  });
  const runningRef = useRef(false);
  const lastReport = useRef({ active: -1, total: 0, inSection: false });
  const mobileInView = useRef(false);

  const [pinHeight, setPinHeight] = useState('250vh');
  const isMobile = useIsMobile();

  // Reveal bookkeeping must not survive a breakpoint change: the ref lives
  // across renders, so after desktop -> mobile -> desktop every card would
  // still be flagged revealed while its re-mounted inline style says
  // opacity: 0 — invisible cards that never reveal. Fresh state per layout.
  useEffect(() => {
    revealedRef.current = WATCHES.map(() => false);
    nextRevealAt.current = 0;
  }, [isMobile]);

  /* ------------------------------------------------------------------ *
   * Progress reporting (drives the navbar dot indicator)
   * ------------------------------------------------------------------ */
  const report = useCallback((active, total, inSection) => {
    const last = lastReport.current;
    if (last.active === active && last.total === total && last.inSection === inSection) {
      return;
    }
    lastReport.current = { active, total, inSection };
    emitCardProgress({ active, total, inSection });
  }, []);

  const reportMobile = useCallback(
    (inView) => {
      const el = scrollerRef.current;
      const total = WATCHES.length;
      if (!el) {
        report(0, total, inView);
        return;
      }
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 0;
      const active = Math.min(total - 1, Math.round(p * (total - 1)));
      report(active, total, inView);
    },
    [report]
  );

  /* The mobile carousel fires scroll events far faster than frames; coalesce
     them so the progress read (which touches layout) runs at most once per
     frame instead of once per event. */
  const mobileScrollRaf = useRef(0);
  const handleMobileScroll = useCallback(() => {
    if (mobileScrollRaf.current) return;
    mobileScrollRaf.current = requestAnimationFrame(() => {
      mobileScrollRaf.current = 0;
      reportMobile(mobileInView.current);
    });
  }, [reportMobile]);

  /* ------------------------------------------------------------------ *
   * Desktop: measure the pinned track (on resize / font load only)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (isMobile) return undefined;

    let frame = 0;

    const measure = () => {
      const pin = pinRef.current;
      const sticky = stickyRef.current;
      if (!pin || !sticky) return;

      // Card 0 must begin exactly where the section headline begins, so read
      // that edge instead of hard-coding a pad that drifts with viewport width.
      const heading = introHeadingRef.current;
      let startPad = START_PAD;
      if (heading) {
        startPad = Math.max(0, Math.round(heading.getBoundingClientRect().left));
      }

      const viewportW = sticky.clientWidth;
      const travel = Math.max(trackContentWidth(startPad) - viewportW, 0);
      const scrollDist = Math.max(travel * 2.9, window.innerHeight * 2);
      // Extra pinned scroll after the travel completes, so the finished row is
      // held on screen for a beat before the section releases.
      const hold = Math.round(window.innerHeight * END_HOLD);
      const height = window.innerHeight + scrollDist + hold;

      pin.style.height = `${height}px`;
      setPinHeight(`${height}px`);

      // The card row keeps a fixed distance from the top of the pinned stage,
      // capped so tall screens do not open a hole above it. Lifting the pin by
      // the same excess makes the gap under the intro copy exactly
      // INTRO_CARD_GAP at any viewport height, while the pinned position stays
      // put. The lifted part of the pin is transparent and pointer-events:none,
      // so nothing above is ever covered.
      const trackH = trackRef.current
        ? trackRef.current.getBoundingClientRect().height
        : 0;
      const centred = Math.max(0, (sticky.clientHeight - trackH) / 2);
      const stageTop = Math.min(centred, CARD_TOP_MAX);
      sticky.style.paddingTop = `${Math.round(stageTop)}px`;

      const intro = heading ? heading.parentElement : null;
      const copy = intro ? intro.lastElementChild : null;
      if (intro && copy) {
        const introBox = intro.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        const pad = Math.max(0, introBox.bottom - copyBox.bottom);
        const lift = Math.round(Math.max(stageTop + pad - INTRO_CARD_GAP, 0));
        pin.style.marginTop = `${-lift}px`;
      }

      // Cache everything the animation loop needs so it never has to read
      // layout again (reading during a transform write is what causes jank).
      const rect = pin.getBoundingClientRect();
      geom.current.pinTop = rect.top + window.scrollY;
      geom.current.scrollable = Math.max(height - window.innerHeight, 1);
      geom.current.travelScroll = Math.max(scrollDist, 1);
      geom.current.maxTravel = travel;
      geom.current.viewportW = viewportW;
      geom.current.startPad = startPad;

      // Before the loop takes over, park the track on the measured pad so the
      // first visible frame is already aligned.
      if (!runningRef.current && trackRef.current) {
        currentX.current = startPad;
        targetX.current = startPad;
        trackRef.current.style.transform = `translate3d(${startPad}px, 0, 0)`;
      }
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('load', scheduleMeasure);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {});
    }

    // Keep cached offsets honest if anything above the pin changes height
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(document.body);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('load', scheduleMeasure);
      if (ro) ro.disconnect();
    };
  }, [isMobile]);

  /* ------------------------------------------------------------------ *
   * Desktop: scroll-linked horizontal travel + card reveal
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (isMobile) return undefined;

    const section = sectionRef.current;
    const track = trackRef.current;
    if (!track) return undefined;

    track.style.transform = `translate3d(${START_PAD}px, 0, 0)`;

    let raf = 0;
    let running = false;
    let lastTime = 0;
    let lastWrittenX = Number.NEGATIVE_INFINITY;
    let lastPush = Number.NEGATIVE_INFINITY;

    const tick = (now) => {
      const g = geom.current;
      const dt = lastTime ? Math.min(now - lastTime, 64) : 16.7;
      lastTime = now;

      // 1. Where the track belongs, straight from scroll position. The travel
      //    already includes the start pad, so it must not be added twice. It
      //    completes before the pin releases — the tail is the end hold.
      const travelled = Math.max(0, window.scrollY - g.pinTop);
      const progress = Math.min(1, travelled / g.travelScroll);
      targetX.current = g.startPad - progress * g.maxTravel;

      // 2. Follow it with exponential smoothing. Time-based, so identical
      //    on 60Hz and 120Hz displays.
      const alpha = 1 - Math.exp(-dt / SMOOTH_MS);
      let next = currentX.current + (targetX.current - currentX.current) * alpha;
      if (Math.abs(targetX.current - next) < 0.25) next = targetX.current;
      currentX.current = next;

      if (Math.abs(next - lastWrittenX) > 0.05) {
        track.style.transform = `translate3d(${next}px, 0, 0)`;
        lastWrittenX = next;
      }

      // 3. Fan the cards out from the smoothing lag. Deriving this from an
      //    already-smoothed value keeps it wobble-free.
      const push = clamp(
        -(targetX.current - next) * PARALLAX_DAMPING,
        -PARALLAX_MAX,
        PARALLAX_MAX
      );
      if (Math.abs(push - lastPush) > 0.02) {
        for (let i = 0; i < itemRefs.current.length; i += 1) {
          const el = itemRefs.current[i];
          if (el) el.style.transform = `translate3d(${push * (i + 1)}px, 0, 0)`;
        }
        lastPush = push;
      }

      // 4. Reveal — computed from the same numbers, zero layout reads.
      const trigger = g.viewportW * REVEAL_TRIGGER;
      for (let i = 0; i < WATCHES.length; i += 1) {
        if (revealedRef.current[i]) continue;
        if (now < nextRevealAt.current) break;

        const cardLeft = next + push * (i + 1) + i * (CARD_WIDTH + BASE_GAP);
        if (cardLeft < trigger) {
          revealedRef.current[i] = true;
          nextRevealAt.current = now + REVEAL_THROTTLE;

          const el = revealRefs.current[i];
          if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0px) skewY(0deg)';
            const media = el.querySelector('[data-reveal-media]');
            if (media) media.style.transform = 'scale(1)';
          }
        } else {
          // cards are ordered left to right — nothing later can be ready yet
          break;
        }
      }

      // 5. Feed the navbar.
      const total = WATCHES.length;
      const active = Math.min(total - 1, Math.floor(progress * total));
      report(active, total, travelled > 0 && travelled < g.scrollable);

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      runningRef.current = true;
      lastTime = 0;

      // Snap into place so the first visible frame is already correct.
      const g = geom.current;
      const travelled = Math.max(0, window.scrollY - g.pinTop);
      const progress = Math.min(1, travelled / g.travelScroll);
      targetX.current = g.startPad - progress * g.maxTravel;
      currentX.current = targetX.current;
      lastWrittenX = Number.NEGATIVE_INFINITY;
      lastPush = Number.NEGATIVE_INFINITY;

      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      runningRef.current = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Only animate while the section is anywhere near the viewport.
    let io = null;
    if (section && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { rootMargin: '80% 0px 80% 0px', threshold: 0 }
      );
      io.observe(section);
    } else {
      start();
    }

    return () => {
      if (io) io.disconnect();
      stop();
    };
  }, [isMobile, report]);

  /* ------------------------------------------------------------------ *
   * Mobile: reveal cards as they enter the horizontal carousel
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isMobile) return undefined;

    const scroller = scrollerRef.current;
    const nodes = mobileRevealRefs.current.filter(Boolean);
    if (!nodes.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0px) skewY(0deg)';
          const media = el.querySelector('[data-reveal-media]');
          if (media) media.style.transform = 'scale(1)';
          io.unobserve(el);
        });
      },
      { root: scroller || null, threshold: 0.2 }
    );

    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [isMobile]);

  /* Mobile: track the carousel's visibility so the navbar knows when to show dots */
  useEffect(() => {
    if (!isMobile) return undefined;

    const section = sectionRef.current;
    if (!section) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        mobileInView.current = entry.isIntersecting;
        reportMobile(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    io.observe(section);
    return () => io.disconnect();
  }, [isMobile, reportMobile]);

  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        id="watch-compatibility"
        style={{
          background: '#F5F8E2',
          padding: '72px 0 80px',
          overflow: 'hidden',
        }}
      >
        <SectionIntro mobile />
        <div
          ref={scrollerRef}
          onScroll={handleMobileScroll}
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            padding: '12px 24px 32px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {WATCHES.map((watch, i) => (
            <div
              key={watch.id}
              ref={(el) => {
                mobileRevealRefs.current[i] = el;
              }}
              style={{
                flexShrink: 0,
                width: 240,
                scrollSnapAlign: 'start',
                opacity: 0,
                transform: `translateY(${REVEAL_RISE}px) skewY(${REVEAL_SKEW}deg)`,
                transition:
                  'opacity 0.6s ease, transform 1.2s cubic-bezier(0.165, 0.84, 0.44, 1)',
                willChange: 'transform, opacity',
              }}
            >
              <WatchCard watch={watch} mobile />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="watch-compatibility"
      style={{ background: '#F5F8E2', paddingTop: 96 }}
    >
      <SectionIntro headingRef={introHeadingRef} />

      <div
        ref={pinRef}
        data-card-pin="true"
        data-card-count={WATCHES.length}
        style={{
          position: 'relative',
          height: pinHeight,
          // The pin is lifted under the intro copy; keep that overlap inert so
          // it can never swallow clicks or hover on the sections above. Only
          // the card track re-enables pointer events.
          pointerEvents: 'none',
        }}
      >
        <div
          ref={stickyRef}
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            boxSizing: 'border-box',
            display: 'flex',
            // The row's distance from the top of the stage is set in JS (it is
            // capped on tall screens); the initial value only covers the first
            // paint, long before this section is on screen.
            alignItems: 'flex-start',
            paddingTop: 150,
            overflow: 'hidden',
          }}
        >
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: BASE_GAP,
              width: 'max-content',
              willChange: 'transform',
              transform: `translate3d(${START_PAD}px, 0, 0)`,
              backfaceVisibility: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {WATCHES.map((watch, i) => (
              <div
                key={watch.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                style={{ flexShrink: 0, willChange: 'transform' }}
              >
                <div
                  ref={(el) => {
                    revealRefs.current[i] = el;
                  }}
                  style={{
                    opacity: 0,
                    transform: `translateY(${REVEAL_RISE}px) skewY(${REVEAL_SKEW}deg)`,
                    transition:
                      'opacity 0.6s ease, transform 1.2s cubic-bezier(0.165, 0.84, 0.44, 1)',
                    willChange: 'transform, opacity',
                  }}
                >
                  <WatchCard watch={watch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ mobile = false, headingRef }) {
  return (
    <div
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: mobile ? '0 24px 8px' : '0 48px 24px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2
        ref={headingRef}
        style={{
          fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
          fontWeight: 900,
          fontSize: mobile ? 32 : 48,
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          color: '#1A1A1A',
          margin: '0 0 16px',
        }}
      >
        Works with the watch
        <br />
        you already wear.
      </h2>
      <p
        style={{
          fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
          fontWeight: 500,
          fontSize: mobile ? 15 : 17,
          lineHeight: 1.6,
          color: 'rgba(26, 26, 26, 0.65)',
          margin: 0,
          maxWidth: 520,
        }}
      >
        Pair once. Your watch becomes the microphone, and XOOZ handles the transcription,
        summaries, and search.
      </p>
    </div>
  );
}

function WatchCard({ watch, mobile = false }) {
  const [hovered, setHovered] = useState(false);
  const width = mobile ? 240 : CARD_WIDTH;
  const mediaH = mobile ? 300 : 440;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          height: mediaH,
          borderRadius: 23,
          background: watch.bg,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          data-reveal-media="true"
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${MEDIA_ZOOM})`,
            transition: 'transform 1.8s cubic-bezier(0.165, 0.84, 0.44, 1)',
            willChange: 'transform',
          }}
        >
          <img
            src={watch.image}
            alt={watch.brand}
            draggable={false}
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.7s cubic-bezier(0.165, 0.84, 0.44, 1)',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <h3
        style={{
          fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
          fontWeight: 900,
          fontSize: mobile ? 20 : 24,
          letterSpacing: '-0.03em',
          color: '#1A1A1A',
          margin: 0,
          paddingLeft: 2,
          lineHeight: 1.2,
        }}
      >
        {watch.brand}
      </h3>
    </article>
  );
}
