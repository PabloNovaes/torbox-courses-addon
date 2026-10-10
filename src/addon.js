/**
 * Addon no protocolo Stremio (compatível com Nuvio): cada curso no TorBox vira uma série,
 * cada módulo uma temporada e cada aula um episódio.
 *
 * IDs: série  "tbcourse:<slug-do-curso>"
 *      vídeo  "tbcourse:<slug-do-curso>:<temporada>:<episódio>"
 */
import sdk from 'stremio-addon-sdk';
import { getLibrary } from './library.js';
import { streamUrl } from './torbox.js';
import { artworkFor } from './artwork.js';

const { addonBuilder } = sdk;
const PREFIX = 'tbcourse:';
// Data fixa: alguns clientes escondem episódios sem data de lançamento
const RELEASED = '2024-01-01T00:00:00.000Z';

const pad = n => String(n).padStart(2, '0');

export function createAddon(apiKey) {
  const builder = new addonBuilder({
    id: 'dev.pablonovaes.torbox-courses',
    version: '1.0.0',
    name: 'Meus Cursos (TorBox)',
    description: 'Cursos salvos no TorBox como séries: módulos = temporadas, aulas = episódios.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    idPrefixes: [PREFIX],
    catalogs: [{ type: 'series', id: 'torbox-courses', name: 'Meus Cursos' }],
    behaviorHints: { configurable: false },
  });

  builder.defineCatalogHandler(async ({ type, id }) => {
    if (type !== 'series' || id !== 'torbox-courses') return { metas: [] };
    const library = await getLibrary(apiKey);
    const metas = [...library.values()].map(show => ({
      id: PREFIX + show.id,
      type: 'series',
      name: show.name,
      description: summary(show),
      posterShape: 'poster',
      ...artworkFor(show.id),
    }));
    return { metas, cacheMaxAge: 300 };
  });

  builder.defineMetaHandler(async ({ type, id }) => {
    if (type !== 'series' || !id.startsWith(PREFIX)) return { meta: null };
    const library = await getLibrary(apiKey);
    const show = library.get(id.slice(PREFIX.length));
    if (!show) return { meta: null };

    const videos = [];
    for (const [season, { name: moduleName, episodes }] of show.seasons) {
      for (const ep of episodes) {
        videos.push({
          id: `${id}:${season}:${ep.episode}`,
          title: ep.title,
          season,
          episode: ep.episode,
          released: RELEASED,
          overview: moduleName ? `Módulo: ${moduleName}` : undefined,
        });
      }
    }

    return {
      meta: { id, type: 'series', name: show.name, description: summary(show), ...artworkFor(show.id), videos },
      cacheMaxAge: 300,
    };
  });

  builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== 'series' || !id.startsWith(PREFIX)) return { streams: [] };
    const [seriesId, s, e] = id.slice(PREFIX.length).split(':');
    const library = await getLibrary(apiKey);
    const ep = library.get(seriesId)?.seasons.get(Number(s))?.episodes.find(x => x.episode === Number(e));
    if (!ep) return { streams: [] };

    return {
      streams: [
        {
          name: 'TorBox',
          title: `S${pad(s)}E${pad(e)} · ${ep.title}${ep.size ? `\n💾 ${(ep.size / 1e6).toFixed(0)} MB` : ''}`,
          url: streamUrl(apiKey, ep.type, ep.itemId, ep.fileId),
          // Mesmo bingeGroup: o player emenda o próximo episódio automaticamente
          behaviorHints: { bingeGroup: `tbcourse-${seriesId}` },
        },
      ],
    };
  });

  return builder.getInterface();
}

function summary(show) {
  const episodes = [...show.seasons.values()].reduce((n, s) => n + s.episodes.length, 0);
  return `${show.seasons.size} módulos · ${episodes} aulas`;
}
