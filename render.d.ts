/** @experimental JSON data only; no executable values or local filesystem handles. */
export type RenderJsonValue = null | boolean | number | string | RenderJsonValue[] | { [key: string]: RenderJsonValue };

/**
 * @experimental Optional character.json.realtime declaration, owned by the asset plugin.
 * Paths are relative to character.json; the host validates containment, file types and budgets.
 * dataVersion describes this renderer's data format, not the host SDK or render bridge version.
 */
export interface RealtimeAppearanceDescriptor {
  renderer: string;
  /** Positive safe integer understood by the selected renderer. */
  dataVersion: number;
  data: string;
  assets: Record<string, string>;
}

/** @experimental Optional appearance.getState().own.realtime status; absent on older hosts. */
export interface RealtimeAppearanceState {
  renderer: string;
  dataVersion: number;
  state: 'ready' | 'missing-renderer' | 'unsupported' | 'unavailable';
}

/** @experimental Host-issued immutable session initialization. URLs are session-scoped. */
export interface RenderInitControl {
  type: 'init';
  session: string;
  /**
   * M1b creates host instances only. The unreleased M2 candidate also binds visitor instances.
   * The host chooses the target; this union does not establish released-host compatibility.
   */
  instance: { kind: 'host' | 'visitor' };
  /** Logical size in screen DIP, and output size in pixels. */
  size: number;
  pixelSize: number;
  workArea: { x: number; y: number; width: number; height: number };
  x: number;
  y: number;
  appearance: { dataVersion: number; data: RenderJsonValue; assets: Record<string, string> };
}

/** @experimental Host-issued grab input; screen coordinates and local coordinates use DIP. */
export interface RenderBeginControl {
  type: 'begin';
  session: string;
  x: number;
  y: number;
  t: number;
  view: {
    /** Screen origin of the bound character at grab start, in DIP, not the visitor carrier window. */
    x: number;
    y: number;
    clip: 'idle' | 'walk';
    frame: number;
    flip: 1 | -1;
    presentedSeq?: number;
    localX: number;
    localY: number;
  };
}

/** @experimental End releases the grab; rendering may continue until an idle frame is presented. */
export interface RenderPointerControl {
  type: 'move' | 'end';
  session: string;
  x: number;
  y: number;
  t: number;
}

/**
 * @experimental A single ordered host control stream, scoped to the bound session.
 * Preparation ack follows drawing to the host preparation canvas without replacing the
 * ordinary pose. During active rendering, ack follows submission to the visible canvas.
 */
export type RenderControl = RenderInitControl | RenderBeginControl | RenderPointerControl
  | { type: 'cancel'; session: string; reason: string }
  | { type: 'ack'; session: string; seq: number };

/**
 * @experimental One transparent RGBA frame. seq must increase; dimensions are integer 1–1024.
 * pixels.byteLength must equal width * height * 4. x/y are the bound character's screen origin in DIP.
 * Visitor frames are rendered locally on the receiver; continuous frames are not sent to the peer.
 * Session identity is bound by the host/preload, never supplied by the plugin.
 */
export interface RenderFrame {
  seq: number;
  width: number;
  height: number;
  pixels: Uint8Array | Uint8ClampedArray;
  x: number;
  y: number;
  phase: 'active' | 'idle';
}

/** @experimental Only available in the dedicated render context with appearance:render permission. */
export interface PetRenderSurface {
  /** @experimental Subscribe before rendering. Returns a function that removes this subscription. */
  onControl(listener: (control: RenderControl) => void): () => void;
  /**
   * @experimental Bounded frame channel. The first valid idle frame establishes readiness
   * after drawing to the host preparation canvas and acknowledgement, without replacing
   * the ordinary pose. Active rendering is acknowledged after visible-canvas submission.
   * Throws synchronously: render_not_initialized before init/after cancel, invalid_frame for
   * malformed frames, stale_frame for seq <= the last accepted sequence, frame_in_flight
   * while awaiting ack. Rejection does not consume seq. Pixels are tightly copied, without
   * copying an unrelated backing buffer. Init resets counters; matching ack releases the
   * frame slot before onControl listeners run, so a listener may submit the next frame.
   */
  submitFrame(frame: RenderFrame): void;
  /** @experimental Report a bounded diagnostic code and end this session; never include personal data. */
  fail(code: string): void;
}

/** @experimental window.pet in the render sandbox; intentionally does not extend PetCommon. */
export interface PetRender {
  render: PetRenderSurface;
}
