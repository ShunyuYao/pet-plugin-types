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
 * 权限名。
 *
 * ⚠️ 本联合类型**尚未冻结**：具体开放哪些权限、名称是否调整，
 * 取决于 SDK surface 终审（宿主仓库 US-PP07）的结论。
 * 在结论落地前，这里只列出宿主 runtime.js sdkCall 表当前实际存在的命名空间，
 * 供开发者参考，不构成契约承诺。
 */
export type PluginPermission =
  | 'storage'
  | 'secrets'
  | 'pet'
  | 'ui'
  | 'events'
  | 'scheduler'
  | 'net'
  | 'services'
  | 'settings'
  | 'ai'
  | 'files'
  | 'friends'
  | 'activity'
  | 'dashboard'
  // 联网需按域名逐一声明，如 'net:api.example.com'
  | `net:${string}`;

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
  skills?: string | string[];
  settings?: { title?: string; fields?: SettingsField[] };
}

export interface PluginManifest {
  /** 必须匹配 /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/ 且不含 '..' */
  id: string;
  name: string;
  /** 形如 x.y.z */
  version: string;
  /** 低于此宿主版本则不加载 */
  minHostVersion?: string;
  /**
   * SDK 契约版本。宿主用它判断兼容性；缺省时按宿主的最低兼容版本处理。
   * ⚠️ 该字段由宿主 US-PP09 引入，尚未随宿主发布。
   */
  apiVersion?: number;
  /** 非空子集 */
  kind: PluginKind[];
  permissions?: PluginPermission[];
  services?: string[];
  /** kind 含 'service' 时必填 */
  provides?: { service: string };
  entry?: PluginEntry;
}
