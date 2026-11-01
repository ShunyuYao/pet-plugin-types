/** Unreleased experimental external-world API, protocol version 1. */
export interface WorldDescriptor { id: string; name: string; baseUrl: string; officialAvailable: boolean }
export interface WorldState {
  protocolVersion: 1; checked: boolean; enabled: boolean; controlled: boolean;
  aiSource: 'desktop' | 'official' | null; offlineAllowed: boolean; modelReady: boolean;
  desktopAllowed: boolean; validForMs: number | null; expiresAt: number | null;
  phase: 'checking' | 'returning' | 'town' | 'leaving' | 'visiting' | 'desktop';
  text: string; error: string; world: WorldDescriptor | null; uid: string; epoch: number;
}
export interface WorldProfile {
  turiId: string; uid: string; name: string; skinId: string; bio: string; interests: string[]; isSelf: boolean;
}
export interface WorldResident {
  turiId: string; uid: string; name: string; skinId: string; visitId: string; epoch: number;
  position: { x: number; z: number }; place: string; phase: string; destination: string;
  returning: boolean; leaseRemainingMs: number;
}
export interface WorldView { protocolVersion: 1; worldId?: string; at?: number; residents: WorldResident[] }
export interface WorldEvent {
  protocolVersion: 1; id: string; worldId: string; sequence: number; at: number;
  type: 'visit.started' | 'visit.ended' | 'walk.started' | 'walk.ended' | 'encounter.started' | 'encounter.ended'
    | 'chat.message' | 'activity.started' | 'activity.ended' | 'activity.invited' | 'activity.accepted'
    | 'activity.declined' | 'activity.invitation-ended';
  participants: Array<{ turiId: string; uid: string; visitId: string; epoch: number; name: string; skinId: string; bio: string }>;
  data: { taskId?: string; planId?: string; place?: string; activity?: string; outcome?: string; reason?: string;
    speaker?: string; inviter?: string; responder?: string; text?: string; simulated?: boolean; elapsedMs?: number };
}
export interface WorldPeer { turiId: string; worldId?: string }
export type WorldConsentResult = { accepted: false } | { accepted: true; state: WorldState };
export interface PersonalAgentState {
  protocolVersion: 1; worldId: string | null; paired: boolean; online: boolean;
  agentId?: string; name?: string; expiresAt?: number; lastSeenAt?: number;
}
export interface PetWorlds {
  /** @experimental Current source and sponsored quota; never model credentials. */
  getAiState(): Promise<{ protocolVersion: 1; source: 'desktop' | 'official' | null; offlineAllowed: boolean; ready: boolean;
    trial: { available: boolean; reason: 'unconfigured' | 'personal_limit' | 'global_limit' | null; remaining: number | null; limit: number | null; resetsAt: number | null } | null }>;
  /** @experimental @deprecated Retired before release. Always rejects with personal_agent_retired. */
  getAgentState(): Promise<never>;
  /** @experimental @deprecated Retired before release. Always rejects with personal_agent_retired. */
  createAgentPairing(): Promise<never>;
  /** @experimental @deprecated Retired before release. Always rejects with personal_agent_retired. */
  revokeAgent(): Promise<never>;

  /** @experimental Only registered worlds; no caller-selected server URL. Requires worlds:connect. */
  list(): Promise<WorldDescriptor[]>;
  /** @experimental Public projection only; never returns identity credentials or private context. */
  getState(): Promise<WorldState>;
  /** @experimental Host consent displays the exact filtered sharing scope. */
  enable(options: { worldId: string; aiSource: 'desktop' | 'official'; offlineAllowed: boolean; autoWhenUnavailable?: boolean }): Promise<WorldConsentResult>;
  /** @experimental Revokes new work; waits for safe ownership release before displaying a desktop body. */
  disable(): Promise<WorldState>;
  /** @experimental Requires a new explicit owner confirmation and an available body. */
  enter(): Promise<WorldConsentResult>;
  /** @experimental Requests safe return; the returned state may still be returning. */
  recall(): Promise<WorldState>;
  /** @experimental Read-only public residents. Hide a resident when its lease expires; never extrapolate ownership. */
  getView(): Promise<WorldView>;
  /** @experimental Owner-scoped durable events; independent cursor, at most 200 per batch. */
  getEvents(options?: { after?: number; worldId?: string }): Promise<{ protocolVersion: 1; worldId: string; events: WorldEvent[]; nextCursor: number }>;
  /** @experimental Public identity of an encountered resident; no peer private persona or chat history. */
  getProfile(options: WorldPeer): Promise<WorldProfile>;
  /** @experimental Native host confirmation, followed by the existing owner friendship request. */
  requestFriend(options: WorldPeer): Promise<{ accepted?: false; ok?: boolean; error?: string }>;
}
