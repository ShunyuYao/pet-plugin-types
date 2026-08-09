/**
 * @pet/plugin-types — 桌宠（吐梨邦）插件 SDK 类型定义
 *
 * ⚠️ **当前状态：全部 @experimental，契约尚未冻结。**
 *
 * 本包的目标是成为 SDK 的唯一权威 surface 文档，但那要等宿主完成 surface 终审
 * （宿主仓库 US-PP07 → US-PP08）之后才成立。在冻结结论落地前，这里的定义
 * 反映的是宿主 runtime.js sdkCall 表的**现状**，随时可能变，不构成兼容性承诺。
 *
 * 冻结完成后，本文件会按结论重写：进冻结集的方法去掉 @experimental，
 * 不开放的方法删除，并在 package.json 标注对应 apiVersion。
 */

export * from './manifest';

// ─────────────────────────────────────────────────────────────
// 以下均为 @experimental —— 冻结前不要依赖其稳定性
// ─────────────────────────────────────────────────────────────

/** @experimental 插件私有键值存储（明文，非敏感数据用） */
export interface PetStorage {
  get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  all(): Promise<Record<string, unknown>>;
}

/**
 * @experimental 加密凭据仓。
 * token / 密码等一律走这里——开发者政策禁止明文落盘。
 */
export interface PetSecrets {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** @experimental 宠物表现通道（气泡/动画/朗读/会议卡） */
export interface PetSurface {
  bubble(text: string, ms?: number): Promise<boolean>;
  playAnim(state: string): Promise<boolean>;
  speak(text: string): Promise<boolean>;
  meetingCard(card: {
    title: string;
    timeText: string;
    eventId: string;
    minsAhead?: number;
  }): Promise<boolean>;
}

/** @experimental 工具注册：把能力暴露给宿主 Agent 调用 */
export interface PetTools {
  register(tool: {
    name: string;
    schema: unknown;
    handler: (args: Record<string, unknown>) => unknown | Promise<unknown>;
    promptHint?: string;
  }): void;
}

/**
 * @experimental SDK 根对象，插件入口收到的参数。
 *
 * 注意：各命名空间在不同上下文（tool / panel / dashboard-card）下的可用性**不一致**，
 * 这是宿主三份桥的历史差异，正由 US-PP08 统一。能力矩阵以宿主
 * `docs/plugin-sdk-freeze-review.md` 为准。
 */
export interface Pet {
  storage: PetStorage;
  secrets: PetSecrets;
  pet: PetSurface;
  /** 仅 tool 上下文可用 */
  tools?: PetTools;
  /**
   * 其余命名空间（ui / events / scheduler / net / services / settings /
   * ai / files / friends / activity / dashboard）的签名待终审后补全。
   */
  [namespace: string]: unknown;
}

/** @experimental 插件入口导出的激活函数 */
export type ActivateFn = (pet: Pet) => void | Promise<void>;
