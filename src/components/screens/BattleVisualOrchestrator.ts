import { useCallback, useEffect } from "react";
import { GameState, Syllable } from "../../types/game";
import { BattleRuntimeSide, PLAYER, ENEMY } from "./BattleRuntimeState";

interface UseBattleVisualOrchestratorParams<TVisualHandCard, TStableHandsState, TStableTargetsState, TLockedTargetSlotsState> {
  game: GameState;
  introPhase: string;
  remotePlayerIndex: BattleRuntimeSide;
  stableHands: TStableHandsState & Record<BattleRuntimeSide, TVisualHandCard[]>;
  stableHandsRef: React.MutableRefObject<TStableHandsState & Record<BattleRuntimeSide, TVisualHandCard[]>>;
  stableTargetsRef: React.MutableRefObject<TStableTargetsState & Record<BattleRuntimeSide, Array<any>>>;
  incomingHands: Record<BattleRuntimeSide, Array<{ id: string }>>;
  incomingHandsRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<{ id: string }>>>;
  incomingTargetsRef: React.MutableRefObject<Record<BattleRuntimeSide, Array<any>>>;
  scheduledHandDrawCounts: Record<BattleRuntimeSide, number>;
  pendingMulliganDrawCounts: Record<BattleRuntimeSide, number>;
  lockedTargetSlots: TLockedTargetSlotsState & Record<BattleRuntimeSide, boolean[]>;
  reconcileStableSide: (
    side: BattleRuntimeSide,
    logicalHand: Syllable[],
    currentStableSide: TVisualHandCard[],
  ) => TVisualHandCard[];
  commitStableHands: (nextHands: TStableHandsState & Record<BattleRuntimeSide, TVisualHandCard[]>) => void;
  commitStableTargets: (nextTargets: TStableTargetsState & Record<BattleRuntimeSide, Array<any>>) => void;
  toVisualTarget: (
    target: GameState["players"][0]["targets"][number],
    side: BattleRuntimeSide,
    index: number,
  ) => any;
}

export const useBattleVisualOrchestrator = <TVisualHandCard, TStableHandsState, TStableTargetsState, TLockedTargetSlotsState>({
  game,
  introPhase,
  remotePlayerIndex,
  stableHands,
  stableHandsRef,
  stableTargetsRef,
  incomingHands,
  incomingHandsRef,
  incomingTargetsRef,
  scheduledHandDrawCounts,
  pendingMulliganDrawCounts,
  lockedTargetSlots,
  reconcileStableSide,
  commitStableHands,
  commitStableTargets,
  toVisualTarget,
}: UseBattleVisualOrchestratorParams<TVisualHandCard, TStableHandsState, TStableTargetsState, TLockedTargetSlotsState>) => {
  useEffect(() => {
    const pendingCounts = {
      [PLAYER]: incomingHands[PLAYER].length + scheduledHandDrawCounts[PLAYER] + pendingMulliganDrawCounts[PLAYER],
      [ENEMY]: incomingHands[ENEMY].length + scheduledHandDrawCounts[ENEMY] + pendingMulliganDrawCounts[ENEMY],
    };

    const expectedPlayerStable = game.players[PLAYER].hand.length - pendingCounts[PLAYER];
    const expectedEnemyStable = game.players[ENEMY].hand.length - pendingCounts[ENEMY];

    if (
      expectedPlayerStable === stableHands[PLAYER].length &&
      expectedEnemyStable === stableHands[ENEMY].length
    ) {
      return;
    }

    const current = stableHandsRef.current;
    const nextHands = {
      [PLAYER]:
        pendingCounts[PLAYER] === 0
          ? reconcileStableSide(PLAYER, game.players[PLAYER].hand, current[PLAYER] as TVisualHandCard[])
          : current[PLAYER],
      [ENEMY]:
        pendingCounts[ENEMY] === 0
          ? reconcileStableSide(ENEMY, game.players[ENEMY].hand, current[ENEMY] as TVisualHandCard[])
          : current[ENEMY],
    } as TStableHandsState & Record<BattleRuntimeSide, TVisualHandCard[]>;

    if (nextHands[PLAYER] !== current[PLAYER] || nextHands[ENEMY] !== current[ENEMY]) {
      commitStableHands(nextHands);
    }
  }, [commitStableHands, game, incomingHands, pendingMulliganDrawCounts, reconcileStableSide, scheduledHandDrawCounts, stableHands, stableHandsRef]);

  useEffect(() => {
    if (introPhase !== "done") return;

    const current = stableTargetsRef.current;
    const nextTargets = {
      [PLAYER]: game.players[PLAYER].targets.map((target, index) => {
        if (lockedTargetSlots[PLAYER][index]) return current[PLAYER][index];
        return toVisualTarget(target, PLAYER, index);
      }),
      [ENEMY]: game.players[ENEMY].targets.map((target, index) => {
        if (lockedTargetSlots[ENEMY][index]) return current[ENEMY][index];
        return toVisualTarget(target, ENEMY, index);
      }),
    } as TStableTargetsState & Record<BattleRuntimeSide, Array<any>>;

    if (nextTargets[PLAYER] !== current[PLAYER] || nextTargets[ENEMY] !== current[ENEMY]) {
      commitStableTargets(nextTargets);
    }
  }, [commitStableTargets, game.players, introPhase, lockedTargetSlots, stableTargetsRef, toVisualTarget]);

  const hasBlockingVisuals = useCallback(
    () =>
      scheduledHandDrawCounts[PLAYER] > 0 ||
      scheduledHandDrawCounts[ENEMY] > 0 ||
      incomingHandsRef.current[PLAYER].length > 0 ||
      incomingHandsRef.current[ENEMY].length > 0 ||
      incomingTargetsRef.current[PLAYER].length > 0 ||
      incomingTargetsRef.current[ENEMY].length > 0,
    [incomingHandsRef, incomingTargetsRef, scheduledHandDrawCounts],
  );

  return {
    hasBlockingVisuals,
  };
};
