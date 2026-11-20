import {
  NN_HIDDEN,
  NN_INPUTS,
  NN_INPUT_KEYS,
  NN_OUTPUTS,
  NN_OUTPUT_KEYS,
  type OrganismView,
} from "@/engine";
import { useI18n } from "@/i18n";
import { fmt } from "./format";

const W = 400;
const H = 250;
const TOP = 22;
const BOTTOM = 8;
const X_IN = 128;
const X_HID = 210;
const X_OUT = 292;
const WEIGHT_LIMIT = 4;
const HIDDEN_IDS = Array.from({ length: NN_HIDDEN }, (_, h) => `h${h}`);

function rowY(i: number, n: number): number {
  return TOP + ((i + 0.5) * (H - TOP - BOTTOM)) / n;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function Edge({
  x1,
  y1,
  x2,
  y2,
  w,
}: { x1: number; y1: number; x2: number; y2: number; w: number }) {
  const m = clamp01(Math.abs(w) / WEIGHT_LIMIT);
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={w >= 0 ? "stroke-chart-1" : "stroke-chart-2"}
      strokeOpacity={0.06 + m * 0.8}
      strokeWidth={0.4 + m * 1.6}
    />
  );
}

function Node({
  x,
  y,
  a,
  label,
}: { x: number; y: number; a: number; label: string }) {
  return (
    <g>
      <title>{`${label}: ${fmt(a)}`}</title>
      <circle
        cx={x}
        cy={y}
        r={6}
        className="fill-background stroke-border"
        strokeWidth={1}
      />
      <circle
        cx={x}
        cy={y}
        r={6}
        className={a >= 0 ? "fill-chart-1" : "fill-chart-2"}
        fillOpacity={clamp01(Math.abs(a))}
      />
    </g>
  );
}

export function NeuralNetDiagram({ organism }: { organism: OrganismView }) {
  const { t } = useI18n();
  const { weights, activations } = organism;
  const b1 = NN_HIDDEN * NN_INPUTS;
  const w2 = b1 + NN_HIDDEN;

  return (
    <div data-ocid="inspector.network.canvas_target">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full font-mono"
        role="img"
        aria-label={t("inspector.neuralNetwork")}
      >
        <text
          x={X_IN}
          y={10}
          textAnchor="end"
          className="fill-muted-foreground text-[8px] uppercase tracking-widest"
        >
          {t("inspector.inputs")}
        </text>
        <text
          x={X_OUT}
          y={10}
          className="fill-muted-foreground text-[8px] uppercase tracking-widest"
        >
          {t("inspector.outputs")}
        </text>
        {HIDDEN_IDS.map((hid, h) =>
          NN_INPUT_KEYS.map((ikey, i) => (
            <Edge
              key={`${hid}-${ikey}`}
              x1={X_IN}
              y1={rowY(i, NN_INPUTS)}
              x2={X_HID}
              y2={rowY(h, NN_HIDDEN)}
              w={weights[h * NN_INPUTS + i] ?? 0}
            />
          )),
        )}
        {NN_OUTPUT_KEYS.map((okey, o) =>
          HIDDEN_IDS.map((hid, h) => (
            <Edge
              key={`${okey}-${hid}`}
              x1={X_HID}
              y1={rowY(h, NN_HIDDEN)}
              x2={X_OUT}
              y2={rowY(o, NN_OUTPUTS)}
              w={weights[w2 + o * NN_HIDDEN + h] ?? 0}
            />
          )),
        )}
        {NN_INPUT_KEYS.map((key, i) => {
          const y = rowY(i, NN_INPUTS);
          const a = activations.inputs[i] ?? 0;
          return (
            <g key={key}>
              <text
                x={4}
                y={y + 3}
                className="fill-muted-foreground text-[8px]"
              >
                {fmt(a)}
              </text>
              <text
                x={X_IN - 10}
                y={y + 3}
                textAnchor="end"
                className="fill-foreground text-[8px]"
              >
                {key}
              </text>
              <Node x={X_IN} y={y} a={a} label={key} />
            </g>
          );
        })}
        {HIDDEN_IDS.map((hid, h) => (
          <Node
            key={hid}
            x={X_HID}
            y={rowY(h, NN_HIDDEN)}
            a={activations.hidden[h] ?? 0}
            label={hid}
          />
        ))}
        {NN_OUTPUT_KEYS.map((key, o) => {
          const y = rowY(o, NN_OUTPUTS);
          const a = activations.outputs[o] ?? 0;
          return (
            <g key={key}>
              <Node x={X_OUT} y={y} a={a} label={key} />
              <text
                x={X_OUT + 10}
                y={y + 3}
                className="fill-foreground text-[8px]"
              >
                {key}
              </text>
              <text
                x={W - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[8px]"
              >
                {fmt(a)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-end gap-3 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-0.5 w-3 bg-chart-1" />
          +w
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-0.5 w-3 bg-chart-2" />
          −w
        </span>
      </div>
    </div>
  );
}
