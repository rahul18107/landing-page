/**
 * Lightweight pub/sub used to stream the watch-card scroll progress to the
 * navbar without re-rendering the whole page tree on every frame.
 */
export const CARD_PROGRESS_EVENT = 'ykw:cards-progress';

export function emitCardProgress(detail) {
  window.dispatchEvent(new CustomEvent(CARD_PROGRESS_EVENT, { detail }));
}
