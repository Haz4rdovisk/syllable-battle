import assert from "node:assert/strict";
import test from "node:test";
import type { ChronicleEntry, GameState } from "../../types/game";
import type { BattleHandLaneOutgoingCard } from "./BattleHandLane";
import { BATTLE_SHARED_FLOW_TIMINGS } from "./battleSharedTimings";
import { applyBattleSimplePlayRuntime } from "./battleSimplePlayRuntime";
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

const createGame = (): GameState =>
  ({
    players: [],
    turn: 0,
    turnDeadlineAt: null,
    winner: null,
    actedThisTurn: false,
    combatLocked: false,
    selectedHandIndexes: [1],
    selectedCardForPlay: 1,
    messageQueue: [],
    setupVersion: 1,
    mode: "solo",
    openingCoinChoice: null,
    openingCoinResult: null,
    openingIntroStep: "done",
    currentMessage: { title: "old", detail: "", kind: "turn" },
    log: [{ text: "old-log", tone: "system" }],
  } as any);

test("applyBattleSimplePlayRuntime preserva o fluxo simples com visual plan consolidado", () => {
  const outgoingCards: BattleHandLaneOutgoingCard[] = [];
  const drawCalls: unknown[] = [];
  const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
  const emitted: unknown[] = [];
  const combatCalls: unknown[] = [];
  const finalizeCalls: string[] = [];
  const stateUpdates: Array<(prev: GameState) => GameState> = [];

  applyBattleSimplePlayRuntime({
    side: 0,
    localPlayerIndex: 0,
    targetIndex: 1,
    clearSelection: true,
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      playedCard: "VA",
      drawnCards: ["CA"],
    }),
    playedStableCard: {
      id: "card-1",
      syllable: "VA",
      side: 0,
      hidden: false,
    },
    playedCardLayout: {
      index: 2,
      total: 5,
    },
    visualPlan: {
      kind: "simple-play",
      actorIndex: 0,
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
    },
    visualGeometry: {
      handPlayDestination: { left: 10, top: 20, width: 30, height: 40 },
      postPlayDrawOrigin: { left: 50, top: 60, width: 70, height: 80 },
    },
    fallbackHandPlayDestination: { left: 1, top: 2, width: 3, height: 4 },
    fallbackPostPlayDrawOrigin: { left: 5, top: 6, width: 7, height: 8 },
    appendOutgoingCard: (_side, outgoingCard) => outgoingCards.push(outgoingCard),
    queueHandDrawBatch: (_side, cards, args) => drawCalls.push({ cards, args }),
    setGame: (updater) => stateUpdates.push(updater),
    buildNextLog: () => [{ text: "new-log", tone: "system" }],
    emitResolvedPlayLogicalEvents: (args) => emitted.push(args),
    commitPlayedTargetProgress: () => undefined,
    scheduleActionTimer: (callback, delayMs) => scheduled.push({ callback, delayMs }),
    startCombatSequence: (result) => combatCalls.push(result),
    finalizeTurn: () => finalizeCalls.push("done"),
  });

  assert.equal(outgoingCards.length, 1);
  assert.deepEqual(outgoingCards[0], {
    id: "play-card-1-1",
    side: 0,
    card: {
      id: "card-1",
      syllable: "VA",
      side: 0,
      hidden: false,
    },
    destination: { left: 10, top: 20, width: 30, height: 40 },
    initialIndex: 2,
    initialTotal: 5,
    delayMs: 0,
    durationMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
    destinationMode: "zone-center",
    endRotate: 8,
    endScale: 1,
    targetSlotIndex: 1,
    pendingCardRevealDelayMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
  });
  assert.deepEqual(drawCalls, [
    {
      cards: ["CA"],
      args: {
        initialDelayMs: 1060,
        staggerMs: 130,
        durationMs: 940,
        finalTotalOverride: 5,
        finalIndexBase: 4,
        originOverride: { left: 50, top: 60, width: 70, height: 80 },
      },
    },
  ]);
  assert.equal(stateUpdates.length, 1);
  assert.deepEqual(stateUpdates[0](createGame()), {
    ...createGame(),
    players: [],
    winner: null,
    actedThisTurn: true,
    combatLocked: false,
    selectedHandIndexes: [],
    selectedCardForPlay: null,
    currentMessage: null,
    log: [{ text: "new-log", tone: "system" }],
  });
  assert.equal(emitted.length, 1);
  assert.deepEqual(
    scheduled.map(({ delayMs }) => delayMs),
    [840, 2260],
  );
  assert.equal(combatCalls.length, 0);
  assert.equal(finalizeCalls.length, 0);
});

test("applyBattleSimplePlayRuntime preserva fallback simples sem mover geometria live", () => {
  const outgoingCards: BattleHandLaneOutgoingCard[] = [];
  const drawCalls: unknown[] = [];
  const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
  const combatCalls: unknown[] = [];

  applyBattleSimplePlayRuntime({
    side: 1,
    localPlayerIndex: 0,
    targetIndex: 0,
    clearSelection: false,
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    result: createResolvedPlayAction({
      actorIndex: 1,
      playedCard: "LO",
      drawnCards: ["BO"],
    }),
    playedStableCard: {
      id: "card-2",
      syllable: "LO",
      side: 1,
      hidden: true,
    },
    playedCardLayout: {
      index: 1,
      total: 4,
    },
    visualPlan: null,
    visualGeometry: null,
    fallbackHandPlayDestination: { left: 100, top: 200, width: 20, height: 30 },
    fallbackPostPlayDrawOrigin: { left: 300, top: 400, width: 20, height: 30 },
    appendOutgoingCard: (_side, outgoingCard) => outgoingCards.push(outgoingCard),
    queueHandDrawBatch: (_side, cards, args) => drawCalls.push({ cards, args }),
    setGame: () => undefined,
    buildNextLog: (prevLog) => prevLog,
    emitResolvedPlayLogicalEvents: () => undefined,
    commitPlayedTargetProgress: () => undefined,
    scheduleActionTimer: (callback, delayMs) => scheduled.push({ callback, delayMs }),
    startCombatSequence: (result) => combatCalls.push(result),
    finalizeTurn: () => undefined,
  });

  assert.equal(outgoingCards.length, 1);
  assert.deepEqual(outgoingCards[0].destination, {
    left: 100,
    top: 200,
    width: 20,
    height: 30,
  });
  assert.equal(outgoingCards[0].initialIndex, 1);
  assert.equal(outgoingCards[0].initialTotal, 4);
  assert.equal(outgoingCards[0].endRotate, -8);
  assert.equal(outgoingCards[0].targetSlotIndex, 0);
  assert.equal(
    outgoingCards[0].pendingCardRevealDelayMs,
    BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
  );
  assert.deepEqual(drawCalls, [
    {
      cards: ["BO"],
      args: {
        initialDelayMs: 1060,
        staggerMs: 130,
        durationMs: 940,
        originOverride: { left: 300, top: 400, width: 20, height: 30 },
      },
    },
  ]);
  assert.deepEqual(
    scheduled.map(({ delayMs }) => delayMs),
    [840, 2260],
  );
  assert.equal(combatCalls.length, 0);
});
