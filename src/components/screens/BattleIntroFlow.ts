import React, { useCallback, useEffect } from "react";
import { CoinFace, GameMode, GameState } from "../../types/game";
import { ZoneAnchorSnapshot } from "../game/GameComponents";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";

export interface BattleIntroTimingConfig {
  coinChoiceMs: number;
  coinDropMs: number;
  coinSettleMs: number;
  coinResultHoldMs: number;
  coinResultFaceMs: number;
  targetEnterMs: number;
  targetEnterStaggerMs: number;
  targetSettleMs: number;
  turnReleaseDelayMs: number;
  turnLimitMs: number;
}

interface UseBattleIntroFlowParams<TVisualTarget> {
  mode: GameMode;
  localSide: "player" | "enemy";
  introPhase: string;
  localPlayerIndex: BattleRuntimeSide;
  remotePlayerIndex: BattleRuntimeSide;
  game: GameState;
  gameRef: React.MutableRefObject<GameState>;
  setGame: React.Dispatch<React.SetStateAction<GameState>>;
  setIntroPhase: React.Dispatch<React.SetStateAction<any>>;
  setSelectedCoinFace: React.Dispatch<React.SetStateAction<CoinFace | null>>;
  setRevealedCoinFace: React.Dispatch<React.SetStateAction<CoinFace | null>>;
  setPlannedCoinFace: React.Dispatch<React.SetStateAction<CoinFace | null>>;
  setOpeningTurnSide: React.Dispatch<React.SetStateAction<BattleRuntimeSide>>;
  setCoinChoiceRemainingMs: React.Dispatch<React.SetStateAction<number>>;
  setCoinResultStage: React.Dispatch<React.SetStateAction<"face" | "starter">>;
  visualTimersRef: React.MutableRefObject<NodeJS.Timeout[]>;
  animations: {
    openingTargetEntry0Origin: unknown;
    openingTargetEntry1Origin: unknown;
    openingTargetEntry2Origin: unknown;
    openingTargetEntry3Origin: unknown;
  };
  zoneIdForSide: (
    side: BattleRuntimeSide,
    role: "hand" | "field" | "deck" | "targetDeck" | "discard",
  ) => any;
  snapshotSceneAnimationOriginWithFallback: (
    label: string,
    anchor: unknown,
    fallback: string,
  ) => ZoneAnchorSnapshot | null;
  snapshotZone: (zoneId: any) => ZoneAnchorSnapshot | null;
  toVisualTarget: (
    target: GameState["players"][0]["targets"][number],
    side: BattleRuntimeSide,
    slotIndex: number,
  ) => TVisualTarget;
  appendIncomingTarget: (side: BattleRuntimeSide, target: any) => void;
  setStableTargetSlot: (side: BattleRuntimeSide, slotIndex: number, target: TVisualTarget | null) => void;
  timing: BattleIntroTimingConfig;
}

export const useBattleIntroFlow = <TVisualTarget,>({
  mode,
  localSide,
  introPhase,
  localPlayerIndex,
  remotePlayerIndex,
  game,
  gameRef,
  setGame,
  setIntroPhase,
  setSelectedCoinFace,
  setRevealedCoinFace,
  setPlannedCoinFace,
  setOpeningTurnSide,
  setCoinChoiceRemainingMs,
  setCoinResultStage,
  visualTimersRef,
  animations,
  zoneIdForSide,
  snapshotSceneAnimationOriginWithFallback,
  snapshotZone,
  toVisualTarget,
  appendIncomingTarget,
  setStableTargetSlot,
  timing,
}: UseBattleIntroFlowParams<TVisualTarget>) => {
  const beginCoinChoiceResolution = useCallback((face: CoinFace | null) => {
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal || gameRef.current.openingIntroStep !== "coin-choice") return;

    setSelectedCoinFace(face);
    setGame((prev) => ({
      ...prev,
      openingCoinChoice: face,
      openingCoinResult: null,
      openingIntroStep: "coin-fall",
    }));
  }, [gameRef, localSide, mode, setGame, setSelectedCoinFace]);

  useEffect(() => {
    setIntroPhase(game.openingIntroStep);
    setSelectedCoinFace(game.openingCoinChoice);
    setRevealedCoinFace(game.openingCoinResult);
    setPlannedCoinFace(game.openingCoinResult);
    setOpeningTurnSide(game.turn as BattleRuntimeSide);
    setCoinChoiceRemainingMs(game.openingIntroStep === "coin-choice" ? timing.coinChoiceMs : 0);
    if (game.openingIntroStep !== "coin-result") {
      setCoinResultStage("face");
    }
  }, [
    game.openingCoinChoice,
    game.openingCoinResult,
    game.openingIntroStep,
    game.turn,
    setCoinChoiceRemainingMs,
    setCoinResultStage,
    setIntroPhase,
    setOpeningTurnSide,
    setPlannedCoinFace,
    setRevealedCoinFace,
    setSelectedCoinFace,
    timing.coinChoiceMs,
  ]);

  useEffect(() => {
    if (introPhase !== "coin-choice") return;

    const startedAt = Date.now();
    setCoinChoiceRemainingMs(timing.coinChoiceMs);
    const interval = setInterval(() => {
      const remaining = Math.max(0, timing.coinChoiceMs - (Date.now() - startedAt));
      setCoinChoiceRemainingMs(remaining);
    }, 100);
    visualTimersRef.current.push(interval as unknown as NodeJS.Timeout);

    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) {
      return () => clearInterval(interval);
    }

    const timeout = setTimeout(() => {
      setGame((prev) => {
        if (prev.openingIntroStep !== "coin-choice") return prev;
        return {
          ...prev,
          openingCoinChoice: null,
          openingCoinResult: null,
          openingIntroStep: "coin-fall",
        };
      });
    }, timing.coinChoiceMs);
    visualTimersRef.current.push(timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [introPhase, localSide, mode, setCoinChoiceRemainingMs, setGame, timing.coinChoiceMs, visualTimersRef]);

  useEffect(() => {
    if (introPhase !== "coin-fall") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) return;

    let nextCoinFace: CoinFace;
    let nextOpeningTurnSide: BattleRuntimeSide;
    const chosenFace = gameRef.current.openingCoinChoice;

    if (mode === "multiplayer") {
      nextCoinFace = Math.random() < 0.5 ? "cara" : "coroa";
      nextOpeningTurnSide = chosenFace ? (nextCoinFace === chosenFace ? PLAYER : ENEMY) : nextCoinFace === "cara" ? PLAYER : ENEMY;
    } else {
      nextCoinFace = Math.random() < 0.5 ? "cara" : "coroa";
      nextOpeningTurnSide = chosenFace
        ? nextCoinFace === chosenFace
          ? localPlayerIndex
          : remotePlayerIndex
        : nextCoinFace === "cara"
          ? localPlayerIndex
          : remotePlayerIndex;
    }
    setPlannedCoinFace(nextCoinFace);

    const timer = setTimeout(() => {
      setGame((prev) => ({
        ...prev,
        turn: nextOpeningTurnSide,
        openingCoinResult: nextCoinFace,
        openingIntroStep: "coin-result",
      }));
    }, timing.coinDropMs + timing.coinSettleMs);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [gameRef, introPhase, localPlayerIndex, localSide, mode, remotePlayerIndex, setGame, setPlannedCoinFace, timing.coinDropMs, timing.coinSettleMs, visualTimersRef]);

  useEffect(() => {
    if (introPhase !== "coin-result") return;

    setCoinResultStage("face");
    const faceTimer = setTimeout(() => {
      setCoinResultStage("starter");
    }, timing.coinResultFaceMs);
    visualTimersRef.current.push(faceTimer);

    return () => clearTimeout(faceTimer);
  }, [introPhase, setCoinResultStage, timing.coinResultFaceMs, visualTimersRef]);

  useEffect(() => {
    if (introPhase !== "coin-result") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) return;

    const timer = setTimeout(() => {
      setGame((prev) => ({
        ...prev,
        openingIntroStep: "targets",
      }));
    }, timing.coinResultHoldMs);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [introPhase, localSide, mode, setGame, timing.coinResultHoldMs, visualTimersRef]);

  useEffect(() => {
    if (introPhase !== "targets") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";

    const queueInitialTargets = () => {
      const stagedTargets = gameRef.current.players.reduce(
        (acc, player, sideIndex) => [
          ...acc,
          ...player.targets.map((target, slotIndex) => ({
            side: sideIndex as BattleRuntimeSide,
            slotIndex,
            target,
          })),
        ],
        [] as Array<{
          side: BattleRuntimeSide;
          slotIndex: number;
          target: GameState["players"][0]["targets"][number];
        }>,
      );

      stagedTargets.forEach(({ side, slotIndex, target }, index) => {
        const timer = setTimeout(() => {
          const configuredOrigin =
            index === 0
              ? animations.openingTargetEntry0Origin
              : index === 1
                ? animations.openingTargetEntry1Origin
                : index === 2
                  ? animations.openingTargetEntry2Origin
                  : animations.openingTargetEntry3Origin;
          const origin =
            snapshotSceneAnimationOriginWithFallback(
              `opening-target-entry-${index}`,
              configuredOrigin,
              `${side === PLAYER ? "player" : "enemy"}-target-deck`,
            ) ??
            snapshotZone(zoneIdForSide(side, "targetDeck"));
          const entity = toVisualTarget(target, side, slotIndex);

          if (!origin) {
            setStableTargetSlot(side, slotIndex, entity);
            return;
          }

          appendIncomingTarget(side, {
            id: `opening-target-${(entity as any).id ?? target.uiId}`,
            side,
            slotIndex,
            entity,
            origin,
            delayMs: 0,
            durationMs: timing.targetEnterMs,
          });
        }, index * (timing.targetEnterMs + timing.targetEnterStaggerMs));
        visualTimersRef.current.push(timer);
      });

      const settleTimer = setTimeout(() => {
        if (!introAuthorityLocal) return;
        setGame((prev) => ({
          ...prev,
          openingIntroStep: "done",
          turnDeadlineAt: Date.now() + timing.turnReleaseDelayMs + timing.turnLimitMs,
        }));
      }, (stagedTargets.length - 1) * (timing.targetEnterMs + timing.targetEnterStaggerMs) + timing.targetEnterMs + timing.targetSettleMs);

      visualTimersRef.current.push(settleTimer);
    };

    const timer = setTimeout(queueInitialTargets, 40);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [
    animations,
    appendIncomingTarget,
    gameRef,
    introPhase,
    localSide,
    mode,
    setGame,
    setStableTargetSlot,
    snapshotSceneAnimationOriginWithFallback,
    snapshotZone,
    timing.targetEnterMs,
    timing.targetEnterStaggerMs,
    timing.targetSettleMs,
    timing.turnLimitMs,
    timing.turnReleaseDelayMs,
    toVisualTarget,
    visualTimersRef,
    zoneIdForSide,
  ]);

  return {
    beginCoinChoiceResolution,
  };
};
