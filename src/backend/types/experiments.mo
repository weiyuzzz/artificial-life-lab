import Common "common";

module {
  public type Experiment = {
    id : Common.ExperimentId;
    owner : Principal;
    name : Text;
    seed : Nat;
    envParams : Text; // JSON
    populationConfig : Text; // JSON
    cycle : Nat;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
    summary : Text; // JSON
  };

  public type ExperimentInput = {
    name : Text;
    seed : Nat;
    envParams : Text;
    populationConfig : Text;
    summary : Text;
  };
};
