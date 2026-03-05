import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();
const ASSETS_SRC_ROOT = path.join(ROOT, 'packages', 'frontend', 'assets-src');
const FRONTEND_PUBLIC = path.join(ROOT, 'packages', 'frontend', 'public');
const IMAGES_JSON_PATH = path.join(FRONTEND_PUBLIC, 'assets', 'images', 'images.json');

const DEFAULT_PER_SLOT = 5;
const DEFAULT_CONCURRENCY = 3;
const MIN_WIDTH = 3000;

const BANNED_WORDS = ['portrait', 'face', 'food', 'interior', 'model'];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    limitCities: undefined,
    perSlot: DEFAULT_PER_SLOT,
    concurrency: DEFAULT_CONCURRENCY,
    force: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--limitCities=')) {
      const v = Number(arg.split('=')[1]);
      if (Number.isFinite(v) && v > 0) result.limitCities = v;
    } else if (arg.startsWith('--perSlot=')) {
      const v = Number(arg.split('=')[1]);
      if (Number.isFinite(v) && v > 0) result.perSlot = v;
    } else if (arg.startsWith('--concurrency=')) {
      const v = Number(arg.split('=')[1]);
      if (Number.isFinite(v) && v > 0) result.concurrency = v;
    } else if (arg === '--force') {
      result.force = true;
    }
  }
  return result;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function slugToDisplayName(slug) {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function extractCitiesFromCityInfo() {
  const cityInfoPath = path.join(ROOT, 'packages', 'frontend', 'src', 'lib', 'cityInfo.ts');
  if (!fs.existsSync(cityInfoPath)) return null;
  const src = fs.readFileSync(cityInfoPath, 'utf8');
  const marker = 'export const CITY_INFO';
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  const braceStart = src.indexOf('{', idx);
  if (braceStart === -1) return null;
  const braceEnd = src.indexOf('};', braceStart);
  const body = braceEnd === -1 ? src.slice(braceStart) : src.slice(braceStart, braceEnd);

  const slugsSet = new Set();

  // Ключи в кавычках: 'saint-petersburg': { ... }
  const reQuoted = /^[ \t]*'([^']+)'[ \t]*:\s*{/gm;
  let m;
  while ((m = reQuoted.exec(body)) !== null) {
    slugsSet.add(m[1]);
  }

  // Ключи без кавычек: moscow: { ... }
  const reBare = /^[ \t]*([a-z0-9-]+)[ \t]*:\s*{/gm;
  while ((m = reBare.exec(body)) !== null) {
    const key = m[1];
    if (key === 'brief' || key === 'mustSee') continue;
    slugsSet.add(key);
  }

  const slugs = Array.from(slugsSet);
  if (!slugs.length) return null;
  return slugs.map((slug) => ({ slug, name: slugToDisplayName(slug) }));
}

async function fetchCitiesFromApi() {
  const base = process.env.DAIBILET_API_BASE || 'http://localhost:3000/api/v1';
  const url = `${base.replace(/\/$/, '')}/cities`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch cities from ${url}: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json.map((c) => ({
    slug: String(c.slug),
    name: typeof c.name === 'string' && c.name.trim() ? c.name : slugToDisplayName(String(c.slug)),
  }));
}

async function getCities(limitCities) {
  let cities = extractCitiesFromCityInfo();
  if (!cities || !cities.length) {
    console.warn(
      '[image-candidates] failed to parse CITY_INFO (packages/frontend/src/lib/cityInfo.ts), using fallback slug list',
    );
    const fallbackSlugs = [
      'saint-petersburg',
      'moscow',
      'kazan',
      'kaliningrad',
      'vladimir',
      'yaroslavl',
    ];
    cities = fallbackSlugs.map((slug) => ({ slug, name: slugToDisplayName(slug) }));
  }
  if (limitCities && cities.length > limitCities) {
    return cities.slice(0, limitCities);
  }
  return cities;
}

function matchesBanned(text) {
  const lc = (text || '').toLowerCase();
  return BANNED_WORDS.some((w) => lc.includes(w));
}

function normalizePexelsPhoto(photo, query) {
  return {
    source: 'pexels',
    id: String(photo.id),
    pageUrl: String(photo.url),
    downloadUrl: String(photo.src?.original || photo.src?.large2x || photo.src?.large || ''),
    width: Number(photo.width) || 0,
    height: Number(photo.height) || 0,
    title: String(photo.alt || ''),
    tags: [],
    author: String(photo.photographer || ''),
    license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
    query,
  };
}

function normalizeUnsplashPhoto(photo, query) {
  const tags = Array.isArray(photo.tags) ? photo.tags.map((t) => String(t.title || '')).filter(Boolean) : [];
  return {
    source: 'unsplash',
    id: String(photo.id),
    pageUrl: String(photo.links?.html || `https://unsplash.com/photos/${photo.id}`),
    downloadUrl: String(photo.urls?.raw || photo.urls?.full || photo.urls?.regular || ''),
    width: Number(photo.width) || 0,
    height: Number(photo.height) || 0,
    title: String(photo.description || photo.alt_description || ''),
    tags,
    author: String(photo.user?.name || ''),
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    query,
  };
}

function normalizePixabayPhoto(photo, query) {
  const tags = String(photo.tags || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    source: 'pixabay',
    id: String(photo.id),
    pageUrl: String(photo.pageURL || ''),
    downloadUrl: String(photo.largeImageURL || ''),
    width: Number(photo.imageWidth) || 0,
    height: Number(photo.imageHeight) || 0,
    title: '',
    tags,
    author: String(photo.user || ''),
    license: 'Pixabay License',
    licenseUrl: 'https://pixabay.com/service/license/',
    query,
  };
}

async function searchPexels(query, perPage) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', String(perPage));
  const res = await fetch(url, {
    headers: {
      Authorization: key,
    },
  });
  if (!res.ok) {
    console.warn('[pexels] search failed', res.status);
    return [];
  }
  const json = await res.json();
  if (!Array.isArray(json.photos)) return [];
  return json.photos.map((p) => normalizePexelsPhoto(p, query));
}

async function searchUnsplash(query, perPage) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('client_id', key);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('[unsplash] search failed', res.status);
    return [];
  }
  const json = await res.json();
  if (!Array.isArray(json.results)) return [];
  return json.results.map((p) => normalizeUnsplashPhoto(p, query));
}

async function searchPixabay(query, perPage) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', key);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', 'horizontal');
  url.searchParams.set('per_page', String(perPage));
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('[pixabay] search failed', res.status);
    return [];
  }
  const json = await res.json();
  if (!Array.isArray(json.hits)) return [];
  return json.hits.map((p) => normalizePixabayPhoto(p, query));
}

function filterAndMergeCandidates(arrays, perSlot) {
  const pool = [];
  const seen = new Set();
  for (const list of arrays) {
    for (const item of list) {
      if (!item.downloadUrl) continue;
      if (item.width < MIN_WIDTH) continue;
      if (item.width < item.height) continue;
      const text = `${item.title || ''} ${Array.isArray(item.tags) ? item.tags.join(' ') : ''}`;
      if (matchesBanned(text)) continue;
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(item);
      if (pool.length >= perSlot * 3) {
        // небольшой запас
        return pool;
      }
    }
  }
  return pool;
}

async function downloadFile(url, targetPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${url} → HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, buf);
}

async function processSlot({ citySlug, displayName, slot, perSlot, force }) {
  const baseDir =
    citySlug === '__homepage__'
      ? path.join(ASSETS_SRC_ROOT, 'homepage', 'hero')
      : path.join(ASSETS_SRC_ROOT, 'cities', citySlug, slot);
  const candidatesDir = path.join(baseDir, 'candidates');
  const candidatesJsonPath = path.join(candidatesDir, 'candidates.json');

  if (!force && fs.existsSync(candidatesDir)) {
    const existing = fs.readdirSync(candidatesDir).filter((f) => f.toLowerCase().endsWith('.jpg'));
    if (existing.length >= perSlot) {
      return { downloaded: 0, skipped: true };
    }
  }

  ensureDir(candidatesDir);

  const queries =
    citySlug === '__homepage__'
      ? [
          'tour boats river city aerial panorama',
          'river cruise skyline night city',
          'city river sunset aerial panorama',
        ]
      : [
          `${displayName} skyline aerial`,
          `${displayName} city panorama`,
          `${displayName} river skyline`,
          `${displayName} old town panorama`,
        ];

  const perQuery = Math.max(perSlot * 3, 30);
  const allByPriority = [];

  for (const q of queries) {
    const [pexels, unsplash, pixabay] = await Promise.all([
      searchPexels(q, perQuery),
      searchUnsplash(q, perQuery),
      searchPixabay(q, perQuery),
    ]);
    // Приоритет: Pexels → Unsplash → Pixabay
    allByPriority.push(pexels, unsplash, pixabay);
  }

  const pool = filterAndMergeCandidates(allByPriority, perSlot);
  if (!pool.length) {
    return { downloaded: 0, skipped: false, notEnough: true };
  }

  const selected = pool.slice(0, perSlot);
  const itemsMeta = [];
  let index = 0;

  for (const item of selected) {
    index += 1;
    const indexStr = String(index).padStart(2, '0');
    const ext = '.jpg';
    const fileName = `${indexStr}__${item.source}__${item.id}${ext}`;
    const targetPath = path.join(candidatesDir, fileName);
    try {
      await downloadFile(item.downloadUrl, targetPath);
      itemsMeta.push({
        fileName,
        source: item.source,
        id: item.id,
        pageUrl: item.pageUrl,
        downloadUrl: item.downloadUrl,
        author: item.author,
        license: item.license,
        licenseUrl: item.licenseUrl,
        width: item.width,
        height: item.height,
        query: item.query,
      });
    } catch (e) {
      console.warn(`[image-candidates] failed to download ${item.downloadUrl}: ${(e && e.message) || e}`);
    }
  }

  const existingMeta = fs.existsSync(candidatesJsonPath)
    ? JSON.parse(fs.readFileSync(candidatesJsonPath, 'utf8'))
    : { items: [] };
  const merged = Array.isArray(existingMeta.items) ? existingMeta.items : [];
  for (const m of itemsMeta) {
    if (!merged.find((x) => x.fileName === m.fileName)) {
      merged.push(m);
    }
  }
  fs.writeFileSync(candidatesJsonPath, `${JSON.stringify({ items: merged }, null, 2)}\n`, 'utf8');

  return { downloaded: itemsMeta.length, skipped: false, notEnough: itemsMeta.length < perSlot };
}

async function main() {
  const args = parseArgs();
  console.log(
    `[image-candidates] start (perSlot=${args.perSlot}, concurrency=${args.concurrency}, force=${args.force})`,
  );

  const cities = await getCities(args.limitCities);
  if (!cities.length) {
    console.error('[image-candidates] no cities found');
    process.exit(1);
  }

  const tasks = [
    { citySlug: '__homepage__', displayName: 'Homepage', slots: ['hero'] },
    ...cities.map((c) => ({ citySlug: c.slug, displayName: c.name, slots: ['hero', 'card'] })),
  ];

  let processed = 0;
  const summary = [];
  let active = 0;
  let index = 0;

  async function runNext() {
    if (index >= tasks.length) return;
    const task = tasks[index++];
    active += 1;
    const citySummary = { citySlug: task.citySlug, hero: null, card: null };
    try {
      for (const slot of task.slots) {
        const res = await processSlot({
          citySlug: task.citySlug,
          displayName: task.displayName,
          slot,
          perSlot: args.perSlot,
          force: args.force,
        });
        if (slot === 'hero') citySummary.hero = res;
        if (slot === 'card') citySummary.card = res;
      }
    } catch (e) {
      console.error(
        `[image-candidates] error for ${task.citySlug}:`,
        (e && e.message) || e,
      );
    } finally {
      summary.push(citySummary);
      processed += 1;
      active -= 1;
      if (index < tasks.length) {
        await runNext();
      }
    }
  }

  const runners = [];
  const conc = Math.min(args.concurrency, tasks.length);
  for (let i = 0; i < conc; i += 1) {
    runners.push(runNext());
  }
  await Promise.all(runners);

  const todo = [];
  for (const s of summary) {
    const slug = s.citySlug;
    const heroNotEnough = s.hero && s.hero.notEnough;
    const cardNotEnough = s.card && s.card.notEnough;
    if (heroNotEnough || cardNotEnough) {
      todo.push({
        slug,
        hero: s.hero,
        card: s.card,
      });
    }
  }

  console.log('');
  console.log(`[image-candidates] processed ${processed} entries (including homepage).`);
  if (todo.length) {
    console.log('[image-candidates] not enough candidates for:');
    for (const t of todo) {
      console.log(
        `  - ${t.slug}: hero=${t.hero ? t.hero.downloaded : 0}/${args.perSlot}, card=${t.card ? t.card.downloaded : 0}/${args.perSlot}`,
      );
    }
  } else {
    console.log('[image-candidates] all cities have at least requested number of candidates (or existing files).');
  }
}

main().catch((e) => {
  console.error('[image-candidates] fatal error', e);
  process.exit(1);
});

