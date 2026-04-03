import { CONFIG, isHandStuck } from "../../logic/gameLogic";
import { normalizePlayerName, BattleTurnAction } from "../../types/game";
import { BoardZoneId } from "../game/GameComponents";
import { BattleHandLaneDebugSnapshot } from "./BattleHandLane";
import {
  BattleRuntimeSide,
  BattleRuntimeState,
} from "./BattleRuntimeState";
import { BattleSceneModel, createBattleSceneBoardModel } from "./BattleSceneViewModel";
import { BattleVisualQueueState } from "./BattleVisualQueue";
import { buildBattleFieldLaneSlotsFromTargetField } from "./battleTargetMotionPlan";

export interface BattleSceneRuntimeAdapterParams {
  runtime: BattleRuntimeState;
  visualQueue: BattleVisualQueueState;
  localPlayerIndex: BattleRuntimeSide;
  remotePlayerIndex: BattleRuntimeSide;
  localPlayerName?: string;
  remotePlayerName?: string;
  localPlayerAvatar?: string;
  remotePlayerAvatar?: string;
  bindZoneRef: (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => void;
  onPlayTarget: (targetIndex: number) => void;
  onMulligan: () => void;
  onHoverPlayerHandCard: (index: number | null) => void;
  onSelectPlayerHandCard: (index: number) => void;
  bindHandCardRef: (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => void;
  onCommitIncomingHandCard: (incomingCard: BattleSceneModel["hands"]["bottom"]["incomingCards"][number]) => void;
  onCompleteOutgoingHandCard: (outgoingCard: BattleSceneModel["hands"]["bottom"]["outgoingCards"][number]) => void;
  onCommitIncomingTarget: (incomingTarget: NonNullable<BattleSceneModel["board"]["playerFieldSlots"][number]["incomingTarget"]>) => void;
  onCompleteOutgoingTarget: (outgoingTarget: NonNullable<BattleSceneModel["board"]["playerFieldSlots"][number]["outgoingTarget"]>) => void;
  onHandDebugSnapshot: (key: string, snapshot: BattleHandLaneDebugSnapshot) => void;
}

export const buildBattleSceneModelFromRuntime = ({
  runtime,
  visualQueue,
  localPlayerIndex,
  remotePlayerIndex,
  localPlayerName,
  remotePlayerName,
  localPlayerAvatar,
  remotePlayerAvatar,
  bindZoneRef,
  onPlayTarget,
  onMulligan,
  onHoverPlayerHandCard,
  onSelectPlayerHandCard,
  bindHandCardRef,
  onCommitIncomingHandCard,
  onCompleteOutgoingHandCard,
  onCommitIncomingTarget,
  onCompleteOutgoingTarget,
  onHandDebugSnapshot,
}: BattleSceneRuntimeAdapterParams): {
  sceneModel: BattleSceneModel;
  enemyFieldHasOutgoingTarget: boolean;
  playerFieldHasOutgoingTarget: boolean;
} => {
  const { game, introPhase, turnPresentationLocked, turnRemainingMs, hoveredCardIndex } = runtime;
  const introActive = introPhase !== "done";
  const me = game.players[localPlayerIndex];
  const enemy = game.players[remotePlayerIndex];
  const selectedCard = game.selectedCardForPlay !== null ? me.hand[game.selectedCardForPlay] : null;
  const canSwap =
    !introActive &&
    game.turn === localPlayerIndex &&
    !turnPresentationLocked &&
    !game.combatLocked &&
    !game.actedThisTurn &&
    isHandStuck(me) &&
    !me.mulliganUsedThisRound;
  const displayTurnRemainingMs = introActive
    ? 60000
    : Math.min(60000, turnPresentationLocked ? 60000 : turnRemainingMs);
  const turnSecondsRemaining = Math.max(0, Math.ceil(displayTurnRemainingMs / 1000) - 1);
  const turnClock = introActive ? "--" : String(turnSecondsRemaining).padStart(2, "0");
  const turnClockUrgent = !introActive && game.winner === null && displayTurnRemainingMs <= 15000;
  const desktopTurnLabel = introActive ? "Inicio do Duelo" : game.turn === localPlayerIndex ? "Seu Turno" : "Turno do Oponente";
  const mulliganSelectionInvalid =
    game.selectedHandIndexes.length === 0 || game.selectedHandIndexes.length > CONFIG.maxMulligan;
  const mulliganDisabled = !canSwap || mulliganSelectionInvalid;
  const getReservedHandSlots = (side: BattleRuntimeSide) => {
    const mulliganReserved = Math.max(
      0,
      visualQueue.pendingMulliganDrawCounts[side] -
        visualQueue.incomingHands[side].length,
    );
    return Math.max(mulliganReserved, visualQueue.scheduledHandDrawCounts[side]);
  };
  const getPendingCardMotion = (slotIndex: number) => {
    const outgoingCard = visualQueue.outgoingHands[localPlayerIndex].find(
      (card) =>
        card.destinationMode === "zone-center" &&
        card.targetSlotIndex === slotIndex,
    );
    return outgoingCard
      ? { delayMs: outgoingCard.pendingCardRevealDelayMs ?? outgoingCard.durationMs }
      : null;
  };

  const enemyFieldSlots = buildBattleFieldLaneSlotsFromTargetField({
    fieldSlots: runtime.targetField.enemySlots,
    bindSlotRef: (slotIndex) => bindZoneRef("enemyField", `slot-${slotIndex}`),
    getSlotRect: () => null,
    getSelectedCard: () => null,
    getCanClick: () => false,
    onClick: () => {},
    onIncomingTargetComplete: onCommitIncomingTarget,
    onOutgoingTargetComplete: onCompleteOutgoingTarget,
  });

  const playerFieldSlots = buildBattleFieldLaneSlotsFromTargetField({
    fieldSlots: runtime.targetField.playerSlots,
    bindSlotRef: (slotIndex) => bindZoneRef("playerField", `slot-${slotIndex}`),
    getSlotRect: () => null,
    getSelectedCard: () => selectedCard,
    getPendingCard: (slotIndex) =>
      visualQueue.pendingTargetPlacements[localPlayerIndex][slotIndex] ?? null,
    getPendingCardMotion,
    getCanClick: (slotIndex, displayedTarget, incomingTarget) =>
      Boolean(
        displayedTarget &&
          !incomingTarget &&
          !visualQueue.lockedTargetSlots[localPlayerIndex][slotIndex] &&
          !introActive &&
          game.turn === localPlayerIndex &&
          !game.combatLocked &&
          !game.actedThisTurn &&
          game.selectedCardForPlay !== null,
      ),
    onClick: onPlayTarget,
    onIncomingTargetComplete: onCommitIncomingTarget,
    onOutgoingTargetComplete: onCompleteOutgoingTarget,
    getPlayerHand: () => me.hand,
  });

  return {
    sceneModel: {
      board: createBattleSceneBoardModel({
        enemyFieldSlots,
        playerFieldSlots,
        enemyFieldObjects: runtime.targetField.enemySlots,
        playerFieldObjects: runtime.targetField.playerSlots,
        currentMessage: game.currentMessage,
        enemyPortrait: {
          label: normalizePlayerName(remotePlayerName, "OPONENTE"),
          avatar: remotePlayerAvatar,
          isLocal: false,
          life: enemy.life,
          active: game.turn === remotePlayerIndex,
          flashDamage: enemy.flashDamage,
        },
        playerPortrait: {
          label: normalizePlayerName(localPlayerName, "VOCE"),
          avatar: localPlayerAvatar,
          isLocal: true,
          life: me.life,
          active: game.turn === localPlayerIndex,
          flashDamage: me.flashDamage,
        },
      }),
      hands: {
        top: {
          side: remotePlayerIndex,
          presentation: "remote",
          stableCards: runtime.stableHands[remotePlayerIndex],
          incomingCards: visualQueue.incomingHands[remotePlayerIndex],
          outgoingCards: visualQueue.outgoingHands[remotePlayerIndex],
          reservedSlots: getReservedHandSlots(remotePlayerIndex),
          onIncomingCardComplete: onCommitIncomingHandCard,
          onOutgoingCardComplete: onCompleteOutgoingHandCard,
          onDebugSnapshotByScale: {
            desktop: (snapshot) => onHandDebugSnapshot("enemy-desktop", snapshot),
            mobile: (snapshot) => onHandDebugSnapshot("enemy-mobile", snapshot),
          },
        },
        bottom: {
          side: localPlayerIndex,
          presentation: "local",
          stableCards: runtime.stableHands[localPlayerIndex],
          incomingCards: visualQueue.incomingHands[localPlayerIndex],
          outgoingCards: visualQueue.outgoingHands[localPlayerIndex],
          reservedSlots: getReservedHandSlots(localPlayerIndex),
          hoveredCardIndex,
          onHoverCard: onHoverPlayerHandCard,
          selectedIndexes: game.selectedHandIndexes,
          canInteract:
            !introActive &&
            !turnPresentationLocked &&
            game.turn === localPlayerIndex &&
            !game.combatLocked &&
            !game.actedThisTurn,
          showTurnHighlights: !introActive && game.turn === localPlayerIndex,
          showPlayableHints:
            !introActive &&
            !turnPresentationLocked &&
            game.turn === localPlayerIndex &&
            !game.combatLocked &&
            !game.actedThisTurn,
          targets: me.targets,
          onCardClick: onSelectPlayerHandCard,
          freshCardIds: visualQueue.freshCardIds,
          bindCardRef: bindHandCardRef,
          onIncomingCardComplete: onCommitIncomingHandCard,
          onOutgoingCardComplete: onCompleteOutgoingHandCard,
          onDebugSnapshotByScale: {
            desktop: (snapshot) => onHandDebugSnapshot("player-desktop", snapshot),
            mobile: (snapshot) => onHandDebugSnapshot("player-mobile", snapshot),
          },
        },
      },
      leftSidebar: {
        decks: {
          targetDeckCount: enemy.targetDeck.length,
          deckCount: enemy.syllableDeck.length,
        },
        chronicles: game.log,
      },
      rightSidebar: {
        hud: {
          title: "Controle",
          turnLabel: desktopTurnLabel,
          clock: turnClock,
          clockUrgent: turnClockUrgent,
        },
        decks: {
          targetDeckCount: me.targetDeck.length,
          deckCount: me.syllableDeck.length,
        },
        action: {
          title: "Trocar",
          subtitle: "Ate 3 cartas",
          disabled: mulliganDisabled,
          onClick: onMulligan,
        },
      },
    },
    enemyFieldHasOutgoingTarget: runtime.targetField.enemySlots.some((slot) =>
      slot.sceneNodes.some((node) => node.motion?.kind === "outgoing"),
    ),
    playerFieldHasOutgoingTarget: runtime.targetField.playerSlots.some((slot) =>
      slot.sceneNodes.some((node) => node.motion?.kind === "outgoing"),
    ),
  };
};
