---
trigger: always_on
---

# Syllable Battle — Design Language dos Menus

Este documento define a linguagem visual e de interação dos menus de **Syllable Battle**, cobrindo:

- **Main Menu**
- **Lobby (Multiplayer)**
- **ProfileSetup**

O objetivo é preservar a identidade atual do jogo e servir como referência para manutenção, expansão e auditoria visual.

---

# 1. Princípio visual

A interface dos menus deve comunicar uma fantasia **tabletop / livro / pergaminho / taverna**, com aparência tátil, quente e ornamental.

A sensação geral deve ser de:

- painel de livro antigo
- papel envelhecido
- botões físicos e pressionáveis
- tipografia épica com suporte funcional legível
- motion suave, sem excesso de ruído visual

**Não descaracterizar esse sistema.**  
Qualquer evolução deve parecer continuação natural da mesma direção de arte, e nunca um redesenho genérico.

---

# 2. Fundamentos da identidade

## 2.1 Tipografia

### Fonte identitária
**Cinzel**

Usos:
- títulos
- labels principais
- nome de botões
- room code
- nomes de personagem
- headings de painéis

Pesos usados:
- `400`
- `700`
- `900`

### Fonte funcional
**Outfit**

Usos:
- subtítulos
- microtextos
- badges
- labels auxiliares
- textos menores de interface

Pesos usados:
- `300`
- `400`
- `600`
- `800`

### Padrão de label secundária
```txt
font-black uppercase tracking-[0.2–0.34em]
```

Esse padrão ajuda a manter o tom editorial/fantasia com legibilidade em escala pequena.

---

## 2.2 Fundo compartilhado

Os três menus compartilham a mesma base de fundo:

```txt
bg-[#ece3d3]
```

Esse fundo deve sempre ser enriquecido por camadas decorativas absolutas com `pointer-events-none`.

### Camadas obrigatórias

1. **Textura de papel envelhecido**
   - `old-mathematics.png`
   - opacity aproximada de `70%`

2. **Grid decorativo**
   - No **Main Menu** e **ProfileSetup**:
     - linhas azul-acinzentadas leves
     - `rgba(120,155,176,0.1–0.14)`
     - `bg-[size:120px_120px]`
     - opacity próxima de `45%`
   - No **Lobby**:
     - grid menor
     - `44px × 44px`
     - linhas marrons suaves
     - `rgba(120,92,64,0.08)`

### Intenção do fundo
O fundo deve parecer:
- pergaminho
- página editorial antiga
- superfície de livro arcano

---

## 2.3 Paleta base

### Cores centrais da UI

| Papel | Valor |
|---|---|
| Texto principal | `#31271e` |
| Títulos escuros / queimados | `#5b2408` |
| Destaque dourado-laranja | `#a96e43` |
| Borda externa de painel | `#4b3527` com 25% |
| Borda interna de painel | `#d9c8a9` |
| Highlight branco suave | `rgba(255,255,255,0.28–0.32)` |

A paleta deve continuar **quente**, editorial e levemente envelhecida.  
Evitar aparência fria, tecnológica ou genérica.

---

# 3. Sistema de painéis

## 3.1 Paper Panel

O container principal dos menus é um painel de livro/papel com profundidade visual.

### Base

```txt
rounded-[2rem]
border-[4px] border-[#4b3527]/25
px-4 py-5
sm:px-7 sm:py-7
shadow-[0_35px_80px_rgba(0,0,0,0.16)]
bg-white/28
```

### Camadas internas obrigatórias

1. overlay fosco:
```txt
bg-white/28
```

2. borda interna bege:
```txt
border border-[#d9c8a9]
```

3. highlight interno branco:
```txt
border border-white/32
```

### Sensação esperada
O painel deve parecer:
- interior de capa de livro
- painel nobre impresso
- papel envernizado de forma sutil

### Comportamento em coarse/mobile landscape curto

No breakpoint:

```txt
[@media(pointer:coarse)_and_(max-height:480px)]
```

o painel pode:
- ocupar `100dvh`
- reduzir insets
- simplificar ornamentos

Mas **não pode perder identidade**.

---

# 4. Sistema de botões

Os botões são um dos pilares da linguagem visual.  
Eles devem parecer **objetos físicos**, com relevo, peso e resposta de pressão.

---

## 4.1 CabinetButton

É o botão principal de navegação do menu.

### Estrutura base

```txt
h-[6.8rem]
sm:h-[7.35rem]
mobile-landscape:h-[3.9rem]
rounded-[1.85rem]
mobile-landscape:rounded-[1rem]
border-[3px]
px-5 py-4
text-left
transition-all duration-150 ease-out
```

### Camadas visuais obrigatórias

1. textura:
```txt
paper-fibers.png
opacity-20
mix-blend-soft-light
```

2. highlight superior:
```txt
h-[3px] rounded-b-full bg-white/22
```

3. borda interna escura:
```txt
border border-black/10
```

4. borda interna clara:
```txt
border border-white/16 inset-[6px]
```

### Bloco do ícone

```txt
h-[4.45rem] w-[4.45rem]
rounded-[1.45rem]
border-[2.5px]
backdrop-blur-md
shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_24px_rgba(0,0,0,0.14)]
```

### Tipografia interna

Label principal:
```txt
font-serif text-[1.7rem] font-black leading-none
sm:text-[1.95rem]
```

Detail:
```txt
text-[0.7rem] font-black uppercase tracking-[0.18em] text-current/78
```

### Interação

- hover desktop: sobe levemente
- active desktop: afunda
- touch: resposta controlada por estado visual equivalente

Esse botão **não pode ser achatado**.

---

## 4.2 Famílias cromáticas dos botões

| Família | BG | Hover | Border | Shadow 3D | Text |
|---|---|---|---|---|---|
| Solo | `#d9a22b` | `#e0ac37` | `#b77912` | `#8f5f12` | `#fff8e8` |
| Online | `#2f9a56` | `#35a55d` | `#1f7a46` | `#22673f` | `#f6fff2` |
| Collection | `#4c95c4` | `#5aa1ce` | `#2b6d9a` | `#28597d` | `#f5fbff` |
| Packs | `#b882ac` | `#c18ab4` | `#8d5b86` | `#7d4f74` | `#fff7ff` |
| Amber / cobre | `#c88a32` | `#d29134` | `#8f5f12` | `#8f5f12` | `#fff8e0` |
| Secondary gold | `#f0dfc4` | — | `#8f5f12` | `#8f5f12` | `#6b4723` |

---

## 4.3 Botão de ação primária

Usado em:
- Criar Sala
- Entrar em Sala
- Iniciar Duelo
- Salvar Perfil

### Base

```txt
h-[4rem]
ProfileSetup:h-[3.5rem]
w-full
rounded-[1.2rem]
border-[3px] border-[#1f7a46]
bg-[#2f9a56]
font-serif text-[1.05rem] font-black
text-emerald-50
shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)]
transition-all duration-150 ease-out
```

### Camadas
- borda interna clara
- highlight superior
- textura de papel quando necessário

### Estados
- hover: sobe
- active: afunda
- disabled: reduz contraste e interatividade

---

## 4.4 Botão secundário / voltar

Usado em:
- Voltar
- Dissolver
- Sair

```txt
h-[3.2rem]
mobile:h-[2.08rem]
w-[8.6rem]
mobile:w-[5.15rem]
rounded-[1.15rem]
mobile:rounded-[0.78rem]
border-[2px] border-[#8f5f12]
bg-[#f0dfc4]
font-serif text-[0.74rem] font-black uppercase tracking-[0.08em]
text-[#6b4723]
shadow-[0_5px_0_#8f5f12,0_12px_22px_rgba(88,52,8,0.16)]
```

---

## 4.5 Botão de Perfil

```txt
h-[4.1rem] w-[8.4rem]
rounded-[1.35rem]
border-[2px] border-[#2d6b8f]
bg-[#4f9fcc]
font-black uppercase tracking-[0.08em]
text-[#f3fbff]
shadow-[0_5px_0_#28597d,0_14px_22px_rgba(35,74,110,0.18)]
```

---

## 4.6 Botão circular de cópia

```txt
h-[3rem] w-[3rem]
rounded-full
border border-[#cdb68b]
bg-white/80
shadow-[0_2px_0_#cdb68b,0_6px_10px_rgba(0,0,0,0.06)]
text-[#7a5c3f]
```

---

# 5. Inputs

Aplicações:
- Lobby: código da sala
- ProfileSetup: nome do jogador

### Base compartilhada

```txt
rounded-[1.2rem]
border-2 border-amber-900/14–18
bg-amber-50/82–84
px-4
font-serif text-[1.55rem] font-black
text-amber-950
outline-none
transition-all
placeholder:text-amber-900/18–20
focus:border-amber-500
```

### Tracking
- código: `tracking-[0.18em]`
- nome: `tracking-tight`

O input deve parecer parte do mesmo universo material dos painéis e botões.

---

# 6. Badges, pills e elementos auxiliares

## 6.1 Badge “Em Breve”

```txt
rounded-full px-2.5 py-1
text-[0.58rem] font-black uppercase tracking-[0.22em]
```

---

## 6.2 Badge de nível

```txt
min-h-[3.4rem] min-w-[9.9rem]
rounded-full
border border-[#d6b66e]
bg-[linear-gradient(180deg, rgba(255,250,236,0.98), rgba(236,205,132,0.96))]
px-4 py-2
text-[#7a5526]
shadow-[0_12px_22px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.82)]
```

Deve incluir:
- highlight superior claro
- borda interna leve
- estrela dourada quente

---

## 6.3 Status pill

```txt
inline-flex items-center gap-2.5
rounded-full
border border-[#c9b79a]
bg-[#fff8ee]
px-3.5 py-1.5
text-[0.58rem] font-black uppercase tracking-[0.16em]
text-[#7a6146]
shadow-[0_8px_16px_rgba(0,0,0,0.05)]
```

Com dot colorido conforme estado:
- verde
- âmbar
- verde suave para online idle

---

## 6.4 Badge do room code

```txt
rounded-[1.25rem]
border border-[#ceb991]
bg-[#fff6e8]
px-4 py-3
shadow-inner
```

Texto do código:

```txt
font-serif text-[2.7rem] font-black tracking-[0.1em] text-[#5b2408]
```

---

# 7. Cards de participante

## 7.1 ParticipantCard

```txt
rounded-[1.2rem]
border
px-3 py-3
shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
```

### Variante local
- border verde suave
- fundo verde muito claro
- texto verde escuro

### Variante remote
- border dourado suave
- fundo creme quente
- texto marrom quente

### Avatar interno

```txt
border-2 border-current/18
bg-white/72
shadow-[0_10px_18px_rgba(0,0,0,0.08)]
```

### Tipografia
- nome: serif, pesado, uppercase
- role: microtexto uppercase espaçado

---

# 8. Divisor de espadas

O divisor entre participantes/painéis deve permanecer circular, ornamental e quente.

```txt
h-[3.15rem] w-[3.15rem]
rounded-full
border border-[#d7c19a]
bg-[#f8ecd8]
text-[#8a6428]
shadow-inner
```

---

# 9. Seleção de avatar

Grid de avatares com botões quentes e táteis.

```txt
h-[4.2rem]
rounded-[1.05rem]
border-2
bg-amber-50
text-[2rem]
shadow-[0_10px_18px_rgba(0,0,0,0.1)]
transition-all
hover:-translate-y-1
```

### Estado selecionado

```txt
border-emerald-500
bg-emerald-50
shadow-[0_0_0_3px_rgba(16,185,129,0.18)]
```

Com marcador de check em destaque.

---

# 10. Motion language

A animação deve ser suave, curta e funcional.  
Nada deve parecer excessivamente tecnológico, nervoso ou chamativo.

Biblioteca:
- `motion/react`

## Entradas de tela

- **Menu**: `opacity + y`
- **Lobby**: `opacity + y`
- **ProfileSetup**: `opacity + scale`
- **Logo do menu**: spring discreto

## Transições gerais
- Menu: `opacity + scale`
- DeckSelection: `opacity + x`
- Lobby: `opacity + y`
- Battle: `opacity` puro

## Regra de motion
- entrada discreta
- feedback físico no press
- sem animação idle pesada
- motion a serviço da leitura e da materialidade

---

# 11. Ornamentação obrigatória

Quando aplicável, o sistema pode usar:

## BinderRings
Argolas douradas decorativas no Menu em telas grandes.

## Paper fibers
Textura:
```txt
paper-fibers.png
```

## Top highlight
Linha de brilho no topo dos botões.

## Inner border glow
Borda clara interna para profundidade.

Esses recursos não são enfeite gratuito; eles sustentam a sensação material do sistema.

---

# 12. Contrato de interação

A interação deve ser consistente entre mouse e touch.

### Regras
- touch com estado visual próprio
- hover apenas onde hover real existe
- evitar disparo duplo
- manter sensação física em qualquer input

### Objetivo
O mesmo botão deve parecer:
- clicável com mouse
- pressionável no touch
- coerente com o resto do sistema

---

# 13. Responsividade

Existe suporte explícito para telas coarse e mobile landscape curto:

```txt
[@media(pointer:coarse)_and_(max-height:480px)]
```

Nesses casos:
- reduzir tamanhos
- reduzir ornamentos secundários
- usar melhor o espaço vertical
- preservar identidade visual

Responsividade **não** significa redesenho do sistema.

---

# 14. Não-negociáveis

## Nunca fazer
- não modernizar para UI genérica
- não esfriar a paleta
- não trocar Cinzel como fonte display
- não achatar botões
- não remover bordas internas, highlights e sombras 3D
- não remover textura de papel
- não usar glassmorphism genérico
- não transformar painéis em cards neutros de app comum

## Sempre preservar
- fantasia tabletop
- papel / livro / pergaminho
- botões com relevo
- serif épica + sans funcional
- motion suave
- calor visual
- acabamento ornamental controlado

---

# 15. Resumo operacional

Se houver dúvida durante uma alteração, valide se o resultado ainda transmite:

1. **Parchment quente**
2. **Fantasia editorial**
3. **Botões físicos e profundos**
4. **Painéis tipo livro**
5. **Motion discreto e funcional**

Se qualquer um desses cinco pilares se perder, a alteração saiu da design language.
