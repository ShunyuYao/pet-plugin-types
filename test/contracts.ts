import type { Pet, PetTool, PetPanel, PetBlock, BadgeOptions, ComposeFileOptions } from '../index';
import { definePluginManifest } from '../manifest';
import type { ThemeDefinition, ThemeColors, ThemeRadius, ThemePluginManifest, PluginManifest } from '../index';
import type { AppearanceRendererManifest, PetRender, RenderControl, RenderFrame, RealtimeAppearanceDescriptor } from '../index';

declare const tool: PetTool;
declare const panel: PetPanel;
declare const block: PetBlock;
declare const shared: Pet;

const badge: BadgeOptions = { segments: [{ tone: 'warning', text: '1' }], onClick: 'openPanel' };
const placed: Promise<boolean> = tool.badge.set(badge);
const cleared: Promise<boolean> = tool.badge.clear();
const pinned: Promise<boolean> = panel.ui.setPanelPinned(false);
tool.ui.setPanelPinned(true);
shared.badge?.set(badge);
// @ts-expect-error Badge ownership requires a persistent tool.
panel.badge.set(badge);
// @ts-expect-error Blocks cannot own badges.
block.badge.clear();
// @ts-expect-error Blocks cannot pin panel windows.
block.ui.setPanelPinned(true);
// @ts-expect-error OpenPanel is tool-only.
panel.ui.openPanel();
// @ts-expect-error Closed capabilities must not leak into public roots.
tool.ui.injectStyle('body {}');
// @ts-expect-error Invalid tone.
tool.badge.set({ segments: [{ tone: 'green', text: '1' }] });
// @ts-expect-error No arbitrary events in the released click contract.
tool.badge.set({ segments: [{ tone: 'success', text: '1' }], onClick: 'emit:done' });
// @ts-expect-error At least one badge segment is required.
tool.badge.set({ segments: [] });
// @ts-expect-error At most two badge segments.
tool.badge.set({ segments: [{ tone: 'primary', text: '1' }, { tone: 'muted', text: '2' }, { tone: 'danger', text: '3' }] });

tool.clipboard.startHistory({ pollIntervalMs: 1000, maxBytes: 4096 });
tool.clipboard.stopHistory();
panel.clipboard.query({ type: 'text', search: 'hello', offset: 0, limit: 10 }).then(result => {
  const revision: number = result.revision;
  const total: number = result.total;
  // @ts-expect-error Query metadata never contains full text.
  result.items[0].plain;
});
panel.clipboard.read('id').then(entry => {
  if (entry.type === 'text') {
    const plain: string = entry.plain;
  } else {
    const thumbnail: string = entry.thumbnail;
    const mime: 'image/png' = entry.thumbnailMimeType;
    // @ts-expect-error No original disk paths exposed by this API.
    entry.imagePath;
  }
});
// @ts-expect-error History polling is tool-only.
panel.clipboard.startHistory();
// @ts-expect-error Clipboard is not exposed to blocks.
block.clipboard.query();

const generated: ComposeFileOptions = {
  source: { type: 'generated', mimeType: 'text/markdown', content: '# Hello', name: 'hello.md' },
  preview: { type: 'markdown', text: '# Hello' },
};
tool.errands.composeFile(generated).then(result => {
  const action: 'sent' | 'cancelled' = result.action;
});
panel.errands.composeFile({ source: { type: 'clipboard-image', id: 'id' }, preview: { type: 'image' } });
// @ts-expect-error Generated files require markdown previews.
const mismatched: ComposeFileOptions = { source: { type: 'generated', mimeType: 'text/markdown', content: 'hello' }, preview: { type: 'image' } };
// @ts-expect-error No arbitrary local paths in composeFile.
tool.errands.composeFile({ source: { type: 'file', path: '/tmp/a' }, preview: { type: 'image' } });
// @ts-expect-error Blocks cannot open a global compose window.
block.errands.composeFile(generated);

definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['tool', 'panel'],
  activation: 'opt-in', updateReminders: true, permissions: ['clipboard', 'errands'],
  entry: { tool: 'index.js', panel: { src: 'panel.html', transparent: true } },
});
// @ts-expect-error Transparent must be boolean.
definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['panel'], entry: { panel: { src: 'panel.html', transparent: 'yes' } } });
// @ts-expect-error Tool entry is required.
definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['tool'], entry: {} });

// @ts-expect-error Update reminders require an explicit boolean.
definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['skill'], entry: {}, updateReminders: 'true' });

tool.account.getState({ serviceId: 'example-ranking' }).then(state => {
  const uid: string = state.uid;
  const revision: string = state.revision;
  // @ts-expect-error Host credentials are never public.
  state.accessToken;
});
tool.account.authorize({ serviceId: 'example-ranking', challengeId: 'attempt', codeChallenge: 'S256-value' }).then(proof => {
  const code: string = proof.code;
  // @ts-expect-error No host refresh token is exposed.
  proof.refreshToken;
});
// @ts-expect-error Account authorization is tool-only.
panel.account.getState({ serviceId: 'example-ranking' });
// @ts-expect-error Account authorization is tool-only.
block.account.authorize({});
// @ts-expect-error S256 challenge is required.
tool.account.authorize({ serviceId: 'example-ranking', challengeId: 'attempt' });
definePluginManifest({ id: 'account-test', name: 'Account Test', version: '1.0.0', kind: ['tool'], entry: { tool: 'index.js' }, permissions: ['account:authorize:example-ranking'] });

const appearance: Promise<import('../index').AppearanceState> = panel.appearance.getState();
tool.appearance.apply();
panel.appearance.reset().then(state => {
  const restore: boolean = state.canRestore;
  const name: string = state.companion.name;
  const owner: boolean = state.current.ownedByCaller;
  // @ts-expect-error No host config is exposed.
  state.config;
  // @ts-expect-error No local image paths are exposed.
  state.own.path;
});
shared.appearance?.getState();
// @ts-expect-error Blocks cannot read or change appearance.
block.appearance.getState();
// @ts-expect-error A plugin cannot choose another plugin's key.
tool.appearance.apply('another-plugin');
// @ts-expect-error reset has no arbitrary target.
panel.appearance.reset({ key: 'another-plugin' });
definePluginManifest({ id: 'appearance-test', name: 'Appearance', version: '0.2.0', kind: ['asset', 'panel'], permissions: ['ui', 'appearance'], entry: { character: 'character.json', panel: { src: 'panel.html' } } });

// Current-appearance animation metadata is available in all three contexts.
const animations: Promise<import('../index').PetAnimation[]> = tool.pet.getAnimations();
panel.pet.getAnimations();
block.pet.getAnimations();
// @ts-expect-error Query is scoped to the current companion; no arguments.
panel.pet.getAnimations('someone-else');
// @ts-expect-error Private frame paths are not exposed.
animations.then(items => items[0].dir);

// Theme packages are data-only. Their permission never opens ui.injectStyle.
const themeManifest: ThemePluginManifest = definePluginManifest({
  id: 'warm-paper', name: 'Warm paper', version: '0.1.0', apiVersion: 1,
  kind: ['theme'], permissions: ['ui:theme'], entry: { theme: 'theme.json' },
});
const explicitTheme: PluginManifest<'theme'> = themeManifest;
const colors: ThemeColors = {
  canvas: '#efece5', panel: '#fffaf0', ink: '#373c31', muted: '#7a806e',
  surface: '#f0ecdf', card: '#fffdf6', line: '#e1dfd0', accent: '#456550',
  accentInk: '#fffdf7', tint: '#e7edde', success: '#54795e', error: '#a8513f',
  errorSurface: '#f9e7dd', file: '#e6ddca', fileInk: '#66583d',
};
const definition: ThemeDefinition = {
  schemaVersion: 1, target: 'chat', colors, radius: 18, bubbleRadius: 15, texture: 'paper',
};
// @ts-expect-error Theme packages cannot mix executable kinds.
definePluginManifest({ ...themeManifest, kind: ['theme', 'tool'], entry: { theme: 'theme.json', tool: 'index.js' } });
// @ts-expect-error ui:theme is the one required permission.
definePluginManifest({ ...themeManifest, permissions: [] });
// @ts-expect-error No permissions can be added to a theme package.
definePluginManifest({ ...themeManifest, permissions: ['ui:theme', 'storage'] });
// @ts-expect-error Duplicate permissions are not a singleton tuple.
definePluginManifest({ ...themeManifest, permissions: ['ui:theme', 'ui:theme'] });
// @ts-expect-error A data-only theme cannot have a tool entry.
definePluginManifest({ ...themeManifest, entry: { theme: 'theme.json', tool: 'index.js' } });
// @ts-expect-error The package-local theme path must be a string (host validates traversal).
definePluginManifest({ ...themeManifest, entry: { theme: ['theme.json'] } });
// @ts-expect-error Theme packages do not consume services.
definePluginManifest({ ...themeManifest, services: [] });
// @ts-expect-error Theme packages cannot provide services.
definePluginManifest({ ...themeManifest, provides: { service: 'theme' } });
// @ts-expect-error Theme selection belongs to the user, not activation metadata.
definePluginManifest({ ...themeManifest, activation: 'opt-in' });
// @ts-expect-error Theme entry is required.
definePluginManifest({ id: 'x', name: 'X', version: '0.1.0', kind: ['theme'], permissions: ['ui:theme'] });
// @ts-expect-error Ordinary plugins cannot use the data-only theme permission.
definePluginManifest({ id: 'x', name: 'X', version: '0.1.0', kind: ['tool'], entry: { tool: 'index.js' }, permissions: ['ui:theme'] });
// @ts-expect-error No extra color keys.
const extraColor: ThemeColors = { ...colors, custom: '#ffffff' };
// @ts-expect-error Color strings cannot be arrays.
const arrayColor: ThemeColors = { ...colors, ink: ['#000000'] };
// @ts-expect-error All fifteen color fields are required.
const incompleteColors: ThemeColors = { ink: '#000000' };
// @ts-expect-error The theme only targets chat.
const wrongTarget: ThemeDefinition = { ...definition, target: 'settings' };
// @ts-expect-error No future schema versions are claimed.
const wrongSchema: ThemeDefinition = { ...definition, schemaVersion: 2 };
// @ts-expect-error Arbitrary CSS is not a theme field.
const style: ThemeDefinition = { ...definition, css: 'body { display: none; }' };
// @ts-expect-error Texture is a host-owned preset, never a URL.
const texture: ThemeDefinition = { ...definition, texture: 'https://example.com/a.png' };
// @ts-expect-error Radius must be an integer in the supported range.
const radius: ThemeRadius = 29;
// @ts-expect-error Fractional radii are not allowed.
const fractional: ThemeRadius = 2.5;
// @ts-expect-error Negative radii are not allowed.
const negative: ThemeRadius = -1;

// Dedicated realtime renderer: no ordinary SDK, no caller-selected session/target.
declare const renderer: PetRender;
const stopRenderControl: () => void = renderer.render.onControl(control => {
  const session: string = control.session;
  if (control.type === 'init') {
    const instance: 'host' | 'visitor' = control.instance.kind;
    const size: number = control.pixelSize;
    const assets: Record<string, string> = control.appearance.assets;
    // @ts-expect-error Personal model fields remain inside generic JSON data.
    control.headScale;
  } else if (control.type === 'begin') {
    const flip: 1 | -1 = control.view.flip;
    const shown: number | undefined = control.view.presentedSeq;
  } else if (control.type === 'ack') {
    const seq: number = control.seq;
  }
});
const rgbaFrame: RenderFrame = { seq: 1, width: 1, height: 1, pixels: new Uint8Array(4), x: 0, y: 0, phase: 'idle' };
const renderControls: RenderControl[] = [
  { type: 'init', session: 's', instance: { kind: 'host' }, size: 200, pixelSize: 400,
    workArea: { x: 0, y: 0, width: 1920, height: 1080 }, x: 100, y: 200,
    appearance: { dataVersion: 2, data: { settings: [1, true, null] }, assets: { head: 'session-scoped-url' } } },
  { type: 'begin', session: 's', x: 120, y: 230, t: 10,
    view: { x: 100, y: 200, clip: 'idle', frame: 0, flip: -1, localX: 20, localY: 30 } },
  { type: 'move', session: 's', x: 130, y: 240, t: 20 },
  { type: 'end', session: 's', x: 130, y: 240, t: 30 },
  { type: 'cancel', session: 's', reason: 'appearance_changed' },
  { type: 'ack', session: 's', seq: 1 },
];
const frameSent: void = renderer.render.submitFrame(rgbaFrame);
renderer.render.submitFrame({ ...rgbaFrame, pixels: new Uint8ClampedArray(4), phase: 'active' });
const rendererFailed: void = renderer.render.fail('render_failed');
stopRenderControl();
// @ts-expect-error Render frames cannot select a different session.
renderer.render.submitFrame({ ...rgbaFrame, session: 'another-session' });
// @ts-expect-error Only RGBA typed arrays are allowed.
renderer.render.submitFrame({ ...rgbaFrame, pixels: [0, 0, 0, 0] });
// @ts-expect-error Physics phases are private renderer implementation details.
renderer.render.submitFrame({ ...rgbaFrame, phase: 'falling' });
// @ts-expect-error The render sandbox has no general storage SDK.
renderer.storage.get('private');
// @ts-expect-error The render sandbox cannot apply another appearance.
renderer.appearance.apply();
// @ts-expect-error The render sandbox has no network SDK.
renderer.net.fetch('https://example.com');
// @ts-expect-error Tools cannot submit render frames.
tool.render.submitFrame(rgbaFrame);
// @ts-expect-error Panels cannot control the dedicated render session.
panel.render.fail('x');
// @ts-expect-error Blocks cannot subscribe to render input.
block.render.onControl(() => {});
// @ts-expect-error The ordinary SDK union does not include the render sandbox.
shared.render.submitFrame(rgbaFrame);
// @ts-expect-error A begin input needs its authenticated view metadata.
const incompleteBegin: RenderControl = { type: 'begin', session: 's', x: 0, y: 0, t: 0 };
// @ts-expect-error The begin view includes the starting screen anchor.
const missingBeginAnchor: RenderControl = { type: 'begin', session: 's', x: 0, y: 0, t: 0, view: { clip: 'idle', frame: 0, flip: 1, localX: 0, localY: 0 } };

const rendererManifest: AppearanceRendererManifest = definePluginManifest({
  id: 'sample-renderer', name: 'Renderer', version: '0.1.0', apiVersion: 1,
  kind: ['appearance-renderer'], permissions: ['appearance:render'],
  entry: { renderer: { src: 'renderer.html', apiVersion: 1, dataVersions: [1] } },
});
const explicitRenderer: PluginManifest<'appearance-renderer'> = rendererManifest;
// @ts-expect-error A renderer cannot mix with executable tool kinds.
definePluginManifest({ ...rendererManifest, kind: ['appearance-renderer', 'tool'] });
// @ts-expect-error Exactly one explicit render permission is required.
definePluginManifest({ ...rendererManifest, permissions: [] });
// @ts-expect-error General plugin privileges are unavailable to renderer packages.
definePluginManifest({ ...rendererManifest, permissions: ['appearance:render', 'storage'] });
// @ts-expect-error A renderer must have its renderer entry.
definePluginManifest({ ...rendererManifest, entry: {} });
// @ts-expect-error A renderer cannot supply a panel entry.
definePluginManifest({ ...rendererManifest, entry: { ...rendererManifest.entry, panel: { src: 'panel.html' } } });
// @ts-expect-error Only render bridge version 1 is supported.
definePluginManifest({ ...rendererManifest, entry: { renderer: { src: 'renderer.html', apiVersion: 2, dataVersions: [1] } } });
// Data versions belong to the renderer; host bridge apiVersion remains 1.
definePluginManifest({ ...rendererManifest, entry: { renderer: { src: 'renderer.html', apiVersion: 1, dataVersions: [2] } } });
// @ts-expect-error At least one supported data version is required.
definePluginManifest({ ...rendererManifest, entry: { renderer: { src: 'renderer.html', apiVersion: 1, dataVersions: [] } } });
// @ts-expect-error Renderers do not consume services.
definePluginManifest({ ...rendererManifest, services: [] });
// @ts-expect-error Renderers cannot provide services.
definePluginManifest({ ...rendererManifest, provides: { service: 'render' } });
// @ts-expect-error Ordinary plugin kinds cannot claim renderer authority.
definePluginManifest({ id: 'x', name: 'X', version: '0.1.0', kind: ['tool'], entry: { tool: 'index.js' }, permissions: ['appearance:render'] });

const realtimeDescriptor: RealtimeAppearanceDescriptor = { renderer: 'sample-renderer', dataVersion: 1, data: 'realtime/data.json', assets: { head: 'realtime/head.png' } };
// @ts-expect-error Data must be a package-relative JSON path, not executable or inline content.
const inlineRealtimeData: RealtimeAppearanceDescriptor = { ...realtimeDescriptor, data: { headScale: 1 } };
// @ts-expect-error The asset descriptor is not a renderer code entry.
const executableRealtimeData: RealtimeAppearanceDescriptor = { ...realtimeDescriptor, src: 'renderer.html' };
tool.appearance.getState().then(state => {
  const status: 'ready' | 'missing-renderer' | 'unsupported' | 'unavailable' | undefined = state.own.realtime?.state;
  // @ts-expect-error Renderer resources are not exposed through appearance state.
  state.own.realtime?.assets;
});
