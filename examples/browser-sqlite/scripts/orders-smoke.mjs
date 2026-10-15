import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const generated = JSON.parse(readFileSync('generated-order-hashes.json', 'utf8'));
function checkLibrary() {
  for (const [file, expected] of Object.entries(generated))
    assert.equal(createHash('sha256').update(readFileSync(join('orders-lib', file))).digest('hex'), expected, `generated file changed: ${file}`);
}
checkLibrary();
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'],
  {stdio: ['ignore', 'pipe', 'pipe']});
let serverOutput = '';
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
let browser;
const receipts = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch('http://127.0.0.1:4175/orders.html')).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, serverOutput);
  browser = await puppeteer.launch({executablePath: process.env.CHROME_BIN || (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome'),
    args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true});
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText} ${request.url()}`));
  async function waitReady(storage) {
    try {
      await page.waitForFunction(value => {
        const text = document.querySelector('#status')?.textContent || '';
        return text.startsWith(value) && text.includes('ready');
      }, {timeout: 20_000}, storage);
    } catch (error) {
      throw new Error(`${error.message}; status=${await page.$eval('#status', element => element.textContent)}; browserErrors=${errors.join('\n')}`);
    }
  }
  async function inspect(label, diagnostics) {
    const response = JSON.parse(await page.$eval('#result', element => element.textContent));
    assert.equal(response.metadata.totalCount, 3); assert.equal(response.metadata.aggregations.totalOrders, 3);
    assert.equal(response.metadata.pageOffset, 1); assert.equal(response.metadata.pageSize, 1);
    assert.deepEqual(response.metadata.searchWarnings, []);
    assert.equal(response.data.length, 1); const order = response.data[0];
    assert.equal(order.orderNumber, 'KEEP-002'); assert.equal(order.orderDate.slice(0, 10), '2026-10-02');
    assert.equal(order.version, 1); assert.equal(order.status.name, 'Paid'); assert.equal(order.status.color, '#22C55E');
    assert.deepEqual(order.items.map(item => [item.productName, item.quantity]), [['Box 1', 1], ['Box 2', 2], ['Box 3', 3]]);
    assert.equal(order.itemCount, 5);
    assert.deepEqual(response.facets.statusCounts.map(row => [String(row.id), row.orderCount, row.orderTotalAmount]),
      [['1001', 1, 100], ['1002', 2, 500], ['1003', 0, null]]);
    const evidence = JSON.parse(await page.$eval('#sql', element => element.textContent));
    assert.equal(evidence.length, 8);
    const comments = evidence.map(entry => entry.traceChain.filter(node => node.kind === 'comment').map(node => node.detail));
    const expected = [
      ['load order list', "countAs('totalOrders')"], ['load order list'],
      ['load order list', 'selectStatusWith(...)', 'load status'],
      ['load order list', 'selectOrderItemListWith(...)', 'load item previews'],
      ['load order list', "countOrderItemsAs('itemCount')"],
      ['load order list', "facetByStatusAs('statusCounts')", 'aggregate status'],
      ['load order list', "facetByStatusAs('statusCounts')", 'load status facets'],
      ['load order list', "facetByStatusAs('statusCounts')", 'aggregate status'],
    ];
    assert.deepEqual(comments.map(JSON.stringify).sort(), expected.map(JSON.stringify).sort());
    for (const entry of evidence) {
      assert.equal(entry.purpose, 'render order list page');
      assert.ok(entry.tracePath.some(node => node.kind === 'provider'));
      assert.equal(entry.traceChain.filter(node => node.kind === 'purpose').length, 1);
    }
    const text = await page.$eval('#status', element => element.textContent);
    assert.ok(text.includes(`${diagnostics} diagnostics`), text);
    assert.equal(await page.$eval('#trace', element => element.textContent), evidence.map(entry => `${entry.purpose}: ${entry.traceChain
      .filter(node => node.kind === 'comment').map(node => node.detail).join(' → ')}`).join('\n'));
    assert.deepEqual(await page.$$eval('.evidence-table th', cells => cells.map(cell => cell.textContent)),
      ['Time', 'Identity', 'Trace chain', 'SQL']);
    const renderedEvidence = await page.$$eval('#evidence-rows tr', rows => rows.map(row =>
      [...row.querySelectorAll('td')].map(cell => cell.textContent)));
    assert.deepEqual(renderedEvidence, evidence.map(entry => [
      `${entry.elapsedMicros} µs`, entry.tracePath.find(node => node.kind === 'request')?.name ?? '—',
      `${entry.traceChain.find(node => node.kind === 'purpose').detail}: ${entry.traceChain
        .filter(node => node.kind === 'comment').map(node => node.detail).join(' → ')}`, entry.debugSQL,
    ]));
    receipts.push({label, response, evidence, diagnostics, renderedEvidence});
    return response;
  }
  await page.goto('http://127.0.0.1:4175/orders.html', {waitUntil: 'networkidle0'});
  await waitReady('MEMORY'); const baseline = await inspect('memory-first', 8);
  await page.reload({waitUntil: 'networkidle0'}); await waitReady('MEMORY');
  assert.deepEqual(await inspect('memory-refresh', 8), baseline);
  await page.click('#logging');
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('0 diagnostics'));
  assert.deepEqual(await inspect('memory-logging-off', 0), baseline);
  await page.click('#reset');
  await page.waitForFunction(() => !document.querySelector('#reset')?.hasAttribute('disabled'));
  assert.deepEqual(await inspect('memory-reset', 0), baseline);
  await page.click('#persist'); await waitReady('OPFS');
  assert.deepEqual(await inspect('opfs-first', 0), baseline);
  await page.reload({waitUntil: 'networkidle0'}); await waitReady('OPFS');
  assert.deepEqual(await inspect('opfs-refresh', 8), baseline);
  await page.click('#reset');
  await page.waitForFunction(() => !document.querySelector('#reset')?.hasAttribute('disabled'));
  assert.deepEqual(await inspect('opfs-reset', 8), baseline);
  assert.deepEqual(errors, []); checkLibrary();
  if (process.env.TEAQL_BROWSER_ORDER_EVIDENCE) writeFileSync(process.env.TEAQL_BROWSER_ORDER_EVIDENCE,
    JSON.stringify({receipts, generatedLibraryUnchanged: true, browserErrors: errors}, null, 2) + '\n', {flag: 'wx'});
  console.log('PASS browser generated order TraceChain: memory/OPFS, refresh/reset, logging on/off, exact facets/counts/previews, actual SQL=8, unchanged generated library');
} finally { await browser?.close(); server.kill('SIGTERM'); }
