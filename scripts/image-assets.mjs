import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(new URL('../', import.meta.url).pathname);
const FRONTEND_PUBLIC = path.join(ROOT, 'packages', 'frontend', 'public');
const IMAGES_JSON_PATH = path.join(FRONTEND_PUBLIC, 'assets', 'images', 'images.json');
const REPORT_PATH = path.join(ROOT, 'docs', 'image-assets-report.md');

const TARGETS = {
  homepageHero: { width: 3200, height: 1800, maxKb: 400 },
  cityHero: { width: 3000, height: 1700, maxKb: 350 },
  cityCard: { width: 1600, height: 900, maxKb: 200 },
  og: { width: 1200, height: 630, maxKb: 300 },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runMagick(args) {
  // Требуется установленный ImageMagick (команда `magick` в PATH).
  return execFileSync('magick', args, { stdio: 'inherit' });
}

function convertToWebpAndResize(inputPath, outputPath, width, height) {
  ensureDir(path.dirname(outputPath));
  runMagick([inputPath, '-auto-orient', '-resize', `${width}x${height}^`, '-gravity', 'center', '-extent', `${width}x${height}`, '-quality', '85', outputPath]);
}

function createBlurPlaceholder(inputPath) {
  const tmpSmall = `${inputPath}.blur.tmp.webp`;
  runMagick([inputPath, '-auto-orient', '-resize', '32x32^', '-gravity', 'center', '-extent', '32x32', '-quality', '50', tmpSmall]);
  const buf = fs.readFileSync(tmpSmall);
  fs.unlinkSync(tmpSmall);
  const base64 = buf.toString('base64');
  return `data:image/webp;base64,${base64}`;
}

function getImageSize(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKb = Math.round(stats.size / 1024);
  let width = 0;
  let height = 0;
  try {
    const out = execFileSync('magick', ['identify', '-format', '%w %h', filePath], { encoding: 'utf8' }).trim();
    const [w, h] = out.split(' ').map((v) => parseInt(v, 10));
    width = w;
    height = h;
  } catch {
    // ignore
  }
  return { sizeKb, width, height };
}

function loadConfig() {
  if (!fs.existsSync(IMAGES_JSON_PATH)) {
    throw new Error(`images.json not found at ${IMAGES_JSON_PATH}`);
  }
  const raw = fs.readFileSync(IMAGES_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveConfig(json) {
  fs.writeFileSync(IMAGES_JSON_PATH, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function generateReport(entries) {
  const lines = [];
  lines.push('# Image Assets Report');
  lines.push('');
  lines.push('> Автоматически сгенерировано скриптом `scripts/image-assets.mjs`.');
  lines.push('');
  lines.push('| Город | Тип | Путь | Источник | Автор | Лицензия | Размер (KB) | Ш×В | Лимит (KB) |');
  lines.push('|-------|-----|------|----------|-------|----------|-------------|-----|-----------|');
  for (const row of entries) {
    lines.push(
      `| ${row.city} | ${row.kind} | \`${row.path}\` | ${row.source} | ${row.author} | ${row.license} | ${row.sizeKb} | ${row.width}×${row.height} | ${row.maxKb} |`,
    );
  }
  lines.push('');
  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const cfg = loadConfig();
  const reportRows = [];

  // Homepage hero
  if (cfg.__homepage__?.heroRemoteUrl) {
    const targetRel = cfg.__homepage__.hero || '/assets/images/hero/hero-main.webp';
    const targetAbs = path.join(FRONTEND_PUBLIC, targetRel.replace(/^\/+/, ''));
    ensureDir(path.dirname(targetAbs));
    // Ожидается, что исходник скачан вручную в tmp-папку и путь указан как localSourcePath.
    if (cfg.__homepage__.localSourcePath) {
      const srcAbs = path.isAbsolute(cfg.__homepage__.localSourcePath)
        ? cfg.__homepage__.localSourcePath
        : path.join(ROOT, cfg.__homepage__.localSourcePath);
      convertToWebpAndResize(srcAbs, targetAbs, TARGETS.homepageHero.width, TARGETS.homepageHero.height);
      cfg.__homepage__.hero = targetRel;
      cfg.__homepage__.blurDataUrl = createBlurPlaceholder(targetAbs);
      const meta = getImageSize(targetAbs);
      reportRows.push({
        city: 'homepage',
        kind: 'hero',
        path: targetRel,
        source: cfg.__homepage__.source || '',
        author: cfg.__homepage__.author || '',
        license: cfg.__homepage__.license || '',
        sizeKb: meta.sizeKb,
        width: meta.width,
        height: meta.height,
        maxKb: TARGETS.homepageHero.maxKb,
      });
    }
  }

  // Cities
  for (const [slug, entry] of Object.entries(cfg)) {
    if (slug === '__homepage__') continue;
    const cityEntry = entry;
    if (!cityEntry || typeof cityEntry !== 'object') continue;
    const localHeroSrc = cityEntry.localHeroSourcePath;
    const localCardSrc = cityEntry.localCardSourcePath;

    if (localHeroSrc) {
      const srcAbs = path.isAbsolute(localHeroSrc) ? localHeroSrc : path.join(ROOT, localHeroSrc);
      const targetRel = cityEntry.hero || `/assets/images/cities/${slug}/hero.webp`;
      const targetAbs = path.join(FRONTEND_PUBLIC, targetRel.replace(/^\/+/, ''));
      convertToWebpAndResize(srcAbs, targetAbs, TARGETS.cityHero.width, TARGETS.cityHero.height);
      cityEntry.hero = targetRel;
      cityEntry.blurDataUrl = createBlurPlaceholder(targetAbs);
      const meta = getImageSize(targetAbs);
      reportRows.push({
        city: slug,
        kind: 'hero',
        path: targetRel,
        source: cityEntry.source || '',
        author: cityEntry.author || '',
        license: cityEntry.license || '',
        sizeKb: meta.sizeKb,
        width: meta.width,
        height: meta.height,
        maxKb: TARGETS.cityHero.maxKb,
      });
    }

    if (localCardSrc) {
      const srcAbs = path.isAbsolute(localCardSrc) ? localCardSrc : path.join(ROOT, localCardSrc);
      const targetRel = cityEntry.card || `/assets/images/cities/${slug}/card.webp`;
      const targetAbs = path.join(FRONTEND_PUBLIC, targetRel.replace(/^\/+/, ''));
      convertToWebpAndResize(srcAbs, targetAbs, TARGETS.cityCard.width, TARGETS.cityCard.height);
      const meta = getImageSize(targetAbs);
      reportRows.push({
        city: slug,
        kind: 'card',
        path: targetRel,
        source: cityEntry.source || '',
        author: cityEntry.author || '',
        license: cityEntry.license || '',
        sizeKb: meta.sizeKb,
        width: meta.width,
        height: meta.height,
        maxKb: TARGETS.cityCard.maxKb,
      });
    }
  }

  saveConfig(cfg);
  generateReport(reportRows);
}

main();

