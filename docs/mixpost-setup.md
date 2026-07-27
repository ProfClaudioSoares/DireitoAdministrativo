# Subir o Mixpost e conectar o Instagram

Guia para colocar o **Mixpost Pro** no ar (self-hosted, Docker) e ligar ao
Estúdio de Conteúdo CS. O app usa a **API REST** do Mixpost para agendar
carrosséis no Instagram.

## ⚠ Pré-requisito: Mixpost **Pro** (não o Lite)

A API REST (`/api/...`) — criar posts, subir mídia, listar contas — é recurso do
**Mixpost Pro** (licença one-time, ~US$ 299, self-hosted perpétuo). O **Lite
(grátis) NÃO expõe a API**, então não serve para esta integração.

- Comprar/baixar: <https://mixpost.app/pricing>
- Imagem Docker: `inovector/mixpost-pro-team`

## 1. Servidor

Qualquer VPS com Docker (1 vCPU / 2 GB já roda). Aponte um domínio/subdomínio
(ex.: `mix.seudominio.com`) para o servidor e tenha HTTPS (Caddy/Traefik/Nginx +
Let's Encrypt) — a Meta exige mídia acessível por HTTPS.

## 2. Docker Compose (esboço)

> Use o compose oficial do Mixpost Pro como base (vem com a licença). Este é o
> formato geral — confira variáveis na doc da sua versão.

```yaml
services:
  mixpost:
    image: inovector/mixpost-pro-team:latest
    ports: ["8080:80"]
    environment:
      APP_URL: https://mix.seudominio.com
      APP_KEY: ${APP_KEY}                 # php artisan key:generate --show
      DB_HOST: mysql
      DB_DATABASE: mixpost
      DB_USERNAME: mixpost
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      MIXPOST_CORE_PATH: mixpost          # bate com MIXPOST_CORE_PATH no Supabase
      MIXPOST_LICENSE_KEY: ${MIXPOST_LICENSE_KEY}
    depends_on: [mysql, redis]
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: mixpost
      MYSQL_USER: mixpost
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes: ["mysql:/var/lib/mysql"]
  redis:
    image: redis:7
volumes: { mysql: {} }
```

Suba com `docker compose up -d`, acesse `https://mix.seudominio.com`, crie o
usuário admin e um **workspace**.

## 3. Conectar o Instagram

No Mixpost, **Social Accounts → Add account → Instagram**. É preciso uma conta
**Instagram profissional (Business/Creator)** ligada a uma Página do Facebook.
Siga o fluxo de OAuth do Mixpost (ele cuida das permissões da Meta — por isso
você não precisa do App Review no seu próprio app).

## 4. Coletar os dados para o Supabase

- **Workspace UUID:** em Social Accounts, menu **⋯** de uma conta → copiar o UUID.
- **Token de API:** perfil/Settings → Access Tokens (ou API) → gerar token.
- **Account ID:** id numérico da conta do Instagram conectada (via `GET /api/{workspace}/accounts`
  usando o token, ou na UI). É o valor de `MIXPOST_ACCOUNT_ID`.

## 5. Secrets no Supabase

```bash
supabase secrets set \
  MIXPOST_BASE_URL=https://mix.seudominio.com \
  MIXPOST_CORE_PATH=mixpost \
  MIXPOST_WORKSPACE_UUID=<uuid> \
  MIXPOST_TOKEN=<token> \
  MIXPOST_ACCOUNT_ID=<id-da-conta>
```

E no cliente (Vercel/.env): `VITE_PUBLISH_PROVIDER=mixpost` (padrão).

## 6. Testar a integração

1. No app: gerar/criar exemplo → renderizar imagens → conformidade → aprovar.
2. Agendar na `/agenda`: a função `mixpost-schedule` sobe os PNGs e cria o post
   agendado no Mixpost. Confira em **Content Planner** do Mixpost que o carrossel
   apareceu agendado na conta certa.
3. Se algo falhar, a mensagem de erro (em português) aparece na agenda.

## Verificar contra a sua versão

A função `supabase/functions/mixpost-schedule/index.ts` assume:
- upload de mídia: `POST /api/{workspace}/media` (multipart, campo `file`);
- criar post: `POST /api/{workspace}/posts` com `date/time/timezone/schedule/accounts/versions`.

Confira esses endpoints na doc da **sua** versão do Mixpost (<https://docs.mixpost.app/api/>);
se o campo de upload ou o formato de resposta divergir, ajuste `readId`/`readUuid`
e o nome do campo do arquivo na função.
