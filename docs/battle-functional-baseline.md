# Battle Functional Baseline

Baseline manual minima para proteger o comportamento atual da battle sem criar framework novo.

## Escopo

- Esta baseline cobre o fluxo jogavel real da battle.
- O objetivo e detectar regressao funcional antes de mudar regras, layout, animacoes ou sincronizacao.
- Quando necessario, reaproveite o watcher/dump/probes documentado em `docs/battle-layout-contract.md`.

## Pre-condicoes recomendadas

1. Rodar `npm run dev`.
2. Abrir o app em modo normal.
3. Para evidencias de debug visual, usar a mesma rota com `?battle-layout-debug=1`.
4. Preferir `JOGAR SOLO` para a baseline funcional.
5. Setup recomendado para repetibilidade manual: `Fazenda` vs `Fazenda`.

## Cenarios-ouro

| Cenario | Como reproduzir hoje | Resultado esperado | Apoio opcional de debug |
|---|---|---|---|
| Inicio de partida | Menu -> `JOGAR SOLO` -> escolher deck do jogador -> escolher deck do adversario -> escolher moeda e aguardar a abertura terminar | Intro completa sem travar; `openingIntroStep` chega em `done`; 2 alvos por lado; mao local com 5 cartas; batalha entra em turno jogavel; sem vencedor | Em DEV, usar `window.__battleDev.snapshot()` ou `Dump` logo apos a abertura; se a cena parecer desalinhada, repetir com `?battle-layout-debug=1` |
| Jogada simples | Durante seu turno, selecionar uma carta que entre em um alvo sem concluir a palavra. Exemplo pratico: em `Fazenda`, jogar `VA` em `VACA` quando ainda falta `CA`. Se a mao inicial nao oferecer caso simples, usar `Jogar Novamente` ate aparecer | Uma carta sai da mao, entra no alvo, o alvo nao causa dano, uma carta e comprada, nao ha substituicao de alvo, o turno e consumido | Em DEV, o watcher deve registrar a transicao; use `Dump` se a compra ou a transferencia mao -> alvo parecer errada |
| Alvo concluido com dano | Continuar em `JOGAR SOLO` ate completar uma palavra inteira. Exemplos praticos de alvo curto: `VACA`, `PATO`, `LOBO`, `COBRA` | O alvo concluido causa dano conforme a raridade, a vida do oponente cai, o alvo sai e outro entra, as silabas concluidas retornam ao `syllableDeck`, e o turno encerra se nao houver vencedor | Em DEV, capturar `Dump` logo apos o dano; se houver suspeita de problema de entrada/saida de alvo, repetir com `?battle-layout-debug=1` para inspecionar probes e fallbacks |
| Mulligan | Jogar normalmente ate o botao `Trocar` ficar habilitado por mao travada. Selecionar de 1 a 3 cartas e clicar `Trocar`. Para acelerar, usar `Jogar Novamente` ate encontrar uma situacao travada cedo | As cartas selecionadas saem da mao, retornam ao deck, novas cartas entram para recompor a mao, `mulliganUsedThisRound` passa a valer para o turno atual, e nao ha dano nem substituicao de alvo | Em DEV, usar `Dump` antes e depois da troca; o watcher ajuda a confirmar a sequencia de saida e recompra da mao |
| Troca de turno | Validar de dois jeitos: 1) depois de uma jogada simples; 2) deixando o tempo acabar sem agir | O turno muda para o outro lado, a mensagem de turno acompanha a troca, o destaque de retrato muda, a interacao local fica bloqueada no turno inimigo, e o timer reinicia | Em DEV, `Dump` deve mostrar `turn` e `turnDeadlineAt` coerentes; o resumo do watcher ajuda a ver se a troca aconteceu sem loops estranhos |
| Fim de partida | Caminho rapido em DEV: no console, usar `window.__battleDev.kill('enemy')`. Caminho real: continuar concluindo alvos ate a vida do oponente chegar a 0 | `winner` e definido, o overlay final aparece, a batalha deixa de aceitar novas jogadas, e as acoes finais (`Jogar Novamente` ou retorno) ficam visiveis | Em DEV, capturar `Dump` com o overlay aberto para guardar o estado terminal da battle |

## Checklist manual simples

Rodar esta sequencia antes de mexer em regras, fluxo de turno, dano, compra, mulligan, fim de partida, sincronizacao de snapshot ou layout de batalha:

1. Validar `Inicio de partida`.
2. Validar `Jogada simples`.
3. Validar `Alvo concluido com dano`.
4. Validar `Troca de turno`.
5. Validar `Fim de partida`.
6. Validar `Mulligan` quando a mudanca tocar mao, compra, stuck-hand ou deck flow.

## Quando usar watcher, dump e probes

- `Watcher`: para confirmar se a battle continua gerando snapshots coerentes durante a interacao real.
- `Dump`: para guardar evidencia de regressao funcional ou visual sem precisar reproduzir tudo na hora.
- `Probes` e overlay `?battle-layout-debug=1`: usar quando a regressao suspeita envolver origem/destino de animacao, entrada de alvo, compra para a mao ou impacto visual.

## Regra de uso nas proximas etapas

- Se um diff tocar battle runtime, executar esta baseline manual antes de considerar a tarefa pronta.
- Se um diff tocar layout ou animacao, executar a baseline manual e, em caso de duvida visual, repetir os cenarios com debug habilitado.
- Se um cenario falhar, capturar `Dump` antes de tentar corrigir para preservar a evidencia do comportamento quebrado.
