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
            Last Updated: July 28, 2026 • GDPR & DPDP Compliant • Iris OS
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
                { id: 'integrations', label: '4. Google Data & Gemini' },
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
              Iris OS (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the Data Controller responsible for the processing of your personal data 
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
                { title: 'Google Account & Calendar Data', desc: 'Google account email and profile information, calendar identifiers, and event information such as titles, descriptions, dates, times, attendees, RSVP status, recurrence, locations, and Google Meet links, when you connect Google Calendar.' },
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
                { title: 'Explicit Consent (Art. 6.1.a)', desc: 'To connect Canva, Google, Notion, and Meta APIs; synchronize and manage Google Calendar events; use Google Gemini models exclusively for AI-assisted call scheduling; and securely analyze financial ledgers and lead pipeline data using Atlas AI models. Connected integrations and AI-assisted scheduling are optional and can be declined or revoked in settings at any time.' },
                { title: 'Legitimate Interests (Art. 6.1.f)', desc: 'To execute Atlas AI heuristics, identify contractor profit leaks, and detect anomalous security activity.' }
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
              4. Google API Data, Google Calendar, and Gemini-Assisted Scheduling
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
              Iris OS accesses Google user data only after you expressly connect your Google account and grant the requested permissions. We use
              that data to provide the Google Calendar features you request, including calendar synchronization, availability and conflict checks,
              call scheduling, event creation and updates, attendee invitations, RSVP status, and Google Meet links.
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Google Account Data', desc: 'We access the verified email address and basic account information returned by Google to identify the connected account and maintain the integration. Iris OS does not request access to Gmail, Google Drive, documents, or photos as part of the Google Calendar integration.' },
                { title: 'Google Calendar Data', desc: 'With your permission, Iris OS reads calendar lists and future calendar events and may store event titles, descriptions, start and end times, recurrence details, attendee email addresses, RSVP status, event identifiers, locations, and Google Meet links. Iris OS also sends the meeting title, date, time, attendee email addresses, and conferencing request to Google when you ask it to create or update an event.' },
                { title: 'Gemini-Only AI Scheduling', desc: 'Google Gemini is the only AI model family used to interpret requests to schedule calls. For this workflow, Gemini may process only the information reasonably necessary to understand the scheduling request, such as the meeting title, attendee names or email addresses, requested date and time, time zone, and current scheduling state. Iris OS does not send Google OAuth access or refresh tokens to Gemini, and it does not use OpenAI, Anthropic, or any other AI provider to process Google Calendar data for call scheduling.' },
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
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '15px',
                color: '#e8e8e8',
                margin: '8px 0 0',
              }}
            >
              Limited AI Use and Google Workspace API Compliance
            </h3>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Iris OS uses Google Workspace data only to provide or improve the visible calendar and call-scheduling features requested by the
              connected user. Google Workspace data is not sold, used for advertising, used to determine creditworthiness, or used to create,
              train, or improve a generalized or shared machine-learning or artificial-intelligence model. It is not used to build advertising
              profiles or retained as a permanent dataset for model training. The use and transfer of information received from Google Workspace
              APIs by Iris OS adheres to the{' '}
              <a
                href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-200 underline underline-offset-4 hover:text-white"
              >
                Google Workspace API User Data and Developer Policy
              </a>
              , including its Limited Use requirements.
            </p>
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '15px',
                color: '#e8e8e8',
                margin: '8px 0 0',
              }}
            >
              Sharing, Transfer, and Disclosure of Google User Data
            </h3>
            <p
              style={{
                fontFamily: BODY,
                fontSize: '14px',
                color: 'rgba(232,232,232,0.65)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Iris OS does not sell Google user data. We share, transfer, or disclose it only to the following recipients and only to the extent
              necessary for the stated purpose:
            </p>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Google', desc: 'Google Calendar APIs receive event details and conferencing requests to synchronize calendars, create events, invite attendees, record responses, and provision Google Meet links. Google Gemini receives the limited scheduling inputs described above solely to interpret the user-requested scheduling workflow.' },
                { title: 'Authorized Workspace Users and Meeting Participants', desc: 'Calendar information is visible to authorized members of the connected Iris OS workspace as permitted by their role. Event titles, times, attendee details, and meeting links may be disclosed to people whom the user chooses to invite.' },
                { title: 'Infrastructure and Delivery Service Providers', desc: 'Vetted hosting, database, authentication, and transactional-email providers may process the minimum Google user data necessary to operate, secure, store, or deliver the calendar and invitation features on our behalf. They act under contractual confidentiality, security, and purpose-limitation obligations and may not use the data for their own advertising or unrelated purposes.' },
                { title: 'Security and Legal Disclosures', desc: 'Data may be disclosed when reasonably necessary to investigate abuse or a security incident, or when required to comply with applicable law, regulation, court order, or lawful government request.' },
                { title: 'Corporate Transaction', desc: 'Google user data may be transferred as part of a merger, acquisition, or sale of assets only after obtaining the user’s explicit prior consent, as required by the Google Workspace Limited Use requirements.' },
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
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '15px',
                color: '#e8e8e8',
                margin: '8px 0 0',
              }}
            >
              Data Protection Mechanisms for Sensitive Google Data
            </h3>
            <ul className="space-y-3" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {[
                { title: 'Encryption', desc: 'Google user data is transmitted over HTTPS/TLS. Google OAuth access and refresh tokens are encrypted at rest using AES-256-GCM, and encryption keys are stored separately from encrypted credentials.' },
                { title: 'Least-Privilege Access', desc: 'Iris OS requests only the Google OAuth scopes needed to read calendars and manage events. Authentication, workspace authorization, and user-specific ownership controls restrict access to connected-account data.' },
                { title: 'AI Data Minimization', desc: 'Only the minimum scheduling inputs are sent to Gemini. OAuth credentials are never placed in AI prompts, and synchronized calendar contents are not provided to other AI providers for call scheduling.' },
                { title: 'Retention and Deletion Controls', desc: 'Google data is retained only while needed to provide the connected feature or meet applicable legal obligations. Disconnecting Google Calendar deletes the stored connection credentials and synchronized events associated with that connection; users may also revoke Iris OS access from their Google Account.' },
                { title: 'Operational Safeguards', desc: 'Iris OS applies access controls, input validation, security monitoring, and restricted administrative access designed to prevent unauthorized access, alteration, loss, or disclosure. Human access to Google user data is prohibited except with specific user consent or when necessary for security or legal compliance.' },
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
              Google and Notion OAuth credentials are encrypted at rest and stored securely. Google OAuth credentials are used by Iris OS servers
              to communicate with Google APIs and are not included in prompts sent to Gemini. You can disconnect Google Calendar in Iris OS or
              revoke access at any time from your Google Account security settings. On disconnection or a valid deletion request, Iris OS removes
              the stored Google credentials and synchronized Google Calendar data associated with the connection, subject only to legal retention
              obligations.
            </div>
          </section>

          <section
            id="meta-atlas"
            className="neo-raised"
            style={{ padding: '32px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '18px', color: '#e8e8e8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', margin: 0 }}>
              4A. Meta Advertising Data and Atlas AI
            </h2>
            <p style={{ fontFamily: BODY, fontSize: '14px', color: 'rgba(232,232,232,0.65)', lineHeight: 1.7, margin: 0 }}>
              Access to Meta is optional and requires a separate affirmative checkbox during onboarding or in the Agency Leads page. If enabled, Iris OS may store the selected ad-account identifier and account metadata; campaign, ad and form identifiers; lead-form submissions; and delivery metrics such as spend, impressions, reach, clicks, click-through rate, cost per click, cost per thousand impressions, lead totals and cost per lead. This information is used to retrieve agency leads into the common lead pipeline and report advertising performance.
            </p>
            <p style={{ fontFamily: BODY, fontSize: '14px', color: 'rgba(232,232,232,0.65)', lineHeight: 1.7, margin: 0 }}>
              Atlas AI may use Meta-derived data only for aggregate metrics and better analytics, only when the workspace has enabled both general Atlas AI data sharing and the separate Atlas Meta analytics checkbox. Atlas AI is not given Meta OAuth access tokens, raw Meta form fields, lead names, email addresses or phone numbers. The consent choices are independent: disabling Atlas Meta analytics stops future AI processing of these metrics without disconnecting Meta, while withdrawing Meta access stops future retrieval from Meta. Previously stored Meta data remains subject to the retention, deletion and legal-obligation rules below.
            </p>
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
                'Historical operational logs used by Atlas AI are fully scrubbed of identifiable references.',
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
              the EEA, and India. To facilitate cross-border transfers from the EEA, Iris OS relies on Standard Contractual 
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
              <div><strong style={{ color: '#e8e8e8' }}>Fiduciary:</strong> Iris OS</div>
              <div><strong style={{ color: '#e8e8e8' }}>Data Protection Officer:</strong> Iris OS Privacy &amp; Compliance</div>
              <div><strong style={{ color: '#e8e8e8' }}>Email:</strong> cto.admin@irisos.app</div>
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
