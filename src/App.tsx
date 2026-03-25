import React, { useEffect, useRef, useState } from "react";
import { GameMode, Deck, BattleSide, BattleSubmittedAction, GameState, PlayerProfile, normalizePlayerName } from "./types/game";
import { Menu } from "./components/screens/Menu";
import { DeckSelection } from "./components/screens/DeckSelection";
import { Lobby } from "./components/screens/Lobby";
import { Battle } from "./components/screens/Battle";
import { ProfileSetup } from "./components/screens/ProfileSetup";
import { BattleLayoutEditor } from "./components/screens/BattleLayoutEditor";
import { BattleLayoutPreview } from "./components/screens/BattleLayoutPreview";
import { DECKS } from "./data/decks";
import { BattleRoomSession, BattleRoomState, createBattleRoomService } from "./lib/battleRoomSession";
import { SseBattleRoomConnector } from "./lib/battleRoomSseConnector";
import { AnimatePresence, motion } from "motion/react";
import { makeInitialGame } from "./logic/gameLogic";

type Screen = "menu" | "deck-selection" | "lobby" | "battle";
type SoloDeckStep = "player" | "enemy";
type DevSceneMode = "layout-editor" | "layout-preview" | null;
const MOCK_ROOM_LATENCY_MS = 180;
const MOCK_ROOM_DELIVERED_MS = 60;
const ENABLE_LOCAL_MULTIPLAYER_MOCK = true;
const RELAY_URL = import.meta.env.VITE_BATTLE_ROOM_RELAY_URL?.trim();
const PLAYER_PROFILE_STORAGE_KEY = "syllable-battle:player-profile";

function compareBattleActions(a: BattleSubmittedAction, b: BattleSubmittedAction) {
  if (a.setupVersion !== b.setupVersion) return a.setupVersion - b.setupVersion;
  if (a.turn !== b.turn) return a.turn - b.turn;
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  if (a.side !== b.side) return a.side === "player" ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export default function App() {
  const devSceneMode: DevSceneMode = ((): DevSceneMode => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("battle-layout-editor") === "1") return "layout-editor";
    if (params.get("battle-layout-preview") === "1") return "layout-preview";
    return null;
  })();

  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PlayerProfile;
      if (!parsed?.name || !parsed?.avatar) return null;
      return {
        name: normalizePlayerName(parsed.name),
        avatar: parsed.avatar,
      };
    } catch {
      return null;
    }
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("bot");
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [enemyBattleDeck, setEnemyBattleDeck] = useState<Deck | null>(null);
  const [soloDeckStep, setSoloDeckStep] = useState<SoloDeckStep>("player");
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>();
  const [roomLocalSide, setRoomLocalSide] = useState<BattleSide>("player");
  const [activeRoomSession, setActiveRoomSession] = useState<BattleRoomSession | null>(null);
  const [activeRoomState, setActiveRoomState] = useState<BattleRoomState | null>(null);
  const [pendingBattleActions, setPendingBattleActions] = useState<BattleSubmittedAction[]>([]);
  const [sharedInitialGame, setSharedInitialGame] = useState<GameState | null>(null);
  const [sharedBattleSnapshot, setSharedBattleSnapshot] = useState<GameState | null>(null);
  const battleTransitionSetupVersionRef = useRef<number | null>(null);
  const battleTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownRoomProfilesRef = useRef({
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
    setPlayerDeck(null);
    setEnemyBattleDeck(null);
    setSoloDeckStep("player");
    if (selectedMode === "multiplayer") {
      setScreen("lobby");
    } else {
      setScreen("deck-selection");
    }
  };

  const clearBattleTransitionTimer = () => {
    if (!battleTransitionTimerRef.current) return;
    clearTimeout(battleTransitionTimerRef.current);
    battleTransitionTimerRef.current = null;
  };

  const handleSelectDeck = (deck: Deck) => {
    if (mode === "multiplayer" && activeRoomSession) {
      setPlayerDeck(deck);
      activeRoomSession.selectDeck(deck.id);
      return;
    }

    if (mode === "bot" && soloDeckStep === "player") {
      setPlayerDeck(deck);
      setEnemyBattleDeck(null);
      setSoloDeckStep("enemy");
      return;
    }

    if (mode === "bot" && soloDeckStep === "enemy") {
      setEnemyBattleDeck(deck);
      setPendingBattleActions([]);
      setScreen("battle");
      return;
    }

    setPlayerDeck(deck);
    setEnemyBattleDeck(null);
    setPendingBattleActions([]);
    setScreen("battle");
  };

  const handleCreateRoom = (id: string) => {
    if (!playerProfile) return;
    const session = battleRoomServiceRef.current.createRoom(id, playerProfile);
    setRoomId(id);
    setRoomLocalSide(session.localSide);
    setActiveRoomSession(session);
    setActiveRoomState(session.getState());
    setPlayerDeck(null);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setIsPreparingBattle(false);
    battleTransitionSetupVersionRef.current = null;
    clearBattleTransitionTimer();
    setPendingBattleActions([]);
    setScreen("lobby");
  };

  const handleJoinRoom = (id: string) => {
    if (!playerProfile) return;
    const session = battleRoomServiceRef.current.joinRoom(id, playerProfile);
    setRoomId(id);
    setRoomLocalSide(session.localSide);
    setActiveRoomSession(session);
    setActiveRoomState(session.getState());
    setPlayerDeck(null);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setIsPreparingBattle(false);
    battleTransitionSetupVersionRef.current = null;
    clearBattleTransitionTimer();
    setPendingBattleActions([]);
    setScreen("lobby");
  };

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
    setPlayerDeck(null);
    setSoloDeckStep("player");
    setRoomId(undefined);
    setRoomLocalSide("player");
    setActiveRoomSession(null);
    setActiveRoomState(null);
    setPendingBattleActions([]);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setIsPreparingBattle(false);
    battleTransitionSetupVersionRef.current = null;
    clearBattleTransitionTimer();
  };

  const handleSaveProfile = (profile: PlayerProfile) => {
    const normalizedProfile = {
      ...profile,
      name: normalizePlayerName(profile.name),
    };
    setPlayerProfile(normalizedProfile);
    setIsEditingProfile(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
    }
  };

  const handleBattleActionRequested = (action: BattleSubmittedAction) => {
    activeRoomSession?.submitAction(action);
  };

  useEffect(() => {
    if (!activeRoomSession) return;

    const unsubscribe = activeRoomSession.subscribe((action) => {
      setPendingBattleActions((prev) => {
        if (prev.some((queuedAction) => queuedAction.id === action.id)) return prev;
        return [...prev, action].sort(compareBattleActions);
      });
    });

    return unsubscribe;
  }, [activeRoomSession]);

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
  }, [activeRoomState]);

  useEffect(() => {
    if (!activeRoomSession) return;

    const unsubscribe = activeRoomSession.subscribeState((state) => {
      setActiveRoomState(state);
    });

    return unsubscribe;
  }, [activeRoomSession]);

  useEffect(() => {
    if (mode !== "multiplayer" || !activeRoomSession || !activeRoomState) return;

    setSharedInitialGame(activeRoomState.initialGame ?? null);
    setSharedBattleSnapshot(activeRoomState.battleSnapshot ?? null);
    const localDeckId = roomLocalSide === "player" ? activeRoomState.host.deckId : activeRoomState.guest.deckId;
    const remoteDeckId = roomLocalSide === "player" ? activeRoomState.guest.deckId : activeRoomState.host.deckId;
    const bothDecksSelected = !!localDeckId && !!remoteDeckId;

    if (activeRoomState.phase === "lobby") {
      clearBattleTransitionTimer();
      setIsPreparingBattle(false);
      battleTransitionSetupVersionRef.current = null;
      setPlayerDeck(null);
      setEnemyBattleDeck(null);
      setPendingBattleActions([]);
      setSharedInitialGame(null);
      setSharedBattleSnapshot(null);
      setScreen("lobby");
      return;
    }

    if (activeRoomState.phase === "deck-selection") {
      clearBattleTransitionTimer();
      setIsPreparingBattle(false);
      battleTransitionSetupVersionRef.current = null;
      setPlayerDeck(localDeckId ? (DECKS.find((deck) => deck.id === localDeckId) ?? null) : null);
      setEnemyBattleDeck(remoteDeckId ? (DECKS.find((deck) => deck.id === remoteDeckId) ?? null) : null);
      setPendingBattleActions([]);
      if (bothDecksSelected && !activeRoomState.initialGame && roomLocalSide === "player") {
        const nextPlayerDeck = DECKS.find((deck) => deck.id === localDeckId) ?? null;
        const nextEnemyDeck = DECKS.find((deck) => deck.id === remoteDeckId) ?? null;
        if (nextPlayerDeck && nextEnemyDeck) {
          activeRoomSession.publishBattleSetup(makeInitialGame("multiplayer", nextPlayerDeck, nextEnemyDeck, roomId));
        }
      }
      setScreen("deck-selection");
      return;
    }
    if (!localDeckId || !remoteDeckId) return;

    const nextPlayerDeck = DECKS.find((deck) => deck.id === localDeckId) ?? null;
    const nextEnemyDeck = DECKS.find((deck) => deck.id === remoteDeckId) ?? null;
    if (!nextPlayerDeck || !nextEnemyDeck) return;

    if (!activeRoomState.initialGame && roomLocalSide === "player") {
      activeRoomSession.publishBattleSetup(makeInitialGame("multiplayer", nextPlayerDeck, nextEnemyDeck, roomId));
      return;
    }

    if (!activeRoomState.initialGame) return;

    setPlayerDeck(nextPlayerDeck);
    setEnemyBattleDeck(nextEnemyDeck);
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
  }, [activeRoomSession, activeRoomState, mode, roomId, roomLocalSide]);

  useEffect(() => () => clearBattleTransitionTimer(), []);

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
  const handleDeckSelectionBack = () => {
    if (mode === "bot" && soloDeckStep === "enemy") {
      setEnemyBattleDeck(null);
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

      <main className="relative z-10 h-full w-full overflow-hidden">
        {devSceneMode === "layout-editor" ? (
          <BattleLayoutEditor />
        ) : devSceneMode === "layout-preview" ? (
          <BattleLayoutPreview />
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
              <Menu onSelectMode={handleSelectMode} profile={playerProfile} onEditProfile={() => setIsEditingProfile(true)} />
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
                selectedDeckId={mode === "bot" && soloDeckStep === "enemy" ? enemyBattleDeck?.id : playerDeck?.id}
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

          {screen === "battle" && playerDeck && (
            <motion.div
              key="battle"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Battle 
                mode={mode}
                playerDeck={playerDeck}
                enemyDeck={
                  mode === "multiplayer"
                    ? (enemyBattleDeck ?? DECKS[0])
                    : (enemyBattleDeck ?? DECKS[Math.floor(Math.random() * DECKS.length)])
                }
                roomTransportKind={battleRoomServiceRef.current.kind}
                initialGameState={sharedInitialGame ?? undefined}
                authoritativeBattleSnapshot={sharedBattleSnapshot ?? undefined}
                roomId={roomId}
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
