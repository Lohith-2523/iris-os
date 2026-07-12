'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="bg-[#f4f5f7] text-[#09090b] min-h-screen relative font-sans select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <img src="/iris-logo-white-bg.png" alt="Iris OS Logo" className="h-8 object-contain" />
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-12 font-semibold text-xs tracking-wider uppercase">
          <Link href="/#about" className="hover:text-red-600 transition-colors">About</Link>
          <Link href="/#features" className="hover:text-red-600 transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-red-600 transition-colors">Join Now</Link>
        </nav>

        {/* Right Button */}
        <div className="hidden md:block">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-[#09090b] text-white hover:bg-red-600 border-2 border-black text-xs font-bold uppercase transition-all tracking-wider inline-flex items-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
          >
            <span>Enter Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-black hover:text-red-600 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bg-white border-b-4 border-black z-40 p-6 flex flex-col gap-6 md:hidden font-sans border-t">
          <nav className="flex flex-col gap-4 font-semibold text-xs tracking-wider uppercase">
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-red-600 border-b border-zinc-200 pb-2"
            >
              About
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-red-600 border-b border-zinc-200 pb-2"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-red-600 border-b border-zinc-200 pb-2"
            >
              Join Now
            </Link>
          </nav>
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-center py-3 bg-[#09090b] text-white hover:bg-red-600 border-2 border-black text-xs font-bold uppercase transition-all tracking-wider flex items-center justify-center gap-1.5"
          >
            <span>Enter Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Hero Banner */}
      <section className="relative w-full py-12 px-6 border-b-[3px] border-black bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-100 px-3 py-1 border border-red-200">
            Security & Consent
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-[#09090b] uppercase tracking-tight">
            Data Usage & Privacy Policy
          </h1>
          <p className="text-xs text-zinc-550 font-mono">
            Last Updated: June 27, 2026 • GDPR & DPDP Compliant • Shards Media
          </p>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-6xl mx-auto py-12 px-6 grid gap-10 md:grid-cols-12">
        {/* Document Index (Left side in desktop) */}
        <aside className="md:col-span-4 space-y-4">
          <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-28">
            <span className="block font-heading font-bold text-xs uppercase border-b-2 border-black pb-2 mb-3">
              Policy Sections
            </span>
            <nav className="flex flex-col gap-2.5 font-mono text-[10px] uppercase font-bold text-zinc-650">
              <a href="#controller" className="hover:text-red-600">1. Data Controller</a>
              <a href="#data-collection" className="hover:text-red-600">2. Personal Data We Collect</a>
              <a href="#purpose" className="hover:text-red-600">3. Purpose & Legal Basis</a>
              <a href="#integrations" className="hover:text-red-600">4. Google & Notion APIs</a>
              <a href="#retention" className="hover:text-red-600">5. Retention & Erasure</a>
              <a href="#user-rights" className="hover:text-red-600">6. GDPR & DPDP Act Rights</a>
              <a href="#transfers" className="hover:text-red-600">7. International Transfers</a>
              <a href="#dpo" className="hover:text-red-600">8. Contact DPO</a>
            </nav>
          </div>
        </aside>

        {/* Legal Text (Right side) */}
        <article className="md:col-span-8 space-y-10 font-sans text-xs leading-relaxed text-zinc-800 font-medium">
          {/* Section 1 */}
          <section id="controller" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              1. Data Controller Identification
            </h2>
            <p>
              Shards Media (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the Data Controller responsible for the processing of your personal data 
              on the Iris OS Platform under Article 4(7) of the EU General Data Protection Regulation (GDPR) and acts as the Data Fiduciary 
              under Section 3 of the Digital Personal Data Protection (DPDP) Act of India.
            </p>
          </section>

          {/* Section 2 */}
          <section id="data-collection" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              2. Categories of Personal Data We Collect
            </h2>
            <p>
              When you use the Platform, we process the following categories of data:
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong>Identity & Account Metadata:</strong> Corporate name, billing address, currency settings, administrator emails.</li>
              <li><strong>Financial Data:</strong> Internal ledgers, client invoices, amount totals, expenses, merchant names.</li>
              <li><strong>Integration Telemetry & Access Tokens:</strong> OAuth authorization tokens for Canva catalogs, Meta Ads metrics, and Google or Notion workspaces.</li>
              <li><strong>Human Resources & Contractor Allocation Logs:</strong> Contractor name initials, allocated deliverable hours, utilization metrics.</li>
              <li><strong>System Logs & Telemetry:</strong> IP address, device headers, authentication timestamps.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="purpose" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              3. Purpose and Legal Basis of Processing
            </h2>
            <p>
              Under Article 6 of the GDPR, we process data based on:
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong>Contractual Performance (Art. 6.1.b):</strong> To deploy settings, calculate invoices, sync project milestones, and authorize client logins.</li>
              <li><strong>Explicit Consent (Art. 6.1.a):</strong> To connect Canva, Google, Notion, and Meta APIs.</li>
              <li><strong>Legitimate Interests (Art. 6.1.f):</strong> To execute Prism AI heuristics, identify contractor profit leaks, and detect anomalous security activity.</li>
            </ul>
            <p>
              Under Section 4 and 5 of the Indian DPDP Act, we process personal data only for specified, lawful purposes to which you have given 
              unambiguous, affirmative consent.
            </p>
          </section>

          {/* Section 4 */}
          <section id="integrations" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              4. Google and Notion Authentication APIs & Data Scope
            </h2>
            <p>
              Our Platform utilizes Google Authentication and Notion Authentication to enable single-sign-on (SSO) and database integrations:
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong>Google Authentication:</strong> We access your Google user profile data (email address, profile picture) and authorization tokens. We do not access, scan, or read your emails, documents, or photos unless explicit, additional drive permissions are granted.</li>
              <li><strong>Notion Authentication:</strong> We retrieve authorized database schema read/write tokens. This scope is strictly confined to workspace databases you explicitly select for project reporting.</li>
            </ul>
            <p className="font-mono text-[10px] text-zinc-650 bg-zinc-100 p-2.5 border border-zinc-350">
              Tokens retrieved via Google and Notion APIs are encrypted using industry-standard AES-256 algorithms and are stored securely. 
              You can revoke permissions at any time from your Google or Notion security consoles.
            </p>
          </section>

          {/* Section 5 */}
          <section id="retention" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              5. Data Retention, Erasure, & Anonymization
            </h2>
            <p>
              In accordance with GDPR Article 17 (Right to Erasure) and DPDP Act Section 12 (Right to Erasure of Personal Data):
            </p>
            <p>
              We retain personal data only for as long as your workspace account is active or as necessary to fulfill the primary purposes 
              of processing. Upon contract termination or a valid erasure request:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>All API tokens (Google, Notion, Meta) are immediately and permanently purged from active databases.</li>
              <li>Your identity details are deleted or fully anonymized.</li>
              <li>Historical operational logs used by Prism AI are fully scrubbed of identifiable references.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="user-rights" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              6. GDPR & DPDP Act Data Subject Rights
            </h2>
            <p>
              You hold the following legal rights regarding your personal data:
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong>Right of Access & Portability:</strong> Obtain a structured JSON copy of all data held.</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate ledgers or profiles.</li>
              <li><strong>Right of Consent Withdrawal:</strong> Revoke API permissions at any time.</li>
              <li><strong>Right to Grievance Redressal (DPDP Act):</strong> Raise grievances directly with our DPO.</li>
              <li><strong>Right to Nominate (DPDP Act):</strong> Designate an individual to exercise your rights in the event of death or incapacity.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="transfers" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              7. International Cross-Border Data Transfers
            </h2>
            <p>
              Personal data collected under these policies is processed in secure servers located within the United States, 
              the EEA, and India. To facilitate cross-border transfers from the EEA, Shards Media relies on Standard Contractual 
              Clauses (SCCs) approved by the European Commission. Transfers under the DPDP Act are executed in full compliance 
              with cross-border guidelines established by the Government of India.
            </p>
          </section>

          {/* Section 8 */}
          <section id="dpo" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              8. Contact Our Data Protection Officer (DPO)
            </h2>
            <p>
              To exercise your legal data rights, withdraw consent, or file a complaint regarding our privacy practices:
            </p>
            <div className="bg-zinc-100 p-4 border border-zinc-350 font-mono text-[10px] space-y-1">
              <span className="block"><strong>Fiduciary:</strong> Shards Media</span>
              <span className="block"><strong>Data Protection Officer:</strong> Privacy Compliance Department</span>
              <span className="block"><strong>Email:</strong> studio@shardsmedia.com</span>
              <span className="block"><strong>Subject Header:</strong> PRIVACY: DATA RIGHTS EXERCISE</span>
            </div>
          </section>
        </article>
      </section>

      {/* Footer */}
      <footer className="bg-[#09090b] text-white py-12 px-6 border-t-[3px] border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/iris-logo-black-bg.png" alt="Iris OS Logo" className="h-7 object-contain" />
            <span className="text-[10px] text-zinc-500 font-mono mt-1 font-medium">© 2026. All rights reserved.</span>
          </div>

          <div className="flex gap-6 font-mono text-[10px] text-zinc-400">
            <Link href="/#about" className="hover:text-red-500">About</Link>
            <Link href="/#features" className="hover:text-red-500">Features</Link>
            <Link href="/pricing" className="hover:text-red-500">Pricing</Link>
            <Link href="/login" className="hover:text-red-500">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
