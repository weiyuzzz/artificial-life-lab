import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type ApiError = {
    __kind__: "notAuthorized";
    notAuthorized: null;
} | {
    __kind__: "invalidInput";
    invalidInput: string;
} | {
    __kind__: "notFound";
    notFound: null;
};
export interface Cell {
    value: Value;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Experiment {
    id: ExperimentId;
    envParams: string;
    owner: Principal;
    name: string;
    createdAt: Timestamp;
    seed: bigint;
    cycle: bigint;
    summary: string;
    updatedAt: Timestamp;
    populationConfig: string;
}
export type ExperimentId = bigint;
export interface ExperimentInput {
    envParams: string;
    name: string;
    seed: bigint;
    summary: string;
    populationConfig: string;
}
export interface InviteInfo {
    expiresAt?: Time;
    revoked: boolean;
    code: string;
    name: string;
    createdAt: Time;
    createdBy: Principal;
    redemptions: Array<Redemption>;
    maxUses?: bigint;
}
export interface Redemption {
    at: Time;
    user: Principal;
}
export type Result = {
    __kind__: "ok";
    ok: Experiment;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_2 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: StatChunkPage;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_4 = {
    __kind__: "ok";
    ok: Array<SnapshotView>;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_5 = {
    __kind__: "ok";
    ok: SnapshotPartPage;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_6 = {
    __kind__: "ok";
    ok: SnapshotView;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_7 = {
    __kind__: "ok";
    ok: StatChunk;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_8 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type SnapshotId = bigint;
export interface SnapshotInput {
    auto: boolean;
    cycle: bigint;
    caption: string;
    partCount: bigint;
}
export interface SnapshotPart {
    snapshotId: SnapshotId;
    partIndex: bigint;
    data: string;
}
export interface SnapshotPartPage {
    total: bigint;
    parts: Array<SnapshotPart>;
}
export interface SnapshotView {
    id: SnapshotId;
    experimentId: ExperimentId;
    auto: boolean;
    createdAt: Timestamp;
    cycle: bigint;
    uploadedParts: bigint;
    caption: string;
    partCount: bigint;
}
export interface StatChunk {
    chunkIndex: bigint;
    experimentId: ExperimentId;
    data: string;
    createdAt: Timestamp;
}
export interface StatChunkPage {
    total: bigint;
    chunks: Array<StatChunk>;
}
export type Time = bigint;
export type Timestamp = bigint;
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum InviteStatus {
    revoked = "revoked",
    expired = "expired",
    valid = "valid",
    invalid = "invalid",
    usedUp = "usedUp"
}
export enum RedeemResult {
    revoked = "revoked",
    expired = "expired",
    invalid = "invalid",
    usedUp = "usedUp",
    blocked = "blocked",
    joined = "joined",
    alreadyMember = "alreadyMember"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    appendStatChunk(experimentId: ExperimentId, chunkIndex: bigint, data: string): Promise<Result_7>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkInvite(code: string): Promise<InviteStatus>;
    createExperiment(input: ExperimentInput): Promise<Result>;
    createInvite(name: string, maxUses: bigint | null, expiresAt: Time | null): Promise<string>;
    createSnapshot(experimentId: ExperimentId, input: SnapshotInput): Promise<Result_6>;
    deleteExperiment(id: ExperimentId): Promise<Result_1>;
    deleteSnapshot(snapshotId: SnapshotId): Promise<Result_1>;
    execute(qJson: string): Promise<Result__1>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    getExperiment(id: ExperimentId): Promise<Experiment | null>;
    getSnapshotParts(snapshotId: SnapshotId, offset: bigint, limit: bigint): Promise<Result_5>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listInvites(): Promise<Array<InviteInfo>>;
    listMyExperiments(): Promise<Array<Experiment>>;
    listSnapshots(experimentId: ExperimentId): Promise<Result_4>;
    listStatChunks(experimentId: ExperimentId, offset: bigint, limit: bigint): Promise<Result_3>;
    pruneAutoSnapshots(experimentId: ExperimentId, keep: bigint): Promise<Result_2>;
    putSnapshotPart(snapshotId: SnapshotId, partIndex: bigint, data: string): Promise<Result_1>;
    redeemInvite(code: string): Promise<RedeemResult>;
    removeApproval(user: Principal): Promise<void>;
    renameExperiment(id: ExperimentId, name: string): Promise<Result>;
    requestApproval(): Promise<void>;
    revokeInvite(code: string): Promise<void>;
    schema(): Promise<string>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateExperimentProgress(id: ExperimentId, cycle: bigint, summary: string): Promise<Result>;
}
