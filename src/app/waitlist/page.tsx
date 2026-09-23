'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

// ─── Font shorthands ──────────────────────────────────────────────────────────
const DISPLAY = "var(--font-space-grotesk), sans-serif";
const BODY    = "var(--font-geist-sans), sans-serif";
const JBMONO  = "var(--font-mono), monospace";

export default function WaitlistPage() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [specialization, setSpecialization] = React.useState('Creative & Design Agency');
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [focusedName, setFocusedName] = React.useState(false);
  const [focusedEmail, setFocusedEmail] = React.useState(false);
  const [focusedSpec, setFocusedSpec] = React.useState(false);
  const [accountEmail, setAccountEmail] = React.useState('');
  const [accountAccessBusy, setAccountAccessBusy] = React.useState(false);
  const [accountAccessMessage, setAccountAccessMessage] = React.useState('');

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, specialization }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to join the waitlist. Please try again.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to join the waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountEmail.trim() || accountAccessBusy) return;
    setAccountAccessBusy(true);
    setAccountAccessMessage('');
    try {
      const response = await fetch('/api/auth/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountEmail }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to request account access.');
      setAccountAccessMessage(payload.message || 'If an account exists, an access link is on its way.');
    } catch (error) {
      setAccountAccessMessage(error instanceof Error ? error.message : 'Unable to request account access.');
    } finally {
      setAccountAccessBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 80% 60% at 10% 10%, rgba(255,255,255,0.055) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 90% 15%, rgba(255,255,255,0.04) 0%, transparent 50%),
          radial-gradient(ellipse 70% 60% at 50% 95%, rgba(255,255,255,0.025) 0%, transparent 55%),
          #0a0a0a
        `,
        color: '#e8e8e8',
        fontFamily: BODY,
      }}
      className="relative select-none"
    >
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 24px',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px 12px 16px',
            background: scrolled ? '#111111' : 'rgba(17,17,17,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '60px',
            boxShadow: scrolled
              ? '8px 8px 18px #040404, -8px -8px 18px #1e1e1e, 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 0 0 1px rgba(255,255,255,0.05)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image
              src="/iris-logo-black-bg.png"
              alt="IrisOS"
              width={95}
              height={36}
              priority
              style={{
                height: '36px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex" style={{ gap: '4px' }}>
            <Link
              href="/"
              style={{
                fontFamily: BODY,
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.6)',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: '50px',
                transition: 'color 0.2s ease, background 0.2s ease',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8e8e8]"
            >
              Home
            </Link>
            <Link
              href="/#about"
              style={{
                fontFamily: BODY,
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.6)',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: '50px',
                transition: 'color 0.2s ease, background 0.2s ease',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8e8e8]"
            >
              About
            </Link>
            <Link
              href="/#features"
              style={{
                fontFamily: BODY,
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.6)',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: '50px',
                transition: 'color 0.2s ease, background 0.2s ease',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8e8e8]"
            >
              Features
            </Link>
          </nav>



          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-gray-300 focus:outline-none"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed md:hidden z-40 p-6 flex flex-col gap-4 neo-raised"
          style={{
            top: '90px',
            left: '24px',
            right: '24px',
            background: 'rgba(17, 17, 17, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '10px 10px 24px #040404, -10px -10px 24px #1e1e1e, 0 0 0 1px rgba(255,255,255,0.08)',
            border: 'none',
          }}
        >
          <nav className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: BODY,
                fontSize: '15px',
                color: 'rgba(232,232,232,0.8)',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                transition: 'background 0.2s',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)]"
            >
              Home
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: BODY,
                fontSize: '15px',
                color: 'rgba(232,232,232,0.8)',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                transition: 'background 0.2s',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)]"
            >
              About
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: BODY,
                fontSize: '15px',
                color: 'rgba(232,232,232,0.8)',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                transition: 'background 0.2s',
              }}
              className="hover:bg-[rgba(255,255,255,0.06)]"
            >
              Features
            </Link>

          </nav>
        </div>
      )}

      {/* Main Container */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '120px 24px 80px',
        }}
      >
        <div style={{ maxWidth: '580px', width: '100%', textAlign: 'center' }}>
          {!submitted ? (
            <>
              {/* Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: '#111111',
                  boxShadow: '4px 4px 10px #040404, -4px -4px 10px #1e1e1e',
                  borderRadius: '50px',
                  marginBottom: '28px',
                  fontFamily: JBMONO,
                  fontWeight: 400,
                  fontSize: '11px',
                  color: 'rgba(232,232,232,0.55)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.4)',
                  }}
                />
                Waitlist Registration
              </span>

              {/* Title */}
              <h1
                className="gradient-text"
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 5vw, 56px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  margin: '0 0 16px 0',
                }}
              >
                Join the Waitlist
              </h1>

              {/* Tagline */}
              <p
                style={{
                  fontFamily: BODY,
                  fontSize: '16px',
                  color: 'rgba(232,232,232,0.45)',
                  lineHeight: 1.6,
                  marginBottom: '40px',
                  margin: '0 0 40px 0',
                }}
              >
                Provide details about your agency to secure your clearance priority spot in our upcoming launch.
              </p>

              {/* Form Card */}
              <div
                className="neo-raised"
                style={{
                  padding: '40px 32px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'left',
                }}
              >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {submissionError && (
                    <p role="alert" style={{ margin: 0, color: '#fca5a5', fontSize: '14px', lineHeight: 1.5 }}>
                      {submissionError}
                    </p>
                  )}
                  {/* Name field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontFamily: JBMONO,
                        fontSize: '11px',
                        color: 'rgba(232,232,232,0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedName(true)}
                      onBlur={() => setFocusedName(false)}
                      placeholder="Jane Doe"
                      className="neo-input"
                      style={{
                        padding: '14px 22px',
                        fontFamily: BODY,
                        fontSize: '15px',
                        border: `1px solid ${focusedName ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                      }}
                    />
                  </div>

                  {/* Email field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontFamily: JBMONO,
                        fontSize: '11px',
                        color: 'rgba(232,232,232,0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedEmail(true)}
                      onBlur={() => setFocusedEmail(false)}
                      placeholder="jane@agency.com"
                      className="neo-input"
                      style={{
                        padding: '14px 22px',
                        fontFamily: BODY,
                        fontSize: '15px',
                        border: `1px solid ${focusedEmail ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                      }}
                    />
                  </div>

                  {/* Specialization field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontFamily: JBMONO,
                        fontSize: '11px',
                        color: 'rgba(232,232,232,0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Agency Specialization
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      onFocus={() => setFocusedSpec(true)}
                      onBlur={() => setFocusedSpec(false)}
                      className="neo-input"
                      style={{
                        padding: '14px 22px',
                        fontFamily: BODY,
                        fontSize: '15px',
                        border: `1px solid ${focusedSpec ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                        appearance: 'none',
                        cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='rgba(232,232,232,0.6)' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                        backgroundPosition: 'calc(100% - 20px) 50%',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '16px',
                        paddingRight: '48px',
                      }}
                    >
                      <option value="Creative & Design Agency" style={{ background: '#111', color: '#e8e8e8' }}>Creative & Design Agency</option>
                      <option value="Advertising & Marketing Agency" style={{ background: '#111', color: '#e8e8e8' }}>Advertising & Marketing Agency</option>
                      <option value="Web Development & Product Shop" style={{ background: '#111', color: '#e8e8e8' }}>Web Development & Product Shop</option>
                      <option value="Campaign Management Firm" style={{ background: '#111', color: '#e8e8e8' }}>Campaign Management Firm</option>
                      <option value="Other / Specialization" style={{ background: '#111', color: '#e8e8e8' }}>Other / Specialization</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="neo-button-accent"
                    style={{
                      fontFamily: BODY,
                      fontWeight: 600,
                      fontSize: '15px',
                      padding: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '8px',
                    }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit Registration'}
                  </button>
                </form>
              </div>
              <div style={{ marginTop: '28px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: '0 0 12px', fontFamily: BODY, fontSize: '14px', color: 'rgba(232,232,232,0.5)' }}>Already have an IrisOS account?</p>
                <form onSubmit={handleAccountAccess} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input type="email" required value={accountEmail} onChange={event => setAccountEmail(event.target.value)} placeholder="Your account email" className="neo-input" style={{ flex: '1 1 240px', minWidth: 0, padding: '12px 18px', fontFamily: BODY, fontSize: '14px' }} />
                  <button type="submit" disabled={accountAccessBusy} className="neo-button" style={{ padding: '12px 18px', fontFamily: BODY, fontSize: '13px', color: 'rgba(232,232,232,0.78)' }}>{accountAccessBusy ? 'Sending…' : 'Email me an access link'}</button>
                </form>
                {accountAccessMessage && <p role="status" style={{ margin: '12px 0 0', fontFamily: BODY, fontSize: '12px', lineHeight: 1.5, color: 'rgba(232,232,232,0.45)' }}>{accountAccessMessage}</p>}
              </div>
            </>
          ) : (
            /* Success Screen */
            <div
              className="neo-raised"
              style={{
                padding: '56px 40px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#0d0d0d',
                  boxShadow: 'inset 5px 5px 12px #040404, inset -5px -5px 12px #1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                  <path d="M7 14l5 5 9-9" stroke="rgba(232,232,232,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 600,
                  fontSize: '28px',
                  color: '#e8e8e8',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                You&apos;re on the list.
              </h2>

              <p
                style={{
                  fontFamily: BODY,
                  fontSize: '15px',
                  color: 'rgba(232,232,232,0.5)',
                  lineHeight: 1.6,
                  maxWidth: '400px',
                  margin: 0,
                }}
              >
                Thank you{name ? `, ${name}` : ''}. We have registered <strong>{email}</strong> for early access. Your secure signup link will arrive within 1–2 days.
              </p>

              <Link
                href="/"
                className="neo-button"
                style={{
                  fontFamily: BODY,
                  fontWeight: 500,
                  fontSize: '14px',
                  padding: '12px 28px',
                  textDecoration: 'none',
                  color: 'rgba(232,232,232,0.7)',
                  marginTop: '12px',
                }}
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
