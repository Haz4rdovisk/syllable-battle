# Battle Non-Regression Checklist

Checklist tecnico curto e reutilizavel para validar a battle sem mudar comportamento.

## Escopo

- Este checklist protege tres invariantes criticos: paridade geometrica, utilidade do debug runtime e smoke multiplayer.
- Ele complementa `docs/battle-layout-contract.md` e `docs/battle-functional-baseline.md`.
- Usar antes e depois de diffs que toquem layout, animacao, watcher/dump/probes, room sync ou battle runtime.

## Invariantes criticos

- Editor, preview e runtime devem refletir a mesma geometria efetiva no stage.
- Ajustes de ancora, endpoint e referencia de animacao no editor devem manter a mesma geometria efetiva no preview e no runtime live.
- O debug runtime em DEV deve continuar util para inspecao rapida, dump e evidencia de regressao.
- O smoke multiplayer minimo deve continuar cobrindo presenca, setup compartilhado, snapshot compartilhado e retorno seguro para lobby.

## Pre-condicoes

1. Rodar `npm run dev`.
2. Manter o app aberto em modo normal para runtime e multiplayer.
3. Abrir `?battle-layout-editor=1` para editar overrides locais.
4. Abrir `?battle-layout-preview=1&battle-layout-debug=1` para evidencias visuais de preview.
5. Se houver diff em gameplay, reaproveitar tambem `docs/battle-functional-baseline.md`.

## A. Paridade geometrica editor -> preview -> runtime

1. No editor, mover um elemento visual relevante e confirmar que o preview reflete a mesma posicao efetiva no stage.
2. No editor, ajustar uma ancora de animacao usada hoje e confirmar que o preview atualiza a mesma coordenada efetiva no stage.
3. No runtime normal, confirmar que os overrides ativos foram consumidos e que o mesmo elemento fica na mesma geometria efetiva observada no editor/preview.
4. Se houver duvida visual, repetir com `?battle-layout-debug=1` e comparar overlay, probes e snapshots com o esperado.

Resultado esperado:
- Nao basta paridade visual aproximada.
- A posicao efetiva no stage precisa bater entre editor, preview e runtime.
- Anchors e endpoints precisam preservar a mesma geometria efetiva no runtime live.

## B. Debug runtime em DEV

1. Entrar na battle em DEV e abrir o console.
2. Validar que `window.__battleDev.help()` responde com a superficie atual de debug.
3. Validar que `window.__battleDev.snapshot()` retorna um snapshot tecnico util para inspecao.
4. Validar que `window.__battleDev.logSnapshot()` continua imprimindo esse snapshot no console.
5. Validar que `window.__battleDev.dumpDebugCapture()` baixa um arquivo `battle-dev-dump.<timestamp>.json`.
6. Se necessario, validar que `clearDebugCapture()` limpa o historico do watcher sem quebrar novas capturas.

Resultado esperado:
- O dump precisa continuar incluindo stage metrics, anchors, probes, snapshots, fallbacks, timers e estado relevante de batalha/debug.
- O watcher precisa continuar ativo apenas em DEV e seguir capturando historico em memoria.
- Em multiplayer, `damage*` e `kill` permanecem bloqueados para evitar dessincronizacao.

## C. Smoke multiplayer minimo

Este smoke vale para o transporte atual em uso: `mock`, `broadcast` ou `remote`.

1. Abrir duas instancias do app e entrar em `MULTIPLAYER`.
2. Criar uma sala em uma instancia e entrar na mesma sala pela outra.
3. Confirmar na lobby que o oponente aparece como conectado e que apenas o anfitriao libera `INICIAR DUELO`.
4. Avancar para deck selection, escolher um deck em cada lado e confirmar que ambos entram em preparacao/battle sem travar.
5. Confirmar que o setup compartilhado e o snapshot inicial chegam aos dois lados.
6. Executar uma verificacao minima de sincronizacao: uma acao valida ou uma troca de turno deve refletir no outro lado sem duplicacao obvia, sem travar a battle e sem colapsar a sala.
7. Validar retorno seguro: sair da sala ou desconectar um lado deve levar a sala de volta para `lobby`, limpar `initialGame` e limpar `battleSnapshot`.

Resultado esperado:
- Presenca e fase da sala continuam coerentes.
- O deck selection continua sincronizado.
- O setup inicial e o battle snapshot continuam compartilhados.
- Desconexao continua derrubando a sala para um estado seguro de lobby.

## Quando considerar o checklist obrigatorio

- Diff em shell, wrappers, compacto, passthrough ou fluxo CSS da battle.
- Diff em editor, preview, preset, overrides ativos ou anchors de animacao.
- Diff em watcher, dump, probes, overlay debug ou superficie `window.__battleDev`.
- Diff em sincronizacao de room, setup multiplayer ou snapshot compartilhado.

## Evidencias minimas recomendadas

- Para paridade geometrica: observacao direta em editor, preview e runtime; em caso de duvida, repetir com overlay debug.
- Para debug runtime: snapshot no console e um dump salvo.
- Para multiplayer: validacao manual dos estados de lobby, deck selection, battle e retorno para lobby.
