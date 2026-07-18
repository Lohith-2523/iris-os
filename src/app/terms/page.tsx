'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

// ─── Font shorthands ──────────────────────────────────────────────────────────
const DISPLAY = "'Space Grotesk', sans-serif";
const BODY    = "'Geist', sans-serif";
const MONO    = "'Geist Mono', monospace";
const JBMONO  = "'JetBrains Mono', monospace";

export default function TermsOfServicePage() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

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
            <img
              src="/iris-logo-black-bg.png"
              alt="Iris OS"
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

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/#waitlist"
              className="neo-button-accent"
              style={{
                fontFamily: BODY,
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 22px',
                textDecoration: 'none',
                color: '#0a0a0a',
                border: 'none',
              }}
            >
              Request Early Access
            </Link>
          </div>

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
          <Link
            href="/#waitlist"
            onClick={() => setMobileMenuOpen(false)}
            className="neo-button-accent"
            style={{
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: '14px',
              padding: '12px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#0a0a0a',
              marginTop: '8px',
            }}
          >
            Request Early Access
          </Link>
        </div>
      )}

      {/* Hero Banner */}
      <section
        style={{
          paddingTop: '140px',
          paddingBottom: '60px',
          paddingLeft: '24px',
          paddingRight: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            Legal Terms
          </span>

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
            Terms of Service
          </h1>

          <p
            style={{
              fontFamily: MONO,
              fontSize: '11px',
              color: 'rgba(232,232,232,0.4)',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Last Updated: June 27, 2026 • Shards Media
          </p>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-6xl mx-auto py-12 px-6 grid gap-10 md:grid-cols-12">
        {/* Document Index (Left side in desktop) */}
        <aside className="md:col-span-4 space-y-4">
          <div
            className="neo-raised animate-fade-in-up"
            style={{
              padding: '24px',
              position: 'sticky',
              top: '120px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '13px',
                color: '#e8e8e8',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              Document Sections
            </span>
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontFamily: JBMONO,
                fontSize: '11px',
                textTransform: 'uppercase',
              }}
            >
              {[
                { id: 'acceptance', label: '1. Acceptance of Terms' },
                { id: 'accounts', label: '2. Account Credentials' },
                { id: 'billing', label: '3. Subscription Billing' },
                { id: 'integrations', label: '4. Third-Party Connections' },
                { id: 'acceptable-use', label: '5. Platform Acceptable Use' },
                { id: 'liability', label: '6. Limitation of Liability' },
                { id: 'governing-law', label: '7. Governing Law' },
                { id: 'contact', label: '8. Legal Contact' },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  style={{
                    color: 'rgba(232,232,232,0.45)',
                    textDecoration: 'none',
                    transition: 'color 0.2s, padding-left 0.2s',
                  }}
                  className="hover:text-white hover:pl-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Legal Text (Right side) */}
        <article className="md:col-span-8 space-y-8">
          {/* Section 1 */}
          <section
            id="acceptance"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              1. Acceptance of Terms & Services
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Welcome to Iris OS (the &quot;Platform&quot; or &quot;Services&quot;), operated by Shards Media (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). 
              By registering an account, purchasing a subscription tier, or accessing the workspace console, you, the user (&quot;Customer&quot;, &quot;you&quot;), 
              agree to be legally bound by these Terms of Service, which incorporate all compliance requirements under GDPR, the Digital Personal Data 
              Protection (DPDP) Act, and applicable global commerce and technology regulations. If you do not agree to these terms, do not access 
              the Platform.
            </p>
          </section>

          {/* Section 2 */}
          <section
            id="accounts"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              2. Account Registration & Credentials Gating
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              To deploy an agency workspace, you must create a corporate profile linked to a valid business email. You are fully responsible 
              for securing access keys and authorization credentials. Iris OS supports secondary enterprise authentication gateways, 
              including Google Authentication and Notion Authentication APIs.
            </p>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: '#e8e8e8',
                fontWeight: 600,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              You agree to safeguard your authentication secrets. Shards Media cannot and will not be liable for unauthorized data extraction, 
              ledger manipulation, or operational damage resulting from leaked account credentials or third-party token exposure.
            </p>
          </section>

          {/* Section 3 */}
          <section
            id="billing"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              3. Subscription Billing, Upgrades, & Cancellations
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Platform services are divided into three standard tiers:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Basic Plan ($99/mo)', desc: 'Restricts access to a single agency specialization (plus optional $29 add-on).' },
                { title: 'Pro Plan ($299/mo)', desc: 'Grants workspace clearance for up to 5 agency specializations.' },
                { title: 'Advanced Plan ($599/mo)', desc: 'Grants unlimited clearance for all 10+ agency specializations.' }
              ].map((li, idx) => (
                <li
                  key={idx}
                  style={{
                    fontFamily: BODY,
                    fontSize: '14px',
                    color: 'rgba(232,232,232,0.65)',
                    lineHeight: 1.7,
                  }}
                >
                  <strong style={{ color: '#e8e8e8' }}>{li.title}:</strong> {li.desc}
                </li>
              ))}
            </ul>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Subscriptions are billed monthly on a recurring schedule based on the date of purchase. Upgrades take effect immediately 
              with pro-rated charges applied. Downgrades or cancellations will take effect at the end of the current billing cycle. 
              Refunds are not issued for partial monthly billing cycles.
            </p>
          </section>

          {/* Section 4 */}
          <section
            id="integrations"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              4. Third-Party Connections & API Integrations
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Iris OS integrates directly with external platforms, including Google Services, Notion API, Canva design interfaces, 
              and Meta Ads portals. By enabling these integrations:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                'You warrant that you hold sufficient administrative permissions to connect these data endpoints.',
                'You authorize Iris OS to retrieve and store connection tokens required to sync files and performance metrics.',
                'You acknowledge that company connections are governed by third-party developer policies, and Shards Media is not responsible for API outages or service termination on external platforms.',
                'You retain the right to terminate third-party API connections at any time. For Meta integrations, you can deauthorize the application or initiate user data deletion request flows to purge all campaign, ad, and lead records from active databases.'
              ].map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    fontFamily: BODY,
                    fontSize: '14px',
                    color: 'rgba(232,232,232,0.65)',
                    lineHeight: 1.7,
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Section 5 */}
          <section
            id="prism-ai"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              5. Prism AI Processing & Optional Data-Sharing
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Iris OS contains AI-powered analysis features (&quot;Prism AI&quot;) that utilize external language models (including Google Gemini, OpenAI ChatGPT, and Claude) to analyze your manual cost ledgers and agency leads.
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                'Opt-In Consent: By default, database records are not shared with AI models. You must explicitly opt-in to enable Prism AI analysis of your financial transactions and leads database.',
                'Control & Revocation: You can decline this sharing or instantly revoke/decline access at any time via Settings > AI Settings & Data Privacy.',
                'Fallback Mode: If consent is disabled or revoked, Prism AI automatically shifts to a general reasoning mode without accessing your live transaction tables or lead databases.'
              ].map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    fontFamily: BODY,
                    fontSize: '14px',
                    color: 'rgba(232,232,232,0.65)',
                    lineHeight: 1.7,
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6 */}
          <section
            id="acceptable-use"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              6. Platform Acceptable Use & Intellectual Property
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              All software, layout designs, core algorithms, database schemas, and AI heuristics (Prism AI) remain the exclusive 
              intellectual property of Shards Media. You are granted a limited, revocable, non-transferable, and non-exclusive license 
              to use the software solely to manage internal agency operations. You may not reverse engineer, modify, or resell 
              Platform components.
            </p>
          </section>

          {/* Section 7 */}
          <section
            id="liability"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              7. Limitation of Liability
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, 
              SHARDS MEDIA AND ITS AFFILIATES SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF REVENUE, 
              BUSINESS INTERRUPTION, LOSS OF CAMPAIGN METRICS, OR CORRUPTION OF FINANCIAL DATA ARISING OUT OF YOUR USE OF THE WORKSPACE.
            </p>
          </section>

          {/* Section 8 */}
          <section
            id="governing-law"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              8. Governing Law & Dispute Resolution
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              These Terms of Service are governed by the laws of the State of Delaware (United States) or applicable international 
              governing laws for cross-border transactions, without regard to conflicts of law provisions. Any dispute arising under 
              these terms shall be resolved exclusively through binding arbitration.
            </p>
          </section>

          {/* Section 9 */}
          <section
            id="contact"
            className="neo-raised"
            style={{
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '18px',
                color: '#e8e8e8',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px',
                margin: 0,
              }}
            >
              9. Legal Contact Information
            </h2>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              For legal inquiries, dispute notifications, or general concerns regarding these terms:
            </p>
            <div
              className="neo-inset"
              style={{
                padding: '20px',
                fontFamily: MONO,
                fontSize: '12px',
                color: 'rgba(232,232,232,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '16px',
              }}
            >
              <div><strong style={{ color: '#e8e8e8' }}>Entity:</strong> Shards Media</div>
              <div><strong style={{ color: '#e8e8e8' }}>Email:</strong> studio@shardsmedia.com</div>
              <div><strong style={{ color: '#e8e8e8' }}>Subject Header:</strong> LEGAL: TERMS OF SERVICE INQUIRY</div>
            </div>
          </section>
        </article>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '48px 24px',
          marginTop: '60px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            width: '100%',
          }}
        >
          <img src="/iris-logo-black-bg.png" alt="Iris OS" style={{ height: '28px', width: 'auto', objectFit: 'contain', opacity: 0.6 }} />
          <span style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(232,232,232,0.22)', letterSpacing: '0.02em' }}>
            © 2026 Iris OS, Inc. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Security', href: '#' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  fontFamily: BODY,
                  fontSize: '13px',
                  color: 'rgba(232,232,232,0.3)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                className="hover:text-[rgba(232,232,232,0.65)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
