import React, { useState, useEffect, useRef } from 'react';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import {
  supabase,
  supabaseConfigured,
  startGoogleSignup,
} from '../lib/supabase';
import GoogleMark from './GoogleMark.jsx';

// Profile link for the "Follow along on X" nudge on the confirmation screen.
// TODO: replace the placeholder with your real X profile URL.
const X_PROFILE_URL = 'https://x.com/not_rahul_';

export default function WaitlistModal({ isOpen, onClose, preset = null }) {
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('email');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const emailRef = useRef(null);
  const doneRef = useRef(null);

  // Fresh form every time the dialog is opened. `preset` shows the confirmation
  // screen on open (used for Google signups that completed while redirecting).
  useEffect(() => {
    if (isOpen) {
      setSubmitted(preset === 'google');
      setMethod(preset === 'google' ? 'google' : 'email');
      setSubmitting(false);
      setError('');
      setEmail('');
    }
  }, [isOpen, preset]);

  // Lock body scroll while the dialog is up so the page can't scroll behind
  // the backdrop.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Escape closes the dialog; Tab is trapped inside it so focus can never
  // reach the page behind the modal.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const items = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!items.length) return;

      const active = document.activeElement;
      const inside = dialogRef.current.contains(active);
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus the active screen's first control: the email field for the form,
  // the Done button once a confirmation is showing (email submit or Google).
  useEffect(() => {
    if (!isOpen) return;
    const target = submitted ? doneRef.current : emailRef.current;
    if (target) target.focus();
  }, [isOpen, submitted]);

  if (!isOpen) return null;

  const validateEmail = (value) => {
    const v = (value || '').trim();
    if (!v) return 'Add your email so we can send your invite.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That email doesn't look right, check it once more.";
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;

    if (!supabaseConfigured) {
      setError('The backend is not configured yet. Supabase keys are missing.');
      return;
    }

    setSubmitting(true);
    setMethod('email');
    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ email: email.trim().toLowerCase() });

      if (
        insertError &&
        insertError.code !== '23505' // unique violation = already on the list
      ) {
        throw insertError;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong on our end. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Real Google OAuth via Supabase: redirect to Google, then App.jsx picks up
  // the session on return, stores the email, and shows the confirmation screen.
  const handleGoogle = async () => {
    setError('');
    if (!supabaseConfigured) {
      setError('The backend is not configured yet. Supabase keys are missing.');
      return;
    }
    const oauthError = await startGoogleSignup();
    if (oauthError) {
      setError('Could not start Google sign-in. Please try again.');
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 9999,
    background: '#ffffff',
    border: '1.5px solid rgba(26, 26, 26, 0.2)',
    color: '#1A1A1A',
    fontSize: 15,
    fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get early access"
      onMouseDown={(e) => {
        if (e.button === 0) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: '#F5F8E2',
          color: '#1A1A1A',
          borderRadius: 24,
          padding: '40px 36px',
          maxWidth: 460,
          width: '100%',
          border: '2px solid #1A1A1A',
          position: 'relative',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.4)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(26, 26, 26, 0.08)',
            border: 'none',
            color: '#1A1A1A',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <div>
            
            <h3
              style={{
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 900,
                fontSize: 28,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                margin: '0 0 10px',
                color: '#1A1A1A',
              }}
            >
              Get Early Access
            </h3>

            <form
              noValidate
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <label
                htmlFor="waitlist-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: 8,
                }}
              >
                Email Address
              </label>
              <input
                ref={emailRef}
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'waitlist-email-error' : undefined}
                className="field"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                style={{
                  ...fieldStyle,
                  borderColor: error ? '#F75E59' : 'rgba(26, 26, 26, 0.2)',
                }}
                onFocus={(e) => (e.target.style.borderColor = error ? '#F75E59' : '#1A1A1A')}
                onBlur={(e) =>
                  (e.target.style.borderColor = error ? '#F75E59' : 'rgba(26, 26, 26, 0.2)')
                }
              />

              <div style={{ minHeight: 20, marginTop: 8 }}>
                {error && (
                  <p
                    id="waitlist-email-error"
                    role="alert"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      margin: 0,
                      fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: '#1A1A1A',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#F75E59',
                        flexShrink: 0,
                      }}
                    />
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                data-cursor="pointer"
                disabled={submitting}
                style={{
                  marginTop: 4,
                  background: '#1A1A1A',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 9999,
                  padding: '16px',
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (submitting) return;
                  e.currentTarget.style.background = '#F75E59';
                  e.currentTarget.style.color = '#1A1A1A';
                }}
                onMouseLeave={(e) => {
                  if (submitting) return;
                  e.currentTarget.style.background = '#1A1A1A';
                  e.currentTarget.style.color = '#ffffff';
                }}
              >
                <span>{submitting ? 'Securing your spot…' : 'Request Invitation'}</span>
                {submitting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
              <span style={{ flex: 1, height: 1, background: 'rgba(26, 26, 26, 0.15)' }} />
              <span
                style={{
                  fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(26, 26, 26, 0.45)',
                }}
              >
                or
              </span>
              <span style={{ flex: 1, height: 1, background: 'rgba(26, 26, 26, 0.15)' }} />
            </div>

            {/* Google — the second option */}
            <button
              type="button"
              onClick={handleGoogle}
              data-cursor="pointer"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '15px 18px',
                borderRadius: 9999,
                background: '#1A1A1A',
                color: '#ffffff',
                border: 'none',
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(26, 26, 26, 0.28)',
                transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F75E59';
                e.currentTarget.style.color = '#1A1A1A';
                e.currentTarget.style.transform = 'scale(1.015)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1A1A1A';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#ffffff',
                  flexShrink: 0,
                  lineHeight: 0
                }}
              >
                <GoogleMark size={16} />
              </span>
              <span style={{ display: 'block', position: 'relative', top: 0.5 }}>
                Continue with Google
              </span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Check size={28} color="#F75E59" strokeWidth={3} />
            </div>

            <h3 style={{ fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 26, margin: '0 0 10px' }}>
              Thanks!
            </h3>

            <p style={{ fontSize: 15, color: 'rgba(26, 26, 26, 0.8)', lineHeight: 1.6, margin: '0 0 18px' }}>
              {method === 'google' ? (
                <>Your spot is saved.</>
              ) : (
                <>
                  Your spot is saved with email <strong style={{ color: '#F75E59' }}>{email}</strong>.
                </>
              )}
            </p>

            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              data-cursor="pointer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                width: '100%',
                justifyContent: 'center',
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: '#1A1A1A',
                textDecoration: 'none',
                margin: '0 0 22px',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F75E59')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1A1A1A')}
            >
              <span>Follow along on X</span>
            </a>

            <button
              ref={doneRef}
              onClick={onClose}
              style={{
                width: '100%',
                background: '#1A1A1A',
                color: '#ffffff',
                border: 'none',
                borderRadius: 9999,
                padding: '14px',
                fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Done &amp; Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
