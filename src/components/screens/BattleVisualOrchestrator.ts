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
  pendingMulliganDrawCounts: Record<BattleRuntimeSide, number>;
  lockedTargetSlots: TLockedTargetSlotsState & Record<BattleRuntimeSide, boolean[]>;
  previousEnemyHandSignatureRef: React.MutableRefObject<string>;
  setEnemyHandPulse: React.Dispatch<React.SetStateAction<boolean>>;
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
  pendingMulliganDrawCounts,
  lockedTargetSlots,
  previousEnemyHandSignatureRef,
  setEnemyHandPulse,
  reconcileStableSide,
  commitStableHands,
  commitStableTargets,
  toVisualTarget,
}: UseBattleVisualOrchestratorParams<TVisualHandCard, TStableHandsState, TStableTargetsState, TLockedTargetSlotsState>) => {
  useEffect(() => {
    const currentEnemy = game.players[remotePlayerIndex];
    const signature = `${stableHands[remotePlayerIndex].map((card: any) => card.id).join("|")}:${incomingHands[remotePlayerIndex]
      .map((card) => card.id)
      .join("|")}:${currentEnemy.targets.map((target) => target.progress.join("-")).join("|")}`;
    if (!previousEnemyHandSignatureRef.current) {
      previousEnemyHandSignatureRef.current = signature;
      return;
    }

    if (previousEnemyHandSignatureRef.current !== signature) {
      previousEnemyHandSignatureRef.current = signature;
      setEnemyHandPulse(true);
      const timer = setTimeout(() => setEnemyHandPulse(false), 500);
      return () => clearTimeout(timer);
    }
  }, [game.players, incomingHands, remotePlayerIndex, setEnemyHandPulse, stableHands, previousEnemyHandSignatureRef]);

  useEffect(() => {
    const pendingCounts = {
      [PLAYER]: incomingHands[PLAYER].length + pendingMulliganDrawCounts[PLAYER],
      [ENEMY]: incomingHands[ENEMY].length + pendingMulliganDrawCounts[ENEMY],
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
  }, [commitStableHands, game, incomingHands, pendingMulliganDrawCounts, reconcileStableSide, stableHands, stableHandsRef]);

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
      incomingHandsRef.current[PLAYER].length > 0 ||
      incomingHandsRef.current[ENEMY].length > 0 ||
      incomingTargetsRef.current[PLAYER].length > 0 ||
      incomingTargetsRef.current[ENEMY].length > 0,
    [incomingHandsRef, incomingTargetsRef],
  );

  return {
    hasBlockingVisuals,
  };
};
