export const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition";

export const cardClass = "rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-dark transition disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background transition disabled:cursor-not-allowed disabled:opacity-50";

export const linkClass = "text-sm font-medium text-brand-navy hover:underline underline-offset-2";

export const navLinkClass =
  "rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-muted transition-colors hover:bg-brand-navy hover:text-white";

export const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

export const errorBoxClass = "whitespace-pre-wrap rounded-lg border border-brand-red/20 bg-brand-red-light px-3 py-2.5 text-sm text-brand-red";

export const successBoxClass = "whitespace-pre-wrap rounded-lg border border-brand-green/20 bg-brand-green-light px-3 py-2.5 text-sm text-brand-green";

export function badgeClass(tone: "navy" | "green" | "red" | "gray"): string {
  const tones = {
    navy: "bg-brand-navy-light text-brand-navy",
    green: "bg-brand-green-light text-brand-green",
    red: "bg-brand-red-light text-brand-red",
    gray: "bg-border text-muted",
  } as const;
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`;
}
