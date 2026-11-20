import AccessControl "mo:caffeineai-authorization/access-control";
import UserApproval "mo:caffeineai-user-approval/approval";
import Result "mo:core/Result";
import Common "../types/common";
import ExpTypes "../types/experiments";
import ExperimentsLib "../lib/experiments";
import StatisticsLib "../lib/statistics";
import SnapshotsLib "../lib/snapshots";
import Guards "../lib/guards";

mixin (
  accessControlState : AccessControl.AccessControlState,
  approvalState : UserApproval.UserApprovalState,
  experiments : ExperimentsLib.Experiments,
  statChunks : StatisticsLib.StatChunks,
  snapshots : SnapshotsLib.Snapshots,
  snapshotParts : SnapshotsLib.SnapshotParts,
  counters : Common.Counters,
) {
  public shared ({ caller }) func createExperiment(input : ExpTypes.ExperimentInput) : async Result.Result<ExpTypes.Experiment, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.create(experiments, counters, caller, input);
  };

  public shared ({ caller }) func renameExperiment(id : Common.ExperimentId, name : Text) : async Result.Result<ExpTypes.Experiment, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.rename(experiments, caller, id, name);
  };

  public shared ({ caller }) func updateExperimentProgress(id : Common.ExperimentId, cycle : Nat, summary : Text) : async Result.Result<ExpTypes.Experiment, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.updateProgress(experiments, caller, id, cycle, summary);
  };

  public query ({ caller }) func getExperiment(id : Common.ExperimentId) : async ?ExpTypes.Experiment {
    switch (ExperimentsLib.getOwned(experiments, caller, id)) {
      case (#ok(e)) { ?e };
      case (#err(_)) { null };
    };
  };

  public query ({ caller }) func listMyExperiments() : async [ExpTypes.Experiment] {
    ExperimentsLib.listByOwner(experiments, caller);
  };

  // Cascades to statistics chunks and snapshots (with parts).
  public shared ({ caller }) func deleteExperiment(id : Common.ExperimentId) : async Result.Result<(), Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.getOwned(experiments, caller, id).mapOk(
      func _ {
        StatisticsLib.removeAll(statChunks, id);
        SnapshotsLib.removeAllForExperiment(snapshots, snapshotParts, id);
        ExperimentsLib.remove(experiments, id);
      }
    );
  };
};
