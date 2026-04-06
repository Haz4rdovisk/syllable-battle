import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameMode, BattleSide, BattleSubmittedAction, GameState, PlayerProfile, normalizePlayerName } from "./types/game";
import { Menu } from "./components/screens/Menu";
import { DeckSelection } from "./components/screens/DeckSelection";
import { CollectionScreen } from "./components/screens/CollectionScreen";
import { Lobby } from "./components/screens/Lobby";
import { Battle } from "./components/screens/Battle";
import { ContentInspector } from "./components/screens/ContentInspector";
import { ContentEditor } from "./components/screens/ContentEditor";
import { ProfileSetup } from "./components/screens/ProfileSetup";
import { BattleLayoutEditor } from "./components/screens/BattleLayoutEditor";
import { BattleLayoutPreview } from "./components/screens/BattleLayoutPreview";
import { BattleRoomSession, BattleRoomState, createBattleRoomService } from "./lib/battleRoomSession";
import { SseBattleRoomConnector } from "./lib/battleRoomSseConnector";
import { AnimatePresence, motion } from "motion/react";
import {
  DevSceneMode,
  loadStoredPlayerProfile,
  persistPlayerProfile,
  resolveDevSceneMode,
} from "./app/appBootstrap";
import { RoomProfilesCache, useAppRoomLifecycle } from "./app/useAppRoomLifecycle";
import {
  resolveAppDeck,
  resolveAppBattleSetupSelection,
} from "./app/appDeckResolver";

type Screen = "menu" | "deck-selection" | "collection" | "lobby" | "battle";
type SoloDeckStep = "player" | "enemy";
const MOCK_ROOM_LATENCY_MS = 180;
const MOCK_ROOM_DELIVERED_MS = 60;
const ENABLE_LOCAL_MULTIPLAYER_MOCK = true;
const RELAY_URL = import.meta.env.VITE_BATTLE_ROOM_RELAY_URL?.trim();

export default function App() {
  const devSceneMode: DevSceneMode = ((): DevSceneMode => {
    if (typeof window === "undefined") return null;
    return resolveDevSceneMode(window.location.search);
  })();

  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(() =>
    typeof window === "undefined" ? null : loadStoredPlayerProfile(window.localStorage),
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("bot");
  const [playerDeckId, setPlayerDeckId] = useState<string | null>(null);
  const [enemyBattleDeckId, setEnemyBattleDeckId] = useState<string | null>(null);
  const [soloDeckStep, setSoloDeckStep] = useState<SoloDeckStep>("player");
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>();
  const [roomLocalSide, setRoomLocalSide] = useState<BattleSide>("player");
  const [activeRoomSession, setActiveRoomSession] = useState<BattleRoomSession | null>(null);
  const [activeRoomState, setActiveRoomState] = useState<BattleRoomState | null>(null);
  const [pendingBattleActions, setPendingBattleActions] = useState<BattleSubmittedAction[]>([]);
  const [sharedInitialGame, setSharedInitialGame] = useState<GameState | null>(null);
  const [sharedBattleSnapshot, setSharedBattleSnapshot] = useState<GameState | null>(null);
  const [isMenuInputLocked, setIsMenuInputLocked] = useState(false);
  const battleTransitionSetupVersionRef = useRef<number | null>(null);
  const battleTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuInputLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownRoomProfilesRef = useRef<RoomProfilesCache>({
    host: { name: "", avatar: "" },
    guest: { name: "", avatar: "" },
  });
  const battleRoomServiceRef = useRef(
    createBattleRoomService(
      MOCK_ROOM_LATENCY_MS,
      RELAY_URL ? new SseBattleRoomConnector(RELAY_URL) : undefined,
    ),
  );

  const handleSelectMode = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setPlayerDeckId(null);
    setEnemyBattleDeckId(null);
    setSoloDeckStep("player");
    if (selectedMode === "multiplayer") {
      setScreen("lobby");
    } else {
      setScreen("deck-selection");
    }
  };

  const clearBattleTransitionTimer = useCallback(() => {
    if (!battleTransitionTimerRef.current) return;
    clearTimeout(battleTransitionTimerRef.current);
    battleTransitionTimerRef.current = null;
  }, []);

  const clearMenuInputLockTimer = useCallback(() => {
    if (!menuInputLockTimerRef.current) return;
    clearTimeout(menuInputLockTimerRef.current);
    menuInputLockTimerRef.current = null;
  }, []);

  const armMenuInputLock = useCallback((durationMs = 350) => {
    setIsMenuInputLocked(true);
    clearMenuInputLockTimer();
    menuInputLockTimerRef.current = setTimeout(() => {
      setIsMenuInputLocked(false);
      menuInputLockTimerRef.current = null;
    }, durationMs);
  }, [clearMenuInputLockTimer]);

  const resetBattleFlowState = useCallback(() => {
    setPlayerDeckId(null);
    setEnemyBattleDeckId(null);
    setPendingBattleActions([]);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setIsPreparingBattle(false);
    battleTransitionSetupVersionRef.current = null;
    clearBattleTransitionTimer();
  }, [clearBattleTransitionTimer]);

  const openRoomSession = useCallback(
    (openSession: (roomKey: string, profile: PlayerProfile) => BattleRoomSession, id: string) => {
      if (!playerProfile) return;

      const session = openSession(id, playerProfile);
      setRoomId(id);
      setRoomLocalSide(session.localSide);
      setActiveRoomSession(session);
      setActiveRoomState(session.getState());
      resetBattleFlowState();
      setScreen("lobby");
    },
    [playerProfile, resetBattleFlowState],
  );

  const handleSelectDeck = (deckId: string) => {
    const selectedDeck = resolveAppDeck(deckId);
    if (!selectedDeck) return;

    if (mode === "multiplayer" && activeRoomSession) {
      setPlayerDeckId(selectedDeck.deckId);
      activeRoomSession.selectDeck(selectedDeck.deckId);
      return;
    }

    if (mode === "bot" && soloDeckStep === "player") {
      setPlayerDeckId(selectedDeck.deckId);
      setEnemyBattleDeckId(null);
      setSoloDeckStep("enemy");
      return;
    }

    if (mode === "bot" && soloDeckStep === "enemy") {
      setEnemyBattleDeckId(selectedDeck.deckId);
      setPendingBattleActions([]);
      setScreen("battle");
      return;
    }

    setPlayerDeckId(selectedDeck.deckId);
    setEnemyBattleDeckId(null);
    setPendingBattleActions([]);
    setScreen("battle");
  };

  const handleCreateRoom = (id: string) =>
    openRoomSession(battleRoomServiceRef.current.createRoom.bind(battleRoomServiceRef.current), id);

  const handleJoinRoom = (id: string) =>
    openRoomSession(battleRoomServiceRef.current.joinRoom.bind(battleRoomServiceRef.current), id);

  const handleStartRoom = () => {
    activeRoomSession?.startDeckSelection();
  };

  const handleReturnToLobby = () => {
    if (mode === "multiplayer" && activeRoomSession) {
      activeRoomSession.returnToLobby();
      return;
    }

    handleExit();
  };

  const handleChooseDecksAgain = () => {
    activeRoomSession?.startDeckSelection();
  };

  const handleExit = () => {
    if (roomId) {
      battleRoomServiceRef.current.leaveRoom(roomId);
    }
    setScreen("menu");
    setSoloDeckStep("player");
    setRoomId(undefined);
    setRoomLocalSide("player");
    setActiveRoomSession(null);
    setActiveRoomState(null);
    resetBattleFlowState();
  };

  const handleSaveProfile = (profile: PlayerProfile) => {
    const normalizedProfile = {
      ...profile,
      name: normalizePlayerName(profile.name),
    };
    setPlayerProfile(normalizedProfile);
    armMenuInputLock();
    setIsEditingProfile(false);
    if (typeof window !== "undefined") {
      persistPlayerProfile(window.localStorage, normalizedProfile);
    }
  };

  const handleOpenCollection = () => {
    setPlayerDeckId(null);
    setEnemyBattleDeckId(null);
    setSoloDeckStep("player");
    setScreen("collection");
    setIsPreparingBattle(false);
  };

  const handleBattleActionRequested = (action: BattleSubmittedAction) => {
    activeRoomSession?.submitAction(action);
  };

  useAppRoomLifecycle({
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
  });

  useEffect(() => () => {
    clearBattleTransitionTimer();
    clearMenuInputLockTimer();
  }, [clearBattleTransitionTimer, clearMenuInputLockTimer]);

  const headPendingBattleAction = pendingBattleActions[0] ?? null;
  const localBattleName = normalizePlayerName(playerProfile?.name ?? "VOCE", "VOCE");
  const localBattleAvatar = playerProfile?.avatar ?? "\u{1F9D9}\u200D\u2642\uFE0F";
  const remoteBattleName =
    mode === "multiplayer"
      ? normalizePlayerName(
          roomLocalSide === "player"
            ? activeRoomState?.guest.name ?? lastKnownRoomProfilesRef.current.guest.name ?? "OPONENTE"
            : activeRoomState?.host.name ?? lastKnownRoomProfilesRef.current.host.name ?? "OPONENTE",
          "OPONENTE",
        )
      : "BOT";
  const remoteBattleAvatar =
    mode === "multiplayer"
      ? roomLocalSide === "player"
        ? activeRoomState?.guest.avatar ?? lastKnownRoomProfilesRef.current.guest.avatar ?? "\u{1F479}"
        : activeRoomState?.host.avatar ?? lastKnownRoomProfilesRef.current.host.avatar ?? "\u{1F479}"
      : "\u{1F479}";
  const deckSelectionTitle = "DECKS DISPONIVEIS";
  const deckSelectionPhaseKey =
    mode === "bot" ? `bot-${soloDeckStep}` : mode === "multiplayer" ? "multiplayer-deck-selection" : "solo-deck-selection";
  const deckSelectionIdleStatusTitle =
    mode === "bot" && soloDeckStep === "enemy" ? "DEFINA O DECK DO ADVERSARIO" : "ESCOLHA SEU DECK";
  const battleDeckSelection = useMemo(
    () =>
      resolveAppBattleSetupSelection({
        mode,
        localDeckId: playerDeckId,
        remoteDeckId: enemyBattleDeckId,
        localSide: roomLocalSide,
        roomId,
      }),
    [enemyBattleDeckId, mode, playerDeckId, roomId, roomLocalSide],
  );

  const handleDeckSelectionBack = () => {
    if (mode === "bot" && soloDeckStep === "enemy") {
      setEnemyBattleDeckId(null);
      setSoloDeckStep("player");
      return;
    }

    setSoloDeckStep("player");
    setScreen(mode === "multiplayer" ? "lobby" : "menu");
  };

  const handleBattleActionConsumed = (actionId: string) => {
    setPendingBattleActions((prev) => prev.filter((action) => action.id !== actionId));
  };
  const handleBattleSnapshotPublished = (state: GameState) => {
    if (mode !== "multiplayer" || !activeRoomSession || roomLocalSide !== "player") return;
    activeRoomSession.publishBattleSnapshot(state);
  };

  return (
    <div className="h-screen w-full bg-[#1a1a1a] text-slate-100 selection:bg-amber-500/30 overflow-hidden relative">
      {/* Global Background Elements - Fantasy Style */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-amber-900/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[150px]" />
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20" />
      </div>

      <main
        className={`relative z-10 h-full w-full ${
          devSceneMode === "content-inspector" || devSceneMode === "content-editor"
            ? "overflow-y-auto overflow-x-hidden"
            : "overflow-hidden"
        }`}
      >
        {devSceneMode === "layout-editor" ? (
          <BattleLayoutEditor />
        ) : devSceneMode === "layout-preview" ? (
          <BattleLayoutPreview />
        ) : devSceneMode === "content-inspector" ? (
          <ContentInspector />
        ) : devSceneMode === "content-editor" ? (
          <ContentEditor />
        ) : !playerProfile || isEditingProfile ? (
          <ProfileSetup
            initialProfile={playerProfile}
            isEditing={!!playerProfile && isEditingProfile}
            onSave={handleSaveProfile}
          />
        ) : (
        <AnimatePresence mode="wait">
          {screen === "menu" && (
            <motion.div
              key="menu"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              {isMenuInputLocked ? <div className="absolute inset-0 z-[200] touch-manipulation" aria-hidden="true" /> : null}
              <Menu
                onSelectMode={handleSelectMode}
                onOpenCollection={handleOpenCollection}
                profile={playerProfile}
                onEditProfile={() => setIsEditingProfile(true)}
              />
            </motion.div>
          )}

          {screen === "deck-selection" && (
            <motion.div
              key="deck-selection"
              className="h-full w-full"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <DeckSelection 
                onSelectDeck={handleSelectDeck} 
                onBack={handleDeckSelectionBack}
                selectedDeckId={
                  mode === "bot" && soloDeckStep === "enemy"
                    ? battleDeckSelection.remoteDeck?.deckId
                    : battleDeckSelection.localDeck?.deckId
                }
                isPreparingBattle={isPreparingBattle}
                title={deckSelectionTitle}
                idleStatusTitle={deckSelectionIdleStatusTitle}
                phaseKey={deckSelectionPhaseKey}
                remoteSelectedDeckId={
                  mode === "multiplayer"
                    ? roomLocalSide === "player"
                      ? activeRoomState?.guest.deckId
                      : activeRoomState?.host.deckId
                    : undefined
                }
              />
            </motion.div>
          )}

          {screen === "collection" && (
            <motion.div
              key="collection"
              className="h-full w-full"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <CollectionScreen onBack={() => setScreen("menu")} />
            </motion.div>
          )}

          {screen === "lobby" && (
            <motion.div
              key="lobby"
              className="h-full w-full"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Lobby
                onBack={handleExit}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                localProfile={playerProfile}
                activeRoomId={roomId}
                localSide={roomLocalSide}
                roomState={activeRoomState}
                onStartRoom={handleStartRoom}
              />
            </motion.div>
          )}

          {screen === "battle" && battleDeckSelection.battleSetup && (
            <motion.div
              key="battle"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Battle 
                setup={battleDeckSelection.battleSetup}
                roomTransportKind={battleRoomServiceRef.current.kind}
                initialGameState={sharedInitialGame ?? undefined}
                authoritativeBattleSnapshot={sharedBattleSnapshot ?? undefined}
                localSide={roomLocalSide}
                localPlayerName={localBattleName}
                remotePlayerName={remoteBattleName}
                localPlayerAvatar={localBattleAvatar}
                remotePlayerAvatar={remoteBattleAvatar}
                pendingExternalAction={headPendingBattleAction}
                onExternalActionConsumed={handleBattleActionConsumed}
                onBattleSnapshotPublished={handleBattleSnapshotPublished}
                onActionRequested={handleBattleActionRequested}
                enableMockRoomBot={
                  mode === "multiplayer" &&
                  ENABLE_LOCAL_MULTIPLAYER_MOCK &&
                  roomLocalSide === "player" &&
                  battleRoomServiceRef.current.kind === "mock"
                }
                onExit={handleExit}
                onReturnToLobby={handleReturnToLobby}
                onChooseDecksAgain={mode === "multiplayer" ? handleChooseDecksAgain : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>
    </div>
  );
}
