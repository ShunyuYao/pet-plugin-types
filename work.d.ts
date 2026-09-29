import type { PetAccount, PetCharacter, PetCapabilities, PetServices } from './index';
import type { PetInputWork } from './input';

export type WorkJson = null | boolean | number | string | WorkJson[] | { [key: string]: WorkJson };
export type WorkPermission = 'character:read' | 'character:watch' | 'storage:read' | 'storage:write' | `service:${string}` | `account:authorize:${string}`;
export interface WorkInteraction { players: 2 | 3 | 4; transport: 'lan'; protocol: { id: string; version: number }; }
/** Work declarations are separate from plugin manifests; version 2 requires an interaction. */
export type WorkSdkDeclaration =
  | { version: 1; permissions: WorkPermission[]; network?: string[]; interaction?: never }
  | { version: 2; permissions: Array<WorkPermission | 'sessions:connect'>; network?: string[]; interaction: WorkInteraction };
export interface WorkGrant {
  status: 'unknown' | 'granted' | 'revoked';
  permissions: string[];
  origins: string[];
}
export interface PetWorkStorage {
  /** @experimental Work-only storage:read; isolated by content/source and account scope. */
  get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined>;
  /** @experimental Work-only storage:write; bounded plain JSON, no prototype keys. */
  set(key: string, value: WorkJson): Promise<void>;
  /** @experimental Work-only storage:write; true only when an existing key was deleted. */
  delete(key: string): Promise<boolean>;
  /** @experimental Work-only storage:read; at most the work's private 1 MiB data set. */
  all(): Promise<Record<string, WorkJson>>;
}
export interface PetWorkCapabilities extends PetCapabilities {
  /** @experimental User consent for the current declaration; optional exact declared network origin. */
  request(options?: { origin?: string }): Promise<WorkGrant>;
}
export interface SessionPeer { sessionPeerId: string; displayName: string; }
export interface SessionContext {
  invitationId: string;
  artifactHash: string;
  protocol: { id: string; version: number };
  role: 'host' | 'guest';
  peer: SessionPeer;
  expiresAt: number;
  /** Present for 3–4 player rooms only. */
  maxPlayers?: 3 | 4;
  /** Host-only room roster; peers have independent connection state. */
  peers?: Array<SessionPeer & { status: 'invited' | 'connected' | 'offline' | 'left' }>;
}
export type SessionMessage =
  | { lane: 'reliable'; type: string; payload: WorkJson; messageId?: string; key?: never }
  | { lane: 'latest'; key: string; type: string; payload: WorkJson; messageId?: never };
/** to is host-only: a session peer id or '*'. Room broadcasts are explicit. */
export type SessionSend = SessionMessage & { to?: string };
export interface SessionTransfer { contentType: 'image/png' | 'image/webp' | 'application/octet-stream'; dataBase64: string; purpose: string; to?: string; }
export interface SessionTransferReceipt { transferId: string; sha256: string; byteLength: number; }
export interface SessionTransferData extends SessionTransferReceipt { contentType: SessionTransfer['contentType']; purpose: string; dataBase64: string; }
export type SessionEvent = { cursor: number; from?: string } & (
  | { type: 'message'; seq: number; message: SessionMessage }
  | { type: 'transfer'; contentType: SessionTransfer['contentType']; purpose: string } & SessionTransferReceipt
  | { type: 'connected'; epoch: number }
  | { type: 'peer_joined' }
  | { type: 'peer_left' | 'disconnected' | 'closed' | 'resync_required'; reason: string }
);
export interface SessionLimits {
  reliableBytes: number; latestBytes: number; callsPerSecond: number; bytesPerSecond: number;
  latestKeys: number; assetBytes: number; retainedAssetBytes: number; pollBytes: number;
}
export interface PetWorkSessions {
  /** @experimental sessions:connect; null when this work has no host-issued invitation. */
  getContext(): Promise<SessionContext | null>;
  /** @experimental Join the invitation already bound by the host; no caller-supplied target. */
  join(): Promise<{ status: 'waiting' | 'connected'; epoch: number; limits: SessionLimits; peerStatus: 'waiting' | 'online' | 'offline' }>;
  /** @experimental Reliable messages are acknowledged; latest-state messages may be coalesced. */
  send(message: SessionSend): Promise<{ status: 'queued' | 'peer_received'; seq: number }>;
  /** @experimental Bounded cursor feed; waitMs is 0–10000. Handle resync_required explicitly. */
  poll(options?: { cursor?: number; waitMs?: number }): Promise<{ cursor: number; events: SessionEvent[]; transportState: 'waiting' | 'connected' | 'reconnecting' | 'closed'; epoch: number }>;
  /** @experimental A bounded 1 MiB transfer; host-only optional routing for multi-player rooms. */
  transfer(input: SessionTransfer): Promise<SessionTransferReceipt>;
  /** @experimental Only transfers already received in the caller's own session. */
  readTransfer(input: { transferId: string }): Promise<SessionTransferData>;
  /** @experimental Local release is unconditional; peerAcknowledged reports delivery separately. */
  leave(): Promise<{ released: true; peerAcknowledged: boolean }>;
}
/** Experimental HTML work root. Never inherits PetCommon or ordinary plugin authority. */
export interface PetWork {
  /** @experimental Specific registered service only; requires declaration and trusted host consent. */
  account: PetAccount;
  storage: PetWorkStorage;
  character: PetCharacter;
  capabilities: PetWorkCapabilities;
  services: Pick<PetServices, 'invoke'>;
  sessions: PetWorkSessions;
  input: PetInputWork;
}
