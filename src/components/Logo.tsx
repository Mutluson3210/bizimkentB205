export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="white" stroke="#e3e7ee" />
      <path d="M14 20 L24 12 L34 20" stroke="#c62828" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M18 17 L27 17 L31 20 L18 20 Z" fill="#173f78" />
      <path d="M16 23 H24 V27 H32 V36 H16 Z" fill="#1e8e4e" />
    </svg>
  );
}

export function Logo({ size = 36, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="leading-tight">
        <p className="font-semibold text-foreground">Bizimkent B205</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
