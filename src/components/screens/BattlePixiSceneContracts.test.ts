import assert from "node:assert/strict";
import test from "node:test";
import { createBattleLayoutConfig } from "./BattleLayoutConfig";
import {
  createBattleSceneBoardModel,
  createBattleSceneRenderModel,
} from "./BattleSceneViewModel";
import { createBattlePixiSceneModel } from "./BattlePixiSceneModel";
import { resolveBattlePixiFrame } from "./battlePixiPlaybackBridge";
import type { BattleSceneModel } from "./BattleSceneViewModel";

const createTarget = (args: {
  id: string;
  name: string;
  emoji: string;
  slotIndex: number;
  progress?: string[];
}) => ({
  id: args.id,
  canonicalTargetId: args.id,
  targetInstanceId: `instance-${args.id}`,
  uiId: `ui-${args.id}`,
  name: args.name,
  emoji: args.emoji,
  syllables: ["BA", "TA"],
  rarity: "comum" as const,
  progress: args.progress ?? [],
  entering: false,
  attacking: false,
  leaving: false,
  justArrived: false,
});

const createEntity = (side: "player" | "enemy", slotIndex: number, id: string) => ({
  id,
  side,
  slotIndex,
  target: createTarget({
    id,
    name: `${side}-${slotIndex}`,
    emoji: side === "player" ? "🛡️" : "🐉",
    slotIndex,
  }),
});

const createScene = (): BattleSceneModel => ({
  board: createBattleSceneBoardModel({
    enemyFieldSlots: [
      {
        key: "enemy-slot-0",
        slotRef: () => {},
        displayedTarget: createEntity("enemy", 0, "enemy-idle"),
        incomingTarget: null,
        outgoingTarget: {
          id: "enemy-outgoing",
          side: 1,
          entity: createEntity("enemy", 0, "enemy-outgoing-entity"),
          impactDestination: { left: 0, top: 0, width: 10, height: 10 },
          destination: { left: 0, top: 0, width: 10, height: 10 },
          delayMs: 40,
          windupMs: 80,
          attackMs: 120,
          pauseMs: 40,
          exitMs: 100,
        },
        slotRect: null,
        selectedCard: null,
        pendingCard: null,
        canClick: false,
        onClick: () => {},
      },
      {
        key: "enemy-slot-1",
        slotRef: () => {},
        displayedTarget: null,
        incomingTarget: null,
        outgoingTarget: null,
        slotRect: null,
        selectedCard: null,
        pendingCard: null,
        canClick: false,
        onClick: () => {},
      },
    ],
    playerFieldSlots: [
      {
        key: "player-slot-0",
        slotRef: () => {},
        displayedTarget: createEntity("player", 0, "player-incoming-entity"),
        incomingTarget: {
          id: "opening-target-player-0",
          side: 0,
          slotIndex: 0,
          entity: createEntity("player", 0, "player-incoming-entity"),
          origin: { left: 0, top: 0, width: 10, height: 10 },
          delayMs: 20,
          durationMs: 180,
        },
        outgoingTarget: null,
        slotRect: null,
        selectedCard: null,
        pendingCard: "BA",
        canClick: false,
        onClick: () => {},
      },
      {
        key: "player-slot-1",
        slotRef: () => {},
        displayedTarget: createEntity("player", 1, "player-idle"),
        incomingTarget: null,
        outgoingTarget: null,
        slotRect: null,
        selectedCard: null,
        pendingCard: null,
        canClick: false,
        onClick: () => {},
      },
    ],
    currentMessage: null,
    enemyPortrait: {
      label: "ENEMY",
      isLocal: false,
      life: 10,
      active: false,
      flashDamage: 0,
    },
    playerPortrait: {
      label: "PLAYER",
      isLocal: true,
      life: 10,
      active: true,
      flashDamage: 0,
    },
  }),
  leftSidebar: {
    decks: {
      targetDeckCount: 4,
      deckCount: 10,
    },
    chronicles: [],
  },
  rightSidebar: {
    hud: {
      title: "Turno",
      turnLabel: "Seu turno",
      clock: "30",
      clockUrgent: false,
    },
    decks: {
      targetDeckCount: 4,
      deckCount: 10,
    },
  },
  hands: {
    top: {
      side: 1,
      presentation: "remote",
      stableCards: [],
    },
    bottom: {
      side: 0,
      presentation: "local",
      stableCards: [],
      outgoingCards: [
        {
          id: "play-hand-card",
          side: 0,
          card: {
            id: "card-1",
            side: 0,
            hidden: false,
            syllable: "BA",
          },
          destination: { left: 0, top: 0, width: 10, height: 10 },
          initialIndex: 0,
          initialTotal: 3,
          delayMs: 15,
          durationMs: 220,
          destinationMode: "zone-center",
          endRotate: 6,
          endScale: 1,
          targetSlotIndex: 0,
        },
      ],
    },
  },
});

test("createBattlePixiSceneModel usa SceneRenderModel LayoutBridge e AnchorResolver na fatia Pixi", () => {
  const layout = createBattleLayoutConfig({
    animations: {
      openingTargetEntry0Origin: { x: 160, y: 140 },
      handPlayTarget0Destination: { x: 640, y: 520 },
      targetAttack2Impact: { x: 980, y: 310 },
      targetAttack2Destination: { x: 1180, y: 180 },
    },
  });
  const renderModel = createBattleSceneRenderModel({
    scene: createScene(),
    layout,
    layoutDevice: "desktop",
    viewportWidth: 1600,
    viewportHeight: 900,
  });

  const pixiScene = createBattlePixiSceneModel(renderModel);
  const incoming = pixiScene.targetDrawables.find(
    (drawable) =>
      drawable.side === "player" &&
      drawable.slotIndex === 0 &&
      drawable.motion?.kind === "incoming",
  );
  const outgoing = pixiScene.targetDrawables.find(
    (drawable) =>
      drawable.side === "enemy" &&
      drawable.slotIndex === 0 &&
      drawable.motion?.kind === "outgoing",
  );
  const handTravel = pixiScene.handTravelDrawables.find(
    (drawable) => drawable.id === "play-hand-card",
  );

  assert.equal(pixiScene.slotGuides.length, 4);
  assert.deepEqual(
    pixiScene.slotGuides[2].rect,
    renderModel.layoutBridge.fields.player.slots[0].sceneRect,
  );
  assert.equal(incoming?.motion?.kind, "incoming");
  assert.deepEqual(incoming?.motion?.startPoint, { x: 160, y: 140 });
  assert.equal(outgoing?.motion?.kind, "outgoing");
  assert.deepEqual(outgoing?.motion?.impactPoint, { x: 980, y: 310 });
  assert.deepEqual(outgoing?.motion?.endPoint, { x: 1180, y: 180 });
  assert.equal(handTravel?.endRect.x + handTravel!.endRect.width / 2, 640);
  assert.equal(handTravel?.endRect.y + handTravel!.endRect.height / 2, 520);
  assert.equal(pixiScene.durationMs > 0, true);
});

test("resolveBattlePixiFrame mantém paridade temporal e completa motions da fatia migrada", () => {
  const layout = createBattleLayoutConfig({
    animations: {
      openingTargetEntry0Origin: { x: 120, y: 120 },
      handPlayTarget0Destination: { x: 610, y: 540 },
      targetAttack2Impact: { x: 920, y: 280 },
      targetAttack2Destination: { x: 1120, y: 180 },
    },
  });
  const renderModel = createBattleSceneRenderModel({
    scene: createScene(),
    layout,
    layoutDevice: "mobile",
    viewportWidth: 844,
    viewportHeight: 390,
  });
  const pixiScene = createBattlePixiSceneModel(renderModel);
  const incomingId =
    pixiScene.targetDrawables.find(
      (drawable) =>
        drawable.side === "player" &&
        drawable.slotIndex === 0 &&
        drawable.motion?.kind === "incoming",
    )?.id ?? null;
  const outgoingId =
    pixiScene.targetDrawables.find(
      (drawable) =>
        drawable.side === "enemy" &&
        drawable.slotIndex === 0 &&
        drawable.motion?.kind === "outgoing",
    )?.id ?? null;

  const startFrame = resolveBattlePixiFrame(pixiScene, 0);
  const midFrame = resolveBattlePixiFrame(pixiScene, 180);
  const endFrame = resolveBattlePixiFrame(pixiScene, pixiScene.durationMs + 1);
  const incomingStart = startFrame.drawables.find(
    (drawable) => drawable.id === incomingId,
  );
  const incomingMid = midFrame.drawables.find(
    (drawable) => drawable.id === incomingId,
  );
  const travelMid = midFrame.drawables.find(
    (drawable) => drawable.id === "play-hand-card",
  );

  assert.equal(incomingStart?.accent, "player");
  assert.equal(incomingMid?.x !== incomingStart?.x, true);
  assert.equal(travelMid?.accent, "travel");
  assert.equal(Boolean(incomingId), true);
  assert.equal(Boolean(outgoingId), true);
  assert.equal(endFrame.completedMotionIds.includes(incomingId!), true);
  assert.equal(endFrame.completedMotionIds.includes(outgoingId!), true);
  assert.equal(
    endFrame.completedMotionIds.includes("play-hand-card"),
    true,
  );
});
