<!-- ghost:header -->
## Ghost — AI Session Memory

**ALWAYS search Ghost before reading code or grepping.** When asked about a feature, bug, scenario,
or component — your FIRST action must be a Ghost search. Past sessions contain architecture decisions,
dead ends, failed approaches, and reasoning that code cannot reveal. Do not skip this step.

Use the `ghost-sessions` MCP tool with `deep_search` (not `search`). Fallback CLI commands:

| Command | Purpose |
|---------|---------|
| `ghost search <query>` | Semantic search across past sessions |
| `ghost show <session-id>` | Read a specific session |
| `ghost log` | Recent sessions with summaries |
| `ghost decisions` | Decision log |
| `ghost decision "desc"` | Log a technical decision mid-session |
| `ghost mistake "desc"` | Log a mistake or gotcha mid-session |
| `ghost knowledge "desc"` | Log an insight or pattern mid-session |
| `ghost strategy "desc"` | Log a trade-off explored mid-session |
<!-- ghost:header -->

---

# CLAUDE.md — Syllable Battle

## O que e este projeto

Syllable Battle e um card game digital de silabas em portugues com estetica fantasy/tabletop.
O jogador coloca silabas da mao em alvos (animais) do oponente para completar palavras e causar dano.
Roda em navegador (landscape) e em Android via WebView. Suporta bot, multiplayer local e multiplayer remoto via relay SSE.

URL de producao: `https://syllable-battle.vercel.app/`

## Stack principal

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Frontend     | React 19 + Vite 6 + TypeScript 5.8 |
| Estilo       | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animacao     | `motion` (Framer Motion v12)        |
| Testes       | Node.js `--test` nativo via `tsx`   |
| Relay server | Express + SSE (`server/relayServer.ts`) |
| Android      | WebView nativo (`android-app/`)     |
| Deploy       | Vercel (frontend) + Render (relay)  |

## Grandes subsistemas

1. **Battle runtime** — loop de jogo, turnos, combate, animacoes. Centro: `BattleController.tsx` (66 KB).
2. **Layout system** — posicionamento configuravel do stage. Editor WYSIWYG: `BattleLayoutEditor.tsx` (253 KB). Preset base: `BattleLayoutPreset.ts`.
3. **Content pipeline** — decks, targets, cards. Validacao em `data/content/index.ts`. Editor de conteudo: `ContentEditor.tsx`.
4. **Networking** — sala multiplayer com mock local, broadcast e relay SSE remoto. Em `src/lib/battleRoom*.ts`.
5. **Menus/UI** — Menu, Lobby, DeckSelection, ProfileSetup, CollectionScreen. Design language tabletop/pergaminho.
6. **Android wrapper** — WebView nativo com loading overlay e version sync.

## Como a repo esta organizada

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
docs/             # Documentacao tecnica da battle
```

## Areas criticas

- **`BattleController.tsx`** — maquina de estados central da battle. Mudancas aqui afetam tudo.
- **`BattleLayoutConfig.ts` + `BattleLayoutPreset.ts`** — geometria do stage. Invariante: paridade geometrica exata entre editor, preview e runtime.
- **`gameLogic.ts`** — regras puras do jogo. Qualquer mudanca afeta toda a gameplay.
- **`data/content/index.ts`** — pipeline de validacao e normalizacao de conteudo. Alimenta todo o jogo.
- **`BattleCombatFlow.ts`** — orquestracao de combate com animacoes encadeadas.
- **`battleRoomStateController.ts`** — maquina de estados da sala multiplayer.

## O que nao quebrar

- **Paridade geometrica**: editor -> preview -> runtime devem ter a mesma posicao efetiva no stage. Paridade visual aproximada NAO basta.
- **Loop jogavel**: inicio -> jogada -> dano -> mulligan -> troca de turno -> fim. Validar com `docs/battle-functional-baseline.md`.
- **Design language**: paleta quente/parchment, Cinzel como fonte display, botoes 3D tateis, paineis tipo livro. Ver `.agents/rules/design-language.md`.
- **Pipeline de conteudo**: validacao em `loadContentCatalog()` garante integridade. Nao pular.
- **Suite de testes**: 142 testes passando. Rodar `npm test` antes e depois de qualquer mudanca.
- **Editor/preset workflow**: salvar layout via `POST /__battle-layout/preset` durante dev.

## Legado e hibridos ainda ativos

- **`discard[]` em PlayerState**: campo existe no tipo mas nao e usado pelo loop atual. Reservado para sistema futuro.
- **`BattleSceneFixtureView.tsx` (137 KB)**: fixture viewer gigante para debug/desenvolvimento. Nao e producao.
- **Estado do editor em localStorage**: presets locais nao sao o mesmo que o preset base do projeto.
- **`ENABLE_LOCAL_MULTIPLAYER_MOCK`**: flag hardcoded em App.tsx para multiplayer mock local.
- **Temas visuais**: 4 temas (harvest, abyss, canopy, dune) mapeiam para gradientes Tailwind, mas a battle nao consome tematizacao visual por deck ainda.

## Como trabalhar nesta repo

1. **Antes de editar**: ler os arquivos envolvidos. Entender contexto.
2. **Propor plano**: em tarefas complexas, propor antes de implementar.
3. **Validar**: rodar `npm test` e verificar o comportamento alterado.
4. **Diffs pequenos**: trabalhar em objetivos pequenos, revisaveis e verificaveis.
5. **Citar arquivos**: sempre listar os arquivos principais envolvidos.
6. **Riscos**: sempre resumir riscos remanescentes ao final.

## Regras de seguranca para mudancas

- **NAO** fazer refactor amplo sem necessidade explicita.
- **NAO** alterar regras do jogo sem instrucao explicita.
- **NAO** mexer em multiplas frentes grandes ao mesmo tempo.
- **NAO** quebrar editor/preset, watcher/dump, geometria de stage ou sincronizacao de room sem extrema cautela.
- **NAO** descaracterizar a design language (achatar botoes, esfriar paleta, remover texturas).
- **Battle e landscape-only** no curto prazo.
- **Melhorias mobile** devem respeitar a estrategia atual de stage.
- Preservar fluxo audiovisual existente.

## Fluxo recomendado antes de editar codigo

1. Ler `AGENTS.md` para regras de trabalho
2. Checar docs relevantes em `docs/`
3. Rodar `npm test` — confirmar 142 testes passando
4. Ler os arquivos que pretende alterar
5. Propor plano se a tarefa for complexa
6. Implementar com diff minimo
7. Rodar `npm test` novamente
8. Validar comportamento visual se aplicavel
9. Resumir mudancas + riscos

## Comandos essenciais

```bash
npm run dev         # Dev server (localhost:3000)
npm run relay       # Relay SSE local (localhost:3010)
npm test            # 142 testes (content, logic, battle, layout, animation)
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

## Documentacao de referencia

- `AGENTS.md` — regras de trabalho e forma de resposta
- `docs/battle-functional-baseline.md` — cenarios-ouro para validar a battle
- `docs/battle-layout-contract.md` — contrato do editor/preset e watcher/dump
- `docs/battle-non-regression-checklist.md` — checklist de nao-regressao
- `docs/battle-visual-catalog.md` — catalogo do sistema visual da battle
- `.agents/rules/design-language.md` — regras consolidadas da design language
- `.agents/rules/repo-overview.md` — visao geral do repo para agentes

---

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## Accessibility (a11y)

Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".

- `.claude/skills/accessibility/SKILL.md`
- `.claude/skills/accessibility/references/A11Y-PATTERNS.md`: Practical, copy-paste-ready patterns for common accessibility requirements. Each pattern is self-contained and linked from the main [SKILL.md](../SKILL.md).
- `.claude/skills/accessibility/references/WCAG.md`

## Deploy to Vercel

Deploy applications and websites to Vercel. Use when the user requests deployment actions like "deploy my app", "deploy and give me the link", "push this live", or "create a preview deployment".

- `.claude/skills/deploy-to-vercel/SKILL.md`

## Design Thinking

Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications.

- `.claude/skills/frontend-design/SKILL.md`

## Node.js Backend Patterns

Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices.

- `.claude/skills/nodejs-backend-patterns/SKILL.md`
- `.claude/skills/nodejs-backend-patterns/references/advanced-patterns.md`

## Node.js Best Practices

Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture.

- `.claude/skills/nodejs-best-practices/SKILL.md`

## Node.js Express Server

- `.claude/skills/nodejs-express-server/SKILL.md`
- `.claude/skills/nodejs-express-server/references/authentication-with-jwt.md`
- `.claude/skills/nodejs-express-server/references/basic-express-setup.md`
- `.claude/skills/nodejs-express-server/references/database-integration-postgresql-with-sequelize.md`
- `.claude/skills/nodejs-express-server/references/environment-configuration.md`
- `.claude/skills/nodejs-express-server/references/error-handling-middleware.md`
- `.claude/skills/nodejs-express-server/references/middleware-chain-implementation.md`
- `.claude/skills/nodejs-express-server/references/restful-routes-with-crud-operations.md`

## Playwright Best Practices

Use when writing Playwright tests, fixing flaky tests, debugging failures, implementing Page Object Model, configuring CI/CD, or optimizing performance.

- `.claude/skills/playwright-best-practices/SKILL.md`

## SEO optimization

Optimize for search engine visibility and ranking.

- `.claude/skills/seo/SKILL.md`

## Tailwind CSS Development Patterns

Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices.

- `.claude/skills/tailwind-css-patterns/SKILL.md`

## TypeScript Advanced Types

Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types.

- `.claude/skills/typescript-advanced-types/SKILL.md`

## React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid boolean prop proliferation by using compound components, lifting state, and composing internals.

- `.claude/skills/vercel-composition-patterns/SKILL.md`

## Vercel React Best Practices

React and Next.js performance optimization guidelines from Vercel Engineering.

- `.claude/skills/vercel-react-best-practices/SKILL.md`

## Vite

Vite build tool configuration, plugin API, SSR, and Vite 8 Rolldown migration.

- `.claude/skills/vite/SKILL.md`

<!-- autoskills:end -->
