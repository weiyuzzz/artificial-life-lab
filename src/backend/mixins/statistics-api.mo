import AccessControl "mo:caffeineai-authorization/access-control";
import UserApproval "mo:caffeineai-user-approval/approval";
import Result "mo:core/Result";
import Common "../types/common";
import StatTypes "../types/statistics";
import ExperimentsLib "../lib/experiments";
import StatisticsLib "../lib/statistics";
import Guards "../lib/guards";

mixin (
  accessControlState : AccessControl.AccessControlState,
  approvalState : UserApproval.UserApprovalState,
  experiments : ExperimentsLib.Experiments,
  statChunks : StatisticsLib.StatChunks,
) {
  // Upsert a stats chunk at chunkIndex (retry-safe). Owner + approved/admin only.
  public shared ({ caller }) func appendStatChunk(experimentId : Common.ExperimentId, chunkIndex : Nat, data : Text) : async Result.Result<StatTypes.StatChunk, Common.ApiError> {
    if (not Guards.isMember(accessControlState, approvalState, caller)) return #err(#notAuthorized);
    ExperimentsLib.getOwned(experiments, caller, experimentId).chain(
      func _ = StatisticsLib.put(statChunks, experimentId, chunkIndex, data)
    );
  };

  // Ordered by chunkIndex; owner only.
  public query ({ caller }) func listStatChunks(experimentId : Common.ExperimentId, offset : Nat, limit : Nat) : async Result.Result<StatTypes.StatChunkPage, Common.ApiError> {
    ExperimentsLib.getOwned(experiments, caller, experimentId).mapOk(
      func _ = StatisticsLib.page(statChunks, experimentId, offset, limit)
    );
  };
};
