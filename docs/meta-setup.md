# Publicar no Instagram com **Login do Instagram** (grátis, um usuário)

Caminho **padrão** de publicação do app. Usa a **Instagram API com Login do
Instagram** (`graph.instagram.com`), feita pela Meta exatamente para publicar na
**sua própria** conta profissional. É gratuita e, para a sua conta, **não exige
App Review** nem revisão: basta manter o app em **desenvolvimento** e se adicionar
como testador.

> **Por que este caminho e não o login do Facebook?** O login do Facebook exige
> Página + Portfólio empresarial + a permissão `business_management`, e cada etapa
> costuma travar (`me/accounts` vazio, erro de portfólio, "problema técnico ao
> conectar o app"). O login do Instagram **dispensa tudo isso**: sem Página, sem
> Portfólio, sem `business_management`.

Como funciona no app: ao agendar um post aprovado, ele fica `scheduled`; o worker
`publish-due-posts` (pg_cron, a cada 5 min) publica o carrossel no horário, de
forma idempotente (não duplica em retentativa).

## 1. Pré-requisito de conta (grátis)

- **Instagram profissional** — a conta precisa ser **Business** ou **Creator**
  (Instagram → Configurações → Tipo de conta e ferramentas → mudar para
  profissional). **Só isso.** Não precisa de Página do Facebook nem de Business
  Manager.

## 2. Criar o app na Meta e adicionar o produto Instagram

1. <https://developers.facebook.com> → **Meus apps → Criar app**.
2. Em **Casos de uso**, escolha **"Outro"** → tipo **Business** (ou o caso de uso
   que ofereça o produto **Instagram**).
3. No painel do app, adicione o produto **Instagram** → aba
   **"Configuração da API com login do Instagram"** (*API setup with Instagram
   login*).
4. Deixe o app em **Desenvolvimento** (não precisa publicar/Live para uso próprio).

## 3. Adicionar sua conta como testador

1. **Funções do app → Funções** (*App roles → Roles*).
2. Em **Testadores do Instagram**, clique **Adicionar pessoas** e informe o
   usuário **@prof.drclaudio_soares**.
3. Aceite o convite na sua conta: **Instagram → Configurações → Apps e sites →
   Convites de testador** → **Aceitar**.

## 4. Gerar o token e descobrir o IG_USER_ID

Ainda na aba **"Configuração da API com login do Instagram"**:

1. Em **"1. Gerar token de acesso"** (*Generate access token*), clique e faça
   login com **@prof.drclaudio_soares** no popup. Autorize as permissões
   solicitadas — o app precisa de:
   `instagram_business_basic`, `instagram_business_content_publish`,
   `instagram_business_manage_comments` (esta última só para postar as hashtags
   como primeiro comentário).
2. O token gerado aparece no campo — é o **`META_LONG_LIVED_TOKEN`** (dura ~60
   dias; renovável — ver abaixo). Se o painel oferecer um token curto, troque por
   um de longa duração:
   `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={INSTAGRAM_APP_SECRET}&access_token={TOKEN_CURTO}`
3. Descubra o **IG user id** (`IG_USER_ID`):
   `GET https://graph.instagram.com/me?fields=user_id,username&access_token={TOKEN}`
   → o valor de **`user_id`** é o `IG_USER_ID`.

O **App ID** e o **App Secret** ficam em **Configurações do app → Básico**
(`META_APP_ID` / `META_APP_SECRET`) — usados na troca/renovação do token.

## 5. Secrets no Supabase

Os nomes dos secrets são os mesmos de antes (o worker não muda):

```bash
supabase secrets set \
  IG_USER_ID=<user_id-do-passo-4> \
  META_APP_ID=<app-id> \
  META_APP_SECRET=<app-secret> \
  META_LONG_LIVED_TOKEN=<token-do-passo-4>
```

Ou rode o workflow **Actions → Set Meta Secrets** (lê os secrets do repositório
`META_IG_USER_ID`, `META_APP_ID`, `META_APP_SECRET`, `META_LONG_LIVED_TOKEN`).

E no cliente (Vercel/.env): `VITE_PUBLISH_PROVIDER=meta` (padrão).

## 6. Como o carrossel é publicado

O worker faz o fluxo oficial de publicação em `graph.instagram.com` (§10):

1. um container por slide (`image_url` = URL assinada de 24h do bucket `renders`,
   `is_carousel_item=true`, `alt_text`); no **card único** (1 slide) publica como
   imagem, com a legenda na própria mídia;
2. um container pai `CAROUSEL` com os filhos + a legenda (só para 2+ slides);
3. `media_publish`;
4. hashtags como primeiro comentário.

Os ids de container são gravados antes de cada passo → retentativa retoma do
ponto, **sem publicar duplicado**.

## Limites e observações

- **Mídia acessível:** a Meta faz cURL na URL da imagem no momento de publicar; o
  app usa URL assinada de 24h (HTTPS) — funciona em modo de desenvolvimento.
- **Cota:** 100 publicações/conta em 24h (carrossel conta como 1). O app consulta
  `content_publishing_limit` antes de publicar.
- **Token:** expira (~60 dias). Renove com
  `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={TOKEN}`
  e regrave o `META_LONG_LIVED_TOKEN`. Olhe a tela de status da conexão antes de
  quebrar.
- **App Review:** não é necessário para publicar na sua própria conta em modo de
  desenvolvimento. Só seria preciso para publicar em contas de terceiros.
