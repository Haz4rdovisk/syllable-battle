# Arquitetura do Repositorio — Syllable Battle

Documento vivo da arquitetura atual do projeto. Atualizado em 2026-04-10.

---

## 1. Visao geral do produto

Syllable Battle e um card game digital educativo/casual em portugues brasileiro. O jogador recebe uma mao de silabas e as coloca em alvos (animais) do oponente para completar palavras e causar dano. Ganha quem zerar a vida do adversario primeiro.

**Identidade**: estetica fantasy tabletop — pergaminho, livro antigo, botoes tateis, tipografia epica (Cinzel).

**Modos de jogo**:
- **Bot**: jogador vs IA simples (greedy — joga a primeira opcao valida)
- **Multiplayer remoto**: dois jogadores via relay SSE com sala por codigo
- **Multiplayer local**: duas abas no mesmo navegador com mock de latencia

**Plataformas**:
- Navegador (landscape-only durante a battle)
- Android (WebView nativo apontando para Vercel)

**Mecanica central**:
1. Cada jogador tem um deck de silabas e um deck de alvos (animais com silabas alvo)
2. 2 alvos ficam em campo por lado, 5 silabas na mao
3. Jogador coloca silaba da mao num alvo que precise daquela silaba
4. Ao completar todas as silabas de um alvo, ele ataca — causa dano por raridade (comum=1, raro=2, epico=3, lendario=4)
5. O alvo concluido sai e um novo entra do deck
6. Mulligan permite trocar ate 3 cartas quando a mao esta travada
7. Turnos alternam com timer de 60s

---

## 2. Stack tecnica

| Camada | Tecnologia | Versao | Notas |
|--------|-----------|--------|-------|
| UI Framework | React | 19.0.0 | Hooks, sem class components |
| Build | Vite | 6.2.0 | Plugins customizados para editor e versioning |
| Linguagem | TypeScript | ~5.8.2 | Strict, sem emit (type-check only) |
| Estilo | Tailwind CSS | v4 | Via `@tailwindcss/vite`, sem config file separado |
| Animacao | motion (Framer) | 12.23.24 | `motion/react` para AnimatePresence, spring, etc. |
| Icones | lucide-react | 0.546.0 | Icones vetoriais |
| IDs | nanoid | 5.1.7 | IDs unicos para targets, players, acoes |
| Relay | Express | 4.21.2 | SSE para multiplayer |
| Testes | Node.js --test | nativo | Via tsx loader, 142 testes |
| Android | Android SDK 35 | Gradle 8.11.1 | WebView, min SDK 24 |
| Deploy frontend | Vercel | — | SPA rewrite |
| Deploy relay | Render | — | Free tier, pode hibernar |

**Sem bibliotecas de state management externas** (Redux, Zustand, etc.). Estado gerenciado com `useState` / `useRef` no React.

---

## 3. Estrutura macro da repo

```
/
├── src/
│   ├── App.tsx                    # Root: roteador de telas + estado global
│   ├── main.tsx                   # Entry: orientation lock, deteccao Android
│   ├── index.css                  # CSS global
│   ├── types/game.ts              # Todos os tipos core do jogo
│   ├── logic/gameLogic.ts         # Regras puras (shuffle, draw, canPlace, damage)
│   ├── data/
│   │   ├── content/               # Pipeline de conteudo
│   │   │   ├── index.ts           # Validacao, normalizacao, catalogo
│   │   │   ├── types.ts           # Tipos de definicao de conteudo
│   │   │   ├── targets.ts         # 24 alvos (animais) em 4 temas
│   │   │   ├── decks/             # 4 decks tematicos
│   │   │   ├── selectors.ts       # Funcoes de consulta ao catalogo
│   │   │   ├── battleSetup.ts     # Especificacao de setup de batalha
│   │   │   ├── themes.ts          # Mapeamento de temas visuais
│   │   │   └── editor.ts          # Logica do editor de conteudo
│   │   ├── contentInsights.ts     # Metricas e analises de deck
│   │   └── *.test.ts              # Testes de conteudo
│   ├── app/
│   │   ├── appBootstrap.ts        # DevSceneMode, perfil, localStorage
│   │   ├── appDeckResolver.ts     # Resolucao de decks para battle
│   │   └── useAppRoomLifecycle.ts # Hook de lifecycle de sala multiplayer
│   ├── lib/
│   │   ├── battleRoomSession.ts   # Servico de sala (mock/real)
│   │   ├── battleRoomStateController.ts  # Maquina de estados da sala
│   │   ├── battleRoomProtocol.ts  # Tipos do protocolo
│   │   ├── battleRoomTransport.ts # Abstracao de transporte
│   │   ├── battleRoomDriver.ts    # Driver local (mock/broadcast)
│   │   ├── battleRoomRemoteDriver.ts # Driver SSE remoto
│   │   └── battleRoomSseConnector.ts # Conector SSE
│   ├── components/
│   │   ├── screens/               # ~79 arquivos: todas as telas + battle runtime
│   │   ├── game/                  # GameComponents.tsx, battleCardStackVisuals.ts
│   │   └── ui/                    # button.tsx, badge.tsx
│   └── assets/branding/           # Logo/crest
├── server/relayServer.ts          # Express SSE relay (~150 linhas)
├── tools/                         # Scripts de dev e build
├── android-app/                   # App Android nativo (WebView)
├── public/                        # Assets estaticos
├── docs/                          # Documentacao tecnica
├── .agents/rules/                 # Regras para agentes IA
└── AGENTS.md                      # Regras de trabalho
```

### Peso dos diretorios (por complexidade, nao por linhas)

- `src/components/screens/` — **altissima**: 79 arquivos, inclui toda a battle, editor de layout, editor de conteudo
- `src/data/content/` — **alta**: pipeline de validacao complexo, serialization, multi-layer normalization
- `src/lib/` — **media-alta**: networking com 3 drivers (mock, broadcast, SSE)
- `src/app/` — **media**: bootstrap, resolucao de deck, lifecycle de sala
- `android-app/` — **media**: WebView com loading nativo, version sync
- `src/logic/` — **media**: regras puras, bem testadas, estavel
- `server/` — **baixa**: ~150 linhas, minimal relay

---

## 4. Arquitetura da app

### Fluxo de telas

```
main.tsx
  └── App.tsx (roteador por estado)
        ├── DevSceneMode?
        │   ├── layout-editor → BattleLayoutEditor
        │   ├── layout-preview → BattleLayoutPreview
        │   ├── content-editor → ContentEditor
        │   └── content-inspector → ContentInspector
        └── Game Flow
            ├── ProfileSetup (se perfil nao existe)
            ├── Menu
            │   ├── Jogar Solo → Lobby solo → DeckSelection (player) → DeckSelection (enemy) → Battle
            │   ├── Multiplayer → Lobby MP → criar/entrar sala → DeckSelection → Battle
            │   ├── Colecao → CollectionScreen
            │   └── Editar Perfil → ProfileSetup
            └── Battle → overlay de resultado → Menu ou rematch
```

### Gestao de estado

App.tsx gerencia com useState:
- `screen`: navegacao entre telas
- `mode`: bot / multiplayer / local
- `playerDeckId`, `enemyBattleDeckId`: decks selecionados
- `activeRoomSession`, `activeRoomState`: sessao e estado da sala
- `sharedInitialGame`, `sharedBattleSnapshot`: estado compartilhado multiplayer
- `playerProfile`: nome + avatar persistidos em localStorage

A Battle recebe setup como props e gerencia seu proprio estado internamente via BattleController.

### Dados imutaveis no startup

O pipeline de conteudo roda uma unica vez na importacao do modulo:
```
buildContentPipeline() → CONTENT_PIPELINE (singleton)
  ├── CONTENT_CATALOG       # Definicoes normalizadas
  ├── CARD_CATALOG           # Analise cross-deck de cards
  ├── DECK_MODELS            # DeckModel[] com metadata
  └── RUNTIME_DECKS_BY_ID    # Deck[] prontos para gameplay
```

---

## 5. Battle

### Visao geral

A battle e o subsistema mais complexo do projeto. Ela tem:
- **Estado logico** (GameState) — quem tem o que, de quem e o turno, quem venceu
- **Estado visual** (BattleRuntimeState) — o que esta animando, entrando, saindo
- **Orquestracao** (BattleController) — conecta logica + visual + timing + network
- **Geometria** (BattleLayoutConfig, BattleSceneSpace, BattleControllerGeometry) — onde cada elemento fica no stage
- **Fluxos** (BattleTurnFlow, BattleCombatFlow, BattleIntroFlow) — sequencia de passos por fase

### Arquivos centrais

| Arquivo | Tamanho | Papel |
|---------|---------|-------|
| `BattleController.tsx` | 66 KB | Maquina de estados central, conecta tudo |
| `BattleCombatFlow.ts` | 26 KB | Orquestracao de sequencia de combate |
| `BattleFieldLane.tsx` | 24.6 KB | Renderizacao dos alvos em campo |
| `BattleHandLane.tsx` | 28.9 KB | Renderizacao da mao do jogador |
| `BattleSceneSpace.ts` | 17.9 KB | Calculos responsivos do stage |
| `BattleSnapshotAuthority.ts` | 15.2 KB | Autoridade de snapshot (multiplayer) |
| `BattleTargetField.ts` | 16.4 KB | Estado e logica do campo de alvos |
| `BattleControllerGeometry.ts` | 14 KB | Geometria de camera e posicionamento |

### Fluxo de uma jogada simples

1. Jogador seleciona carta da mao e alvo
2. `resolveBattlePlayAction()` valida e resolve
3. Carta sai da mao, anima ate o alvo (geometria calculada por `battleSimplePlayGeometry`)
4. Progresso do alvo atualizado
5. Se alvo completou: `BattleCombatFlow` inicia sequencia de ataque/dano/substituicao
6. Nova carta comprada do deck
7. Turno consumido, passa para o oponente

### Fluxo de combate (quando alvo completa)

1. Target windupMs → attackMs → pauseMs → exitMs (sai do campo)
2. Impacto: dano aplicado, vida do oponente reduz, flash visual
3. Carta comprada para recompor mao
4. Novo target entra do deck com animacao
5. Combat unlock → turno finaliza

### Bot (IA)

Logica em `battleFlow.ts`:
1. Se ja agiu → pass
2. Itera mao e alvos, primeira jogada valida → play
3. Se stuck e mulligan disponivel → mulligan tudo
4. Senao → pass

Estrategia greedy, sem planejamento. Tempo de "pensamento" artificial: 1400ms.

### Multiplayer

A battle suporta multiplayer via `BattleRoomBridge.ts`:
1. Acao local executada se for autoridade
2. Acao submetida via transporte (mock/broadcast/SSE)
3. Estado compartilhado via `BattleSnapshotAuthority`
4. Acoes externas consumidas ao chegar

Tres drivers de transporte:
- **Mock**: em memoria, latencia artificial (180ms)
- **Broadcast**: BroadcastChannel API (mesma origem, abas diferentes)
- **Remote**: SSE via `relayServer.ts`

### Intro da battle

Sequencia de abertura (`BattleIntroFlow.ts`):
1. `coin-choice` — jogador escolhe cara/coroa
2. `coin-fall` — animacao da moeda
3. `coin-result` — resultado mostrado
4. `targets` — alvos iniciais entram com animacao
5. `done` — primeiro turno comeca

---

## 6. Editor/Tooling/Preview

### Battle Layout Editor

**Arquivo**: `BattleLayoutEditor.tsx` (253 KB) — o maior arquivo do projeto.

**Funcao**: editor WYSIWYG para posicionar elementos do stage da battle (field slots, hand, status pills, chronicles panel). Funciona sobre `BattleLayoutOverrides` que sao consumidos pelo runtime.

**Invariante critico**: qualquer mudanca de posicao no editor deve refletir com paridade geometrica exata no preview e no runtime live. Nao basta paridade visual aproximada.

**Persistencia**:
- Estado do editor em localStorage (6 chaves)
- Salvar preset aprovado: `POST /__battle-layout/preset` → escreve `BattleLayoutPreset.ts`
- Preview sincroniza por `localStorage` + `postMessage` + polling 250ms

### Battle Layout Preview

**Arquivo**: `BattleLayoutPreview.tsx` (12.8 KB)

Previews de layout com:
- Multiplos device sizes (mobile 375x812, tablet 768x1024, desktop 1280x800)
- 13 animation sets (entry, damage, draw, mulligan, attack, etc.)
- Playback control (play once, loop)
- Debug grid e trajectory visualization

### Content Editor

**Arquivo**: `ContentEditor.tsx` (3171 linhas)

Interface completa para criar/editar decks e targets:
- CRUD de decks e targets
- Edicao de metadata (nome, emoji, raridade, silabas)
- Gestao de pool de silabas
- Validacao em tempo real
- Review summary com diff
- Salva via `POST /__content-editor/deck` (Vite middleware)

### Content Inspector

Visualizador de conteudo normalizado (read-only).

### Watcher/Dump/Probes (apenas DEV)

- **Watcher**: captura snapshot tecnico a cada 300ms, historico de 800 samples
- **Dump**: botao baixa `battle-dev-dump.<timestamp>.json` com metrics, anchors, probes, snapshots
- **Probes**: derivadas dos anchors para inspecao de geometria
- **Debug overlay**: `?battle-layout-debug=1` para comparar frame salvo vs root visual
- **`window.__battleDev`**: API de debug no console (snapshot, dump, damage, kill)

---

## 7. Dados/Conteudo/Contratos

### Pipeline de transformacao

```
Raw Definitions (targets.ts, decks/*.ts)
  ↓ loadContentCatalog() — validacao rigorosa, throws DeckContentError
  ↓
Normalized Content Catalog (cardsById, targetsById, decksById)
  ↓ buildContentPipeline()
  ↓
Derived Models (DeckModel com cards, targetDefinitions, targetInstances)
  ↓
Runtime Decks (Deck[] simplificado para gameplay)
  ↓ resolveAppBattleSetupSelection()
  ↓
Battle Setup Spec (BattleDeckSpec + BattleSetupSpec)
```

### Conteudo atual

**4 decks tematicos**:
| Deck | Emoji | Theme | Targets |
|------|-------|-------|---------|
| Fazenda | `🚜` | harvest | VACA, PORCO, GALINHA, PATO, OVELHA, CAVALO |
| Oceano | `🔱` | abyss | BALEIA, PEIXE, TUBARAO, POLVO, SIRI, CAMARAO |
| Floresta | `🌿` | canopy | LOBO, RAPOSA, ESQUILO, URSO, CORUJA, JACARE |
| Deserto | `🏜️` | dune | CAMELO, COBRA, ABUTRE, FENECO, ESCORPIAO, LAGARTO |

**24 targets** (6 por deck), raridades distribuidas: maioria raro, alguns comum, 2 epicos (TUBARAO, ESCORPIAO), 0 lendarios no catalogo atual.

**Cards auto-gerados**: silabas sao extraidas automaticamente dos targets. Cada deck define um pool de contagem (ex: VA:4, CA:4 para Fazenda).

### Validacao

`loadContentCatalog()` garante:
- Campos obrigatorios presentes (id, name, emoji, syllables)
- Raridades validas e normalizadas
- Sem duplicatas de ID
- Decks referenciam targets existentes
- Pool de silabas suficiente para todos os targets
- Minimo de cards para preencher mao

Unico ponto de throw: `DeckContentError` com lista detalhada de issues.

### Tipos core

**`types/game.ts`** — fonte de verdade para tipos do jogo:
- `GameState` — estado completo da partida
- `PlayerState` — vida, mao, decks, targets em jogo
- `Target` / `UITarget` — alvo com metadata + estado visual
- `BattleTurnAction` — play | mulligan | pass
- `BattleSubmittedAction` — acao versionada para multiplayer
- `BattleEvent` — eventos de gameplay (para chronicles)

**`data/content/types.ts`** — tipos de definicao de conteudo:
- `CardDefinition`, `TargetDefinition`, `DeckDefinition`
- `DeckModel`, `DeckModelCardEntry`, `DeckModelTargetInstance`
- `NormalizedContentCatalog`, `ContentPipeline`

---

## 8. UX/UI e linguagem visual

### Filosofia

A interface comunica fantasia tabletop/livro/pergaminho/taverna. Tudo deve parecer fisico, quente e ornamental. A referencia completa esta em `.agents/rules/design-language.md`.

### Elementos fundamentais

- **Fundo**: parchment bege `#ece3d3` com texturas de papel antigo
- **Paper Panel**: container principal tipo livro com bordas duplas e highlight interno
- **CabinetButton**: botao grande 3D com relevo, textura, highlight superior
- **Tipografia**: Cinzel (display/titulos) + Outfit (funcional/body)
- **Paleta cromatica**: dourado, marrom, verde, azul — cada acao com familia de cor propria

### Interacao

- Touch e mouse com estados visuais distintos
- Prevencao de double-fire entre touch e click
- Hover apenas em `@media(hover:hover)`
- Feedback fisico (translateY + shadow) no press

### Responsividade

Breakpoint especial para mobile landscape curto:
```
@media(pointer:coarse) and (max-height:480px)
```
Reduz tamanhos, simplifica ornamentos, ocupa 100dvh.

### Temas visuais de deck

4 temas mapeados para gradientes Tailwind em `themes.ts`:
- `harvest` (amber), `abyss` (blue/slate), `canopy` (emerald), `dune` (gold/brown)

Usados nos cards e na UI de selecao. A battle em si ainda nao consome tematizacao por deck.

---

## 9. Colecao/Decks/Selecao

### CollectionScreen

Tela de visualizacao da colecao com:
- Filtros por deck, raridade, tipo (targets vs silabas)
- Busca por texto
- Cards renderizados usando `TargetCard` e `SyllableCard` de `GameComponents.tsx`
- Metricas de dano por raridade
- Mini card row (estilo Hearthstone)

Dados consumidos de `CONTENT_PIPELINE` e `APP_RESOLVED_DECKS`.

### DeckSelection

Tela de escolha de deck pre-battle. Em solo, seleciona deck do jogador e depois do oponente. Em multiplayer, cada lado escolhe o seu.

### AppDeckResolver

`appDeckResolver.ts` pre-computa `AppResolvedDeck[]` com:
- `deckModel`: definicao normalizada completa
- `battleDeck`: `BattleDeckSpec` pronto para battle setup
- Metadata: nome, emoji, tema, contagens

---

## 10. Android/Plataforma/Delivery

### Android WebView

**`android-app/`** contem app nativo que carrega `https://syllable-battle.vercel.app/` num WebView.

Caracteristicas:
- Loading overlay nativo animado (crest, progress bar, textura parchment)
- Version sync: faz fetch de `app-version.json`, retenta se build hash nao bate
- Immersive mode (esconde system bars)
- Landscape forçado via manifest
- Screen always on
- HTTPS only, mixed content bloqueado
- Comunicacao via URL params + custom events + global flags

**Ponte web-nativo**:
```
window.__SPELLCAST_BUILD__              // hash do build
window.__SPELLCAST_NATIVE_APP__         // true se WebView Android
window.__SPELLCAST_NATIVE_LOADING_PENDING__  // loading gate ativo
window.__SPELLCAST_MENU_TITLE_READY__   // sinaliza conclusao da carga
```

### Relay Server

`server/relayServer.ts` (~150 linhas):
- Express com SSE
- Rotas: `/health`, `/rooms/:id/events`, `/rooms/:id/action`, `/rooms/:id/state`, `/rooms/:id/disconnect`
- Salas em memoria (Map)
- CORS aberto
- Deploy no Render (free tier, pode hibernar)

### Build e Deploy

| Alvo | Ferramenta | Comando |
|------|-----------|---------|
| Dev frontend | Vite | `npm run dev` |
| Dev relay | tsx | `npm run relay` |
| Build producao | Vite | `npm run build` |
| Deploy frontend | Vercel | push para repo |
| Deploy relay | Render | push para repo |
| Build Android | Gradle | `npm run android:build` |
| Install Android | ADB | `npm run android:install` |

Variavel obrigatoria na Vercel: `VITE_BATTLE_ROOM_RELAY_URL`.

---

## 11. Testes e contratos

### Suite de testes

142 testes em 17 arquivos, todos passando. Rodam com `node --test` nativo via tsx.

**Cobertura por subsistema**:

| Area | Arquivos de teste | O que testa |
|------|------------------|-------------|
| Conteudo | `content.test.ts`, `contentSelectors.test.ts`, `contentInsights.test.ts`, `contentEditor.test.ts` | Validacao de catalogo, selectors, metricas, editor |
| Logica de jogo | `gameLogic.test.ts` | canPlace, isHandStuck, ensureDeck, draw |
| Resolucao de jogada | `battleResolution.test.ts` | Play e mulligan |
| Layout | `BattleLayoutConfig.test.ts`, `BattleSceneSpace.test.ts` | Config e responsividade |
| Contratos de debug | `BattleDebugContracts.test.ts` | Superficie de debug |
| Plano visual | `battleVisualPlan.test.ts` | Intencao visual de jogada simples |
| Geometria | `battleSimplePlayGeometry.test.ts`, `battleHandTravelGeometry.test.ts` | Trajetorias de cartas |
| Animacao | `battleSimplePlayStep.test.ts`, `battleSimplePlayRuntime.test.ts`, `battleCompositeSchedule.test.ts`, `battlePreviewPlayback.test.ts`, `battleAnimationPreviewTiming.test.ts` | Steps, runtime, scheduling, playback |

### Contratos documentados

- `docs/battle-functional-baseline.md` — 5 cenarios-ouro para validar o loop jogavel
- `docs/battle-layout-contract.md` — editor/preset, watcher/dump/probes
- `docs/battle-non-regression-checklist.md` — paridade geometrica, debug runtime, smoke multiplayer
- `docs/battle-visual-catalog.md` — tempos compartilhados, plano visual, anchors

---

## 12. Legado ativo e divida tecnica

### Legado ativo (funcional mas antigo/incompleto)

- **`discard[]` em PlayerState**: existe no tipo, nao e usado. `ensureDeck()` pode reciclar discard→deck, mas o loop atual nunca envia cards para discard. Reservado para futuro.
- **`ENABLE_LOCAL_MULTIPLAYER_MOCK`**: flag hardcoded em App.tsx. Nao tem UI para ligar/desligar.
- **Temas visuais por deck**: os 4 temas (harvest/abyss/canopy/dune) existem em `themes.ts` e sao usados na UI de menu/colecao, mas a battle stage nao consome tematizacao visual por deck.
- **Rarity "lendario"**: definida no sistema de tipos e dano (4 damage), mas nenhum target no catalogo atual tem essa raridade.

### Divida tecnica

- **Arquivos gigantes**: `BattleLayoutEditor.tsx` (253 KB), `BattleSceneFixtureView.tsx` (137 KB), `BattleController.tsx` (66 KB), `ContentEditor.tsx` (3171 linhas). Alta complexidade cognitiva.
- **Flat screens directory**: todos os 79 arquivos da battle vivem em `components/screens/`. Nao ha subpastas. Dificil navegar.
- **Sem state management library**: estado gerenciado manualmente com useState/useRef. Funciona, mas o App.tsx tem 50+ linhas so de declaracoes de estado.
- **Bot simples**: IA greedy sem estrategia. Funcional mas previsivel.
- **Relay sem persistencia**: salas em memoria, perdem-se se o servidor reinicia (Render hiberna no free tier).
- **Sem autenticacao**: qualquer um pode entrar em qualquer sala com o codigo.

---

## 13. Areas solidas

Estas areas estao estaveis, testadas e bem definidas:

1. **Pipeline de conteudo** (`data/content/`): validacao rigorosa, normalizacao multi-camada, testes extensivos. Adicionar um novo deck e seguro — a validacao pega problemas antes de chegar ao runtime.

2. **Regras de jogo** (`logic/gameLogic.ts`): funcoes puras, bem testadas, sem side effects. A mecanica central (canPlace, draw, shuffle, makeInitialGame) e confiavel.

3. **Suite de testes**: 142 testes cobrindo todos os subsistemas criticos. Funciona como rede de seguranca real.

4. **Design language**: documentada em detalhe, consistente entre telas. Os menus (Menu, Lobby, ProfileSetup) seguem a mesma linguagem visual com fidelidade.

5. **Sistema de layout/preset**: contrato editor→preview→runtime esta documentado e funciona. O invariante de paridade geometrica esta protegido por checklist.

6. **Documentacao tecnica**: `docs/` tem baseline funcional, contrato de layout, checklist de nao-regressao e catalogo visual. Documentacao rara e util.

7. **Geometria de animacao simples**: os arquivos `battleSimplePlay*.ts` e `battleHandTravelGeometry.ts` estao isolados, testados e representam o fluxo mais consolidado.

---

## 14. Areas frageis

Estas areas requerem cuidado extra:

1. **BattleController.tsx (66 KB)**: maquina de estados central, conecta tudo. Qualquer mudanca aqui tem potencial de cascata. Nao tem testes unitarios proprios — depende dos testes dos subsistemas.

2. **BattleLayoutEditor.tsx (253 KB)**: arquivo gigante com complexidade extrema. Mudancas sao arriscadas e dificeis de revisar. O editor funciona, mas e fragil a refactors.

3. **BattleCombatFlow.ts (26 KB)**: orquestracao de combate com muitas fases encadeadas e timers. Dificil de debuggar quando algo desalinha.

4. **Sincronizacao multiplayer**: a combinacao de BattleSnapshotAuthority + battleRoomStateController + drivers de transporte cria uma superfície de falha grande. Bugs de sync sao dificeis de reproduzir.

5. **Estado de App.tsx**: gerenciamento manual com 50+ useState. Facil introduzir estados inconsistentes ou race conditions em transicoes de tela.

6. **Flat directory `screens/`**: 79 arquivos sem subpastas. Facil confundir arquivos com nomes parecidos (ex: `battleFlow.ts` vs `BattleFlow.ts`, `BattleTurnFlow.ts` vs `BattleCombatFlow.ts`).

---

## 15. Riscos de regressao

### Alto risco

1. **Mudancas em CSS/layout da battle** → podem quebrar paridade geometrica entre editor/preview/runtime. Sempre validar com checklist de nao-regressao.

2. **Mudancas em BattleController** → podem afetar loop de turno, timing de animacoes, sincronizacao multiplayer. Sempre rodar baseline funcional.

3. **Mudancas no pipeline de conteudo** → podem invalidar todos os decks. A validacao e rigorosa mas o catalogo de 24 targets e 4 decks pode ter edge cases em expansao.

4. **Mudancas em timings de animacao** → podem causar desalinhamento visual ou overlaps em sequencias encadeadas. Os tempos em `battleSharedTimings.ts` e `gameLogic.ts` sao usados em multiplos pontos.

### Medio risco

5. **Mudancas em App.tsx** → podem afetar transicoes de tela e estado de sessao. O estado e manual e fragil.

6. **Mudancas no relay** → podem quebrar multiplayer. O relay e simples mas nao tem testes.

7. **Mudancas na resolucao de deck** → podem afetar setup de battle. O pipeline e complexo com multiplas camadas de transformacao.

### Baixo risco

8. **Mudancas em menus** → relativamente isolados. Desde que a design language seja preservada.

9. **Mudancas no Android wrapper** → raramente necessarias. WebView carrega URL remota.

---

## 16. Prioridades tecnicas atuais

### Inferidas do estado da repo (nao prescritas)

1. **Proteger o que funciona**: a battle jogavel, os testes, o pipeline de conteudo e o editor de layout estao estaveis. Qualquer evolucao deve manter essa base intacta.

2. **Battle e landscape-only**: esta e uma restricao declarada em AGENTS.md. Nao tentar portrait para a battle sem instrucao explicita.

3. **Evolucao incremental**: AGENTS.md pede "objetivos pequenos, revisaveis e verificaveis". A repo nao esta num estado que suporte grandes refactors seguros.

4. **Conteudo expandivel**: o pipeline suporta novos decks e targets com seguranca. A expansao de conteudo e o caminho de menor risco para evolucao do produto.

5. **Ferramentas de dev maduras**: o editor de layout, o preview, o watcher/dump e as probes ja existem e funcionam. Usar em vez de reinventar.

6. **Documentacao viva**: os contratos e baselines em `docs/` sao raros e valiosos. Mante-los atualizados ao evoluir.

---

## 17. Veredito final sobre o estado atual

O Syllable Battle esta num ponto de maturidade desigual mas funcional.

**O que ja esta maduro:**
O loop jogavel central funciona. O pipeline de conteudo e rigoroso e seguro para expansao. A suite de 142 testes protege os subsistemas criticos. O editor de layout e o sistema de preview/watcher sao ferramentas de desenvolvimento incomumente sofisticadas para um projeto deste porte. A design language esta documentada e consistente. Os contratos em `docs/` sao raros e uteis — poucos projetos tem baseline funcional, checklist de nao-regressao e contrato de layout documentados.

**O que ainda e fragil:**
A complexidade esta concentrada em poucos arquivos gigantes (BattleController, BattleLayoutEditor, ContentEditor) que sao dificeis de revisar e arriscados de mexer. O flat directory de 79 arquivos em `screens/` dificulta a navegacao. O estado do App.tsx e manual e propenso a inconsistencias. A sincronizacao multiplayer funciona mas tem superficie de falha grande. O relay nao tem testes nem persistencia.

**Estado geral:**
A repo esta pronta para evolucao incremental cuidadosa, nao para grandes refactors. O caminho mais seguro de evolucao e expansao de conteudo (novos decks/targets) e melhorias isoladas que nao toquem nos subsistemas centrais da battle. Qualquer mudanca estrutural requer plano, diffs pequenos e validacao com os contratos existentes.
