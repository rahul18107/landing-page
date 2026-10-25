import React, { useEffect, useState, useRef } from 'react';

// Color definitions matching the palette
const COLOR_CORAL = '#F75E59';
const COLOR_DARK = '#1A1A1A';

// Linear interpolation (lerp)
function lerp(start, end, factor) {
  return (1 - factor) * start + factor * end;
}

// 8-point organic wobble deformer algorithm (from Umano Design Studio)
function getDeformedPoints(cx, cy, radius, frame, isExpanded) {
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const wave = isExpanded
      ? Math.sin(frame / 55 + i * 1.2) * 4 + Math.cos(frame / 40 + i * 2.1) * 3
      : Math.sin(frame / 90 + i * 1.1) * 1.2;
    points.push([
      cx + Math.cos(angle) * (radius + wave),
      cy + Math.sin(angle) * (radius + wave)
    ]);
  }
  return points;
}

// "Logo hug" easter egg: 8-point rounded-square outline laid out at the edge
// midpoints and inset corners of the logo box, with its own slow timing and a
// much smaller amplitude than the button wobble so the two reads differ.
function getLogoHugPoints(cx, cy, halfW, halfH, frame) {
  const inset = 0.82;
  const base = [
    [0, -halfH],
    [halfW * inset, -halfH * inset],
    [halfW, 0],
    [halfW * inset, halfH * inset],
    [0, halfH],
    [-halfW * inset, halfH * inset],
    [-halfW, 0],
    [-halfW * inset, -halfH * inset]
  ];
  return base.map(([px, py], i) => {
    const wave = Math.sin(frame / 62 + i * 0.9) * 0.6;
    return [cx + px + wave, cy + py + wave * 0.5];
  });
}

// Draw smooth closed cubic Bézier curves connecting the points
function drawClosedSpline(ctx, points) {
  const n = points.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n];
    const pCurr = points[i];
    const pNext = points[(i + 1) % n];
    const pNextNext = points[(i + 2) % n];

    const cp1x = pCurr[0] + (pNext[0] - pPrev[0]) / 6;
    const cp1y = pCurr[1] + (pNext[1] - pPrev[1]) / 6;
    const cp2x = pNext[0] - (pNextNext[0] - pCurr[0]) / 6;
    const cp2y = pNext[1] - (pNextNext[1] - pCurr[1]) / 6;

    if (i === 0) ctx.moveTo(pCurr[0], pCurr[1]);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pNext[0], pNext[1]);
  }
  ctx.closePath();
}

export default function CustomCursor() {
  const canvasRef = useRef(null);
  const dotRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only enable on desktop with fine pointer
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isHoverNone = window.matchMedia('(hover: none)').matches;
    if (!isTouch && !isCoarse && !isHoverNone) {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    const dot = dotRef.current;
    if (!canvas || !dot) return;

    const ctx = canvas.getContext('2d', { desynchronized: true });
    let frameId;
    let frameCount = 0;

    // Mouse coordinates (actual pointer)
    let mouseX = -200;
    let mouseY = -200;

    // Trailing organic circle coordinates
    let circleX = -200;
    let circleY = -200;

    let isFirstMove = true;
    let lerpSpeed = 0.18;
    let currentRadius = 14;
    let currentColor = COLOR_CORAL;

    let isHovering = false;
    let isSticky = false;
    let targetCenterX = 0;
    let targetCenterY = 0;
    let shouldHideCursor = false;

    // Logo-hug easter egg state (nav brand mark)
    let isLogoHug = false;
    let logoEl = null;
    let logoRect = null;

    // Pointer tracking state (declared before the resize handler, which resets
    // the cached geometry).
    let needsDetect = true;
    let hitTest = true; // ask the DOM which element is under the pointer
    let hoveredNode = null;
    let stickyEl = null;
    let stickyRect = null;
    let isScrolling = false;
    let scrollIdleTimer = 0;

    // Canvas resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Geometry cached for the magnetic cursor is stale after a resize.
      stickyRect = null;
      logoRect = null;
      needsDetect = true;
      hitTest = true;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Hide default OS cursor globally, except where a native cursor is
    // explicitly requested (e.g. the early-access dialog).
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      *, *::before, *::after {
        cursor: none !important;
      }
      [data-cursor-hide], [data-cursor-hide] * {
        cursor: none !important;
      }
      html[data-native-cursor], html[data-native-cursor] * {
        cursor: auto !important;
      }
      html[data-native-cursor] input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]),
      html[data-native-cursor] textarea {
        cursor: text !important;
      }
      html[data-native-cursor] a,
      html[data-native-cursor] button,
      html[data-native-cursor] select,
      html[data-native-cursor] [role="button"] {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Pointer tracking. The browser already hit-tests every mousemove to pick
    // the event target, so we reuse that instead of calling elementFromPoint
    // ourselves — that call forces a layout flush on every frame and was the
    // main thing fighting the scroll.
    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (isFirstMove) {
        circleX = mouseX;
        circleY = mouseY;
        isFirstMove = false;
        lerpSpeed = 0.18;
      }

      const target = e.target instanceof Element ? e.target : null;
      if (target && target !== hoveredNode) {
        hoveredNode = target;
        stickyRect = null; // geometry is re-read when the target changes
        needsDetect = true;
        hitTest = false;
      }
    };

    // While the page is scrolling the pointer is not really interacting with
    // anything, so hover detection waits until the scroll settles.
    const onScroll = () => {
      isScrolling = true;
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        isScrolling = false;
        stickyRect = null;
        needsDetect = true;
        hitTest = true;
      }, 140);
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const detect = () => {
      let hoveredElement = hoveredNode;
      if (hitTest || !hoveredElement) {
        hoveredElement = document.elementFromPoint(mouseX, mouseY);
        hoveredNode = hoveredElement;
        hitTest = false;
      }

      const hideTarget = hoveredElement?.closest('[data-cursor-hide]');
      shouldHideCursor = !!hideTarget;

      const noStick = hoveredElement?.closest('[data-cursor-no-stick]');

      // Logo-hug easter egg: checked before the generic sticky selector so the
      // blob takes the square shape instead of the button behavior. Center
      // snaps magnetically exactly like sticky mode; the render loop handles
      // the shape, and the rug color is forced dark for contrast.
      const logoTarget = !shouldHideCursor && !noStick
        ? hoveredElement?.closest('[data-cursor="logo"]')
        : null;

      if (logoTarget) {
        if (!logoRect || logoTarget !== logoEl) {
          logoEl = logoTarget;
          logoRect = logoTarget.getBoundingClientRect();
        }
        targetCenterX = logoRect.left + logoRect.width / 2;
        targetCenterY = logoRect.top + logoRect.height / 2;
        isHovering = true;
        isSticky = true;
        isLogoHug = true;
        lerpSpeed = 0.12;
        currentColor = COLOR_DARK;
        return;
      }

      isLogoHug = false;
      logoEl = null;
      logoRect = null;

      const stickyTarget = !shouldHideCursor && !noStick
        ? hoveredElement?.closest('a, button, [data-cursor="pointer"], [data-cursor="card"], input[type="submit"]')
        : null;

      if (stickyTarget) {
        // Read the box once per hovered element, not once per frame.
        if (!stickyRect || stickyTarget !== stickyEl) {
          stickyEl = stickyTarget;
          stickyRect = stickyTarget.getBoundingClientRect();
        }
        targetCenterX = stickyRect.left + stickyRect.width / 2;
        targetCenterY = stickyRect.top + stickyRect.height / 2;
        isHovering = true;
        isSticky = true;
        lerpSpeed = 0.12; // Smooth magnetic snapping
      } else {
        stickyEl = null;
        stickyRect = null;
        isHovering = false;
        isSticky = false;
        lerpSpeed = 0.18;
      }

      // Color zones (hero is coral #F75E59 -> cursor goes dark #1A1A1A for
      // contrast). Derived from the hit-test, so no extra geometry reads.
      const overHero = !!(hoveredElement && hoveredElement.closest('#hero'));
      const overDark = !!(hoveredElement && hoveredElement.closest('[data-cursor-dark]'));
      currentColor = overHero || overDark ? COLOR_DARK : COLOR_CORAL;
    };

    // Animation render loop
    let lastDotTransform = '';
    let lastDotColor = '';
    let lastDotOpacity = '';
    let lastCanvasOpacity = '';

    const render = () => {
      frameCount++;

      // Defer entirely to the OS pointer while a native-cursor surface (the
      // early-access dialog) is up.
      const nativeCursor = document.documentElement.hasAttribute('data-native-cursor');

      // Detect hover state at most once per frame, never mid-scroll.
      if (needsDetect && !isScrolling && !nativeCursor) {
        needsDetect = false;
        detect();
      }

      // Update center dot (pinpoint at actual mouse position)
      const dotTransform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
      if (dotTransform !== lastDotTransform) {
        dot.style.transform = dotTransform;
        lastDotTransform = dotTransform;
      }

      if (currentColor !== lastDotColor) {
        dot.style.background = currentColor;
        lastDotColor = currentColor;
      }

      // Fade out center dot when hovering over a button (magnetic snap)
      const dotOpacity = shouldHideCursor || isSticky || nativeCursor ? '0' : '1';
      if (dotOpacity !== lastDotOpacity) {
        dot.style.opacity = dotOpacity;
        lastDotOpacity = dotOpacity;
      }

      const canvasOpacity = shouldHideCursor || nativeCursor ? '0' : '1';
      if (canvasOpacity !== lastCanvasOpacity) {
        canvas.style.opacity = canvasOpacity;
        lastCanvasOpacity = canvasOpacity;
      }

      // Nothing to animate and the page is scrolling: skip the canvas work
      // entirely. The blob is static in viewport space, so redrawing it only
      // steals frame time from the scroll itself.
      const atRest =
        !isHovering &&
        Math.abs(circleX - mouseX) < 0.5 &&
        Math.abs(circleY - mouseY) < 0.5 &&
        Math.abs(currentRadius - 14) < 0.5;

      if (nativeCursor || document.hidden || (isScrolling && atRest)) {
        frameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate target position for organic circle
      const destX = isHovering ? targetCenterX : mouseX;
      const destY = isHovering ? targetCenterY : mouseY;

      // Smooth lag / magnetic pull
      circleX = lerp(circleX, destX, lerpSpeed);
      circleY = lerp(circleY, destY, lerpSpeed);

      // Smooth radius transition: 14px in free space -> 34px over buttons.
      // The logo-hug square is sized from the logo box, not the radius.
      if (!isLogoHug) {
        currentRadius = lerp(currentRadius, isHovering ? 34 : 14, 0.08);
      }

      if (isLogoHug && logoRect) {
        // Shift-easter-egg: black rounded square wrapped around the nav logo,
        // wobbling gently (slower timing, smaller amplitude than the button).
        const pad = 0;
        const points = getLogoHugPoints(
          circleX,
          circleY,
          logoRect.width / 2 + pad,
          logoRect.height / 2 + pad,
          frameCount
        );
        drawClosedSpline(ctx, points);

        ctx.fillStyle = currentColor;
        ctx.globalAlpha = 0.1;
        ctx.fill();

        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
      } else {
        // Generate 8 organic wobble points
        const points = getDeformedPoints(circleX, circleY, currentRadius, frameCount, isHovering && currentRadius > 24);

        // Draw smooth closed Bézier curve
        drawClosedSpline(ctx, points);

        if (isSticky) {
          // Hover state: semi-transparent wash fill + stroke
          ctx.fillStyle = currentColor;
          ctx.globalAlpha = 0.12;
          ctx.fill();

          ctx.strokeStyle = currentColor;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
        } else {
          // Free-moving state: crisp thin organic ring
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.55;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(scrollIdleTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousemove', onMouseMove);
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Center pinpoint dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: COLOR_CORAL,
          pointerEvents: 'none',
          zIndex: 99998,
          willChange: 'transform',
          transition: 'background 0.25s ease, opacity 0.15s ease'
        }}
      />

      {/* Fullscreen canvas for the organic trailing Bézier deformer */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 99997
        }}
      />
    </>
  );
}
