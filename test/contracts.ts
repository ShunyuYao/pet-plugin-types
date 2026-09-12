import type { Pet, PetTool, PetPanel, PetBlock, BadgeOptions, ComposeFileOptions } from '../index';
import { definePluginManifest } from '../manifest';

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
  activation: 'opt-in', permissions: ['clipboard', 'errands'],
  entry: { tool: 'index.js', panel: { src: 'panel.html', transparent: true } },
});
// @ts-expect-error Transparent must be boolean.
definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['panel'], entry: { panel: { src: 'panel.html', transparent: 'yes' } } });
// @ts-expect-error Tool entry is required.
definePluginManifest({ id: 'sample', name: 'Sample', version: '1.0.0', kind: ['tool'], entry: {} });
