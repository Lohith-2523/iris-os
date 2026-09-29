'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isWaitlistGateActive } from '@/lib/waitlist-config';

const BODY = 'var(--font-geist-sans), sans-serif';
const IRIS_LOGO = '/iris-logo-black-bg.png';

export function useKnownDeviceAccess(enabled = true) {
  const [knownDevice, setKnownDevice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch('/api/auth/device-access', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((device: { knownDevice?: boolean } | null) => setKnownDevice(device?.knownDevice === true))
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') {
          console.error('Unable to check direct access:', error);
          setKnownDevice(false);
        }
      });
    return () => controller.abort();
  }, [enabled]);

  return knownDevice;
}

export function IrisMarketingHeader({ knownDevice: knownDeviceProp }: { knownDevice?: boolean } = {}) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const detectedKnownDevice = useKnownDeviceAccess(knownDeviceProp === undefined);
  const knownDevice = knownDeviceProp ?? detectedKnownDevice;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const hasPublicAccess = !isWaitlistGateActive();
  const accessHref = knownDevice || hasPublicAccess ? '/login' : '/waitlist';
  const accessLabel = knownDevice || hasPublicAccess ? 'Login / Sign up' : 'Join the Waitlist';

  const navLinks = [
    { label: 'Preview', href: isHome ? '#video' : '/#video' },
    { label: 'About', href: isHome ? '#about' : '/#about' },
    { label: 'Features', href: isHome ? '#features' : '/#features' },
    { label: 'Pricing', href: isHome ? '#pricing' : '/pricing' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 py-3 sm:px-5 md:px-6 md:py-5">
      <div
        className="mx-auto flex w-[350px] max-w-[calc(100vw-24px)] items-center justify-between px-3 py-2 sm:w-[min(92vw,760px)] sm:px-5 sm:py-3 md:w-[min(92vw,1080px)] md:px-7 md:py-4 lg:w-[min(90vw,1240px)] xl:w-[1240px]"
        style={{
          background: scrolled ? '#111111' : 'rgba(17,17,17,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '999px',
          boxShadow: scrolled
            ? '8px 8px 18px #040404, -8px -8px 18px #1e1e1e, 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 0 0 1px rgba(255,255,255,0.05)',
          transition: 'background-color 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Link href={isHome ? '#top' : '/'} className="flex items-center no-underline" aria-label="IrisOS home">
          <Image
            src={IRIS_LOGO}
            alt="IrisOS"
            width={105}
            height={40}
            priority
            className="block h-7 w-auto object-contain sm:h-8 md:h-10"
            style={{ width: 'auto' }}
          />
        </Link>

        <nav className="hidden md:flex" style={{ gap: '8px' }} aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={!isHome && link.label === 'Pricing' ? 'page' : undefined}
              style={{
                fontFamily: BODY,
                fontWeight: 500,
                fontSize: '15px',
                color: 'rgba(232,232,232,0.6)',
                textDecoration: 'none',
                padding: '10px 22px',
                borderRadius: '50px',
                transition: 'color 200ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = '#e8e8e8';
                event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(232,232,232,0.6)';
                event.currentTarget.style.background = 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {knownDevice === null ? <span aria-label="Loading account access" className="block h-[43px] w-[142px] animate-pulse rounded-full bg-zinc-800" /> : <Link
            href={accessHref}
            prefetch={false}
            className="neo-button-accent inline-block"
            style={{
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: '14px',
              padding: '12px 26px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              textDecoration: 'none',
              color: '#0a0a0a',
            }}
          >
            {accessLabel}
          </Link>}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex cursor-pointer rounded-full p-2 text-zinc-300 hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="iris-mobile-navigation"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-pointer bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <div
        id="iris-mobile-navigation"
        className={`fixed top-0 right-0 bottom-0 z-50 flex w-64 flex-col justify-between border-l border-zinc-800 bg-[#111] p-6 transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div>
          <div className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
            <Image src={IRIS_LOGO} alt="IrisOS" width={84} height={32} className="h-8 w-auto object-contain" style={{ width: 'auto' }} />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="cursor-pointer rounded-full p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Close navigation menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-2.5 text-base font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                style={{ fontFamily: BODY }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-900 pt-6">
          {knownDevice === null ? <span aria-label="Loading account access" className="block h-[48px] w-full animate-pulse rounded-full bg-zinc-800" /> : <Link
            href={accessHref}
            prefetch={false}
            onClick={() => setIsMobileMenuOpen(false)}
            className="neo-button-accent block w-full cursor-pointer py-3.5 text-center text-sm font-semibold"
            style={{ fontFamily: BODY, textDecoration: 'none', color: '#0a0a0a' }}
          >
            {accessLabel}
          </Link>}
        </div>
      </div>
    </header>
  );
}
