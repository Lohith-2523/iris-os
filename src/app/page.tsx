'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  DollarSign,
  Activity,
  Layers,
  Users,
  Check,
  Shield,
  Menu,
  X
} from 'lucide-react';

const SECTORS = [
  {
    title: 'Prism AI & Automations',
    description: 'Trigger automated workflows, sync client pipelines, and utilize LLM-powered context engines.',
    details: [
      'Automated Workflow Orchestrator: Connect tools like Canva, Slack, and email into seamless pipelines.',
      'Prism AI Chat Assistant: Query financial ledgers, project trackers, and client details using plain language.',
      'Real-time Event Triggers: Set up instant alerts for contractor profit leaks or margin risks.'
    ],
    color: '#09090b',
    textColor: '#ffffff',
    borderColor: '#e11d48'
  },
  {
    title: 'Operations & Ledger',
    description: 'Track invoice margins, monitor contractor utilization, and analyze profit retention.',
    details: [
      'Multi-Currency Ledgers: Keep a real-time ledger synchronized across USD, EUR, and GBP.',
      'Profit Leak Detector: Spot inactive retainers or over-allocated contractor resources instantly.',
      'Forecasting Engines: Model future agency margins and project cashflows with historical billing data.'
    ],
    color: '#18181b',
    textColor: '#ffffff',
    borderColor: '#e11d48'
  },
  {
    title: 'Design Hub & Canva Sync',
    description: 'Connect your Canva workspaces, import branding kits, and coordinate visual asset delivery.',
    details: [
      'Canva Catalog Sync: Authenticate via Canva OAuth to browse design hubs and asset logs.',
      'Live Proof Clearance: Share creative briefs and asset previews in real-time with clients.',
      'Enterprise Branding Gate: Enforce consistent colors, assets, and design constraints automatically.'
    ],
    color: '#27272a',
    textColor: '#ffffff',
    borderColor: '#e11d48'
  },
  {
    title: 'Meta Portal & Client Analytics',
    description: 'Host client-gated performance dashboards, sync Meta Ad campaigns, and generate ROI reports.',
    details: [
      'Client-Gated Portals: Grant read-only access to campaign budgets, live ROAS, and milestones.',
      'Meta Ads Integration: Fetch campaign metrics, lead form logs, and conversion rates directly.',
      'Automated Reporting SLA: Auto-generate executive summaries showing live project metrics.'
    ],
    color: '#3f3f46',
    textColor: '#ffffff',
    borderColor: '#e11d48'
  }
];

const TRANSLATE_VECTORS = [
  'translate(-12px, -12px)', // index 0: Top-Left (Quadrant 4)
  'translate(12px, -12px)',  // index 1: Top-Right (Quadrant 1)
  'translate(12px, 12px)',   // index 2: Bottom-Right (Quadrant 2)
  'translate(-12px, 12px)'   // index 3: Bottom-Left (Quadrant 3)
];

const PATHS = [
  // index 0: Top-Left Sector (Quadrant 4)
  'M 150 200 L 40 200 A 160 160 0 0 1 200 40 L 200 150 A 50 50 0 0 0 150 200 Z',
  // index 1: Top-Right Sector (Quadrant 1)
  'M 200 150 L 200 40 A 160 160 0 0 1 360 200 L 250 200 A 50 50 0 0 0 200 150 Z',
  // index 2: Bottom-Right Sector (Quadrant 2)
  'M 250 200 L 360 200 A 160 160 0 0 1 200 360 L 200 250 A 50 50 0 0 0 250 200 Z',
  // index 3: Bottom-Left Sector (Quadrant 3)
  'M 200 250 L 200 360 A 160 160 0 0 1 40 200 L 150 200 A 50 50 0 0 0 200 250 Z'
];

// compound path for full donut (occupies the entire iris)
const FULL_DONUT_PATH = 'M 200 40 A 160 160 0 1 1 199.9 40 Z M 200 150 A 50 50 0 1 0 200.1 150 Z';

export default function LandingPage() {
  const [hoveredSector, setHoveredSector] = React.useState<number | null>(null);
  const [activeSector, setActiveSector] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const activeInfo = activeSector !== null ? SECTORS[activeSector] : hoveredSector !== null ? SECTORS[hoveredSector] : null;

  return (
    <div className="bg-[#f4f5f7] text-[#09090b] min-h-screen relative font-sans select-none">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="#" className="flex items-center gap-2 group shrink-0">
          <div className="h-8 w-8 bg-[#09090b] text-white font-bold flex items-center justify-center border-2 border-black group-hover:bg-red-600 transition-colors">
            I
          </div>
          <span className="text-lg font-bold font-heading tracking-tight text-[#09090b] group-hover:text-red-650 transition-colors">IrisOS</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-12 font-semibold text-xs tracking-wider uppercase">
          <a href="#about" className="hover:text-red-600 transition-colors">About</a>
          <a href="#features" className="hover:text-red-600 transition-colors">Features</a>
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
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-red-600 border-b border-zinc-200 pb-2"
            >
              About
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-red-600 border-b border-zinc-200 pb-2"
            >
              Features
            </a>
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

      {/* Hero Section */}
      <section className="relative w-full py-16 lg:py-24 px-6 border-b-[3px] border-black overflow-hidden bg-white">
        {/* Brutalist Grid Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid gap-12 lg:grid-cols-12 items-center relative z-10">
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="h-4 w-4 text-red-600 shrink-0" />
              <span>The Consolidated Suite for Elite Agencies</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold font-heading text-[#09090b] leading-[0.9] uppercase tracking-tight">
                THE AGENCY <br />
                <span className="bg-red-600 text-white px-4 py-1 inline-block mt-2 transform -rotate-1">MONOLITH.</span>
              </h1>
              <p className="text-base sm:text-lg text-zinc-650 max-w-xl leading-relaxed pt-3 font-medium">
                The ultimate operating system to manage client campaigns, ledgers, contractor margins, and workflow automations from a single, high-fidelity command center.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-[#09090b] text-white hover:bg-red-600 border-[3px] border-black text-sm font-bold uppercase tracking-wider shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all flex items-center gap-2"
              >
                <span>Launch Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="px-8 py-3.5 bg-white text-[#09090b] hover:bg-zinc-150 border-[3px] border-black text-sm font-bold uppercase tracking-wider shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all"
              >
                Explore Plans
              </a>
            </div>
          </div>

          {/* Hero Visuals (Brutalist Mock cards showing OS indicators) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#09090b] text-white p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-600 m-3" />
              <span className="block font-heading text-xs font-semibold text-red-500 uppercase tracking-widest">Active Operations</span>
              <span className="block text-2xl font-bold tracking-tight mt-1 font-heading">Apex Creative Group</span>
              
              <div className="mt-6 space-y-3 font-mono text-[11px] text-zinc-400">
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span>Gross Profit Margin:</span>
                  <span className="text-emerald-400 font-bold">+28.4%</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span>Contractor Margin Leaks:</span>
                  <span className="text-red-500 font-bold">0 Detected</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>On-Time Deliverable SLA:</span>
                  <span className="text-white font-bold">100% SLA Compliant</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-zinc-500">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-[10px] font-bold uppercase">Net Ledger</span>
                </div>
                <span className="block text-xl font-bold tracking-tight mt-2 font-heading text-[#09090b]">$348,200</span>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1 font-mono">↑ Optimized Retainers</span>
              </div>

              <div className="bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Activity className="h-4 w-4 text-red-600" />
                  <span className="text-[10px] font-bold uppercase">Automations</span>
                </div>
                <span className="block text-xl font-bold tracking-tight mt-2 font-heading text-[#09090b]">Active</span>
                <span className="text-[9px] text-[#09090b] font-bold block mt-1 font-mono">4 Pipelines Connected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 border-b-[3px] border-black bg-[#f4f5f7]">
        <div className="max-w-4xl mx-auto space-y-12 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">About IrisOS</span>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading uppercase text-[#09090b]">
              Redefining Professional Services Operations
            </h2>
          </div>

          <div className="bg-white border-[3px] border-black p-8 md:p-10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
            <div className="absolute top-0 left-0 w-8 h-2 bg-red-600" />
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed font-medium font-sans">
              Spreadsheets fail. Chat threads scatter. Client reporting consumes hours of manual synchronization. 
              IrisOS is the definitive solution—a singular, unified operating system designed to run all facets 
              of a professional service firm. By combining multi-currency ledgers, automatic client-clearance portals, 
              milestone trackers, and real-time anomaly alerts, IrisOS streamlines operations from client acquisition 
              to final delivery.
            </p>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed font-medium font-sans mt-6">
              For agency owners, this means complete transparency into project margins, instant detection of unprofitable 
              retainers, and the ability to scale client capacity without inflating administrative overhead. It represents 
              a paradigm shift: from fragmented chaos to unified agency intelligence.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Layers className="h-6 w-6 text-red-600 mb-2" />
              <span className="block font-bold text-xs uppercase text-[#09090b]">No Fragmentation</span>
              <span className="block text-[10px] text-zinc-500 mt-1 leading-normal font-medium">Replace multiple disconnected applications with a single operating system.</span>
            </div>
            <div className="p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Shield className="h-6 w-6 text-red-600 mb-2" />
              <span className="block font-bold text-xs uppercase text-[#09090b]">Margin Protection</span>
              <span className="block text-[10px] text-zinc-500 mt-1 leading-normal font-medium">Identify unprofitable contractor margins and over-allocation instantly.</span>
            </div>
            <div className="p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Users className="h-6 w-6 text-red-600 mb-2" />
              <span className="block font-bold text-xs uppercase text-[#09090b]">Client Onboarding</span>
              <span className="block text-[10px] text-zinc-500 mt-1 leading-normal font-medium">Generate dedicated clearance portals automatically for real-time reporting.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 border-b-[3px] border-black bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Interactive Ecosystem</span>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading uppercase text-[#09090b]">The Iris Console</h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-normal">
              Click a sector of the Iris eye to expand it and occupy the entire console. Click it again to return. Hover to preview.
            </p>
          </div>

          {/* Interactive Iris layout */}
          <div className="grid gap-12 lg:grid-cols-12 items-center pt-6">
            {/* Column 1: The Iris Interactive SVG */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-[360px] h-[360px] md:w-[400px] md:h-[400px] shrink-0 border-[4px] border-black bg-zinc-150 p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {/* Outer circle line */}
                  <circle cx="200" cy="200" r="160" fill="none" stroke="#09090b" strokeWidth="2" strokeDasharray="6 4" />

                  {/* Sectors mapping */}
                  {SECTORS.map((sector, index) => {
                    const isHovered = hoveredSector === index;
                    const isActive = activeSector === index;
                    const isAnyActive = activeSector !== null;

                    // If active, render the full donut, else render the quadrant path
                    const pathData = isActive ? FULL_DONUT_PATH : PATHS[index];

                    // Hide others if one sector is active
                    if (isAnyActive && !isActive) return null;

                    return (
                      <path
                        key={sector.title}
                        d={pathData}
                        fill={isHovered ? '#dc2626' : sector.color}
                        stroke={sector.borderColor}
                        strokeWidth="3"
                        onClick={() => {
                          if (isActive) {
                            setActiveSector(null);
                          } else {
                            setActiveSector(index);
                          }
                        }}
                        onMouseEnter={() => !isAnyActive && setHoveredSector(index)}
                        onMouseLeave={() => !isAnyActive && setHoveredSector(null)}
                        className="transition-all duration-300 ease-out cursor-pointer hover:stroke-white"
                        style={{
                          transform: !isActive && isHovered ? TRANSLATE_VECTORS[index] : 'translate(0px, 0px)',
                          opacity: isAnyActive && !isActive ? 0 : 1,
                        }}
                      />
                    );
                  })}

                  {/* Pupil (Center hole of the eye) */}
                  <circle
                    cx="200"
                    cy="200"
                    r="50"
                    fill="#09090b"
                    stroke="#ffffff"
                    strokeWidth="3"
                    className="pointer-events-none"
                  />
                  {/* Pupil indicator reflection */}
                  <circle
                    cx="185"
                    cy="185"
                    r="8"
                    fill="#ffffff"
                    opacity="0.6"
                    className="pointer-events-none"
                  />
                  <text
                    x="200"
                    y="204"
                    fill="#ffffff"
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-heading pointer-events-none"
                  >
                    I
                  </text>
                </svg>
              </div>
            </div>

            {/* Column 2: Information and detail lists */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              {activeInfo ? (
                <div className="bg-[#09090b] text-white p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] space-y-6 min-h-[300px] flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h3 className="text-xl font-bold font-heading uppercase text-red-500">
                        {activeInfo.title}
                      </h3>
                      {activeSector !== null && (
                        <button
                          onClick={() => setActiveSector(null)}
                          className="px-2 py-1 bg-red-600 text-white font-mono text-[9px] uppercase font-bold border border-black hover:bg-white hover:text-black transition-colors cursor-pointer"
                        >
                          Minimize
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans mt-3">
                      {activeInfo.description}
                    </p>

                    <div className="mt-4 space-y-3 font-mono text-[10px] text-zinc-400">
                      {activeInfo.details.map((detail, idx) => {
                        const [title, desc] = detail.split(': ');
                        return (
                          <div key={idx} className="flex gap-2 items-start border-l border-red-600 pl-3">
                            <div>
                              <strong className="block text-white uppercase tracking-wider">{title}</strong>
                              <span className="block text-[9px] text-zinc-400 mt-0.5 leading-normal">{desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[9px] text-zinc-500 font-mono italic">
                    {activeSector !== null ? 'Click again inside the Iris to restore the console view.' : 'Click to lock feature sets into full view.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white text-[#09090b] p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
                  <div className="h-12 w-12 bg-zinc-100 text-[#09090b] border-2 border-black flex items-center justify-center font-bold text-lg font-heading">
                    ?
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-heading uppercase">Interactive Feature Mapping</h3>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed mt-2 font-medium">
                      Hover over different sectors of the Iris circle to reveal details. Left click a quadrant to expand that feature set to occupy the entire Iris.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 border-b-[3px] border-black bg-[#f4f5f7]">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Flexible Scaling</span>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading uppercase text-[#09090b]">CHOOSE YOUR LEVEL</h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-normal">
              Three workspace tiers. Built to accommodate elite marketing, SEO, design, and web development organizations.
            </p>
          </div>

          {/* Grid */}
          <div className="grid gap-8 md:grid-cols-3 pt-6 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-sm font-bold uppercase tracking-tight text-[#09090b]">Basic</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Starter Tier</span>
                  </div>
                </div>
                <div className="border-b-2 border-zinc-200 pb-3">
                  <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$99</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
                </div>
                <ul className="space-y-3 font-mono text-[10px] text-zinc-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span>1 Agency Specialization</span>
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
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
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
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-sm font-bold uppercase tracking-tight text-red-600">Pro Plan</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Professional Tier</span>
                  </div>
                </div>
                <div className="border-b-2 border-zinc-200 pb-3">
                  <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$299</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
                </div>
                <ul className="space-y-3 font-mono text-[10px] text-zinc-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="font-bold">Up to 5 Agency Specializations</span>
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
                    <span>Prism AI Chat Assistance</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full text-center py-2.5 bg-[#09090b] text-white hover:bg-red-650 border-2 border-black text-xs font-bold uppercase tracking-wider block"
                >
                  Select Pro
                </Link>
              </div>
            </div>

            {/* Advanced Plan */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-sm font-bold uppercase tracking-tight text-[#09090b]">Advanced</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Enterprise Tier</span>
                  </div>
                </div>
                <div className="border-b-2 border-zinc-200 pb-3">
                  <span className="font-mono text-3xl font-bold tracking-tight text-[#09090b]">$599</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
                </div>
                <ul className="space-y-3 font-mono text-[10px] text-zinc-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="font-bold">All 10+ Agency Specializations</span>
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
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full text-center py-2.5 bg-[#09090b] text-white hover:bg-red-600 border-2 border-black text-xs font-bold uppercase tracking-wider block"
                >
                  Select Advanced
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#09090b] text-white py-12 px-6 border-t-[3px] border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-white text-[#09090b] font-bold flex items-center justify-center border border-white">
              I
            </div>
            <span className="text-md font-bold font-heading tracking-tight">IrisOS</span>
            <span className="text-[10px] text-zinc-500 font-mono mt-1">© 2026. All rights reserved.</span>
          </div>

          <div className="flex gap-6 font-mono text-[10px] text-zinc-400">
            <a href="#about" className="hover:text-red-500">About</a>
            <a href="#features" className="hover:text-red-500">Features</a>
            <Link href="/pricing" className="hover:text-red-500">Pricing</Link>
            <Link href="/terms" className="hover:text-red-500">Terms</Link>
            <Link href="/privacy" className="hover:text-red-500">Privacy</Link>
            <Link href="/login" className="hover:text-red-500">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
