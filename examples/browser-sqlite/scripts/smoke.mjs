import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const port = 4174;
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port),
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
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
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
  if (!first.includes('Evaluate semantic model') || !first.includes('Verify browser runtime')) {
    throw new Error(`Generated Q API did not return mutation-seeded rows:\n${first}`);
  }
  await page.click('#reset');
  await page.waitForFunction(() => !document.querySelector('button')?.hasAttribute('disabled'));
  const reset = await page.$eval('#result', element => element.textContent || '');
  if (reset !== first) throw new Error('Reset did not restore deterministic mutation-seeded data');

  await page.click('#persist');
  await page.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent || '';
    return text.startsWith('OPFS') && text.includes('ready');
  }, { timeout: 20_000 });
  const persisted = await page.$eval('#result', element => element.textContent || '');
  if (persisted !== first) throw new Error('OPFS did not receive deterministic mutation-seeded data');

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
  console.log('PASS browser SQLite/WASM memory, OPFS persistence, mutation seed, Q API, and reset');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
