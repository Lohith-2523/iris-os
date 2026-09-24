'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePlanPricing } from '@/components/billing/use-plan-pricing';
import { IrisLandingSkeleton } from '@/components/landing/iris-landing-skeleton';
import { IrisMarketingHeader } from '@/components/landing/iris-marketing-header';
import { IrisPricingComparison } from '@/components/landing/iris-pricing-comparison';
import { ConsoleEcosystem, MilesAiSection } from '@/components/landing/iris-landing-sections';
import { FlippingWordSwap } from '@/components/ui/flipping-word-swap';
import type { pricingCatalog, PricingRegion } from '@/lib/plan-pricing';

const irisLogo = '/iris-logo-black-bg.png';

// â”€â”€â”€ Font shorthands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DISPLAY = "var(--font-space-grotesk), sans-serif"
const BODY    = "var(--font-geist-sans), sans-serif"
const MONO    = "var(--font-geist-mono), monospace"
const JBMONO  = "var(--font-mono), monospace"

// â”€â”€â”€ Scroll Reveal Animation Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScrollReveal({ children, delay = '0s', className = '', id = '', style = {}, eager = false }: { children: React.ReactNode; delay?: string; className?: string; id?: string; style?: React.CSSProperties; eager?: boolean }) {
  const [isVisible, setIsVisible] = useState(eager);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eager) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [eager]);

  return (
    <div
      ref={ref}
      id={id}
      className={`${isVisible ? 'animate-fade-in-up' : ''} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(40px)',
        transition: isVisible ? 'none' : 'opacity 0s, transform 0s',
        animationDelay: delay,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
// â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Hero Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(112px, 14vw, 168px) clamp(16px, 5vw, 32px) clamp(72px, 10vw, 112px)',
        position: 'relative',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow orbs */}
      <div
        className="pulse-glow"
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="pulse-glow"
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '8%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
          animationDelay: '1.5s',
          }}
        />

      {/* Headline */}
      <ScrollReveal
        eager
        delay="0.3s"
        style={{
          maxWidth: '900px',
          marginBottom: '28px',
        }}
      >
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(42px, 10vw, 108px)',
            lineHeight: 1.0,
            margin: 0,
          }}
        >
          <span className="gradient-text">See it all.</span>
          <br />
          <span style={{ color: 'rgba(232,232,232,0.3)', fontWeight: 300 }}>Manage it all.</span>
        </h1>
        <div
          aria-label="For business owners, agency owners and freelancers"
          className="flex-col items-center sm:flex-row sm:items-baseline"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.35em',
            width: '100%',
            maxWidth: '100%',
            minHeight: '1.15em',
            marginTop: 'clamp(22px, 4vw, 38px)',
            color: 'rgba(232,232,232,0.3)',
            fontFamily: DISPLAY,
            fontSize: 'clamp(28px, 5.4vw, 58px)',
            fontWeight: 300,
            letterSpacing: '-0.055em',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          <span>For</span>
          <FlippingWordSwap
            word1="Business owners"
            word2="Agency owners"
            word3="Freelancers"
            duration={520}
            stagger={30}
            autoPlay
            interval={3000}
            className="max-w-full !text-[clamp(28px,5.4vw,58px)]"
            wordClassName="text-zinc-100"
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              letterSpacing: '-0.055em',
            }}
          />
        </div>
      </ScrollReveal>

      {/* Tagline */}
      <ScrollReveal
        eager
        delay="0.45s"
        style={{
          maxWidth: '720px',
          marginBottom: '52px',
        }}
      >
        <p
          style={{
            fontFamily: BODY,
            fontWeight: 400,
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            color: 'rgba(232,232,232,0.5)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          IrisOS is the focal point of agency execution. Just as the physical iris regulates light to clarify vision, our platform synthesizes client portals, financial ledgers, creative workflows, and campaign metrics into one unified, crystal-clear operational view.
        </p>
      </ScrollReveal>

      {/* CTAs */}
      <ScrollReveal
        eager
        delay="0.6s"
        style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}
      >
        <Link
          href="/waitlist"
          prefetch={false}
          className="neo-button-accent"
          style={{
            fontFamily: BODY,
            fontWeight: 600,
            fontSize: '15px',
            padding: '14px 32px',
            textDecoration: 'none',
            color: '#0a0a0a',
            display: 'inline-block',
            maxWidth: '100%',
            textAlign: 'center',
          }}
        >
          Join the Waitlist
        </Link>
        <a
          href="#video"
          className="neo-button"
          style={{
            fontFamily: BODY,
            fontWeight: 500,
            fontSize: '15px',
            padding: '14px 32px',
            color: 'rgba(232,232,232,0.7)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            maxWidth: '100%',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="rgba(232,232,232,0.4)" strokeWidth="1.2" />
            <path d="M6.5 5.5L10.5 8L6.5 10.5V5.5Z" fill="rgba(232,232,232,0.6)" />
          </svg>
          Watch the Demo
        </a>
      </ScrollReveal>

      {/* Scroll cue */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: 0.3,
        }}
      >
        <span style={{ fontFamily: JBMONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>Scroll</span>
        <div style={{ width: '1px', height: '32px', background: 'linear-gradient(to bottom, #888, transparent)' }} />
      </div>
    </section>
  )
}

// â”€â”€â”€ Video Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="video" style={{ padding: 'clamp(72px, 10vw, 112px) clamp(16px, 5vw, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <div className="section-divider" style={{ margin: '0 auto 24px' }} />
        <h2
          style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.03em', marginBottom: '16px' }}
          className="gradient-text"
        >
          See IrisOS in Action
        </h2>
        <p style={{ fontFamily: BODY, fontSize: '16px', color: 'rgba(232,232,232,0.45)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          A two-minute tour of the agency console that regulates your operational focus.
        </p>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: '28px',
          overflow: 'hidden',
          background: '#0d0d0d',
          boxShadow: 'inset 8px 8px 20px #040404, inset -8px -8px 20px #1a1a1a, 0 0 0 1px rgba(255,255,255,0.05)',
          aspectRatio: '16 / 9',
          maxWidth: '900px',
          margin: '0 auto',
          cursor: 'pointer',
        }}
        onClick={() => setPlaying((p) => !p)}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 40%, transparent 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Decorative iris rings */}
          {[120, 180, 240, 300].map((r, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${r}px`,
                height: `${r}px`,
                borderRadius: '50%',
                border: `1px solid rgba(255,255,255,${0.04 - i * 0.005})`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Play / pause */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#111111',
              boxShadow: '8px 8px 18px #040404, -8px -8px 18px #1e1e1e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {playing ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="rgba(232,232,232,0.8)" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="rgba(232,232,232,0.8)" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 5.5L18.5 12L8 18.5V5.5Z" fill="rgba(232,232,232,0.85)" />
              </svg>
            )}
          </div>

          {/* Label */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: JBMONO,
              fontSize: '11px',
              color: 'rgba(232,232,232,0.3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {playing ? 'Click to pause' : 'Click to play'}
          </div>
        </div>
      </div>
    </section>
  )
}

// â”€â”€â”€ About Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function About() {
  const stats = [
    { value: 'Unlimited', label: 'Clients on the Advanced plan' },
    { value: '14 vs 38 min', label: 'Typical end-to-end workflow time' },
    { value: '9.5 hrs', label: 'Estimated weekly admin time saved' },
    { value: '68% fewer', label: 'Manual handoffs with Miles-assisted workflows' },
  ]

  return (
    <section id="about" style={{ padding: 'clamp(72px, 10vw, 112px) clamp(16px, 5vw, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 'clamp(28px, 6vw, 48px)',
          alignItems: 'center',
        }}
      >
        {/* Copy */}
        <div>
          <div className="section-divider" style={{ marginBottom: '24px' }} />
          <span
            style={{
              fontFamily: JBMONO,
              fontWeight: 400,
              fontSize: '11px',
              color: 'rgba(232,232,232,0.38)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '20px',
            }}
          >
            The Lens of Execution
          </span>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(30px, 3.5vw, 46px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '28px',
            }}
            className="gradient-text"
          >
            The focal point of modern agency operations.
          </h2>
          <p style={{ fontFamily: BODY, fontSize: '16px', color: 'rgba(232,232,232,0.5)', lineHeight: 1.8, marginBottom: '20px' }}>
            We created IrisOS because agency owners are tired of navigating a fragmented stack of disconnected applications. Creative firms lose margin and time juggling client communications, financial tracking, and campaign execution across isolated tools.
          </p>
          <p style={{ fontFamily: BODY, fontSize: '16px', color: 'rgba(232,232,232,0.5)', lineHeight: 1.8 }}>
            IrisOS acts as the operational iris of your firm — regulating the flow of information, aligning client expectations, and focusing delivery coordination. By consolidating your client portals, invoices, campaign metrics, and creative pipelines into one elegant environment, we bring absolute clarity to your agency&apos;s growth.
          </p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {stats.map((s) => (
            <div key={s.value} className="neo-raised" style={{ padding: '32px 24px' }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: '30px',
                  letterSpacing: '-0.03em',
                  color: '#e8e8e8',
                  marginBottom: '10px',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontFamily: BODY, fontSize: '13px', color: 'rgba(232,232,232,0.38)', lineHeight: 1.4 }}>
                {s.label}
              </div>
            </div>
          ))}
          <p className="sm:col-span-2" style={{ margin: 0, fontFamily: JBMONO, fontSize: '10px', color: 'rgba(232,232,232,0.3)', lineHeight: 1.6 }}>
            Illustrative benchmark: the same 12-step agency workflow modeled in IrisOS and a comparable multi-tool software stack. Validate against your own process before relying on projected savings.
          </p>
        </div>
      </div>
    </section>
  )
}

// â”€â”€â”€ Features Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WEDGES = [
  {
    id: 0,
    title: 'Core Operations',
    start: -90,
    end: -30,
    side: 'right',
    color: '#1a1a1a',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Central Operations: Synthesize campaign alerts, contractor schedules, and finance reviews.',
      'Core Workflows: Automate invoicing and brand deliveries with high-efficiency pipelines.',
      'Task Tracking: Unified dashboards for projects and tasks across all agency segments.',
    ]
  },
  {
    id: 1,
    title: 'Revenue Ledger',
    start: -30,
    end: 30,
    side: 'right',
    color: '#161616',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Unified Ledger: Multi-currency invoicing and billing (USD, EUR, GBP) in one ledger.',
      'Margin Protection: Automatically flag contractor allocation spikes and margin leaks.',
      'Forecasting: Predict next-quarter margins using real-time campaign performance logs.',
    ]
  },
  {
    id: 2,
    title: 'Ads & Leads',
    start: 30,
    end: 90,
    side: 'right',
    color: '#1f1f1f',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Lead Sync: Sync incoming campaign data and lead pipelines instantly from Meta campaign forms.',
      'Campaign Metrics: Aggregated dashboard of active ROAS, click-through, and conversion rates.',
      'Pipeline Orchestration: Automatically trigger onboarding when leads reach high priority in the pipeline.',
    ]
  },
  {
    id: 3,
    title: 'Client Portals',
    start: 90,
    end: 150,
    side: 'left',
    color: '#131313',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Clearance Hubs: Gated, read-only portals for live milestone tracking and metrics.',
      'Creative Proofing: In-app brief reviews, proof collection, and design sign-offs.',
      'Automated Reports: Trigger campaign reports to send according to client SLAs.',
    ]
  },
  {
    id: 4,
    title: 'Team Coordination',
    start: 150,
    end: 210,
    side: 'left',
    color: '#181818',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Capacity Sync: Keep track of contractor hours, capacity limits, and allocations.',
      'Access Control: Secure permission rings for internal teams, contractors, and clients.',
      'Margin Analysis: Measure cost-to-client ratios in real time for every workspace user.',
    ]
  },
  {
    id: 5,
    title: 'Fluid Scheduling',
    start: 210,
    end: 270,
    side: 'left',
    color: '#1c1c1c',
    borderColor: 'rgba(255,255,255,0.1)',
    details: [
      'Time Orchestration: Frictionless scheduling synced directly to agency availability.',
      'Calendar Sync: Auto-reconcile timezone shifts for international client reviews.',
      'Sequencing: Trigger preparation guides and follow-up templates automatically.',
    ]
  }
];

function PlaceholderCard({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      style={{
        padding: '36px 32px',
        border: '1px dashed rgba(255,255,255,0.06)',
        borderRadius: '24px',
        width: '100%',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          opacity: 0.3,
        }}
      >
        <span style={{ color: '#ffffff', fontSize: '16px' }}>+</span>
      </div>
      <p
        style={{
          fontFamily: BODY,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.25)',
          maxWidth: '220px',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        Select a module on the {side} side of the IrisOS console to expand specifications.
      </p>
    </div>
  );
}

function DetailCard({
  wedge,
  visible,
  side,
  targetId,
}: {
  wedge: typeof WEDGES[0] | null;
  visible: boolean;
  side: 'left' | 'right' | 'bottom';
  targetId: string;
}) {
  const [displayWedge, setDisplayWedge] = useState<typeof WEDGES[0] | null>(wedge);

  useEffect(() => {
    if (wedge) {
      setDisplayWedge(wedge);
    }
  }, [wedge]);

  if (!displayWedge) return null;

  return (
    <div
      className="neo-raised"
      style={{
        padding: '36px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        background: '#111111',
        boxShadow: '8px 8px 24px #040404, -8px -8px 24px #1e1e1e',
        width: '100%',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'none'
          : side === 'left'
          ? 'translateX(-30px)'
          : side === 'right'
          ? 'translateX(30px)'
          : 'translateY(20px)',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Target anchor point for the line */}
      {side !== 'bottom' && (
        <div
          id={targetId}
          style={{
            position: 'absolute',
            top: '50%',
            [targetId === 'left-card-target' ? 'right' : 'left']: '-6px',
            transform: 'translateY(-50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 8px #ffffff',
          }}
        />
      )}

      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(15px)',
          transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
        }}
      >
        <span
          style={{
            fontFamily: JBMONO,
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '16px',
          }}
        >
          Module Specifications
        </span>
        <h3
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: '22px',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: '20px',
            lineHeight: 1.2,
          }}
        >
          {displayWedge.title}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayWedge.details.map((detail, idx) => {
            const [boldPart, rest] = detail.split(': ');
            return (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.4)',
                    marginTop: '8px',
                    flexShrink: 0,
                  }}
                />
                <p
                  style={{
                    fontFamily: BODY,
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  <strong style={{ color: '#ffffff', fontWeight: 600 }}>{boldPart}:</strong>
                  {rest ? ` ${rest}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
        <span style={{ fontFamily: JBMONO, fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
          Active Link Connection established
        </span>
      </div>
    </div>
  );
}

function Features() {
  const [hoveredWedge, setHoveredWedge] = useState<number | null>(null);
  const [activeWedge, setActiveWedge] = useState<number | null>(null);
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const irisRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for clicks outside the Iris to close cards and center
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // If clicking inside the Iris container, let the wedge click handlers do their job.
      if (irisRef.current && irisRef.current.contains(target)) {
        return;
      }

      // Check if clicking inside left or right detail cards (if open)
      const leftCard = document.getElementById('left-card-target')?.parentElement;
      const rightCard = document.getElementById('right-card-target')?.parentElement;
      if ((leftCard && leftCard.contains(target)) || (rightCard && rightCard.contains(target))) {
        return;
      }

      // Otherwise, close the detail cards and reset highlights
      setActiveWedge(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate radial fibers of a real iris
  const spokes = useMemo(() => {
    // Deterministic seeded generator to avoid client/server hydration mismatches
    let seed = 888;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const temp = [];
    for (let i = 0; i < 180; i++) {
      const angle = (i * 2) * Math.PI / 180;
      const lengthFactor = 0.45 + random() * 0.55;
      const r_start = 74 + random() * 15;
      const r_end = r_start + (201 - r_start) * lengthFactor;
      const opacity = 0.07 + random() * 0.18;
      temp.push({
        x1: 250 + r_start * Math.cos(angle),
        y1: 250 + r_start * Math.sin(angle),
        x2: 250 + r_end * Math.cos(angle),
        y2: 250 + r_end * Math.sin(angle),
        opacity,
      });
    }
    return temp;
  }, []);

  // Concentric wavy contraction furrows
  const wavyRing1 = useMemo(() => {
    let d = '';
    const points = 72;
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * Math.PI / 180;
      const r = 115 + Math.sin(i * 5) * 2.5;
      const x = 250 + r * Math.cos(angle);
      const y = 250 + r * Math.sin(angle);
      if (i === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }
    return d + ' Z';
  }, []);

  const wavyRing2 = useMemo(() => {
    let d = '';
    const points = 90;
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * Math.PI / 180;
      const r = 165 + Math.cos(i * 6) * 3;
      const x = 250 + r * Math.cos(angle);
      const y = 250 + r * Math.sin(angle);
      if (i === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }
    return d + ' Z';
  }, []);

  // Recalculate line connection coordinates dynamically on wedge/window change
  useEffect(() => {
    const handleResize = () => {
      if (activeWedge === null) {
        setLineCoords(null);
        return;
      }

      const container = document.getElementById('iris-section-container');
      const wedgeElem = document.getElementById(`wedge-target-${activeWedge}`);
      const cardTargetElem = activeWedge >= 3
        ? document.getElementById('left-card-target')
        : document.getElementById('right-card-target');

      if (container && wedgeElem && cardTargetElem) {
        const containerRect = container.getBoundingClientRect();
        const wedgeRect = wedgeElem.getBoundingClientRect();
        const cardRect = cardTargetElem.getBoundingClientRect();

        setLineCoords({
          x1: wedgeRect.left + wedgeRect.width / 2 - containerRect.left,
          y1: wedgeRect.top + wedgeRect.height / 2 - containerRect.top,
          x2: cardRect.left + cardRect.width / 2 - containerRect.left,
          y2: cardRect.top + cardRect.height / 2 - containerRect.top,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    // Double trigger to account for component mounting and css animation delays
    const timer1 = setTimeout(handleResize, 100);
    const timer2 = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeWedge]);

  // Path generator for donut sectors
  const getWedgePath = (cx: number, cy: number, r: number, R: number, startAngle: number, endAngle: number) => {
    const rad = Math.PI / 180;
    const x1_out = cx + R * Math.cos(startAngle * rad);
    const y1_out = cy + R * Math.sin(startAngle * rad);
    const x2_out = cx + R * Math.cos(endAngle * rad);
    const y2_out = cy + R * Math.sin(endAngle * rad);

    const x1_in = cx + r * Math.cos(endAngle * rad);
    const y1_in = cy + r * Math.sin(endAngle * rad);
    const x2_in = cx + r * Math.cos(startAngle * rad);
    const y2_in = cy + r * Math.sin(startAngle * rad);

    return `M ${x1_out} ${y1_out} A ${R} ${R} 0 0 1 ${x2_out} ${y2_out} L ${x1_in} ${y1_in} A ${r} ${r} 0 0 0 ${x2_in} ${y2_in} Z`;
  };

  return (
    <section id="features" style={{ padding: 'clamp(72px, 10vw, 112px) clamp(16px, 5vw, 32px)', maxWidth: '1400px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
      <ScrollReveal style={{ textAlign: 'center', marginBottom: '72px' }}>
        <div className="section-divider" style={{ margin: '0 auto 24px' }} />
        <span
          style={{
            fontFamily: JBMONO,
            fontWeight: 400,
            fontSize: '11px',
            color: 'rgba(232,232,232,0.38)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '20px',
          }}
        >
          Console Ecosystem
        </span>
        <h2
          style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.03em', marginBottom: '16px' }}
          className="gradient-text"
        >
          Consolidating your agency&apos;s entire operation into a single, high-fidelity lens.
        </h2>
        <p style={{ fontFamily: BODY, fontSize: '16px', color: 'rgba(232,232,232,0.45)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Hover and click on the sectors of the IrisOS console below to expand detailed specifications.
        </p>
      </ScrollReveal>

      <ScrollReveal
        id="iris-section-container"
        delay="0.2s"
        className="flex flex-col lg:flex-row items-center justify-center gap-10"
        style={{
          position: 'relative',
          maxWidth: '1300px',
          margin: '0 auto',
          minHeight: 'clamp(420px, 58vw, 600px)',
          width: '100%',
        }}
      >

        {/* Left Side â€” displays active detail card if left wedge is clicked */}
        <div
          className="hidden lg:block"
          style={{
            width: activeWedge !== null && activeWedge >= 3 ? '360px' : '0px',
            flexShrink: 0,
            zIndex: 6,
            overflow: 'hidden',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ width: '360px' }}>
            <DetailCard
              wedge={activeWedge !== null && activeWedge >= 3 ? WEDGES[activeWedge] : null}
              visible={activeWedge !== null && activeWedge >= 3}
              side="left"
              targetId="left-card-target"
            />
          </div>
        </div>

        {/* Center Panel â€” holds the Large Interactive Iris Eye */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 7, flexShrink: 0 }}>
          <div
            ref={irisRef}
            style={{
              width: 'clamp(300px, 82vw, 580px)',
              maxWidth: '100%',
              aspectRatio: '1/1',
              borderRadius: '50%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.02)',
              background: '#070707',
              border: '1px solid rgba(255,255,255,0.03)',
              padding: '16px',
            }}
          >
            {isMounted ? (
            <svg
              viewBox="0 0 500 500"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                {/* Fiber linear gradient */}
                <linearGradient id="fiber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#27272a" stopOpacity="0.04" />
                </linearGradient>
                {/* Glow filter for connecting lines */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Biological Radial Fibers Background Layer */}
              <g pointerEvents="none">
                {spokes.map((s, idx) => (
                  <line
                    key={idx}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="url(#fiber-grad)"
                    strokeWidth="0.8"
                    opacity={s.opacity}
                  />
                ))}
              </g>

              {/* Concentric Contraction Furrow Waveforms */}
              <path d={wavyRing1} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="6 8" pointerEvents="none" />
              <path d={wavyRing2} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" strokeDasharray="25 15" pointerEvents="none" />

              {/* Interactive Wedges Layer */}
              <g>
                {WEDGES.map((w, idx) => {
                  const isHovered = hoveredWedge === idx;
                  const isActive = activeWedge === idx;

                  // Compute outward translation vector on hover or click
                  const shift = isHovered ? 12 : isActive ? 6 : 0;
                  const rad = Math.PI / 180;
                  const midRad = ((w.start + w.end) / 2) * rad;
                  const tx = shift * Math.cos(midRad);
                  const ty = shift * Math.sin(midRad);

                  // Calculate text placement radius and rotation angle
                  const R_text = 142;
                  const tx_text = (R_text + shift) * Math.cos(midRad);
                  const ty_text = (R_text + shift) * Math.sin(midRad);

                  const midAngle = (w.start + w.end) / 2;
                  let rotateAngle = midAngle;
                  // Flip text on left side of circle to ensure it remains right-side up
                  if (midAngle > 90 || midAngle < -90) {
                    rotateAngle = midAngle + 180;
                  }

                  // Coordinate for connection line target dot
                  const targetX = 250 + (130 + shift) * Math.cos(midRad);
                  const targetY = 250 + (130 + shift) * Math.sin(midRad);

                  return (
                    <g
                      key={w.id}
                      onMouseEnter={() => setHoveredWedge(idx)}
                      onMouseLeave={() => setHoveredWedge(null)}
                      onClick={() => setActiveWedge(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Base Wedge Path */}
                      <path
                        d={getWedgePath(250, 250, 75, 205, w.start, w.end)}
                        transform={`translate(${tx}, ${ty})`}
                        fill={isHovered ? 'rgba(255,255,255,0.06)' : isActive ? 'rgba(255,255,255,0.03)' : 'transparent'}
                        stroke={isActive ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)'}
                        strokeWidth={isActive ? '1.5' : '1'}
                        style={{
                          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), fill 0.3s ease, stroke 0.3s ease',
                        }}
                      />

                      {/* Floating Text Label */}
                      <g
                        transform={`translate(${250 + tx_text}, ${250 + ty_text}) rotate(${rotateAngle})`}
                        style={{
                          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontFamily: DISPLAY,
                            fontWeight: 600,
                            fontSize: isHovered ? '13px' : '11px',
                            fill: isHovered || isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                            transition: 'font-size 0.3s ease, fill 0.3s ease',
                            letterSpacing: '0.04em',
                            userSelect: 'none',
                          }}
                        >
                          {w.title}
                        </text>
                      </g>

                      {/* Target node dot for the dynamic line connection */}
                      <circle
                        id={`wedge-target-${w.id}`}
                        cx={targetX}
                        cy={targetY}
                        r="0"
                        fill="transparent"
                      />
                    </g>
                  );
                })}
              </g>

              {/* Pupil Center with gloss reflections */}
              <circle cx="250" cy="250" r="74" fill="#030303" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" pointerEvents="none" />
              <circle cx="222" cy="222" r="14" fill="#ffffff" opacity="0.08" filter="url(#glow)" pointerEvents="none" />
              <circle cx="218" cy="218" r="6" fill="#ffffff" opacity="0.25" pointerEvents="none" />
            </svg>
          ) : (
            <div style={{ width: '100%', height: '100%' }} />
          )}
        </div>
          <p style={{ margin: 0, fontFamily: JBMONO, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,232,232,0.34)', textAlign: 'center' }}>
            Click on a section to view more
          </p>
      </div>

      {/* Mobile-only Detail Card Container (Visible on mobile/tablet below the eye) */}
      {activeWedge !== null && (
        <div className="block lg:hidden w-full max-w-[90vw] sm:max-w-md mx-auto mt-6 z-10">
          <DetailCard
            wedge={WEDGES[activeWedge]}
            visible={true}
            side="bottom"
            targetId="mobile-card-target"
          />
        </div>
      )}

        {/* Right Side â€” displays active detail card if right wedge is clicked */}
        <div
          className="hidden lg:block"
          style={{
            width: activeWedge !== null && activeWedge < 3 ? '360px' : '0px',
            flexShrink: 0,
            zIndex: 6,
            overflow: 'hidden',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ width: '360px' }}>
            <DetailCard
              wedge={activeWedge !== null && activeWedge < 3 ? WEDGES[activeWedge] : null}
              visible={activeWedge !== null && activeWedge < 3}
              side="right"
              targetId="right-card-target"
            />
          </div>
        </div>

        {/* Dynamic Connecting Line Overlay (Desktop only) */}
        <div
          className="hidden lg:block absolute inset-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            zIndex: 5,
            opacity: activeWedge !== null && lineCoords ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {lineCoords && (
            <svg width="100%" height="100%">
              <defs>
                <linearGradient id="line-glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Blur glow line behind */}
              <line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="4"
                filter="url(#glow)"
              />
              {/* Sharp dashed line in front */}
              <line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                stroke="url(#line-glow-grad)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </svg>
          )}
        </div>
      </ScrollReveal>
    </section>
  );
}

// â”€â”€â”€ Waitlist Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Pricing({ region, plans }: {
  region: PricingRegion;
  plans: ReturnType<typeof pricingCatalog>;
}) {
  return (
    <IrisPricingComparison
      plans={plans}
      region={region}
      showFullPricingLink
    />
  );
}

// Retained temporarily as a rollback reference while the new flip-stack console ships.
void PlaceholderCard;
void Features;

function Waitlist() {
  return (
    <section id="waitlist" style={{ padding: 'clamp(88px, 10vw, 120px) clamp(16px, 5vw, 32px) clamp(112px, 14vw, 160px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <div className="section-divider" style={{ margin: '0 auto 24px' }} />
        <span
          style={{
            fontFamily: JBMONO,
            fontWeight: 400,
            fontSize: '11px',
            color: 'rgba(232,232,232,0.38)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '24px',
          }}
        >
          Get started
        </span>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: '24px',
          }}
          className="gradient-text"
        >
          Ready to clarify your agency&apos;s vision?
        </h2>
        <p style={{ fontFamily: BODY, fontSize: '17px', color: 'rgba(232,232,232,0.45)', lineHeight: 1.7, marginBottom: '56px' }}>
          Consolidate your tools and focus your operations. Create your all-in-one agency workspace.
        </p>

        <div className="neo-raised" style={{ padding: 'clamp(28px, 6vw, 48px) clamp(20px, 6vw, 40px)', display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/waitlist"
            prefetch={false}
            className="neo-button-accent"
            style={{
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: '16px',
              padding: '16px 40px',
              textDecoration: 'none',
              color: '#0a0a0a',
              display: 'inline-block',
              maxWidth: '100%',
              textAlign: 'center',
            }}
          >
            Join the Waitlist
          </Link>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '40px', flexWrap: 'wrap' }}>
          {['Client management', 'Project delivery', 'Team collaboration'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontFamily: JBMONO, fontSize: '11px', color: 'rgba(232,232,232,0.32)', letterSpacing: '0.04em' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '36px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <Image src={irisLogo} alt="IrisOS" width={74} height={28} style={{ height: '28px', width: 'auto', objectFit: 'contain', opacity: 0.6 }} />
      <span style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(232,232,232,0.22)', letterSpacing: '0.02em' }}>
        © 2026 IrisOS. All rights reserved.
      </span>
      <div style={{ display: 'flex', gap: '24px' }}>
        {[
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Cancellations & Refunds', href: '/cancellation-refund-policy' },
        ].map((item) => <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          style={{ fontFamily: BODY, fontSize: '13px', color: 'rgba(232,232,232,0.3)', textDecoration: 'none', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(232,232,232,0.65)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(232,232,232,0.3)' }}
        >
          {item.label}
        </Link>)}
      </div>
    </footer>
  )
}

// â”€â”€â”€ App Root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const { region, plans, loading } = usePlanPricing();

  if (loading) return <IrisLandingSkeleton />;

  return (
    <div
      id="top"
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 80% 60% at 10% 10%, rgba(255,255,255,0.055) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 90% 15%, rgba(255,255,255,0.04) 0%, transparent 50%),
          radial-gradient(ellipse 70% 60% at 50% 95%, rgba(255,255,255,0.025) 0%, transparent 55%),
          #0a0a0a
        `,
      }}
    >
      <IrisMarketingHeader />
      <Hero />
      <VideoSection />
      <About />
      <ConsoleEcosystem />
      <MilesAiSection />
      <Pricing region={region} plans={plans} />
      <Waitlist />
      <Footer />
    </div>
  )
}
