import { useCallback } from "react";
import { CONFIG } from "../../logic/gameLogic";
import type { BattleDeckSpec } from "../../data/content";
import { BattleTurnAction, GameState, Syllable } from "../../types/game";
import { BattleFieldOutgoingTarget } from "./BattleFieldLane";
import { BattleHandLaneOutgoingCard } from "./BattleHandLane";
import { createMulliganResolutionEvents, createPlayResolutionEvents } from "./battleEvents";
import { applyBattleSimplePlayRuntime } from "./battleSimplePlayRuntime";
import { prepareBattleSimplePlayStep } from "./battleSimplePlayStep";
import { resolveBattleMulliganAction, resolveBattlePlayAction } from "./battleResolution";
import type { BattleActionOriginSnapshot, BattleSelectedHandCardOrigin } from "./BattleRuntimeState";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";
import type { PendingMulliganDraw } from "./BattleRuntimeState";
import {
  type BattleRuntimeDeckCatalog,
  type BattleRuntimeCardRef,
  replaceBattleRuntimeTargetInSlot,
  resolveBattleRuntimeDrawnHandCardRefs,
} from "./BattleRuntimeSetup";
import {
  createBattleCombatSchedule,
  createBattleMulliganSchedule,
  getBattleCombatTargetMotionDurations,
} from "./battleCompositeSchedule";

interface UseBattleCombatFlowParams<TVisualHandCard, TVisualTarget> {
  flow: any;
  localPlayerIndex: BattleRuntimeSide;
  playerDeckSpec: BattleDeckSpec;
  enemyDeckSpec: BattleDeckSpec;
  playerDeckCatalog: BattleRuntimeDeckCatalog;
  enemyDeckCatalog: BattleRuntimeDeckCatalog;
  handLayoutSlotCount: number;
  game: GameState;
  gameRef: React.MutableRefObject<GameState>;
  stableHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, TVisualHandCard[]>>;
  stableTargetsRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<TVisualTarget | null>>>;
  pendingMulliganDrawCountsRef: React.MutableRefObject<Record<BattleRuntimeSide, number>>;
  pendingMulliganDrawQueuesRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<{
    syllable: Syllable;
    cardRef: BattleRuntimeCardRef;
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
    runtimeCardId?: string;
    side: BattleRuntimeSide;
    hidden: boolean;
    skipEntryAnimation?: boolean;
  },
  TVisualTarget,
>({
  flow,
  localPlayerIndex,
  playerDeckSpec,
  enemyDeckSpec,
  playerDeckCatalog,
  enemyDeckCatalog,
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

      const targetMotion = getBattleCombatTargetMotionDurations(flow);

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
        windupMs: targetMotion.windupMs,
        attackMs: targetMotion.attackMs,
        pauseMs: targetMotion.pauseMs,
        exitMs: targetMotion.exitMs,
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
    const schedule = createBattleCombatSchedule({
      flow,
      drawnCardCount: result.drawnCards.length,
    });

    const t1 = setTimeout(() => {
      queueCompletedTargetDeparture(result);
    }, schedule.attackStart.atMs);

    if (result.drawnCards.length > 0) {
      queueHandDrawBatch(result.actorIndex, result.drawnCards, {
        initialDelayMs: schedule.draw.atMs,
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
    }, schedule.impact.atMs);

    const t3 = setTimeout(() => {
      if (result.completedSlot == null) return;
      const playerIndex = result.actorIndex;
      const deck = playerIndex === PLAYER ? playerDeckSpec : enemyDeckSpec;
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
    }, schedule.replacement.atMs);

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
    }, schedule.finish.atMs);

    actionTimersRef.current.push(t1, t2, t3, t4);
  }, [actionTimersRef, emitDamageAppliedEvent, emitTargetReplacedEvent, enemyDeckSpec, finalizeTurn, flow, gameRef, getPostPlayHandDrawOriginSnapshot, playerDeckSpec, queueCompletedTargetDeparture, queueHandDrawBatch, queueReplacementTargetArrival, setGame]);

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
    removedCardOrigins,
    remainingStableCount,
    drawnCards,
    drawnCardRefs,
  }: {
    side: BattleRuntimeSide;
    removedStableCards: TVisualHandCard[];
    removedCardLayouts: Array<{ index: number; total: number }>;
    removedCardOrigins: Array<BattleSelectedHandCardOrigin | undefined>;
    remainingStableCount: number;
    drawnCards: Syllable[];
    drawnCardRefs: BattleRuntimeCardRef[];
  }) => {
    createMulliganResolutionEvents({
      turn: game.turn,
      side,
      returned: removedStableCards.map((card) => card.syllable),
      drawn: drawnCards,
    }).forEach(emitBattleEvent);

    const schedule = createBattleMulliganSchedule({
      flow,
      returnedCount: removedStableCards.length,
      drawnCount: drawnCards.length,
    });

    const deckDestination =
      getMulliganHandReturnDestinationSnapshot(side, removedStableCards.length) ??
      snapshotZone(zoneIdForSide(side, "deck"));
    if (deckDestination) {
      removedStableCards.forEach((card, index) => {
        const layout = removedCardLayouts[index];
        if (!layout) return;
        appendOutgoingCard(side, {
          id: `outgoing-${card.runtimeCardId ?? card.id}-${index}`,
          side,
          card,
          initialSnapshot: removedCardOrigins[index]?.snapshot ?? null,
          destination: deckDestination,
          initialIndex: layout.index,
          initialTotal: layout.total,
          delayMs: index * schedule.return.staggerMs,
          durationMs: flow.mulliganReturnMs,
        });
      });
    }

    commitPendingMulliganDrawCounts({
      ...pendingMulliganDrawCountsRef.current,
      [side]: pendingMulliganDrawCountsRef.current[side] + drawnCards.length,
    });
    const mulliganDrawOrigin = getMulliganHandDrawOriginSnapshot(side, drawnCards.length);
    const plannedDraws: PendingMulliganDraw[] = drawnCards.map((syllable, index) => ({
      syllable,
      cardRef: drawnCardRefs[index]!,
      finalIndex: Math.min(handLayoutSlotCount - 1, remainingStableCount + index),
      finalTotal: Math.min(handLayoutSlotCount, remainingStableCount + drawnCards.length),
      originOverride: mulliganDrawOrigin,
    }));
    pendingMulliganDrawQueuesRef.current = {
      ...pendingMulliganDrawQueuesRef.current,
      [side]: plannedDraws.slice(1),
    };
    if (plannedDraws.length > 0) {
      queueHandDrawBatch(side, [plannedDraws[0].syllable], {
        initialDelayMs: schedule.draw.atMs,
        staggerMs: 0,
        durationMs: flow.drawTravelMs,
        finalTotalOverride: plannedDraws[0].finalTotal,
        finalIndexBase: plannedDraws[0].finalIndex,
        originOverride: plannedDraws[0].originOverride,
        cardRefs: [plannedDraws[0].cardRef],
      });
    }

    const timeout = setTimeout(
      finalizeTurn,
      schedule.finish.atMs,
    );
    actionTimersRef.current.push(timeout);
  }, [actionTimersRef, appendOutgoingCard, commitPendingMulliganDrawCounts, emitBattleEvent, finalizeTurn, flow, getMulliganHandDrawOriginSnapshot, getMulliganHandReturnDestinationSnapshot, handLayoutSlotCount, pendingMulliganDrawCountsRef, pendingMulliganDrawQueuesRef, queueHandDrawBatch, snapshotZone, zoneIdForSide, game.turn]);

  const executeBattleTurnAction = useCallback(({
    side,
    move,
    selectedCardOrigin,
    clearSelection,
    clearIncomingHand,
  }: {
    side: BattleRuntimeSide;
    move: BattleTurnAction;
    selectedCardOrigin?: BattleActionOriginSnapshot | null;
    clearSelection: boolean;
    clearIncomingHand?: boolean;
  }) => {
    if (move.type === "play") {
      const result = resolvePlayInternal(move.handIndex, move.targetIndex);
      if (!result) return;
      const drawnCardRefs = resolveBattleRuntimeDrawnHandCardRefs(
        result.nextPlayers[result.actorIndex],
        side === PLAYER ? playerDeckCatalog : enemyDeckCatalog,
        result.drawnCards.length,
      );

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
        selectedCardOrigin: selectedCardOrigin?.playCardOrigin ?? null,
        result: simplePlayStep.logicalEvent.result,
        drawnCardRefs,
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
      const drawnCardRefs = resolveBattleRuntimeDrawnHandCardRefs(
        resolution.nextPlayers[side],
        side === PLAYER ? playerDeckCatalog : enemyDeckCatalog,
        resolution.drawnCards.length,
      );
      const mulliganCardOriginsByIndex = new Map(
        (selectedCardOrigin?.mulliganCardOrigins ?? []).map((origin) => [origin.handIndex, origin] as const),
      );
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
        removedCardOrigins: removedCardLayouts.map((layout) => mulliganCardOriginsByIndex.get(layout.index)),
        remainingStableCount,
        drawnCards: resolution.drawnCards,
        drawnCardRefs,
      });
      return;
    }

    finalizeTurn();
  }, [actionTimersRef, addLog, appendOutgoingCard, applyResolvedMulliganFlow, buildHandSwapChronicleEntry, buildPlayChronicleEntries, commitIncomingHands, commitOutgoingHands, commitOutgoingTargets, commitPendingMulliganDrawCounts, commitPlayedTargetProgress, emitResolvedPlayLogicalEvents, enemyDeckCatalog, finalizeTurn, flow, game.players, gameRef, getHandPlayTargetDestinationSnapshot, getPostPlayHandDrawOriginSnapshot, handLayoutSlotCount, incomingHandsRef, localPlayerIndex, lockTargetSlot, outgoingHandsRef, outgoingTargetsRef, pendingMulliganDrawCountsRef, pendingMulliganDrawQueuesRef, playerDeckCatalog, queueHandDrawBatch, removeStableCards, resolvePlayInternal, setGame, setPendingTargetPlacement, snapshotZoneSlot, stableHandsRef, startCombatSequence, zoneIdForSide]);

  return {
    handleOutgoingTargetComplete,
    commitIncomingTargetToField,
    executeBattleTurnAction,
  };
};
