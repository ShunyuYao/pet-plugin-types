'use strict';
// Resolve actual TypeScript types: inheritance/Omit/optional properties are not regexes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const arg = process.argv.indexOf('--host');
const hostDir = arg >= 0 ? process.argv[arg + 1] : process.env.PET_PLUGIN_HOST_DIR;
assert(hostDir, 'Required: PET_PLUGIN_HOST_DIR or --host <host demo directory>. Delivery checks never SKIP.');
const runtimeDir = path.resolve(hostDir, 'core/plugin-runtime');
const { SURFACE } = require(path.join(runtimeDir, 'sdk-surface.js'));
const manifest = require(path.join(runtimeDir, 'manifest.js'));
const themeContract = require(path.resolve(hostDir, 'core/ui-theme-contract.js'));
const root = path.resolve(__dirname, '..');
const program = ts.createProgram([path.join(root, 'index.d.ts')], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022 });
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
}));
const checker = program.getTypeChecker();
const source = program.getSourceFile(path.join(root, 'index.d.ts'));
const exportsByName = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map(s => [s.name, s]));
const publicEntries = SURFACE.filter(e => e.tier !== 'closed');
const contexts = [['tool', 'PetTool'], ['panel', 'PetPanel'], ['block', 'PetBlock'], ['render', 'PetRender']];
for (const method of ['onControl', 'submitFrame', 'fail']) {
  const entry = publicEntries.find(e => e.ns === 'render' && e.method === method);
  assert(entry, `render.${method}: missing public contract`);
  assert.deepEqual(entry.contexts, ['render'], `render.${method}: must remain render-only`);
  assert.equal(entry.kind, 'custom', `render.${method}: must use the dedicated bridge`);
  assert.equal(entry.tier, 'experimental');
  assert.equal(entry.permission, 'appearance:render');
}
for (const [context, name] of contexts) {
  const type = checker.getDeclaredTypeOfSymbol(exportsByName.get(name));
  const actual = [];
  for (const ns of checker.getPropertiesOfType(type)) {
    const nsType = checker.getTypeOfSymbolAtLocation(ns, source);
    if (ns.name === 'context') { actual.push('context'); continue; }
    for (const method of checker.getPropertiesOfType(nsType)) {
      const key = `${ns.name}.${method.name}`;
      actual.push(key);
      const entry = publicEntries.find(e => `${e.ns}.${e.method}` === key);
      const methodType = checker.getTypeOfSymbolAtLocation(method, source);
      const signature = checker.getSignaturesOfType(methodType, ts.SignatureKind.Call)[0];
      assert(signature, `${name}.${key}: must be callable`);
      if (entry?.argSpec) assert.equal(signature.parameters.length, entry.argSpec.length, `${name}.${key}: argument count`);
      if (entry?.tier === 'experimental') {
        assert(ts.getJSDocTags(signature.declaration).some(tag => tag.tagName.text === 'experimental'), `${name}.${key}: missing @experimental`);
      }
    }
  }
  const expected = publicEntries.filter(e => e.contexts.includes(context)).map(e => e.ns ? `${e.ns}.${e.method}` : e.method);
  assert.deepEqual(actual.sort(), expected.sort(), `${name}: full public method/context matrix differs`);
  console.log(`PASS ${name}: ${actual.length} public members`);
}

// TypeScript resolves inherited properties and Omit; table comparison also covers docs.
const readmeArg = process.argv.indexOf('--readme');
const readmes = [path.join(root, 'README.md')];
if (readmeArg >= 0) readmes.push(path.resolve(process.argv[readmeArg + 1]));
for (const readme of readmes) {
  const text = fs.readFileSync(readme, 'utf8');
  const region = /<!-- sdk-surface:start -->([\s\S]*?)<!-- sdk-surface:end -->/.exec(text);
  assert(region, `${readme}: missing SDK matrix markers`);
  const rows = [];
  for (const line of region[1].split('\n')) {
    const m = /^\| `([^`]+)` \| `([^`]+)` \| ([AB—]) \| ([AB—]) \| ([AB—]) \| ([AB—]) \|$/.exec(line);
    if (m) rows.push(`${m[1] === '(root)' ? '' : m[1] + '.'}${m[2]}:${m.slice(3).join(',')}`);
  }
  const expected = publicEntries.map(e => `${e.ns ? e.ns + '.' : ''}${e.method}:${contexts.map(([c]) => e.contexts.includes(c) ? (e.tier === 'frozen' ? 'A' : 'B') : '—').join(',')}`);
  assert.deepEqual(rows.sort(), expected.sort(), `${readme}: public documentation matrix differs`);
  console.log(`PASS ${path.basename(path.dirname(readme))} documentation: ${rows.length} public entries`);
}
const pkg = require('../package.json');
for (const [tier, field] of [['frozen', 'frozenMethods'], ['experimental', 'experimentalMethods']]) {
  assert.equal(pkg.petSdk[field], publicEntries.filter(e => e.tier === tier).length, `package ${field}`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pet-manifest-contract-'));
try {
  const base = { id: 'sample', name: 'Sample', version: '1.0.0', kind: ['tool', 'panel'],
    permissions: ['clipboard', 'errands'], activation: 'opt-in',
    entry: { tool: 'index.js', panel: { src: 'panel.html', transparent: true } } };
  const check = value => { fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(value)); return manifest.loadManifest(dir); };
  const loaded = check(base);
  assert.equal(loaded.entry.panel.transparent, true);
  assert.notEqual(loaded.updateReminders, true);
  for (const updateReminders of [true, false]) assert.equal(check({ ...base, updateReminders }).updateReminders, updateReminders);
  for (const updateReminders of ['true', 1, null, {}]) assert.throws(() => check({ ...base, updateReminders }), /updateReminders/);
  for (const permission of ['clipboard', 'errands']) assert(manifest.requestedGrants(loaded).includes(permission));
  assert.throws(() => check({ ...base, activation: true }), /activation/);
  assert.throws(() => check({ ...base, entry: { ...base.entry, panel: { src: 'panel.html', transparent: 'yes' } } }), /transparent/);
  console.log('PASS real host manifest: valid declarations accepted, invalid declarations rejected');

  const rendererManifest = { id: 'sample-renderer', name: 'Renderer', version: '0.1.0', apiVersion: 1,
    kind: ['appearance-renderer'], permissions: ['appearance:render'],
    entry: { renderer: { src: 'renderer.html', apiVersion: 1, dataVersions: [1] } } };
  fs.writeFileSync(path.join(dir, 'renderer.html'), '<!doctype html><html><body></body></html>');
  fs.writeFileSync(path.join(dir, 'renderer.js'), '<!doctype html><html><body></body></html>');
  fs.mkdirSync(path.join(dir, 'nested'));
  const acceptedRenderer = check(rendererManifest);
  assert.deepEqual(acceptedRenderer.kind, ['appearance-renderer']);
  assert.deepEqual(manifest.requestedGrants(acceptedRenderer), ['appearance:render']);
  assert.deepEqual(acceptedRenderer.entry.renderer, rendererManifest.entry.renderer);
  assert.deepEqual(check({ ...rendererManifest, entry: { renderer: { ...rendererManifest.entry.renderer, dataVersions: [1, 2] } } }).entry.renderer.dataVersions, [1, 2]);
  assert(manifest.EXPERIMENTAL_PERMISSIONS.includes('appearance:render'));
  for (const change of [
    { kind: ['appearance-renderer', 'tool'], entry: { ...rendererManifest.entry, tool: 'index.js' } },
    { permissions: [] }, { permissions: ['appearance:render', 'storage'] },
    { permissions: ['appearance:render', 'appearance:render'] },
    { entry: {} }, { entry: { ...rendererManifest.entry, panel: { src: 'panel.html' } } },
    { services: [] }, { provides: { service: 'render' } },
  ]) assert.throws(() => check({ ...rendererManifest, ...change }), undefined, `Renderer declaration rejected: ${JSON.stringify(change)}`);
  for (const change of [
    // Existing files ensure failure is due to the entry contract, not ENOENT.
    { src: 'nested/../renderer.html' }, { src: path.join(dir, 'renderer.html') },
    { src: '../renderer.html' }, { src: 'https://example.com/renderer.html' },
    { src: 'renderer.js' }, { apiVersion: 2 }, { apiVersion: '1' },
    { dataVersions: [] }, { dataVersions: [0] }, { dataVersions: [-1] },
    { dataVersions: [1.5] }, { dataVersions: [Number.MAX_SAFE_INTEGER + 1] }, { dataVersions: [1, 1] },
    { dataVersions: Array.from({ length: 65 }, (_, i) => i + 1) },
  ]) assert.throws(() => check({ ...rendererManifest, entry: { renderer: { ...rendererManifest.entry.renderer, ...change } } }), undefined, `Renderer entry rejected: ${JSON.stringify(change)}`);
  assert.throws(() => check({ ...base, permissions: ['appearance:render'] }));
  const renderType = checker.getDeclaredTypeOfSymbol(exportsByName.get('PetRender'));
  assert.deepEqual(checker.getPropertiesOfType(renderType).map(p => p.name), ['render']);
  const frameType = checker.getDeclaredTypeOfSymbol(exportsByName.get('RenderFrame'));
  assert.deepEqual(checker.getPropertiesOfType(frameType).map(p => p.name).sort(), ['height', 'phase', 'pixels', 'seq', 'width', 'x', 'y']);
  console.log('PASS real host renderer: isolated context, strict declaration, bridge/data versions and frame fields');

  const themeManifest = { id: 'sample-theme', name: 'Sample theme', version: '0.1.0', apiVersion: 1,
    kind: ['theme'], permissions: ['ui:theme'], entry: { theme: 'theme.json' } };
  const colors = Object.fromEntries(themeContract.COLOR_KEYS.map(key => [key, '#123456']));
  const definition = { schemaVersion: 1, target: 'chat', colors, radius: 18, bubbleRadius: 15, texture: 'paper' };
  const writeTheme = value => fs.writeFileSync(path.join(dir, 'theme.json'), JSON.stringify(value));
  writeTheme(definition);
  const acceptedTheme = check(themeManifest);
  assert.deepEqual(acceptedTheme.kind, ['theme']);
  assert.deepEqual(manifest.requestedGrants(acceptedTheme), ['ui:theme']);
  assert.deepEqual(themeContract.readTheme(dir, acceptedTheme.entry.theme), definition);
  for (const change of [
    { kind: ['theme', 'tool'], entry: { theme: 'theme.json', tool: 'index.js' } },
    { permissions: [] }, { permissions: ['ui:theme', 'storage'] }, { permissions: ['ui:theme', 'ui:theme'] },
    { entry: { theme: 'theme.json', panel: { src: 'panel.html' } } },
    { entry: { theme: '../theme.json' } }, { services: [] },
    { provides: { service: 'sample' } }, { activation: 'opt-in' },
  ]) assert.throws(() => check({ ...themeManifest, ...change }), undefined, `Theme declaration rejected: ${JSON.stringify(change)}`);

  // Compare exported type fields with the actual validator, not only our own fixture.
  const themeType = checker.getDeclaredTypeOfSymbol(exportsByName.get('ThemeDefinition'));
  assert.deepEqual(checker.getPropertiesOfType(themeType).map(p => p.name).sort(), Object.keys(definition).sort());
  const colorsType = checker.getDeclaredTypeOfSymbol(exportsByName.get('ThemeColors'));
  assert.deepEqual(checker.getPropertiesOfType(colorsType).map(p => p.name).sort(), [...themeContract.COLOR_KEYS].sort());
  assert.equal(themeContract.MAX_BYTES, 16 * 1024);
  for (const change of [
    { schemaVersion: 2 }, { target: 'settings' }, { css: 'body{}' },
    { colors: { ...colors, panel: ['#123456'] } }, { colors: { ...colors, panel: '#fff' } },
    { radius: 29 }, { bubbleRadius: 0.5 }, { texture: 'https://example.com/theme.png' },
  ]) {
    writeTheme({ ...definition, ...change });
    assert.throws(() => themeContract.readTheme(dir, 'theme.json'));
  }
  fs.writeFileSync(path.join(dir, 'theme.json'), JSON.stringify(definition) + ' '.repeat(themeContract.MAX_BYTES));
  assert.throws(() => themeContract.readTheme(dir, 'theme.json'));
  console.log('PASS real host theme: exported fields, strict manifest, JSON content and 16 KiB bound');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
