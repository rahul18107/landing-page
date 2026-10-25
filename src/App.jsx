import React, { useState, useEffect } from 'react';
import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import PrivacyStatement from './components/PrivacyStatement.jsx';
import Footer from './components/Footer.jsx';
import WaitlistModal from './components/WaitlistModal.jsx';
import WatchCards from './components/WatchCards.jsx';
import {
  supabase,
  supabaseConfigured,
  WAITLIST_PENDING_KEY,
} from './lib/supabase';

// Dev-only chatter: keeps [auth]/[waitlist] logs out of the production bundle
// (import.meta.env.DEV inlines to false in the vite build).
const debug = (...args) => {
  if (import.meta.env.DEV) console.log(...args);
};

const PENDING_MAX_AGE = 15 * 60 * 1000; // abandoned flows expire after 15 min

export default function App() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  // Set when the user completes a Google signup via OAuth redirect, so the
  // modal opens straight on the confirmation screen.
  const [googleSignedUp, setGoogleSignedUp] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;

    // Captured once at mount: a genuine Google return trip loads the page with
    // OAuth artifacts in the URL (implicit-flow hash tokens or PKCE code).
    // Someone backing out of the consent screen lands back here with a clean
    // URL — flag + already-signed-in session is NOT proof of consent, and must
    // not show the confirmation.
    const isOAuthReturn =
      /\b(access_token|id_token)=/i.test(window.location.hash) ||
      /(^|[?&])code=/.test(window.location.search);

    // Completes a Google waitlist signup: user returned signed-in after
    // clicking "Continue with Google". Stores the Google email, opens the
    // modal on the confirmation screen, cleans up the pending flag.
    const finishPendingGoogleSignup = async (session, source) => {
      const pendingAt = Number(localStorage.getItem(WAITLIST_PENDING_KEY));
      if (!pendingAt || Date.now() - pendingAt > PENDING_MAX_AGE) {
        if (pendingAt) localStorage.removeItem(WAITLIST_PENDING_KEY);
        return;
      }
      if (!isOAuthReturn) return;
      const googleEmail = session?.user?.email;
      if (import.meta.env.DEV) {
        debug(`[waitlist] completing Google signup via ${source}`, googleEmail);
      }
      if (!googleEmail) return;
      localStorage.removeItem(WAITLIST_PENDING_KEY);
      try {
        const { error: insertError } = await supabase
          .from('waitlist')
          .insert({ email: googleEmail.trim().toLowerCase() });
        if (insertError && insertError.code !== '23505') {
          // Unique-violation (already on the list) still counts as success.
          console.error('[waitlist] Google signup insert failed:', insertError);
        } else {
        if (import.meta.env.DEV) {
          debug('[waitlist] Google email stored in waitlist table');
        }
        }
      } catch (err) {
        console.error('[waitlist] Google signup insert threw:', err);
      }
      setGoogleSignedUp(true);
      setWaitlistOpen(true);
    };

    // Subscribe BEFORE asking for the current session: the SIGNED_IN event
    // emitted while supabase-js processes the OAuth return URL could
    // otherwise slip through before the listener exists.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (import.meta.env.DEV) {
          debug('[auth] state change:', event, session?.user?.email ?? null);
        }
        // Both INITIAL_SESSION (already had a session from a previous visit)
        // and SIGNED_IN (fresh tokens from the redirect) carry the user.
        finishPendingGoogleSignup(session, `event:${event}`);
      }
    );

    // Also covers the case where the session was already materialized by the
    // time React mounted (page load IS the return trip from Google).
    supabase.auth.getSession().then(({ data }) => {
      finishPendingGoogleSignup(data.session, 'getSession');
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Inside the dialog the OS pointer takes over — the custom blob cursor is
  // hidden and the native one is restored.
  useEffect(() => {
    const root = document.documentElement;
    if (waitlistOpen) root.setAttribute('data-native-cursor', '');
    else root.removeAttribute('data-native-cursor');
    return () => root.removeAttribute('data-native-cursor');
  }, [waitlistOpen]);

  const handleOpenWaitlist = () => {
    setWaitlistOpen(true);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#F5F8E2', overflowX: 'clip' }}>
      {/* Subtle Noise Texture Overlay */}
      <div className="noise-overlay" />

      {/* Trailing Custom Cursor */}
      <CustomCursor />

      {/* 1. Refined Navigation Bar */}
      <Navbar onOpenWaitlist={handleOpenWaitlist} />

      {/* Main Sections */}
      <main>
        {/* 2. Hero with Product Message, Email Signup & Phone Visual */}
        <Hero onJoinWaitlist={() => setWaitlistOpen(true)} />

        
        {/* 3. Compact "How it works" section */}
        <HowItWorks />

        <WatchCards />

        

        {/* 4. Minimal Privacy Statement */}
        <PrivacyStatement />
      </main>

      {/* 5. Refined Footer */}
      <Footer onOpenWaitlist={handleOpenWaitlist} />

      {/* Interactive Waitlist Modal */}
      <WaitlistModal
        isOpen={waitlistOpen}
        onClose={() => {
          setWaitlistOpen(false);
          setGoogleSignedUp(false);
        }}
        preset={googleSignedUp ? 'google' : null}
      />
    </div>
  );
}
