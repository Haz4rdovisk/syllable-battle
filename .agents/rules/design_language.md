# Syllable Battle — Linguagem de Design dos Menus

Estudo cobrindo: **Menu principal**, **Lobby (Multiplayer)** e **Editar Perfil (ProfileSetup)**.

---

## 1. Fontes

| Papel | Família | Pesos usados | Uso |
|---|---|---|---|
| Serif / Display | **Cinzel** | 400, 700, 900 | Títulos, nomes de botões, room code, labels de personagem |
| Sans / Body | **Outfit** | 300, 400, 600, 800 | Labels pequenas, badges, microtextos, subtítulos |

> Cinzel é a fonte identitária do jogo — traz o tom de fantasia/épico.
> Outfit é a fonte funcional — legibilidade em tamanhos pequenos.

Padrão de label secondary: `font-black uppercase tracking-[0.2–0.34em]` — todas em caps com espaçamento largo para estilo tabletop/taverna.

---

## 2. Paleta

### Fundo de tela
Todas as 3 telas compartilham o **mesmo fundo**:

```
bg-[#ece3d3]   ← base: parchment bege-areia
```

Com **duas sobreposições de textura** (pointer-events-none, absolutas):
1. `old-mathematics.png` (transparenttextures) — opacity 70%  
2. Grid de linhas azul-acinzentado leve (`rgba(120,155,176,0.1–0.14)`) — `bg-[size:120px_120px]` — opacity 45%  
   - Só no Menu e ProfileSetup. No Lobby é um grid menor `44px×44px` com linhas marrons `rgba(120,92,64,0.08)`.

**Efeito**: papel envelhecido de livro de feitiços / pergaminho.

---

### Paleta de cores de UI

| Nome / Papel | Cor | Onde |
|---|---|---|
| Texto principal | `#31271e` | Corpo geral de menus |
| Título vermelho-escuro | `#5b2408` | Títulos Cinzel grandes (ex.: "Multiplayer", "Sala de Duelo") |
| Dourado laranja | `#a96e43` | Labels secundárias ("Duelista", roles) |
| Borda de painel | `#4b3527` a 25% | Border do paper-panel externo |
| Borda interna de painel | `#d9c8a9` | Borda decorativa interna (1px) |
| Highlight branco | `rgba(255,255,255,0.28–0.32)` | `bg-white/28`, inset highlight topo |

---

### Paleta dos botões (por tom)

| Tom | BG principal | BG hover | Border | Shadow / 3D | Texto | Uso |
|---|---|---|---|---|---|---|
| **solo** (dourado) | `#d9a22b` | `#e0ac37` | `#b77912` | `#8f5f12` | `#fff8e8` | Jogar Solo |
| **online** (verde) | `#2f9a56` | `#35a55d` | `#1f7a46` | `#22673f` | `#f6fff2` | Jogar Online, Criar Sala, Iniciar Duelo, Salvar |
| **collection** (azul) | `#4c95c4` | `#5aa1ce` | `#2b6d9a` | `#28597d` | `#f5fbff` | Minha Coleção, Editar Perfil |
| **packs** (roxo) | `#b882ac` | `#c18ab4` | `#8d5b86` | `#7d4f74` | `#fff7ff` | Open Packs (em breve) |
| **amber/cobre** | `#c88a32` | `#d29134` | `#8f5f12` | `#8f5f12` | `#fff8e0` | Entrar em Sala |
| **gold secondary** | `#f0dfc4` | — | `#8f5f12` | `#8f5f12` | `#6b4723` | Voltar (back button) |

---

## 3. Paper Panel — o container principal

Todas as telas usam o mesmo container de "livro/fólio":

```
rounded-[2rem] border-[4px] border-[#4b3527]/25
px-4 py-5  (sm: px-7 py-7)
shadow-[0_35px_80px_rgba(0,0,0,0.16)]
bg-white/28 (via classe CSS `paper-panel` + camada absoluta)
```

Depois da borda externa, há **3 camadas decorativas** internas (absolutas, pointer-events-none):

| Camada | O que é |
|---|---|
| `bg-white/28` absoluto full | Fosca sobre a textura do paper-panel |
| `border border-[#d9c8a9]` inset 14px | Borda interna dourada bege — cria profundidade de livro |
| `border border-white/32` inset 12–18px | Highlight interior branco sutil — efeito de papel brilhante |

Nas telas mobile landscape (`pointer:coarse and max-height:480px`), o painel ocupa `100dvh` e os insets são menores.

---

## 4. Anatomia dos Botões

### 4a. CabinetButton (botões grandes do Menu)

O botão mais característico do jogo. Estrutura:

```
h-[6.8rem]  (sm: 7.35rem, mobile-landscape: 3.9rem)
rounded-[1.85rem]  (mobile-landscape: 1rem)
border-[3px]
px-5 py-4
text-left
transition-all duration-150 ease-out
```

**Animação 3D nativa:**
- Desktop hover: `hover:-translate-y-1` + `hover:shadow-[0_10px...]`
- Desktop active: `active:translate-y-[4px]` + `shadow-[0_3px...]`
- Touch: shadow e translateY controlados por estado React (`pressedButtonId`)

**Layers internas do CabinetButton (de baixo para cima):**

| Camada | O que é |
|---|---|
| `paper-fibers.png` opacity-20 mix-blend-soft-light | Textura de papel fibra |
| `h-[3px] rounded-b-full bg-white/22` no topo | Linha de highlight superior (reflexo de luz) |
| `border border-black/10 inset-0 rounded-[1.65rem]` | Borda interna escura suave |
| `border border-white/16 inset-[6px] rounded-[1.5rem]` | Borda interna clara (profundidade) |
| Conteúdo z-10: ícone + texto | Ícone à esquerda, label + detalhe à direita |

**Ícone do CabinetButton:**
```
h-[4.45rem] w-[4.45rem]
rounded-[1.45rem]
border-[2.5px] backdrop-blur-md
shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_24px_rgba(0,0,0,0.14)]
```
+ highlight oval branco no topo de dentro (`bg-white/28 blur-sm`)

**Tipografia dentro:**
- Label: `font-serif text-[1.7rem] font-black leading-none` (sm: 1.95rem)
- Detail: `text-[0.7rem] font-black uppercase tracking-[0.18em] text-current/78` (sm: 0.74rem)

---

### 4b. Botão de Ação Primária (verde)

Usado em: **Criar Sala**, **Entrar numa Sala**, **Iniciar Duelo**, **Salvar Perfil**.

```
h-[4rem] (ou 3.5rem no ProfileSetup)
w-full  (full-width em geral)
rounded-[1.2rem] (ou 1.15–1.3rem)
border-[3px] border-[#1f7a46]
bg-[#2f9a56]
font-serif text-[1.05rem] font-black
text-emerald-50
shadow-[0_7px_0_#22673f, 0_18px_28px_rgba(20,83,45,0.22)]
transition-all duration-150 ease-out
```

Hover (mouse): `-translate-y-1` + shadow maior (`0_10px_0_#22673f`)  
Active (mouse): `translate-y-[4px]` + shadow menor  
Touch: estado React com `pressedButtonId`  
Disabled: `opacity-60 cursor-not-allowed`

**Camadas internas:**
- `absolute inset-[5px] rounded-[1rem] border border-white/16` — borda interna clara
- (`paper-fibers.png` em alguns botões)
- `inset-x-4 top-0 h-[3px] rounded-b-full bg-white/22` — highlight topo

---

### 4c. Botão Secundário / Voltar (dourado/cobre)

Botão "Voltar", "Dissolver", "Sair" do Lobby:

```
h-[3.2rem]  (mobile: 2.08rem)
w-[8.6rem]  (mobile: 5.15rem)
rounded-[1.15rem]  (mobile: 0.78rem)
border-[2px] border-[#8f5f12]
bg-[#f0dfc4]
font-serif text-[0.74rem] font-black uppercase tracking-[0.08em]
text-[#6b4723]
shadow-[0_5px_0_#8f5f12, 0_12px_22px_rgba(88,52,8,0.16)]
```

Hover: `-translate-y-0.5`  
Camada interna: `absolute inset-[4px] rounded-[0.9rem] border border-white/24`

---

### 4d. Botão "Editar Perfil" (azul)

Aparece no canto superior direito do Menu:

```
h-[4.1rem] w-[8.4rem]
rounded-[1.35rem]
border-[2px] border-[#2d6b8f]
bg-[#4f9fcc]
font-black uppercase tracking-[0.08em]
text-[#f3fbff]
shadow-[0_5px_0_#28597d, 0_14px_22px_rgba(35,74,110,0.18)]
```

Ícone (emoji ✏️) + label "Perfil" lado a lado.

---

### 4e. Botão Copy Code (circular/icon)

```
h-[3rem] w-[3rem]
rounded-full
border border-[#cdb68b]
bg-white/80
shadow-[0_2px_0_#cdb68b, 0_6px_10px_rgba(0,0,0,0.06)]
text-[#7a5c3f]
```

---

## 5. Inputs de texto

Dois inputs no projeto (Lobby: código da sala; ProfileSetup: nome):

```
rounded-[1.2rem] (ou 1.15rem)
border-2 border-amber-900/14–18
bg-amber-50/82–84
px-4
font-serif text-[1.55rem] font-black
tracking-[0.18em] (código) | tracking-tight (nome)
text-amber-950
outline-none
transition-all
placeholder:text-amber-900/18–20
focus:border-amber-500
```

---

## 6. Badges / Pills

### Badge "Em Breve" (CabinetButton disabled)
```
rounded-full px-2.5 py-1
text-[0.58rem] font-black uppercase tracking-[0.22em]
```
Cor de acordo com o tom do botão (ex. packs: `bg-[#f5d9ee] text-[#7d4f74]`)

### Badge "Nível" (dourado)
```
min-h-[3.4rem] min-w-[9.9rem]
rounded-full
border border-[#d6b66e]
bg-[linear-gradient(180deg, rgba(255,250,236,0.98), rgba(236,205,132,0.96))]
px-4 py-2
text-[#7a5526]
shadow-[0_12px_22px_rgba(0,0,0,0.08), inset_0_1px_0_rgba(255,255,255,0.82)]
```
Destaque interno: `bg-white/70` no topo (highlight), `border border-white/28` interno.  
Ícone: ⭐ radial-gradient `#fff4cf → #e1b75d`, borda `#c99d46`.

### Status pill (Online / Aguardando)
```
inline-flex items-center gap-2.5
rounded-full
border border-[#c9b79a]
bg-[#fff8ee]
px-3.5 py-1.5
text-[0.58rem] font-black uppercase tracking-[0.16em]
text-[#7a6146]
shadow-[0_8px_16px_rgba(0,0,0,0.05)]
```
Dot colorido: `h-2.5 w-2.5 rounded-full` — verde (conectado), âmbar (aguardando), verde-6aa36d (idle Online).

### Badge de código da sala
```
rounded-[1.25rem] border border-[#ceb991]
bg-[#fff6e8] px-4 py-3 shadow-inner
```
Texto do código: `font-serif text-[2.7rem] font-black tracking-[0.1em] text-[#5b2408]`  
Label: `text-[0.56rem] font-black uppercase tracking-[0.28em] text-[#9a7f5c]`

---

## 7. Cartão de Participante (ParticipantCard)

Reutilizado no Lobby e ProfileSetup:

```
rounded-[1.2rem] border px-3 py-3
shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
```

| Tom | Border | BG | Texto |
|---|---|---|---|
| local | `border-[#2e7d32]/22` | `bg-[#f4fbf4]` | `text-[#1f5b2a]` |
| remote | `border-[#8f5f12]/18` | `bg-[#fff8ef]` | `text-[#6b4723]` |

Avatar dentro: `border-2 border-current/18 bg-white/72 shadow-[0_10px_18px_rgba(0,0,0,0.08)]`

Nome: `font-serif font-black uppercase tracking-[0.04em]`  
Role: `text-[0.58rem] font-black uppercase tracking-[0.24em] text-current/70`

---

## 8. Ícone Swords (divisor)

Separador circular entre os dois participantes / dois painéis de ação:

```
h-[3.15rem] w-[3.15rem]
rounded-full
border border-[#d7c19a]
bg-[#f8ecd8]
text-[#8a6428]
shadow-inner
```

---

## 9. Seleção de Avatar (ProfileSetup)

Grid 8×2 de botões emoji:

```
h-[4.2rem] rounded-[1.05rem] border-2 bg-amber-50
text-[2rem]
shadow-[0_10px_18px_rgba(0,0,0,0.1)]
transition-all hover:-translate-y-1
```

Estado selecionado: `border-emerald-500 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]`  
Indicador: checkmark absoluto `top-1 right-1`, fundo `bg-emerald-500`.

---

## 10. Animações de entrada

Todas as telas usam `motion.div` da biblioteca `motion/react`:

| Tela | Initial | Animate |
|---|---|---|
| Menu | `{ opacity: 0, y: 20 }` | `{ opacity: 1, y: 0 }` |
| Lobby | `{ opacity: 0, y: 18 }` | `{ opacity: 1, y: 0 }` (duration 0.28, easeOut) |
| ProfileSetup | `{ opacity: 0, scale: 0.985 }` | `{ opacity: 1, scale: 1 }` |
| Logo do Menu | spring: `stiffness 100`, scale 0.8→1 rotate -5→0 |

Transições de tela (App.tsx/AnimatePresence):
- Menu: `opacity + scale (0.95→1)`
- DeckSelection: `opacity + x (50→0)`
- Lobby: `opacity + y (50→0)`
- Battle: `opacity` puro (0.5s)

---

## 11. Detalhes ornamentais

### BinderRings (Menu — só em lg)
Argolas de fichário douradas no lado esquerdo do painel (`hidden lg:flex`).  
Renderizadas como SVG com `linearGradient` (`#faeedc → #9f6b35 → #f1ca91`).  
Conectadas por arcos SVG curvados com gradiente metálico.

### Paper Fibers texture
Em botões principais e certos containers: `url('https://www.transparenttextures.com/patterns/paper-fibers.png')` com `opacity-15–20 mix-blend-soft-light`.

### Highlight de borda superior nos botões
Em quase todos os botões: uma linha absoluta no topo de 2–3px:
```
absolute inset-x-3 top-0 h-[2–3px] rounded-b-full bg-white/22–70
```
Simula luz vindo de cima.

### Linha de borda interna
```
absolute inset-[4–7px] rounded-[X] border border-white/14–24
```
Profundidade/vidro no botão.

---

## 12. Sistema de interação touch/mouse

Padrão consistente em **todas** as telas (Menu, Lobby, ProfileSetup):

- Pressionar touch → `pressedButtonId` state → classes de shadow/translateY reduzidos
- Mouse hover → CSS `[@media(hover:hover)]:hover:...` (Tailwind arbitrary variant)
- Touch click → `pointerType === "mouse"` é ignorado nos handlers touch, e vice-versa
- Double-fire prevention: `touchActivatedButtonRef` evita que o `onClick` dispare após o touch handler já ter agido

Isso garante feedback físico realista em ambas interfaces, sem conflitos.

---

## 13. Responsividade

Menu, Lobby e ProfileSetup têm suporte explícito para **mobile landscape curto**:
```
[@media(pointer:coarse)_and_(max-height:480px)]
```
Nesse breakpoint os botões ficam menores (altura ~60% do normal), o painel ocupa 100dvh e elementos decorativos são ocultados.

En touch geral: `[@media(pointer:coarse)]` — tamanhos intermediários.

---

## Resumo visual em 5 pontos

1. **Paleta quente/parchment** — bege `#ece3d3`, dourado, marrom, textura de papel envelhecido
2. **Tipografia display Cinzel** — uppercase, tracking largo, tom épico/fantasia
3. **Botões 3D tactile** — shadow dupla (lateral sólida + blur difuso), translateY no press
4. **Painel de livro** — bordas duplas (escura + bege), highlight branco interno, textura de matemática antiga
5. **Animações suaves** — entrada com motion, press com estado React, sem animações pesadas no idle
