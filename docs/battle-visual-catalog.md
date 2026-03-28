# Battle Visual Catalog

Catalogo curto do estado atual do sistema visual da battle, sem definir API publica nova e sem alterar comportamento.

## Escopo

- Este catalogo so explicita a organizacao atual entre tempos compartilhados, plano visual simples e anchors/debug.
- Ele descreve o recorte consolidado na `Stage 2D`.
- Fluxos sensiveis como `mulligan`, `damage`, `replacement` e `recovery` continuam fora deste catalogo operacional.

## 1. Tempos Compartilhados

Arquivo:
- `src/components/screens/battleSharedTimings.ts`

Responsabilidade:
- Centraliza os tempos compartilhados de sequencias visuais da battle.
- Expoe duracoes e buffers reutilizados por fluxo visual e por handoff de turno.

Grupos atuais:
- `BATTLE_SHARED_FLOW_TIMINGS`
- `BATTLE_SHARED_OPENING_TARGET_TIMINGS`

Leitura pratica:
- Este arquivo responde "quanto tempo cada trecho visual leva".
- Ele nao decide sozinho qual sequencia sera usada em cada acao.

## 2. Plano Visual Simples

Arquivo:
- `src/components/screens/battleVisualPlan.ts`

Responsabilidade:
- Explicita o contrato puro minimo do fluxo simples ja consolidado.
- Traduz um resultado logico de `play sem dano` em uma intencao visual pequena e testavel.

Recorte atual:
- saida da carta da mao
- progress do alvo
- draw pos-play
- finish/settle do fluxo simples

Estrutura atual:
- `createSimplePlayVisualPlan(...)`
- `BattleSimplePlayVisualPlan`

Leitura pratica:
- Este arquivo responde "qual sequencia visual simples deve acontecer".
- Ele nao resolve geometria de stage e nao executa timers do runtime.

## 3. Anchors, Probes e Conversoes de Debug

Arquivo:
- `src/components/screens/BattleDebugGeometry.ts`

Responsabilidade:
- Centraliza helpers puros de anchors, probes, formatacao de debug e conversoes scene/screen.
- Sustenta a equivalencia de output util entre preview e runtime.

Grupos atuais:
- resolucao de referencia para anchors live e preview
- montagem de `probe:...`
- formatacao de point, delta, snapshot e fallback
- conversoes `scene -> screen` e `screen -> scene`
- snapshots tecnicos de anchors

Leitura pratica:
- Este arquivo responde "como inspecionar e comparar geometria e anchors".
- Ele nao muda a geometria efetiva da battle; ele apenas ajuda a observa-la e correlaciona-la.

## Fronteira Atual

No recorte simples consolidado hoje:
- `battleSharedTimings.ts` define os tempos compartilhados.
- `battleVisualPlan.ts` define a intencao visual pura do fluxo simples.
- `BattleDebugGeometry.ts` define o apoio geometrico e de debug para inspecao e equivalencia.

Resumo operacional:
- logico: resultado resolvido da jogada
- visual: plano simples derivado desse resultado
- geometria/debug: resolucao de anchors, probes e conversoes para inspecao

## Fora do Escopo Deste Catalogo

- integrar novos fluxos visuais
- mover logica de runtime
- redefinir geometria efetiva
- alterar output de debug
- abrir contrato novo para multiplayer authority ou recovery
