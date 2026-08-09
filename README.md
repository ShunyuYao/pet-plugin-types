# @pet/plugin-types

桌宠（吐梨邦）插件 SDK 的 TypeScript 类型定义。

> ## 本包是 SDK surface 的**唯一权威文档**
>
> 类型与宿主 `demo/core/plugin-runtime/sdk-surface.js` 的定义表逐条对应；分档依据是宿主
> `docs/plugin-sdk-freeze-review.md`（冻结方案决定版）。两者不一致时以宿主仓库为准，
> 本包按 bug 处理。

**当前 `apiVersion: 1`。** A 档 30 个方法已冻结，B 档 12 个标 `@experimental`。

## 三档承诺

| 档位 | 标记 | 承诺 |
|---|---|---|
| **A 冻结** | 无标记 | 同一 `apiVersion` 内**只加不改不删**；废弃需先标 deprecated 并保留 ≥2 个宿主版本 |
| **B 实验** | `@experimental` | 可用，但**签名/语义可能在任一 apiVersion 变更，且不走废弃流程** |
| **C 不开放** | 不在本包中 | 运行时可能仍有实现（内置插件在用），但不作为对外契约，第三方不得依赖 |

B 档方法的变更**不**强制升 `apiVersion`（这正是 `@experimental` 的含义）；A 档方法的
语义变更必须升。

从本包删除的 C 档能力：`ui.injectStyle`（主题将改为语义 Token 覆写，不再是裸 CSS 注入）、
`pet.meetingCard`（将被声明式聊天卡片 API 泛化）、`services.provide`（当前仅内置插件可用）、
`auth.openAuthWindow` 与 `pet.host.*`（内置特权面，属后续降权对象）。

## 返回值一律是 Promise

宿主内部有两条实现路径：内置插件在主进程内直调（同步返回），第三方插件经 RPC/IPC 往返
（Promise）。**契约面统一声明为 `Promise<T>`**——`await` 在两种形态下都正确。

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

## 三上下文能力矩阵

插件代码可能跑在三种上下文里，可用的命名空间**不一致**。下表差异**全部是有意设计**，
不是漏做：

| 命名空间.方法 | 权限 | 档 | `tool` | `panel` | `dashboard-card` |
|---|---|:--:|:--:|:--:|:--:|
| `storage.get/set/delete/all` | `storage` | A | ✅ | ✅ | ✅ |
| `secrets.get/set/delete` | `secrets` | A | ✅ | ❌ | ❌ |
| `pet.bubble/playAnim/speak` | `pet` | A | ✅ | ✅ | ✅ |
| `ui.dialog` | `ui` | A | ✅ | ✅ | ✅ |
| `ui.copyText` | `ui` | A | ✅ | ✅ | ✅ |
| `ui.openPanel` | `ui` | A | ✅ | ❌ | ❌ |
| `ui.closePanel` | `ui` | A | ✅ | ✅ | ❌ |
| `ui.taskCheck` | `ui` | B | ✅ | ✅ | ✅ |
| `events.on/emit` | `events` | A | ✅ | ✅ | ✅ |
| `scheduler.every/daily/cancel` | `scheduler` | A | ✅ | ❌ | ❌ |
| `net.fetch` | `net:<hostname>` | A | ✅ | ❌ | ❌ |
| `services.get` | `service:<name>` | A | ✅ | ✅ | ✅ |
| `settings.get` | 无 | A | ✅ | ✅ | ✅ |
| `ai.chat` | `ai` | B | ✅ | ✅ | ✅ |
| `files.*`（7 个） | `files` | B | ✅ | ✅ | ❌ |
| `friends.me/list/isFriend/avatar` | `friends` | A | ✅ | ✅ | ✅ |
| `activity.getLatest/connectionInfo` | `activity` | B | ✅ | ✅ | ✅ |
| `dashboard.requestHeight/notifyReady` | `dashboard` | A | ✅ | ❌ | ✅ |
| `tools.register` | `tools` | A | ✅ | ❌ | ❌ |
| `calendar.registerProvider` | `calendar-provider` | B | ✅ | ❌ | ❌ |
| `context`（字符串常量） | 无 | A | ❌ | ❌ | ✅ |

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

## 相关

- 插件市场登记表：[pet-plugin-registry](https://github.com/ShunyuYao/pet-plugin-registry)
- 脚手架：[create-pet-plugin](https://github.com/ShunyuYao/create-pet-plugin)
