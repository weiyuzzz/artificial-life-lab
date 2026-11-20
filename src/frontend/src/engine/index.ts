/** Public API of the artificial life engine (UI-independent, no React). */
export * from "./types";
export * from "./params";
export { Rng, type RngState } from "./rng";
export { SpatialHash } from "./spatialHash";
export {
  GENE_RANGES,
  type GeneRange,
  type Traits,
  clampGene,
  deriveTraits,
  inheritGenome,
  randomGenome,
} from "./genetics";
export {
  NN_HIDDEN,
  NN_INPUTS,
  NN_INPUT_KEYS,
  NN_OUTPUTS,
  NN_OUTPUT_KEYS,
  NN_WEIGHT_COUNT,
  type NNInputKey,
  type NNOutputKey,
} from "./neuralNetwork";
export { ZONE_PROPS, axisDelta, zoneAt, zoneShares } from "./world";
export { OPTIMAL_TEMPERATURE, temperatureStress } from "./energy";
export {
  type OrganismView,
  maturityAge,
  readTrail,
  toOrganismView,
} from "./organisms";
export { isReadyToMate, reproductionThreshold } from "./reproduction";
export {
  EVENT_DEFINITIONS,
  FOOD_ABUNDANCE_PLANTS,
  type EventDefinition,
  type EventEffects,
} from "./events";
export { LineageRegistry } from "./lineage";
export { StatisticsCollector, type CollectorState } from "./statistics";
export {
  MAX_STEPS_PER_FRAME,
  SimulationEngine,
  type FastForwardOptions,
  type FastForwardResult,
} from "./engine";
export {
  type ExperimentData,
  type SerializedOrganism,
  type SerializedPlant,
  type SimSnapshot,
  SNAPSHOT_VERSION,
  buildExperiment,
  byteLength,
  exportExperimentJSON,
  exportState,
  importExperimentJSON,
  importState,
  isSnapshot,
  joinSerialized,
  joinSnapshot,
  loadExperiment,
  splitSerialized,
  splitSnapshot,
  statsToCSV,
} from "./serialization";
