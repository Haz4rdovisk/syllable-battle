import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SHARED_FLOW_TIMINGS } from "./battleSharedTimings";
import { prepareBattleSimplePlayStep } from "./battleSimplePlayStep";
import type { ResolvedBattlePlayAction } from "./battleResolution";

const createResolvedPlayAction = (
  overrides: Partial<ResolvedBattlePlayAction> = {},
): ResolvedBattlePlayAction => ({
  nextPlayers: [] as any,
  damage: 0,
  damageSource: "",
  impactLife: 10,
  winner: null,
  completedSlot: null,
  actorIndex: 0,
  playedCard: "BA",
  drawnCards: ["LO"],
  ...overrides,
});

test("prepareBattleSimplePlayStep explicita a sequencia do simple play sem alterar geometria consolidada", () => {
  const calls: string[] = [];
  const step = prepareBattleSimplePlayStep({
    side: 0,
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      playedCard: "VA",
      drawnCards: ["CA"],
    }),
    handIndex: 2,
    targetIndex: 1,
    targetName: "Vaso",
    stableHandCountBeforePlay: 5,
    handLayoutSlotCount: 5,
    fieldZoneId: "playerField",
    getHandPlayTargetDestinationSnapshot: (side, targetIndex) => {
      calls.push(`hand:${side}:${targetIndex}`);
      return { left: 10, top: 20, width: 30, height: 40 };
    },
    getPostPlayHandDrawOriginSnapshot: (side) => {
      calls.push(`draw:${side}`);
      return { left: 50, top: 60, width: 70, height: 80 };
    },
    snapshotZoneSlot: (zoneId, slot) => {
      calls.push(`slot:${zoneId}:${slot}`);
      return { left: 1, top: 2, width: 3, height: 4 };
    },
  });

  assert.deepEqual(step.logicalEvent, {
    result: createResolvedPlayAction({
      playedCard: "VA",
      drawnCards: ["CA"],
    }),
    targetIndex: 1,
    targetName: "Vaso",
  });
  assert.equal(step.visualPlan?.kind, "simple-play");
  assert.deepEqual(step.statefulExecution.playedCardLayout, {
    index: 2,
    total: 5,
  });
  assert.deepEqual(step.liveGeometry, {
    visualGeometry: {
      handPlayDestination: { left: 10, top: 20, width: 30, height: 40 },
      postPlayDrawOrigin: { left: 50, top: 60, width: 70, height: 80 },
    },
    fallbackHandPlayDestination: { left: 10, top: 20, width: 30, height: 40 },
    fallbackPostPlayDrawOrigin: { left: 50, top: 60, width: 70, height: 80 },
  });
  assert.deepEqual(calls, ["hand:0:1", "draw:0"]);
});

test("prepareBattleSimplePlayStep preserva fallback exato quando o simple play visual nao se aplica", () => {
  const step = prepareBattleSimplePlayStep({
    side: 1,
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      damage: 3,
      damageSource: "Casa",
      drawnCards: ["BO"],
    }),
    handIndex: 0,
    targetIndex: 0,
    targetName: "Casa",
    stableHandCountBeforePlay: 4,
    handLayoutSlotCount: 5,
    fieldZoneId: "enemyField",
    getHandPlayTargetDestinationSnapshot: () => null,
    getPostPlayHandDrawOriginSnapshot: () => ({ left: 7, top: 8, width: 9, height: 10 }),
    snapshotZoneSlot: () => ({ left: 11, top: 12, width: 13, height: 14 }),
  });

  assert.equal(step.visualPlan, null);
  assert.deepEqual(step.liveGeometry, {
    visualGeometry: null,
    fallbackHandPlayDestination: { left: 11, top: 12, width: 13, height: 14 },
    fallbackPostPlayDrawOrigin: { left: 7, top: 8, width: 9, height: 10 },
  });
  assert.deepEqual(step.statefulExecution.playedCardLayout, {
    index: 0,
    total: 4,
  });
});
