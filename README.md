# @pet/plugin-types

桌宠（吐梨邦）插件 SDK 的 TypeScript 类型定义。

> ## ⚠️ 契约尚未冻结
>
> 本包目标是成为 SDK 的**唯一权威 surface 文档**，但目前还不是——宿主的 SDK surface
> 终审尚未完成，所有类型都标了 `@experimental`，随时可能变。
>
> 现在可以拿它做补全和参考，**不要依赖其稳定性**。冻结完成后本包会按结论重写并
> 标注 `apiVersion`，届时才开始遵守"同一 apiVersion 内只加不改不删"的兼容纪律。

## 不发 npm

本包**暂不发布到 npm**（`@pet` scope 未注册，且 SDK 未冻结时发包为时过早）。
用 git 依赖引用：

```json
{
  "dependencies": {
    "@pet/plugin-types": "github:ShunyuYao/pet-plugin-types"
  }
}
```

## 用法

```ts
import type { ActivateFn, PluginManifest } from '@pet/plugin-types';

export const activate: ActivateFn = async (pet) => {
  await pet.storage.set('installedAt', Date.now());
  await pet.pet.bubble('你好，我是新插件');
};
```

## 内容

| 文件 | 内容 |
|---|---|
| `manifest.d.ts` | `manifest.json` 的类型，与宿主 `manifest.js` 校验规则一一对应 |
| `index.d.ts` | `pet.*` SDK 类型（当前仅 storage / secrets / pet / tools 有具体签名） |

其余命名空间（ui / events / scheduler / net / services / settings / ai / files /
friends / activity / dashboard）的签名待终审后补全。各命名空间在
tool / panel / dashboard-card 三种上下文下的可用性**并不一致**，这是宿主三份桥的
历史差异，正在统一中。

## 相关

- 插件市场登记表：[pet-plugin-registry](https://github.com/ShunyuYao/pet-plugin-registry)
- 脚手架：[create-pet-plugin](https://github.com/ShunyuYao/create-pet-plugin)
