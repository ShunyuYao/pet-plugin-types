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
 * | C 不开放 | 不在本文件中 | 运行时可能仍有实现（内置插件在用），但不作为对外契约，第三方不得依赖 |
 *
 * 本文件当前对应 `apiVersion: 1`（见 package.json 的 `petSdk`）。
 * A 档共 30 条、B 档 12 条；C 档（`ui.injectStyle`、`pet.meetingCard`、
 * `services.provide`、`auth.openAuthWindow`、`pet.host.*`）**已从本文件删除**。
 *
 * ## 返回值一律是 Promise
 *
 * 宿主内部有两条实现路径：内置插件在主进程内直调（同步返回），第三方插件经 RPC/IPC
 * 往返（Promise）。**契约面统一声明为 `Promise<T>`**——`await` 在两种形态下都正确。
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
  /** 读一条凭据；不存在返回 `undefined`。 */
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// pet —— 权限：`pet`。三上下文一致。
// ─────────────────────────────────────────────────────────────

/**
 * 宠物表现通道。返回 `false` 表示宠物窗当前不存在（不是错误）。
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
  /** TTS 朗读一句话。 */
  speak(text: string): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────
// ui —— 权限：`ui`。4 冻结 + 1 实验；`ui.injectStyle`（权限 `ui:theme`）判 C 档，
// 已从本契约删除（主题将改为语义 Token 覆写，不再是裸 CSS 注入）。
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
  action: 'ok' | 'cancel';
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
   * 名字有歧义，将来大概率改名 `revoke`——这正是它不能进冻结集的原因。
   */
  remove(path: string): Promise<true>;
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
  /** 全平台寻址标识。 */
  petId: string;
  nickname: string;
  /** 加为好友的时间戳（ms）。 */
  addedAt?: number;
}

/** {@link PetFriends.me} 的回传。 */
export interface MeInfo {
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
  /** 本机身份。`petId` 是中转寻址的唯一依据。 */
  me(): Promise<MeInfo>;
  list(): Promise<Friend[]>;
  isFriend(petId: string): Promise<boolean>;
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
  secrets: PetSecrets;
  ui: PetUi;
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
  ui: Omit<PetUi, 'openPanel'>;
  /** @experimental 整组不承诺 */
  files: PetFiles;
}

/**
 * `dashboard-card` 上下文（看板区块 iframe）看到的 SDK。最受限。
 *
 * 相对 panel 再少：`files`（区块不该唤起系统文件选择器）、`ui.closePanel`
 * （区块不是 panel 窗口）；多出 `dashboard` 与 `context` 常量。
 */
export interface PetBlock extends PetCommon {
  ui: Omit<PetUi, 'openPanel' | 'closePanel'>;
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
  ui: PetUi;
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
