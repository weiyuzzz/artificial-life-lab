import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import ExperimentsLib "experiments";
import StatisticsLib "statistics";
import SnapshotsLib "snapshots";
import SnapTypes "../types/snapshots";

// OQL row adapters for nested/derived collections. Large JSON payloads are not
// exposed; only their metadata and character counts are queryable.
module {
  type ChunkRow = { experimentId : Nat; chunkIndex : Nat; createdAt : Int; dataSize : Nat };
  type PartRow = { snapshotId : Nat; experimentId : Nat; partIndex : Nat; dataSize : Nat };

  // Scoped callers see a row only when they own the experiment referenced by the owner cell.
  func ownsExperiment(experiments : ExperimentsLib.Experiments, caller : Principal, owner : OQL.Value) : Bool {
    switch (owner) {
      case (#nat(id)) {
        switch (experiments.get(id)) {
          case (?e) { e.owner == caller };
          case null { false };
        };
      };
      case (_) { false };
    };
  };

  func chunkRow(r : ChunkRow) : Entity.Row = [
    ("key", #text(r.experimentId.toText() # ":" # r.chunkIndex.toText())),
    ("experimentId", #nat(r.experimentId)),
    ("chunkIndex", #nat(r.chunkIndex)),
    ("createdAt", #int(r.createdAt)),
    ("dataSize", #nat(r.dataSize)),
  ];

  func chunkRows(statChunks : StatisticsLib.StatChunks) : Iter.Iter<ChunkRow> {
    let out = List.empty<ChunkRow>();
    for (inner in statChunks.values()) {
      for (c in inner.values()) {
        out.add({ experimentId = c.experimentId; chunkIndex = c.chunkIndex; createdAt = c.createdAt; dataSize = c.data.size() });
      };
    };
    out.values();
  };

  func snapshotRow(m : SnapTypes.SnapshotMeta) : Entity.Row = [
    ("id", #nat(m.id)),
    ("experimentId", #nat(m.experimentId)),
    ("cycle", #nat(m.cycle)),
    ("createdAt", #int(m.createdAt)),
    ("caption", #text(m.caption)),
    ("auto", #bool(m.auto)),
    ("partCount", #nat(m.partCount)),
  ];

  func partRow(r : PartRow) : Entity.Row = [
    ("key", #text(r.snapshotId.toText() # ":" # r.partIndex.toText())),
    ("snapshotId", #nat(r.snapshotId)),
    ("experimentId", #nat(r.experimentId)),
    ("partIndex", #nat(r.partIndex)),
    ("dataSize", #nat(r.dataSize)),
  ];

  func partRows(snapshots : SnapshotsLib.Snapshots, parts : SnapshotsLib.SnapshotParts) : Iter.Iter<PartRow> {
    let out = List.empty<PartRow>();
    for ((snapshotId, inner) in parts.entries()) {
      switch (snapshots.get(snapshotId)) {
        case (?meta) {
          for ((partIndex, data) in inner.entries()) {
            out.add({ snapshotId; experimentId = meta.experimentId; partIndex; dataSize = data.size() });
          };
        };
        case null {};
      };
    };
    out.values();
  };

  public func statChunkEntity(experiments : ExperimentsLib.Experiments, statChunks : StatisticsLib.StatChunks) : Entity.Decl {
    Entity.new<ChunkRow>("statChunk", func () = chunkRows(statChunks), "StatChunk", "key", chunkRow)
      .sample({ experimentId = 0; chunkIndex = 0; createdAt = 0; dataSize = 0 })
      .ownedByWith("experimentId", func(caller, owner) = ownsExperiment(experiments, caller, owner))
      .controllerOrScoped()
      .build();
  };

  public func snapshotEntity(experiments : ExperimentsLib.Experiments, snapshots : SnapshotsLib.Snapshots) : Entity.Decl {
    Entity.new<SnapTypes.SnapshotMeta>("snapshot", func () = snapshots.values(), "Snapshot", "id", snapshotRow)
      .sample({ id = 0; experimentId = 0; cycle = 0; createdAt = 0; caption = "sample"; auto = false; partCount = 1 })
      .ownedByWith("experimentId", func(caller, owner) = ownsExperiment(experiments, caller, owner))
      .controllerOrScoped()
      .build();
  };

  public func snapshotPartEntity(
    experiments : ExperimentsLib.Experiments,
    snapshots : SnapshotsLib.Snapshots,
    parts : SnapshotsLib.SnapshotParts,
  ) : Entity.Decl {
    Entity.new<PartRow>("snapshotPart", func () = partRows(snapshots, parts), "SnapshotPart", "key", partRow)
      .sample({ snapshotId = 0; experimentId = 0; partIndex = 0; dataSize = 0 })
      .edge("snapshotId", "snapshot")
      .ownedByWith("experimentId", func(caller, owner) = ownsExperiment(experiments, caller, owner))
      .controllerOrScoped()
      .build();
  };
};
