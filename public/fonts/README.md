# public/fonts

**Não é mais necessário colocar `.ttf` aqui.** As fontes da marca são baixadas em
runtime do bucket `brand` do Supabase e injetadas via CSS Font Loading API
(ver `src/lib/fonts.ts`) — as mesmas bytes que alimentam a medição (`lib/measure`)
e, no servidor, o satori (`render-slides`).

Suba os quatro `.ttf` para o bucket `brand` (nomes em `src/brand/fonts/README.md`).
Esta pasta fica só como ponto de montagem opcional para desenvolvimento offline.
