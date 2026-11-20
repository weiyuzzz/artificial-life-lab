module {
  public type Timestamp = Int;
  public type ExperimentId = Nat;
  public type SnapshotId = Nat;

  public type ApiError = {
    #notFound;
    #notAuthorized;
    #invalidInput : Text;
  };

  public type Counters = {
    var nextExperimentId : Nat;
    var nextSnapshotId : Nat;
  };
};
