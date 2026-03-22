import React, { useEffect, useRef, useState } from "react";
import { GameMode, Deck, BattleSide, BattleSubmittedAction, GameState } from "./types/game";
import { Menu } from "./components/screens/Menu";
import { DeckSelection } from "./components/screens/DeckSelection";
import { Lobby } from "./components/screens/Lobby";
import { Battle } from "./components/screens/Battle";
import { DECKS } from "./data/decks";
import { BattleRoomSession, BattleRoomState, createBattleRoomService } from "./lib/battleRoomSession";
import { SseBattleRoomConnector } from "./lib/battleRoomSseConnector";
import { AnimatePresence, motion } from "motion/react";
import { makeInitialGame } from "./logic/gameLogic";

type Screen = "menu" | "deck-selection" | "lobby" | "battle";
const MOCK_ROOM_LATENCY_MS = 180;
const MOCK_ROOM_DELIVERED_MS = 60;
const ENABLE_LOCAL_MULTIPLAYER_MOCK = true;
const RELAY_URL = import.meta.env.VITE_BATTLE_ROOM_RELAY_URL?.trim();

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("bot");
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [enemyBattleDeck, setEnemyBattleDeck] = useState<Deck | null>(null);
  const [roomId, setRoomId] = useState<string | undefined>();
  const [roomLocalSide, setRoomLocalSide] = useState<BattleSide>("player");
  const [activeRoomSession, setActiveRoomSession] = useState<BattleRoomSession | null>(null);
  const [activeRoomState, setActiveRoomState] = useState<BattleRoomState | null>(null);
  const [pendingBattleActions, setPendingBattleActions] = useState<BattleSubmittedAction[]>([]);
  const [sharedInitialGame, setSharedInitialGame] = useState<GameState | null>(null);
  const [sharedBattleSnapshot, setSharedBattleSnapshot] = useState<GameState | null>(null);
  const battleRoomServiceRef = useRef(
    createBattleRoomService(
      MOCK_ROOM_LATENCY_MS,
      RELAY_URL ? new SseBattleRoomConnector(RELAY_URL) : undefined,
    ),
  );

  const handleSelectMode = (selectedMode: GameMode) => {
    setMode(selectedMode);
    if (selectedMode === "multiplayer") {
      setScreen("lobby");
    } else {
      setScreen("deck-selection");
    }
  };

  const handleSelectDeck = (deck: Deck) => {
    if (mode === "multiplayer" && activeRoomSession) {
      setPlayerDeck(deck);
      activeRoomSession.selectDeck(deck.id);
      return;
    }

    setPlayerDeck(deck);
    setEnemyBattleDeck(null);
    setPendingBattleActions([]);
    setScreen("battle");
  };

  const handleCreateRoom = (id: string) => {
    const session = battleRoomServiceRef.current.createRoom(id);
    setRoomId(id);
    setRoomLocalSide(session.localSide);
    setActiveRoomSession(session);
    setActiveRoomState(session.getState());
    setPlayerDeck(null);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setPendingBattleActions([]);
    setScreen("lobby");
  };

  const handleJoinRoom = (id: string) => {
    const session = battleRoomServiceRef.current.joinRoom(id);
    setRoomId(id);
    setRoomLocalSide(session.localSide);
    setActiveRoomSession(session);
    setActiveRoomState(session.getState());
    setPlayerDeck(null);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
    setPendingBattleActions([]);
    setScreen("lobby");
  };

  const handleStartRoom = () => {
    activeRoomSession?.startDeckSelection();
  };

  const handleExit = () => {
    if (roomId) {
      battleRoomServiceRef.current.leaveRoom(roomId);
    }
    setScreen("menu");
    setPlayerDeck(null);
    setRoomId(undefined);
    setRoomLocalSide("player");
    setActiveRoomSession(null);
    setActiveRoomState(null);
    setPendingBattleActions([]);
    setEnemyBattleDeck(null);
    setSharedInitialGame(null);
    setSharedBattleSnapshot(null);
  };

  const handleBattleActionRequested = (action: BattleSubmittedAction) => {
    activeRoomSession?.submitAction(action);
  };

  useEffect(() => {
    if (!activeRoomSession) return;

    const unsubscribe = activeRoomSession.subscribe((action) => {
      setPendingBattleActions((prev) =>
        prev.some((queuedAction) => queuedAction.id === action.id) ? prev : [...prev, action],
      );
    });

    return unsubscribe;
  }, [activeRoomSession]);

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
      setScreen("lobby");
      return;
    }

    if (activeRoomState.phase === "deck-selection") {
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
    setScreen("battle");
  }, [activeRoomSession, activeRoomState, mode, roomId, roomLocalSide]);

  const headPendingBattleAction = pendingBattleActions[0] ?? null;
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
              <Menu onSelectMode={handleSelectMode} />
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
                onBack={() => setScreen(mode === "multiplayer" ? "lobby" : "menu")} 
                selectedDeckId={playerDeck?.id}
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
                enemyDeck={mode === "multiplayer" ? (enemyBattleDeck ?? DECKS[0]) : DECKS[Math.floor(Math.random() * DECKS.length)]}
                roomTransportKind={battleRoomServiceRef.current.kind}
                initialGameState={sharedInitialGame ?? undefined}
                authoritativeBattleSnapshot={sharedBattleSnapshot ?? undefined}
                roomId={roomId}
                localSide={roomLocalSide}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
