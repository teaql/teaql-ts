# TeaQL-TS (TypeScript 运行时)

`teaql-ts` 是 **TEAQL Federation Protocol (TFP)** 的核心 TypeScript 运行时框架。它提供了一个超轻量的引擎，负责将优雅的链式 DSL 安全地转换为跨语言的 AST，让你在前端（或 Node.js）中也能享受到强类型、高表达力的数据抓取体验。

## 🌟 为什么会让你直呼 "Wow"? 

看看这段由 `teaql-ts` 驱动的代码，你就能感受到这种将**类型安全**与**声明式表达**完美结合的美感。你不再需要手动拼接 GraphQL 字符串或者繁琐的 RESTful 参数，只需这样写：

### 面向 Pro Code 的极致优雅 (Native)
如果你是全栈开发者，在拥有生成的 `Q` Builder 后，你可以写出极度丝滑的链式代码，IDE 将为你提供 100% 的智能补全：

```typescript
// 业务需求：查询所有的“看板状态”，按展示顺序分组，并求出每个分组的进度总和
const aggResult = await Q.taskStatuses()
  .groupByDisplayOrder() // 完全自动推导的分组方法
  .sumProgress()         // 完全自动推导的聚合方法
  .executeForList(ctx);

// 返回直观、已完成序列化的 JSON，无缝传递给 Vue/React 渲染
console.log(aggResult.data);
```

### 面向 Low Code 的极致安全 (Dynamic)
如果你在搭建“无代码平台”或“动态报表”，你可以直接把上述代码当成**纯字符串**从网页传给解释器。在没有任何 `eval()` 注入风险的前提下，它依然可以完美执行：

```typescript
// 从前端输入框接收的纯字符串
const userQuery = 'Q.taskStatuses().groupByDisplayOrder().sumProgress()';

// 安全地解析为 AST 请求并执行
const request = QueryParser.parse(userQuery);
const result = await request.executeForList(ctx);
```

---

## 📂 项目架构与多领域示例

`teaql-ts` 在架构设计上秉承了**框架层**与**业务层**绝对隔离的哲学。本仓库的 `src` 目录是纯净无污染的核心引擎，而所有的实际业务演示都按领域划分在 `examples` 目录下。

```text
teaql-ts/
├── src/                      # [框架层] 纯净的核心引擎，无任何业务代码
│   ├── core/                 # AST 树定义
│   ├── parser/               # DSL 反射与安全解释器
│   └── tfp/                  # 联邦网络传输协议层
│
└── examples/                 # [业务示例层] 各种使用场景的集成演示
    │
    ├── task-board/           # 示例一：看板系统业务域
    │   ├── ts-lib-core/      # 通过代码生成器生成的强类型领域模型 (如 Task, Q.ts)
    │   ├── app-dynamic/      # 基于动态字符串解析的运行时 Demo
    │   └── app-native/       # 基于流式硬编码 API 的 Demo
    │
    └── ecommerce-system/     # 示例二：[规划中] 电商系统示例
```
