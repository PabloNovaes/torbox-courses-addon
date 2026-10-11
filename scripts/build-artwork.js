/**
 * Gera src/artwork-manifest.json a partir de public/assets/<id-da-série>/{poster,background}.*
 *
 * Na Vercel a pasta public/ é servida pelo CDN e não vai junto com a função serverless,
 * então o addon não pode procurar as imagens no disco em tempo de execução: usa este índice.
 * Rode `npm run build` depois de adicionar ou trocar imagens (a Vercel roda sozinha no deploy).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const OUT = path.join(ROOT, 'src', 'artwork-manifest.json');
const KINDS = ['poster', 'background'];
const EXT = /\.(jpe?g|png|webp)$/i;

const manifest = {};
for (const seriesId of fs.existsSync(ASSETS) ? fs.readdirSync(ASSETS) : []) {
  const dir = path.join(ASSETS, seriesId);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    const kind = path.parse(file).name;
    if (!KINDS.includes(kind) || !EXT.test(file)) continue;
    // ?v=<hash do conteúdo>: trocar a imagem invalida o cache dos apps
    const hash = crypto.createHash('md5').update(fs.readFileSync(path.join(dir, file))).digest('hex').slice(0, 8);
    (manifest[seriesId] ??= {})[kind] = `/assets/${seriesId}/${file}?v=${hash}`;
  }
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`artwork-manifest.json: ${Object.keys(manifest).length} série(s)`, manifest);
