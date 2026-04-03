import assert from "node:assert/strict";
import test from "node:test";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import {
  getBattleTargetFieldSlotElementKey,
  createBattleLayoutConfig,
} from "./BattleLayoutConfig";
import {
  battleEditorFrameToScenePosition,
  battleGlobalFrameToScenePosition,
  BATTLE_STAGE_HEIGHT,
  BATTLE_STAGE_WIDTH,
  getBattleDesktopShellSlots,
  getBattleEditorFrame,
  getBattleFieldContainerSceneRect,
  getBattleElementParentBase,
  getBattleElementSceneRect,
  getBattleTargetFieldSlotLocalRect,
  getBattleTargetFieldSlotSceneRect,
  resolveBattleRuntimeLayoutDevice,
  shouldUseBattleMobileShell,
  getBattleStageMetrics,
  toBattleStageLocalRect,
} from "./BattleSceneSpace";
import type { BattleElementPropertyConfig } from "./BattleLayoutConfig";

test("getBattleStageMetrics resolve scale, offsets e orientacao no stage base", () => {
  const metrics = getBattleStageMetrics(BATTLE_STAGE_WIDTH, BATTLE_STAGE_HEIGHT);

  assert.deepEqual(metrics, {
    viewportWidth: 1600,
    viewportHeight: 900,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isPortrait: false,
  });
});

test("resolveBattleRuntimeLayoutDevice usa breakpoint unico para desktop tablet e mobile", () => {
  assert.equal(resolveBattleRuntimeLayoutDevice(1280), "desktop");
  assert.equal(resolveBattleRuntimeLayoutDevice(1440), "desktop");
  assert.equal(resolveBattleRuntimeLayoutDevice(1279), "tablet");
  assert.equal(resolveBattleRuntimeLayoutDevice(1024), "tablet");
  assert.equal(resolveBattleRuntimeLayoutDevice(959), "mobile");
  assert.equal(resolveBattleRuntimeLayoutDevice(844), "mobile");
});

test("shouldUseBattleMobileShell mantem o shell desktop/tablet em todos os devices", () => {
  assert.equal(shouldUseBattleMobileShell("desktop"), false);
  assert.equal(shouldUseBattleMobileShell("tablet"), false);
  assert.equal(shouldUseBattleMobileShell("mobile"), false);
});

test("getBattleStageMetrics faz clamp dos limites minimos e centraliza viewport retrato", () => {
  const clamped = getBattleStageMetrics(0, -20);
  assert.equal(clamped.viewportWidth, 1);
  assert.equal(clamped.viewportHeight, 1);
  assert.equal(clamped.scale, 1 / BATTLE_STAGE_WIDTH);
  assert.equal(clamped.offsetX, 0);
  assert.equal(
    clamped.offsetY,
    (1 - BATTLE_STAGE_HEIGHT * clamped.scale) / 2,
  );

  const portrait = getBattleStageMetrics(900, 1600);
  assert.equal(portrait.isPortrait, true);
  assert.equal(portrait.scale, 900 / BATTLE_STAGE_WIDTH);
  assert.equal(portrait.offsetX, 0);
  assert.equal(
    portrait.offsetY,
    (1600 - BATTLE_STAGE_HEIGHT * portrait.scale) / 2,
  );
});

test("toBattleStageLocalRect retorna o proprio retangulo quando nao ha stage DOM", () => {
  const rect = { left: 120, top: 260, width: 300, height: 150 };

  assert.deepEqual(toBattleStageLocalRect(rect, null), rect);
  assert.equal(toBattleStageLocalRect(null, null), null);
});

test("toBattleStageLocalRect converte coordenadas de tela para stage local", () => {
  const rect = { left: 210, top: 140, width: 160, height: 90 };
  const stage = { left: 50, top: 20, scaleX: 2, scaleY: 4 };

  assert.deepEqual(toBattleStageLocalRect(rect, stage), {
    left: 80,
    top: 30,
    width: 80,
    height: 22.5,
  });
});

test("getBattleEditorFrame calcula frame global e relativo ao parent base", () => {
  const config: BattleElementPropertyConfig = {
    x: 100,
    y: -50,
    width: 200,
    height: 80,
    rotation: 0,
    scaleX: 100,
    scaleY: 100,
    opacity: 100,
    zIndex: 0,
    anchor: "center",
    lockAspectRatio: false,
    snapToGrid: false,
    slideX: 0,
    slideY: 0,
    duration: 0.28,
    delay: 0,
    easing: "ease-out",
  };

  const frame = getBattleEditorFrame(config, 10, 20);

  assert.deepEqual(frame, {
    x: 790,
    y: 340,
    width: 200,
    height: 80,
    centerX: 900,
    centerY: 400,
    parentBaseX: 10,
    parentBaseY: 20,
    sceneX: 800,
    sceneY: 360,
  });
});

test("battleGlobalFrameToScenePosition e battleEditorFrameToScenePosition preservam a posicao do elemento", () => {
  const config: BattleElementPropertyConfig = {
    x: -180,
    y: 145,
    width: 120,
    height: 60,
    rotation: 0,
    scaleX: 100,
    scaleY: 100,
    opacity: 100,
    zIndex: 0,
    anchor: "bottom-right",
    lockAspectRatio: false,
    snapToGrid: false,
    slideX: 0,
    slideY: 0,
    duration: 0.28,
    delay: 0,
    easing: "ease-out",
  };

  const frame = getBattleEditorFrame(config, 252, 124);

  assert.deepEqual(
    battleGlobalFrameToScenePosition(
      {
        x: frame.sceneX,
        y: frame.sceneY,
        width: frame.width,
        height: frame.height,
      },
      config.anchor,
    ),
    { x: config.x, y: config.y },
  );

  assert.deepEqual(
    battleEditorFrameToScenePosition(
      {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      },
      config.anchor,
      frame.parentBaseX,
      frame.parentBaseY,
    ),
    { x: config.x, y: config.y },
  );
});

test("getBattleElementParentBase usa os slots corretos do shell para cada grupo de elementos", () => {
  const shellSlots = getBattleDesktopShellSlots(battleActiveLayoutConfig);

  assert.deepEqual(getBattleElementParentBase("shell", battleActiveLayoutConfig), {
    x: 0,
    y: 0,
  });
  assert.deepEqual(getBattleElementParentBase("board", battleActiveLayoutConfig), {
    x: shellSlots.board.x,
    y: shellSlots.board.y,
  });
  assert.deepEqual(getBattleElementParentBase("topHand", battleActiveLayoutConfig), {
    x: shellSlots.centerTop.x,
    y: shellSlots.centerTop.y,
  });
  assert.deepEqual(
    getBattleElementParentBase("bottomHand", battleActiveLayoutConfig),
    {
      x: shellSlots.centerBottom.x,
      y: shellSlots.centerBottom.y,
    },
  );
  assert.deepEqual(
    getBattleElementParentBase("enemyTargetDeck", battleActiveLayoutConfig),
    {
      x: shellSlots.leftSidebar.x,
      y: shellSlots.leftSidebar.y,
    },
  );
  assert.deepEqual(
    getBattleElementParentBase("status", battleActiveLayoutConfig),
    {
      x: shellSlots.rightSidebar.x,
      y: shellSlots.rightSidebar.y,
    },
  );
  assert.deepEqual(
    getBattleElementParentBase("playerFieldSlot0", battleActiveLayoutConfig),
    {
      x: 0,
      y: 0,
    },
  );
});

test("layout de slot authored nasce separado do container e usa chaves compativeis com slotId", () => {
  const layout = createBattleLayoutConfig();
  const playerFieldRect = getBattleElementSceneRect("playerField", layout);
  const playerSlot0Rect = getBattleTargetFieldSlotSceneRect("player", 0, layout);
  const playerSlot1Rect = getBattleTargetFieldSlotSceneRect("player", 1, layout);

  assert.equal(getBattleTargetFieldSlotElementKey("player", 0), "playerFieldSlot0");
  assert.equal(getBattleTargetFieldSlotElementKey("enemy", 1), "enemyFieldSlot1");
  assert.ok(playerSlot0Rect.width > 0);
  assert.ok(playerSlot1Rect.width > 0);
  assert.ok(playerSlot0Rect.x >= playerFieldRect.x);
  assert.ok(playerSlot1Rect.x + playerSlot1Rect.width <= playerFieldRect.x + playerFieldRect.width);
  assert.equal(playerSlot0Rect.y, playerFieldRect.y);
  assert.equal(playerSlot1Rect.y, playerFieldRect.y);
});

test("retangulo local do slot authored fecha a geometria dentro do field container", () => {
  const layout = createBattleLayoutConfig();
  const enemyFieldRect = getBattleFieldContainerSceneRect("enemy", layout);
  const enemySlot1SceneRect = getBattleTargetFieldSlotSceneRect("enemy", 1, layout);
  const enemySlot1LocalRect = getBattleTargetFieldSlotLocalRect("enemy", 1, layout);

  assert.equal(enemySlot1LocalRect.x, enemySlot1SceneRect.x - enemyFieldRect.x);
  assert.equal(enemySlot1LocalRect.y, enemySlot1SceneRect.y - enemyFieldRect.y);
  assert.equal(enemySlot1LocalRect.width, enemySlot1SceneRect.width);
  assert.equal(enemySlot1LocalRect.height, enemySlot1SceneRect.height);
});

test("field container ignora overrides authored legados e deriva bounding box dos slots", () => {
  const baseLayout = createBattleLayoutConfig();
  const overriddenLayout = createBattleLayoutConfig({
    elements: {
      enemyField: {
        x: 420,
        y: -310,
        width: 999,
        height: 777,
      },
    },
  });

  const baseEnemyFieldRect = getBattleFieldContainerSceneRect("enemy", baseLayout);
  const overriddenEnemyFieldRect = getBattleFieldContainerSceneRect(
    "enemy",
    overriddenLayout,
  );
  const enemySlot0Rect = getBattleTargetFieldSlotSceneRect("enemy", 0, overriddenLayout);
  const enemySlot1Rect = getBattleTargetFieldSlotSceneRect("enemy", 1, overriddenLayout);

  assert.deepEqual(overriddenEnemyFieldRect, baseEnemyFieldRect);
  assert.equal(
    overriddenEnemyFieldRect.x,
    Math.min(enemySlot0Rect.x, enemySlot1Rect.x),
  );
  assert.equal(
    overriddenEnemyFieldRect.width,
    Math.max(
      enemySlot0Rect.x + enemySlot0Rect.width,
      enemySlot1Rect.x + enemySlot1Rect.width,
    ) - overriddenEnemyFieldRect.x,
  );
});
