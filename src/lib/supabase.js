import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// localStorage flag set right before redirecting to Google, so the app can
// finish the waitlist signup when the user lands back on the site. Timestamped
// and expires after 15 minutes in case the flow is abandoned. Only used by the
// redirect fallback — the in-page popup flow finishes on its own.
export const WAITLIST_PENDING_KEY = 'waitlist-google-pending';

// OAuth client ID of this site's own Google Identity flow. When set, the
// Google account chooser shows the site's own domain (xooz.app) instead of
// the Supabase project URL. Public info — safe to ship in the bundle.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Google Identity Services: loads the GIS script once. Resolves when
// window.google.accounts.id is usable, rejects if the script can't load
// (e.g. an extension or a strict network blocked it).
let gisLoadPromise = null;
function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisLoadPromise) {
    gisLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoadPromise = null;
        script.remove();
        reject(new Error('google-identity-script-unavailable'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoadPromise;
}

// The official Google button, rendered offscreen. Clicking it programmatically
// (chained to the real click on our own button) opens the account chooser —
// the popup whose "to continue to" line shows this site's domain, not
// Supabase's. Initialized once and reused for every signup.
let gisButtonReady = null;
let gisButtonHost = null;
function ensureGoogleButton() {
  if (!gisButtonReady) {
    gisButtonReady = new Promise((resolve, reject) => {
      gisButtonHost = document.createElement('div');
      gisButtonHost.style.cssText =
        'position:fixed;left:-10000px;top:0;width:240px;height:44px;opacity:0;pointer-events:none;';
      document.body.appendChild(gisButtonHost);
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          auto_select: false,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            const pending = chooserWaiter;
            if (pending && response?.credential) {
              pending.settle(response.credential, null);
            }
          },
        });
        window.google.accounts.id.renderButton(gisButtonHost, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
        });
        resolve();
      } catch (err) {
        gisButtonReady = null;
        gisButtonHost?.remove();
        gisButtonHost = null;
        reject(err);
      }
    });
  }
  return gisButtonReady;
}

// Active waiter while the account chooser is open. GIS gives no callback when
// the chooser is dismissed without picking, so a generous timeout unsticks
// the UI (the caller stops quietly instead of showing an error).
let chooserWaiter = null;

function openGoogleChooser() {
  if (chooserWaiter) return chooserWaiter.promise; // chooser already open
  let resolveFn;
  let rejectFn;
  const promise = new Promise((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });
  const settle = (value, err) => {
    clearTimeout(timer);
    chooserWaiter = null;
    if (err) rejectFn(err);
    else resolveFn(value);
  };
  const timer = setTimeout(
    () => settle(null, Object.assign(new Error('chooser-dismissed'), { code: 'cancelled' })),
    180000
  );
  chooserWaiter = { promise, settle };
  // Open the chooser: click the offscreen official button (this runs inside
  // the user's click, so the popup is allowed), or the One Tap prompt if the
  // button iframe isn't there for some reason.
  const buttonFrame = gisButtonHost?.querySelector('iframe');
  if (buttonFrame) buttonFrame.click();
  else window.google.accounts.id.prompt();
  return promise;
}

/**
 * Starts the Google waitlist signup. Prefers Google Identity Services: an
 * in-page popup whose account chooser shows the site's own domain (xooz.app),
 * then signs in with the returned ID token — no redirect round-trip at all.
 * Falls back to the classic redirect through Supabase when the popup isn't
 * available (no client id configured, or the GIS script was blocked); that
 * chooser necessarily shows the Supabase project domain, and App.jsx
 * completes the signup when the browser returns.
 *
 * Resolves with a result object:
 *   { email }       — signed in in-page; the caller stores it and shows the
 *                     confirmation screen itself.
 *   { redirecting } — fallback redirect started; the page is navigating away.
 *   { cancelled }   — user dismissed the chooser; caller stops quietly.
 *   { error }       — could not start; caller shows a message.
 */
export async function startGoogleSignup() {
  if (googleClientId) {
    try {
      await loadGoogleIdentity();
      await ensureGoogleButton();
      const credential = await openGoogleChooser();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });
      if (error) {
        console.error('[auth] Supabase rejected the Google ID token:', error.message);
        return { error };
      }
      return { email: data?.session?.user?.email ?? null };
    } catch (err) {
      if (err?.code === 'cancelled') return { cancelled: true };
      console.error('[auth] Google Identity popup unavailable, using redirect fallback:', err);
      // fall through to the redirect fallback
    }
  }

  try {
    localStorage.setItem(WAITLIST_PENDING_KEY, String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      localStorage.removeItem(WAITLIST_PENDING_KEY);
      return { error };
    }
    return { redirecting: true };
  } catch (err) {
    localStorage.removeItem(WAITLIST_PENDING_KEY);
    return { error: err || new Error('oauth-start-failed') };
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
