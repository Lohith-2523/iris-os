'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function TermsOfServicePage() {
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
            Legal Terms
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-[#09090b] uppercase tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-550 font-mono">
            Last Updated: June 27, 2026 • Shards Media
          </p>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-6xl mx-auto py-12 px-6 grid gap-10 md:grid-cols-12">
        {/* Document Index (Left side in desktop) */}
        <aside className="md:col-span-4 space-y-4">
          <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-28">
            <span className="block font-heading font-bold text-xs uppercase border-b-2 border-black pb-2 mb-3">
              Document Sections
            </span>
            <nav className="flex flex-col gap-2.5 font-mono text-[10px] uppercase font-bold text-zinc-650">
              <a href="#acceptance" className="hover:text-red-600">1. Acceptance of Terms</a>
              <a href="#accounts" className="hover:text-red-600">2. Account Credentials</a>
              <a href="#billing" className="hover:text-red-600">3. Subscription Billing</a>
              <a href="#integrations" className="hover:text-red-600">4. Third-Party Connections</a>
              <a href="#acceptable-use" className="hover:text-red-600">5. Platform Acceptable Use</a>
              <a href="#liability" className="hover:text-red-600">6. Limitation of Liability</a>
              <a href="#governing-law" className="hover:text-red-600">7. Governing Law</a>
              <a href="#contact" className="hover:text-red-600">8. Legal Contact</a>
            </nav>
          </div>
        </aside>

        {/* Legal Text (Right side) */}
        <article className="md:col-span-8 space-y-10 font-sans text-xs leading-relaxed text-zinc-800 font-medium">
          {/* Section 1 */}
          <section id="acceptance" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              1. Acceptance of Terms & Services
            </h2>
            <p>
              Welcome to Iris OS (the &quot;Platform&quot; or &quot;Services&quot;), operated by Shards Media (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). 
              By registering an account, purchasing a subscription tier, or accessing the workspace console, you, the user (&quot;Customer&quot;, &quot;you&quot;), 
              agree to be legally bound by these Terms of Service, which incorporate all compliance requirements under GDPR, the Digital Personal Data 
              Protection (DPDP) Act, and applicable global commerce and technology regulations. If you do not agree to these terms, do not access 
              the Platform.
            </p>
          </section>

          {/* Section 2 */}
          <section id="accounts" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              2. Account Registration & Credentials Gating
            </h2>
            <p>
              To deploy an agency workspace, you must create a corporate profile linked to a valid business email. You are fully responsible 
              for securing access keys and authorization credentials. Iris OS supports secondary enterprise authentication gateways, 
              including Google Authentication and Notion Authentication APIs.
            </p>
            <p className="font-semibold text-[#09090b]">
              You agree to safeguard your authentication secrets. Shards Media cannot and will not be liable for unauthorized data extraction, 
              ledger manipulation, or operational damage resulting from leaked account credentials or third-party token exposure.
            </p>
          </section>

          {/* Section 3 */}
          <section id="billing" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              3. Subscription Billing, Upgrades, & Cancellations
            </h2>
            <p>
              Platform services are divided into three standard tiers:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 font-mono text-[10px]">
              <li><strong>Basic Plan ($99/mo)</strong>: Restricts access to a single agency specialization (plus optional $29 add-on).</li>
              <li><strong>Pro Plan ($299/mo)</strong>: Grants workspace clearance for up to 5 agency specializations.</li>
              <li><strong>Advanced Plan ($599/mo)</strong>: Grants unlimited clearance for all 10+ agency specializations.</li>
            </ul>
            <p>
              Subscriptions are billed monthly on a recurring schedule based on the date of purchase. Upgrades take effect immediately 
              with pro-rated charges applied. Downgrades or cancellations will take effect at the end of the current billing cycle. 
              Refunds are not issued for partial monthly billing cycles.
            </p>
          </section>

          {/* Section 4 */}
          <section id="integrations" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              4. Third-Party Connections & API Integrations
            </h2>
            <p>
              Iris OS integrates directly with external platforms, including Google Services, Notion API, Canva design interfaces, 
              and Meta Ads portals. By enabling these integrations:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>You warrant that you hold sufficient administrative permissions to connect these data endpoints.</li>
              <li>You authorize Iris OS to retrieve and store connection tokens required to sync files and performance metrics.</li>
              <li>You acknowledge that company connections are governed by third-party developer policies, and Shards Media is not responsible for API outages or service termination on external platforms.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="acceptable-use" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              5. Platform Acceptable Use & Intellectual Property
            </h2>
            <p>
              All software, layout designs, core algorithms, database schemas, and AI heuristics (Prism AI) remain the exclusive 
              intellectual property of Shards Media. You are granted a limited, revocable, non-transferable, and non-exclusive license 
              to use the software solely to manage internal agency operations. You may not reverse engineer, modify, or resell 
              Platform components.
            </p>
          </section>

          {/* Section 6 */}
          <section id="liability" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              6. Limitation of Liability
            </h2>
            <p>
              THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, 
              SHARDS MEDIA AND ITS AFFILIATES SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF REVENUE, 
              BUSINESS INTERRUPTION, LOSS OF CAMPAIGN METRICS, OR CORRUPTION OF FINANCIAL DATA ARISING OUT OF YOUR USE OF THE WORKSPACE.
            </p>
          </section>

          {/* Section 7 */}
          <section id="governing-law" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              7. Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms of Service are governed by the laws of the State of Delaware (United States) or applicable international 
              governing laws for cross-border transactions, without regard to conflicts of law provisions. Any dispute arising under 
              these terms shall be resolved exclusively through binding arbitration.
            </p>
          </section>

          {/* Section 8 */}
          <section id="contact" className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h2 className="text-sm font-bold font-heading uppercase text-red-600 border-b border-zinc-200 pb-2">
              8. Legal Contact Information
            </h2>
            <p>
              For legal inquiries, dispute notifications, or general concerns regarding these terms:
            </p>
            <div className="bg-zinc-100 p-4 border border-zinc-350 font-mono text-[10px] space-y-1">
              <span className="block"><strong>Entity:</strong> Shards Media</span>
              <span className="block"><strong>Email:</strong> studio@shardsmedia.com</span>
              <span className="block"><strong>Subject Header:</strong> LEGAL: TERMS OF SERVICE INQUIRY</span>
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
