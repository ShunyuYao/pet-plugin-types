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
for (const [context, name] of [['tool', 'PetTool'], ['panel', 'PetPanel'], ['block', 'PetBlock']]) {
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
    const m = /^\| `([^`]+)` \| `([^`]+)` \| ([AB—]) \| ([AB—]) \| ([AB—]) \|$/.exec(line);
    if (m) rows.push(`${m[1] === '(root)' ? '' : m[1] + '.'}${m[2]}:${m.slice(3).join(',')}`);
  }
  const expected = publicEntries.map(e => `${e.ns ? e.ns + '.' : ''}${e.method}:${['tool', 'panel', 'block'].map(c => e.contexts.includes(c) ? (e.tier === 'frozen' ? 'A' : 'B') : '—').join(',')}`);
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
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
