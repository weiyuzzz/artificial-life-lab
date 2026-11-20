import type { GeneKey } from "@/engine";
import { GENE_RANGES } from "@/engine";

/** Fixed-precision numeric readout. */
export function fmt(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

/** Gene value formatted with a precision suited to its range. */
export function fmtGene(key: GeneKey, value: number): string {
  return key === "vision" ? fmt(value, 0) : fmt(value, 2);
}

/** Gene value normalized into 0–1 by its absolute allowed range. */
export function normGene(key: GeneKey, value: number): number {
  const r = GENE_RANGES[key];
  const n = (value - r.min) / (r.max - r.min);
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
