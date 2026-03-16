const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../packages/backend/tsconfig.json');
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.compilerOptions.paths['@daibilet/shared'] = ['../shared'];
j.compilerOptions.paths['@daibilet/shared/*'] = ['../shared/*'];
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('Patched', p);
