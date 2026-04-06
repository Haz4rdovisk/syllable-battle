---
trigger: always_on
---

# Syllable Battle – Visão Geral do Repositório

## O que é

**Syllable Battle** é um card game digital de sílabas para navegador (e Android via WebView), focado em visual fantasy, animações, UX de jogo e multiplayer por sala com código.

- **URL de produção**: https://syllable-battle.vercel.app/
- **Stack**: React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + Motion (Framer)
- **Runtime de jogo**: Loop jogável landscape-only no frontend. Relay leve no servidor para multiplayer.

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 6 |
| Tipagem | TypeScript ~5.8 |
| Estilo | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animação | `motion` (Framer Motion v12) |
| IDs únicos | `nanoid` |
| Ícones | `lucide-react` |
| Testes | Node.js `--test` nativo (tsx) |
| Servidor de relay | Express (SSE) via `tsx` |
| Android | WebView nativo em `android-app/` |
| Deploy frontend | Vercel |
| Deploy relay | Render |

---

## Estrutura de pastas

```
/
├── src/
│   ├── App.tsx               # Root: roteador de screens + gestão de sessão
│   ├── main.tsx              # Entry point React
│   ├── index.css             # CSS global
│   ├── types/
│   │   └── game.ts           # Tipos core: GameState, PlayerState, Target, Deck, BattleEvent...
│   ├── logic/
│   │   └── gameLogic.ts      # Funções puras de jogo (shuffle, draw, canPlace, makeInitialGame...)
│   ├── data/
│   │   └── content/          # Conteúdo: decks, targets, seletores, editor de conteúdo
│   ├── app/
│   │   ├── appBootstrap.ts   # Perfil, devSceneMode
│   │   ├── appDeckResolver.ts# Resolução de decks para battle setup
│   │   └── useAppRoomLifecycle.ts # Hook: lifecycle da sala multiplayer
│   ├── lib/
│   │   ├── battleRoomSession.ts        # Serviço de sala (mock ou real)
│   │   ├── battleRoomSseConnector.ts   # Conector SSE para relay remoto
│   │   ├── battleRoomStateController.ts# Controle de estado da sala
│   │   └── ...                        # Protocol, transport, driver
│   ├── components/
│   │   ├── screens/          # Telas principais (Battle, Menu, Lobby, DeckSelection...)
│   │   ├── game/             # Componentes de jogo (cards, stacks)
│   │   └── ui/               # Componentes UI reutilizáveis
│   └── assets/               # Assets estáticos
├── server/
│   └── relayServer.ts        # Relay SSE mínimo (Express) para multiplayer
├── tools/                    # Scripts de dev (vite sem symlinks, edge debug, android build)
├── android-app/              # App Android nativo (WebView)
├── public/                   # Assets públicos
└── docs/                     # Documentação adicional
```

---

## Telas (Screens)

| Screen | Arquivo | Função |
|---|---|---|
| Menu | `Menu.tsx` | Seleção de modo (bot/multiplayer/local), perfil |
| ProfileSetup | `ProfileSetup.tsx` | Criação/edição de perfil do jogador |
| DeckSelection | `DeckSelection.tsx` | Escolha de deck para a batalha |
| Collection | `CollectionScreen.tsx` | Visualização da coleção de cartas/decks |
| Lobby | `Lobby.tsx` | Criar/entrar em sala multiplayer |
| Battle | `Battle.tsx` | Tela principal de batalha |
| BattleLayoutEditor | `BattleLayoutEditor.tsx` | Editor interno de layout da batalha (dev) |
| BattleLayoutPreview | `BattleLayoutPreview.tsx` | Preview do layout (dev) |
| ContentInspector | `ContentInspector.tsx` | Inspector de conteúdo (dev) |
| ContentEditor | `ContentEditor.tsx` | Editor de conteúdo/decks (dev) |

---

## Roteamento de telas

O `App.tsx` gerencia o roteamento por um state `screen: "menu" | "deck-selection" | "collection" | "lobby" | "battle"` com `AnimatePresence` (transitions animadas).

Há também **DevSceneModes** (URL query params):
- `?battle-layout-editor=1` → abre `BattleLayoutEditor`
- `?battle-layout-preview=1` + `?battle-layout-debug=1` → abre preview/debug
- Content inspector/editor via query params também

---

## Modelo de jogo

### Tipos core (`src/types/game.ts`)
- **Syllable** = `string` (sílaba)
- **Target** = alvo com sílabas necessárias + raridade + emoji
- **Deck** = coleção de sílabas + targets
- **PlayerState** = vida, mão, deck de sílabas, deck de targets, targets em jogo
- **GameState** = 2 players, turno, estado de intro, fila de mensagens, modo de jogo

### Raridades e dano
| Raridade | Dano |
|---|---|
| comum | 1 |
| raro | 2 |
| épico | 3 |
| lendário | 4 |

### Configuração padrão (`gameLogic.ts`)
- Vida inicial: **10**
- Tamanho da mão: **5 cartas**
- Targets em jogo: **2**
- Mulligan máximo: **3**

### Fluxo de turno
1. Jogador seleciona sílaba da mão
2. Coloca na sílaba correta de um target
3. Se o target completar todas as sílabas → ataca → dano ao oponente → substitui target
4. Pode fazer mulligan (troca de cartas) se a mão estiver travada
5. Passa o turno / bot age automaticamente

---

## Multiplayer

- **Mock local**: sala simulada em memória com latência artificial (180ms)
- **Relay real**: servidor SSE Express em `server/relayServer.ts`
  - Porta: 3010
  - Health check: `/health`
  - Deploy: Render
- **Protocolo**: SSE (Server-Sent Events) para eventos em tempo real
- **Variável de ambiente**: `VITE_BATTLE_ROOM_RELAY_URL`

---

## Scripts npm importantes

| Script | Função |
|---|---|
| `npm run dev` | Dev server (Vite via wrapper sem symlinks) |
| `npm run relay` | Inicia relay SSE local |
| `npm run test` | Roda todos os testes unitários |
| `npm run lint` | Checa tipos TypeScript |
| `npm run build` | Build de produção |
| `npm run edge:editor` | Abre Edge com o layout editor |
| `npm run android:build` | Build do APK Android |

---

## Sistema de layout e editor

Um dos sistemas mais complexos do projeto:
- **BattleLayoutConfig** – configuração detalhada de posicionamentos do stage
- **BattleLayoutEditor** – editor visual WYSIWYG dos elementos da batalha (249KB!)
- **BattleLayoutEditorState** – estado do editor
- **BattleLayoutPreset** – presets salvos de layout
- **BattleLayoutDebugOverlay** – overlay de debug de geometria
- **BattleSceneSpace** – cálculos de espaço do stage de batalha
- **BattleControllerGeometry** – geometria de câmera e posicionamentos

> ⚠️ Invariante crítico: mover objetos no editor DEVE refletir com paridade geométrica exata no runtime — não apenas paridade visual aproximada.

---

## Testes

Suite robusta testando todos os subsistemas críticos:
- `gameLogic.test.ts` – lógica pura de jogo
- `content.test.ts`, `contentSelectors.test.ts`, `contentEditor.test.ts` – dados e conteúdo
- `BattleDebugContracts.test.ts` – contratos de debug
- `BattleLayoutConfig.test.ts` – configuração de layout
- `battleSimplePlay*.test.ts` – gameplay simplificado (geometria, steps, runtime)
- `battleCompositeSchedule.test.ts` – scheduling de animações
- `battlePreviewPlayback.test.ts` – playback de preview
- `battleHandTravelGeometry.test.ts` – geometria de viagem de cartas da mão

---

## Android

`android-app/` contém app nativo Android com WebView apontando para `https://syllable-battle.vercel.app/`. Atualizações web não requerem novo APK enquanto a estrutura nativa não mudar.

---

## Riscos e pontos de atenção

- Battle deve ser tratada como **landscape-only** no curto prazo
- `BattleLayoutEditor.tsx` é um arquivo gigante (249KB) — alta complexidade
- `BattleController.tsx` também (66KB) — centro do loop de batalha
- A geometria de stage é delicada — qualquer mudança de layout/CSS pode quebrar paridade
- O relay gratuito no Render pode hibernar — primeira conexão pode ser lenta
