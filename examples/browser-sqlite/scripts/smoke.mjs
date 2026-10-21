import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const port = 4174;
const server = spawn(process.execPath, [
  // Verify the built deployment, not Vite's first-load dependency optimizer.
  'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Vite did not start:\n${output}`);
}

let browser;
try {
  await waitForServer();
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome'),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) browserErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => browserErrors.push(
    `${request.failure()?.errorText || 'request failed'} ${request.url()}`,
  ));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  try {
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('ready'), {
      timeout: 20_000,
    });
  } catch (error) {
    const currentStatus = await page.$eval('#status', element => element.textContent || '');
    throw new Error(`${error.message}\nstatus: ${currentStatus}\nconsole: ${browserErrors.join('\n')}`);
  }
  const first = await page.$eval('#result', element => element.textContent || '');
  const firstStatus = await page.$eval('#status', element => element.textContent || '');
  const defaultLocale = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.querySelector('#query-browser-title')?.textContent || '',
    englishActive: document.querySelector('[data-locale="en"]')?.classList.contains('active'),
  }));
  if (defaultLocale.lang !== 'en' || defaultLocale.title !== 'Choose a query' || !defaultLocale.englishActive) {
    throw new Error(`English was not the default locale: ${JSON.stringify(defaultLocale)}`);
  }
  const runtimeLanguages = await page.evaluate(() => ({
    title: document.querySelector('#runtime-language-title')?.textContent || '',
    links: [...document.querySelectorAll('.runtime-language')].map(element => ({
      name: element.querySelector('strong')?.textContent || '',
      href: element.getAttribute('href') || '',
      active: element.classList.contains('active'),
    })),
  }));
  if (runtimeLanguages.title !== 'This demo runs TypeScript in your browser.'
    || runtimeLanguages.links.length !== 7
    || runtimeLanguages.links.filter(language => language.active).map(language => language.name).join() !== 'TypeScript'
    || runtimeLanguages.links.some(language => !language.href.startsWith('https://github.com/teaql/'))) {
    throw new Error(`Seven-runtime selector is incomplete: ${JSON.stringify(runtimeLanguages)}`);
  }
  if (!firstStatus.includes('policy installed')) {
    throw new Error(`Browser runtime did not install Mutation Policy: ${firstStatus}`);
  }
  const defaultLanding = await page.evaluate(() => ({
    hash: window.location.hash,
    activeQuery: document.querySelector('[data-query-id].active')?.dataset.queryId || '',
    resultTitle: document.querySelector('#result-title')?.textContent || '',
    hasOrderCenter: !!document.querySelector('#result .order-center'),
    tableViewActive: document.querySelector('#view-table')?.classList.contains('active'),
  }));
  if (!firstStatus.includes('7 entities')
    || defaultLanding.hash !== '#order-center'
    || defaultLanding.activeQuery !== 'order-center'
    || defaultLanding.resultTitle !== 'Comprehensive: Order management center'
    || !defaultLanding.hasOrderCenter
    || !defaultLanding.tableViewActive
    || !first.includes('Order Management Center')
    || !first.includes('TQL-2026-1008')
    || !first.includes('Shipped')) {
    throw new Error(`Order center was not the default business page: ${JSON.stringify(defaultLanding)}\n${first}`);
  }
  const catalog = await page.$$eval('#query-catalog .query-group', groups => groups.map(group => ({
    title: group.querySelector('h2')?.textContent,
    links: group.querySelectorAll('a').length,
  })));
  if (catalog.length !== 4 || catalog.some(group => group.links < 3)) {
    throw new Error(`Expected four query groups with at least three links: ${JSON.stringify(catalog)}`);
  }
  const rawResult = await page.$('#result pre');
  if (rawResult) throw new Error('Result regressed to a raw preformatted JSON block');
  const defaultSql = await page.$eval('#sql-output', element => element.textContent || '');
  if (!defaultSql.includes('SELECT') || !defaultSql.includes('customer_order_data')
    || !defaultSql.includes('render order list page: load order list')) {
    throw new Error(`Default order center did not render its business-to-SQL evidence:\n${defaultSql}`);
  }

  const dashboard = await page.$eval('#result', element => element.textContent || '');
  const metricCount = await page.$$('#result .metric-card');
  const dashboardRows = await page.$$('#result .order-row:not(.order-row-head)');
  const dashboardColumns = await page.$$('#result .order-row-head > span');
  const productTitles = await page.$$eval('#result .product-thumb', elements =>
    elements.map(element => element.getAttribute('title') || ''));
  const selectedColors = await page.$$eval('#result .metric-card:not(.metric-total)', elements =>
    elements.map(element => element.style.getPropertyValue('--metric-color')));
  const facetCards = await page.$$eval('#result .metric-card:not(.metric-total)', elements =>
    elements.map(element => ({
      name: element.querySelector('span')?.textContent || '',
      count: element.querySelector('strong')?.textContent || '',
      total: element.querySelector('small')?.textContent || '',
      color: element.style.getPropertyValue('--metric-color'),
    })));
  const cancelledMetric = await page.$eval('#result .metric-cancelled', element => ({
    text: element.textContent || '',
    color: element.style.getPropertyValue('--metric-color'),
  }));
  const badgeColors = await page.$$eval('#result .status-badge', elements =>
    elements.map(element => element.style.color));
  if (!dashboard.includes('Order Management Center') || metricCount.length !== 6
    || dashboardRows.length !== 4 || dashboardColumns.length !== 4
    || !productTitles.some(title => title.includes('TeaQL Portable Keyboard'))
    || !cancelledMetric.text.includes('Cancelled') || !cancelledMetric.text.includes('1')
    || cancelledMetric.color !== '#9F1239'
    || JSON.stringify(facetCards) !== JSON.stringify([
      { name: 'Pending payment', count: '1', total: 'Total 79.90', color: '#D97706' },
      { name: 'Paid', count: '2', total: 'Total 968.80', color: '#2563EB' },
      { name: 'Shipped', count: '2', total: 'Total 1,567.00', color: '#16A34A' },
      { name: 'Delivered', count: '2', total: 'Total 718.00', color: '#047857' },
      { name: 'Cancelled', count: '1', total: 'Total 159.00', color: '#9F1239' },
    ])
    || selectedColors.some(color => !color) || badgeColors.some(color => !color)) {
    throw new Error('Comprehensive order center did not render metrics and the first paginated page');
  }
  const dashboardSqlCount = await page.$$('#sql-output .evidence-row');
  if (dashboardSqlCount.length < 5) {
    throw new Error(`Order center should expose every executed SQL statement, found ${dashboardSqlCount.length}`);
  }
  const evidenceRows = await page.$$eval('#sql-output .evidence-row', rows => rows.map(row => ({
    cells: row.querySelectorAll('td').length,
    time: row.querySelector('.evidence-time')?.textContent || '',
    identity: row.querySelector('td:nth-child(2)')?.textContent || '',
    trace: row.querySelector('.evidence-trace')?.textContent || '',
    sql: row.querySelector('.evidence-sql')?.textContent || '',
    whiteSpace: getComputedStyle(row.querySelector('td')).whiteSpace,
  })));
  const traceRoot = 'render order list page: load order list';
  if (evidenceRows.some(row => row.cells !== 4 || row.whiteSpace !== 'nowrap')
    || evidenceRows.some(row => !row.time.includes('T') || !row.time.endsWith(' ms'))
    || evidenceRows.some(row => !row.identity.startsWith('order-center · #'))
    || evidenceRows.some(row => !row.trace.startsWith(traceRoot))
    || !evidenceRows.some(row => row.trace.endsWith("→ countAs('totalOrders')"))
    || !evidenceRows.some(row => row.trace.endsWith('→ count items'))
    || !evidenceRows.some(row => row.trace.endsWith('→ load status'))
    || !evidenceRows.some(row => row.trace.endsWith('→ load item previews'))
    || !evidenceRows.some(row => row.trace === `${traceRoot} → facetByStatusAs('statusCounts') → aggregate status`)
    || !evidenceRows.some(row => row.trace === `${traceRoot} → facetByStatusAs('statusCounts') → load status facets`)
    || evidenceRows.some(row => !row.sql.includes('SELECT') || !row.sql.includes(' · bindings: '))
    || evidenceRows.some(row => /[{}\[\]"]/.test(row.trace))) {
    throw new Error(`Execution evidence was not rendered as plain one-line log text: ${JSON.stringify(evidenceRows)}`);
  }
  const reviewLayout = await page.$eval('#result-grid', grid => ({
    order: [...grid.children].map(child => child.className),
    columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    gridWidth: grid.getBoundingClientRect().width,
    queryWidth: grid.querySelector('.query-card')?.getBoundingClientRect().width ?? 0,
    evidenceColumns: [...grid.querySelectorAll('.execution-evidence th')].map(cell => cell.textContent || ''),
  }));
  if (reviewLayout.order.join('|') !== 'tree-card|query-card|sql-card'
    || reviewLayout.columns !== 1
    || Math.abs(reviewLayout.gridWidth - reviewLayout.queryWidth) > 1
    || reviewLayout.evidenceColumns.join('|') !== 'Time|Identity|Trace chain|SQL') {
    throw new Error(`Review layout or execution identity is incomplete: ${JSON.stringify(reviewLayout)}`);
  }
  const dashboardQuery = await page.$eval('#query-code', element => element.textContent || '');
  if (!dashboardQuery.includes('Q.customerOrdersWithMinimalFields()')
    || !dashboardQuery.includes('Q.orderStatuses()')
    || !dashboardQuery.includes('.selectColor()')
    || !dashboardQuery.includes(".sumOrderTotalAmountAs('orderTotalAmount')")
    || !dashboardQuery.includes(".facetByStatusAs('statusCounts'")
    || !dashboardQuery.includes('.filterByJson(searchParams)')
    || !dashboardQuery.includes('.offset(pageOffset)')
    || !dashboardQuery.includes('.limit(pageSize)')
    || !dashboardQuery.includes('.executeForList(ctx)')
    || dashboardQuery.includes('new SelectQuery')
    || dashboardQuery.includes('.selectCode()')
    || dashboardQuery.includes('Q.orderStatuses()\n')
    || dashboardQuery.includes('Q.orderItems()\n')
    || dashboardQuery.includes('selectPlatformWith')
    || dashboardQuery.includes('selectCustomerWith')) {
    throw new Error(`Order center must execute one generated Q expression:\n${dashboardQuery}`);
  }
  for (const implementationField of [
    '.selectId()', '.selectOrderId()', '.selectDisplayOrder()', '.selectSku()',
  ]) {
    if (dashboardQuery.includes(implementationField)) {
      throw new Error(`Order center leaked runtime-only field ${implementationField}:\n${dashboardQuery}`);
    }
  }
  const visualQueryOrder = [
    '.filterByJson(searchParams)',
    ".countAs('totalOrders')",
    ".facetByStatusAs('statusCounts'",
    '.selectOrderNumber()',
    '.selectOrderDate()',
    '.selectStatusWith(',
    '.selectItemListWith(',
    '.offset(pageOffset)',
    '.limit(pageSize)',
    '.executeForList(ctx)',
  ].map(fragment => dashboardQuery.indexOf(fragment));
  if (visualQueryOrder.some(index => index < 0)
    || visualQueryOrder.some((index, position) => position > 0 && index <= visualQueryOrder[position - 1])) {
    throw new Error(`Q expression no longer follows the visual order:\n${dashboardQuery}`);
  }
  const dashboardSql = evidenceRows.map(row => row.sql).join('\n');
  if (!dashboardSql.includes('COUNT("id") AS "totalOrders"')) {
    throw new Error(`countAs('totalOrders') did not reach the executed SQL:\n${dashboardSql}`);
  }
  if (!dashboardSql.includes('COUNT("id") AS "orderCount"')
    || !dashboardSql.includes('SUM("total_amount") AS "orderTotalAmount"')
    || !dashboardSql.includes('GROUP BY "status_id"')) {
    throw new Error(`Status facet did not execute count and total amount in one grouped SQL query:\n${dashboardSql}`);
  }
  if (dashboardSql.includes('platform_data') || dashboardSql.includes('customer_data')) {
    throw new Error(`Order center executed unused Platform/Customer queries:\n${dashboardSql}`);
  }
  if (!dashboardSql.includes('"color"') || dashboardSql.includes('"code"')) {
    throw new Error(`Order status projection should select color, not code:\n${dashboardSql}`);
  }
  if (!dashboardSql.includes('order_item_data') || !dashboardSql.includes('order_id')
    || !dashboardSql.includes('product_name') || dashboardSql.includes('"sku"')) {
    throw new Error(`Order item projection was not derived from the public Q selection:\n${dashboardSql}`);
  }
  await page.click('#view-tree');
  await page.waitForFunction(() => document.querySelector('#result-view-label')?.textContent === 'Result tree'
    && !!document.querySelector('#result details'));
  const dashboardTree = await page.$eval('#result', element => element.textContent || '');
  if (!dashboardTree.includes('statusFacets') || !dashboardTree.includes('itemList')) {
    throw new Error(`Dashboard Result Tree is incomplete:\n${dashboardTree}`);
  }
  await page.click('#view-table');
  await page.waitForFunction(() => document.querySelector('#result-view-label')?.textContent === 'Result table'
    && !!document.querySelector('#result .order-center'));
  await page.$$eval('#result .pagination button', buttons =>
    buttons.find(button => button.textContent === '2')?.click());
  await page.waitForFunction(() => !document.querySelector('#result')?.hasAttribute('aria-busy')
    && document.querySelector('#result')?.textContent?.includes('Showing 5–8'));
  const pageQuery = await page.$eval('#query-code', element => element.textContent || '');
  const pageParams = await page.$eval('#query-params-code', element => element.textContent || '');
  if (pageQuery !== dashboardQuery || !pageParams.includes('"pageOffset": 4')) {
    throw new Error(`Pagination changed the Q expression instead of only its parameters:\n${pageParams}`);
  }
  await page.$$eval('#result .pagination button', buttons =>
    buttons.find(button => button.textContent === '1')?.click());
  await page.waitForFunction(() => !document.querySelector('#result')?.hasAttribute('aria-busy')
    && document.querySelector('#result')?.textContent?.includes('Showing 1–4'));
  await page.type('#result .order-search input', 'Keyboard');
  await page.click('#result .order-search button');
  await page.waitForFunction(() => !document.querySelector('#result')?.hasAttribute('aria-busy')
    && document.querySelector('#result-meta')?.textContent?.includes('2 matching orders'));
  const searchedDashboard = await page.$eval('#result', element => element.textContent || '');
  if (!searchedDashboard.includes('TQL-2026-1008') || !searchedDashboard.includes('TQL-2026-1001')) {
    throw new Error(`Product subquery search did not return both keyboard orders:\n${searchedDashboard}`);
  }
  const searchedQuery = await page.$eval('#query-code', element => element.textContent || '');
  const searchedParams = await page.$eval('#query-params-code', element => element.textContent || '');
  if (searchedQuery !== dashboardQuery
    || !searchedParams.includes('itemList.productName')
    || !searchedParams.includes('Keyboard')) {
    throw new Error(`Search changed the Q expression instead of only its parameters:\n${searchedQuery}\n${searchedParams}`);
  }
  const statusSql = await page.$$eval('#sql-output .evidence-sql', cells => cells
    .map(cell => cell.textContent || '')
    .join('\n'));
  if (!statusSql.includes('order_status_data')) {
    throw new Error(`OrderStatus relation/facet SQL was not executed:\n${statusSql}`);
  }
  await page.click('#result .metric-pending_payment');
  await page.waitForFunction(() => !document.querySelector('#result')?.hasAttribute('aria-busy')
    && document.querySelector('#result-meta')?.textContent?.includes('1 matching order'));
  const statusQuery = await page.$eval('#query-code', element => element.textContent || '');
  const statusParams = await page.$eval('#query-params-code', element => element.textContent || '');
  if (statusQuery !== dashboardQuery || !statusParams.includes('status.code')
    || !statusParams.includes('PENDING_PAYMENT')) {
    throw new Error(`Status selection changed the Q expression instead of only its parameters:\n${statusParams}`);
  }

  await page.click('[data-query-id="order-detail"]');
  await page.waitForFunction(() => document.querySelector('#result-title')?.textContent === 'Complete order details'
    && !document.querySelector('#result')?.hasAttribute('aria-busy'));
  await page.click('#view-tree');
  await page.waitForSelector('#result details');
  await page.click('#expand-all');
  const detail = await page.$eval('#result', element => element.textContent || '');
  for (const value of ['TQL-2026-1003', 'White Porcelain Travel Tea Set', 'ALI-260906-11', 'SF2609061003']) {
    if (!detail.includes(value)) throw new Error(`Complete order graph is missing ${value}`);
  }

  await page.click('[data-query-id="orders-by-status"]');
  await page.waitForFunction(() => document.querySelector('#result-title')?.textContent === 'Orders by status'
    && !document.querySelector('#result')?.hasAttribute('aria-busy'));
  const summary = await page.$eval('#result', element => element.textContent || '');
  if (!summary.includes('grossAmount') || !summary.includes('averageOrderValue')) {
    throw new Error(`Aggregation result is incomplete:\n${summary}`);
  }

  await page.click('[data-query-id="dynamic-safe-fields"]');
  await page.waitForFunction(() => document.querySelector('#result-title')?.textContent === 'Dynamic: field allowlist'
    && !document.querySelector('#result')?.hasAttribute('aria-busy'));
  const dynamic = await page.$eval('#result', element => element.textContent || '');
  if (!dynamic.includes('DYNAMIC_SEARCH_UNKNOWN_FIELD') || !dynamic.includes('TQL-2026-1001')) {
    throw new Error(`Dynamic search did not report an unknown field and execute valid clauses:\n${dynamic}`);
  }

  const beforeLocaleSwitch = await page.evaluate(() => ({
    executionId: document.querySelector('.evidence-time')?.dataset.executedAt || '',
    rows: [...document.querySelectorAll('#sql-output .evidence-row')].map(element => element.textContent || ''),
  }));
  await page.click('[data-locale="zh"]');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN'
    && document.querySelector('#result-title')?.textContent === '动态：字段白名单');
  const chineseLocale = await page.evaluate(() => ({
    title: document.querySelector('#query-browser-title')?.textContent || '',
    runtimeTitle: document.querySelector('#runtime-language-title')?.textContent || '',
    currentRuntime: document.querySelector('.runtime-language.active small')?.textContent || '',
    evidenceTitle: document.querySelector('.sql-card-heading .query-card-label')?.textContent || '',
    evidenceColumns: [...document.querySelectorAll('.execution-evidence th')].map(element => element.textContent || ''),
    executionId: document.querySelector('.evidence-time')?.dataset.executedAt || '',
    rows: [...document.querySelectorAll('#sql-output .evidence-row')].map(element => element.textContent || ''),
  }));
  if (chineseLocale.title !== '选择一个查询'
    || chineseLocale.runtimeTitle !== '这个演示在浏览器中运行 TypeScript。'
    || chineseLocale.currentRuntime !== '当前浏览器 runtime'
    || chineseLocale.evidenceTitle !== '执行证据'
    || chineseLocale.evidenceColumns.join('|') !== '时间|身份|追踪链|SQL'
    || chineseLocale.executionId !== beforeLocaleSwitch.executionId
    || JSON.stringify(chineseLocale.rows) !== JSON.stringify(beforeLocaleSwitch.rows)) {
    throw new Error(`Chinese locale did not rerender safely: ${JSON.stringify(chineseLocale)}`);
  }
  await page.click('[data-locale="en"]');
  await page.waitForFunction(() => document.documentElement.lang === 'en'
    && document.querySelector('#result-title')?.textContent === 'Dynamic: field allowlist');

  const queryIds = await page.$$eval('[data-query-id]', links => links.map(link => link.dataset.queryId));
  for (const queryId of queryIds) {
    await page.click(`[data-query-id="${queryId}"]`);
    await page.waitForFunction(id => document.querySelector(`[data-query-id="${id}"]`)?.classList.contains('active')
      && !document.querySelector('#result')?.hasAttribute('aria-busy'), {}, queryId);
    const queryState = await page.evaluate(() => ({
      status: document.querySelector('#status')?.textContent || '',
      meta: document.querySelector('#result-meta')?.textContent || '',
    }));
    if (!queryState.status.includes('ready') || queryState.meta.includes('失败') || queryState.meta.includes('failed')) {
      throw new Error(`Query ${queryId} failed: ${JSON.stringify(queryState)}`);
    }
    const unexpectedChinese = await page.$eval('body', body => {
      const copy = body.cloneNode(true);
      copy.querySelector('[data-locale="zh"]')?.remove();
      return copy.textContent?.match(/[\u4e00-\u9fff]+/g) ?? [];
    });
    if (unexpectedChinese.length) {
      throw new Error(`English query ${queryId} still renders Chinese: ${unexpectedChinese.join(', ')}`);
    }
  }

  const beforeReset = await page.$eval('#result', element => element.textContent || '');
  await page.click('#reset');
  await page.waitForFunction(() => !document.querySelector('#reset')?.hasAttribute('disabled'));
  const reset = await page.$eval('#result', element => element.textContent || '');
  if (reset !== beforeReset) throw new Error('Reset did not restore deterministic order data');

  await page.click('#persist');
  await page.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent || '';
    return text.startsWith('OPFS') && text.includes('ready');
  }, { timeout: 20_000 });
  const persisted = await page.$eval('#result', element => element.textContent || '');
  if (persisted !== beforeReset) throw new Error('OPFS did not receive deterministic order data');

  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent || '';
    return text.startsWith('OPFS') && text.includes('ready');
  }, { timeout: 20_000 });
  const preference = await page.$eval('#persist', element => element.checked);
  const afterReload = await page.$eval('#result', element => element.textContent || '');
  if (!preference || afterReload !== persisted) {
    throw new Error('OPFS preference or data did not survive a browser reload');
  }
  if (browserErrors.length) throw new Error(`Browser console errors:\n${browserErrors.join('\n')}`);
  console.log('PASS generated Q queries, order center, executed SQL, result tree, all queries, OPFS, and reset');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
