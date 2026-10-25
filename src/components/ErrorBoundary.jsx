import React from 'react';

/**
 * Wraps the app at the root and keeps any render crash from surfacing as a
 * blank page. Only class components can be error boundaries.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Errors stay logged in production — the crash report is the only
    // signal we'd get back from a visitor.
    console.error('[xooz] render crash:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          background: '#F5F8E2',
          color: '#1A1A1A',
          fontFamily: "'Glonimove', 'Plus Jakarta Sans', sans-serif",
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
          Something went wrong on our end.
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(26, 26, 26, 0.7)' }}>
          A refresh usually fixes it. If it keeps happening, come back a bit later.
        </p>
        <button
          onClick={() => window.location.reload()}
          data-cursor="pointer"
          style={{
            marginTop: 6,
            background: '#1A1A1A',
            color: '#ffffff',
            border: 'none',
            borderRadius: 9999,
            padding: '14px 28px',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Reload the page
        </button>
      </div>
    );
  }
}
