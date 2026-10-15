import { APP_NAME } from '../../lib/brand.js';

/** Marca: folha de orçamento com um "check" — proposta aprovada. */
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#132642" />
      <path d="M13 9.5h10.5L29 15v15.5a1.5 1.5 0 0 1-1.5 1.5h-14.5a1.5 1.5 0 0 1-1.5-1.5V11a1.5 1.5 0 0 1 1.5-1.5Z" fill="#fff" />
      <path d="M23.5 9.5V15H29" fill="#bccfe9" />
      <path d="M15.5 16.5h5M15.5 20h9" stroke="#8eaed7" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m16 25.5 2.6 2.6 5.4-5.6" fill="none" stroke="#2a518b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ className = '', markClassName }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight text-navy-900">{APP_NAME}</span>
    </span>
  );
}
