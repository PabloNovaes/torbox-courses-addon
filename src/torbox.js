/**
 * Cliente mínimo da API do TorBox: lista os itens da conta (torrents, web downloads, usenet)
 * e monta o link de streaming de um arquivo.
 */

const API = 'https://api.torbox.app/v1/api';

// Campo de ID que o requestdl espera para cada tipo de item
export const ID_FIELD = { torrents: 'torrent_id', webdl: 'web_id', usenet: 'usenet_id' };

export async function listItems(apiKey, type) {
  const url = `${API}/${type}/mylist?bypass_cache=true&limit=1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`TorBox ${type}/mylist respondeu HTTP ${res.status}`);
  const body = await res.json();
  if (body.success === false) throw new Error(`TorBox ${type}/mylist: ${body.detail || body.error}`);
  return Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
}

/** Todos os itens da conta, com o tipo anotado em cada um. Um tipo que falhar não derruba os outros. */
export async function listAll(apiKey) {
  const types = Object.keys(ID_FIELD);
  const results = await Promise.allSettled(types.map(t => listItems(apiKey, t)));
  return results.flatMap((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[torbox] ${r.reason.message}`);
      return [];
    }
    return r.value.map(item => ({ ...item, _type: types[i] }));
  });
}

/**
 * Link permanente do arquivo: com redirect=true o TorBox redireciona para o CDN na hora
 * do play, sem precisar gerar (e renovar) links via API a cada episódio.
 */
export function streamUrl(apiKey, type, itemId, fileId) {
  const params = new URLSearchParams({ token: apiKey, [ID_FIELD[type]]: itemId, file_id: fileId, redirect: 'true' });
  return `${API}/${type}/requestdl?${params}`;
}
