# ARISE · Tutor de Apocalipse (protótipo)

Bot de Telegram que ajuda alunos da ARISE School a estudar o livro de Apocalipse, versículo por versículo.
Objetivo: **respostas curtas, fiéis ao texto, sem alucinação e sem sair do tema.**

## Como funciona
```
Telegram → webhook → Cloudflare Worker → porteiro (classificador) → livro inteiro + capítulos em foco + referências verificadas
                                       → modelo (OpenRouter) → conferência de citações → resposta + menu de opções
```
- **Só entra quem tem código** da escola (`/entrar CODIGO`). Conversas ficam registradas para a equipe; o aluno é avisado.
- **Respostas curtas e diretas.** Depois delas, botões: 🔤 Raiz · 📜 Original · 🔗 Passagens · 🎵 Música (só se a escola cadastrou) · 👍 👎 · 🔊 Ouvir.
- **Fidelidade conferida por código, não só por prompt:**
  - toda citação entre aspas é comparada com o texto fornecido; se não bate, o modelo refaz e, se persistir, a resposta é marcada;
  - referências bíblicas citadas são checadas contra a Bíblia (livro, capítulo, versículo existem);
  - o texto de outras passagens vem do banco, nunca da memória do modelo;
  - raiz grega vem do Strong; original, do grego (Tischendorf); passagens ligadas, do dataset OpenBible; música, só do que a equipe cadastrou.
- **Fora do tema, palavrão, tentativa de burla e pedido de tarefa pronta** são tratados por código (resposta fixa, bloqueio ou modo tutor).
- **Qualquer capítulo (1 a 22) a qualquer momento:** o modelo recebe o Apocalipse inteiro (Bíblia Livre) e, para os capítulos em foco, também a Almeida e o grego. Contexto curado por capítulo é opcional.
- Próximo passo: apostilas (busca por trechos, com citação de apostila e página).
- Painel da equipe em `/panel` (chave de acesso): uso, bloqueios, pedidos pastorais, citações não conferidas, avaliações e custo.

## Estrutura
| Pasta | O quê |
|---|---|
| `worker/` | Worker (TypeScript), esquema do D1, painel |
| `prompts/tutor.md` | Regras do tutor |
| `data/context/` | `livro-apocalipse.json` (fatos do livro com origem: texto, léxico, tradição, lacuna) e contexto curado opcional por capítulo |
| `scripts/` | Dados, bundle, testes (`e2e.py`, `unit.mts`, `test_hard.py`) |
| `SOURCES.md` | Fontes e licenças |

## Montar do zero
```bash
cp .env.example .env                 # preencha
bash scripts/fetch_data.sh           # baixa textos e dicionários
python3 -I scripts/build_db.py       # SQLite local (versículos + palavras)
python3 -I scripts/build_bundle.py   # worker/src/data.json (prompt + capítulos com contexto)
python3 -I scripts/build_seeds.py    # SQL do D1 (Bíblia, Almeida, grego, palavras, referências)
cd worker && npm install
npx wrangler d1 create arise-bot     # copie o database_id para wrangler.jsonc
npx wrangler d1 execute arise-bot --remote --file=schema.sql
for f in seed/data_*.sql; do npx wrangler d1 execute arise-bot --remote --file=$f; done
# segredos: TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET, OPENROUTER_API_KEY, ADMIN_TOKEN (e ELEVENLABS_API_KEY para voz)
npx wrangler secret put <NOME>
npx wrangler deploy
# webhook (receber mensagens e toques nos botões):
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" -d "url=https://<seu-worker>/webhook" \
  -d "secret_token=$WEBHOOK_SECRET" -d 'allowed_updates=["message","callback_query"]'
```
O banco recebe também as migrações `worker/migration_00*.sql` se partir de um esquema antigo (o `schema.sql` já é o atual).

## Operação (`ADMIN_TOKEN`)
```bash
H="Authorization: Bearer $ADMIN_TOKEN"; U=https://<seu-worker>
curl -X POST -H "$H" $U/admin/invite -d '{"label":"turma 1","max_uses":30}'     # código ARISE-XXXXXX
curl -H "$H" $U/admin/students ; curl -H "$H" "$U/admin/messages?limit=50&only=flagged"
curl -X POST -H "$H" $U/admin/student -d '{"tg_id":123,"active":false}'          # desativar
curl -X POST -H "$H" $U/admin/purge -d '{"tg_id":123}'                           # apagar os dados de um aluno
curl -X POST -H "$H" $U/admin/song -d '{"title":"...","artist":"...","refs":["Ap 1:7"]}'   # música ligada a versículos
```

## Testes
```bash
node --experimental-strip-types scripts/unit.mts   # linguagem, referências, citações, capítulos
python3 -I scripts/e2e.py                          # 20 cenários contra o Worker publicado (alunos fictícios, apagados no fim)
```

## Contexto curado (opcional)
Os 22 capítulos já funcionam. Para reforçar um capítulo (estrutura, raízes, divergências de tradução): `data/context/apocalipse-N.json` (formato do 1) → `build_bundle.py` → `wrangler deploy`.

## Não faz (de propósito)
Não escreve tarefa pronta, não opina entre linhas teológicas, não usa a ARA (direitos da SBB), não inventa música nem cita de memória.
