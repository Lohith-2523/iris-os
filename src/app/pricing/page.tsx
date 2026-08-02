import Link from 'next/link';
import Image from 'next/image';
import { Check, Menu } from 'lucide-react';

const FAQS = [
  {
    question: "What agency industry specializations are supported?",
    answer: "Iris OS supports marketing, social media, SEO, paid advertising, brand strategy, design, content, video, and web development. Selected specializations map directly into your workspace ledgers and project frameworks."
  },
  {
    question: "How does the profit-leak detection work?",
    answer: "Atlas AI automatically analyzes contractor billing hours against project retainers and actual client margins, alerting you to unprofitable accounts and resource over-allocations instantly."
  },
  {
    question: "Can I adjust my plan tier or add-ons later?",
    answer: "Yes, you can upgrade or downgrade your workspace tier directly from the billing tab in your settings console. All tiers include all 10 agency specializations."
  },
  {
    question: "Is there a setup fee or lock-in contract?",
    answer: "No. All Iris OS subscriptions are billed monthly on a pay-as-you-go basis. You can cancel your subscription at any time without penalty."
  }
];

export default function PricingPage() {
  return (
    <div className="workspace-auth workspace-pricing bg-[#f4f5f7] text-[#09090b] min-h-screen relative font-sans select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b-[3px] border-black px-6 py-4 flex items-center justify-between animate-fade-in">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Image src="/iris-logo-white-bg.png" alt="Iris OS Logo" width={85} height={32} priority className="h-8 w-auto object-contain" />
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-12 font-semibold text-xs tracking-wider uppercase">
          <Link href="/#about" className="hover:text-red-600 transition-colors">About</Link>
          <Link href="/#features" className="hover:text-red-600 transition-colors">Features</Link>
          <Link href="/pricing" className="text-red-650 font-bold uppercase transition-colors">Join Now</Link>
        </nav>

        {/* Right Button */}
        <div className="hidden md:block">
        </div>

        <details className="group md:hidden">
          <summary className="list-none cursor-pointer p-2 text-black hover:text-red-600" aria-label="Open navigation">
            <Menu className="h-6 w-6" />
          </summary>
          <nav className="absolute inset-x-0 top-full flex flex-col gap-4 border-y-4 border-black bg-white p-6 text-xs font-semibold uppercase tracking-wider">
            <Link href="/#about" prefetch={false} className="border-b border-zinc-200 pb-2 hover:text-red-600">About</Link>
            <Link href="/#features" prefetch={false} className="border-b border-zinc-200 pb-2 hover:text-red-600">Features</Link>
            <Link href="/pricing" prefetch={false} className="border-b border-zinc-200 pb-2 hover:text-red-600">Join Now</Link>
          </nav>
        </details>
      </header>

      {/* Pricing Header Banner */}
      <section className="relative w-full py-16 px-6 border-b-[3px] border-black bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10 animate-fade-in-up">
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-100 px-3 py-1 border border-red-200">
            Clear Workspace Options
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-[#09090b] uppercase tracking-tight animate-scale-in">
            Iris OS Workspace Tiers
          </h1>
          <p className="text-sm text-zinc-550 max-w-lg mx-auto font-medium">
            From agile agencies to multi-industry enterprises, choose a level that matches your team scale and operational complexity.
          </p>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section className="py-16 px-6 border-b-[3px] border-black bg-[#f4f5f7] overflow-hidden">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-3 animate-fade-in-up animation-delay-200">
          {/* Basic Plan */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-bold uppercase tracking-tight text-[#09090b]">Basic</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Starter Tier</span>
              </div>
              <div className="border-b-2 border-zinc-200 pb-3">
                <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$99</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
              </div>
              <ul className="space-y-3 font-mono text-[10px] text-zinc-650">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>All 10 Agency Specializations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Core Finance Ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Client Portal Gateway</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Secure Invite Gateway</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>2 Team Members · 5 Clients</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-500">
                  <span className="h-3.5 w-3.5 text-center shrink-0">—</span>
                  <span>No AI or Messaging Features</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/login"
                prefetch={false}
                className="w-full text-center py-2.5 bg-[#09090b] text-white hover:bg-red-600 border-2 border-black text-xs font-bold uppercase tracking-wider block"
              >
                Select Basic
              </Link>
            </div>
          </div>

          {/* Pro Plan (Featured) */}
          <div className="bg-white border-[3px] border-red-600 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] flex flex-col justify-between p-6 relative">
            <div className="absolute -top-3 right-4 px-2 py-0.5 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider border border-black">
              Most Popular
            </div>
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-bold uppercase tracking-tight text-red-600">Pro Plan</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Professional Tier</span>
              </div>
              <div className="border-b-2 border-zinc-200 pb-3">
                <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$299</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
              </div>
              <ul className="space-y-3 font-mono text-[10px] text-zinc-700">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="font-bold">All 10 Agency Specializations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Automated Client Reporting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="font-bold">Active Profit-Leak Checks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Atlas AI for Meetings & Invoices</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Secure Messaging · 4 Team · 15 Clients</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/login"
                prefetch={false}
                className="w-full text-center py-2.5 bg-[#09090b] text-white hover:bg-red-650 border-2 border-black text-xs font-bold uppercase tracking-wider block"
              >
                Select Pro
              </Link>
            </div>
          </div>

          {/* Advanced Plan */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-bold uppercase tracking-tight text-[#09090b]">Advanced</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Enterprise Tier</span>
              </div>
              <div className="border-b-2 border-zinc-200 pb-3">
                <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$599</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
              </div>
              <ul className="space-y-3 font-mono text-[10px] text-zinc-650">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="font-bold">All 10 Agency Specializations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Full Automated Workflow Sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Advanced Margin Forecasting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>24/7 Sandbox Clearance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Full Atlas AI · Briefing · Strategy</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>Secure Messaging · 15 Team · 30 Clients</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/login"
                prefetch={false}
                className="w-full text-center py-2.5 bg-[#09090b] text-white hover:bg-red-600 border-2 border-black text-xs font-bold uppercase tracking-wider block"
              >
                Select Advanced
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white border-b-[3px] border-black overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-12 animate-fade-in-up animation-delay-100">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Questions & Answers</span>
            <h2 className="text-3xl font-extrabold font-heading uppercase text-[#09090b]">Pricing FAQ</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = false;
              return (
                <details key={index} className="group border-2 border-black bg-[#f4f5f7] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <summary
                    className="w-full text-left p-4 font-heading font-bold text-xs uppercase flex items-center justify-between hover:bg-zinc-100 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <span className="text-red-600 text-sm font-mono">{isOpen ? '−' : '+'}</span>
                  </summary>
                  <>
                    <div className="p-4 border-t-2 border-black bg-white text-xs text-zinc-700 leading-relaxed font-sans font-medium">
                      {faq.answer}
                    </div>
                  </>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#09090b] text-white py-12 px-6 border-t-[3px] border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/iris-logo-black-bg.png" alt="Iris OS Logo" width={74} height={28} className="h-7 w-auto object-contain" />
            <span className="text-[10px] text-zinc-500 font-mono mt-1 font-medium">© 2026. All rights reserved.</span>
          </div>

          <div className="flex gap-6 font-mono text-[10px] text-zinc-400">
            <Link href="/#about" className="hover:text-red-500">About</Link>
            <Link href="/#features" className="hover:text-red-500">Features</Link>
            <Link href="/pricing" className="hover:text-red-500">Pricing</Link>
            <Link href="/terms" prefetch={false} className="hover:text-red-500">Terms</Link>
            <Link href="/privacy" prefetch={false} className="hover:text-red-500">Privacy</Link>
            <Link href="/login" prefetch={false} className="hover:text-red-500">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
