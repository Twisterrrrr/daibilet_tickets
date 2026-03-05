import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ASSETS_SRC_ROOT = path.join(ROOT, 'packages', 'frontend', 'assets-src');
const FRONTEND_PUBLIC = path.join(ROOT, 'packages', 'frontend', 'public');
const IMAGES_JSON_PATH = path.join(FRONTEND_PUBLIC, 'assets', 'images', 'images.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    city: undefined,
    heroFile: undefined,
    cardFile: undefined,
    homepageHeroFile: undefined,
  };
  for (const arg of args) {
    if (arg.startsWith('--city=')) {
      result.city = arg.split('=')[1];
    } else if (arg.startsWith('--hero=')) {
      result.heroFile = arg.split('=')[1];
    } else if (arg.startsWith('--card=')) {
      result.cardFile = arg.split('=')[1];
    } else if (arg.startsWith('--homepageHero=')) {
      result.homepageHeroFile = arg.split('=')[1];
    }
  }
  return result;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadImagesConfig() {
  if (!fs.existsSync(IMAGES_JSON_PATH)) {
    throw new Error(`images.json not found at ${IMAGES_JSON_PATH}`);
  }
  const raw = fs.readFileSync(IMAGES_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveImagesConfig(json) {
  fs.writeFileSync(IMAGES_JSON_PATH, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function loadCandidatesMeta(candidatesDir) {
  const jsonPath = path.join(candidatesDir, 'candidates.json');
  if (!fs.existsSync(jsonPath)) {
    return { items: [] };
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed.items)) return parsed;
  if (Array.isArray(parsed)) return { items: parsed };
  return { items: [] };
}

function selectCandidate(candidatesDir, fileName) {
  const meta = loadCandidatesMeta(candidatesDir);
  const item = meta.items.find((x) => x.fileName === fileName);
  if (!item) {
    throw new Error(`Candidate "${fileName}" not found in ${candidatesDir}`);
  }
  const srcPath = path.join(candidatesDir, fileName);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file not found: ${srcPath}`);
  }
  return { item, srcPath };
}

function updateCityEntry(cfg, slug, fields) {
  if (!cfg[slug]) cfg[slug] = {};
  const entry = cfg[slug];
  if (fields.heroPath) {
    entry.hero = entry.hero || fields.heroWebPath;
    entry.localHeroSourcePath = fields.heroPath;
  }
  if (fields.cardPath) {
    entry.card = entry.card || fields.cardWebPath;
    entry.localCardSourcePath = fields.cardPath;
  }
  if (fields.meta) {
    entry.source = fields.meta.source || entry.source || '';
    entry.author = fields.meta.author || entry.author || '';
    entry.license = fields.meta.license || entry.license || '';
    entry.licenseUrl = fields.meta.licenseUrl || entry.licenseUrl || '';
    entry.pageUrl = fields.meta.pageUrl || entry.pageUrl || '';
    entry.downloadUrl = fields.meta.downloadUrl || entry.downloadUrl || '';
  }
}

async function main() {
  const args = parseArgs();
  if (!args.city && !args.homepageHeroFile) {
    console.error(
      'Usage:\n  node scripts/select-image.mjs --city=saint-petersburg --hero=01__pexels__123.jpg --card=03__unsplash__abc.jpg\n  node scripts/select-image.mjs --homepageHero=01__pexels__xyz.jpg',
    );
    process.exit(1);
  }

  const cfg = loadImagesConfig();

  if (args.homepageHeroFile) {
    const baseDir = path.join(ASSETS_SRC_ROOT, 'homepage', 'hero');
    const candidatesDir = path.join(baseDir, 'candidates');
    const selectedDir = path.join(baseDir, 'selected');
    ensureDir(selectedDir);

    const { item, srcPath } = selectCandidate(candidatesDir, args.homepageHeroFile);
    const targetPath = path.join(selectedDir, 'hero-original.jpg');
    fs.copyFileSync(srcPath, targetPath);

    if (!cfg.__homepage__) cfg.__homepage__ = {};
    cfg.__homepage__.hero = cfg.__homepage__.hero || '/assets/images/hero/hero-main.webp';
    cfg.__homepage__.localSourcePath =
      cfg.__homepage__.localSourcePath || path.relative(ROOT, targetPath).replace(/\\/g, '/');
    cfg.__homepage__.source = item.source || cfg.__homepage__.source || '';
    cfg.__homepage__.author = item.author || cfg.__homepage__.author || '';
    cfg.__homepage__.license = item.license || cfg.__homepage__.license || '';
    cfg.__homepage__.licenseUrl = item.licenseUrl || cfg.__homepage__.licenseUrl || '';
    cfg.__homepage__.pageUrl = item.pageUrl || cfg.__homepage__.pageUrl || '';
    cfg.__homepage__.downloadUrl = item.downloadUrl || cfg.__homepage__.downloadUrl || '';

    saveImagesConfig(cfg);
    console.log(
      `[select-image] homepage hero selected: ${args.homepageHeroFile} → ${path.relative(
        ROOT,
        targetPath,
      )}, images.json updated.`,
    );
    return;
  }

  const slug = args.city;
  if (!slug) {
    console.error('Missing --city argument');
    process.exit(1);
  }

  const cityDir = path.join(ASSETS_SRC_ROOT, 'cities', slug);

  let heroMeta = null;
  let cardMeta = null;

  if (args.heroFile) {
    const heroCandidatesDir = path.join(cityDir, 'hero', 'candidates');
    const heroSelectedDir = path.join(cityDir, 'hero', 'selected');
    ensureDir(heroSelectedDir);
    const res = selectCandidate(heroCandidatesDir, args.heroFile);
    const targetPath = path.join(heroSelectedDir, 'hero-original.jpg');
    fs.copyFileSync(res.srcPath, targetPath);
    heroMeta = {
      localPath: path.relative(ROOT, targetPath).replace(/\\/g, '/'),
      webPath: `/assets/images/cities/${slug}/hero.webp`,
      item: res.item,
    };
    console.log(
      `[select-image] city=${slug} hero selected: ${args.heroFile} → ${path.relative(
        ROOT,
        targetPath,
      )}`,
    );
  }

  if (args.cardFile) {
    const cardCandidatesDir = path.join(cityDir, 'card', 'candidates');
    const cardSelectedDir = path.join(cityDir, 'card', 'selected');
    ensureDir(cardSelectedDir);
    const res = selectCandidate(cardCandidatesDir, args.cardFile);
    const targetPath = path.join(cardSelectedDir, 'card-original.jpg');
    fs.copyFileSync(res.srcPath, targetPath);
    cardMeta = {
      localPath: path.relative(ROOT, targetPath).replace(/\\/g, '/'),
      webPath: `/assets/images/cities/${slug}/card.webp`,
      item: res.item,
    };
    console.log(
      `[select-image] city=${slug} card selected: ${args.cardFile} → ${path.relative(
        ROOT,
        targetPath,
      )}`,
    );
  }

  if (!heroMeta && !cardMeta) {
    console.error('Nothing to select: provide --hero and/or --card');
    process.exit(1);
  }

  const metaForFields = heroMeta || cardMeta;
  updateCityEntry(cfg, slug, {
    heroPath: heroMeta?.localPath,
    heroWebPath: heroMeta?.webPath,
    cardPath: cardMeta?.localPath,
    cardWebPath: cardMeta?.webPath,
    meta: {
      source: metaForFields.item.source,
      author: metaForFields.item.author,
      license: metaForFields.item.license,
      licenseUrl: metaForFields.item.licenseUrl,
      pageUrl: metaForFields.item.pageUrl,
      downloadUrl: metaForFields.item.downloadUrl,
    },
  });

  saveImagesConfig(cfg);
  console.log(
    `[select-image] images.json updated for city=${slug} (localHeroSourcePath/localCardSourcePath + meta).`,
  );
}

main().catch((e) => {
  console.error('[select-image] fatal error', e);
  process.exit(1);
});

