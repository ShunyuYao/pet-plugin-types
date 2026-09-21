/**
 * @pet/plugin-types — 桌宠（吐梨邦）插件 SDK 类型定义
 *
 * **本包是 SDK surface 的唯一权威文档。** 类型与宿主
 * `demo/core/plugin-runtime/sdk-surface.js` 的定义表逐条对应，分档依据是宿主
 * `docs/plugin-sdk-freeze-review.md`（冻结方案决定版）。
 *
 * ## 三档承诺
 *
 * | 档位 | 标记 | 承诺 |
 * |---|---|---|
 * | A 冻结 | 无标记 | 同一 `apiVersion` 内**只加不改不删**；废弃需先标 deprecated 并保留 ≥2 个宿主版本 |
 * | B 实验 | `@experimental` | 可用，但**签名/语义可能在任一 apiVersion 变更，且不走废弃流程** |
 * | C 不开放 | 不在公开根对象中 | 运行时可能仍有实现（内置插件在用），但不作为对外契约，第三方不得依赖 |
 *
 * 本文件当前对应 `apiVersion: 1`（见 package.json 的 `petSdk`）。
 * A 档共 30 条、B 档 24 条；C 档（`ui.injectStyle`、`pet.meetingCard`、
 * `services.provide`、`auth.openAuthWindow`、`pet.host.*`）**不在公开根对象中**。
 *
 * ## 返回值与注册方法
 *
 * 内置和外部 tool 均经 RPC，panel/block 经 IPC；普通调用返回 Promise。
 * 桥内注册（events.on / tools.register / calendar.registerProvider）返回 void。
 *
 * ## 上下文差异
 *
 * 插件代码可能跑在三种上下文里，可用的命名空间**不一致**（这是有意设计，不是漏做）：
 *
 * - `tool` —— 工具插件的 utilityProcess 子进程，能力最全
 * - `panel` —— 插件 panel 窗口（渲染层）
 * - `dashboard-card` —— 看板区块 iframe（渲染层，最受限）
 *
 * 用 {@link PetTool} / {@link PetPanel} / {@link PetBlock} 三个类型按上下文取到精确的
 * 可用面；{@link Pet} 是三者的并集视图，上下文限定的成员标为可选。
 * 完整矩阵见 README 的「三上下文能力矩阵」。
 */

export * from './manifest';
export * from './theme';

// ─────────────────────────────────────────────────────────────
// storage —— 权限：`storage`。三上下文一致，A 档冻结。
// ─────────────────────────────────────────────────────────────

/**
 * 插件私有键值存储（明文 JSON，落 `userData/plugins/<id>/data.json`）。
 * 敏感数据一律走 {@link PetSecrets}，不要放这里。
 *
 * 权限：`storage`
 * 上下文：tool / panel / dashboard-card
 */
export interface PetStorage {
  /** 读一个键；不存在时返回 `defaultValue`（未传则 `undefined`）。 */
  get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
  /** 写一个键。键会被宿主 `String()` 强转。 */
  set(key: string, value: unknown): Promise<void>;
  /** 删一个键。 */
  delete(key: string): Promise<void>;
  /** 读回整棵 JSON。数据量由插件自己控制。 */
  all(): Promise<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────
// secrets —— 权限：`secrets`。**仅 tool 上下文**（有意：渲染层读密钥 = XSS 等于泄漏）。
// ─────────────────────────────────────────────────────────────

/**
 * 加密凭据仓（宿主 safeStorage）。token / 密码 / API key 一律走这里——
 * 开发者政策明令禁止明文落盘。
 *
 * 权限：`secrets`
 * 上下文：**仅 tool**（panel 与 dashboard-card 上不存在，属有意设计）
 */
export interface PetSecrets {
  /**
   * 读一条凭据；**不存在返回 `null`**（不是 `undefined`）。
   *
   * 宿主 `SecretStore.get()` 的四条 miss 路径——键不存在、safeStorage 不可用、
   * 解密失败、`plain:` 回退未被 `PET_ALLOW_INSECURE_SECRET_STORAGE=1` 放行——
   * 一律 `return null`。判空写 `=== null` 或 `== null`，别写 `=== undefined`。
   */
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// pet —— 权限：`pet`。三上下文一致。
// ─────────────────────────────────────────────────────────────

/** @experimental Metadata of one available clip (first variant). No filesystem paths. */
export interface PetAnimation {
  state: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  standard: boolean;
}

/**
 * 宠物表现通道。操作方法返回 `false` 表示宠物窗当前不存在（不是错误）。
 *
 * 权限：`pet`
 * 上下文：tool / panel / dashboard-card
 */
export interface PetSurface {
  /** 头顶气泡。`ms` 省略时由宿主按文本长度估算显示时长。 */
  bubble(text: string, ms?: number): Promise<boolean>;
  /**
   * 播放动画状态。无该动画时宿主按 `STATE_FALLBACK` 降级到相近状态
   * （这是正确行为，不是错误）。
   */
  playAnim(state: string): Promise<boolean>;
  /** @experimental Current appearance clips, no paths; requires pet permission. Main-branch source; host 0.23.0 macOS arm64 local compatibility package validated (not a public host release), no npm release. */
  getAnimations(): Promise<PetAnimation[]>;
  /** TTS 朗读一句话。 */
  speak(text: string): Promise<boolean>;
}

/** @experimental 徽标色调。 */
export type BadgeTone = 'primary' | 'warning' | 'success' | 'danger' | 'muted';
/** @experimental 每段文本最多 4 个 Unicode 码点，由宿主运行时检查。 */
export interface BadgeSegment { tone: BadgeTone; text: string; }
/** @experimental 1–2 段；点击仅支持打开本插件面板，另需 ui 权限和 panel 入口。 */
export interface BadgeOptions {
  segments: [BadgeSegment] | [BadgeSegment, BadgeSegment];
  onClick?: 'openPanel';
}
/**
 * @experimental 宠物脚下常驻徽标；仅 tool，复用 pet 权限。
 * 同时只允许一个插件占用；插件退出/卸载时宿主清除。宿主 0.19.1 起可用。
 */
export interface PetBadge {
  /** @experimental 无可用宠物窗、名额被占或输入非法时返回 false。 */
  set(options: BadgeOptions): Promise<boolean>;
  /** @experimental 无本插件持有的徽标时返回 false。 */
  clear(): Promise<boolean>;
}

/** @experimental 宿主只接受下列轮询与容量选项。 */
export interface ClipboardHistoryOptions {
  /** 默认 1000ms，最小 250ms。 */
  pollIntervalMs?: number;
  /** pollIntervalMs 的兼容别名；两者都有时前者优先。 */
  intervalMs?: number;
  /** 默认 1GiB，范围 1KiB–4GiB，超额淘汰最旧记录。 */
  maxBytes?: number;
}
/** @experimental */
export interface ClipboardQueryOptions {
  type?: 'all' | 'text' | 'image';
  search?: string;
  offset?: number;
  /** 默认 50，最大 500。 */
  limit?: number;
}
/** @experimental 查询只返回元信息，不含全文或图片磁盘路径。 */
export interface ClipboardEntry {
  id: string;
  type: 'text' | 'image';
  capturedAt: number;
  referencedAt: number | null;
  preview?: string;
  name?: string;
}
/** @experimental */
export interface ClipboardQueryResult {
  items: ClipboardEntry[];
  total: number;
  offset: number;
  limit: number;
  bytes: number;
  revision: number;
}
/** @experimental 图片 read 返回 base64 缩略图，不是原图或文件路径。 */
export type ClipboardReadResult =
  | (ClipboardEntry & { type: 'text'; plain: string; html: string; rtf: string })
  | (ClipboardEntry & { type: 'image'; thumbnail: string; thumbnailMimeType: 'image/png' });
/** @experimental 剪贴板历史；clipboard 权限。tool 拥有全部方法，panel 不拥有轮询启停。 */
export interface PetClipboard {
  /** @experimental 仅 tool；已在轮询时返回 false。 */
  startHistory(options?: ClipboardHistoryOptions): Promise<boolean>;
  /** @experimental 仅 tool；未在轮询时返回 false。 */
  stopHistory(): Promise<boolean>;
  /** @experimental 元信息分页；最近引用的条目排在前。 */
  query(options?: ClipboardQueryOptions): Promise<ClipboardQueryResult>;
  /** @experimental 非法或不存在的 id 会拒绝 Promise。 */
  read(id: string): Promise<ClipboardReadResult>;
  /** @experimental 复制历史内容到系统剪贴板，并标记引用时间。 */
  copy(id: string): Promise<boolean>;
  /** @experimental 更新引用时间。 */
  markReferenced(id: string): Promise<boolean>;
  /** @experimental 删除本插件的一条历史；不存在返回 false。 */
  remove(id: string): Promise<boolean>;
  /** @experimental 清空本插件的历史记录。 */
  clearHistory(): Promise<boolean>;
}
/** @experimental 来源与预览必须配对，不支持任意本地文件路径。 */
export type ComposeFileOptions =
  | { source: { type: 'generated'; mimeType: 'text/markdown'; content: string; name?: string };
      preview: { type: 'markdown'; text: string } }
  | { source: { type: 'clipboard-image'; id: string; name?: string };
      preview: { type: 'image' } };
/** @experimental */
export interface ComposeFileResult { action: 'sent' | 'cancelled'; }
/** @experimental tool/panel，需 errands 权限；剪贴板图片另需 clipboard 权限。 */
export interface PetErrands {
  /**
   * @experimental 打开宿主派差事卡，由用户选择收件人并发送。
   * generated 限 Markdown 10MiB、预览 64KiB；同插件同时只允许一项待处理。
   * 用户取消/超时返回 cancelled；校验或打开卡片失败拒绝 Promise。
   */
  composeFile(options: ComposeFileOptions): Promise<ComposeFileResult>;
}

// ─────────────────────────────────────────────────────────────
// ui —— 权限：`ui`。4 冻结 + 2 实验；`ui.injectStyle`（权限 `ui:theme`）判 C 档，
// 不在公开 SDK 根对象中；旧 PetUi 成员仅作声明兼容。
// ─────────────────────────────────────────────────────────────

/** {@link PetUi.dialog} 的入参。 */
export interface DialogOptions {
  /** 卡片标题。宿主会自动加上插件名前缀（防冒充宿主 UI）。 */
  title?: string;
  text: string;
  /** 确认按钮文案，默认「好」。 */
  okLabel?: string;
  /** 取消按钮文案，默认「取消」。 */
  cancelLabel?: string;
  /** 窗口宽，默认 340。 */
  width?: number;
  /** 窗口高，默认 220。 */
  height?: number;
}

/** {@link PetUi.dialog} 的回传。用户点确认为 `'ok'`，取消/关窗为 `'cancel'`。 */
export interface DialogResult {
  action: 'ok' | 'cancel' | 'timeout';
}

/**
 * @experimental {@link PetUi.taskCheck} 的入参。
 *
 * 13 个可选字段的专用卡，是为学修打卡场景长出来的，与规划中的声明式聊天卡片 API
 * 高度重叠——后者落地后本方法大概率被吸收。签名可能整体变更。
 */
export interface TaskCheckOptions {
  title?: string;
  text?: string;
  timeText?: string;
  badgeLabel?: string;
  doneLabel?: string;
  incompleteLabel?: string;
  snoozeLabel?: string;
  logPlaceholder?: string;
  /** 是否允许附一段文字记录，默认 true。 */
  allowLog?: boolean;
  /** 是否提供「稍后再问」，默认 true。 */
  allowSnooze?: boolean;
  width?: number;
  height?: number;
}

/** @experimental {@link PetUi.taskCheck} 的回传。 */
export interface TaskCheckResult {
  action: 'done' | 'incomplete' | 'snooze' | 'cancel';
  /** `allowLog` 时用户填写的文字记录。 */
  log?: string;
}

/**
 * 宿主 UI 原语。
 *
 * 权限：`ui`
 * 上下文：见各方法（`openPanel` 仅 tool、`closePanel` 无 dashboard-card）
 */
export interface PetUi {
  /**
   * @deprecated @internal C 档（closed），不属于第三方公开契约。
   * 权限：`ui:theme`。上下文：仅 `tool`。
   * 仅保留旧 PetUi 接口的类型兼容；所有公开 SDK 根对象均排除此成员。
   */
  injectStyle(css: string): Promise<unknown>;
  /**
   * 确认框。
   * 上下文：tool / panel / dashboard-card
   */
  dialog(options: DialogOptions): Promise<DialogResult>;
  /**
   * 写系统剪贴板。
   * 上下文：tool / panel / dashboard-card
   */
  copyText(text: string): Promise<boolean>;
  /**
   * 打开本插件的 panel 窗口。
   * 上下文：**仅 tool**（panel 自己调是重复打开、区块调是越权拉窗）
   */
  openPanel(): Promise<boolean>;
  /**
   * 关闭本插件的 panel 窗口。
   * 上下文：tool / panel（dashboard-card 无意义）
   */
  closePanel(): Promise<boolean>;
  /** @experimental tool/panel：设置本插件面板置顶；false 时失焦关闭。返回 true。 */
  setPanelPinned(pinned: boolean): Promise<boolean>;
  /**
   * @experimental 任务完成确认卡。签名可能在任一 apiVersion 变更，不走废弃流程。
   * 上下文：tool / panel / dashboard-card
   */
  taskCheck(options: TaskCheckOptions): Promise<TaskCheckResult>;
}

// ─────────────────────────────────────────────────────────────
// events —— 权限：`events`。三上下文一致，A 档。
// ─────────────────────────────────────────────────────────────

/**
 * 插件间事件总线。事件名与 payload 结构属契约面。
 *
 * 权限：`events`
 * 上下文：tool / panel / dashboard-card
 */
export interface PetEvents {
  /** 订阅事件。同名可多次订阅。 */
  on<T = unknown>(name: string, handler: (data: T) => void): void;
  /** 发布事件，payload 必须可 JSON 序列化。 */
  emit(name: string, data?: unknown): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────
// scheduler —— 权限：`scheduler`。**仅 tool**（渲染层窗口关掉即失活，
// 定时器该由常驻子进程持有；渲染层要定时用原生 setInterval）。
// ─────────────────────────────────────────────────────────────

/**
 * 宿主持有的定时器。插件卸载/停用时宿主自动清理。
 *
 * 权限：`scheduler`
 * 上下文：**仅 tool**
 */
export interface PetScheduler {
  /** 每 `ms` 毫秒执行一次，返回 timerId。 */
  every(ms: number, fn: () => void): Promise<string>;
  /** 每天 `HH:MM`（24 小时制本地时间）执行一次，返回 timerId。 */
  daily(hhmm: string, fn: () => void): Promise<string>;
  /** 按 timerId 取消。 */
  cancel(timerId: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────
// net —— 权限：**逐域名** `net:<hostname>`。**仅 tool**。
// ─────────────────────────────────────────────────────────────

/** {@link PetNet.fetch} 的入参。 */
export interface NetFetchOptions {
  /** 默认 `'GET'`。 */
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * {@link PetNet.fetch} 的回传。**刻意收窄**——不返回 Response 对象、不给流，
 * 正因为它简单才能进冻结集。
 */
export interface NetFetchResult {
  status: number;
  /** 响应体文本。二进制内容请自行 base64 传输。 */
  body: string;
  /** `content-type` 响应头，缺省为空串。 */
  contentType: string;
}

/**
 * 受控出站请求。
 *
 * 权限：**`net:<hostname>` 逐域名声明**，不存在宽泛的 `net` 权限。
 * 例如要访问 `https://api.example.com/v1/x`，manifest 必须声明
 * `"permissions": ["net:api.example.com"]`。协议限 http(s)，其余抛错。
 *
 * 上下文：**仅 tool**（渲染层可直接用原生 `fetch`，受 panel CSP 约束）
 */
export interface PetNet {
  fetch(url: string, options?: NetFetchOptions): Promise<NetFetchResult>;
}

// ─────────────────────────────────────────────────────────────
// services —— 权限：`service:<name>` 逐服务声明。三上下文一致。
// 注意：**消费**服务是 A 档；**提供**服务（`services.provide`）当前仅内置插件可用，
// 判 C 档，不在本契约中。
// ─────────────────────────────────────────────────────────────

/** 服务代理：键为服务方法名，值为返回 Promise 的转发函数。 */
export type ServiceProxy = Record<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * 消费其它插件提供的服务。
 *
 * 权限：`service:<name>`（在 manifest 的 `services` 数组里声明服务名即可，
 * 宿主会展开成 `service:<name>` 参与授权）
 * 上下文：tool / panel / dashboard-card
 */
export interface PetServices {
  /**
   * 取到某个服务的代理对象。服务不存在或未授权时 reject。
   *
   * 注：宿主内部分两步（先取方法列表再造代理），对外契约面只有 `get`。
   */
  get(name: string): Promise<ServiceProxy>;

  /**
   * @experimental 直接调用某个服务的一个方法，不经过 `get` 造代理。
   *
   * `get()` 返回的代理最终也走这条通道；当调用方只需要打一次、或需要自己
   * 持有参数序列化时机时，直接用 `invoke` 更省一次往返。
   *
   * 服务未提供、未授权、方法未在服务的方法表里声明时 reject。
   * `args` 必须可 JSON 序列化（宿主上限 64KB）。
   */
  invoke(name: string, method: string, args: unknown[]): Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────
// character —— 权限：`character:read`（读）/ `character:watch`（订阅）。
// 读的是**宿主当前生效的角色形象**（含自定义形象换装后的结果），不是插件自带素材。
// 四上下文（tool / panel / block / work）一致。
// ─────────────────────────────────────────────────────────────

/** @experimental 当前形象的一个姿势帧。`dataUrl` 是内联 base64，不暴露文件系统路径。 */
export interface CharacterPose {
  id: string;
  label: string;
  /** `data:image/png;base64,…` 或 `data:image/webp;base64,…` */
  dataUrl: string;
}

/** @experimental 当前形象的一次快照。`signature` 变化即代表形象已改变。 */
export interface CharacterRevision {
  key: string;
  name: string;
  /** 形象指纹：用于判断两次读取是否同一形象，不要解析其内部结构。 */
  signature: string;
}

/** @experimental 形象快照 + 请求到的姿势帧（最多 8 张）。 */
export interface CharacterSnapshot extends CharacterRevision {
  poses: CharacterPose[];
}

/**
 * @experimental 读取并订阅宿主当前角色形象。
 *
 * 订阅是**长轮询**形态而非回调：`watch()` 拿一个订阅 id，反复 `next(id)` 取下一次
 * 变化，不再需要时 `unwatch(id)`。这样跨进程（tool 跑在 utilityProcess）不必维持
 * 回调引用，插件失活时宿主也能自行回收。单个插件最多 8 个订阅。
 *
 * 上下文：tool / panel / block / work
 */
export interface PetCharacter {
  /**
   * @experimental 取当前形象。`states` 指定要哪些姿势（1–8 个，不重复）；
   * 省略则只返回形象标识、不带姿势帧。权限：`character:read`。
   */
  getCurrent(options?: { states?: string[] }): Promise<CharacterSnapshot>;
  /** @experimental 开始订阅，返回订阅 id。权限：`character:watch`。 */
  watch(): Promise<string>;
  /**
   * @experimental 等待该订阅的下一次形象变化；订阅被回收时 resolve 成 `null`。
   * 权限：`character:watch`。
   */
  next(subscriptionId: string): Promise<CharacterRevision | null>;
  /** @experimental 结束订阅。返回是否确实撤销了一个存在的订阅。权限：`character:watch`。 */
  unwatch(subscriptionId: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────
// capabilities —— **无权限门**：查询「某个能力在当前上下文对我是否可用」，
// 本身不授予任何能力。用于插件在调用前自检，而不是靠 try/catch 试错。
// 四上下文（tool / panel / block / work）一致。
// ─────────────────────────────────────────────────────────────

/**
 * @experimental 某个能力对当前调用方的可用状态。
 *
 * - `unsupported` 宿主根本没有这个能力（版本太旧）
 * - `unsupported_context` 宿主有，但当前上下文不开放
 * - `available` 可用
 * - `revoked` 曾授权、已被撤销
 * - `not_authorized` 未授权（manifest 里没声明或用户没同意）
 * - `service_unavailable` 依赖的服务当前不在线
 */
export interface CapabilityStatus {
  status: 'unsupported' | 'unsupported_context' | 'available' | 'revoked' | 'not_authorized' | 'service_unavailable';
  /** 该能力需要的权限名；无权限门的能力不返回此字段。 */
  permission?: string;
  /** 为 true 时还需额外的服务授权（`service:<name>`），仅声明权限不够。 */
  requiresServiceGrant?: boolean;
}

/** @experimental 能力自检。 */
export interface PetCapabilities {
  /**
   * @experimental 查询某个 SDK 方法当前是否可用，如 `'character.getCurrent'`。
   * 只读，不触发授权弹窗，也不改变任何授权状态。
   */
  query(capability: string): Promise<CapabilityStatus>;
}

// ─────────────────────────────────────────────────────────────
// settings —— **无权限门**（读的是插件自己 manifest 声明的 settings 字段值，
// 不涉及宿主配置；「读自己的东西不需要授权」是有意设计，不是疏漏）。
// ─────────────────────────────────────────────────────────────

/**
 * 读本插件在设置页被用户填写的字段值。
 * 字段由 manifest 的 `entry.settings.fields` 声明。
 *
 * 权限：无
 * 上下文：tool / panel / dashboard-card
 */
export interface PetSettings {
  get(): Promise<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────
// ai —— 权限：`ai`。B 档：prompt 与返回值可依赖，**options 不承诺**。
// ─────────────────────────────────────────────────────────────

/**
 * @experimental {@link PetAi.chat} 的可选项。**本对象不承诺稳定**——目前只有
 * `workspacePaths`，且它依赖 `files` 的授权路径体系（整组 experimental）。
 */
export interface AiChatOptions {
  /**
   * 本轮调用要挂载的只读工作区绝对路径。逐条校验必须落在用户已授权给本插件的
   * 目录内（越权路径静默丢弃），上限 20 条。
   */
  workspacePaths?: string[];
}

/**
 * 借用宿主已配置的 AI 能力。
 *
 * 宿主策略（会随版本调整，属可观测行为而非契约）：prompt 上限 4000 字；
 * 每插件 60s 窗口最多 10 次。
 *
 * 权限：`ai`（@experimental）
 * 上下文：tool / panel / dashboard-card
 */
export interface PetAi {
  /**
   * @experimental `prompt` 与返回的字符串这一层可依赖；`options` 可能在任一
   * apiVersion 变更，不走废弃流程。
   */
  chat(prompt: string, options?: AiChatOptions): Promise<string>;
}

// ─────────────────────────────────────────────────────────────
// files —— 权限：`files` + 逐路径授权。**整组 @experimental**：权限粒度将来一定要
// 细分（读 / 写元数据 / 唤起系统能力现在混在一档），授权路径模型仍在演进。
// 上下文：tool / panel（dashboard-card 无——区块小卡片不该唤起系统文件选择器）。
// ─────────────────────────────────────────────────────────────

/** @experimental {@link PetFiles.list} 的回传。 */
export interface FilesListResult {
  /** 用户已授权给本插件的绝对路径。 */
  authorized: string[];
  /** 其中被声明为「主对话自动挂载」的常驻工作区。 */
  pinned: Array<{ path: string; hint: string }>;
}

/** @experimental {@link PetFiles.stat} 的回传。路径不存在时各字段为假值而非抛错。 */
export interface FileStatResult {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtimeMs: number;
}

/**
 * 本地资料访问（只读语义）。**整组 @experimental**。
 *
 * 授权模型：插件不能自报路径，只有用户经 {@link PetFiles.pick} 亲手选中的路径才
 * 进入授权集；其余方法都要求路径已获授权且为绝对路径。
 *
 * 权限：`files`（@experimental）
 * 上下文：tool / panel
 */
export interface PetFiles {
  /** @experimental 唤起宿主系统文件选择器，返回用户选中的绝对路径。`options` 字段未定型。 */
  pick(options?: Record<string, unknown>): Promise<string[]>;
  /** @experimental 列出已授权与已常驻的路径。返回结构随授权模型演进。 */
  list(): Promise<FilesListResult>;
  /** @experimental 读路径元信息。要求绝对路径且已获授权。 */
  stat(path: string): Promise<FileStatResult>;
  /** @experimental 用系统默认程序打开。将来可能要求单独权限。 */
  open(path: string): Promise<unknown>;
  /**
   * @experimental **撤销该路径的授权，不删除磁盘上的文件。**
   *
   * 宿主已完成改名（原名 `remove` 语义有歧义，容易被读成删文件）。
   */
  revoke(path: string): Promise<true>;
  /** @experimental 把某个已授权的根路径声明为主对话自动挂载，附一句用途 hint（≤300 字）。 */
  pin(path: string, options?: { hint?: string }): Promise<true>;
  /** @experimental 取消常驻。 */
  unpin(path: string): Promise<true>;
}

// ─────────────────────────────────────────────────────────────
// friends —— 权限：`friends`。三上下文一致，A 档。**只读**：插件不能改好友关系，
// 这条只读性本身写进契约。
// ─────────────────────────────────────────────────────────────

/** 好友条目。宿主可能加字段（加字段不破坏契约）。 */
export interface Friend {
  /**
   * 账号级 UID（TULI-UID 的数字本体，字符串形式）——**好友关系的主键**。
   *
   * 存量好友在对端登录并完成迁移前为空串 `''`，此时回落 {@link Friend.petId}。
   * 取寻址键的惯用写法：`const key = f.uid || f.petId`。
   */
  uid?: string;
  /**
   * 设备级标识。
   *
   * @deprecated 自宿主 v4 起降级为埋点设备指纹，**不再是好友主键**，
   * 也不再是中转寻址依据。新代码请用 {@link Friend.uid}；此字段仅供
   * 灰度期回落与存量数据兼容，未来可能移除。
   */
  petId: string;
  nickname: string;
  /** 加为好友的时间戳（ms）。 */
  addedAt?: number;
}

/** {@link PetFriends.me} 的回传。 */
export interface MeInfo {
  /**
   * 本机账号 UID（对外身份主键）。**未登录时为空串** `''`——
   * 游客态下桌宠仍可用局域网功能，插件需自行处理这种情况。
   */
  uid: string;
  /**
   * 本机设备标识。
   *
   * @deprecated 同 {@link Friend.petId}：v4 起仅为埋点设备指纹，不再是身份主键。
   */
  petId: string;
  nickname: string;
}

/** {@link PetFriends.avatar} 的回传。读不到头像时 `dataUrl` 为 `null`。 */
export interface AvatarInfo {
  key: string;
  dataUrl: string | null;
}

/**
 * 只读好友图。
 *
 * 权限：`friends`
 * 上下文：tool / panel / dashboard-card
 */
export interface PetFriends {
  /**
   * 本机身份。`uid` 是账号主键与中转寻址依据；未登录时 `uid` 为空串。
   *
   * @example
   * const me = await pet.friends.me();
   * const myKey = me.uid || me.petId;   // 登录用 UID，游客回落 petId
   */
  me(): Promise<MeInfo>;
  list(): Promise<Friend[]>;
  /**
   * 判断是否好友。`key` 接受账号 UID 或存量 petId——
   * 灰度期两种键并存，宿主统一判定。
   */
  isFriend(key: string): Promise<boolean>;
  /** 本机桌宠头像（用户上传的，或当前角色 idle 首帧）。 */
  avatar(): Promise<AvatarInfo>;
}

// ─────────────────────────────────────────────────────────────
// activity —— 权限：`activity`。**整组 @experimental**：方法名与调用形态
// （无参、返回对象）可依赖，**返回对象的字段不承诺**——故意用 `unknown` 而不是
// 编造一个假装精确的 interface。
// ─────────────────────────────────────────────────────────────

/**
 * 宿主活动上下文快照。**整组 @experimental**。
 *
 * 权限：`activity`（@experimental）
 * 上下文：tool / panel / dashboard-card
 */
export interface PetActivity {
  /**
   * @experimental 最近一次活动上下文。返回结构由宿主内部状态决定、未在任何文档
   * 定义过，请运行时探测后再用，不要按固定形状解构。
   */
  getLatest(): Promise<unknown>;
  /**
   * @experimental 连接信息。字段随宿主连接形式演进（中转双轨落地后必变）。
   */
  connectionInfo(): Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────
// dashboard —— 权限：`dashboard`。上下文：tool / dashboard-card（panel 无，有意）。
// ─────────────────────────────────────────────────────────────

/**
 * 看板区块与宿主 dashboard 的协商通道。
 *
 * 权限：`dashboard`
 * 上下文：tool / dashboard-card（panel 上不存在，属有意设计）
 */
export interface PetDashboard {
  /** 请求把本区块 iframe 的高度调到 `px`。 */
  requestHeight(px: number): Promise<boolean>;
  /** 通知宿主本区块已渲染就绪。 */
  notifyReady(): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────
// tools —— 注册类，**仅 tool**（需要常驻 handler，渲染层窗口关闭即消失）。
// ─────────────────────────────────────────────────────────────

/** {@link PetTools.register} 的入参。 */
export interface ToolSpec {
  /** 工具名，会出现在宿主 Agent 的工具列表里。 */
  name: string;
  /** JSON Schema 子集，描述 handler 的入参形状（由 LLM tool-calling 约定）。 */
  schema: unknown;
  /** 宿主调用工具时执行。返回值会被 JSON 序列化送回 Agent。 */
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  /** 可选：给模型的额外提示，说明何时该用这个工具。 */
  promptHint?: string;
}

/**
 * 把能力注册为宿主 Agent 可调用的工具。工具插件的立身之本。
 *
 * 权限：`tools`
 * 上下文：**仅 tool**
 */
export interface PetTools {
  register(tool: ToolSpec): void;
}

// ─────────────────────────────────────────────────────────────
// calendar —— 注册类，**仅 tool**，B 档：Provider 接口只有一个实现，
// 未经第二个数据源检验，方法将来大概率增删。
// ─────────────────────────────────────────────────────────────

/** @experimental 日历 Provider 规格。`queryEvents` 必填，其余可选。 */
export interface CalendarProviderSpec {
  /** Provider 标识。 */
  id?: string;
  name?: string;
  /** 查询某时间窗内的日程。 */
  queryEvents: (range: { startMs: number; endMs: number }) => Promise<unknown[]>;
  /** 可选：报告当前连接/授权状态。 */
  getConnectionState?: () => Promise<unknown>;
  /** 可选：创建日程。 */
  createEvent?: (event: Record<string, unknown>) => Promise<unknown>;
}

/**
 * @experimental 注册日历数据源。整个 Provider 接口可能在任一 apiVersion 变更，
 * 不走废弃流程。
 *
 * 权限：`calendar-provider`（@experimental）
 * 上下文：**仅 tool**
 */
export interface PetCalendar {
  /**
   * @experimental 注册日历数据源。签名/语义可能在任一 apiVersion 变更，不走废弃流程。
   *
   * 权限：`calendar-provider`（@experimental）
   * 上下文：**仅 tool**（handler 需长驻，渲染层窗口一关即失活）
   */
  registerProvider(spec: CalendarProviderSpec): void;
}

// ─────────────────────────────────────────────────────────────
// SDK 根对象：按上下文的三个精确视图 + 一个并集视图
// ─────────────────────────────────────────────────────────────

/** 三上下文共有的命名空间。 */
export interface PetCommon {
  storage: PetStorage;
  pet: PetSurface;
  events: PetEvents;
  services: PetServices;
  settings: PetSettings;
  friends: PetFriends;
  /** @experimental 返回结构不承诺 */
  activity: PetActivity;
  /** @experimental options 不承诺 */
  ai: PetAi;
  /** @experimental 读取/订阅宿主当前角色形象；签名与语义可能在任一 apiVersion 变更 */
  character: PetCharacter;
  /** @experimental 能力自检，本身不授予能力 */
  capabilities: PetCapabilities;
}

/**
 * `tool` 上下文（utilityProcess 子进程）看到的 SDK。能力最全。
 *
 * ```ts
 * import type { ActivateFn, PetTool } from '@pet/plugin-types';
 * export const activate: ActivateFn<PetTool> = async (pet) => {
 *   pet.tools.register({ name: 'hello', schema: {}, handler: () => 'hi' });
 * };
 * ```
 */
export interface PetTool extends PetCommon {
  /** @experimental Only this asset plugin's appearance; requires appearance permission. */
  appearance: PetAppearance;
  /** @experimental Account delegation is available only to tools with a registered service grant. */
  account: PetAccount;
  secrets: PetSecrets;
  ui: Omit<PetUi, 'injectStyle'>;
  badge: PetBadge;
  clipboard: PetClipboard;
  errands: PetErrands;
  scheduler: PetScheduler;
  net: PetNet;
  tools: PetTools;
  dashboard: PetDashboard;
  /** @experimental 整组不承诺 */
  files: PetFiles;
  /** @experimental Provider 接口不承诺 */
  calendar: PetCalendar;
}

/**
 * `panel` 上下文（插件 panel 窗口）看到的 SDK。
 *
 * 相对 tool 少了：`secrets`（渲染层读密钥 = XSS 等于泄漏）、`scheduler`、`net`
 * （用原生 `fetch`）、`tools`/`calendar`（渲染层不能持有常驻 handler）、`dashboard`。
 * `ui.openPanel` 在此不可用。
 */
export interface PetPanel extends PetCommon {
  /**
   * @experimental Only this asset plugin's appearance; requires appearance permission.
   * 不含 `refresh`：重读素材要改宿主进程内的角色注册表，属常驻 tool 的职责，
   * 渲染层窗口关闭即失活不应持有（宿主对 panel 调用直接拒 `unsupported_context`）。
   */
  appearance: Omit<PetAppearance, 'refresh'>;
  ui: Omit<PetUi, 'openPanel' | 'injectStyle'>;
  clipboard: Omit<PetClipboard, 'startHistory' | 'stopHistory'>;
  errands: PetErrands;
  /** @experimental 整组不承诺 */
  files: PetFiles;
}

/** @experimental Safe local account snapshot; uid is an identifier, not authentication. */
export interface PluginAccountState {
  signedIn: boolean;
  uid: string;
  /** Changes on login/logout/session replacement; stable during normal token refresh. */
  revision: string;
}

/** @experimental Short-lived, single-use proof for one registered service and PKCE challenge. */
export interface PluginAccountAuthorization {
  code: string;
  expiresIn: number;
  revision: string;
}

export interface PetAccount {
  /** @experimental Requires account:authorize:<serviceId>; never returns host tokens. */
  getState(options: { serviceId: string }): Promise<PluginAccountState>;
  /** @experimental S256 PKCE required. Errors are stable codes in Error.message. */
  authorize(options: { serviceId: string; challengeId: string; codeChallenge: string }): Promise<PluginAccountAuthorization>;
}

/**
 * `dashboard-card` 上下文（看板区块 iframe）看到的 SDK。最受限。
 *
 * 相对 panel 再少：`files`（区块不该唤起系统文件选择器）、`ui.closePanel`
 * （区块不是 panel 窗口）；多出 `dashboard` 与 `context` 常量。
 */
export interface PetBlock extends PetCommon {
  ui: Omit<PetUi, 'openPanel' | 'closePanel' | 'setPanelPinned' | 'injectStyle'>;
  dashboard: PetDashboard;
  /** 区块自我标识，让同一份代码判断自己跑在哪种形态里。 */
  context: 'dashboard-block';
}

/**
 * 三上下文的并集视图：共有成员必选，**上下文限定的成员标为可选**。
 *
 * 写只跑在单一上下文的插件时，用 {@link PetTool} / {@link PetPanel} /
 * {@link PetBlock} 能拿到更精确的类型；写跨上下文共享的代码时用本类型，
 * 可选成员会强制你先做存在性判断。
 */
export interface Pet extends PetCommon {
  /** @experimental tool/panel only. */
  appearance?: PetAppearance;
  ui: Omit<PetUi, 'openPanel' | 'closePanel' | 'setPanelPinned' | 'injectStyle'>
    & Partial<Pick<PetUi, 'openPanel' | 'closePanel' | 'setPanelPinned'>>;
  /** @experimental 仅 tool。 */
  badge?: PetBadge;
  /** @experimental tool/panel；轮询方法仅 tool。 */
  clipboard?: Omit<PetClipboard, 'startHistory' | 'stopHistory'>
    & Partial<Pick<PetClipboard, 'startHistory' | 'stopHistory'>>;
  /** @experimental tool/panel。 */
  errands?: PetErrands;
  /** 仅 tool 上下文 */
  secrets?: PetSecrets;
  /** 仅 tool 上下文 */
  scheduler?: PetScheduler;
  /** 仅 tool 上下文 */
  net?: PetNet;
  /** 仅 tool 上下文 */
  tools?: PetTools;
  /** 仅 tool / dashboard-card 上下文 */
  dashboard?: PetDashboard;
  /** @experimental 仅 tool 上下文 */
  calendar?: PetCalendar;
  /** @experimental 仅 tool / panel 上下文 */
  files?: PetFiles;
  /** 仅 dashboard-card 上下文 */
  context?: 'dashboard-block';
}

/**
 * 插件入口导出的激活函数。
 *
 * @typeParam T SDK 视图类型，默认并集视图 {@link Pet}。按上下文传
 * {@link PetTool} / {@link PetPanel} / {@link PetBlock} 可拿到精确可用面。
 */
export type ActivateFn<T = Pet> = (pet: T) => void | Promise<void>;

/** 插件入口可选导出的停用钩子。插件被停用或卸载前调用。 */
export type DeactivateFn = () => void | Promise<void>;

/** @experimental Display-only snapshot. No host configuration, paths or memories. */
export interface AppearanceState {
  companion: { key: string; name: string };
  current: { key: string; name: string; isDefault: boolean; ownedByCaller: boolean };
  own: { key: string; name: string };
  canRestore: boolean;
}

/** @experimental tool/panel; active asset plugin with appearance permission only. */
export interface PetAppearance {
  /** @experimental Read current state; refresh while the panel is open. */
  getState(): Promise<AppearanceState>;
  /** @experimental Persist this plugin's own appearance for the current companion. Identity is unchanged. */
  apply(): Promise<AppearanceState>;
  /** @experimental Restore the companion's original appearance only while this plugin owns it. Otherwise no-op. */
  reset(): Promise<AppearanceState>;
  /**
   * @experimental Re-read this plugin's own appearance assets from disk and return the refreshed state.
   *
   * 只对 `kind` 含 `asset` 且持有自身形象的插件有效，否则 reject `appearance_unavailable`。
   * 仅 `tool` 上下文可用（panel 调用 reject `unsupported_context`）：重读素材要改宿主
   * 进程内的角色注册表，属常驻进程职责，渲染层窗口关闭即失活不应持有。
   */
  refresh(): Promise<AppearanceState>;
}
