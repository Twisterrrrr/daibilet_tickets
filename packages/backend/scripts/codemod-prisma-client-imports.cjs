const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', 'src');
const newImportSource = '@/prisma-client';

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.lstatSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith('.ts')) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const updated = content.replace(/from\s+['"]@prisma\/client['"]/g, `from '${newImportSource}'`);
    if (updated !== content) {
      fs.writeFileSync(fullPath, updated);
      process.stdout.write(`Updated: ${path.relative(path.join(__dirname, '..'), fullPath)}\n`);
    }
  }
}

walk(projectRoot);

