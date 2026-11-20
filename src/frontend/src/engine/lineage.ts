import { MAX_LINEAGE } from "./params";
import type { DeathCause, LineageRecord, Organism } from "./types";

/** Lineage registry: id → parents, children, generation, birth/death cycles. */
export class LineageRegistry {
  private records = new Map<number, LineageRecord>();

  get size(): number {
    return this.records.size;
  }

  register(org: Organism, cycle: number): void {
    this.records.set(org.id, {
      id: org.id,
      species: org.species,
      generation: org.generation,
      parents: org.parentIds,
      children: [],
      birthCycle: cycle,
      deathCycle: null,
      deathCause: null,
    });
    if (org.parentIds) {
      for (const pid of org.parentIds)
        this.records.get(pid)?.children.push(org.id);
    }
  }

  recordDeath(id: number, cycle: number, cause: DeathCause): void {
    const r = this.records.get(id);
    if (r) {
      r.deathCycle = cycle;
      r.deathCause = cause;
    }
  }

  get(id: number): LineageRecord | undefined {
    return this.records.get(id);
  }

  /** Ancestors breadth-first up to `maxDepth` generations back. */
  getAncestors(
    id: number,
    maxDepth = 6,
  ): { record: LineageRecord; depth: number }[] {
    const out: { record: LineageRecord; depth: number }[] = [];
    const seen = new Set<number>([id]);
    let frontier = [id];
    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const fid of frontier) {
        const parents = this.records.get(fid)?.parents;
        if (!parents) continue;
        for (const pid of parents) {
          if (seen.has(pid)) continue;
          seen.add(pid);
          const r = this.records.get(pid);
          if (r) {
            out.push({ record: r, depth });
            next.push(pid);
          }
        }
      }
      frontier = next;
    }
    return out;
  }

  /** Descendants breadth-first, bounded by depth and count. */
  getDescendants(
    id: number,
    maxDepth = 6,
    maxCount = 500,
  ): { record: LineageRecord; depth: number }[] {
    const out: { record: LineageRecord; depth: number }[] = [];
    const seen = new Set<number>([id]);
    let frontier = [id];
    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const fid of frontier) {
        const children = this.records.get(fid)?.children ?? [];
        for (const cid of children) {
          if (seen.has(cid)) continue;
          seen.add(cid);
          const r = this.records.get(cid);
          if (!r) continue;
          out.push({ record: r, depth });
          next.push(cid);
          if (out.length >= maxCount) return out;
        }
      }
      frontier = next;
    }
    return out;
  }

  /** Drop the oldest dead records once the registry exceeds its bound. */
  prune(limit = MAX_LINEAGE): void {
    if (this.records.size <= limit) return;
    const target = Math.floor(limit * 0.8);
    for (const [id, r] of this.records) {
      if (this.records.size <= target) break;
      if (r.deathCycle !== null) this.records.delete(id);
    }
  }

  toArray(): LineageRecord[] {
    return Array.from(this.records.values(), (r) => ({
      ...r,
      parents: r.parents ? [r.parents[0], r.parents[1]] : null,
      children: r.children.slice(),
    }));
  }

  load(records: LineageRecord[]): void {
    this.records = new Map();
    for (const r of records) {
      this.records.set(r.id, {
        ...r,
        parents: r.parents ? [r.parents[0], r.parents[1]] : null,
        children: r.children.slice(),
      });
    }
  }

  clear(): void {
    this.records = new Map();
  }
}
