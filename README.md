# torbox-courses-addon

Addon no protocolo Stremio (funciona no Nuvio) que mostra os cursos salvos no seu TorBox como séries:

```
<Curso>/<NN - Módulo>/<Curso> - S03E01 - 006 - Aula.mp4
   série      temporada              episódio
```

- **Série** = pasta do curso
- **Temporada** = `SxxExx` do arquivo, ou o número da pasta do módulo (`03 - ...` → S03)
- **Episódio** = `SxxExx` do arquivo, ou a ordem dos arquivos dentro da pasta

## Configuração

1. `npm install`
2. Preencha `TORBOX_API_KEY` no `.env` (chave em https://torbox.app/settings). O `ADDON_SECRET` já vem gerado.
3. Confira como seus arquivos serão lidos:
   ```bash
   npm run inspect          # séries, temporadas e episódios encontrados
   npm run inspect -- --raw # também mostra os itens como vêm da API
   ```
4. Suba o addon: `npm start`

## Imagens (capa e fundo)

Coloque as imagens em `public/assets/<id-da-série>/` com os nomes `poster.jpg` (capa, vertical 2:3)
e `background.jpg` (fundo, horizontal 16:9). O id aparece no `npm run inspect`
(ex.: `tbcourse:curso-de-macrame` → `public/assets/curso-de-macrame/`).

Depois rode `npm run build` (gera `src/artwork-manifest.json`) e faça commit. Na Vercel o build roda sozinho.

## Instalar no Nuvio

O Nuvio (celular/TV) precisa acessar o addon por HTTPS. O jeito mais simples é um túnel do Cloudflare:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:7700
```

Ele mostra um endereço `https://<algo>.trycloudflare.com`. No Nuvio, instale o addon pela URL:

```
https://<algo>.trycloudflare.com/<ADDON_SECRET>/manifest.json
```

O endereço do túnel rápido muda a cada execução. Para um endereço fixo, crie um túnel nomeado no Cloudflare ou hospede o addon num servidor.

## Segurança

- A URL de instalação contém o `ADDON_SECRET`: quem tiver a URL vê e assiste seus cursos.
- Os links de vídeo entregues ao player contêm a sua chave do TorBox (é como o TorBox autoriza o `requestdl`). Não compartilhe a URL do addon nem links de episódios.
