# @pet/plugin-types

桌宠（吐梨邦）插件 SDK 的 TypeScript 类型定义。

> ## 本包是 SDK surface 的**唯一权威文档**
>
> 类型与宿主 `demo/core/plugin-runtime/sdk-surface.js` 的定义表逐条对应；分档依据是宿主
> `docs/plugin-sdk-freeze-review.md`（冻结方案决定版）。两者不一致时以宿主仓库为准，
> 本包按 bug 处理。

**当前 `apiVersion: 1`。** A 档 30 个方法已冻结，B 档 30 个标 `@experimental`。


## ⚠️ v4 破坏性变更：好友主键从 petId 改为账号 UID

宿主 v4 起，对外身份主键是**账号级 TULI-UID**，`petId` 降级为埋点设备指纹。
方法签名没变，变的是值：

| | 变更 |
|---|---|
| `me()` | 新增 `uid`（未登录为 `''`）；`petId` 仍返回但已 `@deprecated` |
| `list()` | 每项新增 `uid`；存量未迁移的好友为 `''` |
| `isFriend(key)` | `key` 现在接受 UID 或 petId，灰度期两种键并存 |

**插件迁移写法**（一行搞定，同时兼容登录态与游客态）：

```ts
const me = await pet.friends.me();
const myKey = me.uid || me.petId;               // 登录用 UID，游客回落 petId

const friends = await pet.friends.list();
const keys = friends.map(f => f.uid || f.petId);
```

**为什么改**：`petId` 是本机随机生成的，换电脑/重装就变，且一人多设备会变成多个身份——
拿它当好友主键，用户换台机器好友就全丢了。UID 跟账号走，跨设备稳定。

存量好友关系不需要插件做任何事：宿主会在双方登录后随好友信令自动补上 `uid`，
迁移完成前 `uid` 为空串，按上面的回落写法即可平滑过渡。


## 三档承诺

| 档位 | 标记 | 承诺 |
|---|---|---|
| **A 冻结** | 无标记 | 同一 `apiVersion` 内**只加不改不删**；废弃需先标 deprecated 并保留 ≥2 个宿主版本 |
| **B 实验** | `@experimental` | 可用，但**签名/语义可能在任一 apiVersion 变更，且不走废弃流程** |
| **C 不开放** | 不在公开根对象中 | 运行时可能仍有实现（内置插件在用），但不作为对外契约，第三方不得依赖 |

B 档方法的变更**不**强制升 `apiVersion`（这正是 `@experimental` 的含义）；A 档方法的
语义变更必须升。

公开 SDK 根对象排除的 C 档能力：`ui.injectStyle`（主题将改为语义 Token 覆写，不再是裸 CSS 注入）、
`pet.meetingCard`（将被声明式聊天卡片 API 泛化）、`services.provide`（当前仅内置插件可用）、
`auth.openAuthWindow` 与 `pet.host.*`（内置特权面，属后续降权对象）。

## 返回值与注册方法

内置和外部 tool 均经 RPC，panel/block 经 IPC；普通调用返回 `Promise<T>`。
桥内注册方法 `events.on`、`tools.register`、`calendar.registerProvider` 返回 `void`。

## 不发 npm

本包**暂不发布到 npm**，本轮也没有执行 npm 发布。源码中的 `1.0.0-rc.5` 是仓库包版本号，不表示 npm 上已有包含新增外观和动作 API 的同版本产物。新增类型随主分支源码提供；使用 git 依赖并刷新锁文件后，核对实际解析到的提交：

No npm package is published by this delivery. The source version `1.0.0-rc.5` does not identify an npm artifact containing these new APIs. Consume the Git main branch and verify the commit resolved by your lockfile:

```json
{
  "devDependencies": {
    "@pet/plugin-types": "github:ShunyuYao/pet-plugin-types"
  }
}
```

## 用法

按上下文选精确类型，能拿到该上下文真实可用的命名空间：

```ts
import type { ActivateFn, PetTool } from '@pet/plugin-types';

export const activate: ActivateFn<PetTool> = async (pet) => {
  await pet.storage.set('installedAt', Date.now());
  await pet.pet.bubble('你好，我是新插件');

  pet.tools.register({
    name: 'say_hello',
    schema: { type: 'object', properties: { who: { type: 'string' } } },
    handler: ({ who }) => `你好，${who}`,
  });
};
```

写跨上下文共享的代码时用并集视图 `Pet`——上下文限定的成员是可选的，会强制你先判存在：

```ts
import type { ActivateFn } from '@pet/plugin-types';

export const activate: ActivateFn = async (pet) => {
  await pet.pet.bubble('三种上下文都能这么写');
  pet.tools?.register({ /* … */ });   // 仅 tool 上下文有
};
```

## 内容

| 文件 | 内容 |
|---|---|
| `manifest.d.ts` | `manifest.json` 的类型，与宿主 `manifest.js` 校验规则一一对应（含 `apiVersion`、权限字面量联合） |
| `index.d.ts` | `pet.*` SDK 全部 A/B 档方法的签名、返回类型与权限标注 |

### manifest 的条件校验会在编译期生效

宿主 `loadManifest` 的四条条件规则已建模进类型，用 `definePluginManifest`
（或 `satisfies PluginManifest<...>`）构造 manifest 时，写错在编译期就报错，
不用等到装进宿主才发现：

```ts
import { definePluginManifest } from '@pet/plugin-types/manifest';

// ✅ kind 含 tool，entry.tool 已给
definePluginManifest({
  id: 'demo', name: '示例', version: '1.0.0', apiVersion: 1,
  kind: ['tool'], entry: { tool: 'tool.js' },
});

// ❌ 编译期报错：Property 'tool' is missing —— 宿主会抛「kind 含 tool 时 entry.tool 必填」
definePluginManifest({
  id: 'demo', name: '示例', version: '1.0.0', kind: ['tool'], entry: {},
});
```

被建模的四条：`kind` 含 `tool`/`panel`/`dashboard-card` 时对应 `entry` 必填，
含 `service` 时 `provides.service` 必填。另外 `entry.skills` 是**单个路径字符串**
（宿主直接拿去 `path.join`，传数组会抛 `TypeError`），类型里不接受 `string[]`。

### 判空要用 `null`

`secrets.get(key)` 未命中时返回 **`null`**（宿主 `SecretStore.get()` 的四条 miss
路径——键不存在、safeStorage 不可用、解密失败、`plain:` 回退未放行——全部
`return null`）。写 `=== undefined` 判空会漏。

## 三上下文能力矩阵

插件代码可能跑在三种上下文里，可用的命名空间**不一致**。下表差异**全部是有意设计**，
不是漏做：

<!-- sdk-surface:start -->
| 命名空间 | 方法 | tool | panel | dashboard-card |
|---|---|:--:|:--:|:--:|
| `appearance` | `getState` | B | B | — |
| `appearance` | `apply` | B | B | — |
| `appearance` | `reset` | B | B | — |
| `account` | `getState` | B | — | — |
| `account` | `authorize` | B | — | — |
| `storage` | `get` | A | A | A |
| `storage` | `set` | A | A | A |
| `storage` | `delete` | A | A | A |
| `storage` | `all` | A | A | A |
| `secrets` | `get` | A | — | — |
| `secrets` | `set` | A | — | — |
| `secrets` | `delete` | A | — | — |
| `pet` | `bubble` | A | A | A |
| `pet` | `playAnim` | A | A | A |
| `pet` | `getAnimations` | B | B | B |
| `pet` | `speak` | A | A | A |
| `badge` | `set` | B | — | — |
| `badge` | `clear` | B | — | — |
| `ui` | `dialog` | A | A | A |
| `ui` | `taskCheck` | B | B | B |
| `ui` | `copyText` | A | A | A |
| `ui` | `openPanel` | A | — | — |
| `ui` | `closePanel` | A | A | — |
| `ui` | `setPanelPinned` | B | B | — |
| `events` | `on` | A | A | A |
| `events` | `emit` | A | A | A |
| `scheduler` | `every` | A | — | — |
| `scheduler` | `daily` | A | — | — |
| `scheduler` | `cancel` | A | — | — |
| `net` | `fetch` | A | — | — |
| `services` | `get` | A | A | A |
| `settings` | `get` | A | A | A |
| `ai` | `chat` | B | B | B |
| `files` | `pick` | B | B | — |
| `files` | `stat` | B | B | — |
| `files` | `open` | B | B | — |
| `files` | `list` | B | B | — |
| `files` | `revoke` | B | B | — |
| `files` | `pin` | B | B | — |
| `files` | `unpin` | B | B | — |
| `clipboard` | `startHistory` | B | — | — |
| `clipboard` | `stopHistory` | B | — | — |
| `clipboard` | `query` | B | B | — |
| `clipboard` | `read` | B | B | — |
| `clipboard` | `copy` | B | B | — |
| `clipboard` | `markReferenced` | B | B | — |
| `clipboard` | `remove` | B | B | — |
| `clipboard` | `clearHistory` | B | B | — |
| `errands` | `composeFile` | B | B | — |
| `friends` | `me` | A | A | A |
| `friends` | `list` | A | A | A |
| `friends` | `isFriend` | A | A | A |
| `friends` | `avatar` | A | A | A |
| `activity` | `getLatest` | B | B | B |
| `activity` | `connectionInfo` | B | B | B |
| `dashboard` | `requestHeight` | A | — | A |
| `dashboard` | `notifyReady` | A | — | A |
| `tools` | `register` | A | — | — |
| `calendar` | `registerProvider` | B | — | — |
| `(root)` | `context` | — | — | A |
<!-- sdk-surface:end -->

裁剪理由（一句话版）：

- **`secrets` 只给 tool**：panel 与 dashboard-card 是渲染层，把密钥读进渲染进程会让 XSS
  直接等于密钥泄漏。
- **`scheduler` 只给 tool**：渲染层窗口关掉即失活，定时器该由常驻子进程持有；渲染层要定时
  用原生 `setInterval` 就行（生命周期与窗口一致才是对的）。
- **`net.fetch` 只给 tool**：渲染层可直接用原生 `fetch`，受 panel CSP 约束。SDK 的
  `net.fetch` 存在意义是给**没有 CSP 可依赖的子进程**做逐域名门控。
- **`tools`/`calendar` 只给 tool**：注册需要常驻 handler，渲染层窗口关闭即消失。
- **`ui.openPanel` 只给 tool**：panel 自己调是重复打开、区块调是越权拉窗。
- **`ui.closePanel` 无 dashboard-card**：区块不是 panel 窗口。
- **`files` 无 dashboard-card**：区块是嵌在看板里的小卡片，唤起系统文件选择器不合其形态。
- **`dashboard` 无 panel**：区块高度协商对 panel 窗口无意义。

## 权限声明要点

- **联网必须逐域名声明**：`"permissions": ["net:api.example.com"]`，不存在宽泛的 `net`。
  这既是技术门（宿主按 hostname 校验），也是审核对照与用户知情告知的依据。
- **消费服务**写在 `services` 数组里，宿主自动展开成 `service:<name>` 参与授权。
- **`settings.get` 无需权限**：读的是插件自己 manifest 声明的字段值，不涉及宿主配置。
  「读自己的东西不需要授权」是有意设计，不是疏漏。
- `ui:theme` 在未发布的纯数据主题包中成为实验权限；`ui.injectStyle` 方法仍不开放。C 档 `auth-window` 不在类型联合中。

## 旁加载风险提示

从本地文件夹直接安装的插件（旁加载）**不经任何审核**。这类插件拥有插件系统的完全访问权限，
可以读写你电脑上的文件、联网、执行程序。**只安装你完全信任的来源。**

宿主已把旁加载入口放在「开发者模式」开关之后，开启开关与每次安装前都会再次告知风险。

## 本轮同步与兼容

对应宿主 GitHub main `e6d8fa86505d5a3eb79ffaaa1abf46656d6a1e66`（0.19.1 源码）。
`apiVersion` 保持 1；补齐实验能力不表示旧宿主已经提供这些方法。

- `badge.set/clear` 仅 tool，权限 `pet`；点击打开面板还需 `ui` 与 panel 入口。
  段数 1–2，每段最多 4 个 Unicode 码点，点击只支持 `openPanel`，无任意事件回调。
  徽标支持以宿主 0.19.1 为基线；0.19.0 发布构建不包含该能力。
- `ui.setPanelPinned` 仅 tool/panel；`clipboard` 的轮询启停仅 tool，其余历史操作供 tool/panel；
  `errands.composeFile` 供 tool/panel，由用户在宿主卡片里选择好友并发送。
- 剪贴板历史必须声明 `clipboard`；文件派送必须声明 `errands`，图片历史来源另需 `clipboard`。
- `PetUi.injectStyle` 只保留旧接口声明兼容，标为 internal/deprecated；公开根对象均不可访问。
- `manifest.activation: 'opt-in'` 是插件启用策略，**不是更新开关**。本次没有新增更新接口或更新参与字段。
- 依赖新能力时声明实际最低宿主版本；可降级的功能先检查成员是否存在，再调用。

## 验证与交付门禁

安装开发依赖后：

```sh
npm ci
npm test
PET_PLUGIN_HOST_DIR=/path/to/desktop-pet/demo npm run test:delivery
```

`npm test` 是离线编译正反例，验证合法调用与非法上下文/参数。
`test:delivery` 必须提供本地宿主源码，完整比对三种上下文的公开方法、参数数量、实验标记、
包内计数和本 README 表格，并用真实宿主校验 manifest。宿主缺失直接失败，**不会 SKIP**。
网络准备与离线门禁分开；交付时先固定并记录宿主提交，再运行测试。

同步脚手架文档也必须对账：

```sh
PET_PLUGIN_HOST_DIR=/path/to/desktop-pet/demo npm run test:host -- --readme /path/to/create-pet-plugin/README.md
```

这道门禁位于公开类型仓库。宿主旧的可选对账仍可能 SKIP，不能代替此交付检查。
方法数量和参数数量检查不替代语义/返回值测试；新能力同时要有类型正反例与宿主行为证据。

## 相关

- 插件市场登记表：[pet-plugin-registry](https://github.com/ShunyuYao/pet-plugin-registry)
- 脚手架：[create-pet-plugin](https://github.com/ShunyuYao/create-pet-plugin)

## 插件选择参与新版提醒（实验，宿主开发中）

在 manifest 中显式声明 `"updateReminders": true`，允许宿主登录后检查并提示新版。
缺省或 false 都关闭，现有插件不会因宿主升级被自动开启。三种模板均默认 false。
权威来自本机已安装 manifest；市场条目或远端新版的声明不能替旧版开启。

true 只允许自动检查和提醒，**每次下载、安装仍需用户在宿主弹窗点击更新**。
取消、关闭、超时不下载；关闭参与不影响已有手动市场更新入口。
登录范围为恢复已有登录及手动登录成功，等待引导结束；游客不主动提醒。
同插件同目标版本 24 小时最多提醒一次，冷却在重启后保留。
首期没有运行时设置接口，也不向插件开放自行安装或绕过确认的方法。

这是可选的向前兼容字段，`apiVersion` 仍为 1；旧宿主忽略提醒声明。
宿主实现尚未发版，请以包含此功能的实际宿主构建为准，不能仅根据本包版本判断可用。


## Account delegation / 插件账号授权（实验，未发布）

`pet.account.getState({serviceId})` 与 `pet.account.authorize({serviceId,challengeId,codeChallenge})` 仅 tool 可用，需 `account:authorize:<serviceId>` 权限，且该服务已在宿主与账号服务登记。新方法未包含在已发布宿主中；请探测能力并明确提示暂不可用，不能仅凭 apiVersion 1 推断支持，也不要虚填 minHostVersion。基础模板不自动申请这项权限。

`getState` 返回本机 `signedIn / uid / revision`，UID 不是认证凭据。`authorize` 返回 60 秒内有效的一次性 `code / expiresIn / revision`；每次生成新的随机 PKCE verifier，并传 S256 挑战。仅目标服务后端可兑换授权码，插件不得读取或获取宿主 access / refresh token。

Games must keep their own session in the tool process and send only display data to panels. Recheck account revision while active and before protected operations. Discard stale responses on account changes or deactivation; preserve editing drafts under their original owner. Normal account-token refresh does not change revision. The service checks the parent account session on each protected operation; grants expire within 10 minutes. Server-confirmed logout invalidates the authorization. An offline logout or failed revocation stops local requests immediately, but an existing server grant may survive until its original expiry, at most 10 minutes.

Errors are returned as `Error.message`: `not_logged_in`, `permission_denied`, `service_unavailable`, `account_changed`, `network`, `invalid_request`, `busy`, `plugin_inactive`, `rate_limited`. Missing service registration fails closed; there is no fallback login or arbitrary authorization URL.

开发交付须同时检查宿主、类型包、脚手架及 registry 的 SDK / 权限政策；类型包与脚手架都运行带实际宿主路径的 `test:delivery`，缺依赖跳过不算通过。Only update registry plugin entries when an actual compatible plugin package is released.

## 插件外观 / Plugin appearance（experimental，主分支已实现）

`pet.appearance.getState()`、`apply()`、`reset()` 仅 tool/panel 可用，要求已激活的 asset 插件声明并获准 `appearance` 权限；面板另需 `ui` 权限和 panel 入口。基础模板不自动申请这些权限。

返回 `companion: {key,name}`、`current: {key,name,isDefault,ownedByCaller}`、`own: {key,name}`、`canRestore`。查询不修改状态；面板打开期间刷新状态并丢弃迟到响应。`apply()` 只使用本插件注册的素材，保留当前伙伴身份、名字、人设与记忆，重启保留选择。`reset()` 只在本插件外观仍生效时恢复原伙伴外观；用户已换为 B 插件时 A 的 reset 不改变 B，也不恢复之前的其他插件外观。

All three methods take no arguments and return `Promise<AppearanceState>`. They expose no host configuration, memory, credentials or disk paths. Successful apply/reset acknowledges a persisted selection; the renderer paints asynchronously. A failed write rejects with `persistence_failed` and restores the in-memory selection. Installation and local preview must not silently apply a skin. Closing a panel preserves the selection; removing or disabling the active asset restores the companion's original appearance.

Errors in `Error.message`: `permission_denied`, `unsupported_context`, `appearance_unavailable`, `plugin_inactive`, `invalid_request`, `method_not_found`, `persistence_failed`. Only the owning active asset can change its appearance; dashboard blocks have no appearance API. Handle errors visibly and offer retry.

外观 API 的类型与说明已纳入本仓库主分支，对应宿主实现已完成；**macOS arm64 本地打包构建 0.23.0 已通过兼容性实测**，覆盖市场安装、真实权限授权、八动作查询与已选定的 12 帧走路、重启保持、恢复及卸载。宿主 0.22 不支持本轮扩展；旧宿主须先探测 `pet.appearance?.getState`，不能仅凭 `apiVersion: 1` 判断支持。这是本地测试构建的验证结果，非公开宿主发布；官方宿主仍仅通过受邀测试渠道分发，本轮没有 npm 发布。The main branch includes the appearance API definitions/documentation for the completed host implementation. A local packaged macOS arm64 host 0.23.0 build passed compatibility testing: market installation, explicit permission consent, eight available actions and the selected 12-frame walk, persistence across restarts, restore and uninstall. Host 0.22 does not support this extension; feature-detect older hosts rather than relying on apiVersion 1. This validates a local test build, not a public host release. The official host remains invitation-only, and no npm release is made by this delivery.

```js
// asset+panel manifest: kind: ['asset', 'panel'], permissions: ['ui', 'appearance']
const state = await pet.appearance.getState();
// In an explicit “Use” button handler:
const applied = await pet.appearance.apply();
// In an explicit “Restore” button handler, enabled only when canRestore:
const restored = await pet.appearance.reset();
```


## 动作查询与可选素材 / Animation metadata (experimental, implemented on main)

新增 `pet.pet.getAnimations(): Promise<PetAnimation[]>`，tool / panel / block 均可用，需要声明并获得 `pet` 权限。无参数，查询当前实际外观；每项只有 `state`、`frameCount`、`fps`、`loop`、`standard`，对应首个素材变体，不包含路径。未加载的外观返回空数组。本仓库主分支已包含此扩展，macOS arm64 本地打包构建 0.23.0 已通过兼容性实测。宿主 0.22 不支持此扩展；旧宿主须先探测 `pet.pet.getAnimations`，不能据 apiVersion 1 或类型包版本号推断支持。官方宿主仍仅通过受邀测试渠道分发，验证不代表公开宿主发布；本轮未发布 npm 包。

The query returns the current appearance's available clips, including locally registered custom keys. It takes no arguments, requires an active plugin with the `pet` permission, and is available in tool, panel and block contexts. It exposes first-variant metadata only, with no filesystem paths. Errors include `permission_denied`, `plugin_inactive`, `unsupported_context` and `invalid_request`. The extension is included in the main branch and has passed compatibility tests with a local packaged macOS arm64 host 0.23.0 build. Host 0.22 does not support it; feature-detect the method on older hosts. The official host is still distributed through invitation-only channels. This is neither a public host release nor a new npm release.

继续通过已有 `pet.pet.playAnim(state)` 播放，不为各动作新增方法。其布尔返回值仅确认已向宠物窗口分发，不能代表播放完成。单次素材自然结束回待机，循环素材持续到下一动作或真实交互。既有唤醒优先级保持：wake 不打断走路/送文件等行为。缺失标准动作默认回 idle；send 优先回 walk，edgehide 优先回 sleep；未注册的未知键不播放。动画调用只控制本机伙伴；不是远程操控访客的接口。

`playAnim` keeps its existing boolean dispatch acknowledgement, not a completion promise. Non-looping clips return to idle; looping clips continue until superseded by another animation or interaction. Existing wake priority remains. Missing standard states resolve to idle, except send prefers walk and edgehide prefers sleep; unknown unregistered names do nothing. Playback addresses the local companion, not a remote visitor.

14 个标准键：`idle walk sleep wake speak send drag unread edgehide peek unpeek greet dropempty dropfull`。跨机包要求 idle/walk，其余选配；扩展描述 v2 显式声明 loop，只传严格验证的静态 PNG 与描述，不能携带代码。旧 v1 双动作包继续兼容。接收端不支持扩展描述时，出发前明确失败；不会悄悄删掉动作。局域网无需登录或好友验证，串门期间外观不变。

Cross-machine appearance v2 permits the fourteen listed states with explicit loop flags; idle and walk are required. Legacy v1 two-state packages remain supported. Unsupported receivers fail preparation before departure. Only validated static PNG frames and animation metadata are transferred, never plugin code. Other visitor action slots can be decoded without a new automatic behavior: actual visitor triggers follow its existing arrival, speaking, dragging, delivery and edge lifecycle.

查询沿用现有 SDK 桥参数归一化：JavaScript 多传的参数会被零参数方法忽略，TypeScript 签名在编译时拒绝它们；原始主进程协议载荷若带参数则拒绝 invalid_request。The existing JavaScript bridge normalizes this method to zero arguments (extra caller arguments are ignored); TypeScript rejects extra arguments at compile time. A malformed raw host protocol request with arguments is rejected with invalid_request.

## 聊天主题包 v1 / Chat themes (experimental, unreleased)

本节描述开发分支的格式，最低已发布宿主版本尚未确定，不能据类型或文档更新宣称既有宿主支持。主题包由用户在设置中选择，安装不会自动应用，不读取聊天内容，不运行主题脚本，不增加 tool/panel/block 方法。

This data-only format is experimental and unreleased. No released host compatibility is claimed. Installing registers a choice; the user selects it in host settings. Themes cannot read chat content or execute code, and add no SDK methods. Raw ui.injectStyle remains closed.

manifest 使用 kind: ['theme']、permissions: ['ui:theme']，entry 仅有 theme 字段，值为包内相对路径（推荐 theme.json）。不接受其他入口、services、provides 或 activation。

Only the theme kind and ui:theme permission are accepted; entry contains only a relative theme path. Service, activation and executable entry declarations are rejected.

主题 JSON 精确包含 schemaVersion: 1、target: 'chat'、colors、radius、bubbleRadius、texture 六个字段，最多 16 KiB。colors 必须提供 canvas、panel、ink、muted、surface、card、line、accent、accentInk、tint、success、error、errorSurface、file、fileInk，每值为 #RRGGBB。两个圆角为 0–28 整数，texture 为 plain / paper / grid。未知字段、脚本、任意 CSS、URL、越界路径均拒绝。

JSON has exactly six fields and fifteen #RRGGBB color slots, integer radii 0–28, and a plain/paper/grid texture preset. The host enforces the 16 KiB limit, exact values and path containment. TypeScript checks do not replace runtime validation.

切换保留草稿和会话，重启恢复有效选择；卸载、停用或失效恢复默认并解释原因，重新安装不自动选中。保存失败保留现有选择，包更新失败保留之前可用版本。

Switching preserves drafts and conversation state. Valid choices survive restart. Removal, disabling or invalidation restores the default with a reason; reinstalling does not automatically select the package. Failed selection writes keep the current choice; failed updates retain the previous working version.
