/**
 * Snapshot external product UI for parity work:
 * - discovers routes (same-origin)
 * - saves screenshots + html
 * - records HAR
 *
 * IMPORTANT: credentials are read from environment variables locally.
 *
 * Usage (PowerShell):
 *   $env:SNAP_BASE_URL="https://cp.triptickets.tech"
 *   $env:SNAP_EMAIL="you@example.com"
 *   $env:SNAP_PASSWORD="***"
 *   node scripts/snapshot-product.mjs
 *
 * If playwright isn't installed:
 *   pnpm dlx playwright@latest install --with-deps
 *   pnpm add -D playwright@latest   (optional, if you want it in repo)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes(),
  )}-${pad(d.getSeconds())}`;
}

function sha1(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function tryImportPlaywright() {
  try {
    return await import('playwright');
  } catch (e) {
    const msg =
      `Не найден пакет "playwright".\n\n` +
      `Вариант 1 (одноразово): pnpm dlx playwright@latest install --with-deps\n` +
      `Вариант 2 (в проект):  pnpm add -D playwright@latest && pnpm exec playwright install --with-deps\n\n` +
      `После установки повторите: node scripts/snapshot-product.mjs\n`;
    console.error(msg);
    throw e;
  }
}

function normalizeUrl(u) {
  // drop hash, keep query (часто фильтры живут в query)
  const url = new URL(u);
  url.hash = '';
  // remove trailing slash except root
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function isSameOrigin(url, baseOrigin) {
  try {
    const u = new URL(url);
    return u.origin === baseOrigin;
  } catch {
    return false;
  }
}

function isProbablyAsset(url) {
  const p = new URL(url).pathname.toLowerCase();
  return (
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.jpeg') ||
    p.endsWith('.gif') ||
    p.endsWith('.svg') ||
    p.endsWith('.webp') ||
    p.endsWith('.ico') ||
    p.endsWith('.css') ||
    p.endsWith('.js') ||
    p.endsWith('.map') ||
    p.endsWith('.woff') ||
    p.endsWith('.woff2') ||
    p.endsWith('.ttf')
  );
}

async function autoLogin(page, { baseUrl, email, password }) {
  // эвристика: пытаемся найти поля email/password и кнопку submit
  const candidates = {
    email: ['input[type="email"]', 'input[name="email"]', 'input[name="username"]', 'input[type="text"]'],
    password: ['input[type="password"]', 'input[name="password"]'],
    submit: ['button[type="submit"]', 'button:has-text("Войти")', 'button:has-text("Login")', 'input[type="submit"]'],
  };

  const loginUrl = new URL(baseUrl);
  // чаще всего логин на /login, но не всегда — сначала попробуем базовую страницу
  await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded' });

  const findFirst = async (selectors) => {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) return loc;
    }
    return null;
  };

  const emailLoc = await findFirst(candidates.email);
  const passLoc = await findFirst(candidates.password);

  if (!emailLoc || !passLoc) {
    // попробуем /login
    const maybeLogin = new URL('/login', baseUrl).toString();
    await page.goto(maybeLogin, { waitUntil: 'domcontentloaded' });
  }

  const emailLoc2 = (await findFirst(candidates.email)) ?? emailLoc;
  const passLoc2 = (await findFirst(candidates.password)) ?? passLoc;

  if (!emailLoc2 || !passLoc2) {
    throw new Error(
      'Не смог найти поля логина. Укажите URL логина и селекторы явно через env: SNAP_LOGIN_URL / SNAP_EMAIL_SELECTOR / SNAP_PASSWORD_SELECTOR / SNAP_SUBMIT_SELECTOR.',
    );
  }

  const emailSelector = process.env.SNAP_EMAIL_SELECTOR;
  const passwordSelector = process.env.SNAP_PASSWORD_SELECTOR;
  const submitSelector = process.env.SNAP_SUBMIT_SELECTOR;
  const loginUrlEnv = process.env.SNAP_LOGIN_URL;

  if (loginUrlEnv) {
    await page.goto(loginUrlEnv, { waitUntil: 'domcontentloaded' });
  }

  const emailField = emailSelector ? page.locator(emailSelector).first() : emailLoc2;
  const passField = passwordSelector ? page.locator(passwordSelector).first() : passLoc2;

  await emailField.fill(email);
  await passField.fill(password);

  const submit = submitSelector ? page.locator(submitSelector).first() : await findFirst(candidates.submit);
  if (!submit || (await submit.count()) === 0) {
    // fallback: press Enter in password
    await passField.press('Enter');
  } else {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
      submit.click(),
    ]);
  }

  // ждём “устаканивания” UI
  await page.waitForTimeout(600);
}

async function discoverLinks(page, { baseOrigin, baseUrl, includeQuery }) {
  const hrefs = await page.evaluate(() => {
    const out = new Set();
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href');
      if (href) out.add(href);
    }
    return Array.from(out);
  });

  const urls = [];
  for (const href of hrefs) {
    try {
      const u = new URL(href, baseUrl);
      if (!isSameOrigin(u.toString(), baseOrigin)) continue;
      if (isProbablyAsset(u.toString())) continue;
      if (!includeQuery) u.search = '';
      urls.push(normalizeUrl(u.toString()));
    } catch {
      // ignore
    }
  }
  return Array.from(new Set(urls));
}

async function snapshotPage(page, { url, out, idx }) {
  const u = new URL(url);
  const safeName = `${String(idx).padStart(3, '0')}_${u.pathname.replaceAll('/', '_').replace(/^_+/, '') || 'root'}_${
    sha1(url)
  }`;

  const screenshotPath = path.join(out.screenshotsDir, `${safeName}.png`);
  const htmlPath = path.join(out.htmlDir, `${safeName}.html`);
  const metaPath = path.join(out.pagesDir, `${safeName}.json`);

  const startedAt = new Date().toISOString();
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const html = await page.content();
  await fs.writeFile(htmlPath, html, 'utf8');

  const meta = {
    url,
    startedAt,
    status: res?.status?.() ?? null,
    finalUrl: page.url(),
    title: await page.title().catch(() => null),
  };
  await writeJson(metaPath, meta);
  return meta;
}

async function main() {
  const baseUrl = process.env.SNAP_BASE_URL;
  const email = process.env.SNAP_EMAIL;
  const password = process.env.SNAP_PASSWORD;

  if (!baseUrl) throw new Error('SNAP_BASE_URL не задан (пример: https://cp.triptickets.tech)');
  if (!email) throw new Error('SNAP_EMAIL не задан');
  if (!password) throw new Error('SNAP_PASSWORD не задан');

  const includeQuery = process.env.SNAP_INCLUDE_QUERY === '1';
  const maxPages = Number(process.env.SNAP_MAX_PAGES ?? '60');
  const outRoot = process.env.SNAP_OUT_DIR
    ? path.resolve(repoRoot, process.env.SNAP_OUT_DIR)
    : path.join(repoRoot, 'artifacts', 'product-snapshots', `cp_${nowStamp()}`);

  const pw = await tryImportPlaywright();
  const { chromium } = pw;

  await ensureDir(outRoot);
  const out = {
    root: outRoot,
    screenshotsDir: path.join(outRoot, 'screenshots'),
    htmlDir: path.join(outRoot, 'html'),
    pagesDir: path.join(outRoot, 'pages'),
    harPath: path.join(outRoot, 'network.har'),
  };
  await Promise.all([ensureDir(out.screenshotsDir), ensureDir(out.htmlDir), ensureDir(out.pagesDir)]);

  const baseOrigin = new URL(baseUrl).origin;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: out.harPath, content: 'attach' },
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await autoLogin(page, { baseUrl, email, password });

  const visited = new Set();
  const queue = [];

  const seedUrl = normalizeUrl(page.url());
  queue.push(seedUrl);

  const pages = [];
  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (!url) break;
    if (!isSameOrigin(url, baseOrigin)) continue;
    const n = normalizeUrl(url);
    if (visited.has(n)) continue;
    visited.add(n);

    try {
      const meta = await snapshotPage(page, { url: n, out, idx: pages.length + 1 });
      pages.push(meta);
      const links = await discoverLinks(page, { baseOrigin, baseUrl, includeQuery });
      for (const l of links) {
        if (!visited.has(l)) queue.push(l);
      }
    } catch (e) {
      pages.push({ url: n, error: String(e?.message ?? e), at: new Date().toISOString() });
    }
  }

  await writeJson(path.join(outRoot, 'routes.json'), {
    baseUrl,
    baseOrigin,
    maxPages,
    includeQuery,
    seedUrl,
    discovered: Array.from(visited),
    pages,
  });

  await context.close();
  await browser.close();

  console.log(`Готово. Артефакты: ${path.relative(repoRoot, outRoot)}`);
  console.log(`- routes.json`);
  console.log(`- network.har`);
  console.log(`- screenshots/`);
  console.log(`- html/`);
  console.log(`- pages/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

