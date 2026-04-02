import assert from "node:assert/strict";
import test from "node:test";
import {
  createBattleLayoutConfig,
  normalizeBattleLayoutDeviceOverrides,
} from "./BattleLayoutConfig";
import { buildBattleSceneLayoutBridge } from "./BattleSceneLayoutBridge";
import {
  createBattleAuthoredAnimationAnchorSet,
  getBattleAnimationAnchorPoint,
  getBattleAnimationAnchorReferenceTarget,
  resolveBattleDerivedAnchor,
  resolveBattleMotionAnchor,
} from "./BattleAnchorResolver";
import {
  createBattleSceneBoardModel,
  createBattleSceneRenderModel,
} from "./BattleSceneViewModel";
import {
  BattleTimelineRuntime,
  createBattlePreviewPlaybackSelection,
  isBattlePixiTimelineOwnedPreviewClipSet,
  isBattlePreviewPlaybackActiveForSet,
} from "./battlePlaybackTimeline";

test("buildBattleSceneLayoutBridge preserva desktop tablet e mobile como layouts reais separados", () => {
  const overrides = normalizeBattleLayoutDeviceOverrides({
    desktop: {
      elements: {
        board: { x: 12 },
      },
    },
    tablet: {
      elements: {
        board: { x: 48, y: 22 },
      },
    },
    mobile: {
      elements: {
        board: { x: -90, y: 64 },
      },
    },
  });

  const desktopLayout = createBattleLayoutConfig(overrides.desktop);
  const tabletLayout = createBattleLayoutConfig(overrides.tablet);
  const mobileLayout = createBattleLayoutConfig(overrides.mobile);

  const desktopBridge = buildBattleSceneLayoutBridge({
    layout: desktopLayout,
    layoutDevice: "desktop",
    viewportWidth: 1600,
    viewportHeight: 900,
  });
  const tabletBridge = buildBattleSceneLayoutBridge({
    layout: tabletLayout,
    layoutDevice: "tablet",
    viewportWidth: 1180,
    viewportHeight: 820,
  });
  const mobileBridge = buildBattleSceneLayoutBridge({
    layout: mobileLayout,
    layoutDevice: "mobile",
    viewportWidth: 844,
    viewportHeight: 390,
  });

  assert.equal(desktopBridge.layoutDevice, "desktop");
  assert.equal(tabletBridge.layoutDevice, "tablet");
  assert.equal(mobileBridge.layoutDevice, "mobile");
  assert.equal(desktopBridge.usesMobileShell, false);
  assert.equal(tabletBridge.usesMobileShell, false);
  assert.equal(mobileBridge.usesMobileShell, true);
  assert.notDeepEqual(
    desktopBridge.elements.board.sceneRect,
    tabletBridge.elements.board.sceneRect,
  );
  assert.notDeepEqual(
    tabletBridge.elements.board.sceneRect,
    mobileBridge.elements.board.sceneRect,
  );
});

test("anchor resolver separa authored derived e motion usando slot como referencia soberana", () => {
  const layout = createBattleLayoutConfig({
    animations: {
      handPlayTarget0Destination: { x: 610, y: 520 },
      targetAttack3Impact: { x: 980, y: 260 },
    },
  });
  const layoutBridge = buildBattleSceneLayoutBridge({
    layout,
    layoutDevice: "desktop",
    viewportWidth: 1600,
    viewportHeight: 900,
  });

  const authored = createBattleAuthoredAnimationAnchorSet(layout.animations);
  assert.deepEqual(
    getBattleAnimationAnchorPoint(authored, "hand-play-target-0-destination"),
    { x: 610, y: 520 },
  );
  assert.deepEqual(
    getBattleAnimationAnchorReferenceTarget("hand-play-target-0-destination", 2),
    { kind: "slot", zoneId: "playerField", slot: "slot-0" },
  );

  const derived = resolveBattleDerivedAnchor({
    anchor: "hand-play-target-0-destination",
    targetsInPlay: 2,
    layoutBridge,
  });
  assert.equal(derived.kind, "derived");
  assert.equal(derived.status, "resolved");
  assert.deepEqual(derived.point, layoutBridge.fields.player.slots[0].center);

  const motion = resolveBattleMotionAnchor({
    anchors: authored,
    anchor: "target-attack-3-impact",
    targetsInPlay: 2,
    layoutBridge,
  });

  assert.equal(motion?.kind, "motion");
  assert.equal(motion?.authored.status, "resolved");
  assert.equal(motion?.derived.status, "resolved");
  assert.equal(motion?.fallbackTag, "enemyField-slot-1");
  assert.deepEqual(motion?.derived.point, layoutBridge.fields.enemy.slots[1].center);
});

test("createBattleSceneRenderModel entrega contrato comum de cena com layout bridge e motion anchors", () => {
  const layout = createBattleLayoutConfig({
    animations: {
      postPlayHandDrawOrigin: { x: 120, y: 640 },
    },
  });
  const scene = {
    board: createBattleSceneBoardModel({
      enemyFieldSlots: [],
      playerFieldSlots: [],
      currentMessage: null,
      enemyPortrait: {
        label: "OPONENTE",
        isLocal: false,
        life: 10,
        active: false,
        flashDamage: 0,
      },
      playerPortrait: {
        label: "VOCE",
        isLocal: true,
        life: 10,
        active: true,
        flashDamage: 0,
      },
    }),
    leftSidebar: {
      decks: {
        targetDeckCount: 3,
        deckCount: 12,
      },
      chronicles: [],
    },
    rightSidebar: {
      hud: {
        title: "Controle",
        turnLabel: "Seu Turno",
        clock: "30",
        clockUrgent: false,
      },
      decks: {
        targetDeckCount: 3,
        deckCount: 12,
      },
    },
    hands: {
      top: {
        side: 1 as 1,
        presentation: "remote" as const,
        stableCards: [],
      },
      bottom: {
        side: 0 as 0,
        presentation: "local" as const,
        stableCards: [],
      },
    },
  };

  const renderModel = createBattleSceneRenderModel({
    scene,
    layout,
    layoutDevice: "desktop",
    viewportWidth: 1600,
    viewportHeight: 900,
  });

  assert.equal(renderModel.layoutDevice, "desktop");
  assert.equal(renderModel.layoutBridge.elements.board.key, "board");
  assert.equal(renderModel.motionAnchors.length > 0, true);
  assert.equal(
    renderModel.motionAnchors.some(
      (anchor) => anchor.key === "postPlayHandDrawOrigin" && anchor.authored.status === "resolved",
    ),
    true,
  );
});

test("preview playback selection centraliza ativo loop e clip id sem depender do renderer", () => {
  const idle = createBattlePreviewPlaybackSelection({
    clipSet: "post-play-hand-draw",
    clipMode: "idle",
    preset: "post-play-hand-draw",
    runId: 0,
  });
  const looping = createBattlePreviewPlaybackSelection({
    clipSet: "target-attack",
    clipMode: "target-attack-loop",
    preset: "target-attack-1",
    runId: 8,
  });

  assert.equal(idle.active, false);
  assert.equal(looping.active, true);
  assert.equal(looping.loop, true);
  assert.equal(looping.clipId, "target-attack:target-attack-1:8");
  assert.equal(isBattlePreviewPlaybackActiveForSet(looping, "target-attack"), true);
});

test("BattleTimelineRuntime suporta play pause replay loop seek e step de forma deterministica", () => {
  let now = 1000;
  const timeline = new BattleTimelineRuntime({
    now: () => now,
  });

  timeline.configure({ durationMs: 1000, loop: true });
  timeline.play();
  now += 250;
  assert.deepEqual(timeline.getSnapshot(), {
    phase: "running",
    timeMs: 250,
    durationMs: 1000,
    loop: true,
    iteration: 0,
  });

  timeline.pause();
  now += 400;
  assert.equal(timeline.getSnapshot().timeMs, 250);

  timeline.seek(900);
  timeline.play();
  now += 250;
  assert.equal(timeline.getSnapshot().timeMs, 150);
  assert.equal(timeline.getSnapshot().iteration, 1);

  timeline.stop();
  assert.equal(timeline.getSnapshot().timeMs, 0);

  timeline.replay();
  now += 100;
  assert.equal(timeline.getSnapshot().timeMs, 100);

  timeline.pause();
  timeline.step(50);
  assert.equal(timeline.getSnapshot().timeMs, 150);

  timeline.setLoop(false);
  timeline.seek(980);
  timeline.play();
  now += 200;
  assert.equal(timeline.getSnapshot().timeMs, 1000);
  assert.equal(timeline.getSnapshot().loop, false);
});

test("isBattlePixiTimelineOwnedPreviewClipSet marca apenas a fatia Pixi consolidada no preview", () => {
  assert.equal(
    isBattlePixiTimelineOwnedPreviewClipSet("opening-target-entry-first-round"),
    true,
  );
  assert.equal(
    isBattlePixiTimelineOwnedPreviewClipSet("hand-play-target"),
    true,
  );
  assert.equal(
    isBattlePixiTimelineOwnedPreviewClipSet("target-attack-replacement-combo"),
    true,
  );
  assert.equal(
    isBattlePixiTimelineOwnedPreviewClipSet("post-play-hand-draw"),
    false,
  );
  assert.equal(
    isBattlePixiTimelineOwnedPreviewClipSet("mulligan-complete-combo"),
    false,
  );
});
