import { useEffect } from "react";
import { GameMode, GameState } from "../../types/game";
import { BattleRuntimeSide, BattleIntroPhase } from "./BattleRuntimeState";
import { BattleVisualQueueState } from "./BattleVisualQueue";

const SNAPSHOT_INTRO_PROGRESS: Record<BattleIntroPhase, number> = {
  "coin-choice": 0,
  "coin-fall": 1,
  "coin-result": 2,
  targets: 3,
  done: 4,
};

export function getTurnCycleKey(state: Pick<GameState, "setupVersion" | "turn" | "turnDeadlineAt" | "openingIntroStep">) {
  return state.openingIntroStep !== "done"
    ? `${state.setupVersion}:intro`
    : `${state.setupVersion}:${state.turn}:${state.turnDeadlineAt ?? "na"}`;
}

export function getTurnPresentationKey(state: Pick<GameState, "setupVersion" | "turn" | "openingIntroStep">) {
  return state.openingIntroStep !== "done"
    ? `${state.setupVersion}:intro`
    : `${state.setupVersion}:${state.turn}`;
}

export function compareBattleSnapshotProgress(next: GameState, current: GameState) {
  if (next.setupVersion !== current.setupVersion) return next.setupVersion - current.setupVersion;

  const nextIntroProgress = SNAPSHOT_INTRO_PROGRESS[next.openingIntroStep as BattleIntroPhase] ?? 0;
  const currentIntroProgress = SNAPSHOT_INTRO_PROGRESS[current.openingIntroStep as BattleIntroPhase] ?? 0;
  if (nextIntroProgress !== currentIntroProgress) return nextIntroProgress - currentIntroProgress;

  const nextDeadlineProgress = next.turnDeadlineAt ?? 0;
  const currentDeadlineProgress = current.turnDeadlineAt ?? 0;
  if (nextDeadlineProgress !== currentDeadlineProgress) return nextDeadlineProgress - currentDeadlineProgress;

  const nextActedProgress = next.actedThisTurn ? 1 : 0;
  const currentActedProgress = current.actedThisTurn ? 1 : 0;
  if (nextActedProgress !== currentActedProgress) return nextActedProgress - currentActedProgress;

  const nextWinnerProgress = next.winner !== null ? 1 : 0;
  const currentWinnerProgress = current.winner !== null ? 1 : 0;
  if (nextWinnerProgress !== currentWinnerProgress) return nextWinnerProgress - currentWinnerProgress;

  return 0;
}

export function buildBattleSnapshotSignature(state: GameState) {
  return JSON.stringify({
    setupVersion: state.setupVersion,
    turn: state.turn,
    turnDeadlineAt: state.turnDeadlineAt,
    winner: state.winner,
    openingCoinChoice: state.openingCoinChoice,
    openingCoinResult: state.openingCoinResult,
    openingIntroStep: state.openingIntroStep,
    actedThisTurn: state.actedThisTurn,
    combatLocked: state.combatLocked,
    players: state.players.map((player) => ({
      life: player.life,
      hand: player.hand,
      syllableDeck: player.syllableDeck,
      discard: player.discard,
      targetDeck: player.targetDeck.map((target) => target.id),
      targets: player.targets.map((target) => ({
        id: target.uiId,
        name: target.name,
        progress: target.progress,
      })),
    })),
  });
}

export interface BattleSnapshotAuthority {
  pendingAuthoritativeSnapshotRef: React.MutableRefObject<GameState | null>;
  publishedSnapshotSignatureRef: React.MutableRefObject<string>;
  timedOutTurnKeyRef: React.MutableRefObject<string>;
  lastHiddenAtRef: React.MutableRefObject<number | null>;
  needsVisibilityRecoveryRef: React.MutableRefObject<boolean>;
  pendingResultOverlayRecoveryRef: React.MutableRefObject<boolean>;
  visibilityRecoveryFrameRef: React.MutableRefObject<number | null>;
}

interface UseBattleSnapshotAuthorityParams {
  mode: GameMode;
  localSide: "player" | "enemy";
  authoritativeBattleSnapshot?: GameState;
  onBattleSnapshotPublished?: (state: GameState) => void;
  game: GameState;
  gameRef: React.MutableRefObject<GameState>;
  introPhase: BattleIntroPhase;
  turnPresentationLocked: boolean;
  visualQueue: BattleVisualQueueState;
  cloneGame: (state: GameState) => GameState;
  clearVisualTimers: () => void;
  setFreshCardIds: React.Dispatch<React.SetStateAction<string[]>>;
  setTurnPresentationLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setTurnRemainingMs: React.Dispatch<React.SetStateAction<number>>;
  setShowResultOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setGame: React.Dispatch<React.SetStateAction<GameState>>;
  hydrateBattleSnapshot: (snapshot: GameState) => void;
  finalizeTurn: () => void;
  isIntroSnapshotState: (state: GameState) => boolean;
  isWinnerSnapshotState: (state: GameState) => boolean;
  isSnapshotCheckpointClear: (state: GameState) => boolean;
  pendingAuthoritativeSnapshotRef: React.MutableRefObject<GameState | null>;
  publishedSnapshotSignatureRef: React.MutableRefObject<string>;
  timedOutTurnKeyRef: React.MutableRefObject<string>;
  lastHiddenAtRef: React.MutableRefObject<number | null>;
  needsVisibilityRecoveryRef: React.MutableRefObject<boolean>;
  pendingResultOverlayRecoveryRef: React.MutableRefObject<boolean>;
  visibilityRecoveryFrameRef: React.MutableRefObject<number | null>;
}

export const useBattleSnapshotAuthority = ({
  mode,
  localSide,
  authoritativeBattleSnapshot,
  onBattleSnapshotPublished,
  game,
  gameRef,
  introPhase,
  turnPresentationLocked,
  visualQueue,
  cloneGame,
  clearVisualTimers,
  setFreshCardIds,
  setTurnPresentationLocked,
  setTurnRemainingMs,
  setShowResultOverlay,
  setGame,
  hydrateBattleSnapshot,
  finalizeTurn,
  isIntroSnapshotState,
  isWinnerSnapshotState,
  isSnapshotCheckpointClear,
  pendingAuthoritativeSnapshotRef,
  publishedSnapshotSignatureRef,
  timedOutTurnKeyRef,
  lastHiddenAtRef,
  needsVisibilityRecoveryRef,
  pendingResultOverlayRecoveryRef,
  visibilityRecoveryFrameRef,
}: UseBattleSnapshotAuthorityParams): BattleSnapshotAuthority => {
  useEffect(() => {
    if (mode !== "multiplayer" || localSide !== "player" || !onBattleSnapshotPublished) return;
    if (!isIntroSnapshotState(game) && !isWinnerSnapshotState(game) && !isSnapshotCheckpointClear(game)) return;

    const signature = buildBattleSnapshotSignature(game);
    if (publishedSnapshotSignatureRef.current === signature) return;
    publishedSnapshotSignatureRef.current = signature;
    onBattleSnapshotPublished(cloneGame(game));
  }, [
    cloneGame,
    game,
    isIntroSnapshotState,
    isSnapshotCheckpointClear,
    isWinnerSnapshotState,
    localSide,
    mode,
    onBattleSnapshotPublished,
  ]);

  useEffect(() => {
    if (!authoritativeBattleSnapshot || mode !== "multiplayer") return;
    pendingAuthoritativeSnapshotRef.current = authoritativeBattleSnapshot;
  }, [authoritativeBattleSnapshot, mode]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const runVisibilityRecovery = () => {
      visibilityRecoveryFrameRef.current = null;

      if (pendingResultOverlayRecoveryRef.current || (gameRef.current.winner !== null && !gameRef.current.combatLocked)) {
        setShowResultOverlay(true);
        pendingResultOverlayRecoveryRef.current = false;
      }

      const hiddenAt = lastHiddenAtRef.current;
      lastHiddenAtRef.current = null;
      if (!hiddenAt) return;

      const hiddenMs = Date.now() - hiddenAt;
      if (hiddenMs < 300) return;

      needsVisibilityRecoveryRef.current = true;
      clearVisualTimers();
      setFreshCardIds([]);
      setTurnPresentationLocked(false);
      setTurnRemainingMs(60000);
      setGame((prev) => (prev.currentMessage?.kind === "turn" ? { ...prev, currentMessage: null } : prev));

      const authorityCanResolveTimeout = mode !== "multiplayer" || localSide === "player";
      if (
        authorityCanResolveTimeout &&
        gameRef.current.openingIntroStep === "done" &&
        gameRef.current.winner === null &&
        !gameRef.current.actedThisTurn &&
        gameRef.current.turnDeadlineAt != null &&
        Date.now() >= gameRef.current.turnDeadlineAt
      ) {
        const overdueTurnKey = getTurnCycleKey(gameRef.current);
        if (timedOutTurnKeyRef.current !== overdueTurnKey) {
          timedOutTurnKeyRef.current = overdueTurnKey;
          finalizeTurn();
          return;
        }
      }

      if (mode !== "multiplayer") return;

      const latestSnapshot = pendingAuthoritativeSnapshotRef.current ?? authoritativeBattleSnapshot;
      const canRecoverFromSnapshot =
        latestSnapshot &&
        compareBattleSnapshotProgress(latestSnapshot, gameRef.current) >= 0 &&
        (isIntroSnapshotState(latestSnapshot) || isWinnerSnapshotState(latestSnapshot) || isSnapshotCheckpointClear(latestSnapshot));

      if (localSide === "player") {
        if (canRecoverFromSnapshot) {
          hydrateBattleSnapshot(latestSnapshot);
          if (latestSnapshot.winner !== null && !latestSnapshot.combatLocked) {
            setShowResultOverlay(true);
            pendingResultOverlayRecoveryRef.current = false;
          }
        }
        if (!onBattleSnapshotPublished) return;

        const publishRecoverySnapshot = () => {
          onBattleSnapshotPublished(cloneGame(gameRef.current));
        };

        const earlyTimer = setTimeout(publishRecoverySnapshot, 260);
        const settleTimer = setTimeout(publishRecoverySnapshot, 980);
        return () => {
          clearTimeout(earlyTimer);
          clearTimeout(settleTimer);
        };
      }

      if (latestSnapshot) {
        hydrateBattleSnapshot(latestSnapshot);
        if (latestSnapshot.winner !== null && !latestSnapshot.combatLocked) {
          setShowResultOverlay(true);
          pendingResultOverlayRecoveryRef.current = false;
        }
        needsVisibilityRecoveryRef.current = false;
      }
    };

    const scheduleVisibilityRecovery = () => {
      if (visibilityRecoveryFrameRef.current != null) return;
      visibilityRecoveryFrameRef.current = window.requestAnimationFrame(runVisibilityRecovery);
    };

    const handleVisibilityRecovery = () => {
      if (document.hidden) {
        lastHiddenAtRef.current = Date.now();
        if (visibilityRecoveryFrameRef.current != null) {
          window.cancelAnimationFrame(visibilityRecoveryFrameRef.current);
          visibilityRecoveryFrameRef.current = null;
        }
        return;
      }

      scheduleVisibilityRecovery();
    };

    document.addEventListener("visibilitychange", handleVisibilityRecovery);
    window.addEventListener("focus", handleVisibilityRecovery);

    return () => {
      if (visibilityRecoveryFrameRef.current != null) {
        window.cancelAnimationFrame(visibilityRecoveryFrameRef.current);
        visibilityRecoveryFrameRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityRecovery);
      window.removeEventListener("focus", handleVisibilityRecovery);
    };
  }, [
    authoritativeBattleSnapshot,
    clearVisualTimers,
    cloneGame,
    finalizeTurn,
    gameRef,
    hydrateBattleSnapshot,
    isIntroSnapshotState,
    isSnapshotCheckpointClear,
    isWinnerSnapshotState,
    localSide,
    mode,
    onBattleSnapshotPublished,
    setFreshCardIds,
    setGame,
    setShowResultOverlay,
    setTurnPresentationLocked,
    setTurnRemainingMs,
  ]);

  useEffect(() => {
    if (mode !== "multiplayer" || localSide === "player") return;
    const pendingSnapshot = pendingAuthoritativeSnapshotRef.current;
    if (!pendingSnapshot) return;
    const introSyncInFlight = isIntroSnapshotState(gameRef.current) || isIntroSnapshotState(pendingSnapshot);
    const winnerSyncInFlight = isWinnerSnapshotState(pendingSnapshot);
    const forceVisibilityRecovery = needsVisibilityRecoveryRef.current;
    if (!introSyncInFlight && !winnerSyncInFlight && !forceVisibilityRecovery && !isSnapshotCheckpointClear(gameRef.current)) return;

    const nextSignature = buildBattleSnapshotSignature(pendingSnapshot);
    const currentSignature = buildBattleSnapshotSignature(gameRef.current);
    const progressComparison = compareBattleSnapshotProgress(pendingSnapshot, gameRef.current);
    pendingAuthoritativeSnapshotRef.current = null;
    needsVisibilityRecoveryRef.current = false;
    if (progressComparison < 0) return;
    if (nextSignature === currentSignature) return;

    hydrateBattleSnapshot(pendingSnapshot);
    if (
      pendingSnapshot.winner !== null &&
      !pendingSnapshot.combatLocked &&
      (typeof document === "undefined" || !document.hidden)
    ) {
      setShowResultOverlay(true);
      pendingResultOverlayRecoveryRef.current = false;
    }
  }, [
    authoritativeBattleSnapshot,
    gameRef,
    hydrateBattleSnapshot,
    isIntroSnapshotState,
    isSnapshotCheckpointClear,
    isWinnerSnapshotState,
    localSide,
    mode,
    setShowResultOverlay,
    turnPresentationLocked,
    visualQueue.incomingHands,
    visualQueue.incomingTargets,
  ]);

  return {
    pendingAuthoritativeSnapshotRef,
    publishedSnapshotSignatureRef,
    timedOutTurnKeyRef,
    lastHiddenAtRef,
    needsVisibilityRecoveryRef,
    pendingResultOverlayRecoveryRef,
    visibilityRecoveryFrameRef,
  };
};
