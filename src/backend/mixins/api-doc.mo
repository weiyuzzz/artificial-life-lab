mixin () {
  public query func getApiDoc() : async Text {
    "# Artificial Life Lab backend API\n" #
    "\n" #
    "The simulation (organisms, genomes, neural networks, plants) runs entirely in the browser. This canister only persists experiments: their configuration, sampled statistics chunks and world snapshots split into parts. Nothing here simulates or computes results.\n" #
    "\n" #
    "## Authentication and identity\n" #
    "\n" #
    "- Every method that changes saved data requires a signed (non-anonymous) caller who is a member: approved through user approval, or the admin.\n" #
    "- The app's frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available. An agent already holding the user's Internet Identity authorization must derive the per-app principal against that origin (for example `icp identity link web <name> --app <host>`); a principal derived against another origin is a different user and owns nothing here. Such a delegation acts with the user's full authority in this app until it expires.\n" #
    "- Registration: a signed-in caller registers by calling `_initialize_access_control()` once (the app's frontend does this on sign-in). The first caller ever to register becomes `#admin` (and is approved); every later caller becomes `#user` with no approval. A principal that never signed in through the app's own frontend is unregistered, even if it belongs to the app owner.\n" #
    "- Membership: a registered user calls `requestApproval()` (status `#pending`), and the admin calls `listApprovals()` and `setApproval(user, #approved | #rejected)`; `removeApproval(user)` lets a rejected user ask again. `isCallerApproved()` returns the caller's own status (false for anonymous or unregistered callers). Admins can also create invite links (`createInvite`, `listInvites`, `revokeInvite`); `redeemInvite(code)` approves the signed-in caller. Admin-only approval/invite methods trap with `Unauthorized: Only admins can perform this action`.\n" #
    "- Experiment methods never trap for authorization: a non-member (anonymous, unregistered, pending, rejected) gets `#err(#notAuthorized)` from every mutating method.\n" #
    "\n" #
    "## Authorization\n" #
    "\n" #
    "Experiments are private to their owner (the principal that created them). Every read and write of an experiment, its statistics chunks and its snapshots checks ownership. A non-owner gets `#err(#notAuthorized)` (record exists) or `#err(#notFound)`; `getExperiment` returns `null`; `listMyExperiments` returns only the caller's own experiments. The admin has no special access to other users' experiments. Reads need ownership only, not membership.\n" #
    "\n" #
    "## Types and encoding\n" #
    "\n" #
    "- IDs (`ExperimentId`, `SnapshotId`) are `Nat`, assigned sequentially, never reused.\n" #
    "- Timestamps (`createdAt`, `updatedAt`) are `Int` nanoseconds since the Unix epoch, set by the canister.\n" #
    "- `envParams`, `populationConfig`, `summary`, statistics `data` and snapshot part `data` are opaque `Text`, by convention JSON written by the frontend; the canister never parses them.\n" #
    "- `cycle` is the simulation tick count reported by the client.\n" #
    "- `ApiError` = `#notFound` | `#notAuthorized` | `#invalidInput : Text` (human-readable reason).\n" #
    "\n" #
    "## Experiments\n" #
    "\n" #
    "- `createExperiment({ name; seed; envParams; populationConfig; summary })` -> `Result<Experiment, ApiError>`. Name is trimmed of spaces, must be 1-200 characters. `envParams`, `populationConfig` and `summary` are each at most 200000 characters. Starts at `cycle = 0`, `createdAt = updatedAt = now`. Not idempotent: retrying creates another experiment.\n" #
    "- `renameExperiment(id, name)` -> `Result<Experiment, ApiError>`; same name rules; refreshes `updatedAt`. Safe to retry.\n" #
    "- `updateExperimentProgress(id, cycle, summary)` -> `Result<Experiment, ApiError>`; overwrites `cycle` and `summary`, refreshes `updatedAt`. Safe to retry (last write wins).\n" #
    "- `getExperiment(id)` query -> `?Experiment` (null when missing or not owned).\n" #
    "- `listMyExperiments()` query -> `[Experiment]`, ascending by id.\n" #
    "- `deleteExperiment(id)` -> `Result<(), ApiError>`. Destructive and permanent: also deletes all its statistics chunks and snapshots with their parts. A retry after success returns `#err(#notFound)`.\n" #
    "\n" #
    "## Statistics chunks\n" #
    "\n" #
    "Sampled population/gene statistics and timeline entries, batched by the client into numbered chunks.\n" #
    "\n" #
    "- `appendStatChunk(experimentId, chunkIndex, data)` -> `Result<StatChunk, ApiError>`. Upsert by `chunkIndex`: re-sending the same index replaces it, so retries are safe and never duplicate. `data` at most 1500000 characters, otherwise `#invalidInput`. The response echoes the stored chunk including `data`.\n" #
    "- `listStatChunks(experimentId, offset, limit)` query -> `Result<{ chunks; total }, ApiError>`, ordered by `chunkIndex` ascending. `offset` skips that many existing chunks (not an index). A page may return fewer than `limit` chunks because responses are capped near 1.8 million characters of data (always at least one chunk). Page by advancing `offset` by `chunks.size()` until `offset >= total`.\n" #
    "\n" #
    "## Snapshots\n" #
    "\n" #
    "A snapshot is a saved world state split into `partCount` text parts.\n" #
    "\n" #
    "- `createSnapshot(experimentId, { cycle; caption; auto; partCount })` -> `Result<SnapshotView, ApiError>`. `partCount` 1-10000, `caption` at most 200 characters. `auto = true` marks periodic automatic snapshots. Not idempotent: each call creates a new snapshot.\n" #
    "- `putSnapshotPart(snapshotId, partIndex, data)` -> `Result<(), ApiError>`. Requires `partIndex < partCount` and `data` at most 1500000 characters (`#invalidInput` otherwise). Upsert by index: safe to retry.\n" #
    "- `SnapshotView.uploadedParts` counts stored distinct parts. A snapshot is complete only when `uploadedParts == partCount`; there is no separate finalize call, so poll `listSnapshots` after uploading and ignore or delete incomplete snapshots when restoring.\n" #
    "- `listSnapshots(experimentId)` query -> `Result<[SnapshotView], ApiError>`, newest first (createdAt desc, then id desc).\n" #
    "- `getSnapshotParts(snapshotId, offset, limit)` query -> `Result<{ parts; total }, ApiError>`, ordered by `partIndex`; same size-capped paging rule as statistics chunks. Concatenate parts in `partIndex` order to rebuild the payload.\n" #
    "- `deleteSnapshot(snapshotId)` -> `Result<(), ApiError>`; removes the snapshot and parts. Retry after success returns `#err(#notFound)`.\n" #
    "- `pruneAutoSnapshots(experimentId, keep)` -> `Result<Nat, ApiError>`; keeps the newest `keep` auto snapshots, deletes older auto ones and returns how many were removed. Manual snapshots are never touched. Idempotent.\n" #
    "\n" #
    "## Data queries (OQL)\n" #
    "\n" #
    "`schema()` and `execute(json)` expose read-only tables: `experiment`, `statChunk`, `snapshot`, `snapshotPart`. Each signed-in caller sees only rows of their own experiments; controllers see all. Chunk and part tables expose metadata and `dataSize` only, never the stored JSON.\n" #
    "\n" #
    "## Gotchas\n" #
    "\n" #
    "- Mutations return `#err`, not traps, for auth and validation failures; always switch on the result.\n" #
    "- Data is never fabricated by the canister: every statistic stored here was produced by the browser simulation.\n" #
    "- Query responses are size-limited; never request all parts at once with a huge `limit` and expect them all."
  };
};
