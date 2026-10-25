import { useEffect, useState } from 'react';

/**
 * True when the viewport is at or below the 768px breakpoint the whole app
 * breaks on. One shared hook so every section flips its layout at the same
 * resize moment — the sections used to compute this once at render, so a
 * window resize changed nothing until a remount.
 */
const QUERY = '(max-width: 768px)';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = (event) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
