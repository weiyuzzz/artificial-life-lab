import Map "mo:core/Map";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Common "../types/common";
import StatTypes "../types/statistics";
import Guards "guards";

module {
  // experimentId -> (chunkIndex -> chunk)
  public type StatChunks = Map.Map<Nat, Map.Map<Nat, StatTypes.StatChunk>>;

  // Upserts the chunk at `chunkIndex` (retry-safe). Validates size.
  public func put(
    statChunks : StatChunks,
    experimentId : Common.ExperimentId,
    chunkIndex : Nat,
    data : Text,
  ) : Result.Result<StatTypes.StatChunk, Common.ApiError> {
    if (data.size() > Guards.maxDataChars) {
      return #err(#invalidInput("Chunk data exceeds 1500000 characters"));
    };
    let inner = switch (statChunks.get(experimentId)) {
      case (?m) m;
      case null {
        let m = Map.empty<Nat, StatTypes.StatChunk>();
        statChunks.add(experimentId, m);
        m;
      };
    };
    let chunk : StatTypes.StatChunk = { experimentId; chunkIndex; data; createdAt = Time.now() };
    inner.add(chunkIndex, chunk);
    #ok(chunk);
  };

  // Chunks ordered by chunkIndex, paged by offset/limit, capped by a response size budget.
  public func page(
    statChunks : StatChunks,
    experimentId : Common.ExperimentId,
    offset : Nat,
    limit : Nat,
  ) : StatTypes.StatChunkPage {
    switch (statChunks.get(experimentId)) {
      case null { { chunks = []; total = 0 } };
      case (?inner) {
        let out = List.empty<StatTypes.StatChunk>();
        var used = 0;
        for (c in inner.values().drop(offset).take(limit)) {
          if (out.size() > 0 and used + c.data.size() > Guards.pageBudgetChars) break;
          used += c.data.size();
          out.add(c);
        };
        { chunks = out.toArray(); total = inner.size() };
      };
    };
  };

  public func removeAll(statChunks : StatChunks, experimentId : Common.ExperimentId) {
    statChunks.remove(experimentId);
  };
};
