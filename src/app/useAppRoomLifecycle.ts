import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { resolveAppBattleSetup } from "./appDeckResolver";
import { createBattleRuntimeInitialGameState } from "../components/screens/BattleRuntimeSetup";
import type { BattleRoomSession, BattleRoomState } from "../lib/battleRoomSession";
import type {
  BattleSide,
  BattleSubmittedAction,
  GameMode,
  GameState,
} from "../types/game";

type Screen = "menu" | "deck-selection" | "lobby" | "battle";

export interface RoomProfilesCache {
  host: { name: string; avatar: string };
  guest: { name: string; avatar: string };
}

interface UseAppRoomLifecycleOptions {
  activeRoomSession: BattleRoomSession | null;
  activeRoomState: BattleRoomState | null;
  mode: GameMode;
  roomId: string | undefined;
  roomLocalSide: BattleSide;
  battleTransitionSetupVersionRef: MutableRefObject<number | null>;
  battleTransitionTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastKnownRoomProfilesRef: MutableRefObject<RoomProfilesCache>;
  clearBattleTransitionTimer: () => void;
  setActiveRoomState: Dispatch<SetStateAction<BattleRoomState | null>>;
  setPlayerDeckId: Dispatch<SetStateAction<string | null>>;
  setEnemyBattleDeckId: Dispatch<SetStateAction<string | null>>;
  setPendingBattleActions: Dispatch<SetStateAction<BattleSubmittedAction[]>>;
  setSharedInitialGame: Dispatch<SetStateAction<GameState | null>>;
  setSharedBattleSnapshot: Dispatch<SetStateAction<GameState | null>>;
  setIsPreparingBattle: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
}

function compareBattleActions(a: BattleSubmittedAction, b: BattleSubmittedAction) {
  if (a.setupVersion !== b.setupVersion) return a.setupVersion - b.setupVersion;
  if (a.turn !== b.turn) return a.turn - b.turn;
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  if (a.side !== b.side) return a.side === "player" ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export function useAppRoomLifecycle({
  activeRoomSession,
  activeRoomState,
  mode,
  roomId,
  roomLocalSide,
  battleTransitionSetupVersionRef,
  battleTransitionTimerRef,
  lastKnownRoomProfilesRef,
  clearBattleTransitionTimer,
  setActiveRoomState,
  setPlayerDeckId,
  setEnemyBattleDeckId,
  setPendingBattleActions,
  setSharedInitialGame,
  setSharedBattleSnapshot,
  setIsPreparingBattle,
  setScreen,
}: UseAppRoomLifecycleOptions) {
  useEffect(() => {
    if (!activeRoomSession) return;

    const unsubscribe = activeRoomSession.subscribe((action) => {
      setPendingBattleActions((prev) => {
        if (prev.some((queuedAction) => queuedAction.id === action.id)) return prev;
        return [...prev, action].sort(compareBattleActions);
      });
    });

    return unsubscribe;
  }, [activeRoomSession, setPendingBattleActions]);

  useEffect(() => {
    if (!activeRoomState) return;

    if (activeRoomState.host.name || activeRoomState.host.avatar) {
      lastKnownRoomProfilesRef.current.host = {
        name: activeRoomState.host.name ?? lastKnownRoomProfilesRef.current.host.name,
        avatar: activeRoomState.host.avatar ?? lastKnownRoomProfilesRef.current.host.avatar,
      };
    }

    if (activeRoomState.guest.name || activeRoomState.guest.avatar) {
      lastKnownRoomProfilesRef.current.guest = {
        name: activeRoomState.guest.name ?? lastKnownRoomProfilesRef.current.guest.name,
        avatar: activeRoomState.guest.avatar ?? lastKnownRoomProfilesRef.current.guest.avatar,
      };
    }
  }, [activeRoomState, lastKnownRoomProfilesRef]);

  useEffect(() => {
    if (!activeRoomSession) return;

    const unsubscribe = activeRoomSession.subscribeState((state) => {
      setActiveRoomState(state);
    });

    return unsubscribe;
  }, [activeRoomSession, setActiveRoomState]);

  useEffect(() => {
    if (mode !== "multiplayer" || !activeRoomSession || !activeRoomState) return;

    setSharedInitialGame(activeRoomState.initialGame ?? null);
    setSharedBattleSnapshot(activeRoomState.battleSnapshot ?? null);
    const localDeckId =
      roomLocalSide === "player"
        ? activeRoomState.host.deckId
        : activeRoomState.guest.deckId;
    const remoteDeckId =
      roomLocalSide === "player"
        ? activeRoomState.guest.deckId
        : activeRoomState.host.deckId;

    if (activeRoomState.phase === "lobby" || activeRoomState.phase === "deck-selection") {
      clearBattleTransitionTimer();
      setIsPreparingBattle(false);
      battleTransitionSetupVersionRef.current = null;
      setPlayerDeckId(localDeckId ?? null);
      setEnemyBattleDeckId(remoteDeckId ?? null);
      setPendingBattleActions([]);
      setSharedInitialGame(null);
      setSharedBattleSnapshot(null);
      setScreen((currentScreen) => (currentScreen === "deck-selection" ? currentScreen : "lobby"));
      return;
    }

    if (!localDeckId || !remoteDeckId) return;

    const battleSetup = resolveAppBattleSetup({
      mode: "multiplayer",
      localDeckId,
      remoteDeckId,
      localSide: roomLocalSide,
      roomId,
    });
    if (!battleSetup) return;

    if (!activeRoomState.initialGame && roomLocalSide === "player") {
      activeRoomSession.publishBattleSetup(createBattleRuntimeInitialGameState(battleSetup));
      return;
    }

    if (!activeRoomState.initialGame) return;

    setPlayerDeckId(localDeckId);
    setEnemyBattleDeckId(remoteDeckId);
    const setupVersion = activeRoomState.initialGame.setupVersion;
    if (battleTransitionSetupVersionRef.current === setupVersion) return;

    battleTransitionSetupVersionRef.current = setupVersion;
    setIsPreparingBattle(true);
    setPendingBattleActions([]);
    clearBattleTransitionTimer();

    battleTransitionTimerRef.current = setTimeout(() => {
      setIsPreparingBattle(false);
      setScreen("battle");
      battleTransitionTimerRef.current = null;
    }, 2000);
  }, [
    activeRoomSession,
    activeRoomState,
    battleTransitionTimerRef,
    battleTransitionSetupVersionRef,
    clearBattleTransitionTimer,
    mode,
    roomId,
    roomLocalSide,
    setEnemyBattleDeckId,
    setIsPreparingBattle,
    setPendingBattleActions,
    setPlayerDeckId,
    setScreen,
    setSharedBattleSnapshot,
    setSharedInitialGame,
  ]);
}
