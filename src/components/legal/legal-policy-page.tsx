import Link from 'next/link';
import Image from 'next/image';
import { MarketingHeader } from '@/components/marketing/marketing-header';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

export function LegalPolicyPage({ title, badge, updated, introduction, sections, sources = [] }: {
  title: string;
  badge: string;
  updated: string;
  introduction: string;
  sections: LegalSection[];
  sources?: Array<{ label: string; href: string }>;
}) {
  return <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
    <MarketingHeader />
    <main>
      <section className="border-b border-white/5 px-6 pb-16 pt-36 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex rounded-full border border-white/10 bg-zinc-900 px-4 py-2 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">{badge}</span>
          <h1 className="mt-7 text-4xl font-bold uppercase tracking-tight sm:text-6xl">{title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-400">{introduction}</p>
          <p className="mt-5 font-mono text-sm uppercase tracking-[0.12em] text-zinc-500">Last updated: {updated}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit border border-white/10 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <h2 className="border-b border-white/10 pb-3 text-base font-bold uppercase tracking-wide">Contents</h2>
          <nav className="mt-4 flex flex-col gap-3">{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="text-base leading-6 text-zinc-500 transition hover:text-white">{index + 1}. {section.title}</a>)}</nav>
        </aside>

        <article className="space-y-6">{sections.map((section, index) => <section key={section.id} id={section.id} className="scroll-mt-28 border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <h2 className="border-b border-white/10 pb-4 text-xl font-bold">{index + 1}. {section.title}</h2>
          <div className="mt-5 space-y-4 text-base leading-7 text-zinc-400">
            {section.paragraphs?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
            {section.bullets && <ul className="space-y-3 pl-5">{section.bullets.map((item, itemIndex) => <li key={itemIndex} className="list-disc pl-1">{item}</li>)}</ul>}
            {section.note && <div className="border-l-2 border-zinc-500 bg-zinc-900 px-4 py-3 text-zinc-300">{section.note}</div>}
          </div>
        </section>)}

          {sources.length > 0 && <section className="border border-white/10 bg-zinc-950 p-6 sm:p-8"><h2 className="text-xl font-bold">Regulatory references</h2><p className="mt-3 text-base leading-7 text-zinc-400">These official resources describe the regional frameworks referenced in this policy. The law that applies depends on the individual, organization, processing activity, and jurisdiction.</p><ul className="mt-4 grid gap-3 sm:grid-cols-2">{sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer" className="text-base text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-white">{source.label}</a></li>)}</ul></section>}
        </article>
      </section>
    </main>

    <footer className="border-t border-white/5 px-6 py-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><Image src="/iris-logo-white-transparent.svg" alt="Iris OS" width={120} height={42} className="h-10 w-auto opacity-70" /><span className="text-sm text-zinc-600">© 2026 Iris OS. All rights reserved.</span><div className="flex gap-5 text-sm text-zinc-500"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div></div></footer>
  </div>;
}
