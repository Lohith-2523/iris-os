'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

// ─── Font shorthands ──────────────────────────────────────────────────────────
const DISPLAY = "'Space Grotesk', sans-serif";
const BODY    = "'Geist', sans-serif";
const MONO    = "'Geist Mono', monospace";
const JBMONO  = "'JetBrains Mono', monospace";

export default function PrivacyPolicyPage() {
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
            Security & Consent
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
            Data Usage & Privacy Policy
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
            Last Updated: June 27, 2026 • GDPR & DPDP Compliant • Shards Media
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
              Policy Sections
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
                { id: 'controller', label: '1. Data Controller' },
                { id: 'data-collection', label: '2. Personal Data We Collect' },
                { id: 'purpose', label: '3. Purpose & Legal Basis' },
                { id: 'integrations', label: '4. Google & Notion APIs' },
                { id: 'retention', label: '5. Retention & Erasure' },
                { id: 'user-rights', label: '6. GDPR & DPDP Act Rights' },
                { id: 'transfers', label: '7. International Transfers' },
                { id: 'dpo', label: '8. Contact DPO' },
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
            id="controller"
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
              1. Data Controller Identification
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
              Shards Media (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the Data Controller responsible for the processing of your personal data 
              on the Iris OS Platform under Article 4(7) of the EU General Data Protection Regulation (GDPR) and acts as the Data Fiduciary 
              under Section 3 of the Digital Personal Data Protection (DPDP) Act of India.
            </p>
          </section>

          {/* Section 2 */}
          <section
            id="data-collection"
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
              2. Categories of Personal Data We Collect
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
              When you use the Platform, we process the following categories of data:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Identity & Account Metadata', desc: 'Corporate name, billing address, currency settings, administrator emails.' },
                { title: 'Financial Data', desc: 'Internal ledgers, client invoices, amount totals, expenses, merchant names.' },
                { title: 'Integration Telemetry & Access Tokens', desc: 'OAuth authorization tokens for Canva catalogs, Meta Ads metrics, and Google or Notion workspaces.' },
                { title: 'Human Resources & Contractor Allocation Logs', desc: 'Contractor name initials and assigned deliverable hours.' },
                { title: 'System Logs & Telemetry', desc: 'IP address, device headers, authentication timestamps.' }
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
          </section>

          {/* Section 3 */}
          <section
            id="purpose"
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
              3. Purpose and Legal Basis of Processing
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
              Under Article 6 of the GDPR, we process data based on:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Contractual Performance (Art. 6.1.b)', desc: 'To deploy settings, calculate invoices, sync project milestones, and authorize client logins.' },
                { title: 'Explicit Consent (Art. 6.1.a)', desc: 'To connect Canva, Google, Notion, and Meta APIs, and to securely analyze financial ledgers and lead pipeline data using Prism AI models (which is optional and can be declined or revoked in settings at any time).' },
                { title: 'Legitimate Interests (Art. 6.1.f)', desc: 'To execute Prism AI heuristics, identify contractor profit leaks, and detect anomalous security activity.' }
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
              Under Section 4 and 5 of the Indian DPDP Act, we process personal data only for specified, lawful purposes to which you have given 
              unambiguous, affirmative consent.
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
              4. Google and Notion Authentication APIs & Data Scope
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
              Our Platform utilizes Google Authentication and Notion Authentication to enable single-sign-on (SSO) and database integrations:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Google Authentication', desc: 'We access your Google user profile data (email address, profile picture) and authorization tokens. We do not access, scan, or read your emails, documents, or photos unless explicit, additional drive permissions are granted.' },
                { title: 'Notion Authentication', desc: 'We retrieve authorized database schema read/write tokens. This scope is strictly confined to workspace databases you explicitly select for project reporting.' }
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
            <div
              className="neo-inset"
              style={{
                padding: '18px 24px',
                fontFamily: MONO,
                fontSize: '12px',
                color: 'rgba(232,232,232,0.5)',
                lineHeight: 1.6,
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '16px',
              }}
            >
              Tokens retrieved via Google and Notion APIs are encrypted using industry-standard AES-256 algorithms and are stored securely. 
              You can revoke permissions at any time from your Google or Notion security consoles.
            </div>
          </section>

          {/* Section 5 */}
          <section
            id="retention"
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
              5. Data Retention, Erasure, & Anonymization
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
              In accordance with GDPR Article 17 (Right to Erasure) and DPDP Act Section 12 (Right to Erasure of Personal Data):
            </p>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We retain personal data only for as long as your workspace account is active or as necessary to fulfill the primary purposes 
              of processing. Upon contract termination or a valid erasure request:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                'All API tokens (Google, Notion, Meta) are immediately and permanently purged from active databases.',
                'Your identity details are deleted or fully anonymized.',
                'Historical operational logs used by Prism AI are fully scrubbed of identifiable references.',
                'For Meta (Facebook/Instagram) integrations, you can deauthorize the application or request deletion of all retrieved campaigns, ads, and leads data at any time via the deauthorization endpoint (/api/meta-ads/deauthorize) and data deletion request endpoint (/api/meta-ads/delete-data). Following verification, the data is immediately and permanently wiped from the active database and a unique tracking code is generated to confirm completion.'
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
            id="user-rights"
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
              6. GDPR & DPDP Act Data Subject Rights
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
              You hold the following legal rights regarding your personal data:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Right of Access & Portability', desc: 'Obtain a structured JSON copy of all data held.' },
                { title: 'Right to Rectification', desc: 'Request correction of inaccurate ledgers or profiles.' },
                { title: 'Right of Consent Withdrawal', desc: 'Revoke API permissions at any time.' },
                { title: 'Right to Grievance Redressal (DPDP Act)', desc: 'Raise grievances directly with our DPO.' },
                { title: 'Right to Nominate (DPDP Act)', desc: 'Designate an individual to exercise your rights in the event of death or incapacity.' }
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
          </section>

          {/* Section 7 */}
          <section
            id="transfers"
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
              7. International Cross-Border Data Transfers
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
              Personal data collected under these policies is processed in secure servers located within the United States, 
              the EEA, and India. To facilitate cross-border transfers from the EEA, Shards Media relies on Standard Contractual 
              Clauses (SCCs) approved by the European Commission. Transfers under the DPDP Act are executed in full compliance 
              with cross-border guidelines established by the Government of India.
            </p>
          </section>

          {/* Section 8 */}
          <section
            id="dpo"
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
              8. Contact Our Data Protection Officer (DPO)
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
              To exercise your legal data rights, withdraw consent, or file a complaint regarding our privacy practices:
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
              <div><strong style={{ color: '#e8e8e8' }}>Fiduciary:</strong> Shards Media</div>
              <div><strong style={{ color: '#e8e8e8' }}>Data Protection Officer:</strong> Privacy Compliance Department</div>
              <div><strong style={{ color: '#e8e8e8' }}>Email:</strong> studio@shardsmedia.com</div>
              <div><strong style={{ color: '#e8e8e8' }}>Subject Header:</strong> PRIVACY: DATA RIGHTS EXERCISE</div>
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
