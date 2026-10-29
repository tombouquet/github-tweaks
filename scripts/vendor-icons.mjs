// Copies file icons from the material-icon-theme npm package into public/icons/ and
// writes src/lib/file-icons-data.json. Run from the repo root:
//   npm pack material-icon-theme && tar xzf material-icon-theme-*.tgz
//   node scripts/vendor-icons.mjs package
import fs from 'node:fs';
import path from 'node:path';

const pkg = path.resolve(process.argv[2]);
const theme = JSON.parse(fs.readFileSync(path.join(pkg, 'dist/material-icons.json'), 'utf8'));
const used = new Set();
const file = (id) => {
  const name = path.basename(theme.iconDefinitions[id].iconPath, '.svg');
  used.add(name);
  return name;
};
const pick = (map = {}) => Object.fromEntries(Object.entries(map).map(([key, id]) => [key.toLowerCase(), file(id)]));

const data = {
  file: file(theme.file),
  names: pick(theme.fileNames),
  exts: pick(theme.fileExtensions),
  light: { names: pick(theme.light.fileNames), exts: pick(theme.light.fileExtensions) },
};

const out = 'public/icons';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of used) fs.copyFileSync(path.join(pkg, 'icons', `${name}.svg`), path.join(out, `${name}.svg`));
fs.copyFileSync(path.join(pkg, 'LICENSE'), path.join(out, 'LICENSE'));
// JSON has no comments, so the material-icon-theme version (MIT) goes in a field.
const { version } = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
fs.writeFileSync('src/lib/file-icons-data.json', `${JSON.stringify({ source: `material-icon-theme ${version}`, ...data })}\n`);
console.log(`${used.size} icons`);
