/** Experimental, unreleased action input contract. No released host version is implied. */
export type InputContext = 'gameplay' | 'menu' | 'text-entry' | 'suspended';
export type InputLayout = 'auto' | 'xbox' | 'playstation' | 'generic';
export type InputControl =
  | 'leftStick' | 'rightStick' | 'dpad'
  | 'leftStick.x' | 'leftStick.y' | 'rightStick.x' | 'rightStick.y' | 'dpad.x' | 'dpad.y'
  | 'face.south' | 'face.east' | 'face.west' | 'face.north'
  | 'leftTrigger' | 'rightTrigger' | 'leftShoulder' | 'rightShoulder'
  | 'leftStickPress' | 'rightStickPress' | 'menu' | 'back'
  | 'dpad.up' | 'dpad.down' | 'dpad.left' | 'dpad.right';
export type InputActionDefinition =
  | { type: 'button' | 'axis2d'; label: string; range?: never }
  | { type: 'axis1d'; label: string; range: 'signed' | 'unsigned' };
export interface InputBinding { control: InputControl; }
/** Maximum four candidates per action. Text-entry/suspended cannot contain bindings. */
export type InputBindings = Partial<Record<InputContext, Record<string, InputBinding[]>>>;
export interface InputGameDefinition {
  protocolVersion: 1;
  actionSchemaVersion: number;
  title: string;
  /** At most 64 custom actions. ui.* names are reserved and cannot be redeclared. */
  actions: Record<string, InputActionDefinition>;
  bindings?: InputBindings;
  tuning?: { deadzone?: number; buttonThreshold?: number };
}
export interface InputConfigPatch {
  layout?: InputLayout;
  /** 0–0.5. */
  deadzone?: number;
  /** 0.1–0.9. */
  buttonThreshold?: number;
  /** Merge by context/action; an action array replaces that action's bindings. */
  bindings?: InputBindings;
}
export interface InputProviderDefinition {
  protocolVersion: 1;
  mappingVersion: 1;
  /** Standard mapping only in this candidate; unknown raw layouts are unsupported. */
  layouts: ['standard'];
  defaults?: Omit<InputConfigPatch, 'bindings'>;
}
export interface InputProviderRegistration {
  providerId: string;
  selected: boolean;
  generation: number;
  configRevision: number;
}
export interface InputGameConfig {
  gameKey: string;
  title: string;
  actionSchemaVersion: number;
  actions: Record<string, InputActionDefinition>;
  config: InputConfigPatch;
}
export interface InputProviderConfig {
  providerId: string;
  selected: boolean;
  revision: number;
  global: InputConfigPatch;
  games: InputGameConfig[];
  nextCursor: number | null;
}
export interface InputStatus {
  availability: 'ready' | 'provider-missing' | 'provider-disabled' | 'incompatible';
  capture: 'active' | 'waiting-device' | 'waiting-neutral' | 'suspended';
  reason: string;
  pendingRevision?: number;
}
export interface InputPresentation {
  configRevision: number;
  layout: Exclude<InputLayout, 'auto'>;
  actions: Record<string, { label: string; bindings: Array<{ control: InputControl; label: string; glyph: string }> }>;
}
export interface InputConnection {
  sessionId: string;
  protocolVersion: 1;
  gameKey: string;
  status: InputStatus;
  presentation: InputPresentation;
}
export type InputActionState =
  | { type: 'button'; value: number; down: boolean; pressCount: number; releaseCount: number; repeatCount: number }
  | { type: 'axis1d'; value: number }
  | { type: 'axis2d'; value: { x: number; y: number } };
export interface InputSnapshot {
  sessionId: string;
  sampleSeq: number;
  timestamp: number;
  resetRevision: number;
  resetReason: string;
  configRevision: number;
  context: InputContext;
  status: InputStatus;
  actions: Record<string, InputActionState>;
}
export interface InputStatusUpdate {
  sessionId: string;
  status: InputStatus;
  context: InputContext;
  resetRevision: number;
  resetReason: string;
  presentation: InputPresentation;
}
export interface PetInputConfig {
  /** @experimental Own provider only; pages contain at most 50 previously connected games. */
  getConfig(query?: { cursor?: number; limit?: number }): Promise<InputProviderConfig>;
  /** @experimental Atomic CAS. target is global or a host-issued gameKey. Global bindings only use ui.*. */
  updateConfig(change: { expectedRevision: number; target: string; patch: InputConfigPatch }): Promise<{ revision: number }>;
}
export interface PetInputProvider extends PetInputConfig {
  /** @experimental Tool-only; requires declared and granted input:provide. Identity comes from the host. */
  registerProvider(definition: InputProviderDefinition): Promise<InputProviderRegistration>;
  /** @experimental Idempotently stop this tool's provider, preserving user preferences. */
  unregisterProvider(): Promise<{ unregistered: boolean }>;
}
export interface PetInputWork {
  /** @experimental Requires service:gamepad-input and a work grant; one session per page. */
  connect(definition: InputGameDefinition): Promise<InputConnection>;
  /** @experimental Local synchronous snapshot. No per-frame host IPC; does not consume edge counters. */
  read(sessionId: string): InputSnapshot;
  /** @experimental Locally neutralizes previous actions; cannot override native window focus. */
  setContext(sessionId: string, context: InputContext): void;
  /** @experimental Immediate initial status plus low-frequency updates; no raw input/device stream. */
  onStatus(sessionId: string, callback: (status: InputStatusUpdate) => void): () => void;
  /** @experimental Opens only the selected installed provider's settings, following user intent. */
  openSettings(sessionId: string): Promise<{ opened: boolean }>;
  /** @experimental Neutralizes locally before releasing the host session. */
  disconnect(sessionId: string): Promise<void>;
}
