import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBattleDebugPointSnapshot,
  buildBattleProbeRow,
  formatBattleDebugDelta,
  formatBattleDebugFallbackLine,
  formatBattleDebugPoint,
  formatBattleDebugSnapshot,
  formatBattleProbeLine,
  getBattleDebugZoneSnapshotCenter,
  getLiveAnimationAnchorReferenceTarget,
  getPreviewAnimationAnchorReferenceTarget,
  toBattleDebugScenePoint,
  toBattleDebugScreenPoint,
} from "./BattleDebugGeometry";
import {
  normalizeBattleLayoutEditorPreviewState,
  type BattleLayoutEditorPreviewState,
} from "./BattleLayoutEditorState";
import {
  createBattleLayoutConfig,
  createBattleLayoutPresetSource,
  normalizeBattleLayoutDeviceOverrides,
} from "./BattleLayoutConfig";
import {
  buildBattleTargetFieldState,
  buildBattleTargetFieldStateFromSceneSlots,
  type BattleTargetSceneNode,
} from "./BattleTargetField";
import {
  BATTLE_SCENE_LAYER_ORDER,
  getBattleSceneElementLayer,
} from "./BattleSceneLayerPolicy";
import { createBattleSceneBoardModel } from "./BattleSceneViewModel";
import type { UITarget } from "../../types/game";
import type { VisualTargetEntity } from "../game/GameComponents";
import { buildBattleFieldLaneSlotsFromTargetField } from "./battleTargetMotionPlan";

const createPreviewState = (): BattleLayoutEditorPreviewState => ({
  fixtureKey: "calm",
  focusArea: "overview",
  selectedElements: [],
  layoutDevice: "desktop",
  layoutDeviceOverrides: normalizeBattleLayoutDeviceOverrides({}),
  showGrid: true,
  gridSize: 8,
  snapThreshold: 12,
  previewDevice: "desktop",
  viewportWidth: 1600,
  viewportHeight: 900,
  actionVisualState: "normal",
  statusVisualState: "normal",
  chroniclesVisualState: "normal",
  animationSet: "opening-target-entry-first-round",
  animationMode: "idle",
  animationPreset: "none",
  animationRunId: 0,
  localMotionPreviewElement: null,
  localMotionPreviewRunId: 0,
  trajectoryLoopEnabled: false,
  localMotionLoopEnabled: false,
  combinedLoopEnabled: false,
  animationAnchorTool: null,
  animationDebugEnabled: false,
  animationAnchors: {
    openingTargetEntry0Origin: null,
    openingTargetEntry1Origin: null,
    openingTargetEntry2Origin: null,
    openingTargetEntry3Origin: null,
    replacementTargetEntry0Origin: null,
    replacementTargetEntry1Origin: null,
    replacementTargetEntry2Origin: null,
    replacementTargetEntry3Origin: null,
    postPlayHandDrawOrigin: null,
    handPlayTarget0Destination: null,
    handPlayTarget1Destination: null,
    mulliganReturn1Destination: null,
    mulliganReturn2Destination: null,
    mulliganReturn3Destination: null,
    mulliganDraw1Origin: null,
    mulliganDraw2Origin: null,
    mulliganDraw3Origin: null,
    targetAttack0Impact: null,
    targetAttack1Impact: null,
    targetAttack2Impact: null,
    targetAttack3Impact: null,
    targetAttack0Destination: null,
    targetAttack1Destination: null,
    targetAttack2Destination: null,
    targetAttack3Destination: null,
  },
});

test("normalizeBattleLayoutEditorPreviewState normaliza legado, clamps e defaults relevantes", () => {
  const normalized = normalizeBattleLayoutEditorPreviewState({
    ...createPreviewState(),
    focusArea: "enemyDecks" as never,
    selectedElements: ["playerDecks"] as never,
    layoutDeviceOverrides: {
      desktop: {
      text: {
        actionTitle: "Atacar",
      },
      shell: {},
      },
      tablet: {},
      mobile: {},
    },
    showGrid: undefined as never,
    gridSize: 99,
    snapThreshold: 2,
    viewportWidth: 200,
    viewportHeight: 120,
    animationSet: "hand-play-target",
    animationPreset: "hand-play-target-2" as never,
    animationRunId: -3,
    animationAnchorTool: undefined as never,
    animationDebugEnabled: undefined as never,
    animationAnchors: {
      ...createPreviewState().animationAnchors,
      openingTargetEntry0Origin: { x: -5.6, y: 901.2 },
      postPlayHandDrawOrigin: { x: 300.4, y: 444.6 },
      targetAttack0Impact: { x: Number.POSITIVE_INFINITY, y: 10 },
    },
  });

  assert.equal(normalized.focusArea, "enemyDeck");
  assert.deepEqual(normalized.selectedElements, ["playerDeck"]);
  assert.equal(normalized.layoutDevice, "desktop");
  assert.deepEqual(normalized.layoutDeviceOverrides.desktop, {
    text: {
      actionTitle: "Atacar",
    },
  });
  assert.deepEqual(normalized.layoutDeviceOverrides.tablet, {});
  assert.deepEqual(normalized.layoutDeviceOverrides.mobile, {});
  assert.equal(normalized.showGrid, true);
  assert.equal(normalized.gridSize, 64);
  assert.equal(normalized.snapThreshold, 4);
  assert.equal(normalized.viewportWidth, 320);
  assert.equal(normalized.viewportHeight, 240);
  assert.equal(normalized.animationPreset, "none");
  assert.equal(normalized.animationRunId, 0);
  assert.equal(normalized.animationAnchorTool, null);
  assert.equal(normalized.animationDebugEnabled, false);
  assert.deepEqual(normalized.animationAnchors.openingTargetEntry0Origin, {
    x: 0,
    y: 900,
  });
  assert.deepEqual(normalized.animationAnchors.postPlayHandDrawOrigin, {
    x: 300,
    y: 445,
  });
  assert.equal(normalized.animationAnchors.targetAttack0Impact, null);
});

test("normalizeBattleLayoutEditorPreviewState usa fallback de resolucao e selecao implicita", () => {
  const normalized = normalizeBattleLayoutEditorPreviewState({
    ...createPreviewState(),
    previewDevice: "mobile",
    focusArea: "playerDecks" as never,
    selectedElements: undefined as never,
    gridSize: Number.NaN,
    snapThreshold: Number.NaN,
    viewportWidth: Number.NaN,
    viewportHeight: Number.NaN,
    actionVisualState: undefined as never,
    statusVisualState: undefined as never,
    chroniclesVisualState: undefined as never,
    animationSet: undefined as never,
    animationMode: undefined as never,
    animationPreset: undefined as never,
  });

  assert.equal(normalized.focusArea, "playerDeck");
  assert.deepEqual(normalized.selectedElements, ["playerDeck"]);
  assert.equal(normalized.gridSize, 8);
  assert.equal(normalized.snapThreshold, 12);
  assert.equal(normalized.viewportWidth, 844);
  assert.equal(normalized.viewportHeight, 390);
  assert.equal(normalized.actionVisualState, "normal");
  assert.equal(normalized.statusVisualState, "normal");
  assert.equal(normalized.chroniclesVisualState, "normal");
  assert.equal(normalized.animationSet, "opening-target-entry-first-round");
  assert.equal(normalized.animationMode, "idle");
  assert.equal(normalized.animationPreset, "none");
});

test("normalizeBattleLayoutEditorPreviewState preserva desktop-tablet-mobile independentes", () => {
  const normalized = normalizeBattleLayoutEditorPreviewState(
    {
      ...createPreviewState(),
      layoutDevice: "mobile",
      layoutDeviceOverrides: {
        desktop: {
          elements: {
            board: {
              x: 12,
            },
          },
        },
        tablet: {
          elements: {
            board: {
              x: 12,
              y: 20,
            },
          },
        },
        mobile: {
          elements: {
            board: {
              x: 18,
              y: 34,
            },
          },
        },
      },
    },
  );

  assert.equal(normalized.layoutDevice, "mobile");
  assert.deepEqual(normalized.layoutDeviceOverrides.desktop, {
    elements: {
      board: {
        x: 12,
      },
    },
  });
  assert.deepEqual(normalized.layoutDeviceOverrides.tablet, {
    elements: {
      board: {
        x: 12,
        y: 20,
      },
    },
  });
  assert.deepEqual(normalized.layoutDeviceOverrides.mobile, {
    elements: {
      board: {
        x: 18,
        y: 34,
      },
    },
  });
});

test("getLiveAnimationAnchorReferenceTarget resolve destinos por tipo de ancora", () => {
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("openingTargetEntry0Origin", 2),
    { kind: "zone", zoneId: "playerTargetDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("openingTargetEntry3Origin", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("handPlayTarget1Destination", 2),
    { kind: "slot", zoneId: "playerField", slot: "slot-1" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("mulliganDraw2Origin", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("targetAttack3Impact", 2),
    { kind: "slot", zoneId: "enemyField", slot: "slot-1" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("targetAttack2Destination", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
});

const createTarget = (overrides: Partial<UITarget> = {}): UITarget => ({
  id: "target-under-test",
  name: "CAMARAO",
  emoji: "🦐",
  syllables: ["CA", "MA", "RAO"],
  rarity: "raro",
  progress: [],
  uiId: "target-under-test-ui",
  entering: false,
  attacking: false,
  leaving: false,
  justArrived: false,
  canonicalTargetId: "catalog-target-camarao",
  targetInstanceId: "target-instance-camarao-1",
  requiredCardIds: ["card-ca", "card-ma", "card-rao"],
  targetSuperclass: "animal",
  targetClassKey: "seafood",
  sourceDeckId: "deck-ocean",
  ...overrides,
});

const createVisualTargetEntity = (
  target: UITarget,
  side: "player" | "enemy",
  slotIndex: number,
): VisualTargetEntity => ({
  id: `${target.uiId}-visual`,
  side,
  slotIndex,
  target,
});

test("buildBattleTargetFieldState separa slot instance e scene nodes ativos por slot", () => {
  const stablePlayerTarget = createVisualTargetEntity(createTarget(), "player", 0);
  const outgoingPlayerTarget = createVisualTargetEntity(
    createTarget({
      id: "completed-target",
      uiId: "completed-target-ui",
      canonicalTargetId: "catalog-target-completed",
      targetInstanceId: "target-instance-completed-1",
    }),
    "player",
    0,
  );
  const incomingPlayerTarget = createVisualTargetEntity(
    createTarget({
      id: "replacement-target",
      uiId: "replacement-target-ui",
      canonicalTargetId: "catalog-target-replacement",
      targetInstanceId: "target-instance-replacement-1",
    }),
    "player",
    0,
  );
  const enemyStableTarget = createVisualTargetEntity(
    createTarget({
      id: "enemy-target",
      uiId: "enemy-target-ui",
      targetInstanceId: "enemy-target-instance-1",
    }),
    "enemy",
    0,
  );

  const state = buildBattleTargetFieldState({
    localPlayerIndex: 0,
    targetsInPlay: 2,
    logicalTargets: {
      0: [
        createTarget({
          id: "logical-player-target",
          uiId: "logical-player-target-ui",
          targetInstanceId: "logical-player-target-instance-1",
          canonicalTargetId: "catalog-target-logical-player",
        }),
        createTarget({
          id: "player-target-1",
          uiId: "player-target-1-ui",
          targetInstanceId: "player-target-1-instance",
        }),
      ],
      1: [
        createTarget({
          id: "enemy-logical-target",
          uiId: "enemy-logical-target-ui",
          targetInstanceId: "enemy-logical-target-instance-1",
        }),
        createTarget({
          id: "enemy-target-1",
          uiId: "enemy-target-1-ui",
          targetInstanceId: "enemy-target-1-instance",
        }),
      ],
    },
    stableTargets: {
      0: [stablePlayerTarget, null],
      1: [enemyStableTarget, null],
    },
    incomingTargets: {
      0: [
        {
          id: "incoming-target-replacement",
          slotIndex: 0,
          entity: incomingPlayerTarget,
        },
      ],
      1: [],
    },
    outgoingTargets: {
      0: [
        {
          id: "outgoing-target-attack",
          slotIndex: 0,
          entity: outgoingPlayerTarget,
          impactDestination: { left: 0, top: 0, width: 0, height: 0 },
        },
      ],
      1: [],
    },
    lockedTargetSlots: {
      0: [true, false],
      1: [false, false],
    },
    pendingTargetPlacements: {
      0: ["CA", null],
      1: [null, null],
    },
  });

  const playerSlot0 = state.playerSlots[0];
  assert.equal(playerSlot0.slot.slotId, "player-field-slot-0");
  assert.equal(playerSlot0.slot.fieldZoneId, "playerField");
  assert.equal(playerSlot0.occupant?.instanceId, "logical-player-target-instance-1");
  assert.equal(playerSlot0.occupant?.canonicalTargetId, "catalog-target-logical-player");
  assert.equal(playerSlot0.pendingCard, "CA");
  assert.equal(playerSlot0.locked, true);
  assert.deepEqual(
    playerSlot0.sceneNodes.map((node) => node.phase),
    ["idle", "replacement", "attack", "receive-card"],
  );
  assert.equal(
    playerSlot0.sceneNodes.find((node) => node.phase === "attack")?.instanceId,
    "target-instance-completed-1",
  );
  assert.equal(
    playerSlot0.sceneNodes.find((node) => node.phase === "replacement")?.motion?.kind,
    "incoming",
  );
  assert.equal(
    playerSlot0.sceneNodes.find((node) => node.phase === "attack")?.motion?.kind,
    "outgoing",
  );
  assert.equal(
    playerSlot0.sceneNodes.find((node) => node.phase === "receive-card")?.motion?.kind,
    "receive-card",
  );
  assert.equal(
    playerSlot0.sceneNodes.find((node) => node.phase === "replacement")?.instanceId,
    "target-instance-replacement-1",
  );

  const enemySlot0 = state.enemySlots[0];
  assert.equal(enemySlot0.slot.slotId, "enemy-field-slot-0");
  assert.equal(enemySlot0.occupant?.instanceId, "enemy-logical-target-instance-1");
  assert.deepEqual(
    enemySlot0.sceneNodes.map((node) => node.phase),
    ["idle"],
  );
  assert.equal(enemySlot0.sceneNodes[0]?.motion, null);
});

test("createBattleSceneBoardModel consegue expressar occupant atual e nodes ativos por slot", () => {
  const target = createTarget();
  const visualEntity = createVisualTargetEntity(target, "player", 0);
  const board = createBattleSceneBoardModel({
    enemyFieldSlots: [],
    playerFieldSlots: [
      {
        key: "player-slot-0",
        slotRef: () => {},
        displayedTarget: visualEntity,
        incomingTarget: null,
        outgoingTarget: null,
        slotRect: null,
        selectedCard: null,
        pendingCard: "CA",
        canClick: false,
        onClick: () => {},
      },
    ],
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
  });

  assert.equal(board.playerFieldObjects.length, 1);
  assert.equal(board.playerFieldObjects[0]?.slot.slotId, "player-field-slot-0");
  assert.equal(board.playerFieldObjects[0]?.occupant?.instanceId, "target-instance-camarao-1");
  assert.deepEqual(
    board.playerFieldObjects[0]?.sceneNodes.map((node: BattleTargetSceneNode) => node.phase),
    ["idle", "receive-card"],
  );
});

test("buildBattleFieldLaneSlotsFromTargetField reutiliza a mesma pipeline de motion para preview e runtime", () => {
  const stableTarget = createTarget({
    id: "runtime-target-stable",
    uiId: "runtime-target-stable-ui",
    targetInstanceId: "runtime-target-stable-instance",
  });
  const incomingTargetEntity = createVisualTargetEntity(
    createTarget({
      id: "runtime-target-replacement",
      uiId: "runtime-target-replacement-ui",
      targetInstanceId: "runtime-target-replacement-instance",
    }),
    "player",
    0,
  );
  const outgoingTargetEntity = createVisualTargetEntity(
    createTarget({
      id: "runtime-target-outgoing",
      uiId: "runtime-target-outgoing-ui",
      targetInstanceId: "runtime-target-outgoing-instance",
    }),
    "player",
    0,
  );
  const stableEntity = createVisualTargetEntity(stableTarget, "player", 0);
  const previewFieldState = buildBattleTargetFieldStateFromSceneSlots({
    enemyFieldSlots: [],
    playerFieldSlots: [
      {
        key: "player-slot-0",
        slotRef: () => {},
        displayedTarget: stableEntity,
        incomingTarget: {
          id: "preview-incoming-target",
          side: 0,
          slotIndex: 0,
          entity: incomingTargetEntity,
          origin: { left: 10, top: 20, width: 30, height: 40 },
          delayMs: 80,
          durationMs: 520,
        },
        outgoingTarget: {
          id: "preview-outgoing-target",
          side: 0,
          entity: outgoingTargetEntity,
          impactDestination: { left: 40, top: 50, width: 20, height: 20 },
          destination: { left: 100, top: 110, width: 40, height: 50 },
          delayMs: 0,
          windupMs: 120,
          attackMs: 240,
          pauseMs: 80,
          exitMs: 300,
        },
        slotRect: null,
        selectedCard: "CA",
        pendingCard: "CA",
        canClick: false,
        onClick: () => {},
        playerHand: ["CA"],
      },
    ],
  });

  const laneSlots = buildBattleFieldLaneSlotsFromTargetField({
    fieldSlots: previewFieldState.playerSlots,
    bindSlotRef: () => () => {},
    getSlotRect: () => null,
    getSelectedCard: () => "CA",
    getPendingCard: () => "CA",
    getPendingCardMotion: () => ({ delayMs: 520 }),
    getCanClick: () => false,
    onClick: () => {},
  });

  assert.equal(laneSlots.length, 1);
  assert.equal(laneSlots[0]?.incomingTarget?.id, "preview-incoming-target");
  assert.equal(laneSlots[0]?.incomingTarget?.side, 0);
  assert.equal(laneSlots[0]?.incomingTarget?.slotIndex, 0);
  assert.equal(laneSlots[0]?.outgoingTarget?.id, "preview-outgoing-target");
  assert.equal(laneSlots[0]?.pendingCard, "CA");
  assert.equal(laneSlots[0]?.displayedTarget?.id, "runtime-target-outgoing-ui-visual");
  assert.deepEqual(
    laneSlots[0]?.renderNodes?.map((node) => node.phase),
    ["idle", "replacement", "attack"],
  );
  assert.deepEqual(
    laneSlots[0]?.renderNodes?.map((node) => node.zIndex),
    [20, 35, 50],
  );
  assert.equal(
    laneSlots[0]?.renderNodes?.find((node) => node.phase === "replacement")?.pendingCard,
    "CA",
  );
  assert.equal(
    laneSlots[0]?.renderNodes?.find((node) => node.phase === "replacement")?.pendingCardRevealDelayMs,
    520,
  );
  assert.equal(
    laneSlots[0]?.renderNodes?.find((node) => node.phase === "attack")?.pendingCard,
    null,
  );
});

test("getBattleSceneElementLayer preserva a policy entre shell field travel e mensagens", () => {
  assert.equal(getBattleSceneElementLayer("shell"), BATTLE_SCENE_LAYER_ORDER.shell);
  assert.equal(
    getBattleSceneElementLayer("enemyField"),
    BATTLE_SCENE_LAYER_ORDER.field,
  );
  assert.equal(
    getBattleSceneElementLayer("playerField", 90),
    90,
  );
  assert.equal(
    getBattleSceneElementLayer("boardMessage"),
    BATTLE_SCENE_LAYER_ORDER.boardMessage,
  );
  assert.equal(BATTLE_SCENE_LAYER_ORDER.travel > BATTLE_SCENE_LAYER_ORDER.field, true);
  assert.equal(
    BATTLE_SCENE_LAYER_ORDER.boardMessage > BATTLE_SCENE_LAYER_ORDER.travel,
    true,
  );
});

test("buildBattleProbeRow calcula deltas e preserva failureReason", () => {
  const row = buildBattleProbeRow({
    anchor: "anchor-under-test",
    point: { x: 15, y: 20 },
    screen: { x: 120, y: 210 },
    reference: { x: 8, y: 32 },
    referenceScreen: { x: 100, y: 190 },
    failureReason: "stage-missing",
  });

  assert.deepEqual(row, {
    anchor: "anchor-under-test",
    point: { x: 15, y: 20 },
    screen: { x: 120, y: 210 },
    reference: { x: 8, y: 32 },
    referenceScreen: { x: 100, y: 190 },
    failureReason: "stage-missing",
    deltaScene: { x: 7, y: -12 },
    deltaScreen: { x: 20, y: 20 },
  });
});

test("buildBattleProbeRow mantem deltas nulos quando faltam referencias", () => {
  const row = buildBattleProbeRow({
    anchor: "anchor-under-test",
    point: { x: 1, y: 2 },
    screen: null,
    reference: null,
    referenceScreen: null,
  });

  assert.equal(row.deltaScene, null);
  assert.equal(row.deltaScreen, null);
});

test("formatBattleProbeLine preserva o output atual de runtime e preview", () => {
  const row = buildBattleProbeRow({
    anchor: "post-play-hand-draw-origin",
    point: { x: 320, y: 460 },
    screen: { x: 640, y: 820 },
    reference: { x: 300, y: 440 },
    referenceScreen: { x: 600, y: 780 },
  });

  assert.equal(
    formatBattleProbeLine(row),
    "probe:post-play-hand-draw-origin scene:320,460 screen:640,820 ref:300,440 refScreen:600,780 dScene:+20,+20 dScreen:+40,+40",
  );
  assert.equal(
    formatBattleProbeLine(row, "visual"),
    "probe:visual:post-play-hand-draw-origin scene:320,460 screen:640,820 ref:300,440 refScreen:600,780 dScene:+20,+20 dScreen:+40,+40",
  );
});

test("helpers de conversao de stage preservam ida e volta scene-screen", () => {
  const metrics = {
    rect: { left: 100, top: 40 },
    scaleX: 0.5,
    scaleY: 0.75,
  };

  const screenPoint = toBattleDebugScreenPoint({ x: 320, y: 160 }, metrics);
  assert.deepEqual(screenPoint, { x: 260, y: 160 });
  assert.deepEqual(toBattleDebugScenePoint(screenPoint, metrics), {
    x: 320,
    y: 160,
  });
  assert.deepEqual(buildBattleDebugPointSnapshot({ x: 320, y: 160 }, metrics), {
    left: 260,
    top: 160,
    width: 0,
    height: 0,
  });
  assert.equal(toBattleDebugScreenPoint(null, metrics), null);
  assert.equal(toBattleDebugScenePoint(null, metrics), null);
});

test("getPreviewAnimationAnchorReferenceTarget resolve casos puros do preview", () => {
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("replacement-target-entry-3-origin", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("post-play-hand-draw-origin", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("hand-play-target-1-destination", 2),
    { kind: "slot", zoneId: "playerField", slot: "slot-1" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("mulligan-hand-return-2-destination", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("target-attack-3-impact", 2),
    { kind: "slot", zoneId: "enemyField", slot: "slot-1" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("target-attack-2-destination", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("opening-target-entry-1-origin", 2),
    { kind: "zone", zoneId: "playerTargetDeck" },
  );
});

test("helpers de formatacao/debug retornam saidas uteis sem depender de DOM", () => {
  assert.deepEqual(
    getBattleDebugZoneSnapshotCenter({
      left: 10.4,
      top: 20.4,
      width: 9.2,
      height: 5.2,
    }),
    { x: 15, y: 23 },
  );
  assert.equal(formatBattleDebugPoint({ x: 12, y: 34 }), "12,34");
  assert.equal(formatBattleDebugPoint(null), "-");
  assert.equal(formatBattleDebugDelta({ x: 5, y: -3 }), "+5,-3");
  assert.equal(formatBattleDebugDelta(null), "-");
  assert.equal(
    formatBattleDebugSnapshot({
      left: 10.2,
      top: 20.7,
      width: 30.4,
      height: 40.5,
    }),
    "10,21 30x41",
  );
  assert.equal(formatBattleDebugSnapshot(null), "-");

  const fallbackLine = formatBattleDebugFallbackLine({
    createdAt: 0,
    label: "post-play-hand-draw",
    reason: "anchor-missing",
    fallback: "deck",
  });
  assert.match(
    fallbackLine,
    /^fallback:\d{2}:\d{2}:\d{2} post-play-hand-draw reason:anchor-missing -> deck$/,
  );
});

test("layout visual dos montes preserva compatibilidade legada e serializa a nova secao", () => {
  const layout = createBattleLayoutConfig({
    visuals: {
      cardBackPresetId: "ember",
      deckPilePresetId: "jade",
      targetPilePresetId: "sunforge",
    } as never,
  });

  assert.equal(layout.visuals.cardBackPresetId, "ember");
  assert.equal(layout.visuals.deckPilePresetId, "jade");
  assert.equal(layout.visuals.targetPilePresetId, "sunforge");

  const legacyLayout = createBattleLayoutConfig({
    visuals: {
      cardStackPresetId: "jade",
    } as never,
  });

  assert.equal(legacyLayout.visuals.cardBackPresetId, "jade");
  assert.equal(legacyLayout.visuals.deckPilePresetId, "jade");
  assert.equal(legacyLayout.visuals.targetPilePresetId, "jade");

  const previousRoundLayout = createBattleLayoutConfig({
    visuals: {
      pilePresetId: "ember",
    } as never,
  });

  assert.equal(previousRoundLayout.visuals.deckPilePresetId, "ember");
  assert.equal(previousRoundLayout.visuals.targetPilePresetId, "ember");

  const presetSource = createBattleLayoutPresetSource({
    text: {
      actionTitle: "Golpear",
    },
  });

  assert.match(
    presetSource,
    /battleActiveLayoutDeviceOverrides/,
  );
  assert.match(
    presetSource,
    /"text": \{\s+"actionTitle": "Golpear"\s+\}/,
  );
  assert.match(
    presetSource,
    /"visuals": \{\s+"cardBackPresetId": "arcane",\s+"deckPilePresetId": "arcane",\s+"targetPilePresetId": "arcane"\s+\}/,
  );
  assert.match(
    presetSource,
    /"tablet": \{\s+"text": \{\s+"actionTitle": "Golpear"\s+\}/,
  );
  assert.match(
    presetSource,
    /"mobile": \{\s+"text": \{\s+"actionTitle": "Golpear"\s+\}/,
  );
  assert.doesNotMatch(
    presetSource,
    /battleActiveLayoutVariantOverrides|battleActiveCompactLayoutOverrides|battleActiveCompactLayoutConfig|BattleLayoutVariantOverrides/,
  );
});
