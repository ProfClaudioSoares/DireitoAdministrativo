# Go-live — checklist do Estúdio de Conteúdo CS

Ordem recomendada, do zero ao ar. Vá riscando. Detalhes de cada bloco nos guias
referenciados. Tempo estimado: ~1–2 h (a maior parte é setup na Meta).

---

## 0. Pré-requisitos (contas — grátis)
- [ ] Conta no **Supabase** (<https://supabase.com>)
- [ ] Conta no **Vercel** (<https://vercel.com>)
- [ ] Conta no **Anthropic** com **API key** (<https://console.anthropic.com>)
- [ ] **Instagram profissional** (Business/Creator) + **Página do Facebook** vinculada

---

## 1. Criar o projeto Supabase (com token, via GitHub Action)
- [ ] Gerar token pessoal: Supabase → Account → **Access Tokens**
- [ ] No repo: **Settings → Secrets and variables → Actions → New secret**
      `SUPABASE_ACCESS_TOKEN = <token>`
- [ ] Descobrir o `org_id` (`npx supabase orgs list`, ou Dashboard → org → Settings)
- [ ] **Actions → Bootstrap Supabase → Run workflow** (informe `org_id`)
- [ ] Anotar do log: **Project URL** `https://<ref>.supabase.co`
- [ ] Copiar do Dashboard → **Project Settings → API**: `anon` e `service_role`

> Alternativas: `scripts/bootstrap-supabase.sh` (local) ou `docs/setup-web.md` (painel).

## 2. Ajustes no Supabase (uma vez)
- [ ] **Database → Extensions**: habilitar `pg_cron`, `pg_net`, `supabase_vault`
- [ ] Se o `0004_cron` falhou por extensão, reaplicar (SQL Editor ou novo `db push`)
- [ ] **Storage → bucket `brand`**: subir os 4 `.ttf` + 3 PNGs (nomes em `src/brand/*/README.md`)
- [ ] **Vault** (SQL Editor):
      ```sql
      select vault.create_secret('<service_role_key>','service_role_key');
      select vault.create_secret('https://<ref>.functions.supabase.co','functions_base_url');
      ```
- [ ] **Authentication → URL Configuration**: adicionar `http://localhost:5173`
      e (depois) `https://<seu>.vercel.app`
- [ ] Criar a conta do titular: **Authentication → Users → Add user**

## 3. Chave da IA (Claude)
- [ ] **Project Settings → Edge Functions → Secrets**: `ANTHROPIC_API_KEY=<sk-...>`

## 4. Publicação — Instagram API com Login do Instagram (grátis, sua conta) · `docs/meta-setup.md`
- [ ] IG convertido para **profissional** (Business/Creator) — sem Página/Portfólio
- [ ] Criar app na Meta + produto **Instagram** em **modo desenvolvimento**
- [ ] Adicionar-se como **Testador do Instagram** e aceitar o convite no app do IG
- [ ] Gerar token na **"Configuração da API com login do Instagram"** → `META_LONG_LIVED_TOKEN`
- [ ] Obter `IG_USER_ID` (via `graph.instagram.com/me?fields=user_id`)
- [ ] Secrets no Supabase (Edge Functions):
      `IG_USER_ID`, `META_APP_ID`, `META_APP_SECRET`, `META_LONG_LIVED_TOKEN`

## 5. Publicar o front-end no Vercel
- [ ] **vercel.com/new** → importar `ProfClaudioSoares/DireitoAdministrativo`
- [ ] **Environment Variables** (Production + Preview):
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLISH_PROVIDER=meta`
- [ ] Deploy
- [ ] Voltar ao passo 2 e adicionar o domínio `*.vercel.app` em Auth → URL Configuration

## 6. Deploy das Edge Functions (se não usou a Action do passo 1)
- [ ] `npx supabase functions deploy generate-carousel render-slides compliance-review publish-due-posts mixpost-schedule --project-ref <ref>`
      (ou via `.github/workflows/deploy.yml` com os secrets do repo)

---

## 7. Teste de fumaça (ordem do fluxo)
- [ ] Abrir o app (Vercel) → **login** com a conta do titular
- [ ] `/gerar` → **Gerar carrossel** (IA responde) — ou **Criar exemplo**
- [ ] `/estudio/:id` → editar um slide, ver o canvas atualizar; **Renderizar imagens**
- [ ] `/estudio/:id` → **Rodar conformidade**
- [ ] `/conformidade/:id` → verificar a citação (com nota) → **Aprovar**
- [ ] `/agenda` → agendar para daqui a alguns minutos
- [ ] Confirmar que o worker publicou (o carrossel aparece no perfil) sem duplicar

---

## Notas
- **Nada de segredo no cliente:** só `VITE_*` públicos no Vercel. IA/Meta ficam nos
  secrets do Supabase; a chave do cron, no Vault.
- **Token da Meta expira (~60 dias):** mantenha o job de renovação e olhe o status
  da conexão antes de quebrar.
- **Alternativa Mixpost:** `VITE_PUBLISH_PROVIDER=mixpost` + `docs/mixpost-setup.md`
  (exige Mixpost Pro).
