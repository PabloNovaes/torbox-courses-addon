/**
 * Transforma os arquivos do TorBox numa biblioteca de séries:
 *
 *   <Curso>/<NN - Módulo>/<Curso> - S03E01 - 006 - Aula.mp4
 *     série = pasta do curso · temporada = SxxExx ou número da pasta · episódio = SxxExx ou ordem
 *
 * Funciona com os nomes no padrão SxxExx (gerados pelo `npm run organize` do downloader)
 * e também só com pastas numeradas ("03 - Módulo"), numerando os episódios pela ordem.
 */
import { listAll } from './torbox.js';

const VIDEO_EXT = /\.(mp4|mkv|m4v|webm|mov|avi)$/i;
const SXXEXX = /^(.*?)\s*-\s*S(\d{1,3})E(\d{1,4})\s*-\s*(.+)\.\w+$/i;
const NUMBERED_DIR = /^(\d{1,3})\s*-\s*(.+)$/;
const CACHE_MS = 5 * 60 * 1000;

let cache = { at: 0, library: null };

export async function getLibrary(apiKey) {
  if (cache.library && Date.now() - cache.at < CACHE_MS) return cache.library;
  const items = await listAll(apiKey);
  cache = { at: Date.now(), library: buildLibrary(items) };
  return cache.library;
}

export function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Caminho completo do arquivo dentro do item ("Curso/Módulo/arquivo.mp4"). */
function filePath(item, file) {
  const raw = file.name || file.absolute_path || file.short_name || '';
  const parts = raw.split('/').filter(Boolean);
  // Alguns itens trazem só o nome do arquivo: usa o nome do item como pasta raiz
  if (parts.length === 1 && item.name) parts.unshift(item.name);
  return parts;
}

export function buildLibrary(items) {
  const series = new Map(); // id -> { id, name, seasons: Map<season, { name, episodes: [] }> }

  for (const item of items) {
    if (item.download_finished === false || !Array.isArray(item.files)) continue;

    for (const file of item.files) {
      const parts = filePath(item, file);
      const fileName = parts.at(-1);
      if (!fileName || !VIDEO_EXT.test(fileName)) continue;

      const dirs = parts.slice(0, -1);
      const moduleDir = dirs.at(-1) ?? '';
      const moduleMatch = moduleDir.match(NUMBERED_DIR);
      const tagged = fileName.match(SXXEXX);

      // Série: a pasta acima do módulo; sem ela, o prefixo do SxxExx ou o nome do item
      const showName =
        (moduleMatch ? dirs.at(-2) : dirs.at(-1)) || tagged?.[1] || item.name || 'Curso';
      const season = tagged ? Number(tagged[2]) : moduleMatch ? Number(moduleMatch[1]) : 1;
      const episode = tagged ? Number(tagged[3]) : null; // sem SxxExx: numerado depois, pela ordem
      const title = (tagged ? tagged[4] : fileName.replace(/\.\w+$/, '')).trim();

      // Agrupa pelo prefixo do SxxExx quando existe: assim o mesmo curso enviado em itens
      // separados (ex.: um por módulo) vira uma série só. Exibe o nome mais completo visto.
      const id = slug(tagged?.[1] || showName);
      if (!series.has(id)) series.set(id, { id, name: showName, seasons: new Map() });
      const show = series.get(id);
      if (showName.length > show.name.length) show.name = showName;
      if (!show.seasons.has(season)) {
        show.seasons.set(season, { name: moduleMatch ? moduleMatch[2] : moduleDir, episodes: [] });
      }
      show.seasons.get(season).episodes.push({
        episode,
        title,
        sortKey: fileName,
        type: item._type,
        itemId: item.id,
        fileId: file.id,
        size: file.size,
      });
    }
  }

  // Ordena e numera; remove duplicados (mesmo episódio em mais de um item)
  for (const show of series.values()) {
    for (const season of show.seasons.values()) {
      season.episodes.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0) || a.sortKey.localeCompare(b.sortKey, 'pt', { numeric: true }));
      season.episodes.forEach((ep, i) => (ep.episode ??= i + 1));
      const seen = new Set();
      season.episodes = season.episodes.filter(ep => !seen.has(ep.episode) && seen.add(ep.episode));
    }
    show.seasons = new Map([...show.seasons].sort(([a], [b]) => a - b));
  }

  return series;
}

export function findEpisode(library, seriesId, season, episode) {
  return library.get(seriesId)?.seasons.get(season)?.episodes.find(ep => ep.episode === episode);
}
