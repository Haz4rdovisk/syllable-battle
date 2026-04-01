import { useCallback, useEffect } from "react";
import { CONFIG, TIMINGS } from "../../logic/gameLogic";
import { BattleSubmittedAction, BattleTurnAction, GameMode, Syllable } from "../../types/game";
import { resolveBotTurnAction } from "./battleFlow";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";

interface UseBattleRoomBridgeParams<TVisualHandCard> {
  mode: GameMode;
  localSide: "player" | "enemy";
  roomTransportKind?: "mock" | "broadcast" | "remote";
  enableMockRoomBot?: boolean;
  localPlayerIndex: BattleRuntimeSide;
  remotePlayerIndex: BattleRuntimeSide;
  introPhase: string;
  game: any;
  gameRef: React.MutableRefObject<any>;
  onActionRequested?: (action: BattleSubmittedAction) => void;
  pendingExternalAction?: BattleSubmittedAction | null;
  onExternalActionConsumed?: (actionId: string) => void;
  processedExternalActionIdsRef: React.MutableRefObject<Set<string>>;
  actionSequenceRef: React.MutableRefObject<Record<BattleRuntimeSide, number>>;
  battleActionIdRef: React.MutableRefObject<number>;
  stableHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, TVisualHandCard[]>>;
  setMulliganDebug: React.Dispatch<React.SetStateAction<{
    source: string;
    requestedIndexes: number[];
    requestedSyllables: string[];
    removedStableCards: string[];
    drawnCards: string[];
    externalActionId: string | null;
    clearIncomingHand: boolean;
  }>>;
  snapshotActionOrigin: (side: BattleRuntimeSide, action: BattleTurnAction) => any;
  executeBattleTurnAction: (params: {
    side: BattleRuntimeSide;
    move: BattleTurnAction;
    selectedCardOrigin?: any;
    clearSelection: boolean;
    clearIncomingHand?: boolean;
  }) => void;
}

export const useBattleRoomBridge = <TVisualHandCard,>({
  mode,
  localSide,
  roomTransportKind,
  enableMockRoomBot = false,
  localPlayerIndex,
  remotePlayerIndex,
  introPhase,
  game,
  gameRef,
  onActionRequested,
  pendingExternalAction,
  onExternalActionConsumed,
  processedExternalActionIdsRef,
  actionSequenceRef,
  battleActionIdRef,
  stableHandsRef,
  setMulliganDebug,
  snapshotActionOrigin,
  executeBattleTurnAction,
}: UseBattleRoomBridgeParams<TVisualHandCard>) => {
  const requestBattleAction = useCallback(
    (side: BattleRuntimeSide, action: BattleTurnAction) => {
      if (mode !== "multiplayer" || !onActionRequested) return false;

      const sequence = actionSequenceRef.current[side];
      actionSequenceRef.current[side] += 1;
      const id = `battle-action-${side === PLAYER ? "player" : "enemy"}-${gameRef.current.setupVersion}-${battleActionIdRef.current++}`;
      onActionRequested({
        id,
        setupVersion: gameRef.current.setupVersion,
        sequence,
        turn: gameRef.current.turn,
        side: side === PLAYER ? "player" : "enemy",
        action,
      });
      if (roomTransportKind === "remote" && side === localPlayerIndex) {
        processedExternalActionIdsRef.current.add(id);
      }
      return true;
    },
    [actionSequenceRef, battleActionIdRef, gameRef, localPlayerIndex, mode, onActionRequested, processedExternalActionIdsRef, roomTransportKind],
  );

  const shouldExecuteLocallyAfterRequest = useCallback(
    (side: BattleRuntimeSide) => {
      if (mode !== "multiplayer" || !onActionRequested) return false;
      if (roomTransportKind !== "remote") return false;
      return side === localPlayerIndex;
    },
    [localPlayerIndex, mode, onActionRequested, roomTransportKind],
  );

  const dispatchBattleAction = useCallback(
    ({
      side,
      move,
      clearSelection,
      clearIncomingHand,
    }: {
      side: BattleRuntimeSide;
      move: BattleTurnAction;
      clearSelection: boolean;
      clearIncomingHand?: boolean;
    }) => {
      const requested = requestBattleAction(side, move);
      if (requested && !shouldExecuteLocallyAfterRequest(side)) return;

      executeBattleTurnAction({
        side,
        move,
        selectedCardOrigin: snapshotActionOrigin(side, move),
        clearSelection,
        clearIncomingHand,
      });
    },
    [executeBattleTurnAction, requestBattleAction, shouldExecuteLocallyAfterRequest, snapshotActionOrigin],
  );

  useEffect(() => {
    const shouldRunEnemyAuto = mode === "bot" || (mode === "multiplayer" && enableMockRoomBot);
    if (introPhase !== "done" || game.turn !== remotePlayerIndex || game.winner !== null || game.combatLocked || !shouldRunEnemyAuto) return;

    const botAction = setTimeout(() => {
      const move = resolveBotTurnAction({
        actedThisTurn: gameRef.current.actedThisTurn,
        hand: gameRef.current.players[remotePlayerIndex].hand,
        targets: gameRef.current.players[remotePlayerIndex].targets,
        mulliganUsedThisRound: gameRef.current.players[remotePlayerIndex].mulliganUsedThisRound,
        maxMulligan: CONFIG.maxMulligan,
      });
      if (move) {
        dispatchBattleAction({
          side: remotePlayerIndex,
          move,
          clearSelection: false,
          clearIncomingHand: false,
        });
      }
    }, TIMINGS.botThinkMs);

    return () => clearTimeout(botAction);
  }, [dispatchBattleAction, enableMockRoomBot, game.combatLocked, game.turn, game.winner, gameRef, introPhase, mode, remotePlayerIndex]);

  useEffect(() => {
    if (!pendingExternalAction) return;
    if (introPhase !== "done") return;
    if (processedExternalActionIdsRef.current.has(pendingExternalAction.id)) return;
    if (pendingExternalAction.setupVersion !== gameRef.current.setupVersion) {
      processedExternalActionIdsRef.current.add(pendingExternalAction.id);
      onExternalActionConsumed?.(pendingExternalAction.id);
      return;
    }
    if (pendingExternalAction.turn < gameRef.current.turn) {
      processedExternalActionIdsRef.current.add(pendingExternalAction.id);
      onExternalActionConsumed?.(pendingExternalAction.id);
      return;
    }
    if (pendingExternalAction.turn !== gameRef.current.turn) return;

    const side = pendingExternalAction.side === "player" ? PLAYER : ENEMY;
    if (pendingExternalAction.action.type === "mulligan") {
      setMulliganDebug({
        source: "pendingExternalAction",
        requestedIndexes: [...pendingExternalAction.action.handIndexes],
        requestedSyllables: pendingExternalAction.action.handIndexes.map(
          (index) => ((stableHandsRef.current[side][index] as any)?.syllable ?? `missing:${index}`) as Syllable,
        ),
        removedStableCards: [],
        drawnCards: [],
        externalActionId: pendingExternalAction.id,
        clearIncomingHand: side === localPlayerIndex,
      });
    }
    processedExternalActionIdsRef.current.add(pendingExternalAction.id);
    onExternalActionConsumed?.(pendingExternalAction.id);

    executeBattleTurnAction({
      side,
      move: pendingExternalAction.action,
      selectedCardOrigin: snapshotActionOrigin(side, pendingExternalAction.action),
      clearSelection: side === localPlayerIndex,
      clearIncomingHand: side === localPlayerIndex && pendingExternalAction.action.type === "mulligan",
    });
  }, [
    executeBattleTurnAction,
    gameRef,
    introPhase,
    localPlayerIndex,
    onExternalActionConsumed,
    pendingExternalAction,
    processedExternalActionIdsRef,
    setMulliganDebug,
    snapshotActionOrigin,
    stableHandsRef,
  ]);

  return {
    dispatchBattleAction,
  };
};
