/**
 * Servidor HTTP do addon. A URL de instalação inclui um segredo
 * (http://host:porta/<ADDON_SECRET>/manifest.json) para que só você consiga usá-lo.
 */
import express from 'express';
import sdk from 'stremio-addon-sdk';
import { createAddon } from './addon.js';
import { ASSETS_DIR, BASE_PLACEHOLDER } from './artwork.js';

// 7000 e 5000 ficam ocupadas no macOS pelo Receptor AirPlay
const { TORBOX_API_KEY, ADDON_SECRET, PORT = 7700 } = process.env;
if (!TORBOX_API_KEY || !ADDON_SECRET) {
  console.error('Defina TORBOX_API_KEY e ADDON_SECRET no arquivo .env (veja .env.example).');
  process.exit(1);
}

const app = express();
// Atrás do túnel (cloudflared), usa o X-Forwarded-Proto para gerar URLs https
app.set('trust proxy', true);

const base = `/${ADDON_SECRET}`;

// Log das requisições (sem o segredo), para ver o que o app está pedindo
app.use(base, (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const route = decodeURIComponent(req.originalUrl.slice(base.length)).split('?')[0];
    console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${res.statusCode}  ${route}  ${Date.now() - started}ms`);
  });
  next();
});
// Troca o marcador das URLs de imagem pelo endereço desta requisição (local ou túnel https)
app.use(base, (req, res, next) => {
  const origin = `${req.protocol}://${req.get('host')}${base}`;
  const end = res.end.bind(res);
  res.end = (chunk, ...rest) => {
    if (chunk != null && /json/.test(res.getHeader('Content-Type') ?? '')) {
      chunk = String(chunk).replaceAll(BASE_PLACEHOLDER, origin);
      res.removeHeader('Content-Length');
    }
    return end(chunk, ...rest);
  };
  next();
});
app.use(`${base}/assets`, express.static(ASSETS_DIR, { maxAge: '7d' }));
app.use(base, sdk.getRouter(createAddon(TORBOX_API_KEY)));
app.get('/', (_req, res) => res.type('text').send('ok'));

app.listen(PORT, err => {
  if (err) {
    console.error(err.code === 'EADDRINUSE'
      ? `A porta ${PORT} já está em uso por outro programa. Troque PORT no .env (ex.: 7700).`
      : `Não foi possível iniciar o servidor: ${err.message}`);
    process.exit(1);
  }
  console.log(`Addon rodando. URL de instalação (local):`);
  console.log(`  http://localhost:${PORT}/${ADDON_SECRET}/manifest.json`);
  console.log(`Para o Nuvio no celular/TV, exponha com HTTPS (ex.: cloudflared) e use:`);
  console.log(`  https://<seu-endereco>/${ADDON_SECRET}/manifest.json`);
});
