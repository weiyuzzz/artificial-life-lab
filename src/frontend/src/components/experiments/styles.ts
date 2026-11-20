/** Shared console control styles for experiment surfaces (sharp, mono, uppercase). */
const base =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-sm px-3 font-mono text-[10px] font-medium uppercase tracking-wider transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

export const primaryButton = `${base} bg-primary text-primary-foreground hover:bg-primary/85`;

export const ctlButton = `${base} border border-input bg-transparent text-foreground hover:border-primary/60 hover:bg-muted/50`;

export const ghostButton = `${base} px-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground`;

export const dangerButton = `${base} px-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive`;

export const fieldInput =
  "h-8 rounded-sm border-input bg-background/60 font-mono text-xs";
