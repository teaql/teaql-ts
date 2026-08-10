import fetch from 'node-fetch';
import { TeaQLClient } from '../../../../src';
import { Q } from '../../ts-lib-core/src/generated/Q';

// 1. 初始化 TFP 客户端，指向 Rust 后端
const client = new TeaQLClient({
  baseUrl: 'http://127.0.0.1:3001',
  fetch: fetch as any
});

// 2. 准备请求上下文
const ctx = { client };

async function runNativeExamples() {
  try {
    console.log("=== Native TypeScript 查询示例 ===");

    // 示例 A: 强类型链式调用 (条件过滤)
    console.log("[执行]: Q.tasks().withNameContaining('bug')");
    const filterResult = await Q.tasks()
      .withNameContaining("bug")
      .executeForList(ctx);
      
    console.log("结果:", filterResult);

    // 示例 B: 强类型链式调用 (聚合与分组)
    console.log("\n[执行]: Q.taskStatuses().groupByDisplayOrder().avgProgress()");
    const aggResult = await Q.taskStatuses()
      .groupByDisplayOrder()
      .avgProgress()
      .executeForList(ctx);
      
    console.log("结果:", aggResult);

    // 示例 C: 强类型链式调用 (嵌套 Facet 面板聚合)
    console.log("\n[执行]: Q.tasks().facetByStatusAs('statusFacet', Q.taskStatuses().count())");
    const facetResult = await Q.tasks()
      .facetByStatusAs("statusFacet", Q.taskStatuses().count())
      .executeForList(ctx);
      
    console.log("主数据 (Tasks):", facetResult.data);
    console.log("统计面板 (Facets):", facetResult.facets);

  } catch (err) {
    console.error("执行查询失败:", err);
  }
}

runNativeExamples();
