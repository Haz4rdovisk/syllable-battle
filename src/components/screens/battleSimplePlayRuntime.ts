import type { ChronicleEntry, GameState, Syllable } from "../../types/game";
import type { ZoneAnchorSnapshot } from "../game/GameComponents";
import type { BattleHandLaneCard, BattleHandLaneOutgoingCard } from "./BattleHandLane";
import type { BattleFlowTimings } from "./battleFlow";
import type { BattleRuntimeCardRef } from "./BattleRuntimeSetup";
import {
  getPlayDrawStartDelayMs,
  getPlayFinishDelayMs,
  getPlayedCardCommitDelayMs,
} from "./battleFlow";
import type { ResolvedBattlePlayAction } from "./battleResolution";
import type { BattleSimplePlayVisualPlan } from "./battleVisualPlan";
import type { BattleSimplePlayRuntimeGeometry } from "./battleSimplePlayGeometry";

interface QueueHandDrawBatchArgs {
  initialDelayMs: number;
  staggerMs: number;
  durationMs: number;
  finalTotalOverride?: number;
  finalIndexBase?: number;
  originOverride: ZoneAnchorSnapshot | null;
  cardRefs?: BattleRuntimeCardRef[];
}

export interface ApplyBattleSimplePlayRuntimeArgs {
  side: 0 | 1;
  localPlayerIndex: 0 | 1;
  targetIndex: number;
  clearSelection: boolean;
  flow: BattleFlowTimings;
  result: ResolvedBattlePlayAction;
  drawnCardRefs?: BattleRuntimeCardRef[];
  playedStableCard: BattleHandLaneCard | null;
  playedCardLayout: {
    index: number;
    total: number;
  };
  visualPlan: BattleSimplePlayVisualPlan | null;
  visualGeometry: BattleSimplePlayRuntimeGeometry | null;
  fallbackHandPlayDestination: ZoneAnchorSnapshot | null;
  fallbackPostPlayDrawOrigin: ZoneAnchorSnapshot | null;
  appendOutgoingCard: (side: 0 | 1, outgoingCard: BattleHandLaneOutgoingCard) => void;
  queueHandDrawBatch: (
    side: 0 | 1,
    cards: Syllable[],
    args: QueueHandDrawBatchArgs,
  ) => void;
  setGame: (updater: (prev: GameState) => GameState) => void;
  buildNextLog: (prevLog: ChronicleEntry[]) => ChronicleEntry[];
  emitResolvedPlayLogicalEvents: (args: {
    side: 0 | 1;
    targetIndex: number;
    result: ResolvedBattlePlayAction;
  }) => void;
  commitPlayedTargetProgress: (side: 0 | 1, targetIndex: number) => void;
  scheduleActionTimer: (callback: () => void, delayMs: number) => void;
  startCombatSequence: (result: ResolvedBattlePlayAction) => void;
  finalizeTurn: () => void;
}

export const applyBattleSimplePlayRuntime = ({
  side,
  localPlayerIndex,
  targetIndex,
  clearSelection,
  flow,
  result,
  drawnCardRefs,
  playedStableCard,
  playedCardLayout,
  visualPlan,
  visualGeometry,
  fallbackHandPlayDestination,
  fallbackPostPlayDrawOrigin,
  appendOutgoingCard,
  queueHandDrawBatch,
  setGame,
  buildNextLog,
  emitResolvedPlayLogicalEvents,
  commitPlayedTargetProgress,
  scheduleActionTimer,
  startCombatSequence,
  finalizeTurn,
}: ApplyBattleSimplePlayRuntimeArgs) => {
  if (visualPlan && visualGeometry && playedStableCard && visualGeometry.handPlayDestination) {
    appendOutgoingCard(side, {
      id: `play-${playedStableCard.runtimeCardId ?? playedStableCard.id}-${visualPlan.targetIndex}`,
      side,
      card: playedStableCard,
      destination: visualGeometry.handPlayDestination,
      initialIndex: visualPlan.handExit.handIndex,
      initialTotal: visualPlan.handExit.handCountBefore,
      delayMs: visualPlan.handExit.atMs,
      durationMs: flow.cardToFieldMs,
      destinationMode: "zone-center",
      endRotate: side === localPlayerIndex ? 8 : -8,
      endScale: 1,
      targetSlotIndex: visualPlan.targetIndex,
      pendingCardRevealDelayMs: flow.cardToFieldMs,
    });
  } else if (playedStableCard && fallbackHandPlayDestination) {
    appendOutgoingCard(side, {
      id: `play-${playedStableCard.runtimeCardId ?? playedStableCard.id}-${targetIndex}`,
      side,
      card: playedStableCard,
      destination: fallbackHandPlayDestination,
      initialIndex: playedCardLayout.index,
      initialTotal: playedCardLayout.total,
      delayMs: 0,
      durationMs: flow.cardToFieldMs,
      destinationMode: "zone-center",
      endRotate: side === localPlayerIndex ? 8 : -8,
      endScale: 1,
      targetSlotIndex: targetIndex,
      pendingCardRevealDelayMs: flow.cardToFieldMs,
    });
  }

  if (visualPlan?.postPlayDraw) {
    const drawArgs: QueueHandDrawBatchArgs = {
      initialDelayMs: visualPlan.postPlayDraw.atMs,
      staggerMs: visualPlan.postPlayDraw.staggerMs,
      durationMs: visualPlan.postPlayDraw.durationMs,
      finalTotalOverride: visualPlan.postPlayDraw.finalTotal,
      finalIndexBase: visualPlan.postPlayDraw.finalIndexBase,
      originOverride: visualGeometry?.postPlayDrawOrigin ?? fallbackPostPlayDrawOrigin,
    };
    if (drawnCardRefs) drawArgs.cardRefs = drawnCardRefs;
    queueHandDrawBatch(side, visualPlan.postPlayDraw.cards, drawArgs);
  } else if (result.damage === 0) {
    const drawArgs: QueueHandDrawBatchArgs = {
      initialDelayMs: getPlayDrawStartDelayMs(flow),
      staggerMs: flow.drawStaggerMs,
      durationMs: flow.drawTravelMs,
      originOverride: fallbackPostPlayDrawOrigin,
    };
    if (drawnCardRefs) drawArgs.cardRefs = drawnCardRefs;
    queueHandDrawBatch(side, result.drawnCards, drawArgs);
  }

  setGame((prev) => ({
    ...prev,
    players: result.nextPlayers as any,
    winner: result.winner,
    actedThisTurn: true,
    combatLocked: result.damage > 0,
    selectedHandIndexes: clearSelection ? [] : prev.selectedHandIndexes,
    selectedCardForPlay: clearSelection ? null : prev.selectedCardForPlay,
    currentMessage: null,
    log: buildNextLog(prev.log),
  }));

  emitResolvedPlayLogicalEvents({
    side,
    targetIndex,
    result,
  });

  scheduleActionTimer(
    () =>
      commitPlayedTargetProgress(
        side,
        visualPlan?.targetProgressCommit.targetIndex ?? targetIndex,
      ),
    visualPlan?.targetProgressCommit.atMs ?? getPlayedCardCommitDelayMs(flow),
  );

  if (result.damage > 0) {
    startCombatSequence(result);
    return;
  }

  scheduleActionTimer(
    finalizeTurn,
    visualPlan?.finish.atMs ?? getPlayFinishDelayMs(flow),
  );
};
