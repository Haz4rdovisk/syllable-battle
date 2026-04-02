import { useCallback } from "react";
import { CONFIG } from "../../logic/gameLogic";
import type { BattleDeckSpec } from "../../data/content";
import { BattleTurnAction, GameState, Syllable } from "../../types/game";
import { BattleFieldOutgoingTarget } from "./BattleFieldLane";
import { BattleHandLaneOutgoingCard } from "./BattleHandLane";
import { createMulliganResolutionEvents, createPlayResolutionEvents } from "./battleEvents";
import { getMulliganDrawStartDelayMs, getMulliganFinishDelayMs } from "./battleFlow";
import { applyBattleSimplePlayRuntime } from "./battleSimplePlayRuntime";
import { prepareBattleSimplePlayStep } from "./battleSimplePlayStep";
import { resolveBattleMulliganAction, resolveBattlePlayAction } from "./battleResolution";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";
import { replaceBattleRuntimeTargetInSlot } from "./BattleRuntimeSetup";

interface UseBattleCombatFlowParams<TVisualHandCard, TVisualTarget> {
  flow: any;
  localPlayerIndex: BattleRuntimeSide;
  playerDeck: BattleDeckSpec;
  enemyDeck: BattleDeckSpec;
  handLayoutSlotCount: number;
  game: GameState;
  gameRef: React.MutableRefObject<GameState>;
  stableHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, TVisualHandCard[]>>;
  stableTargetsRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<TVisualTarget | null>>>;
  pendingMulliganDrawCountsRef: React.MutableRefObject<Record<BattleRuntimeSide, number>>;
  pendingMulliganDrawQueuesRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<{
    syllable: Syllable;
    finalIndex: number;
    finalTotal: number;
    originOverride: any;
  }>>>;
  actionTimersRef: React.MutableRefObject<NodeJS.Timeout[]>;
  activeBattleLayoutAnimations: any;
  isDesktopViewport: boolean;
  zoneIdForSide: (side: BattleRuntimeSide, role: "hand" | "field" | "deck" | "targetDeck" | "discard") => any;
  snapshotSceneAnimationOriginWithFallback: (label: string, anchor: unknown, fallback: string) => any;
  snapshotZone: (zoneId: any) => any;
  snapshotZoneSlot: (zoneId: any, slot: string) => any;
  getPostPlayHandDrawOriginSnapshot: (side: BattleRuntimeSide) => any;
  getReplacementTargetEntryOriginSnapshot: (side: BattleRuntimeSide, slotIndex: number) => any;
  getMulliganHandReturnDestinationSnapshot: (side: BattleRuntimeSide, count: number) => any;
  getMulliganHandDrawOriginSnapshot: (side: BattleRuntimeSide, count: number) => any;
  getHandPlayTargetDestinationSnapshot: (side: BattleRuntimeSide, targetIndex: number) => any;
  appendOutgoingTarget: (side: BattleRuntimeSide, target: any) => void;
  removeOutgoingTarget: (side: BattleRuntimeSide, id: string) => void;
  appendIncomingTarget: (side: BattleRuntimeSide, target: any) => void;
  removeIncomingTarget: (side: BattleRuntimeSide, id: string) => void;
  appendOutgoingCard: (side: BattleRuntimeSide, card: BattleHandLaneOutgoingCard) => void;
  removeStableCards: (side: BattleRuntimeSide, indexes: number[]) => TVisualHandCard[];
  queueHandDrawBatch: (side: BattleRuntimeSide, drawnCards: Syllable[], options: any) => void;
  setStableTargetSlot: (side: BattleRuntimeSide, slotIndex: number, target: TVisualTarget | null) => void;
  lockTargetSlot: (side: BattleRuntimeSide, slotIndex: number, locked: boolean) => void;
  setPendingTargetPlacement: (side: BattleRuntimeSide, slotIndex: number, card: Syllable | null) => void;
  commitPendingMulliganDrawCounts: (counts: Record<BattleRuntimeSide, number>) => void;
  commitIncomingHands: (hands: Record<BattleRuntimeSide, any[]>) => void;
  commitOutgoingHands: (hands: Record<BattleRuntimeSide, BattleHandLaneOutgoingCard[]>) => void;
  commitOutgoingTargets: (targets: Record<BattleRuntimeSide, any[]>) => void;
  incomingHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, any[]>>;
  outgoingHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, BattleHandLaneOutgoingCard[]>>;
  outgoingTargetsRef: React.MutableRefObject<Record<BattleRuntimeSide, any[]>>;
  toVisualTarget: (target: GameState["players"][0]["targets"][number], side: BattleRuntimeSide, index: number) => TVisualTarget;
  finalizeTurn: () => void;
  setGame: React.Dispatch<React.SetStateAction<GameState>>;
  addLog: (log: any[], entry: any) => any[];
  buildPlayChronicleEntries: (side: BattleRuntimeSide, result: any, targetName: string) => any[];
  buildHandSwapChronicleEntry: (side: BattleRuntimeSide, returnedCount: number) => any;
  emitBattleEvent: (event: any) => void;
  emitDamageAppliedEvent: (...args: any[]) => void;
  emitTargetReplacedEvent: (...args: any[]) => void;
}

export const useBattleCombatFlow = <
  TVisualHandCard extends {
    id: string;
    syllable: Syllable;
    side: BattleRuntimeSide;
    hidden: boolean;
    skipEntryAnimation?: boolean;
  },
  TVisualTarget,
>({
  flow,
  localPlayerIndex,
  playerDeck,
  enemyDeck,
  handLayoutSlotCount,
  game,
  gameRef,
  stableHandsRef,
  stableTargetsRef,
  pendingMulliganDrawCountsRef,
  pendingMulliganDrawQueuesRef,
  actionTimersRef,
  activeBattleLayoutAnimations,
  isDesktopViewport,
  zoneIdForSide,
  snapshotSceneAnimationOriginWithFallback,
  snapshotZone,
  snapshotZoneSlot,
  getPostPlayHandDrawOriginSnapshot,
  getReplacementTargetEntryOriginSnapshot,
  getMulliganHandReturnDestinationSnapshot,
  getMulliganHandDrawOriginSnapshot,
  getHandPlayTargetDestinationSnapshot,
  appendOutgoingTarget,
  removeOutgoingTarget,
  appendIncomingTarget,
  removeIncomingTarget,
  appendOutgoingCard,
  removeStableCards,
  queueHandDrawBatch,
  setStableTargetSlot,
  lockTargetSlot,
  setPendingTargetPlacement,
  commitPendingMulliganDrawCounts,
  commitIncomingHands,
  commitOutgoingHands,
  commitOutgoingTargets,
  incomingHandsRef,
  outgoingHandsRef,
  outgoingTargetsRef,
  toVisualTarget,
  finalizeTurn,
  setGame,
  addLog,
  buildPlayChronicleEntries,
  buildHandSwapChronicleEntry,
  emitBattleEvent,
  emitDamageAppliedEvent,
  emitTargetReplacedEvent,
}: UseBattleCombatFlowParams<TVisualHandCard, TVisualTarget>) => {
  const handleOutgoingTargetComplete = useCallback(
    (outgoingTarget: BattleFieldOutgoingTarget & { side: BattleRuntimeSide }) => {
      removeOutgoingTarget(outgoingTarget.side, outgoingTarget.id);
    },
    [removeOutgoingTarget],
  );

  const queueCompletedTargetDeparture = useCallback(
    (result: { actorIndex: BattleRuntimeSide; completedSlot: number | null }) => {
      if (result.completedSlot == null) return;

      const side = result.actorIndex;
      const stableTarget = stableTargetsRef.current[side][result.completedSlot];
      const origin = snapshotZoneSlot(zoneIdForSide(side, "field"), `slot-${result.completedSlot}`);
      const activeDeckSlot = isDesktopViewport ? "desktop" : "mobile";
      const attackIndex = side * CONFIG.targetsInPlay + result.completedSlot;
      const configuredImpact =
        attackIndex === 0
          ? activeBattleLayoutAnimations.targetAttack0Impact
          : attackIndex === 1
            ? activeBattleLayoutAnimations.targetAttack1Impact
            : attackIndex === 2
              ? activeBattleLayoutAnimations.targetAttack2Impact
              : activeBattleLayoutAnimations.targetAttack3Impact;
      const configuredDestination =
        attackIndex === 0
          ? activeBattleLayoutAnimations.targetAttack0Destination
          : attackIndex === 1
            ? activeBattleLayoutAnimations.targetAttack1Destination
            : attackIndex === 2
              ? activeBattleLayoutAnimations.targetAttack2Destination
              : activeBattleLayoutAnimations.targetAttack3Destination;
      const impactDestination =
        snapshotSceneAnimationOriginWithFallback(
          `target-attack-impact-${attackIndex}`,
          configuredImpact,
          "field-slot-center",
        ) ?? null;
      const destination =
        snapshotSceneAnimationOriginWithFallback(
          `target-attack-destination-${attackIndex}`,
          configuredDestination,
          `${side === PLAYER ? "player" : "enemy"}-target-deck`,
        ) ??
        snapshotZoneSlot(zoneIdForSide(side, "targetDeck"), activeDeckSlot) ??
        snapshotZone(zoneIdForSide(side, "targetDeck"));

      if (!stableTarget || !origin || !destination) {
        setStableTargetSlot(side, result.completedSlot, null);
        lockTargetSlot(side, result.completedSlot, true);
        return;
      }

      lockTargetSlot(side, result.completedSlot, true);
      setStableTargetSlot(side, result.completedSlot, null);
      appendOutgoingTarget(side, {
        id: `target-motion-${(stableTarget as any).id}-depart`,
        side,
        slotIndex: result.completedSlot,
        entity: stableTarget,
        impactDestination,
        destination,
        delayMs: 0,
        windupMs: flow.attackWindupMs + 90,
        attackMs: flow.attackTravelMs + 120,
        pauseMs: flow.impactPauseMs,
        exitMs: flow.targetExitMs + 180,
      });
    },
    [activeBattleLayoutAnimations, appendOutgoingTarget, flow, isDesktopViewport, lockTargetSlot, setStableTargetSlot, snapshotSceneAnimationOriginWithFallback, snapshotZone, snapshotZoneSlot, stableTargetsRef, zoneIdForSide],
  );

  const queueReplacementTargetArrival = useCallback(
    (actorIndex: BattleRuntimeSide, slotIndex: number, logicalTarget: GameState["players"][0]["targets"][number]) => {
      if (!logicalTarget) {
        lockTargetSlot(actorIndex, slotIndex, false);
        return;
      }

      const activeDeckSlot = isDesktopViewport ? "desktop" : "mobile";
      const origin =
        getReplacementTargetEntryOriginSnapshot(actorIndex, slotIndex) ??
        snapshotZoneSlot(zoneIdForSide(actorIndex, "targetDeck"), activeDeckSlot) ??
        snapshotZone(zoneIdForSide(actorIndex, "targetDeck"));
      const entity = toVisualTarget(logicalTarget, actorIndex, slotIndex);

      if (!origin) {
        setStableTargetSlot(actorIndex, slotIndex, entity);
        lockTargetSlot(actorIndex, slotIndex, false);
        return;
      }

      appendIncomingTarget(actorIndex, {
        id: `incoming-target-${(entity as any).id ?? logicalTarget.uiId}`,
        side: actorIndex,
        slotIndex,
        entity,
        origin,
        delayMs: 0,
        durationMs: 520,
      });
    },
    [appendIncomingTarget, getReplacementTargetEntryOriginSnapshot, isDesktopViewport, lockTargetSlot, setStableTargetSlot, snapshotZone, snapshotZoneSlot, toVisualTarget, zoneIdForSide],
  );

  const commitIncomingTargetToField = useCallback(
    (incomingTarget: any) => {
      removeIncomingTarget(incomingTarget.side, incomingTarget.id);
      setStableTargetSlot(incomingTarget.side, incomingTarget.slotIndex, incomingTarget.entity);
      lockTargetSlot(incomingTarget.side, incomingTarget.slotIndex, false);
    },
    [lockTargetSlot, removeIncomingTarget, setStableTargetSlot],
  );

  const commitPlayedTargetProgress = useCallback(
    (side: BattleRuntimeSide, slotIndex: number) => {
      const logicalTarget = gameRef.current.players[side].targets[slotIndex];
      if (!logicalTarget) {
        setPendingTargetPlacement(side, slotIndex, null);
        lockTargetSlot(side, slotIndex, false);
        return;
      }

      setStableTargetSlot(side, slotIndex, toVisualTarget(logicalTarget, side, slotIndex));
      setPendingTargetPlacement(side, slotIndex, null);
      lockTargetSlot(side, slotIndex, false);
    },
    [gameRef, lockTargetSlot, setPendingTargetPlacement, setStableTargetSlot, toVisualTarget],
  );

  const startCombatSequence = useCallback((result: any) => {
    const attackStartDelay = flow.cardToFieldMs + flow.cardSettleMs;
    const impactDelayMs = attackStartDelay + flow.attackWindupMs + 90 + flow.attackTravelMs + 120;
    const replacementDelayMs =
      attackStartDelay + flow.attackWindupMs + 90 + flow.attackTravelMs + 120 + flow.impactPauseMs + flow.targetExitMs + 180 + flow.replacementGapMs;
    const combatResolveEndMs = replacementDelayMs + flow.targetEnterMs;
    const drawStartDelayMs = impactDelayMs + flow.impactPauseMs + flow.drawSettleMs;
    const drawTotalMs = (result.drawnCards.length > 0 ? flow.drawTravelMs : 0) + Math.max(0, result.drawnCards.length - 1) * flow.drawStaggerMs;
    const drawResolveEndMs = drawStartDelayMs + drawTotalMs;
    const finishDelayMs = Math.max(combatResolveEndMs, drawResolveEndMs) + flow.turnHandoffMs;

    const t1 = setTimeout(() => {
      queueCompletedTargetDeparture(result);
    }, attackStartDelay);

    if (result.drawnCards.length > 0) {
      queueHandDrawBatch(result.actorIndex, result.drawnCards, {
        initialDelayMs: drawStartDelayMs,
        staggerMs: flow.drawStaggerMs,
        durationMs: flow.drawTravelMs,
        originOverride: getPostPlayHandDrawOriginSnapshot(result.actorIndex),
      });
    }

    const t2 = setTimeout(() => {
      if (!result.damage) return;
      emitDamageAppliedEvent(
        gameRef.current.turn,
        result.actorIndex,
        result.actorIndex === PLAYER ? ENEMY : PLAYER,
        result.damage,
        result.damageSource,
        result.impactLife,
      );
      setGame((prev) => {
        const players = [...prev.players];
        const opponentIndex = result.actorIndex === PLAYER ? ENEMY : PLAYER;
        players[opponentIndex] = {
          ...players[opponentIndex],
          life: result.impactLife,
          flashDamage: result.damage,
        };
        return {
          ...prev,
          players,
        };
      });
    }, impactDelayMs);

    const t3 = setTimeout(() => {
      if (result.completedSlot == null) return;
      const playerIndex = result.actorIndex;
      const deck = playerIndex === PLAYER ? playerDeck : enemyDeck;
      const previousTargetName = gameRef.current.players[playerIndex].targets[result.completedSlot]?.name ?? "";
      const nextPlayer = replaceBattleRuntimeTargetInSlot(
        gameRef.current.players[playerIndex],
        result.completedSlot,
        deck,
      );
      const nextTarget = nextPlayer.targets[result.completedSlot];

      emitTargetReplacedEvent(gameRef.current.turn, result.actorIndex, result.completedSlot, previousTargetName, nextTarget?.name ?? "");

      setGame((prev) => {
        const players = [...prev.players];
        players[playerIndex] = nextPlayer;
        return { ...prev, players };
      });

      queueReplacementTargetArrival(result.actorIndex, result.completedSlot, nextTarget);
    }, replacementDelayMs);

    const t4 = setTimeout(() => {
      setGame((prev) => ({
        ...prev,
        combatLocked: false,
        players: prev.players.map((player) => ({ ...player, flashDamage: 0 })),
      }));

      if (result.winner !== null) {
        setGame((prev) => ({ ...prev, winner: result.winner }));
      } else {
        finalizeTurn();
      }
    }, finishDelayMs);

    actionTimersRef.current.push(t1, t2, t3, t4);
  }, [actionTimersRef, emitDamageAppliedEvent, emitTargetReplacedEvent, enemyDeck, finalizeTurn, flow, gameRef, getPostPlayHandDrawOriginSnapshot, playerDeck, queueCompletedTargetDeparture, queueHandDrawBatch, queueReplacementTargetArrival, setGame]);

  const resolvePlayInternal = useCallback(
    (handIndex: number, targetIndex: number) => resolveBattlePlayAction(gameRef.current, handIndex, targetIndex),
    [gameRef],
  );

  const emitResolvedPlayLogicalEvents = useCallback(
    ({
      side,
      targetIndex,
      result,
    }: {
      side: BattleRuntimeSide;
      targetIndex: number;
      result: any;
    }) => {
      createPlayResolutionEvents({
        turn: game.turn,
        side,
        playedCard: result.playedCard,
        targetSlot: targetIndex,
        targetName: game.players[side].targets[targetIndex]?.name ?? "",
        damage: result.damage,
        damageSource: result.damageSource,
        completedSlot: result.completedSlot,
        drawnCards: result.drawnCards,
      }).forEach(emitBattleEvent);
    },
    [emitBattleEvent, game.players, game.turn],
  );

  const applyResolvedMulliganFlow = useCallback(({
    side,
    removedStableCards,
    removedCardLayouts,
    remainingStableCount,
    drawnCards,
  }: {
    side: BattleRuntimeSide;
    removedStableCards: TVisualHandCard[];
    removedCardLayouts: Array<{ index: number; total: number }>;
    remainingStableCount: number;
    drawnCards: Syllable[];
  }) => {
    createMulliganResolutionEvents({
      turn: game.turn,
      side,
      returned: removedStableCards.map((card) => card.syllable),
      drawn: drawnCards,
    }).forEach(emitBattleEvent);

    const deckDestination =
      getMulliganHandReturnDestinationSnapshot(side, removedStableCards.length) ??
      snapshotZone(zoneIdForSide(side, "deck"));
    if (deckDestination) {
      removedStableCards.forEach((card, index) => {
        const layout = removedCardLayouts[index];
        if (!layout) return;
        appendOutgoingCard(side, {
          id: `outgoing-${card.id}-${index}`,
          side,
          card,
          destination: deckDestination,
          initialIndex: layout.index,
          initialTotal: layout.total,
          delayMs: index * flow.mulliganReturnStaggerMs,
          durationMs: flow.mulliganReturnMs,
        });
      });
    }

    commitPendingMulliganDrawCounts({
      ...pendingMulliganDrawCountsRef.current,
      [side]: pendingMulliganDrawCountsRef.current[side] + drawnCards.length,
    });
    const plannedDraws = drawnCards.map((syllable, index) => ({
      syllable,
      finalIndex: Math.min(handLayoutSlotCount - 1, remainingStableCount + index),
      finalTotal: Math.min(handLayoutSlotCount, remainingStableCount + drawnCards.length),
      originOverride: getMulliganHandDrawOriginSnapshot(side, drawnCards.length),
    }));
    pendingMulliganDrawQueuesRef.current = {
      ...pendingMulliganDrawQueuesRef.current,
      [side]: plannedDraws.slice(1),
    };
    if (plannedDraws.length > 0) {
      queueHandDrawBatch(side, [plannedDraws[0].syllable], {
        initialDelayMs: getMulliganDrawStartDelayMs(flow, removedStableCards.length),
        staggerMs: 0,
        durationMs: flow.drawTravelMs,
        finalTotalOverride: plannedDraws[0].finalTotal,
        finalIndexBase: plannedDraws[0].finalIndex,
        originOverride: plannedDraws[0].originOverride,
      });
    }

    const timeout = setTimeout(
      finalizeTurn,
      getMulliganFinishDelayMs(flow, removedStableCards.length, drawnCards.length),
    );
    actionTimersRef.current.push(timeout);
  }, [actionTimersRef, appendOutgoingCard, commitPendingMulliganDrawCounts, emitBattleEvent, finalizeTurn, flow, getMulliganHandDrawOriginSnapshot, getMulliganHandReturnDestinationSnapshot, handLayoutSlotCount, pendingMulliganDrawCountsRef, pendingMulliganDrawQueuesRef, queueHandDrawBatch, snapshotZone, zoneIdForSide, game.turn]);

  const executeBattleTurnAction = useCallback(({
    side,
    move,
    clearSelection,
    clearIncomingHand,
  }: {
    side: BattleRuntimeSide;
    move: BattleTurnAction;
    selectedCardOrigin?: any;
    clearSelection: boolean;
    clearIncomingHand?: boolean;
  }) => {
    if (move.type === "play") {
      const result = resolvePlayInternal(move.handIndex, move.targetIndex);
      if (!result) return;

      const stableBeforePlay = stableHandsRef.current[side];
      const simplePlayStep = prepareBattleSimplePlayStep({
        side,
        flow,
        result,
        handIndex: move.handIndex,
        targetIndex: move.targetIndex,
        targetName: game.players[side].targets[move.targetIndex]?.name ?? "",
        stableHandCountBeforePlay: stableBeforePlay.length,
        handLayoutSlotCount,
        fieldZoneId: zoneIdForSide(side, "field"),
        getHandPlayTargetDestinationSnapshot,
        getPostPlayHandDrawOriginSnapshot,
        snapshotZoneSlot,
      });
      const [playedStableCard] = removeStableCards(side, [move.handIndex]);
      lockTargetSlot(side, simplePlayStep.logicalEvent.targetIndex, true);
      setPendingTargetPlacement(side, simplePlayStep.logicalEvent.targetIndex, simplePlayStep.logicalEvent.result.playedCard);

      applyBattleSimplePlayRuntime({
        side,
        localPlayerIndex,
        targetIndex: simplePlayStep.logicalEvent.targetIndex,
        result: simplePlayStep.logicalEvent.result,
        clearSelection,
        flow,
        playedStableCard,
        playedCardLayout: simplePlayStep.statefulExecution.playedCardLayout,
        visualPlan: simplePlayStep.visualPlan,
        visualGeometry: simplePlayStep.liveGeometry.visualGeometry,
        fallbackHandPlayDestination: simplePlayStep.liveGeometry.fallbackHandPlayDestination,
        fallbackPostPlayDrawOrigin: simplePlayStep.liveGeometry.fallbackPostPlayDrawOrigin,
        appendOutgoingCard,
        queueHandDrawBatch,
        setGame,
        buildNextLog: (prevLog: any[]) =>
          buildPlayChronicleEntries(side, simplePlayStep.logicalEvent.result, simplePlayStep.logicalEvent.targetName).reduce(
            (acc, entry) => addLog(acc, entry),
            prevLog,
          ),
        emitResolvedPlayLogicalEvents,
        commitPlayedTargetProgress,
        scheduleActionTimer: (callback: () => void, delayMs: number) => {
          const timer = setTimeout(callback, delayMs);
          actionTimersRef.current.push(timer);
        },
        startCombatSequence,
        finalizeTurn,
      });
      return;
    }

    if (move.type === "mulligan") {
      const selectedIndexes = [...move.handIndexes].sort((a, b) => b - a);
      const stableBeforeRemoval = stableHandsRef.current[side];
      const removedCardLayouts = [...selectedIndexes]
        .sort((a, b) => a - b)
        .map((index) => ({
          index,
          total: stableBeforeRemoval.length,
        }));
      const resolution = resolveBattleMulliganAction(gameRef.current, side, selectedIndexes, CONFIG.handSize);
      const removedStableCards = removeStableCards(side, selectedIndexes);
      const remainingStableCount = stableHandsRef.current[side].length;
      const returnedCountForLog = removedStableCards.length;

      if (clearIncomingHand) {
        commitIncomingHands({
          ...incomingHandsRef.current,
          [side]: [],
        });
        commitOutgoingHands({
          ...outgoingHandsRef.current,
          [side]: [],
        });
        commitOutgoingTargets({
          ...outgoingTargetsRef.current,
          [side]: [],
        });
        commitPendingMulliganDrawCounts({
          ...pendingMulliganDrawCountsRef.current,
          [side]: 0,
        });
        pendingMulliganDrawQueuesRef.current = {
          ...pendingMulliganDrawQueuesRef.current,
          [side]: [],
        };
      }

      setGame((prev) => ({
        ...prev,
        players: resolution.nextPlayers as any,
        selectedHandIndexes: clearSelection ? [] : prev.selectedHandIndexes,
        selectedCardForPlay: clearSelection ? null : prev.selectedCardForPlay,
        actedThisTurn: true,
        currentMessage: null,
        log: addLog(prev.log, buildHandSwapChronicleEntry(side, returnedCountForLog)),
      }));

      applyResolvedMulliganFlow({
        side,
        removedStableCards,
        removedCardLayouts,
        remainingStableCount,
        drawnCards: resolution.drawnCards,
      });
      return;
    }

    finalizeTurn();
  }, [actionTimersRef, addLog, appendOutgoingCard, applyResolvedMulliganFlow, buildHandSwapChronicleEntry, buildPlayChronicleEntries, commitIncomingHands, commitOutgoingHands, commitOutgoingTargets, commitPendingMulliganDrawCounts, commitPlayedTargetProgress, emitResolvedPlayLogicalEvents, finalizeTurn, flow, game.players, gameRef, getHandPlayTargetDestinationSnapshot, getPostPlayHandDrawOriginSnapshot, handLayoutSlotCount, incomingHandsRef, localPlayerIndex, lockTargetSlot, outgoingHandsRef, outgoingTargetsRef, pendingMulliganDrawCountsRef, pendingMulliganDrawQueuesRef, queueHandDrawBatch, removeStableCards, resolvePlayInternal, setGame, setPendingTargetPlacement, snapshotZoneSlot, stableHandsRef, startCombatSequence, zoneIdForSide]);

  return {
    handleOutgoingTargetComplete,
    commitIncomingTargetToField,
    executeBattleTurnAction,
  };
};
