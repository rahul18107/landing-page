import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// localStorage flag set right before redirecting to Google, so the app can
// finish the waitlist signup when the user lands back on the site. Timestamped
// and expires after 15 minutes in case the flow is abandoned.
export const WAITLIST_PENDING_KEY = 'waitlist-google-pending';

/**
 * Sends the browser to Google's OAuth consent screen (no popup, full
 * redirect). Sets the timestamped pending flag first, so App.jsx can finish
 * the waitlist signup when the user comes back. Returns the error, or null
 * on success.
 */
export async function startGoogleSignup() {
  try {
    localStorage.setItem(WAITLIST_PENDING_KEY, String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      localStorage.removeItem(WAITLIST_PENDING_KEY);
      return error;
    }
    return null;
  } catch (err) {
    localStorage.removeItem(WAITLIST_PENDING_KEY);
    return err || true;
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
