import AccessControl "mo:caffeineai-authorization/access-control";
import Invites "mo:caffeineai-user-approval/invites";
import UserApproval "mo:caffeineai-user-approval/approval";
import Map "mo:core/Map";

module {
  type Experiment = {
    id : Nat;
    owner : Principal;
    name : Text;
    seed : Nat;
    envParams : Text;
    populationConfig : Text;
    cycle : Nat;
    createdAt : Int;
    updatedAt : Int;
    summary : Text;
  };

  type StatChunk = {
    experimentId : Nat;
    chunkIndex : Nat;
    data : Text;
    createdAt : Int;
  };

  type SnapshotMeta = {
    id : Nat;
    experimentId : Nat;
    cycle : Nat;
    createdAt : Int;
    caption : Text;
    auto : Bool;
    partCount : Nat;
  };

  public type OldActor = {};
  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    approvalState : UserApproval.UserApprovalState;
    invitesState : Invites.InvitesState;
    experiments : Map.Map<Nat, Experiment>;
    statChunks : Map.Map<Nat, Map.Map<Nat, StatChunk>>;
    snapshots : Map.Map<Nat, SnapshotMeta>;
    snapshotParts : Map.Map<Nat, Map.Map<Nat, Text>>;
    counters : { var nextExperimentId : Nat; var nextSnapshotId : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    let accessControlState = AccessControl.initState();
    {
      accessControlState;
      approvalState = UserApproval.initState(accessControlState);
      invitesState = Invites.initState();
      experiments = Map.empty();
      statChunks = Map.empty();
      snapshots = Map.empty();
      snapshotParts = Map.empty();
      counters = { var nextExperimentId = 0; var nextSnapshotId = 0 };
    };
  };
};
