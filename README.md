# @pet/plugin-types

桌宠（吐梨邦）插件 SDK 的 TypeScript 类型定义。

> ## 本包是 SDK surface 的**唯一权威文档**
>
> 类型与宿主 `demo/core/plugin-runtime/sdk-surface.js` 的定义表逐条对应；分档依据是宿主
> `docs/plugin-sdk-freeze-review.md`（冻结方案决定版）。两者不一致时以宿主仓库为准，
> 本包按 bug 处理。

**当前 `apiVersion: 1`。** A 档 30 个方法已冻结，B 档 24 个标 `@experimental`。


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

本包**暂不发布到 npm**（`@pet` scope 未注册）。用 git 依赖引用：

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
| `storage` | `get` | A | A | A |
| `storage` | `set` | A | A | A |
| `storage` | `delete` | A | A | A |
| `storage` | `all` | A | A | A |
| `secrets` | `get` | A | — | — |
| `secrets` | `set` | A | — | — |
| `secrets` | `delete` | A | — | — |
| `pet` | `bubble` | A | A | A |
| `pet` | `playAnim` | A | A | A |
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
- C 档权限（`ui:theme`、`auth-window`）不在类型联合中——宿主运行时仍认，但不是对外契约。

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
