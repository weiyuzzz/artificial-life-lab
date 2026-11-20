import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinMemberInvites "mo:caffeineai-user-approval/MixinMemberInvites";
import MixinUserApproval "mo:caffeineai-user-approval/MixinUserApproval";
import Invites "mo:caffeineai-user-approval/invites";
import UserApproval "mo:caffeineai-user-approval/approval";
import Expose "mo:caffeineai-oql/Expose";
import Common "types/common";
import ExperimentsLib "lib/experiments";
import StatisticsLib "lib/statistics";
import SnapshotsLib "lib/snapshots";
import ExperimentsApi "mixins/experiments-api";
import StatisticsApi "mixins/statistics-api";
import SnapshotsApi "mixins/snapshots-api";
import ApiDocMixin "mixins/api-doc";
import ExperimentsOql "generated/ExperimentsOql";
import OqlLib "lib/oql";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);
  let approvalState : UserApproval.UserApprovalState;
  include MixinUserApproval(accessControlState, approvalState);
  let invitesState : Invites.InvitesState;
  include MixinMemberInvites(accessControlState, approvalState, invitesState);

  let experiments : ExperimentsLib.Experiments;
  let statChunks : StatisticsLib.StatChunks;
  let snapshots : SnapshotsLib.Snapshots;
  let snapshotParts : SnapshotsLib.SnapshotParts;
  let counters : Common.Counters;

  include ExperimentsApi(accessControlState, approvalState, experiments, statChunks, snapshots, snapshotParts, counters);
  include StatisticsApi(accessControlState, approvalState, experiments, statChunks);
  include SnapshotsApi(accessControlState, approvalState, experiments, snapshots, snapshotParts, counters);

  include ApiDocMixin();

  include Expose({
    entities = [
      ExperimentsOql.entity(experiments),
      OqlLib.statChunkEntity(experiments, statChunks),
      OqlLib.snapshotEntity(experiments, snapshots),
      OqlLib.snapshotPartEntity(experiments, snapshots, snapshotParts),
    ];
  });
};
