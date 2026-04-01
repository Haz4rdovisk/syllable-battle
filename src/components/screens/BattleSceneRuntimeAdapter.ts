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

  const enemyFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = runtime.stableTargets[remotePlayerIndex][idx];
    const incomingTarget = visualQueue.incomingTargets[remotePlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const outgoingTarget = visualQueue.outgoingTargets[remotePlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = outgoingTarget?.entity ?? incomingTarget?.entity ?? visualTarget;

    return {
      key: displayedTarget?.id ?? `enemy-slot-${idx}`,
      slotRef: bindZoneRef("enemyField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: null,
      selectedCard: null,
      canClick: false,
      onClick: () => {},
      onIncomingTargetComplete: onCommitIncomingTarget,
      onOutgoingTargetComplete: onCompleteOutgoingTarget,
      playerHand: [],
    };
  });

  const playerFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = runtime.stableTargets[localPlayerIndex][idx];
    const incomingTarget = visualQueue.incomingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const outgoingTarget = visualQueue.outgoingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = outgoingTarget?.entity ?? incomingTarget?.entity ?? visualTarget;

    return {
      key: displayedTarget?.id ?? `player-slot-${idx}`,
      slotRef: bindZoneRef("playerField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: null,
      selectedCard,
      pendingCard: visualQueue.pendingTargetPlacements[localPlayerIndex][idx],
      canClick: Boolean(
        displayedTarget &&
          !incomingTarget &&
          !visualQueue.lockedTargetSlots[localPlayerIndex][idx] &&
          !introActive &&
          game.turn === localPlayerIndex &&
          !game.combatLocked &&
          !game.actedThisTurn &&
          game.selectedCardForPlay !== null,
      ),
      onClick: () => onPlayTarget(idx),
      onIncomingTargetComplete: onCommitIncomingTarget,
      onOutgoingTargetComplete: onCompleteOutgoingTarget,
      playerHand: me.hand,
    };
  });

  return {
    sceneModel: {
      board: createBattleSceneBoardModel({
        enemyFieldSlots,
        playerFieldSlots,
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
          reservedSlots: Math.max(
            0,
            visualQueue.pendingMulliganDrawCounts[remotePlayerIndex] -
              visualQueue.incomingHands[remotePlayerIndex].length,
          ),
          pulse: visualQueue.enemyHandPulse,
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
          reservedSlots: Math.max(
            0,
            visualQueue.pendingMulliganDrawCounts[localPlayerIndex] -
              visualQueue.incomingHands[localPlayerIndex].length,
          ),
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
    enemyFieldHasOutgoingTarget: visualQueue.outgoingTargets[remotePlayerIndex].length > 0,
    playerFieldHasOutgoingTarget: visualQueue.outgoingTargets[localPlayerIndex].length > 0,
  };
};
