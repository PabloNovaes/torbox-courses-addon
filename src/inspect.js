/**
 * Mostra como os arquivos do seu TorBox serão interpretados (séries, temporadas, episódios),
 * sem precisar abrir o Nuvio. Use antes de instalar o addon.
 *
 *   npm run inspect            resumo por série/temporada
 *   npm run inspect -- --raw   também lista os itens e os primeiros arquivos como vêm da API
 */
import { listAll } from './torbox.js';
import { buildLibrary } from './library.js';

const { TORBOX_API_KEY } = process.env;
if (!TORBOX_API_KEY) {
  console.error('Defina TORBOX_API_KEY no arquivo .env.');
  process.exit(1);
}

const items = await listAll(TORBOX_API_KEY);
console.log(`${items.length} itens no TorBox\n`);

if (process.argv.includes('--raw')) {
  for (const item of items) {
    console.log(`[${item._type}] id=${item.id} "${item.name}" · ${item.files?.length ?? 0} arquivos · finished=${item.download_finished}`);
    for (const f of (item.files ?? []).slice(0, 3)) {
      console.log(`    file id=${f.id} name="${f.name}" short_name="${f.short_name}"`);
    }
  }
  console.log();
}

const library = buildLibrary(items);
if (!library.size) console.log('Nenhum vídeo reconhecido. Rode com --raw para ver como os arquivos chegam da API.');

for (const show of library.values()) {
  const total = [...show.seasons.values()].reduce((n, s) => n + s.episodes.length, 0);
  console.log(`📺 ${show.name}  (${show.seasons.size} temporadas, ${total} episódios)  id=tbcourse:${show.id}`);
  for (const [season, { name, episodes }] of show.seasons) {
    const first = episodes[0];
    console.log(`   S${String(season).padStart(2, '0')} · ${String(episodes.length).padStart(2)} ep. · ${name}   ex.: E${String(first.episode).padStart(2, '0')} ${first.title}`);
  }
  console.log();
}
