/**
 * Imagens dos cursos: assets/<id-da-série>/poster.(jpg|png|webp) e background.(jpg|png|webp).
 * O id da série aparece no `npm run inspect` (ex.: tbcourse:curso-de-macrame → curso-de-macrame).
 *
 * O protocolo exige URLs absolutas, mas o endereço muda (localhost, túnel do Cloudflare...).
 * Por isso as URLs saem com o marcador BASE_PLACEHOLDER, que o servidor troca pelo endereço
 * da requisição ao enviar a resposta.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ASSETS_DIR = path.resolve(import.meta.dirname, '..', 'assets');
export const BASE_PLACEHOLDER = '__ADDON_BASE__';

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function findAsset(seriesId, kind) {
  for (const ext of EXTENSIONS) {
    const file = path.join(ASSETS_DIR, seriesId, `${kind}.${ext}`);
    if (fs.existsSync(file)) {
      // ?v=<data de modificação>: trocar a imagem invalida o cache do app
      return `${seriesId}/${kind}.${ext}?v=${Math.round(fs.statSync(file).mtimeMs)}`;
    }
  }
  return null;
}

/** { poster, background } com URLs absolutas, só para as imagens que existem. */
export function artworkFor(seriesId) {
  const art = {};
  for (const kind of ['poster', 'background']) {
    const rel = findAsset(seriesId, kind);
    if (rel) art[kind] = `${BASE_PLACEHOLDER}/assets/${rel}`;
  }
  return art;
}
