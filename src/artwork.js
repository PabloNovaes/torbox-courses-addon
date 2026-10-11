/**
 * Imagens dos cursos: public/assets/<id-da-série>/poster.(jpg|png|webp) e background.(...).
 * O id da série aparece no `npm run inspect` (ex.: tbcourse:curso-de-macrame → curso-de-macrame).
 *
 * As imagens são servidas como arquivos estáticos (na Vercel, pelo CDN a partir de public/).
 * O addon só consulta o índice gerado por `npm run build` (src/artwork-manifest.json).
 *
 * O protocolo exige URLs absolutas, mas o endereço muda (localhost, IP da rede, Vercel...).
 * Por isso as URLs saem com o marcador BASE_PLACEHOLDER, que o servidor troca pela origem
 * da requisição ao enviar a resposta.
 */
import path from 'node:path';
import manifest from './artwork-manifest.json' with { type: 'json' };

export const PUBLIC_DIR = path.resolve(import.meta.dirname, '..', 'public');
export const BASE_PLACEHOLDER = '__ADDON_BASE__';

/** { poster, background } com URLs absolutas, só para as imagens que existem. */
export function artworkFor(seriesId) {
  const art = {};
  for (const [kind, rel] of Object.entries(manifest[seriesId] ?? {})) {
    art[kind] = `${BASE_PLACEHOLDER}${rel}`;
  }
  return art;
}
