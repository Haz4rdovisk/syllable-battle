# AGENTS.md — Syllable Battle

Documento compartilhado para todos os agentes de IA (Claude, Codex, Gemini, OpenCode).
Fonte unica de verdade sobre o projeto, regras e constraints.

## Projeto

Syllable Battle e um card game digital de silabas em portugues com estetica fantasy/tabletop.
O jogador coloca silabas da mao em alvos (animais) do oponente para completar palavras e causar dano.
Roda em navegador (landscape) e em Android via WebView. Suporta bot, multiplayer local e multiplayer remoto via relay SSE.

URL de producao: `https://syllable-battle.vercel.app/`

## Stack

| Camada       | Tecnologia                              |
| ------------ | --------------------------------------- |
| Frontend     | React 19 + Vite 6 + TypeScript 5.8      |
| Estilo       | Tailwind CSS v4 (`@tailwindcss/vite`)   |
| Animacao     | `motion` (Framer Motion v12)            |
| IDs          | `nanoid`                                |
| Icones       | `lucide-react`                          |
| Testes       | Node.js `--test` nativo via `tsx`       |
| Relay server | Express + SSE (`server/relayServer.ts`) |
| Android      | WebView nativo (`android-app/`)         |
| Deploy       | Vercel (frontend) + Render (relay)      |

## Estrutura

```
src/
  app/            # Bootstrap, perfil, resolucao de decks
  types/game.ts   # Tipos core: GameState, PlayerState, Target, Deck, BattleTurnAction
  logic/          # gameLogic.ts — funcoes puras de regra (shuffle, canPlace, draw, makeInitialGame)
  data/content/   # Definicoes de conteudo (targets, decks, selectors, editor, themes)
  lib/            # Networking: room protocol, session, state controller, SSE connector
  components/
    screens/      # ~79 arquivos — todas as telas e todo o battle runtime
    game/         # Componentes visuais de card/target
    ui/           # Primitivos UI reutilizaveis
  App.tsx         # Root: roteador de telas + gestao de sessao multiplayer
server/           # relayServer.ts — Express SSE relay (porta 3010)
tools/            # Scripts dev: vite wrapper, edge debug, android build/install
android-app/      # App nativo Android (WebView)
docs/             # Documentacao tecnica
```

## Subsistemas

1. **Battle runtime** — loop de jogo, turnos, combate, animacoes. Centro: `BattleController.tsx`.
2. **Layout system** — posicionamento configuravel do stage. Editor: `BattleLayoutEditor.tsx`. Preset: `BattleLayoutPreset.ts`.
3. **Content pipeline** — decks, targets, cards. Validacao em `data/content/index.ts`.
4. **Networking** — sala multiplayer com mock local, broadcast e relay SSE remoto. Em `src/lib/battleRoom*.ts`.
5. **Menus/UI** — Menu, Lobby, DeckSelection, ProfileSetup, CollectionScreen.
6. **Android wrapper** — WebView nativo com loading overlay e version sync.

## Invariantes (nunca violar)

1. **Paridade geometrica**: editor → preview → runtime devem ter a mesma posicao efetiva no stage. Paridade visual aproximada NAO basta.
2. **Regras do jogo**: nao alterar `gameLogic.ts` (CONFIG, TIMINGS, funcoes de validacao) sem instrucao explicita.
3. **Design language**: preservar identidade visual — paleta quente/parchment, Cinzel display, botoes 3D, paineis tipo livro. Ver `.agents/rules/design-language.md`.
4. **Pipeline de conteudo**: validacao em `loadContentCatalog()` garante integridade. Nao pular.
5. **Suite de testes**: `npm test` deve passar antes e depois de qualquer mudanca.

## Handoff operacional

O estado operacional mais recente do projeto fica em:

- `docs/handoffs/CURRENT.md`

Regras obrigatorias:

- `AGENTS.md` continua sendo a fonte de verdade de projeto, arquitetura base, subsistemas, invariantes e regras duraveis.
- `docs/handoffs/CURRENT.md` e a fonte de verdade do estado atual de execucao.
- Todo agente deve ler `docs/handoffs/CURRENT.md` no inicio de tarefas que dependam do estado recente do projeto, antes de propor plano, interpretar contexto recente ou alterar codigo.
- Handoffs anteriores devem ser movidos para `docs/handoffs/archive/`.
- O arquivo `docs/handoffs/CURRENT.md` deve ser curto, operacional e sempre refletir a rodada mais recente concluida.
- Ao concluir uma rodada importante, atualizar `docs/handoffs/CURRENT.md` e mover o handoff anterior relevante para `docs/handoffs/archive/`, se existir historico separado.
- Se houver conflito entre `AGENTS.md` e `docs/handoffs/CURRENT.md`, prevalecem:
  1. os invariantes e safety gates de `AGENTS.md`
  2. depois o estado atual descrito em `docs/handoffs/CURRENT.md`

Formato esperado de `docs/handoffs/CURRENT.md`:

- Estado atual
- Ultimas rodadas concluidas
- O que esta estavel
- O que nao mexer
- Proximo passo recomendado
- Riscos remanescentes
- Arquivos-chave da frente atual

## Regras de trabalho

- Trabalhar em objetivos pequenos, revisaveis e verificaveis.
- Tarefas complexas: propor plano antes de editar codigo.
- Refactors grandes: exigem plano documentado + testes passando antes/depois.
- Sempre citar os arquivos principais envolvidos.
- Sempre validar o comportamento alterado.
- Sempre resumir riscos remanescentes ao final.
- Usar ferramentas disponiveis e relevantes proativamente quando ajudarem a tarefa; o usuario nao precisa lembrar explicitamente.

## Definicao de pronto

Uma tarefa so esta concluida quando:

- o objetivo foi implementado;
- os arquivos alterados foram listados;
- a validacao executada foi descrita;
- os riscos remanescentes foram apontados;
- o diff esta pequeno e revisavel.

## Forma de resposta

1. Entendimento do objetivo
2. Plano curto
3. Arquivos que pretende inspecionar/alterar
4. Implementacao
5. Validacao
6. Resumo final
7. Riscos remanescentes

## Comandos essenciais

```bash
npm run dev         # Dev server (localhost:3000)
npm run relay       # Relay SSE local (localhost:3010)
npm test            # Testes (content, logic, battle, layout, animation)
npm run lint        # Type-check TypeScript
npm run build       # Build de producao
npm run edge:editor # Abre layout editor no Edge
npm run edge:debug  # Abre preview com debug overlay
```

## DevSceneModes (URL params)

- `?battle-layout-editor=1` — editor WYSIWYG de layout
- `?battle-layout-preview=1` — preview de layout
- `?battle-layout-debug=1` — overlay de debug geometrico
- `?content-editor=1` — editor de decks/targets
- `?content-inspector=1` — inspector de conteudo

## Areas criticas

- **`BattleController.tsx`** — maquina de estados central da battle.
- **`BattleLayoutConfig.ts` + `BattleLayoutPreset.ts`** — geometria do stage.
- **`gameLogic.ts`** — regras puras do jogo.
- **`data/content/index.ts`** — pipeline de validacao e normalizacao de conteudo.
- **`BattleCombatFlow.ts`** — orquestracao de combate com animacoes encadeadas.
- **`battleRoomStateController.ts`** — maquina de estados da sala multiplayer.

## Legado ativo

- `discard[]` em PlayerState: reservado para sistema futuro, nao usado.
- `BattleSceneFixtureView.tsx`: fixture viewer de debug, nao e producao.
- `ENABLE_LOCAL_MULTIPLAYER_MOCK`: flag hardcoded em App.tsx.
- Temas visuais (harvest, abyss, canopy, dune): existem mas a battle nao consome tematizacao por deck ainda.

## Documentacao de referencia

| Documento                                 | Conteudo                                      |
| ----------------------------------------- | --------------------------------------------- |
| `docs/repo-architecture.md`               | Arquitetura detalhada de todos os subsistemas |
| `docs/battle-functional-baseline.md`      | Cenarios-ouro para validar a battle           |
| `docs/battle-layout-contract.md`          | Contrato do editor/preset e watcher/dump      |
| `docs/battle-non-regression-checklist.md` | Checklist de nao-regressao                    |
| `docs/battle-visual-catalog.md`           | Catalogo do sistema visual da battle          |
| `.agents/rules/design-language.md`        | Regras consolidadas da design language        |
