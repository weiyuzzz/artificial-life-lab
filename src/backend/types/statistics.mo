import Common "common";

module {
  public type StatChunk = {
    experimentId : Common.ExperimentId;
    chunkIndex : Nat;
    data : Text; // JSON batch of sampled stats rows + timeline entries
    createdAt : Common.Timestamp;
  };

  public type StatChunkPage = {
    chunks : [StatChunk];
    total : Nat;
  };
};
