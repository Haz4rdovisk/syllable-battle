# AI Documentation Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all AI/agent documentation into a single-source-of-truth architecture (AGENTS.md as hub + thin harness files) with revised safety rules that protect value without blocking evolution.

**Architecture:** AGENTS.md becomes the universal shared document (~150 lines) containing project context, revised rules, constraints, commands, and reference index. CLAUDE.md, CODEX.md, and GEMINI.md become thin harness files (~15-40 lines each) with tool-specific config + 5 safety gates + directive to read AGENTS.md. Redundant `.agents/rules/repo-overview.md` is removed.

**Tech Stack:** Markdown files only. No code changes.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `AGENTS.md` | Universal hub: project, stack, structure, rules, constraints, commands, refs |
| Rewrite | `CLAUDE.md` | Claude harness: Ghost header + safety gates + "read AGENTS.md" + autoskills |
| Create | `CODEX.md` | Codex harness: safety gates + "read AGENTS.md" |
| Create | `GEMINI.md` | Gemini harness: safety gates + "read AGENTS.md" |
| Delete | `.agents/rules/repo-overview.md` | Absorbed into AGENTS.md |
| Modify | `docs/repo-architecture.md` | Remove reference to deleted repo-overview.md |

---

### Task 1: Rewrite AGENTS.md as Universal Hub

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Replace AGENTS.md with the new universal hub**

```markdown
# AGENTS.md — Syllable Battle

Documento compartilhado para todos os agentes de IA (Claude, Codex, Gemini, OpenCode).
Fonte unica de verdade sobre o projeto, regras e constraints.

## Projeto

Syllable Battle e um card game digital de silabas em portugues com estetica fantasy/tabletop.
O jogador coloca silabas da mao em alvos (animais) do oponente para completar palavras e causar dano.
Roda em navegador (landscape) e em Android via WebView. Suporta bot, multiplayer local e multiplayer remoto via relay SSE.

URL de producao: `https://syllable-battle.vercel.app/`

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Frontend     | React 19 + Vite 6 + TypeScript 5.8 |
| Estilo       | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animacao     | `motion` (Framer Motion v12)        |
| IDs          | `nanoid`                            |
| Icones       | `lucide-react`                      |
| Testes       | Node.js `--test` nativo via `tsx`   |
| Relay server | Express + SSE (`server/relayServer.ts`) |
| Android      | WebView nativo (`android-app/`)     |
| Deploy       | Vercel (frontend) + Render (relay)  |

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

## Regras de trabalho

- Trabalhar em objetivos pequenos, revisaveis e verificaveis.
- Tarefas complexas: propor plano antes de editar codigo.
- Refactors grandes: exigem plano documentado + testes passando antes/depois.
- Sempre citar os arquivos principais envolvidos.
- Sempre validar o comportamento alterado.
- Sempre resumir riscos remanescentes ao final.

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

| Documento | Conteudo |
|-----------|----------|
| `docs/repo-architecture.md` | Arquitetura detalhada de todos os subsistemas |
| `docs/battle-functional-baseline.md` | Cenarios-ouro para validar a battle |
| `docs/battle-layout-contract.md` | Contrato do editor/preset e watcher/dump |
| `docs/battle-non-regression-checklist.md` | Checklist de nao-regressao |
| `docs/battle-visual-catalog.md` | Catalogo do sistema visual da battle |
| `.agents/rules/design-language.md` | Regras consolidadas da design language |
```

- [ ] **Step 2: Verify the file reads correctly**

Run: `wc -l AGENTS.md`
Expected: ~150 lines

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: rewrite AGENTS.md as universal AI hub

Single source of truth for all AI agents. Revised safety rules:
removed overly broad blocks, kept real invariants, reframed
constraints as test-gated instead of fear-based."
```

---

### Task 2: Rewrite CLAUDE.md as Thin Harness

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace CLAUDE.md content (preserve Ghost header and autoskills markers)**

The new CLAUDE.md has 3 zones:
1. Ghost header (Claude-specific MCP — unchanged)
2. Safety gates + directive to read AGENTS.md
3. Autoskills section (managed externally — unchanged)

```markdown
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

## Instrucao principal

**Leia `AGENTS.md` no inicio de cada conversa.** Ele contem todo o contexto do projeto, regras de trabalho, constraints e referencias. Este arquivo contem apenas configuracao especifica do Claude.

## Safety gates

1. **Paridade geometrica**: editor === preview === runtime (invariante inviolavel)
2. **Regras do jogo** (`gameLogic.ts`): nao alterar sem instrucao explicita
3. **Design language**: preservar identidade visual. Ver `.agents/rules/design-language.md`
4. **Pipeline de conteudo**: nao pular validacao de `loadContentCatalog()`
5. **Testes**: `npm test` deve passar antes e depois de qualquer mudanca

## Fluxo de trabalho

1. Buscar no Ghost por contexto relevante
2. Ler `AGENTS.md` para regras e contexto do projeto
3. Checar docs relevantes em `docs/`
4. Rodar `npm test` — confirmar testes passando
5. Ler os arquivos que pretende alterar
6. Propor plano se a tarefa for complexa
7. Implementar com diff minimo
8. Rodar `npm test` novamente
9. Resumir mudancas + riscos

---

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

[... autoskills content preserved as-is ...]

<!-- autoskills:end -->
```

Note: The autoskills section between `<!-- autoskills:start -->` and `<!-- autoskills:end -->` must be preserved exactly as it currently exists — it is managed by an external tool.

- [ ] **Step 2: Verify line count**

Run: `wc -l CLAUDE.md`
Expected: ~120 lines (Ghost ~20 + body ~10 + autoskills ~90)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: slim CLAUDE.md to thin harness pointing to AGENTS.md

Ghost header + safety gates + workflow + autoskills.
All project context now lives in AGENTS.md."
```

---

### Task 3: Create CODEX.md Thin Harness

**Files:**
- Create: `CODEX.md`

- [ ] **Step 1: Create CODEX.md**

```markdown
# CODEX.md — Syllable Battle

## Instrucao principal

**Leia `AGENTS.md` antes de qualquer tarefa.** Ele contem todo o contexto do projeto, regras de trabalho, constraints e referencias.

## Safety gates

1. **Paridade geometrica**: editor === preview === runtime (invariante inviolavel)
2. **Regras do jogo** (`gameLogic.ts`): nao alterar sem instrucao explicita
3. **Design language**: preservar identidade visual. Ver `.agents/rules/design-language.md`
4. **Pipeline de conteudo**: nao pular validacao de `loadContentCatalog()`
5. **Testes**: `npm test` deve passar antes e depois de qualquer mudanca

## Fluxo de trabalho

1. Ler `AGENTS.md` para regras e contexto do projeto
2. Checar docs relevantes em `docs/`
3. Rodar `npm test` — confirmar testes passando
4. Ler os arquivos que pretende alterar
5. Propor plano se a tarefa for complexa
6. Implementar com diff minimo
7. Rodar `npm test` novamente
8. Resumir mudancas + riscos
```

- [ ] **Step 2: Commit**

```bash
git add CODEX.md
git commit -m "docs: add CODEX.md thin harness for OpenAI Codex"
```

---

### Task 4: Create GEMINI.md Thin Harness

**Files:**
- Create: `GEMINI.md`

- [ ] **Step 1: Create GEMINI.md**

```markdown
# GEMINI.md — Syllable Battle

## Instrucao principal

**Leia `AGENTS.md` antes de qualquer tarefa.** Ele contem todo o contexto do projeto, regras de trabalho, constraints e referencias.

## Safety gates

1. **Paridade geometrica**: editor === preview === runtime (invariante inviolavel)
2. **Regras do jogo** (`gameLogic.ts`): nao alterar sem instrucao explicita
3. **Design language**: preservar identidade visual. Ver `.agents/rules/design-language.md`
4. **Pipeline de conteudo**: nao pular validacao de `loadContentCatalog()`
5. **Testes**: `npm test` deve passar antes e depois de qualquer mudanca

## Fluxo de trabalho

1. Ler `AGENTS.md` para regras e contexto do projeto
2. Checar docs relevantes em `docs/`
3. Rodar `npm test` — confirmar testes passando
4. Ler os arquivos que pretende alterar
5. Propor plano se a tarefa for complexa
6. Implementar com diff minimo
7. Rodar `npm test` novamente
8. Resumir mudancas + riscos
```

- [ ] **Step 2: Commit**

```bash
git add GEMINI.md
git commit -m "docs: add GEMINI.md thin harness for Google Gemini CLI"
```

---

### Task 5: Remove Redundant repo-overview.md

**Files:**
- Delete: `.agents/rules/repo-overview.md`
- Modify: `CLAUDE.md` (line referencing repo-overview.md — already removed in Task 2)
- Modify: `docs/repo-architecture.md` (if it references repo-overview.md)

- [ ] **Step 1: Check if docs/repo-architecture.md references repo-overview.md**

Run: `grep -n "repo-overview" docs/repo-architecture.md`

- [ ] **Step 2: Remove the file**

```bash
git rm .agents/rules/repo-overview.md
```

- [ ] **Step 3: If grep found references in repo-architecture.md, remove them**

Edit `docs/repo-architecture.md` to remove any lines referencing `.agents/rules/repo-overview.md`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: remove redundant repo-overview.md (absorbed into AGENTS.md)"
```

---

### Task 6: Validate

- [ ] **Step 1: Run test suite**

Run: `npm test`
Expected: All tests pass (no markdown changes affect code)

- [ ] **Step 2: Run type check**

Run: `npm run lint`
Expected: Clean (no code changes)

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Verify file structure**

Run: `ls -la AGENTS.md CLAUDE.md CODEX.md GEMINI.md .agents/rules/`

Expected:
- AGENTS.md (~150 lines) — universal hub
- CLAUDE.md (~120 lines) — thin harness with Ghost + autoskills
- CODEX.md (~25 lines) — thin harness
- GEMINI.md (~25 lines) — thin harness
- .agents/rules/design-language.md — untouched
- .agents/rules/repo-overview.md — GONE

- [ ] **Step 5: Verify no stale references**

Run: `grep -r "repo-overview" AGENTS.md CLAUDE.md CODEX.md GEMINI.md docs/`
Expected: No matches

---

### Task 7: Final Push

- [ ] **Step 1: Push all commits**

```bash
git push
```
