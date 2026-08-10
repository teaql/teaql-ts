import fetch from 'node-fetch';
import { TeaQLClient, QueryParser } from '../../../../src';
import { Q } from '../../ts-lib-core/src/generated/Q';

// 1. 初始化 TFP 客户端，指向 Rust 后端
const client = new TeaQLClient({
  baseUrl: 'http://127.0.0.1:3001',
  fetch: fetch as any
});

// 2. 准备请求上下文
const ctx = { client };

async function runDynamicExamples() {
  try {
    console.log("=== 动态字符串查询示例 ===");

    // 示例 A: 动态过滤查询
    const filterQuery = 'Q.tasks().withNameContaining("bug")';
    console.log(`[执行]: ${filterQuery}`);
    
    // 解析字符串 DSL 为 AST 并执行 (传入入口对象 Q)
    const filterRequest = QueryParser.parse(filterQuery, Q);
    const filterResult = await filterRequest.executeForList(ctx);
    console.log("结果:", filterResult);

    // 示例 B: 动态聚合与分组
    const userQueryStr = 'Q.tasks().withNameContaining("bug").facetByStatusAs("statusFacet", Q.taskStatuses().count())';
    console.log(`\n[执行]: ${userQueryStr}`);
    
    const aggRequest = QueryParser.parse(userQueryStr, Q);
    const aggResult = await aggRequest.executeForList(ctx);
    console.log("结果:", aggResult);

  } catch (err) {
    console.error("执行查询失败:", err);
  }
}

runDynamicExamples();
