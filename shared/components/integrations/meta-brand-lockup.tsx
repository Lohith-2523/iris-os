import Image from 'next/image';

export function MetaLogo({ className = 'h-4 w-6' }: { className?: string }) {
  return <Image src="/meta_logo.png" alt="" width={30} height={20} className={`shrink-0 object-contain ${className}`} aria-hidden="true" />;
}

export function MetaEnabledLabel({ className = '' }: { className?: string }) {
  return (
    <div aria-label="Meta enabled" className={`inline-flex h-5 items-center justify-center gap-3 ${className}`}>
      <span className="integration-meta-logo relative inline-flex h-5 w-15 shrink-0 items-center justify-center" aria-hidden="true">
        <Image src="/meta_light.png" alt="" width={300} height={125} unoptimized className="integration-meta-logo-light absolute left-1/2 top-1/2 h-24 w-auto max-w-none -translate-x-1/2 -translate-y-1/2 scale-[1.5] object-contain" />
        <Image src="/meta_dark.png" alt="" width={300} height={125} unoptimized className="integration-meta-logo-dark absolute left-1/2 top-1/2 h-24 w-auto max-w-none -translate-x-1/2 -translate-y-1/2 scale-[1.5] object-contain" />
      </span>
      <span className="inline-flex h-5 shrink-0 items-center text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-zinc-300">Enabled</span>
    </div>
  );
}
