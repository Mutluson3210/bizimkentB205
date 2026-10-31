export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl border border-border bg-white"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="Bizimkent B205" width={size} height={size} className="h-full w-full object-contain" />
    </div>
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

export function SiteSeal({ size = 112, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/site-seal.png"
        alt="Bizimkent B205"
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
      <div className="text-center leading-tight">
        <p className="font-semibold text-foreground">Bizimkent B205</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
