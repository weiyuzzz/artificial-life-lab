import Common "common";

module {
  public type SnapshotMeta = {
    id : Common.SnapshotId;
    experimentId : Common.ExperimentId;
    cycle : Nat;
    createdAt : Common.Timestamp;
    caption : Text;
    auto : Bool;
    partCount : Nat;
  };

  public type SnapshotInput = {
    cycle : Nat;
    caption : Text;
    auto : Bool;
    partCount : Nat;
  };

  public type SnapshotView = {
    id : Common.SnapshotId;
    experimentId : Common.ExperimentId;
    cycle : Nat;
    createdAt : Common.Timestamp;
    caption : Text;
    auto : Bool;
    partCount : Nat;
    uploadedParts : Nat;
  };

  public type SnapshotPart = {
    snapshotId : Common.SnapshotId;
    partIndex : Nat;
    data : Text; // JSON
  };

  public type SnapshotPartPage = {
    parts : [SnapshotPart];
    total : Nat;
  };
};
