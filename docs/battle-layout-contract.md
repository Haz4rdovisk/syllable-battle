# Battle Layout Contract

Contrato tecnico atual do editor/preset e do watcher/dump/probes.

## Escopo

- Este contrato descreve o comportamento atual sem prometer API publica estavel.
- O editor e o preview trabalham sobre `BattleLayoutOverrides`.
- O preset do projeto continua sendo o arquivo `src/components/screens/BattleLayoutPreset.ts`.

## Editor e Preset

### Fonte da base ativa

- O runtime consome a base por `useActiveBattleLayoutConfig()` em `src/components/screens/BattleActiveLayout.ts`.
- A ordem de resolucao atual e:
  1. `localStorage[BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY]`, se a `BATTLE_LAYOUT_MODEL_VERSION` bater.
  2. `battleActiveLayoutOverrides` exportado por `BattleLayoutPreset.ts`.
- Se a versao do modelo divergir, o editor limpa estado local relevante e volta para a base do projeto.

### Estado persistido do editor

- `BATTLE_LAYOUT_EDITOR_STATE_KEY`: estado completo do preview/editor.
- `BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY`: overrides ativos consumidos pela batalha.
- `BATTLE_LAYOUT_EDITOR_BASELINE_KEY`: baseline usado pelo botao de reset do editor.
- `BATTLE_LAYOUT_EDITOR_PRESETS_KEY`: presets locais de propriedades por elemento.
- `BATTLE_LAYOUT_EDITOR_GROUPS_KEY`: grupos locais do editor.
- Todos esses dados vivem em `localStorage` e sao locais da maquina/navegador.

### Transporte editor -> preview

- O editor grava o estado normalizado em `localStorage`.
- O editor tambem envia o estado para o iframe de preview por `postMessage` com `BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE`.
- O preview (`BattleLayoutPreview.tsx`) escuta `postMessage`, evento `storage` e um polling de 250 ms para se manter sincronizado.

### Salvar preset do projeto

- `Copiar preset` e `Baixar preset` apenas materializam o TypeScript gerado por `createBattleLayoutPresetSource(layoutOverrides)`.
- `Salvar layout aprovado` faz `POST /__battle-layout/preset` durante o dev server do Vite.
- A rota escreve diretamente `src/components/screens/BattleLayoutPreset.ts`.
- Ao salvar com sucesso, o editor:
  - limpa undo/redo;
  - promove os overrides atuais a novo baseline local;
  - reaplica os overrides aprovados como estado atual.

### Limite atual do contrato

- Presets locais do editor nao sao o mesmo que o preset base do projeto.
- O preset base do projeto so muda via rota `POST /__battle-layout/preset` no ambiente de desenvolvimento.

## Watcher, Dump e Probes

### Watcher

- O watcher existe apenas em `import.meta.env.DEV`.
- Ele roda dentro de `Battle.tsx`.
- A cada 300 ms ele captura um snapshot tecnico da cena.
- Capturas repetidas com a mesma assinatura JSON sao descartadas.
- O historico e mantido em memoria, limitado aos ultimos 800 samples.

### Dump

- O botao `Dump` da HUD de debug baixa um arquivo `battle-dev-dump.<timestamp>.json`.
- O dump contem:
  - metadados (`exportedAt`, `startedAt`, `count`);
  - `latest`: snapshot tecnico atual;
  - `samples`: historico capturado pelo watcher.
- O dump atual inclui stage metrics, anchors, probes, snapshots de animacao, fallbacks, timers e estado relevante de batalha/debug.

### Probes

- As probes de animacao sao derivadas dos anchors visiveis e da conversao scene/screen atual.
- O output atual exposto pelo runtime usa linhas `probe:...` e linhas `snapshot:...`.
- Fallbacks de animacao entram no mesmo pacote de debug como linhas `fallback:...` e como entradas estruturadas.

### Superficie publica atual de debug

- Em DEV, `window.__battleDev` expoe:
  - `snapshot()`
  - `logSnapshot()`
  - `dumpDebugCapture()`
  - `clearDebugCapture()`
  - `clearAnimationFallbacks()`
  - `damage(side, amount?)`
  - `damagePlayer(amount?)`
  - `damageEnemy(amount?)`
  - `kill(side)`
  - `help()`
- `damage*` e `kill` sao bloqueados no multiplayer para evitar dessincronizacao.

### Overlay visual

- `?battle-layout-debug=1` habilita o overlay `BattleLayoutDebugOverlay`.
- O overlay inspeciona elementos com `data-battle-element-key`, compara frame salvo vs root visual e classifica discrepancias.
- O filtro opcional atual usa `battle-debug-target` ou `battle-debug-targets` na query string.

## Resumo operacional

- O editor trabalha sobre overrides locais e sincroniza preview por `localStorage` + `postMessage`.
- O runtime da batalha consome overrides ativos, mas cai para o preset base versionado quando necessario.
- O watcher/dump/probes sao ferramentas de diagnostico em DEV, em memoria, sem efeito no runtime jogavel de producao.
- Para um checklist operacional reutilizavel de nao-regressao, ver `docs/battle-non-regression-checklist.md`.
