# Publicar no Instagram pela Meta Graph API (grátis, um usuário)

Caminho **padrão** de publicação do app. A API da Meta é gratuita e, para a
**sua própria conta**, **não exige App Review**: basta manter o app em **modo de
desenvolvimento** e adicionar você mesmo como admin/testador. O App Review só é
necessário para publicar em contas de terceiros (uso público).

Como funciona no app: ao agendar um post aprovado, ele fica `scheduled`; o worker
`publish-due-posts` (pg_cron, a cada 5 min) publica o carrossel no horário, de
forma idempotente (não duplica em retentativa).

## 1. Pré-requisitos de conta (grátis)

1. **Instagram profissional** — converta seu Instagram para **Business** ou
   **Creator** (Configurações → Tipo de conta).
2. **Página do Facebook** — crie uma (grátis) e **vincule** ao seu Instagram
   profissional (nas configurações da Página → contas vinculadas, ou pelo app do IG).
3. **Meta Business** (recomendado) — associe a Página e o Instagram ao seu
   Business Manager.

## 2. Criar o app na Meta (modo desenvolvimento)

1. <https://developers.facebook.com> → **My Apps → Create App** → tipo **Business**.
2. Adicione o produto **Instagram Graph API** (e **Facebook Login** se pedido).
3. Deixe o app em **Development** (não precisa publicar/Live para uso próprio).
4. Em **App Roles → Roles**, confirme que você é **Admin**. Adicione a si mesmo
   como **Instagram Tester** se aparecer a opção, e aceite o convite na sua conta
   (Instagram → Configurações → Apps e sites → convites de testador).

## 3. Obter os identificadores e o token

Use o **Graph API Explorer** (developers.facebook.com/tools/explorer) com o seu app:

1. Gere um **User Access Token** com as permissões:
   `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
   `pages_read_engagement`, `business_management`.
2. Descubra o **IG user id** (`IG_USER_ID`):
   - `GET /me/accounts` → pega o `id` da sua Página;
   - `GET /{page-id}?fields=instagram_business_account` → o `id` retornado é o
     `IG_USER_ID`.
3. Troque o token curto por um **long-lived token** (`META_LONG_LIVED_TOKEN`):
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}`
   (dura ~60 dias; o app tem job diário de renovação — §10).

## 4. Secrets no Supabase

```bash
supabase secrets set \
  IG_USER_ID=<ig-user-id> \
  META_APP_ID=<app-id> \
  META_APP_SECRET=<app-secret> \
  META_LONG_LIVED_TOKEN=<long-lived-token>
```

E no cliente (Vercel/.env): `VITE_PUBLISH_PROVIDER=meta` (padrão).

## 5. Como o carrossel é publicado

O worker faz o fluxo oficial de carrossel (§10):
1. um container por slide (`image_url` = URL assinada de 24h do bucket `renders`,
   `is_carousel_item=true`, `alt_text`);
2. um container pai `CAROUSEL` com os filhos + a legenda;
3. `media_publish`;
4. hashtags como primeiro comentário.

Os ids de container são gravados antes de cada passo → retentativa retoma do
ponto, **sem publicar duplicado**.

## Limites e observações

- **Mídia acessível:** a Meta faz cURL na URL da imagem no momento de publicar; o
  app usa URL assinada de 24h (HTTPS) — funciona em dev mode.
- **Cota:** 100 publicações/conta em 24h (carrossel conta como 1). O app consulta
  `content_publishing_limit` antes de publicar.
- **Token:** expira (~60 dias); mantenha o job de renovação ativo e olhe a tela de
  status da conexão antes de quebrar.
- **App Review:** só é preciso se um dia você for publicar em contas de terceiros.
  Para o seu próprio perfil, o modo desenvolvimento basta.
