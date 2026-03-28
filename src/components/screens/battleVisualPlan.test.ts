import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SHARED_FLOW_TIMINGS } from "./battleSharedTimings";
import { createSimplePlayVisualPlan } from "./battleVisualPlan";
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

test("createSimplePlayVisualPlan cria contrato minimo para play sem dano", () => {
  const plan = createSimplePlayVisualPlan({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      actorIndex: 1,
      playedCard: "VA",
      drawnCards: ["CA"],
    }),
    targetIndex: 1,
    handIndex: 2,
    stableHandCountBeforePlay: 5,
  });

  assert.deepEqual(plan, {
    kind: "simple-play",
    actorIndex: 1,
    targetIndex: 1,
    playedCard: "VA",
    stableHandCountBeforePlay: 5,
    stableHandCountAfterPlay: 4,
    handExit: {
      atMs: 0,
      handIndex: 2,
      handCountBefore: 5,
    },
    targetProgressCommit: {
      atMs: 840,
      targetIndex: 1,
    },
    postPlayDraw: {
      atMs: 1060,
      cards: ["CA"],
      finalIndexBase: 4,
      finalTotal: 5,
      staggerMs: 130,
      durationMs: 940,
    },
    finish: {
      atMs: 2260,
    },
  });
});

test("createSimplePlayVisualPlan retorna null para fluxos fora do escopo minimo", () => {
  assert.equal(
    createSimplePlayVisualPlan({
      flow: BATTLE_SHARED_FLOW_TIMINGS,
      result: createResolvedPlayAction({ damage: 2 }),
      targetIndex: 0,
      handIndex: 0,
      stableHandCountBeforePlay: 5,
    }),
    null,
  );

  assert.equal(
    createSimplePlayVisualPlan({
      flow: BATTLE_SHARED_FLOW_TIMINGS,
      result: createResolvedPlayAction({ completedSlot: 0 }),
      targetIndex: 0,
      handIndex: 0,
      stableHandCountBeforePlay: 5,
    }),
    null,
  );
});

test("createSimplePlayVisualPlan tolera play simples sem draw disponivel", () => {
  const plan = createSimplePlayVisualPlan({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      drawnCards: [],
    }),
    targetIndex: 0,
    handIndex: 1,
    stableHandCountBeforePlay: 3,
    handLayoutSlotCount: 5,
  });

  assert.equal(plan?.postPlayDraw, null);
  assert.equal(plan?.stableHandCountAfterPlay, 2);
  assert.equal(plan?.finish.atMs, 2260);
});
