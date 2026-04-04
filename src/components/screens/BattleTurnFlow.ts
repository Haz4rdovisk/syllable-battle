import React, { useCallback, useEffect } from "react";
import { clearTransientPlayerState, CONFIG } from "../../logic/gameLogic";
import { ChronicleEntry, GameMode, GameState, GameMessage } from "../../types/game";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";
import { getTurnCycleKey, getTurnPresentationKey } from "./BattleSnapshotAuthority";

export interface BattleTurnTimingConfig {
  turnLimitMs: number;
  warningMs: number;
  releaseDelayMs: number;
  bannerDurationMs: number;
  preBannerDelayMs: number;
  interactionReleaseBufferMs: number;
}

interface UseBattleTurnFlowParams {
  mode: GameMode;
  localSide: "player" | "enemy";
  introPhase: string;
  game: GameState;
  gameRef: React.MutableRefObject<GameState>;
  localPlayerIndex: BattleRuntimeSide;
  turnPresentationLocked: boolean;
  setTurnPresentationLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setTurnRemainingMs: React.Dispatch<React.SetStateAction<number>>;
  setGame: React.Dispatch<React.SetStateAction<GameState>>;
  clearAllTimers: () => void;
  hasBlockingVisuals: () => boolean;
  actionTimersRef: React.MutableRefObject<NodeJS.Timeout[]>;
  timedOutTurnKeyRef: React.MutableRefObject<string>;
  presentedTurnKeyRef: React.MutableRefObject<string>;
  emitTurnStartedEvent: (turn: number, side: BattleRuntimeSide) => void;
  timing: BattleTurnTimingConfig;
}

export const useBattleTurnFlow = ({
  mode,
  localSide,
  introPhase,
  game,
  gameRef,
  localPlayerIndex,
  turnPresentationLocked,
  setTurnPresentationLocked,
  setTurnRemainingMs,
  setGame,
  clearAllTimers,
  hasBlockingVisuals,
  actionTimersRef,
  timedOutTurnKeyRef,
  presentedTurnKeyRef,
  emitTurnStartedEvent,
  timing,
}: UseBattleTurnFlowParams) => {
  const getTurnMessageTitle = useCallback(
    (turnIndex: number) => (turnIndex === localPlayerIndex ? "Sua vez" : "Vez do oponente"),
    [localPlayerIndex],
  );

  const addLog = useCallback(
    (log: ChronicleEntry[], entry: ChronicleEntry) => [entry, ...log].slice(0, CONFIG.logSize),
    [],
  );

  const hasTurnMessage = (message: GameMessage | null | undefined) => Boolean(message && message.kind === "turn");

  const isSnapshotCheckpointClear = useCallback(
    (state: GameState) =>
      state.openingIntroStep === "done" &&
      !state.combatLocked &&
      !state.currentMessage &&
      state.messageQueue.length === 0 &&
      !turnPresentationLocked &&
      !hasBlockingVisuals(),
    [hasBlockingVisuals, turnPresentationLocked],
  );

  const finalizeTurn = useCallback(() => {
    if (hasBlockingVisuals()) {
      const retry = setTimeout(finalizeTurn, 120);
      actionTimersRef.current.push(retry);
      return;
    }

    setTurnRemainingMs(timing.turnLimitMs);
    clearAllTimers();
    setGame((prev) => {
      if (prev.winner !== null) return prev;
      const nextTurn = prev.turn === PLAYER ? ENEMY : PLAYER;
      const players = [...prev.players];
      players[nextTurn] = { ...players[nextTurn], mulliganUsedThisRound: false };

      return {
        ...prev,
        players: players.map((player, index) =>
          index === prev.turn ? clearTransientPlayerState(player) : player,
        ),
        turn: nextTurn,
        turnDeadlineAt: Date.now() + timing.releaseDelayMs + timing.turnLimitMs,
        actedThisTurn: false,
        combatLocked: false,
        selectedHandIndexes: [],
        selectedCardForPlay: null,
        log: addLog(prev.log, {
          text: nextTurn === localPlayerIndex ? "Seu turno comecou" : "Turno do oponente",
          tone: nextTurn === localPlayerIndex ? "player" : "enemy",
        }),
      };
    });
    const nextTurnSide = gameRef.current.turn === PLAYER ? ENEMY : PLAYER;
    emitTurnStartedEvent(gameRef.current.turn + 1, nextTurnSide);
  }, [
    actionTimersRef,
    addLog,
    clearAllTimers,
    emitTurnStartedEvent,
    gameRef,
    hasBlockingVisuals,
    localPlayerIndex,
    setGame,
    setTurnRemainingMs,
    timing.releaseDelayMs,
    timing.turnLimitMs,
  ]);

  useEffect(() => {
    const timeoutAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!timeoutAuthorityLocal) return;
    if (introPhase !== "done" || game.winner !== null || game.turnDeadlineAt == null || game.actedThisTurn) return;

    const turnKey = getTurnCycleKey(game);
    if (timedOutTurnKeyRef.current === turnKey) return;

    const remainingMs = game.turnDeadlineAt - Date.now();
    if (remainingMs <= 0) {
      timedOutTurnKeyRef.current = turnKey;
      finalizeTurn();
      return;
    }

    const timer = setTimeout(() => {
      if (timedOutTurnKeyRef.current === turnKey) return;
      if (
        gameRef.current.setupVersion !== game.setupVersion ||
        gameRef.current.turn !== game.turn ||
        gameRef.current.turnDeadlineAt !== game.turnDeadlineAt ||
        gameRef.current.winner !== null ||
        gameRef.current.actedThisTurn
      ) {
        return;
      }

      timedOutTurnKeyRef.current = turnKey;
      finalizeTurn();
    }, remainingMs + 8);

    return () => clearTimeout(timer);
  }, [
    finalizeTurn,
    game,
    gameRef,
    introPhase,
    localSide,
    mode,
    timedOutTurnKeyRef,
  ]);

  useEffect(() => {
    if (game.winner !== null || introPhase !== "done") return;
    if (game.turnDeadlineAt == null) {
      setTurnRemainingMs(timing.turnLimitMs);
      return;
    }

    let tickTimer: ReturnType<typeof setTimeout> | null = null;

    const updateRemaining = () => {
      setTurnRemainingMs(Math.max(0, game.turnDeadlineAt! - Date.now()));
    };

    const scheduleTick = () => {
      updateRemaining();
      const remainingMs = Math.max(0, game.turnDeadlineAt! - Date.now());
      if (remainingMs <= 0) {
        tickTimer = null;
        return;
      }

      const nextTickMs = Math.max(80, remainingMs % 1000 || 1000);
      tickTimer = setTimeout(scheduleTick, nextTickMs);
    };

    scheduleTick();

    return () => {
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [game.turn, game.setupVersion, game.turnDeadlineAt, game.winner, introPhase, setTurnRemainingMs, timing.turnLimitMs]);

  useEffect(() => {
    if (introPhase !== "done") {
      presentedTurnKeyRef.current = `${game.setupVersion}:intro`;
      setTurnPresentationLocked(false);
      return;
    }

    if (game.winner !== null) {
      setTurnPresentationLocked(false);
      return;
    }

    const presentationKey = getTurnPresentationKey(game);
    if (presentedTurnKeyRef.current === presentationKey) return;
    presentedTurnKeyRef.current = presentationKey;
    setTurnPresentationLocked(true);

    const queueTimer = setTimeout(() => {
      setGame((prev) => {
        if (prev.winner !== null || prev.openingIntroStep !== "done") return prev;
        if (prev.setupVersion !== game.setupVersion || prev.turn !== game.turn || prev.turnDeadlineAt !== game.turnDeadlineAt) return prev;
        return {
          ...prev,
          messageQueue: [
            ...prev.messageQueue,
            { title: getTurnMessageTitle(prev.turn), detail: "", kind: "turn" },
          ],
        };
      });
    }, timing.preBannerDelayMs);

    const releaseTimer = setTimeout(() => {
      setTurnPresentationLocked(false);
    }, timing.preBannerDelayMs + timing.bannerDurationMs + timing.interactionReleaseBufferMs);

    return () => {
      clearTimeout(queueTimer);
      clearTimeout(releaseTimer);
    };
  }, [
    game.setupVersion,
    game.turn,
    game.turnDeadlineAt,
    game.winner,
    getTurnMessageTitle,
    introPhase,
    presentedTurnKeyRef,
    setGame,
    setTurnPresentationLocked,
    timing.bannerDurationMs,
    timing.interactionReleaseBufferMs,
    timing.preBannerDelayMs,
  ]);

  useEffect(() => {
    if (game.currentMessage) {
      const durationMs =
        game.currentMessage.kind === "turn"
          ? timing.bannerDurationMs
          : game.currentMessage.kind === "damage"
            ? 900
            : 1100;
      const timeout = setTimeout(() => setGame((prev) => ({ ...prev, currentMessage: null })), durationMs);
      return () => clearTimeout(timeout);
    }

    if (game.messageQueue.length > 0 && introPhase === "done" && !hasBlockingVisuals() && !game.combatLocked) {
      setGame((prev) => {
        const [first, ...rest] = prev.messageQueue;
        return { ...prev, currentMessage: first, messageQueue: rest };
      });
    }
  }, [
    game.combatLocked,
    game.currentMessage,
    game.messageQueue,
    hasBlockingVisuals,
    introPhase,
    setGame,
    timing.bannerDurationMs,
  ]);

  return {
    finalizeTurn,
    getTurnMessageTitle,
    isSnapshotCheckpointClear,
    isIntroSnapshotState: (state: GameState) => state.openingIntroStep !== "done",
    isWinnerSnapshotState: (state: GameState) => state.winner !== null && !state.combatLocked,
    hasTurnMessage,
  };
};
