/**
 * Uniform spatial hash grid built with a counting sort (no per-cell arrays).
 * Rebuilt each step from entity positions; queries return candidate indices
 * from all cells overlapping a radius, so callers do a final distance check.
 */
export class SpatialHash {
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private cellStart: Int32Array;
  private cellCount: Int32Array;
  private items: Int32Array;
  private itemCell: Int32Array;
  private size = 0;

  constructor(width: number, height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    const cells = this.cols * this.rows;
    this.cellStart = new Int32Array(cells + 1);
    this.cellCount = new Int32Array(cells);
    this.items = new Int32Array(256);
    this.itemCell = new Int32Array(256);
  }

  private cellOf(x: number, y: number): number {
    let cx = Math.floor(x / this.cellSize);
    let cy = Math.floor(y / this.cellSize);
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  /** Rebuild from a list of positioned entities; item index = array index. */
  build(entities: ReadonlyArray<{ x: number; y: number }>): void {
    const n = entities.length;
    if (this.items.length < n) {
      const cap = Math.max(n, this.items.length * 2);
      this.items = new Int32Array(cap);
      this.itemCell = new Int32Array(cap);
    }
    this.size = n;
    this.cellCount.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.cellOf(entities[i].x, entities[i].y);
      this.itemCell[i] = c;
      this.cellCount[c]++;
    }
    const cells = this.cols * this.rows;
    let acc = 0;
    for (let c = 0; c < cells; c++) {
      this.cellStart[c] = acc;
      acc += this.cellCount[c];
    }
    this.cellStart[cells] = acc;
    this.cellCount.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.itemCell[i];
      this.items[this.cellStart[c] + this.cellCount[c]] = i;
      this.cellCount[c]++;
    }
  }

  get length(): number {
    return this.size;
  }

  /**
   * Collect candidate indices near (x, y) within radius r into `out`
   * (cleared first). With wrap, cell ranges wrap around the edges.
   */
  query(
    x: number,
    y: number,
    r: number,
    wrap: boolean,
    out: number[],
  ): number[] {
    out.length = 0;
    const cs = this.cellSize;
    let x0 = Math.floor((x - r) / cs);
    let x1 = Math.floor((x + r) / cs);
    let y0 = Math.floor((y - r) / cs);
    let y1 = Math.floor((y + r) / cs);
    if (wrap) {
      // Expand one cell each side to cover partial edge cells when wrapping.
      x0--;
      x1++;
      y0--;
      y1++;
      if (x1 - x0 + 1 > this.cols) {
        x0 = 0;
        x1 = this.cols - 1;
      }
      if (y1 - y0 + 1 > this.rows) {
        y0 = 0;
        y1 = this.rows - 1;
      }
    } else {
      if (x0 < 0) x0 = 0;
      if (y0 < 0) y0 = 0;
      if (x1 >= this.cols) x1 = this.cols - 1;
      if (y1 >= this.rows) y1 = this.rows - 1;
    }
    for (let gy = y0; gy <= y1; gy++) {
      const cy = wrap ? ((gy % this.rows) + this.rows) % this.rows : gy;
      for (let gx = x0; gx <= x1; gx++) {
        const cx = wrap ? ((gx % this.cols) + this.cols) % this.cols : gx;
        const c = cy * this.cols + cx;
        const end = this.cellStart[c + 1];
        for (let k = this.cellStart[c]; k < end; k++) out.push(this.items[k]);
      }
    }
    return out;
  }
}
