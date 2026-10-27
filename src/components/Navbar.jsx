import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { CARD_PROGRESS_EVENT } from '../lib/cardProgress';
import useIsMobile from '../lib/useIsMobile';

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'watch-compatibility', label: 'Watches' },
  { id: 'privacy', label: 'Privacy' }
];

// One number controls the brand mark in BOTH navbar pills — they are two
// separate JSX branches (desktop vs mobile), each with its own <img>, so
// editing one file line never changed the variant you were looking at.
const BRAND_LOGO_HEIGHT = 44;
// Local, pre-trimmed copy of the Cloudinary logo (e_trim baked in): no CDN
// transform dependency, and the stable path is cached reliably.
const BRAND_LOGO_URL = '/logo-mark.png';

export default function Navbar({ onOpenWaitlist }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  // Drawer focus bookkeeping. Focus must land somewhere sensible when the
  // fullscreen menu opens (close button) and return to the opener when it
  // closes — but never on first mount, when the menu simply started closed.
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Live breakpoint, shared hook — same flip point as every other section.
  const isMobile = useIsMobile();

  // Card scroll progress coming from the pinned watch-card section
  const [cardProgress, setCardProgress] = useState({
    active: 0,
    total: 0,
    inSection: false
  });

  // Menu choreography: collapse the links, then swap in the dot indicator
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [snap, setSnap] = useState(false);
  const phaseRef = useRef(false);
  const phaseTimer = useRef(null);
  // Recent scroll speed in px/frame, so the swap can skip its animation when
  // the reader is flying past sections faster than the choreography can play.
  const scrollSpeedRef = useRef(0);

  // Drawer focus: entering the menu focuses its close button, leaving moves
  // focus back to the hamburger. wasOpenRef keeps the mount-time run (menu
  // starts closed) from stealing focus to the hamburger on page load.
  useEffect(() => {
    if (mobileMenuOpen) {
      closeBtnRef.current?.focus();
    } else if (wasOpenRef.current) {
      menuBtnRef.current?.focus();
    }
    wasOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  /* Scrolled state + active section. Geometry is cached and the handler runs
     at most once per frame, so scrolling never forces repeated layout reads. */
  useEffect(() => {
    let raf = 0;
    let heroHeight = 600;
    let vh = window.innerHeight;
    let sections = [];
    let lastScrolled = false;
    let lastActive = '';
    let prevY = typeof window !== 'undefined' ? window.scrollY : 0;

    const measure = () => {
      vh = window.innerHeight;

      const hero = document.getElementById('hero');
      heroHeight = hero ? hero.offsetHeight : 600;

      sections = [];
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        sections.push({
          id,
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY
        });
      }
    };

    const update = () => {
      raf = 0;
      const y = window.scrollY;

      // Smoothed distance travelled in the last frame (px/frame).
      scrollSpeedRef.current = scrollSpeedRef.current * 0.5 + Math.abs(y - prevY) * 0.5;
      prevY = y;

      const isScrolled = y > heroHeight * 0.5;
      if (isScrolled !== lastScrolled) {
        lastScrolled = isScrolled;
        setScrolled(isScrolled);
      }

      const line = y + vh * 0.4;
      let active = '';
      for (let i = 0; i < sections.length; i += 1) {
        const s = sections[i];
        if (s.top <= line && s.bottom > line) {
          active = s.id;
          break;
        }
      }
      if (active !== lastActive) {
        lastActive = active;
        setActiveSection(active);
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    const reschedule = () => {
      measure();
      schedule();
    };

    measure();
    update();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', reschedule);
    window.addEventListener('load', reschedule);

    // Re-cache if content above the anchor points changes height
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(reschedule);
      ro.observe(document.body);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', reschedule);
      window.removeEventListener('load', reschedule);
      if (ro) ro.disconnect();
    };
  }, []);

  /* Live card scroll progress -> navbar dot indicator */
  useEffect(() => {
    const handleProgress = (event) => setCardProgress(event.detail);
    window.addEventListener(CARD_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(CARD_PROGRESS_EVENT, handleProgress);
  }, []);

  /* Swap between the text links and the dots as the card section takes over */
  useEffect(() => {
    const inSection = cardProgress.inSection;
    if (phaseRef.current === inSection) return;

    phaseRef.current = inSection;
    if (phaseTimer.current) clearTimeout(phaseTimer.current);

    // Fast scroll: the collapse-then-swap sequence would still be playing by
    // the time the reader is already past the section, so switch instantly.
    if (scrollSpeedRef.current > 55) {
      setSnap(true);
      setMenuCollapsed(false);
      setShowDots(inSection);
      phaseTimer.current = setTimeout(() => setSnap(false), 80);
      return undefined;
    }

    // 1. collapse the menu out
    setSnap(false);
    setMenuCollapsed(true);

    // 2. once collapsed, cross-fade into the other state
    phaseTimer.current = setTimeout(() => {
      setShowDots(inSection);
      setMenuCollapsed(false);
    }, 180);

    return () => {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    };
  }, [cardProgress.inSection]);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div
        data-main-nav
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <header
          style={{
            pointerEvents: 'auto',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {isMobile ? (
            /* Mobile Navbar Pill */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F0F0F0',
                borderRadius: 18,
                padding: '0 16px 0 20px',
                gap: 4,
                height: 72,
                width: 'min(375px, calc(100vw - 32px))',
                boxShadow: scrolled ? '0 12px 32px rgba(0,0,0,0.15)' : 'none',
                border: '1px solid rgba(26,26,26,0.06)',
                transition: 'background-color 0.3s ease, box-shadow 0.3s ease'
              }}
            >
              {showDots && cardProgress.total > 0 ? (
                <CardDots
                  total={cardProgress.total}
                  active={cardProgress.active}
                  variant="mobile"
                />
              ) : (
                <div
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  data-cursor="logo"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    // Same optical centering as the desktop pill: the artwork's
                    // ink mass sits ~4.5px above its box center.
                    transform: 'translateY(4.5px)',
                    userSelect: 'none'
                  }}
                >
                  <img
                    src={BRAND_LOGO_URL}
                    alt="XOOZ, back to top"
                    draggable={false}
                    style={{
                      height: BRAND_LOGO_HEIGHT,
                      width: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              <button
                ref={menuBtnRef}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="xooz-mobile-menu"
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  background: '#1A1A1A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 43,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 4,
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ display: 'block', width: 16, height: 2, background: '#fff', borderRadius: 1 }} />
                <span style={{ display: 'block', width: 16, height: 2, background: '#fff', borderRadius: 1 }} />
              </button>
            </div>
          ) : (
            /* Desktop Navbar Pill */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                // Solid rather than a blurred translucent panel: the backdrop
                // filter re-blurred the moving page every frame and was a
                // major source of scroll stutter.
                background: scrolled ? '#EFEFEF' : '#F0F0F0',
                borderRadius: 18,
                padding: '0 21px',
                gap: 28,
                height: 81,
                boxShadow: scrolled
                  ? '0 16px 36px rgba(0, 0, 0, 0.12)'
                  : '0 8px 24px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(26,26,26,0.08)',
                whiteSpace: 'nowrap',
                // Deliberately not `all` — transitioning width here fought the
                // grid collapse and made the pill resize feel rubbery.
                transition:
                  'background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Brand Mark */}
              <div
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                data-cursor="logo"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  // No padding: the hover cursor-wrap hugs the artwork itself,
                  // not a padded box around it (matches the mobile wrapper).
                  padding: 0,
                  // Optical centering: the artwork's ink mass sits ~4.5px above
                  // its geometric center (measured), so the box-centered mark
                  // reads as floating high. Nudge down to center the MASS.
                  // The wrapper (not the img) carries the transform so the
                  // cursor-wrap rect follows the shifted mark.
                  transform: 'translateY(4.5px)',
                  userSelect: 'none',
                  flexShrink: 0
                }}
              >
                <img
                  src={BRAND_LOGO_URL}
                  alt="XOOZ, back to top"
                  draggable={false}
                  style={{
                    height: BRAND_LOGO_HEIGHT,
                    width: 'auto',
                    display: 'block'
                  }}
                />
              </div>

              {/* Collapsible middle — links, or the card scroll indicator */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: menuCollapsed ? '0fr' : '1fr',
                  transition: snap
                    ? 'none'
                    : 'grid-template-columns 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                    opacity: menuCollapsed ? 0 : 1,
                    transition: snap || menuCollapsed ? 'none' : 'opacity 0.25s ease'
                  }}
                >
                  {showDots && cardProgress.total > 0 ? (
                    <CardDots total={cardProgress.total} active={cardProgress.active} />
                  ) : (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {SECTIONS.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                              fontWeight: isActive ? 800 : 600,
                              fontSize: 15,
                              color: isActive ? '#F75E59' : '#1A1A1A',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderRadius: 12,
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.color = '#F75E59';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.color = '#1A1A1A';
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </nav>
                  )}
                </div>
              </div>

              {/* Waitlist CTA Button */}
              <button
                onClick={onOpenWaitlist}
                data-cursor="pointer"
                style={{
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  background: scrolled ? '#F75E59' : '#1A1A1A',
                  color: scrolled ? '#1A1A1A' : '#ffffff',
                  border: 'none',
                  borderRadius: 43,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: scrolled ? '0 8px 24px rgba(247, 94, 89, 0.35)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  if (!scrolled) e.currentTarget.style.background = '#F75E59';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  if (!scrolled) e.currentTarget.style.background = '#1A1A1A';
                }}
              >
                <span>Early Access</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </header>
      </div>

      {/* Full-Screen Mobile Drawer */}
      {isMobile && (
        <div
          id="xooz-mobile-menu"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: '#1A1A1A',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 28px',
            opacity: mobileMenuOpen ? 1 : 0,
            // visibility takes the closed drawer out of the accessibility tree
            // AND the tab order, so its links are not focusable while hidden.
            visibility: mobileMenuOpen ? 'visible' : 'hidden',
            pointerEvents: mobileMenuOpen ? 'auto' : 'none',
            // On close, let the 0.3s fade finish before visibility drops.
            transition: mobileMenuOpen
              ? 'opacity 0.3s ease'
              : 'opacity 0.3s ease, visibility 0s linear 0.3s',
            height: '100dvh'
          }}
        >
          {/* Top Close Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <img
              src={BRAND_LOGO_URL}
              alt="XOOZ"
              draggable={false}
              style={{
                height: 24,
                width: 'auto',
                display: 'block',
                // pure-black artwork -> solid light version for the dark drawer
                filter: 'brightness(0) invert(1)'
              }}
            />
            <button
              ref={closeBtnRef}
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                color: '#F75E59'
              }}
            >
              <X size={28} />
            </button>
          </div>

          {/* Links */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              flex: 1,
              justifyContent: 'center'
            }}
          >
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 900,
                  fontSize: 44,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: activeSection === item.id ? '#F75E59' : '#F5F8E2',
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom Waitlist CTA */}
          <div style={{ paddingBottom: 24 }}>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenWaitlist();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                background: '#F75E59',
                borderRadius: 14,
                padding: '18px 24px',
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: '#1A1A1A',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span>Join the Waitlist</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Scroll progress indicator for the watch-card section.
 * One dot per card — the active one stretches into a pill.
 */
function CardDots({ total, active, variant = 'desktop' }) {
  if (!total) return null;

  const isMobile = variant === 'mobile';
  const dotSize = isMobile ? 7 : 8;
  const activeWidth = isMobile ? 24 : 28;

  return (
    <div
      role="group"
      aria-label={`Card ${active + 1} of ${total}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 7,
        padding: '0 10px'
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            height: dotSize,
            width: i === active ? activeWidth : dotSize,
            borderRadius: 4,
            background: i === active ? '#1A1A1A' : 'rgba(26, 26, 26, 0.25)',
            transition:
              'width 0.22s cubic-bezier(0.33, 1, 0.68, 1), background 0.2s ease',
            flexShrink: 0
          }}
        />
      ))}
    </div>
  );
}
