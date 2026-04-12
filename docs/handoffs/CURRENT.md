# CURRENT HANDOFF

## Estado atual

A frente ativa mais importante do projeto hoje e **Minha Colecao / Deck Builder / Player Collection**.

A `CollectionScreen` deixou de ser apenas tela de colecao/inspecao e hoje sustenta:
- deck builder local com **regras formais de construcao**
- persistencia local real
- gestao de decks locais
- validacao formal de composicao (5 estados: vazio, incompleto, valido, ideal, excedido)
- bloqueio de adicao por limite de copia (raridade para targets, familia/exato para silabas)
- drag-and-drop de targets
- adapter explicito de colecao do jogador (`playerCollectionView`)
- fonte local fake/configuravel de inventario para QA

A arquitetura atual ja separa melhor:
- **catalogo global**
- **colecao do jogador**
- **deck atual em edicao**

Ainda nao existe backend, conta nem inventario real do jogador.
A camada atual foi desenhada para permitir trocar a fonte de inventario no futuro sem reescrever a UI inteira.

---

## Ultimas rodadas concluidas

### 1. Integracao Colecao <-> Content Editor
Foi consolidada no nivel certo:
- helpers puros comuns
- read models comuns
- consumo mais alinhado
- micro-blocos neutros compartilhados
- sem fundir UI grande cedo demais

Importante:
- Colecao e Content Editor compartilham a base de leitura
- raw/draft/save dev-only do editor continuam separados
- Battle e gameplay nao foram tocados nessa frente

### 2. Deck Builder inicial dentro da CollectionScreen
Foi criado o recorte inicial seguro:
- edicao de um deck por vez
- draft local
- criar deck local novo
- adicionar/remover alvos por toque/botao
- adicionar/remover silabas avulsas
- metricas recalculando por `DeckModel` / `ContentDeckSummaryView`
- salvar/cancelar sem backend
- sem tocar em Battle ou Content Editor

### 3. Persistencia local real
O builder deixou de depender apenas do estado vivo da tela:
- decks locais persistem apos reload
- overrides locais persistem
- deck selecionado persiste
- hidracao defensiva
- fallback para dados locais invalidos/corrompidos

### 4. Gestao de decks locais
Entraram operacoes de:
- duplicar
- renomear
- excluir

Comportamento atual:
- deck do catalogo original nao e apagado
- override local pode ser removido
- deck local novo pode ser removido
- a UI diferencia melhor deck original, override local e deck local

### 5. Polish de composicao e feedback
Entraram:
- feedback de progresso de alvos e silabas
- estados `Sem composicao`, `Abaixo do minimo`, `Minimo atendido`, `Acima do minimo`
- leitura do rail melhorada
- confirmacao inline de exclusao
- feedback mais claro de salvar/cancelar/editar

### 6. Drag-and-drop de targets
Foi implementado drag-and-drop local na `CollectionScreen`:
- catalogo -> deck adiciona target ao draft
- deck -> zona de remocao remove target do draft
- deck -> catalogo tambem remove
- drag invalido/cancelado nao altera o draft
- fallback por botao/toque continua existindo

Importante:
- drag foi implementado so para **targets**
- silabas continuam por botao
- a base atual e pointer-driven local, sem engine global de drag

### 7. Player collection explicita
Foi introduzido `playerCollectionView` como fronteira entre:
- catalogo global
- colecao do jogador
- deck atual

A UI deixou de assumir silenciosamente que:
- catalogo inteiro = colecao real do jogador

### 9. Regras formais de construcao do deck builder
Foram implementadas regras formais completas como fonte de verdade do builder:
- Constante `DECK_BUILDER_CONSTRUCTION_RULES` em `deckBuilder.ts` — todos os numeros em um lugar so
- Alvos: min 24, ideal 32, max 36; limite por raridade (comum 3, raro 2, epico 2, lendario 1)
- Silabas: min 60, ideal 72, max 80; familia ≤ 6, versao exata ≤ 4, min 2 por silaba, min 3 se usada por 3+ familias de alvo
- 5 estados de validacao: `empty`, `incomplete`, `valid-min`, `ideal`, `exceeded`
- Bloqueio de adicao por limite de copia: targets por raridade, silabas por familia/versao exata
- `DeckCompositionMeter` atualizado para mostrar target ideal e cor por faixa
- 17 novos testes cobrindo todos os 16 casos de regra + helpers
- `CONFIG.targetsInPlay`/`CONFIG.handSize` removidos do builder (substituidos pelas regras formais)

### 8. Inventario local fake para QA
Foi adicionada uma fonte local/configuravel de inventario:
- modo `catalog-full`
- modo `qa-partial`

Isso permite exercitar na UI estados reais como:
- disponivel
- indisponivel
- nao possuido
- sem copias restantes
- usado X/Y

A configuracao do modo e persistida localmente.
O inventario QA ainda e fake/local e deterministico.

---

## O que esta estavel

As seguintes areas estao estaveis o suficiente para serem tratadas como base atual da frente:

### Colecao / Deck Builder
- `CollectionScreen` como host do builder
- draft local de deck
- persistencia local
- salvar/cancelar
- duplicar/renomear/excluir
- validacao visual minima
- drag-and-drop de targets
- fallback por botao/toque
- mobile landscape sem scroll principal adicional

### Camada de leitura de conteudo
- helpers puros comuns
- read models/view models
- semantica de leitura compartilhada entre Colecao e preview do Editor
- micro-blocos neutros de apresentacao onde fez sentido

### Player collection
- `playerCollectionView` como fronteira arquitetural correta
- `playerInventoryLocal` como fonte fake/local para QA
- UI preparada para disponibilidade/copias reais futuras

### Fora desta frente
- Battle
- gameplay
- `gameLogic.ts`
- save dev-only do Content Editor
- networking/relay
- Android wrapper

Essas areas nao devem ser mexidas sem instrucao explicita.

---

## O que nao mexer

Nao mexer sem instrucao explicita em:

- `gameLogic.ts`
- Battle runtime
- Battle layout / preview / runtime parity
- save dev-only do Content Editor
- relay multiplayer
- Android WebView wrapper
- pipeline de validacao de conteudo (`loadContentCatalog()`)

Tambem evitar:
- unificar UI grande entre Colecao e Content Editor cedo demais
- transformar read model em componente disfarçado
- transformar micro-componente em canivete suico
- tratar inventario fake/local como se ja fosse conta/backend real

---

## Proximo passo recomendado

### Proximo passo principal (rodada 5 concluida — regras formais implementadas)
As regras formais de construcao do deck builder foram implementadas.
Proximas opcoes naturais:
1. **Drag-and-drop de silabas** — complementar o drag que hoje cobre apenas targets
2. **Override de silabas avulsas** no painel QA (similar ao per-target override)
3. **Sync de inventario** quando existir backend/conta
4. **Regras de balanceamento** mais sofisticadas (distribuicao de raridades, cobertura de silabas por alvo, etc.)

### Proximo passo anterior (ja concluido — mantido para referencia)
Painel QA para inventario dentro da Colecao / Deck Builder.

Objetivo:
- permitir testar melhor os estados de inventario sem editar codigo
- continuar sem backend
- manter a UI preparada para futura fonte real

Escopo ideal:
- presets leves de inventario, por exemplo:
  - `Tudo`
  - `QA parcial`
  - `Escasso`
  - `Quase vazio`
- opcionalmente, edicao simples de quantidades locais para alguns itens
- sem transformar a tela em painel de debug pesado

### Depois disso
As proximas opcoes mais naturais sao:

1. regras mais formais de disponibilidade/copias/composicao
2. drag-and-drop de silabas, se ainda fizer sentido
3. persistencia/sync de inventario quando existir backend/conta

A prioridade imediata e **QA/controlabilidade do inventario**, nao backend.

---

## Riscos remanescentes

### 1. Inventario ainda e fake/local
O modo QA e util e arquiteturalmente correto, mas ainda nao representa:
- conta real
- sincronizacao
- progressao
- economia
- drop rate
- regras reais de aquisicao

### 2. Regras de composicao formais implementadas, balanceamento pendente
A validacao formal cobre: contagem de alvos/silabas (min/ideal/max), limites por raridade de alvo, limites por familia/versao de silaba, minimos por silaba e minimo para silabas compartilhadas.
Ainda nao cobre: distribuicao de raridades, cobertura ideal de silabas por alvo, sinergia entre targets.

### 3. Drag ainda e parcial
O drag atual cobre targets.
Silabas ainda nao entram nesse fluxo.
A animacao atual e intencional e suficiente, mas ainda nao e um FLIP completo.

### 4. Risco de shared UI prematura
Colecao e Content Editor hoje compartilham a base certa no nivel de leitura.
Ainda e arriscado fundir:
- cards inteiros
- rails inteiros
- painéis grandes

### 5. Fixture QA ainda e simples
Ela ja exercita estados importantes, mas ainda nao ha painel proprio para manipular o inventario fake com mais controle.

---

## Arquivos-chave da frente atual

### UI principal
- `src/components/screens/CollectionScreen.tsx`

### Builder / persistencia / gestao
- `src/data/content/deckBuilder.ts`
- `src/data/content/deckBuilderStorage.ts`

### Colecao do jogador / inventario local
- `src/data/content/playerCollection.ts`
- `src/data/content/playerInventoryLocal.ts`

### Leitura de conteudo
- `src/data/content/helpers.ts`
- `src/data/content/readModels.ts`
- `src/data/content/index.ts`

### Testes relevantes
- `src/data/contentDeckBuilder.test.ts`
- `src/data/contentSelectors.test.ts`
- `src/data/contentEditor.test.ts`

### Arquivos que devem permanecer fora desta frente
- `src/logic/gameLogic.ts`
- arquivos centrais da Battle
- save dev-only do Content Editor
