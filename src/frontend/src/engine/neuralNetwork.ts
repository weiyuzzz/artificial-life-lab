import type { Rng } from "./rng";
import type { Activations, Species } from "./types";

/**
 * Feedforward network: 10 inputs → 8 tanh hidden → 6 tanh outputs.
 * Weight layout (flat array): W1[h*IN + i], b1[h], W2[o*HID + h], b2[o].
 */
export const NN_INPUTS = 10;
export const NN_HIDDEN = 8;
export const NN_OUTPUTS = 6;

export const NN_INPUT_KEYS = [
  "energy",
  "age",
  "foodDistance",
  "foodDirection",
  "predatorDistance",
  "predatorDirection",
  "preyDistance",
  "preyDirection",
  "danger",
  "kin",
] as const;
export type NNInputKey = (typeof NN_INPUT_KEYS)[number];

export const NN_OUTPUT_KEYS = [
  "moveX",
  "moveY",
  "explore",
  "eat",
  "flee",
  "reproduce",
] as const;
export type NNOutputKey = (typeof NN_OUTPUT_KEYS)[number];

const W1 = 0;
const B1 = W1 + NN_HIDDEN * NN_INPUTS;
const W2 = B1 + NN_HIDDEN;
const B2 = W2 + NN_OUTPUTS * NN_HIDDEN;
export const NN_WEIGHT_COUNT = B2 + NN_OUTPUTS;
const WEIGHT_LIMIT = 4;

export const OUT_MOVE_X = 0;
export const OUT_MOVE_Y = 1;
export const OUT_EXPLORE = 2;
export const OUT_EAT = 3;
export const OUT_FLEE = 4;
export const OUT_REPRODUCE = 5;

export function createActivations(): Activations {
  return {
    inputs: new Array<number>(NN_INPUTS).fill(0),
    hidden: new Array<number>(NN_HIDDEN).fill(0),
    outputs: new Array<number>(NN_OUTPUTS).fill(0),
  };
}

function setW1(w: number[], h: number, i: number, v: number) {
  w[W1 + h * NN_INPUTS + i] += v;
}
function setW2(w: number[], o: number, h: number, v: number) {
  w[W2 + o * NN_HIDDEN + h] += v;
}

/**
 * Initial weights: small Gaussian noise plus hand-shaped "instinct" circuits
 * so the first generation can survive, while every individual differs.
 */
export function createInitialWeights(species: Species, rng: Rng): number[] {
  const w = new Array<number>(NN_WEIGHT_COUNT);
  for (let k = 0; k < NN_WEIGHT_COUNT; k++) w[k] = rng.gaussian() * 0.25;
  const pred = species === "predator";
  // h0 hunger: active when energy is low
  setW1(w, 0, 0, -2.5);
  w[B1 + 0] += 1.2;
  // h1 danger: predators nearby
  setW1(w, 1, 8, 2.5);
  setW1(w, 1, 4, 1.5);
  w[B1 + 1] -= 0.5;
  // h2 readiness: high energy
  setW1(w, 2, 0, 2.5);
  w[B1 + 2] -= 1.5;
  // h3 food/prey seen
  setW1(w, 3, pred ? 6 : 2, 2);
  w[B1 + 3] -= 0.3;
  // h4 target direction pass-through, h5 threat direction pass-through
  setW1(w, 4, pred ? 7 : 3, 1.5);
  setW1(w, 5, 5, 1.5);
  // outputs
  w[B2 + OUT_MOVE_X] += 0.6;
  setW2(w, OUT_MOVE_Y, 4, 1);
  setW2(w, OUT_MOVE_Y, 5, pred ? 0 : -1);
  w[B2 + OUT_EXPLORE] += 0.2;
  setW2(w, OUT_EXPLORE, 0, 0.8);
  setW2(w, OUT_EXPLORE, 3, -0.6);
  w[B2 + OUT_EAT] += 0.2;
  setW2(w, OUT_EAT, 0, 1.5);
  setW2(w, OUT_EAT, 3, 0.8);
  w[B2 + OUT_FLEE] += pred ? -1.5 : -0.5;
  setW2(w, OUT_FLEE, 1, pred ? 0.5 : 2);
  setW2(w, OUT_REPRODUCE, 2, 1.6);
  setW2(w, OUT_REPRODUCE, 0, -0.8);
  return w;
}

/** Forward pass; reads act.inputs, writes act.hidden and act.outputs. */
export function forward(w: number[], act: Activations): void {
  const inp = act.inputs;
  const hid = act.hidden;
  const out = act.outputs;
  for (let h = 0; h < NN_HIDDEN; h++) {
    let s = w[B1 + h];
    const row = W1 + h * NN_INPUTS;
    for (let i = 0; i < NN_INPUTS; i++) s += w[row + i] * inp[i];
    hid[h] = Math.tanh(s);
  }
  for (let o = 0; o < NN_OUTPUTS; o++) {
    let s = w[B2 + o];
    const row = W2 + o * NN_HIDDEN;
    for (let h = 0; h < NN_HIDDEN; h++) s += w[row + h] * hid[h];
    out[o] = Math.tanh(s);
  }
}

/** Neuron-block crossover: each hidden unit (in + out weights) from one parent. */
export function crossoverWeights(a: number[], b: number[], rng: Rng): number[] {
  const w = a.slice();
  for (let h = 0; h < NN_HIDDEN; h++) {
    if (!rng.chance(0.5)) continue;
    const row = W1 + h * NN_INPUTS;
    for (let i = 0; i < NN_INPUTS; i++) w[row + i] = b[row + i];
    w[B1 + h] = b[B1 + h];
    for (let o = 0; o < NN_OUTPUTS; o++)
      w[W2 + o * NN_HIDDEN + h] = b[W2 + o * NN_HIDDEN + h];
  }
  for (let o = 0; o < NN_OUTPUTS; o++)
    if (rng.chance(0.5)) w[B2 + o] = b[B2 + o];
  return w;
}

export function mutateWeights(w: number[], prob: number, rng: Rng): void {
  for (let k = 0; k < w.length; k++) {
    if (!rng.chance(prob)) continue;
    const scale = rng.chance(0.1) ? 0.6 : 0.15;
    let v = w[k] + rng.gaussian() * scale;
    if (v > WEIGHT_LIMIT) v = WEIGHT_LIMIT;
    else if (v < -WEIGHT_LIMIT) v = -WEIGHT_LIMIT;
    w[k] = v;
  }
}
