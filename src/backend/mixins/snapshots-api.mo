import AccessControl "mo:caffeineai-authorization/access-control";
import UserApproval "mo:caffeineai-user-approval/approval";
import Result "mo:core/Result";
import Common "../types/common";
import SnapTypes "../types/snapshots";
import ExperimentsLib "../lib/experiments";
import SnapshotsLib "../lib/snapshots";
import Guards "../lib/guards";

mixin (
  accessControlState : AccessControl.AccessControlState,
  approvalState : UserApproval.UserApprovalState,
  experiments : ExperimentsLib.Experiments,
  snapshots : SnapshotsLib.Snapshots,
  snapshotParts : SnapshotsLib.SnapshotParts,
  counters : Common.Counters,
) {
  // Snapshot metadata when caller owns its experiment.
  func ownedSnapshot(caller : Principal, snapshotId : Common.SnapshotId) : Result.Result<SnapTypes.SnapshotMeta, Common.ApiError> {
    switch (SnapshotsLib.get(snapshots, snapshotId)) {
      case null { #err(#notFound) };
      case (?meta) {
        ExperimentsLib.getOwned(experiments, caller, meta.experimentId).mapOk(func _ = meta);
      };
    };
  };

  public shared ({ caller }) func createSnapshot(experimentId : Common.ExperimentId, input : SnapTypes.SnapshotInput) : async Result.Result<SnapTypes.SnapshotView, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.getOwned(experiments, caller, experimentId).chain(
      func _ = SnapshotsLib.create(snapshots, counters, experimentId, input)
    );
  };

  public shared ({ caller }) func putSnapshotPart(snapshotId : Common.SnapshotId, partIndex : Nat, data : Text) : async Result.Result<(), Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ownedSnapshot(caller, snapshotId).chain(
      func _ = SnapshotsLib.putPart(snapshots, snapshotParts, snapshotId, partIndex, data)
    );
  };

  public query ({ caller }) func listSnapshots(experimentId : Common.ExperimentId) : async Result.Result<[SnapTypes.SnapshotView], Common.ApiError> {
    ExperimentsLib.getOwned(experiments, caller, experimentId).mapOk(
      func _ = SnapshotsLib.listForExperiment(snapshots, snapshotParts, experimentId)
    );
  };

  public query ({ caller }) func getSnapshotParts(snapshotId : Common.SnapshotId, offset : Nat, limit : Nat) : async Result.Result<SnapTypes.SnapshotPartPage, Common.ApiError> {
    ownedSnapshot(caller, snapshotId).mapOk(
      func _ = SnapshotsLib.partsPage(snapshotParts, snapshotId, offset, limit)
    );
  };

  public shared ({ caller }) func deleteSnapshot(snapshotId : Common.SnapshotId) : async Result.Result<(), Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ownedSnapshot(caller, snapshotId).mapOk(
      func _ = SnapshotsLib.remove(snapshots, snapshotParts, snapshotId)
    );
  };

  // Keep only the newest `keep` auto snapshots of the experiment; returns number removed.
  public shared ({ caller }) func pruneAutoSnapshots(experimentId : Common.ExperimentId, keep : Nat) : async Result.Result<Nat, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.getOwned(experiments, caller, experimentId).mapOk(
      func _ = SnapshotsLib.pruneAuto(snapshots, snapshotParts, experimentId, keep)
    );
  };
};
