import Map "mo:core/Map";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Common "../types/common";
import SnapTypes "../types/snapshots";
import Guards "guards";

module {
  public type Snapshots = Map.Map<Nat, SnapTypes.SnapshotMeta>;
  // snapshotId -> (partIndex -> JSON text)
  public type SnapshotParts = Map.Map<Nat, Map.Map<Nat, Text>>;

  let maxPartCount = 10_000;
  let maxCaptionChars = 200;

  public func create(
    snapshots : Snapshots,
    counters : Common.Counters,
    experimentId : Common.ExperimentId,
    input : SnapTypes.SnapshotInput,
  ) : Result.Result<SnapTypes.SnapshotView, Common.ApiError> {
    if (input.partCount == 0 or input.partCount > maxPartCount) {
      return #err(#invalidInput("partCount must be between 1 and 10000"));
    };
    if (input.caption.size() > maxCaptionChars) {
      return #err(#invalidInput("caption must be at most 200 characters"));
    };
    let id = counters.nextSnapshotId;
    counters.nextSnapshotId += 1;
    let meta : SnapTypes.SnapshotMeta = {
      id;
      experimentId;
      cycle = input.cycle;
      createdAt = Time.now();
      caption = input.caption;
      auto = input.auto;
      partCount = input.partCount;
    };
    snapshots.add(id, meta);
    #ok({ meta with uploadedParts = 0 });
  };

  public func get(snapshots : Snapshots, snapshotId : Common.SnapshotId) : ?SnapTypes.SnapshotMeta {
    snapshots.get(snapshotId);
  };

  // Upserts a part (retry-safe); partIndex must be < partCount.
  public func putPart(
    snapshots : Snapshots,
    parts : SnapshotParts,
    snapshotId : Common.SnapshotId,
    partIndex : Nat,
    data : Text,
  ) : Result.Result<(), Common.ApiError> {
    let meta = switch (snapshots.get(snapshotId)) {
      case (?m) m;
      case null return #err(#notFound);
    };
    if (partIndex >= meta.partCount) {
      return #err(#invalidInput("partIndex must be less than partCount"));
    };
    if (data.size() > Guards.maxDataChars) {
      return #err(#invalidInput("Part data exceeds 1500000 characters"));
    };
    let inner = switch (parts.get(snapshotId)) {
      case (?m) m;
      case null {
        let m = Map.empty<Nat, Text>();
        parts.add(snapshotId, m);
        m;
      };
    };
    inner.add(partIndex, data);
    #ok(());
  };

  public func toView(self : SnapTypes.SnapshotMeta, parts : SnapshotParts) : SnapTypes.SnapshotView {
    let uploadedParts = switch (parts.get(self.id)) {
      case (?m) m.size();
      case null 0;
    };
    { self with uploadedParts };
  };

  // Snapshots of an experiment, newest first (createdAt desc, then id desc).
  public func listForExperiment(
    snapshots : Snapshots,
    parts : SnapshotParts,
    experimentId : Common.ExperimentId,
  ) : [SnapTypes.SnapshotView] {
    newestFirst(snapshots, experimentId).map(func m = toView(m, parts));
  };

  func newestFirst(snapshots : Snapshots, experimentId : Common.ExperimentId) : [SnapTypes.SnapshotMeta] {
    snapshots.values().filter(func m = m.experimentId == experimentId).toArray().sort(
      func(a, b) {
        if (a.createdAt > b.createdAt) #less else if (a.createdAt < b.createdAt) #greater else if (a.id > b.id) #less else if (a.id < b.id) #greater else #equal;
      }
    );
  };

  public func partsPage(
    parts : SnapshotParts,
    snapshotId : Common.SnapshotId,
    offset : Nat,
    limit : Nat,
  ) : SnapTypes.SnapshotPartPage {
    switch (parts.get(snapshotId)) {
      case null { { parts = []; total = 0 } };
      case (?inner) {
        let out = List.empty<SnapTypes.SnapshotPart>();
        var used = 0;
        for ((partIndex, data) in inner.entries().drop(offset).take(limit)) {
          if (out.size() > 0 and used + data.size() > Guards.pageBudgetChars) break;
          used += data.size();
          out.add({ snapshotId; partIndex; data });
        };
        { parts = out.toArray(); total = inner.size() };
      };
    };
  };

  public func remove(snapshots : Snapshots, parts : SnapshotParts, snapshotId : Common.SnapshotId) {
    snapshots.remove(snapshotId);
    parts.remove(snapshotId);
  };

  public func removeAllForExperiment(
    snapshots : Snapshots,
    parts : SnapshotParts,
    experimentId : Common.ExperimentId,
  ) {
    let ids = snapshots.values().filter(func m = m.experimentId == experimentId).toArray();
    for (m in ids.values()) {
      remove(snapshots, parts, m.id);
    };
  };

  // Keeps only the newest `keep` auto snapshots; returns how many were removed.
  public func pruneAuto(
    snapshots : Snapshots,
    parts : SnapshotParts,
    experimentId : Common.ExperimentId,
    keep : Nat,
  ) : Nat {
    var kept = 0;
    var removed = 0;
    for (m in newestFirst(snapshots, experimentId).values()) {
      if (m.auto) {
        if (kept < keep) {
          kept += 1;
        } else {
          remove(snapshots, parts, m.id);
          removed += 1;
        };
      };
    };
    removed;
  };
};
