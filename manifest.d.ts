/**
 * manifest.json 的类型定义。
 *
 * 与宿主 `demo/core/plugin-runtime/manifest.js` 的 loadManifest 校验规则一一对应——
 * 那里是唯一事实源，本文件是它的类型镜像。改宿主校验必须同步改这里。
 */

/** 插件种类。宿主 KINDS 常量的镜像。 */
export type PluginKind =
  | 'tool'
  | 'panel'
  | 'asset'
  | 'skill'
  | 'settings'
  | 'service'
  | 'dashboard-card';

/**
 * 已冻结（A 档）的权限名。同一 `apiVersion` 内只加不改不删。
 *
 * - `net:<hostname>` **必须逐域名声明**，不存在宽泛的 `net`。要访问
 *   `https://api.example.com/x` 就写 `'net:api.example.com'`。
 * - `service:<name>` 由宿主从 manifest 的 `services` 数组自动展开，
 *   一般不必手写进 `permissions`。
 */
export type FrozenPermission =
  | 'storage'
  | 'secrets'
  | 'pet'
  | 'ui'
  | 'events'
  | 'scheduler'
  | 'friends'
  | 'dashboard'
  | 'tools'
  | `net:${string}`
  | `service:${string}`;

/**
 * @experimental 实验档（B 档）权限名。
 *
 * 这些权限对应的 SDK 方法**签名/语义可能在任一 apiVersion 变更，且不走废弃流程**；
 * 权限名本身也可能被细分（例如 `files` 大概率拆成 `files:pick` / `files:read` /
 * `files:open`）。用得了，但要跟版本。
 */
export type ExperimentalPermission =
  | 'ai'
  | 'files'
  | 'activity'
  | 'calendar-provider';

/**
 * 权限名的字面量联合（A 档 + B 档）。
 *
 * 判定为 C 档「本轮不开放」的权限（`ui:theme`、`auth-window`）**不在此列**：
 * 宿主运行时仍认它们（内置插件在用），但它们不是对外契约，第三方插件不应声明。
 */
export type PluginPermission = FrozenPermission | ExperimentalPermission;

export interface PanelEntry {
  /** 面板 HTML 相对路径，经 plugin:// 协议加载 */
  src: string;
  width?: number;
  height?: number;
  title?: string;
}

export interface DashboardBlockEntry {
  /** 看板卡片 HTML 相对路径，在隔离 iframe 里加载 */
  src: string;
}

export interface SettingsField {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'boolean' | 'select';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface PluginEntry {
  /** kind 含 'tool' 时必填 */
  tool?: string;
  /** kind 含 'panel' 时必填 */
  panel?: PanelEntry;
  /** kind 含 'dashboard-card' 时必填 */
  dashboardBlock?: DashboardBlockEntry;
  character?: string;
  /**
   * 技能目录的相对路径（**单个路径字符串，不是数组**）。缺省为 `'skills'`。
   *
   * 宿主 `runtime.js` 直接 `path.join(rec.dir, entry.skills || 'skills')`——
   * 传数组会抛 `TypeError`，故此处不接受 `string[]`。
   */
  skills?: string;
  settings?: { title?: string; fields?: SettingsField[] };
}

/**
 * 由 `kind` 推出的 `entry` 必填项——宿主 loadManifest 那四条条件校验的类型镜像：
 *
 * - `kind` 含 `'tool'` → `entry.tool` 必填（string）
 * - `kind` 含 `'panel'` → `entry.panel.src` 必填
 * - `kind` 含 `'dashboard-card'` → `entry.dashboardBlock.src` 必填
 *
 * 三者都不含时 `entry` 整体可选。
 */
export type RequiredEntry<K extends PluginKind> =
  ('tool' extends K ? { tool: string } : {}) &
  ('panel' extends K ? { panel: PanelEntry } : {}) &
  ('dashboard-card' extends K ? { dashboardBlock: DashboardBlockEntry } : {}) &
  PluginEntry;

/** `kind` 含 `'service'` 时 `provides.service` 必填，否则整体可选。 */
export type RequiredProvides<K extends PluginKind> =
  'service' extends K
    ? { provides: { service: string } }
    : { provides?: { service: string } };

/** `entry` 在 kind 含 tool/panel/dashboard-card 任一时变为必填字段，否则可选。 */
export type EntryField<K extends PluginKind> =
  'tool' extends K ? { entry: RequiredEntry<K> }
  : 'panel' extends K ? { entry: RequiredEntry<K> }
  : 'dashboard-card' extends K ? { entry: RequiredEntry<K> }
  : { entry?: RequiredEntry<K> };

/**
 * manifest 的公共字段（与 `kind` 无关的部分）。
 * 完整 manifest 类型见 {@link PluginManifest}。
 */
export interface PluginManifestBase {
  /** 必须匹配 /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/ 且不含 '..' */
  id: string;
  name: string;
  /** 形如 x.y.z */
  version: string;
  /** 低于此宿主版本则不加载。说的是「宿主构建够不够新」。 */
  minHostVersion?: string;
  /**
   * SDK 契约版本，说的是「插件按哪一代 SDK 语义写的」——与 {@link PluginManifest.minHostVersion}
   * 是两个维度。
   *
   * 可选；**声明了就必须是 ≥1 的整数**（写成 `"1"` / `1.5` / `0` 会被宿主判为包不合法）。
   * 缺省时宿主按最低兼容版本处理，老插件不因未声明而失效。
   *
   * 当前宿主：`CURRENT_API_VERSION = 1`、`MIN_COMPATIBLE_API_VERSION = 1`。
   * 超出宿主支持范围的插件会被置为 disabled 并写明原因，不会崩在半路。
   */
  apiVersion?: number;
  permissions?: PluginPermission[];
  /**
   * 要消费的服务名。宿主授权时展开为 `service:<name>`。
   *
   * 注意：**提供**服务（`services.provide`）当前仅内置插件可用，
   * 第三方插件只能消费。
   */
  services?: string[];
}

/**
 * 一份 manifest.json 的类型。
 *
 * 泛型参数 `K` 是本插件声明的 kind 联合，一般**不用手写**——
 * 用 {@link definePluginManifest} 或 `satisfies` 让 TS 从字面量里推出来，
 * `kind` 与 `entry` 的对应关系就会被静态校验：
 *
 * ```ts
 * // ✅ kind 含 tool，entry.tool 已给
 * const m = definePluginManifest({
 *   id: 'demo', name: '示例', version: '1.0.0', apiVersion: 1,
 *   kind: ['tool'], entry: { tool: 'tool.js' },
 * });
 *
 * // ❌ 编译期报错：kind 含 tool 却没有 entry.tool（宿主 loadManifest 会抛错）
 * const bad = definePluginManifest({
 *   id: 'demo', name: '示例', version: '1.0.0',
 *   kind: ['tool'], entry: {},
 * });
 * ```
 */
export type PluginManifest<K extends PluginKind = PluginKind> =
  PluginManifestBase & {
    /** 非空子集 */
    kind: K[];
  } & RequiredProvides<K> & EntryField<K>;

/**
 * 恒等函数，唯一作用是让 TS 从 `kind` 字面量推断 `K`，从而把宿主的
 * 「kind 含 X → entry.X 必填」校验提前到编译期。
 *
 * 写 `manifest.json` 时用不上（JSON 没有函数），但用 TS/JS 生成 manifest、
 * 或在测试里构造 manifest 时，这是拿到静态校验的方式。
 */
export declare function definePluginManifest<K extends PluginKind>(
  manifest: PluginManifest<K>
): PluginManifest<K>;
