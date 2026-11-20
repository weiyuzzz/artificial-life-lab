import type { EventKey, GeneKey, Species } from "@/engine";
import { EVENT_KEYS, GENE_KEYS, SPECIES } from "@/engine";
import type { TranslateFn } from "@/i18n";

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatDecimal(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function isSpecies(v: unknown): v is Species {
  return typeof v === "string" && (SPECIES as readonly string[]).includes(v);
}

function isGene(v: unknown): v is GeneKey {
  return typeof v === "string" && (GENE_KEYS as readonly string[]).includes(v);
}

function isEvent(v: unknown): v is EventKey {
  return typeof v === "string" && (EVENT_KEYS as readonly string[]).includes(v);
}

export function speciesLabel(t: TranslateFn, v: unknown): string {
  return isSpecies(v) ? t(`species.${v}` as const) : String(v ?? "");
}

export function geneLabel(t: TranslateFn, v: unknown): string {
  return isGene(v) ? t(`gene.${v}` as const) : String(v ?? "");
}

export function eventLabel(t: TranslateFn, v: unknown): string {
  return isEvent(v) ? t(`event.${v}` as const) : String(v ?? "");
}

export function paramNumber(v: number | string | undefined): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}
