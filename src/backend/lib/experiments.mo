import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Common "../types/common";
import ExpTypes "../types/experiments";

module {
  public type Experiments = Map.Map<Nat, ExpTypes.Experiment>;

  let maxNameChars = 200;
  let maxJsonChars = 200_000;

  func validName(name : Text) : Result.Result<Text, Common.ApiError> {
    let trimmed = name.trim(#char ' ');
    if (trimmed.size() == 0) return #err(#invalidInput("Name must not be empty"));
    if (trimmed.size() > maxNameChars) return #err(#invalidInput("Name must be at most 200 characters"));
    #ok(trimmed);
  };

  func tooLong(t : Text) : Bool = t.size() > maxJsonChars;

  // Returns the experiment only when `caller` owns it.
  public func getOwned(
    experiments : Experiments,
    caller : Principal,
    id : Common.ExperimentId,
  ) : Result.Result<ExpTypes.Experiment, Common.ApiError> {
    switch (experiments.get(id)) {
      case (?e) { if (e.owner == caller) #ok(e) else #err(#notAuthorized) };
      case null { #err(#notFound) };
    };
  };

  public func create(
    experiments : Experiments,
    counters : Common.Counters,
    owner : Principal,
    input : ExpTypes.ExperimentInput,
  ) : Result.Result<ExpTypes.Experiment, Common.ApiError> {
    let name = switch (validName(input.name)) {
      case (#ok(n)) n;
      case (#err(e)) return #err(e);
    };
    if (tooLong(input.envParams) or tooLong(input.populationConfig) or tooLong(input.summary)) {
      return #err(#invalidInput("envParams, populationConfig and summary must each be at most 200000 characters"));
    };
    let id = counters.nextExperimentId;
    counters.nextExperimentId += 1;
    let now = Time.now();
    let experiment : ExpTypes.Experiment = {
      id;
      owner;
      name;
      seed = input.seed;
      envParams = input.envParams;
      populationConfig = input.populationConfig;
      cycle = 0;
      createdAt = now;
      updatedAt = now;
      summary = input.summary;
    };
    experiments.add(id, experiment);
    #ok(experiment);
  };

  public func rename(
    experiments : Experiments,
    caller : Principal,
    id : Common.ExperimentId,
    name : Text,
  ) : Result.Result<ExpTypes.Experiment, Common.ApiError> {
    let newName = switch (validName(name)) {
      case (#ok(n)) n;
      case (#err(e)) return #err(e);
    };
    getOwned(experiments, caller, id).chain(
      func e {
        let updated = { e with name = newName; updatedAt = Time.now() };
        experiments.add(id, updated);
        #ok(updated);
      }
    );
  };

  public func updateProgress(
    experiments : Experiments,
    caller : Principal,
    id : Common.ExperimentId,
    cycle : Nat,
    summary : Text,
  ) : Result.Result<ExpTypes.Experiment, Common.ApiError> {
    if (tooLong(summary)) return #err(#invalidInput("summary must be at most 200000 characters"));
    getOwned(experiments, caller, id).chain(
      func e {
        let updated = { e with cycle = cycle; summary = summary; updatedAt = Time.now() };
        experiments.add(id, updated);
        #ok(updated);
      }
    );
  };

  public func listByOwner(experiments : Experiments, owner : Principal) : [ExpTypes.Experiment] {
    experiments.values().filter(func e = e.owner == owner).toArray();
  };

  public func remove(experiments : Experiments, id : Common.ExperimentId) {
    experiments.remove(id);
  };
};
