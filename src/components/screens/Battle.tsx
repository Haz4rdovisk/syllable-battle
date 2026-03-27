import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import {
  GameState,
  GameMode,
  Deck,
  Syllable,
  BattleEvent,
  BattleSide,
  BattleSubmittedAction,
  BattleTurnAction,
  CoinFace,
  ChronicleEntry,
  normalizePlayerName,
} from "../../types/game";
import {
  makeInitialGame,
  CONFIG,
  TIMINGS,
  isHandStuck,
  clearTransientPlayerState,
  replaceTargetInSlot,
} from "../../logic/gameLogic";
import {
  TargetCard,
  PlayerPortrait,
  CardPile,
  BoardZoneId,
  ZoneAnchorSnapshot,
  VisualTargetEntity,
} from "../game/GameComponents";
import { BattleBoardShell } from "./BattleBoardShell";
import { BattleBoardSurface, getBattleBoardSurfaceVars } from "./BattleBoardSurface";
import { BattleBoardMessage } from "./BattleBoardMessage";
import { BattlePillOverlay } from "./BattlePillOverlay";
import type {
  BattleAnimationAnchorPoint,
  BattleAnimationLayoutConfig,
} from "./BattleLayoutConfig";
import { useActiveBattleLayoutConfig } from "./BattleActiveLayout";
import {
  BattleFieldLane,
  BattleFieldLaneDebugSnapshot,
  BattleFieldOutgoingTarget,
} from "./BattleFieldLane";
import {
  BattleHandLane,
  BattleHandLaneDebugSnapshot,
  BattleHandLaneOutgoingCard,
} from "./BattleHandLane";
import { BattleHandFocusFrame, BattleTurnFocusTone } from "./BattleHandFocusFrame";
import { BattleSceneViewModel, createBattleBoardSurfaceViewModel } from "./BattleSceneViewModel";
import { BattlePileRail, BattleSinglePile } from "./BattleSidePanel";
import { BattleStatusPanel } from "./BattleStatusPanel";
import { BattleChroniclesPanel } from "./BattleChroniclesPanel";
import { BattleSceneView } from "./BattleSceneView";
import { BattleLeftSidebarView, BattleRightSidebarView } from "./BattleSidebarViews";
import { BattleActionButton } from "./BattleActionButton";
import { BattleEditableElement } from "./BattleEditableElement";
import { AnimatePresence, motion } from "motion/react";
import { BadgeDollarSign, Crown, LogOut, RotateCcw, Swords } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  createDamageAppliedEvent,
  createMulliganResolutionEvents,
  createPlayResolutionEvents,
  createTargetReplacedEvent,
  createTurnStartedEvent,
} from "./battleEvents";
import {
  getMulliganDrawStartDelayMs,
  getMulliganFinishDelayMs,
  getPlayDrawStartDelayMs,
  getPlayFinishDelayMs,
  getPlayedCardCommitDelayMs,
  resolveBotTurnAction,
} from "./battleFlow";
import { resolveBattleMulliganAction, resolveBattlePlayAction } from "./battleResolution";
import {
  BATTLE_STAGE_HEIGHT,
  BATTLE_STAGE_WIDTH,
} from "./BattleSceneSpace";

const PLAYER = 0;
const ENEMY = 1;
const zoneRefKey = (zoneId: BoardZoneId, slot: string) => `${zoneId}:${slot}`;
const HAND_LAYOUT_SLOT_COUNT = 5;
const FLOW = {
  cardToFieldMs: 660,
  cardSettleMs: 180,
  drawTravelMs: 940,
  drawStaggerMs: 130,
  drawSettleMs: 220,
  visualSettleBufferMs: 180,
  turnHandoffMs: 260,
  mulliganTurnHandoffMs: 140,
  attackWindupMs: 220,
  attackTravelMs: 1020,
  impactPauseMs: 260,
  targetExitMs: TIMINGS.leaveMs,
  replacementGapMs: 220,
  targetEnterMs: TIMINGS.leaveMs,
  targetSettleMs: 240,
  mulliganReturnMs: 760,
  mulliganReturnStaggerMs: 110,
  mulliganDrawDelayMs: 220,
  mulliganSettleMs: 260,
};

const TARGET_ATTACK_WINDUP_EXTRA_MS = 90;
const TARGET_ATTACK_TRAVEL_EXTRA_MS = 120;
const TARGET_ATTACK_EXIT_EXTRA_MS = 180;

const INTRO = {
  coinChoiceMs: 20000,
  coinDropMs: 1920,
  coinSettleMs: 620,
  coinResultHoldMs: 3400,
  coinResultFaceMs: 1450,
  targetEnterStaggerMs: 220,
  targetSettleMs: 560,
};

const TURN_PRESENTATION = {
  preBannerDelayMs: 80,
  bannerDurationMs: 1120,
  interactionReleaseBufferMs: 90,
};

const TURN_TIMER = {
  limitMs: 60000,
  warningMs: 15000,
};

const TURN_RELEASE_DELAY_MS =
  TURN_PRESENTATION.preBannerDelayMs +
  TURN_PRESENTATION.bannerDurationMs +
  TURN_PRESENTATION.interactionReleaseBufferMs;

function getTurnCycleKey(state: Pick<GameState, "setupVersion" | "turn" | "turnDeadlineAt" | "openingIntroStep">) {
  return state.openingIntroStep !== "done"
    ? `${state.setupVersion}:intro`
    : `${state.setupVersion}:${state.turn}:${state.turnDeadlineAt ?? "na"}`;
}

function getTurnPresentationKey(state: Pick<GameState, "setupVersion" | "turn" | "openingIntroStep">) {
  return state.openingIntroStep !== "done"
    ? `${state.setupVersion}:intro`
    : `${state.setupVersion}:${state.turn}`;
}

const SNAPSHOT_INTRO_PROGRESS: Record<BattleIntroPhase, number> = {
  "coin-choice": 0,
  "coin-fall": 1,
  "coin-result": 2,
  targets: 3,
  done: 4,
};

function compareBattleSnapshotProgress(next: GameState, current: GameState) {
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

type BattleIntroPhase = "coin-choice" | "coin-fall" | "coin-result" | "targets" | "done";

interface VisualHandCard {
  id: string;
  syllable: Syllable;
  side: typeof PLAYER | typeof ENEMY;
  hidden: boolean;
  skipEntryAnimation?: boolean;
}

type StableHandsState = Record<typeof PLAYER | typeof ENEMY, VisualHandCard[]>;

interface IncomingHandCard {
  id: string;
  side: typeof PLAYER | typeof ENEMY;
  card: VisualHandCard;
  origin: ZoneAnchorSnapshot;
  finalIndex: number;
  finalTotal: number;
  delayMs: number;
  durationMs: number;
}

type StableTargetsState = Record<typeof PLAYER | typeof ENEMY, Array<VisualTargetEntity | null>>;
type LockedTargetSlotsState = Record<typeof PLAYER | typeof ENEMY, boolean[]>;
type PendingTargetPlacementsState = Record<typeof PLAYER | typeof ENEMY, Array<Syllable | null>>;

interface IncomingTargetCard {
  id: string;
  side: typeof PLAYER | typeof ENEMY;
  slotIndex: number;
  entity: VisualTargetEntity;
  origin: ZoneAnchorSnapshot;
  delayMs: number;
  durationMs: number;
}

interface OutgoingTargetCard {
  id: string;
  side: typeof PLAYER | typeof ENEMY;
  slotIndex: number;
  entity: VisualTargetEntity;
  impactDestination?: ZoneAnchorSnapshot | null;
  destination: ZoneAnchorSnapshot;
  delayMs: number;
  windupMs: number;
  attackMs: number;
  pauseMs: number;
  exitMs: number;
}

interface MulliganDebugState {
  source: string;
  requestedIndexes: number[];
  requestedSyllables: string[];
  removedStableCards: string[];
  drawnCards: string[];
  externalActionId: string | null;
  clearIncomingHand: boolean;
}

interface PendingMulliganDraw {
  syllable: Syllable;
  finalIndex: number;
  finalTotal: number;
  originOverride: ZoneAnchorSnapshot | null;
}

interface AnimationFallbackEvent {
  id: string;
  label: string;
  reason: string;
  fallback: string;
  createdAt: number;
}

interface BattleDevWatcherSample {
  id: number;
  at: number;
  reason: "init" | "change";
  snapshot: unknown;
}

interface BattleProps {
  mode: GameMode;
  playerDeck: Deck;
  enemyDeck: Deck;
  localPlayerName?: string;
  remotePlayerName?: string;
  localPlayerAvatar?: string;
  remotePlayerAvatar?: string;
  roomTransportKind?: "mock" | "broadcast" | "remote";
  initialGameState?: GameState;
  authoritativeBattleSnapshot?: GameState;
  roomId?: string;
  localSide?: BattleSide;
  pendingExternalAction?: BattleSubmittedAction | null;
  onExternalActionConsumed?: (actionId: string) => void;
  onBattleSnapshotPublished?: (state: GameState) => void;
  onActionRequested?: (action: BattleSubmittedAction) => void;
  enableMockRoomBot?: boolean;
  onExit: () => void;
  onReturnToLobby?: () => void;
  onChooseDecksAgain?: () => void;
}

type LiveBattleAnimationAnchorKey = keyof BattleAnimationLayoutConfig;

export const Battle: React.FC<BattleProps> = ({
  mode,
  playerDeck,
  enemyDeck,
  localPlayerName = "VOCE",
  remotePlayerName = "OPONENTE",
  localPlayerAvatar = "\u{1F9D9}\u200D\u2642\uFE0F",
  remotePlayerAvatar = "\u{1F479}",
  roomTransportKind,
  initialGameState,
  authoritativeBattleSnapshot,
  roomId,
  localSide = "player",
  pendingExternalAction = null,
  onExternalActionConsumed,
  onBattleSnapshotPublished,
  onActionRequested,
  enableMockRoomBot = false,
  onExit,
  onReturnToLobby,
  onChooseDecksAgain,
}) => {
  const activeBattleLayout = useActiveBattleLayoutConfig();
  const boardVars = getBattleBoardSurfaceVars(activeBattleLayout);
  const localPlayerIndex = localSide === "player" ? PLAYER : ENEMY;
  const remotePlayerIndex = localPlayerIndex === PLAYER ? ENEMY : PLAYER;
  const getTurnMessageTitle = useCallback(
    (turnIndex: number) => (turnIndex === localPlayerIndex ? "Sua vez" : "Vez do oponente"),
    [localPlayerIndex],
  );
  const zoneIdForSide = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      role: "hand" | "field" | "deck" | "targetDeck" | "discard",
    ): BoardZoneId => {
      const isLocal = side === localPlayerIndex;
      if (role === "hand") return isLocal ? "playerHand" : "enemyHand";
      if (role === "field") return isLocal ? "playerField" : "enemyField";
      if (role === "deck") return isLocal ? "playerDeck" : "enemyDeck";
      if (role === "targetDeck") return isLocal ? "playerTargetDeck" : "enemyTargetDeck";
      return isLocal ? "playerDiscard" : "enemyDiscard";
    },
    [localPlayerIndex],
  );
  const initialGameRef = useRef<GameState | null>(null);
  const cloneInitialGame = useCallback(
    (source: GameState) => structuredClone(source),
    [],
  );

  const isFreshBattleState = useCallback(
    (state: GameState) =>
      state.winner === null &&
      !state.actedThisTurn &&
      !state.combatLocked &&
      state.players.every(
        (player) =>
          player.flashDamage === 0 &&
          player.lastDrawnCount === 0 &&
          player.targets.length === CONFIG.targetsInPlay &&
          player.targets.every((target) => target.progress.length === 0),
      ),
    [],
  );
  if (!initialGameRef.current) {
    initialGameRef.current = initialGameState ? cloneInitialGame(initialGameState) : makeInitialGame(mode, playerDeck, enemyDeck, roomId);
  }
  const shouldRunInitialPresentationRef = useRef(
    isFreshBattleState(initialGameRef.current) && initialGameRef.current.openingIntroStep !== "done",
  );

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [turnRemainingMs, setTurnRemainingMs] = useState(
    initialGameRef.current.turnDeadlineAt ? Math.max(0, initialGameRef.current.turnDeadlineAt - Date.now()) : TURN_TIMER.limitMs,
  );
  const [enemyHandPulse, setEnemyHandPulse] = useState(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [introPhase, setIntroPhase] = useState<BattleIntroPhase>(initialGameRef.current.openingIntroStep);
  const [openingTurnSide, setOpeningTurnSide] = useState<typeof PLAYER | typeof ENEMY>(initialGameRef.current.turn as typeof PLAYER | typeof ENEMY);
  const [coinResultStage, setCoinResultStage] = useState<"face" | "starter">("face");
  const [selectedCoinFace, setSelectedCoinFace] = useState<CoinFace | null>(null);
  const [revealedCoinFace, setRevealedCoinFace] = useState<CoinFace | null>(null);
  const [plannedCoinFace, setPlannedCoinFace] = useState<CoinFace | null>(null);
  const [coinChoiceRemainingMs, setCoinChoiceRemainingMs] = useState(
    initialGameRef.current.openingIntroStep === "coin-choice" ? INTRO.coinChoiceMs : 0,
  );
  const [turnPresentationLocked, setTurnPresentationLocked] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1024,
  );
  const [game, setGame] = useState<GameState>(initialGameRef.current);

  const actionTimersRef = useRef<NodeJS.Timeout[]>([]);
  const visualTimersRef = useRef<NodeJS.Timeout[]>([]);
  const gameRef = useRef<GameState>(initialGameRef.current);
  const zoneNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const handCardNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const handLaneDebugRef = useRef<Record<string, BattleHandLaneDebugSnapshot | null>>({});
  const fieldLaneDebugRef = useRef<Record<string, BattleFieldLaneDebugSnapshot | null>>({});
  const handCardIdRef = useRef(0);
  const battleEventIdRef = useRef(0);
  const battleEventsRef = useRef<BattleEvent[]>([]);
  const battleActionIdRef = useRef(0);
  const actionSequenceRef = useRef<Record<typeof PLAYER | typeof ENEMY, number>>({
    [PLAYER]: 0,
    [ENEMY]: 0,
  });
  const processedExternalActionIdsRef = useRef<Set<string>>(new Set());
  const pendingAuthoritativeSnapshotRef = useRef<GameState | null>(null);
  const publishedSnapshotSignatureRef = useRef<string>("");
  const timedOutTurnKeyRef = useRef("");
  const presentedTurnKeyRef = useRef(getTurnPresentationKey(initialGameRef.current));
  const createVisualHandCard = useCallback(
    (syllable: Syllable, side: typeof PLAYER | typeof ENEMY): VisualHandCard => ({
      id: `hand-card-${side}-${handCardIdRef.current++}`,
      syllable,
      side,
      hidden: side === ENEMY,
      skipEntryAnimation: false,
    }),
    [],
  );
  const buildStableHands = useCallback(
    (state: GameState): StableHandsState => ({
      [PLAYER]: state.players[PLAYER].hand.map((syllable) => createVisualHandCard(syllable, PLAYER)),
      [ENEMY]: state.players[ENEMY].hand.map((syllable) => createVisualHandCard(syllable, ENEMY)),
    }),
    [createVisualHandCard],
  );
  const toVisualTarget = useCallback(
    (
      target: GameState["players"][0]["targets"][number],
      side: typeof PLAYER | typeof ENEMY,
      slotIndex: number,
    ): VisualTargetEntity => ({
      id: target.uiId,
      side: side === localPlayerIndex ? "player" : "enemy",
      slotIndex,
      target: {
        ...target,
        entering: false,
        attacking: false,
        leaving: false,
        justArrived: false,
      },
    }),
    [localPlayerIndex],
  );
  const buildStableTargets = useCallback(
    (state: GameState): StableTargetsState => ({
      [PLAYER]: state.players[PLAYER].targets.map((target, index) => toVisualTarget(target, PLAYER, index)),
      [ENEMY]: state.players[ENEMY].targets.map((target, index) => toVisualTarget(target, ENEMY, index)),
    }),
    [toVisualTarget],
  );
  const createEmptyStableTargets = useCallback(
    (): StableTargetsState => ({
      [PLAYER]: Array(CONFIG.targetsInPlay).fill(null),
      [ENEMY]: Array(CONFIG.targetsInPlay).fill(null),
    }),
    [],
  );
  const [stableHands, setStableHands] = useState<StableHandsState>(() => buildStableHands(initialGameRef.current!));
  const stableHandsRef = useRef<StableHandsState>(stableHands);
  const [stableTargets, setStableTargets] = useState<StableTargetsState>(() =>
    initialGameRef.current!.openingIntroStep === "done" ? buildStableTargets(initialGameRef.current!) : createEmptyStableTargets(),
  );
  const stableTargetsRef = useRef<StableTargetsState>(stableTargets);
  const [incomingHands, setIncomingHands] = useState<Record<typeof PLAYER | typeof ENEMY, IncomingHandCard[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const incomingHandsRef = useRef(incomingHands);
  const [outgoingHands, setOutgoingHands] = useState<Record<typeof PLAYER | typeof ENEMY, BattleHandLaneOutgoingCard[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const outgoingHandsRef = useRef(outgoingHands);
  const [pendingMulliganDrawCounts, setPendingMulliganDrawCounts] = useState<Record<typeof PLAYER | typeof ENEMY, number>>({
    [PLAYER]: 0,
    [ENEMY]: 0,
  });
  const pendingMulliganDrawCountsRef = useRef(pendingMulliganDrawCounts);
  const pendingMulliganDrawQueuesRef = useRef<Record<typeof PLAYER | typeof ENEMY, PendingMulliganDraw[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [incomingTargets, setIncomingTargets] = useState<Record<typeof PLAYER | typeof ENEMY, IncomingTargetCard[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const incomingTargetsRef = useRef(incomingTargets);
  const [outgoingTargets, setOutgoingTargets] = useState<Record<typeof PLAYER | typeof ENEMY, OutgoingTargetCard[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const outgoingTargetsRef = useRef(outgoingTargets);
  const [lockedTargetSlots, setLockedTargetSlots] = useState<LockedTargetSlotsState>({
    [PLAYER]: Array(CONFIG.targetsInPlay).fill(false),
    [ENEMY]: Array(CONFIG.targetsInPlay).fill(false),
  });
  const lockedTargetSlotsRef = useRef(lockedTargetSlots);
  const [pendingTargetPlacements, setPendingTargetPlacements] = useState<PendingTargetPlacementsState>({
    [PLAYER]: Array(CONFIG.targetsInPlay).fill(null),
    [ENEMY]: Array(CONFIG.targetsInPlay).fill(null),
  });
  const pendingTargetPlacementsRef = useRef(pendingTargetPlacements);
  const [freshCardIds, setFreshCardIds] = useState<string[]>([]);
  const [mulliganDebug, setMulliganDebug] = useState<MulliganDebugState>({
    source: "idle",
    requestedIndexes: [],
    requestedSyllables: [],
    removedStableCards: [],
    drawnCards: [],
    externalActionId: null,
    clearIncomingHand: false,
  });
  const [animationFallbackHistoryVersion, setAnimationFallbackHistoryVersion] = useState(0);
  const [battleDebugWatcherVersion, setBattleDebugWatcherVersion] = useState(0);
  const animationFallbackHistoryRef = useRef<AnimationFallbackEvent[]>([]);
  const animationFallbackIdRef = useRef(0);
  const battleDebugSamplesRef = useRef<BattleDevWatcherSample[]>([]);
  const battleDebugSampleIdRef = useRef(0);
  const battleDebugStartedAtRef = useRef<number | null>(null);
  const battleDebugLastSignatureRef = useRef("");
  const buildBattleDevSnapshotRef = useRef<() => unknown>(() => null);
  gameRef.current = game;
  const previousEnemyHandSignatureRef = useRef<string>("");
  const lastHiddenAtRef = useRef<number | null>(null);
  const needsVisibilityRecoveryRef = useRef(false);
  const pendingResultOverlayRecoveryRef = useRef(false);

  const addLog = (log: ChronicleEntry[], entry: ChronicleEntry) => [entry, ...log].slice(0, CONFIG.logSize);
  const chronicleToneForSide = useCallback(
    (side: typeof PLAYER | typeof ENEMY): ChronicleEntry["tone"] => (side === localPlayerIndex ? "player" : "enemy"),
    [localPlayerIndex],
  );
  const chronicleActorLabel = useCallback(
    (side: typeof PLAYER | typeof ENEMY) => (side === localPlayerIndex ? "Voce" : "Oponente"),
    [localPlayerIndex],
  );
  const buildPlayChronicleEntries = useCallback(
    (side: typeof PLAYER | typeof ENEMY, result: PlayResolution, targetName: string): ChronicleEntry[] => {
      const actorLabel = chronicleActorLabel(side);
      const tone = chronicleToneForSide(side);
      const entries: ChronicleEntry[] = [
        { text: `${actorLabel} colocou ${result.playedCard} em ${targetName}`, tone },
      ];

      if (result.damage > 0) {
        entries.push({
          text: `${actorLabel} concluiu ${result.damageSource} e causou ${result.damage} de dano`,
          tone,
        });
      }

      return entries;
    },
    [chronicleActorLabel, chronicleToneForSide],
  );
  const buildHandSwapChronicleEntry = useCallback(
    (side: typeof PLAYER | typeof ENEMY, returnedCount: number): ChronicleEntry => ({
      text:
        side === localPlayerIndex
          ? `Voce trocou ${returnedCount} ${returnedCount === 1 ? "carta" : "cartas"} da mao`
          : `Oponente trocou ${returnedCount} ${returnedCount === 1 ? "carta" : "cartas"} da mao`,
      tone: chronicleToneForSide(side),
    }),
    [chronicleToneForSide, localPlayerIndex],
  );
  const emitBattleEvent = useCallback((event: Omit<BattleEvent, "id" | "createdAt">) => {
    battleEventsRef.current = [
      ...battleEventsRef.current.slice(-199),
      {
        ...event,
        id: `battle-event-${battleEventIdRef.current++}`,
        createdAt: Date.now(),
      } as BattleEvent,
    ];
  }, []);
  const emitTurnStartedEvent = useCallback(
    (turn: number, side: typeof PLAYER | typeof ENEMY) => {
      emitBattleEvent(createTurnStartedEvent(turn, side));
    },
    [emitBattleEvent],
  );
  const emitDamageAppliedEvent = useCallback(
    (
      turn: number,
      sourceSide: typeof PLAYER | typeof ENEMY,
      targetSide: typeof PLAYER | typeof ENEMY,
      amount: number,
      sourceTargetName: string,
      lifeAfter: number,
    ) => {
      emitBattleEvent(createDamageAppliedEvent(turn, sourceSide, targetSide, amount, sourceTargetName, lifeAfter));
    },
    [emitBattleEvent],
  );
  const emitTargetReplacedEvent = useCallback(
    (
      turn: number,
      side: typeof PLAYER | typeof ENEMY,
      slotIndex: number,
      previousTargetName: string,
      nextTargetName: string,
    ) => {
      const event = createTargetReplacedEvent(turn, side, slotIndex, previousTargetName, nextTargetName);
      if (!event) return;
      emitBattleEvent(event);
    },
    [emitBattleEvent],
  );

  const clearAllTimers = useCallback(() => {
    actionTimersRef.current.forEach(clearTimeout);
    actionTimersRef.current = [];
  }, []);

  const clearVisualTimers = useCallback(() => {
    visualTimersRef.current.forEach(clearTimeout);
    visualTimersRef.current = [];
  }, []);

  const commitStableHands = useCallback((nextHands: StableHandsState) => {
    stableHandsRef.current = nextHands;
    setStableHands(nextHands);
  }, []);

  const commitStableTargets = useCallback((nextTargets: StableTargetsState) => {
    stableTargetsRef.current = nextTargets;
    setStableTargets(nextTargets);
  }, []);

  const commitIncomingHands = useCallback(
    (nextHands: Record<typeof PLAYER | typeof ENEMY, IncomingHandCard[]>) => {
      incomingHandsRef.current = nextHands;
      setIncomingHands(nextHands);
    },
    [],
  );

  const commitOutgoingHands = useCallback(
    (nextHands: Record<typeof PLAYER | typeof ENEMY, BattleHandLaneOutgoingCard[]>) => {
      outgoingHandsRef.current = nextHands;
      setOutgoingHands(nextHands);
    },
    [],
  );

  const commitPendingMulliganDrawCounts = useCallback(
    (nextCounts: Record<typeof PLAYER | typeof ENEMY, number>) => {
      pendingMulliganDrawCountsRef.current = nextCounts;
      setPendingMulliganDrawCounts(nextCounts);
    },
    [],
  );

  const commitIncomingTargets = useCallback(
    (nextTargets: Record<typeof PLAYER | typeof ENEMY, IncomingTargetCard[]>) => {
      incomingTargetsRef.current = nextTargets;
      setIncomingTargets(nextTargets);
    },
    [],
  );

  const commitOutgoingTargets = useCallback(
    (nextTargets: Record<typeof PLAYER | typeof ENEMY, OutgoingTargetCard[]>) => {
      outgoingTargetsRef.current = nextTargets;
      setOutgoingTargets(nextTargets);
    },
    [],
  );

  const commitLockedTargetSlots = useCallback((nextLockedSlots: LockedTargetSlotsState) => {
    lockedTargetSlotsRef.current = nextLockedSlots;
    setLockedTargetSlots(nextLockedSlots);
  }, []);

  const commitPendingTargetPlacements = useCallback((nextPending: PendingTargetPlacementsState) => {
    pendingTargetPlacementsRef.current = nextPending;
    setPendingTargetPlacements(nextPending);
  }, []);

  const reconcileStableSide = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      logicalHand: Syllable[],
      currentStableSide: VisualHandCard[],
    ) => {
      const buckets = new Map<string, VisualHandCard[]>();
      currentStableSide.forEach((card) => {
        const bucket = buckets.get(card.syllable) ?? [];
        bucket.push(card);
        buckets.set(card.syllable, bucket);
      });

      return logicalHand.map((syllable) => {
        const bucket = buckets.get(syllable);
        if (bucket && bucket.length > 0) {
          return bucket.shift()!;
        }

        return createVisualHandCard(syllable, side);
      });
    },
    [createVisualHandCard],
  );

  const removeStableCards = useCallback(
    (side: typeof PLAYER | typeof ENEMY, indexes: number[]) => {
      const current = stableHandsRef.current;
      const sortedIndexes = [...new Set(indexes)].sort((a, b) => b - a);
      const nextSide = [...current[side]];
      const removed: VisualHandCard[] = [];

      sortedIndexes.forEach((index) => {
        const card = nextSide[index];
        if (!card) return;
        removed.unshift(card);
        nextSide.splice(index, 1);
      });

      commitStableHands({
        ...current,
        [side]: nextSide,
      });
      setFreshCardIds((prev) => prev.filter((id) => !removed.some((card) => card.id === id)));

      return removed;
    },
    [commitStableHands],
  );

  const appendStableCard = useCallback(
    (side: typeof PLAYER | typeof ENEMY, card: VisualHandCard, options?: { skipEntryAnimation?: boolean }) => {
      const current = stableHandsRef.current;
      commitStableHands({
        ...current,
        [side]: [
          ...current[side],
          {
            ...card,
            skipEntryAnimation: options?.skipEntryAnimation ?? card.skipEntryAnimation ?? false,
          },
        ],
      });
    },
    [commitStableHands],
  );

  const appendIncomingCard = useCallback(
    (side: typeof PLAYER | typeof ENEMY, incomingCard: IncomingHandCard) => {
      const current = incomingHandsRef.current;
      commitIncomingHands({
        ...current,
        [side]: [...current[side], incomingCard],
      });
    },
    [commitIncomingHands],
  );

  const appendOutgoingCard = useCallback(
    (side: typeof PLAYER | typeof ENEMY, outgoingCard: BattleHandLaneOutgoingCard) => {
      const current = outgoingHandsRef.current;
      commitOutgoingHands({
        ...current,
        [side]: [...current[side], outgoingCard],
      });
    },
    [commitOutgoingHands],
  );

  const removeIncomingCard = useCallback(
    (side: typeof PLAYER | typeof ENEMY, id: string) => {
      const current = incomingHandsRef.current;
      commitIncomingHands({
        ...current,
        [side]: current[side].filter((card) => card.id !== id),
      });
    },
    [commitIncomingHands],
  );

  const removeOutgoingCard = useCallback(
    (side: typeof PLAYER | typeof ENEMY, id: string) => {
      const current = outgoingHandsRef.current;
      commitOutgoingHands({
        ...current,
        [side]: current[side].filter((card) => card.id !== id),
      });
    },
    [commitOutgoingHands],
  );

  const markFreshCard = useCallback((cardId: string) => {
    setFreshCardIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
    const timer = setTimeout(() => {
      setFreshCardIds((prev) => prev.filter((id) => id !== cardId));
    }, 1800);
    visualTimersRef.current.push(timer);
  }, []);

  const bindZoneRef = useCallback(
    (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => {
      zoneNodesRef.current[zoneRefKey(zoneId, slot)] = node;
    },
    [],
  );

  const bindHandCardRef = useCallback(
    (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => {
      handCardNodesRef.current[`${cardId}:${layoutId}`] = node;
    },
    [],
  );
  const setHandLaneDebugSnapshot = useCallback(
    (key: string, snapshot: BattleHandLaneDebugSnapshot) => {
      handLaneDebugRef.current[key] = snapshot;
    },
    [],
  );
  const setFieldLaneDebugSnapshot = useCallback(
    (key: string, snapshot: BattleFieldLaneDebugSnapshot) => {
      fieldLaneDebugRef.current[key] = snapshot;
    },
    [],
  );

  const snapshotZone = useCallback((zoneId: BoardZoneId): ZoneAnchorSnapshot | null => {
    const bestNode = Object.entries(zoneNodesRef.current)
      .filter(([key, node]) => key.startsWith(`${zoneId}:`) && node)
      .map(([, node]) => node as HTMLDivElement)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0];

    if (!bestNode) return null;

    const { left, top, width, height } = bestNode.rect;
    return { left, top, width, height };
  }, []);

  const snapshotZoneSlot = useCallback((zoneId: BoardZoneId, slot: string): ZoneAnchorSnapshot | null => {
    const node = zoneNodesRef.current[zoneRefKey(zoneId, slot)];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const snapshotHandCard = useCallback((cardId: string): ZoneAnchorSnapshot | null => {
    const bestNode = Object.entries(handCardNodesRef.current)
      .filter(([key, node]) => key.startsWith(`${cardId}:`) && node)
      .map(([, node]) => node as HTMLDivElement)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0];

    if (!bestNode) return null;

    const { left, top, width, height } = bestNode.rect;
    return {
      left,
      top,
      width,
      height,
    };
  }, []);

  const resolveBattleStageMetrics = useCallback(() => {
    const selector = '[data-battle-stage-root="true"]';
    if (typeof document === "undefined") {
      return {
        selector,
        rootCount: 0,
        root: null as HTMLElement | null,
        rect: null as DOMRect | null,
        scaleX: null as number | null,
        scaleY: null as number | null,
        reason: "no-document" as string | null,
      };
    }

    const roots = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const root = roots[0] ?? null;
    if (!root) {
      return {
        selector,
        rootCount: roots.length,
        root,
        rect: null,
        scaleX: null,
        scaleY: null,
        reason: "stage-root-missing",
      };
    }

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return {
        selector,
        rootCount: roots.length,
        root,
        rect,
        scaleX: null,
        scaleY: null,
        reason: `stage-rect-invalid:${Math.round(rect.width)}x${Math.round(rect.height)}`,
      };
    }

    return {
      selector,
      rootCount: roots.length,
      root,
      rect,
      scaleX: rect.width / BATTLE_STAGE_WIDTH,
      scaleY: rect.height / BATTLE_STAGE_HEIGHT,
      reason: null,
    };
  }, []);

  const serializeZoneAnchorSnapshot = useCallback((snapshot: ZoneAnchorSnapshot | null | undefined) => {
    if (!snapshot) return null;
    return {
      left: Math.round(snapshot.left),
      top: Math.round(snapshot.top),
      width: Math.round(snapshot.width),
      height: Math.round(snapshot.height),
    };
  }, []);

  const snapshotSceneAnimationOrigin = useCallback(
    (point: { x: number; y: number } | null | undefined): ZoneAnchorSnapshot | null => {
      if (!point) return null;
      const stageMetrics = resolveBattleStageMetrics();
      if (!stageMetrics.rect || stageMetrics.scaleX == null || stageMetrics.scaleY == null) {
        return null;
      }
      return {
        left: stageMetrics.rect.left + point.x * stageMetrics.scaleX,
        top: stageMetrics.rect.top + point.y * stageMetrics.scaleY,
        width: 0,
        height: 0,
      };
    },
    [resolveBattleStageMetrics],
  );
  const getSceneAnimationOriginFailureReason = useCallback(
    (point: { x: number; y: number } | null | undefined) => {
      if (!point) return "anchor-not-set";
      return resolveBattleStageMetrics().reason;
    },
    [resolveBattleStageMetrics],
  );
  const pushAnimationFallbackEvent = useCallback((label: string, reason: string, fallback: string) => {
    animationFallbackHistoryRef.current = [
      {
        id: `anim-fallback-${animationFallbackIdRef.current++}`,
        label,
        reason,
        fallback,
        createdAt: Date.now(),
      },
      ...animationFallbackHistoryRef.current,
    ].slice(0, 16);
    setAnimationFallbackHistoryVersion((value) => value + 1);
  }, []);
  const snapshotSceneAnimationOriginWithFallback = useCallback(
    (
      label: string,
      point: { x: number; y: number } | null | undefined,
      fallback: string,
    ) => {
      const snapshot = snapshotSceneAnimationOrigin(point);
      if (snapshot) return snapshot;
      const reason = getSceneAnimationOriginFailureReason(point) ?? "snapshot-null";
      pushAnimationFallbackEvent(label, reason, fallback);
      return null;
    },
    [getSceneAnimationOriginFailureReason, pushAnimationFallbackEvent, snapshotSceneAnimationOrigin],
  );
  const getPostPlayHandDrawOriginSnapshot = useCallback(
    (side: typeof PLAYER | typeof ENEMY) => {
      if (side !== localPlayerIndex) return null;
      return snapshotSceneAnimationOriginWithFallback(
        "post-play-hand-draw",
        activeBattleLayout.animations.postPlayHandDrawOrigin,
        "deck",
      );
    },
    [activeBattleLayout.animations.postPlayHandDrawOrigin, localPlayerIndex, snapshotSceneAnimationOriginWithFallback],
  );
  const handPlayTargetPointsByIndex = useMemo(
    () => ({
      0: activeBattleLayout.animations.handPlayTarget0Destination,
      1: activeBattleLayout.animations.handPlayTarget1Destination,
    }),
    [
      activeBattleLayout.animations.handPlayTarget0Destination,
      activeBattleLayout.animations.handPlayTarget1Destination,
    ],
  );
  const getHandPlayTargetDestinationSnapshot = useCallback(
    (side: typeof PLAYER | typeof ENEMY, targetIndex: number) => {
      if (side !== localPlayerIndex) return null;
      if (targetIndex !== 0 && targetIndex !== 1) {
        return null;
      }
      return snapshotSceneAnimationOriginWithFallback(
        `hand-play-target-${targetIndex}`,
        handPlayTargetPointsByIndex[targetIndex],
        `player-field-slot-${targetIndex}`,
      );
    },
    [handPlayTargetPointsByIndex, localPlayerIndex, snapshotSceneAnimationOriginWithFallback],
  );
  const replacementTargetEntryPointsByIndex = useMemo(
    () => ({
      0: activeBattleLayout.animations.replacementTargetEntry0Origin,
      1: activeBattleLayout.animations.replacementTargetEntry1Origin,
      2: activeBattleLayout.animations.replacementTargetEntry2Origin,
      3: activeBattleLayout.animations.replacementTargetEntry3Origin,
    }),
    [
      activeBattleLayout.animations.replacementTargetEntry0Origin,
      activeBattleLayout.animations.replacementTargetEntry1Origin,
      activeBattleLayout.animations.replacementTargetEntry2Origin,
      activeBattleLayout.animations.replacementTargetEntry3Origin,
    ],
  );
  const getReplacementTargetEntryOriginSnapshot = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number) => {
      if (slotIndex !== 0 && slotIndex !== 1) return null;
      const replacementIndex = side * CONFIG.targetsInPlay + slotIndex;
      return snapshotSceneAnimationOriginWithFallback(
        `replacement-target-entry-${replacementIndex}`,
        replacementTargetEntryPointsByIndex[replacementIndex],
        `${side === PLAYER ? "player" : "enemy"}-target-deck`,
      );
    },
    [replacementTargetEntryPointsByIndex, snapshotSceneAnimationOriginWithFallback],
  );
  const mulliganReturnPointsByCount = useMemo(
    () => ({
      1: activeBattleLayout.animations.mulliganReturn1Destination,
      2: activeBattleLayout.animations.mulliganReturn2Destination,
      3: activeBattleLayout.animations.mulliganReturn3Destination,
    }),
    [
      activeBattleLayout.animations.mulliganReturn1Destination,
      activeBattleLayout.animations.mulliganReturn2Destination,
      activeBattleLayout.animations.mulliganReturn3Destination,
    ],
  );
  const mulliganDrawPointsByCount = useMemo(
    () => ({
      1: activeBattleLayout.animations.mulliganDraw1Origin,
      2: activeBattleLayout.animations.mulliganDraw2Origin,
      3: activeBattleLayout.animations.mulliganDraw3Origin,
    }),
    [
      activeBattleLayout.animations.mulliganDraw1Origin,
      activeBattleLayout.animations.mulliganDraw2Origin,
      activeBattleLayout.animations.mulliganDraw3Origin,
    ],
  );
  const getMulliganAnimationPointByCount = useCallback(
    (
      count: number,
      pointsByCount: {
        1: BattleAnimationAnchorPoint | null;
        2: BattleAnimationAnchorPoint | null;
        3: BattleAnimationAnchorPoint | null;
      },
    ) => {
      if (count === 1 || count === 2 || count === 3) {
        return pointsByCount[count];
      }
      return null;
    },
    [],
  );
  const getMulliganHandReturnDestinationSnapshot = useCallback(
    (side: typeof PLAYER | typeof ENEMY, count: number) => {
      if (side !== localPlayerIndex) return null;
      const configuredPoint = getMulliganAnimationPointByCount(
        count,
        mulliganReturnPointsByCount,
      );
      return snapshotSceneAnimationOriginWithFallback(
        `mulligan-return-${count}`,
        configuredPoint,
        "deck",
      );
    },
    [
      getMulliganAnimationPointByCount,
      localPlayerIndex,
      mulliganReturnPointsByCount,
      snapshotSceneAnimationOriginWithFallback,
    ],
  );
  const getMulliganHandDrawOriginSnapshot = useCallback(
    (side: typeof PLAYER | typeof ENEMY, count: number) => {
      if (side !== localPlayerIndex) return null;
      const configuredPoint = getMulliganAnimationPointByCount(
        count,
        mulliganDrawPointsByCount,
      );
      return snapshotSceneAnimationOriginWithFallback(
        `mulligan-draw-${count}`,
        configuredPoint,
        "deck",
      );
    },
    [
      getMulliganAnimationPointByCount,
      localPlayerIndex,
      mulliganDrawPointsByCount,
      snapshotSceneAnimationOriginWithFallback,
    ],
  );
  const getBattleStageMetrics = useCallback(() => {
    const resolved = resolveBattleStageMetrics();
    if (!resolved.rect || resolved.scaleX == null || resolved.scaleY == null) return null;
    return {
      rect: resolved.rect,
      scaleX: resolved.scaleX,
      scaleY: resolved.scaleY,
    };
  }, [resolveBattleStageMetrics]);
  const getScreenPointFromScenePoint = useCallback(
    (point: BattleAnimationAnchorPoint | null | undefined) => {
      if (!point) return null;
      const stageMetrics = getBattleStageMetrics();
      if (!stageMetrics) return null;
      return {
        x: Math.round(stageMetrics.rect.left + point.x * stageMetrics.scaleX),
        y: Math.round(stageMetrics.rect.top + point.y * stageMetrics.scaleY),
      };
    },
    [getBattleStageMetrics],
  );
  const getScenePointFromScreenPoint = useCallback(
    (point: { x: number; y: number } | null | undefined) => {
      if (!point) return null;
      const stageMetrics = getBattleStageMetrics();
      if (!stageMetrics) return null;
      return {
        x: Math.round((point.x - stageMetrics.rect.left) / stageMetrics.scaleX),
        y: Math.round((point.y - stageMetrics.rect.top) / stageMetrics.scaleY),
      };
    },
    [getBattleStageMetrics],
  );
  const getZoneSnapshotCenter = useCallback((snapshot: ZoneAnchorSnapshot | null | undefined) => {
    if (!snapshot) return null;
    return {
      x: Math.round(snapshot.left + snapshot.width / 2),
      y: Math.round(snapshot.top + snapshot.height / 2),
    };
  }, []);
  const liveAnimationAnchorPoints = useMemo(
    () => ({
      openingTargetEntry0Origin: activeBattleLayout.animations.openingTargetEntry0Origin,
      openingTargetEntry1Origin: activeBattleLayout.animations.openingTargetEntry1Origin,
      openingTargetEntry2Origin: activeBattleLayout.animations.openingTargetEntry2Origin,
      openingTargetEntry3Origin: activeBattleLayout.animations.openingTargetEntry3Origin,
      replacementTargetEntry0Origin: activeBattleLayout.animations.replacementTargetEntry0Origin,
      replacementTargetEntry1Origin: activeBattleLayout.animations.replacementTargetEntry1Origin,
      replacementTargetEntry2Origin: activeBattleLayout.animations.replacementTargetEntry2Origin,
      replacementTargetEntry3Origin: activeBattleLayout.animations.replacementTargetEntry3Origin,
      postPlayHandDrawOrigin: activeBattleLayout.animations.postPlayHandDrawOrigin,
      handPlayTarget0Destination: activeBattleLayout.animations.handPlayTarget0Destination,
      handPlayTarget1Destination: activeBattleLayout.animations.handPlayTarget1Destination,
      mulliganReturn1Destination: activeBattleLayout.animations.mulliganReturn1Destination,
      mulliganReturn2Destination: activeBattleLayout.animations.mulliganReturn2Destination,
      mulliganReturn3Destination: activeBattleLayout.animations.mulliganReturn3Destination,
      mulliganDraw1Origin: activeBattleLayout.animations.mulliganDraw1Origin,
      mulliganDraw2Origin: activeBattleLayout.animations.mulliganDraw2Origin,
      mulliganDraw3Origin: activeBattleLayout.animations.mulliganDraw3Origin,
      targetAttack0Impact: activeBattleLayout.animations.targetAttack0Impact,
      targetAttack1Impact: activeBattleLayout.animations.targetAttack1Impact,
      targetAttack2Impact: activeBattleLayout.animations.targetAttack2Impact,
      targetAttack3Impact: activeBattleLayout.animations.targetAttack3Impact,
      targetAttack0Destination: activeBattleLayout.animations.targetAttack0Destination,
      targetAttack1Destination: activeBattleLayout.animations.targetAttack1Destination,
      targetAttack2Destination: activeBattleLayout.animations.targetAttack2Destination,
      targetAttack3Destination: activeBattleLayout.animations.targetAttack3Destination,
    }),
    [activeBattleLayout.animations],
  );
  const getReferenceScreenPointForAnimationAnchor = useCallback(
    (anchorKey: LiveBattleAnimationAnchorKey) => {
      if (anchorKey.startsWith("openingTargetEntry")) {
        const index = Number(anchorKey.replace("openingTargetEntry", "").replace("Origin", ""));
        return getZoneSnapshotCenter(
          snapshotZone(index >= CONFIG.targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck"),
        );
      }

      if (anchorKey.startsWith("replacementTargetEntry")) {
        const index = Number(anchorKey.replace("replacementTargetEntry", "").replace("Origin", ""));
        return getZoneSnapshotCenter(
          snapshotZone(index >= CONFIG.targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck"),
        );
      }

      if (anchorKey === "postPlayHandDrawOrigin") {
        return getZoneSnapshotCenter(snapshotZone("playerDeck"));
      }

      if (anchorKey.startsWith("handPlayTarget")) {
        const index = Number(anchorKey.replace("handPlayTarget", "").replace("Destination", ""));
        return getZoneSnapshotCenter(snapshotZoneSlot("playerField", `slot-${index}`));
      }

      if (anchorKey.startsWith("mulliganReturn") || anchorKey.startsWith("mulliganDraw")) {
        return getZoneSnapshotCenter(snapshotZone("playerDeck"));
      }

      if (anchorKey.startsWith("targetAttack") && anchorKey.endsWith("Impact")) {
        const index = Number(anchorKey.replace("targetAttack", "").replace("Impact", ""));
        return getZoneSnapshotCenter(
          snapshotZoneSlot(index >= CONFIG.targetsInPlay ? "enemyField" : "playerField", `slot-${index % CONFIG.targetsInPlay}`),
        );
      }

      if (anchorKey.startsWith("targetAttack") && anchorKey.endsWith("Destination")) {
        const index = Number(anchorKey.replace("targetAttack", "").replace("Destination", ""));
        return getZoneSnapshotCenter(
          snapshotZone(index >= CONFIG.targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck"),
        );
      }

      return null;
    },
    [getZoneSnapshotCenter, snapshotZone, snapshotZoneSlot],
  );
  const liveVisibleAnimationAnchors = useMemo(
    () =>
      (Object.entries(liveAnimationAnchorPoints) as [LiveBattleAnimationAnchorKey, BattleAnimationAnchorPoint | null][])
        .filter(([, point]) => Boolean(point))
        .map(([anchor, point]) => ({ anchor, point: point as BattleAnimationAnchorPoint })),
    [liveAnimationAnchorPoints],
  );
  const liveAnchorProbeRows = useMemo(
    () =>
      liveVisibleAnimationAnchors.map(({ anchor, point }) => {
        const screen = getScreenPointFromScenePoint(point);
        const referenceScreen = getReferenceScreenPointForAnimationAnchor(anchor);
        const reference = getScenePointFromScreenPoint(referenceScreen);
        return {
          anchor,
          point,
          screen,
          reference,
          referenceScreen,
          deltaScene: reference
            ? {
                x: Math.round(point.x - reference.x),
                y: Math.round(point.y - reference.y),
              }
            : null,
          deltaScreen:
            screen && referenceScreen
              ? {
                  x: Math.round(screen.x - referenceScreen.x),
                  y: Math.round(screen.y - referenceScreen.y),
                }
              : null,
        };
      }),
    [
      getReferenceScreenPointForAnimationAnchor,
      getScenePointFromScreenPoint,
      getScreenPointFromScenePoint,
      liveVisibleAnimationAnchors,
    ],
  );
  const liveAnimationDebugData = useMemo(() => {
    const formatPoint = (point: { x: number; y: number } | null | undefined) =>
      point ? `${point.x},${point.y}` : "-";
    const formatDelta = (point: { x: number; y: number } | null | undefined) =>
      point ? `${point.x >= 0 ? "+" : ""}${point.x},${point.y >= 0 ? "+" : ""}${point.y}` : "-";
    const formatSnapshot = (snapshot: ZoneAnchorSnapshot | null | undefined) =>
      snapshot
        ? `${Math.round(snapshot.left)},${Math.round(snapshot.top)} ${Math.round(snapshot.width)}x${Math.round(snapshot.height)}`
        : "-";
    const stageMetrics = getBattleStageMetrics();
    const stageLine = stageMetrics
      ? `stage:${Math.round(stageMetrics.rect.width)}x${Math.round(stageMetrics.rect.height)} scale:${stageMetrics.scaleX.toFixed(3)},${stageMetrics.scaleY.toFixed(3)} off:${Math.round(stageMetrics.rect.left)},${Math.round(stageMetrics.rect.top)}`
      : "stage:-";
    const probeLines = liveAnchorProbeRows.map(
      (row) =>
        `probe:${row.anchor} scene:${formatPoint(row.point)} screen:${formatPoint(row.screen)} ref:${formatPoint(row.reference)} refScreen:${formatPoint(row.referenceScreen)} dScene:${formatDelta(row.deltaScene)} dScreen:${formatDelta(row.deltaScreen)}`,
    );
    const snapshotLines = [
      `postPlayDraw:${formatPoint(activeBattleLayout.animations.postPlayHandDrawOrigin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.postPlayHandDrawOrigin))}`,
      `handPlayDests:[0:${formatPoint(activeBattleLayout.animations.handPlayTarget0Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.handPlayTarget0Destination))} | 1:${formatPoint(activeBattleLayout.animations.handPlayTarget1Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.handPlayTarget1Destination))}]`,
      `replacementOrigins:[0:${formatPoint(activeBattleLayout.animations.replacementTargetEntry0Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.replacementTargetEntry0Origin))} | 1:${formatPoint(activeBattleLayout.animations.replacementTargetEntry1Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.replacementTargetEntry1Origin))} | 2:${formatPoint(activeBattleLayout.animations.replacementTargetEntry2Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.replacementTargetEntry2Origin))} | 3:${formatPoint(activeBattleLayout.animations.replacementTargetEntry3Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.replacementTargetEntry3Origin))}]`,
      `mulliganReturns:[1:${formatPoint(activeBattleLayout.animations.mulliganReturn1Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganReturn1Destination))} | 2:${formatPoint(activeBattleLayout.animations.mulliganReturn2Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganReturn2Destination))} | 3:${formatPoint(activeBattleLayout.animations.mulliganReturn3Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganReturn3Destination))}]`,
      `mulliganDraws:[1:${formatPoint(activeBattleLayout.animations.mulliganDraw1Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganDraw1Origin))} | 2:${formatPoint(activeBattleLayout.animations.mulliganDraw2Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganDraw2Origin))} | 3:${formatPoint(activeBattleLayout.animations.mulliganDraw3Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.mulliganDraw3Origin))}]`,
      `attackImpacts:[0:${formatPoint(activeBattleLayout.animations.targetAttack0Impact)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack0Impact))} | 1:${formatPoint(activeBattleLayout.animations.targetAttack1Impact)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack1Impact))} | 2:${formatPoint(activeBattleLayout.animations.targetAttack2Impact)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack2Impact))} | 3:${formatPoint(activeBattleLayout.animations.targetAttack3Impact)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack3Impact))}]`,
      `attackDests:[0:${formatPoint(activeBattleLayout.animations.targetAttack0Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack0Destination))} | 1:${formatPoint(activeBattleLayout.animations.targetAttack1Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack1Destination))} | 2:${formatPoint(activeBattleLayout.animations.targetAttack2Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack2Destination))} | 3:${formatPoint(activeBattleLayout.animations.targetAttack3Destination)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.targetAttack3Destination))}]`,
      `openingOrigins:[0:${formatPoint(activeBattleLayout.animations.openingTargetEntry0Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.openingTargetEntry0Origin))} | 1:${formatPoint(activeBattleLayout.animations.openingTargetEntry1Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.openingTargetEntry1Origin))} | 2:${formatPoint(activeBattleLayout.animations.openingTargetEntry2Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.openingTargetEntry2Origin))} | 3:${formatPoint(activeBattleLayout.animations.openingTargetEntry3Origin)} -> ${formatSnapshot(snapshotSceneAnimationOrigin(activeBattleLayout.animations.openingTargetEntry3Origin))}]`,
    ];
    const fallbackLines = animationFallbackHistoryRef.current.map((entry) => {
      const timestamp = new Date(entry.createdAt).toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `fallback:${timestamp} ${entry.label} reason:${entry.reason} -> ${entry.fallback}`;
    });

    return {
      stageLine,
      anchorsLine: `anchors:[${liveVisibleAnimationAnchors.map(({ anchor, point }) => `${anchor}@${formatPoint(point)}`).join(" | ")}]`,
      probeLines,
      snapshotLines,
      fallbackLines,
    };
  }, [
    activeBattleLayout.animations,
    animationFallbackHistoryVersion,
    battleDebugWatcherVersion,
    getBattleStageMetrics,
    liveAnchorProbeRows,
    liveVisibleAnimationAnchors,
    snapshotSceneAnimationOrigin,
  ]);
  const buildFreshAnimationProbeSnapshot = useCallback(() => {
    const formatPoint = (point: { x: number; y: number } | null | undefined) =>
      point ? `${point.x},${point.y}` : "-";
    const formatDelta = (point: { x: number; y: number } | null | undefined) =>
      point ? `${point.x >= 0 ? "+" : ""}${point.x},${point.y >= 0 ? "+" : ""}${point.y}` : "-";
    const formatSnapshot = (snapshot: ZoneAnchorSnapshot | null | undefined) =>
      snapshot
        ? `${Math.round(snapshot.left)},${Math.round(snapshot.top)} ${Math.round(snapshot.width)}x${Math.round(snapshot.height)}`
        : "-";
    const stageResolution = resolveBattleStageMetrics();
    const stageLine =
      stageResolution.rect && stageResolution.scaleX != null && stageResolution.scaleY != null
        ? `stage:${Math.round(stageResolution.rect.width)}x${Math.round(stageResolution.rect.height)} scale:${stageResolution.scaleX.toFixed(3)},${stageResolution.scaleY.toFixed(3)} off:${Math.round(stageResolution.rect.left)},${Math.round(stageResolution.rect.top)}`
        : "stage:-";
    const stageDiagnostics = {
      selector: stageResolution.selector,
      rootCount: stageResolution.rootCount,
      stageRootFound: Boolean(stageResolution.root),
      stageRootConnected: stageResolution.root ? stageResolution.root.isConnected : false,
      stageRootTag: stageResolution.root?.tagName ?? null,
      stageRootClassName: stageResolution.root?.className ?? null,
      reason: stageResolution.reason,
      rect:
        stageResolution.rect == null
          ? null
          : {
              left: Math.round(stageResolution.rect.left),
              top: Math.round(stageResolution.rect.top),
              width: Math.round(stageResolution.rect.width),
              height: Math.round(stageResolution.rect.height),
            },
      scale:
        stageResolution.scaleX == null || stageResolution.scaleY == null
          ? null
          : {
              x: Number(stageResolution.scaleX.toFixed(3)),
              y: Number(stageResolution.scaleY.toFixed(3)),
            },
    };
    const toSnapshotWithMetrics = (point: BattleAnimationAnchorPoint | null | undefined) => {
      if (!point || !stageResolution.rect || stageResolution.scaleX == null || stageResolution.scaleY == null) {
        return null;
      }
      return {
        left: stageResolution.rect.left + point.x * stageResolution.scaleX,
        top: stageResolution.rect.top + point.y * stageResolution.scaleY,
        width: 0,
        height: 0,
      } satisfies ZoneAnchorSnapshot;
    };
    const toScreenPointWithMetrics = (point: BattleAnimationAnchorPoint | null | undefined) => {
      const snapshot = toSnapshotWithMetrics(point);
      if (!snapshot) return null;
      return {
        x: Math.round(snapshot.left),
        y: Math.round(snapshot.top),
      };
    };
    const toScenePointWithMetrics = (point: { x: number; y: number } | null | undefined) => {
      if (!point || !stageResolution.rect || stageResolution.scaleX == null || stageResolution.scaleY == null) {
        return null;
      }
      return {
        x: Math.round((point.x - stageResolution.rect.left) / stageResolution.scaleX),
        y: Math.round((point.y - stageResolution.rect.top) / stageResolution.scaleY),
      };
    };
    const visibleAnchors = (Object.entries(liveAnimationAnchorPoints) as [
      LiveBattleAnimationAnchorKey,
      BattleAnimationAnchorPoint | null,
    ][])
      .filter(([, point]) => Boolean(point))
      .map(([anchor, point]) => ({ anchor, point: point as BattleAnimationAnchorPoint }));
    const probeRows = visibleAnchors.map(({ anchor, point }) => {
      const screen = toScreenPointWithMetrics(point);
      const referenceScreen = getReferenceScreenPointForAnimationAnchor(anchor);
      const reference = toScenePointWithMetrics(referenceScreen);
      const failureReason = point ? stageResolution.reason : "anchor-not-set";
      return {
        anchor,
        point,
        screen,
        reference,
        referenceScreen,
        failureReason,
        deltaScene:
          reference == null
            ? null
            : {
                x: Math.round(point.x - reference.x),
                y: Math.round(point.y - reference.y),
              },
        deltaScreen:
          screen && referenceScreen
            ? {
                x: Math.round(screen.x - referenceScreen.x),
                y: Math.round(screen.y - referenceScreen.y),
              }
            : null,
      };
    });
    const snapshotEntries = [
      {
        group: "postPlayDraw",
        key: "postPlayHandDrawOrigin",
        point: activeBattleLayout.animations.postPlayHandDrawOrigin,
      },
      {
        group: "handPlayDests",
        key: "handPlayTarget0Destination",
        point: activeBattleLayout.animations.handPlayTarget0Destination,
      },
      {
        group: "handPlayDests",
        key: "handPlayTarget1Destination",
        point: activeBattleLayout.animations.handPlayTarget1Destination,
      },
      {
        group: "replacementOrigins",
        key: "replacementTargetEntry0Origin",
        point: activeBattleLayout.animations.replacementTargetEntry0Origin,
      },
      {
        group: "replacementOrigins",
        key: "replacementTargetEntry1Origin",
        point: activeBattleLayout.animations.replacementTargetEntry1Origin,
      },
      {
        group: "replacementOrigins",
        key: "replacementTargetEntry2Origin",
        point: activeBattleLayout.animations.replacementTargetEntry2Origin,
      },
      {
        group: "replacementOrigins",
        key: "replacementTargetEntry3Origin",
        point: activeBattleLayout.animations.replacementTargetEntry3Origin,
      },
      {
        group: "mulliganReturns",
        key: "mulliganReturn1Destination",
        point: activeBattleLayout.animations.mulliganReturn1Destination,
      },
      {
        group: "mulliganReturns",
        key: "mulliganReturn2Destination",
        point: activeBattleLayout.animations.mulliganReturn2Destination,
      },
      {
        group: "mulliganReturns",
        key: "mulliganReturn3Destination",
        point: activeBattleLayout.animations.mulliganReturn3Destination,
      },
      {
        group: "mulliganDraws",
        key: "mulliganDraw1Origin",
        point: activeBattleLayout.animations.mulliganDraw1Origin,
      },
      {
        group: "mulliganDraws",
        key: "mulliganDraw2Origin",
        point: activeBattleLayout.animations.mulliganDraw2Origin,
      },
      {
        group: "mulliganDraws",
        key: "mulliganDraw3Origin",
        point: activeBattleLayout.animations.mulliganDraw3Origin,
      },
      {
        group: "attackImpacts",
        key: "targetAttack0Impact",
        point: activeBattleLayout.animations.targetAttack0Impact,
      },
      {
        group: "attackImpacts",
        key: "targetAttack1Impact",
        point: activeBattleLayout.animations.targetAttack1Impact,
      },
      {
        group: "attackImpacts",
        key: "targetAttack2Impact",
        point: activeBattleLayout.animations.targetAttack2Impact,
      },
      {
        group: "attackImpacts",
        key: "targetAttack3Impact",
        point: activeBattleLayout.animations.targetAttack3Impact,
      },
      {
        group: "attackDests",
        key: "targetAttack0Destination",
        point: activeBattleLayout.animations.targetAttack0Destination,
      },
      {
        group: "attackDests",
        key: "targetAttack1Destination",
        point: activeBattleLayout.animations.targetAttack1Destination,
      },
      {
        group: "attackDests",
        key: "targetAttack2Destination",
        point: activeBattleLayout.animations.targetAttack2Destination,
      },
      {
        group: "attackDests",
        key: "targetAttack3Destination",
        point: activeBattleLayout.animations.targetAttack3Destination,
      },
      {
        group: "openingOrigins",
        key: "openingTargetEntry0Origin",
        point: activeBattleLayout.animations.openingTargetEntry0Origin,
      },
      {
        group: "openingOrigins",
        key: "openingTargetEntry1Origin",
        point: activeBattleLayout.animations.openingTargetEntry1Origin,
      },
      {
        group: "openingOrigins",
        key: "openingTargetEntry2Origin",
        point: activeBattleLayout.animations.openingTargetEntry2Origin,
      },
      {
        group: "openingOrigins",
        key: "openingTargetEntry3Origin",
        point: activeBattleLayout.animations.openingTargetEntry3Origin,
      },
    ] as const;
    const groupedSnapshotRows = snapshotEntries.reduce<Record<string, string[]>>((acc, entry) => {
      const snapshot = toSnapshotWithMetrics(entry.point);
      const line = `${entry.key}:${formatPoint(entry.point)} -> ${formatSnapshot(snapshot)}`;
      acc[entry.group] = [...(acc[entry.group] ?? []), line];
      return acc;
    }, {});
    const snapshotRows = snapshotEntries.map((entry) => {
      const snapshot = toSnapshotWithMetrics(entry.point);
      return {
        group: entry.group,
        key: entry.key,
        point: entry.point,
        snapshot: serializeZoneAnchorSnapshot(snapshot),
        failureReason: entry.point ? stageResolution.reason : "anchor-not-set",
      };
    });
    const fallbackEntries = animationFallbackHistoryRef.current.map((entry) => ({
      id: entry.id,
      label: entry.label,
      reason: entry.reason,
      fallback: entry.fallback,
      createdAt: entry.createdAt,
      createdAtIso: new Date(entry.createdAt).toISOString(),
    }));
    const fallbackLines = fallbackEntries.map((entry) => {
      const timestamp = new Date(entry.createdAt).toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `fallback:${timestamp} ${entry.label} reason:${entry.reason} -> ${entry.fallback}`;
    });

    return {
      stage: stageLine,
      stageDiagnostics,
      anchors: `anchors:[${visibleAnchors.map(({ anchor, point }) => `${anchor}@${formatPoint(point)}`).join(" | ")}]`,
      anchorPoints: visibleAnchors.map(({ anchor, point }) => ({ anchor, point })),
      probes: probeRows.map(
        (row) =>
          `probe:${row.anchor} scene:${formatPoint(row.point)} screen:${formatPoint(row.screen)} ref:${formatPoint(row.reference)} refScreen:${formatPoint(row.referenceScreen)} dScene:${formatDelta(row.deltaScene)} dScreen:${formatDelta(row.deltaScreen)}`,
      ),
      probeRows,
      snapshots: [
        `postPlayDraw:${groupedSnapshotRows.postPlayDraw?.join(" | ") ?? "-"}`,
        `handPlayDests:[${groupedSnapshotRows.handPlayDests?.join(" | ") ?? "-"}]`,
        `replacementOrigins:[${groupedSnapshotRows.replacementOrigins?.join(" | ") ?? "-"}]`,
        `mulliganReturns:[${groupedSnapshotRows.mulliganReturns?.join(" | ") ?? "-"}]`,
        `mulliganDraws:[${groupedSnapshotRows.mulliganDraws?.join(" | ") ?? "-"}]`,
        `attackImpacts:[${groupedSnapshotRows.attackImpacts?.join(" | ") ?? "-"}]`,
        `attackDests:[${groupedSnapshotRows.attackDests?.join(" | ") ?? "-"}]`,
        `openingOrigins:[${groupedSnapshotRows.openingOrigins?.join(" | ") ?? "-"}]`,
      ],
      snapshotRows,
      fallbacks: fallbackLines,
      fallbackEntries,
      counters: {
        anchors: visibleAnchors.length,
        probes: probeRows.length,
        snapshots: snapshotRows.length,
        fallbacks: fallbackEntries.length,
      },
    };
  }, [
    activeBattleLayout.animations,
    getReferenceScreenPointForAnimationAnchor,
    liveAnimationAnchorPoints,
    resolveBattleStageMetrics,
    serializeZoneAnchorSnapshot,
  ]);
  const buildBattleDevSnapshot = useCallback(() => {
    const stageMetrics = getBattleStageMetrics();
    const animationProbe = buildFreshAnimationProbeSnapshot();
    const stageRect = stageMetrics
      ? {
          left: Math.round(stageMetrics.rect.left),
          top: Math.round(stageMetrics.rect.top),
          width: Math.round(stageMetrics.rect.width),
          height: Math.round(stageMetrics.rect.height),
          scaleX: Number(stageMetrics.scaleX.toFixed(3)),
          scaleY: Number(stageMetrics.scaleY.toFixed(3)),
        }
      : null;

    return {
      capturedAt: new Date().toISOString(),
      location:
        typeof window === "undefined"
          ? null
          : {
              href: window.location.href,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
              visibility: document.visibilityState,
            },
      stageRect,
      stageRootDiagnostics: animationProbe.stageDiagnostics,
      openingIntroStep: game.openingIntroStep,
      turn: game.turn,
      localPlayerIndex,
      remotePlayerIndex,
      mode,
      roomTransportKind: roomTransportKind ?? "none",
      winner: game.winner,
      combatLocked: game.combatLocked,
      actedThisTurn: game.actedThisTurn,
      currentMessage: game.currentMessage,
      messageQueue: game.messageQueue.map((message) => ({
        kind: message.kind,
        title: message.title,
        detail: message.detail,
      })),
      selectedHandIndexes: [...game.selectedHandIndexes],
      selectedSyllables: game.selectedHandIndexes.map(
        (index) => stableHands[localPlayerIndex][index]?.syllable ?? `missing:${index}`,
      ),
      localHand: [...game.players[localPlayerIndex].hand],
      remoteHand: [...game.players[remotePlayerIndex].hand],
      stableLocalHand: stableHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.syllable,
        skipEntryAnimation: Boolean(card.skipEntryAnimation),
      })),
      stableRemoteHand: stableHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.syllable,
        skipEntryAnimation: Boolean(card.skipEntryAnimation),
      })),
      incomingLocalHand: incomingHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        finalIndex: card.finalIndex,
        finalTotal: card.finalTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        origin: card.origin,
      })),
      incomingRemoteHand: incomingHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        finalIndex: card.finalIndex,
        finalTotal: card.finalTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        origin: card.origin,
      })),
      outgoingLocalHand: outgoingHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        destination: card.destination,
        initialIndex: card.initialIndex,
        initialTotal: card.initialTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        destinationMode: card.destinationMode ?? "card-origin",
      })),
      outgoingRemoteHand: outgoingHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        destination: card.destination,
        initialIndex: card.initialIndex,
        initialTotal: card.initialTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        destinationMode: card.destinationMode ?? "card-origin",
      })),
      pendingMulliganDrawCounts: { ...pendingMulliganDrawCountsRef.current },
      pendingMulliganDrawQueues: {
        player: pendingMulliganDrawQueuesRef.current[PLAYER].map((draw) => ({
          syllable: draw.syllable,
          finalIndex: draw.finalIndex,
          finalTotal: draw.finalTotal,
          originOverride: draw.originOverride,
        })),
        enemy: pendingMulliganDrawQueuesRef.current[ENEMY].map((draw) => ({
          syllable: draw.syllable,
          finalIndex: draw.finalIndex,
          finalTotal: draw.finalTotal,
          originOverride: draw.originOverride,
        })),
      },
      incomingTargets: {
        player: incomingTargets[PLAYER].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          origin: target.origin,
          delayMs: target.delayMs,
          durationMs: target.durationMs,
        })),
        enemy: incomingTargets[ENEMY].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          origin: target.origin,
          delayMs: target.delayMs,
          durationMs: target.durationMs,
        })),
      },
      outgoingTargets: {
        player: outgoingTargets[PLAYER].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          impactDestination: target.impactDestination,
          destination: target.destination,
          delayMs: target.delayMs,
          windupMs: target.windupMs,
          attackMs: target.attackMs,
          pauseMs: target.pauseMs,
          exitMs: target.exitMs,
        })),
        enemy: outgoingTargets[ENEMY].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          impactDestination: target.impactDestination,
          destination: target.destination,
          delayMs: target.delayMs,
          windupMs: target.windupMs,
          attackMs: target.attackMs,
          pauseMs: target.pauseMs,
          exitMs: target.exitMs,
        })),
      },
      lockedTargetSlots,
      pendingTargetPlacements,
      freshCardIds: [...freshCardIds],
      mulliganDebug,
      battleEvents: battleEventsRef.current.slice(-40),
      debugWatcher: {
        startedAt:
          battleDebugStartedAtRef.current != null
            ? new Date(battleDebugStartedAtRef.current).toISOString()
            : null,
        sampleCount: battleDebugSamplesRef.current.length,
        fallbackCount: animationFallbackHistoryRef.current.length,
        sampleCapacity: 800,
        captureIntervalMs: 300,
        lastSampleAt:
          battleDebugSamplesRef.current.length > 0
            ? new Date(
                battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.at ?? Date.now(),
              ).toISOString()
            : null,
        lastSampleId:
          battleDebugSamplesRef.current.length > 0
            ? battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.id ?? null
            : null,
        lastSampleReason:
          battleDebugSamplesRef.current.length > 0
            ? battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.reason ?? null
            : null,
        lastSignatureLength: battleDebugLastSignatureRef.current.length,
      },
      animationProbe,
      timeDiagnostics: {
        nowIso: new Date().toISOString(),
        turnRemainingMs,
        coinChoiceRemainingMs,
      },
      timerDiagnostics: {
        actionTimerCount: actionTimersRef.current.length,
        visualTimerCount: visualTimersRef.current.length,
      },
      zoneSnapshots: {
        playerDeck: serializeZoneAnchorSnapshot(snapshotZone("playerDeck")),
        enemyDeck: serializeZoneAnchorSnapshot(snapshotZone("enemyDeck")),
        playerTargetDeck: serializeZoneAnchorSnapshot(snapshotZone("playerTargetDeck")),
        enemyTargetDeck: serializeZoneAnchorSnapshot(snapshotZone("enemyTargetDeck")),
        playerFieldSlots: Array.from({ length: CONFIG.targetsInPlay }, (_, index) => ({
          slot: index,
          snapshot: serializeZoneAnchorSnapshot(snapshotZoneSlot("playerField", `slot-${index}`)),
        })),
        enemyFieldSlots: Array.from({ length: CONFIG.targetsInPlay }, (_, index) => ({
          slot: index,
          snapshot: serializeZoneAnchorSnapshot(snapshotZoneSlot("enemyField", `slot-${index}`)),
        })),
      },
      handCardSnapshots: {
        player: stableHands[localPlayerIndex].map((card, index) => ({
          index,
          id: card.id,
          syllable: card.syllable,
          snapshot: serializeZoneAnchorSnapshot(snapshotHandCard(card.id)),
        })),
        enemy: stableHands[remotePlayerIndex].map((card, index) => ({
          index,
          id: card.id,
          syllable: card.syllable,
          snapshot: serializeZoneAnchorSnapshot(snapshotHandCard(card.id)),
        })),
      },
      domDiagnostics: {
        zoneNodeCount: Object.values(zoneNodesRef.current).filter(Boolean).length,
        handCardNodeCount: Object.values(handCardNodesRef.current).filter(Boolean).length,
      },
      laneDebug: {
        hands: { ...handLaneDebugRef.current },
        fields: { ...fieldLaneDebugRef.current },
      },
      rawAnimationAnchors: activeBattleLayout.animations,
      authoritativeSnapshotState: authoritativeBattleSnapshot
        ? {
            turn: authoritativeBattleSnapshot.turn,
            intro: authoritativeBattleSnapshot.openingIntroStep,
            winner: authoritativeBattleSnapshot.winner,
          }
        : null,
      pendingExternalActionId: pendingExternalAction?.id ?? null,
    };
  }, [
    activeBattleLayout.animations,
    authoritativeBattleSnapshot,
    buildFreshAnimationProbeSnapshot,
    coinChoiceRemainingMs,
    freshCardIds,
    game,
    getBattleStageMetrics,
    incomingHands,
    incomingTargets,
    localPlayerIndex,
    lockedTargetSlots,
    mode,
    mulliganDebug,
    outgoingHands,
    outgoingTargets,
    pendingExternalAction,
    pendingTargetPlacements,
    remotePlayerIndex,
    roomTransportKind,
    serializeZoneAnchorSnapshot,
    snapshotHandCard,
    snapshotZone,
    snapshotZoneSlot,
    stableHands,
    turnRemainingMs,
  ]);
  const clearBattleDebugWatcher = useCallback(() => {
    battleDebugSamplesRef.current = [];
    battleDebugSampleIdRef.current = 0;
    battleDebugStartedAtRef.current = Date.now();
    battleDebugLastSignatureRef.current = "";
    setBattleDebugWatcherVersion((value) => value + 1);
  }, []);
  const downloadBattleDebugDump = useCallback(() => {
    if (typeof document === "undefined") return;
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const payload = {
      exportedAt: now.toISOString(),
      startedAt:
        battleDebugStartedAtRef.current != null
          ? new Date(battleDebugStartedAtRef.current).toISOString()
          : null,
      count: battleDebugSamplesRef.current.length,
      latest: buildBattleDevSnapshot(),
      samples: battleDebugSamplesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `battle-dev-dump.${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [buildBattleDevSnapshot]);

  const setStableTargetSlot = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      slotIndex: number,
      target: VisualTargetEntity | null,
    ) => {
      const current = stableTargetsRef.current;
      const nextSide = [...current[side]];
      nextSide[slotIndex] = target;
      commitStableTargets({
        ...current,
        [side]: nextSide,
      });
    },
    [commitStableTargets],
  );

  const lockTargetSlot = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number, locked: boolean) => {
      const current = lockedTargetSlotsRef.current;
      const nextSide = [...current[side]];
      nextSide[slotIndex] = locked;
      commitLockedTargetSlots({
        ...current,
        [side]: nextSide,
      });
    },
    [commitLockedTargetSlots],
  );

  const setPendingTargetPlacement = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number, syllable: Syllable | null) => {
      const current = pendingTargetPlacementsRef.current;
      const nextSide = [...current[side]];
      nextSide[slotIndex] = syllable;
      commitPendingTargetPlacements({
        ...current,
        [side]: nextSide,
      });
    },
    [commitPendingTargetPlacements],
  );

  const appendIncomingTarget = useCallback(
    (side: typeof PLAYER | typeof ENEMY, incomingTarget: IncomingTargetCard) => {
      const current = incomingTargetsRef.current;
      commitIncomingTargets({
        ...current,
        [side]: [...current[side], incomingTarget],
      });
    },
    [commitIncomingTargets],
  );

  const removeIncomingTarget = useCallback(
    (side: typeof PLAYER | typeof ENEMY, id: string) => {
      const current = incomingTargetsRef.current;
      commitIncomingTargets({
        ...current,
        [side]: current[side].filter((target) => target.id !== id),
      });
    },
    [commitIncomingTargets],
  );

  const appendOutgoingTarget = useCallback(
    (side: typeof PLAYER | typeof ENEMY, outgoingTarget: OutgoingTargetCard) => {
      const current = outgoingTargetsRef.current;
      commitOutgoingTargets({
        ...current,
        [side]: [...current[side], outgoingTarget],
      });
    },
    [commitOutgoingTargets],
  );

  const removeOutgoingTarget = useCallback(
    (side: typeof PLAYER | typeof ENEMY, id: string) => {
      const current = outgoingTargetsRef.current;
      commitOutgoingTargets({
        ...current,
        [side]: current[side].filter((target) => target.id !== id),
      });
    },
    [commitOutgoingTargets],
  );

  const queueHandDrawBatch = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      cards: Syllable[],
      config?: {
        initialDelayMs?: number;
        staggerMs?: number;
        durationMs?: number;
        finalTotalOverride?: number;
        finalIndexBase?: number;
        originOverride?: ZoneAnchorSnapshot | null;
      },
    ) => {
      if (cards.length === 0) return;

      const origin =
        config?.originOverride ?? snapshotZone(zoneIdForSide(side, "deck"));
      const stableCount = stableHandsRef.current[side].length;
      const incomingCount = incomingHandsRef.current[side].length;
      const baseCount = stableCount + incomingCount;
      const finalTotal = config?.finalTotalOverride ?? Math.min(HAND_LAYOUT_SLOT_COUNT, baseCount + cards.length);
      const finalIndexBase = config?.finalIndexBase ?? baseCount;

      cards.forEach((card, index) => {
        const visualCard = createVisualHandCard(card, side);
        if (!origin) {
          appendStableCard(side, visualCard, { skipEntryAnimation: false });
          return;
        }

        appendIncomingCard(side, {
          id: visualCard.id,
          side,
          card: visualCard,
          origin,
          finalIndex: Math.min(HAND_LAYOUT_SLOT_COUNT - 1, finalIndexBase + index),
          finalTotal,
          delayMs: (config?.initialDelayMs ?? 0) + index * (config?.staggerMs ?? 130),
          durationMs: config?.durationMs ?? 940,
        });
      });
    },
    [appendIncomingCard, appendStableCard, createVisualHandCard, snapshotZone],
  );

  const startNextMulliganDraw = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      options?: { initialDelayMs?: number },
    ) => {
      const queue = pendingMulliganDrawQueuesRef.current[side];
      if (queue.length === 0) return false;
      const [nextDraw, ...rest] = queue;
      pendingMulliganDrawQueuesRef.current = {
        ...pendingMulliganDrawQueuesRef.current,
        [side]: rest,
      };
      queueHandDrawBatch(side, [nextDraw.syllable], {
        initialDelayMs: options?.initialDelayMs ?? 0,
        staggerMs: 0,
        durationMs: FLOW.drawTravelMs,
        finalTotalOverride: nextDraw.finalTotal,
        finalIndexBase: nextDraw.finalIndex,
        originOverride: nextDraw.originOverride,
      });
      return true;
    },
    [queueHandDrawBatch],
  );

  const commitIncomingCardToHand = useCallback(
    (incomingCard: IncomingHandCard) => {
      removeIncomingCard(incomingCard.side, incomingCard.id);
      appendStableCard(incomingCard.side, incomingCard.card, { skipEntryAnimation: true });
      if (incomingCard.side === PLAYER) {
        markFreshCard(incomingCard.card.id);
      }
      const currentPending = pendingMulliganDrawCountsRef.current[incomingCard.side];
      if (currentPending > 0) {
        commitPendingMulliganDrawCounts({
          ...pendingMulliganDrawCountsRef.current,
          [incomingCard.side]: currentPending - 1,
        });
      }
      if (pendingMulliganDrawQueuesRef.current[incomingCard.side].length > 0) {
        startNextMulliganDraw(incomingCard.side, { initialDelayMs: FLOW.drawSettleMs });
      }
    },
    [appendStableCard, commitPendingMulliganDrawCounts, markFreshCard, removeIncomingCard, startNextMulliganDraw],
  );

  const handleOutgoingCardComplete = useCallback(
    (outgoingCard: BattleHandLaneOutgoingCard) => {
      removeOutgoingCard(outgoingCard.side, outgoingCard.id);
    },
    [removeOutgoingCard],
  );

  const buildBattleSnapshotSignature = useCallback(
    (state: GameState) =>
      JSON.stringify({
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
      }),
    [],
  );

  const hydrateBattleSnapshot = useCallback(
    (snapshot: GameState) => {
      const freshGame = cloneInitialGame(snapshot);
      const shouldRunIntro = isFreshBattleState(freshGame) && freshGame.openingIntroStep !== "done";
      const previousGame = gameRef.current;
      const nextTurnPresentationKey = getTurnPresentationKey(freshGame);
      const shouldReplayTurnPresentation =
        freshGame.openingIntroStep === "done" &&
        (
          previousGame.setupVersion !== freshGame.setupVersion ||
          previousGame.openingIntroStep !== freshGame.openingIntroStep ||
          previousGame.turn !== freshGame.turn
        );
      const preservedStableHands =
        previousGame.setupVersion === freshGame.setupVersion
          ? {
              [PLAYER]: reconcileStableSide(PLAYER, freshGame.players[PLAYER].hand, stableHandsRef.current[PLAYER]),
              [ENEMY]: reconcileStableSide(ENEMY, freshGame.players[ENEMY].hand, stableHandsRef.current[ENEMY]),
            }
          : buildStableHands(freshGame);
      clearAllTimers();
      clearVisualTimers();
      commitIncomingHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      commitOutgoingHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      commitPendingMulliganDrawCounts({
        [PLAYER]: 0,
        [ENEMY]: 0,
      });
      pendingMulliganDrawQueuesRef.current = {
        [PLAYER]: [],
        [ENEMY]: [],
      };
      commitIncomingTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      commitOutgoingTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      commitPendingTargetPlacements({
        [PLAYER]: Array(CONFIG.targetsInPlay).fill(null),
        [ENEMY]: Array(CONFIG.targetsInPlay).fill(null),
      });
      commitLockedTargetSlots({
        [PLAYER]: Array(CONFIG.targetsInPlay).fill(false),
        [ENEMY]: Array(CONFIG.targetsInPlay).fill(false),
      });
      setFreshCardIds([]);
      commitStableHands(preservedStableHands);
      commitStableTargets(shouldRunIntro ? createEmptyStableTargets() : buildStableTargets(freshGame));
      setOpeningTurnSide(freshGame.turn as typeof PLAYER | typeof ENEMY);
      setCoinResultStage("face");
      setSelectedCoinFace(freshGame.openingCoinChoice);
      setRevealedCoinFace(freshGame.openingCoinResult);
      setPlannedCoinFace(freshGame.openingCoinResult);
      setIntroPhase(freshGame.openingIntroStep);
      setTurnPresentationLocked(false);
      setTurnRemainingMs(freshGame.turnDeadlineAt ? Math.max(0, freshGame.turnDeadlineAt - Date.now()) : TURN_TIMER.limitMs);
      processedExternalActionIdsRef.current = new Set();
      pendingAuthoritativeSnapshotRef.current = null;
      publishedSnapshotSignatureRef.current = "";
      actionSequenceRef.current = {
        [PLAYER]: 0,
        [ENEMY]: 0,
      };
      presentedTurnKeyRef.current = shouldReplayTurnPresentation ? "" : nextTurnPresentationKey;
      setShowResultOverlay(false);
      setGame(freshGame);
    },
    [
      buildStableHands,
      buildStableTargets,
      clearAllTimers,
      clearVisualTimers,
      cloneInitialGame,
      commitIncomingHands,
      commitOutgoingHands,
      commitPendingMulliganDrawCounts,
      commitIncomingTargets,
      commitOutgoingTargets,
      commitLockedTargetSlots,
      commitPendingTargetPlacements,
      commitStableHands,
      commitStableTargets,
      createEmptyStableTargets,
      reconcileStableSide,
      isFreshBattleState,
    ],
  );

  const resetGame = () => {
    const freshGame = initialGameState ? cloneInitialGame(initialGameState) : makeInitialGame(mode, playerDeck, enemyDeck, roomId);
    hydrateBattleSnapshot(freshGame);
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    buildBattleDevSnapshotRef.current = buildBattleDevSnapshot;
  }, [buildBattleDevSnapshot]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (battleDebugStartedAtRef.current == null) {
      battleDebugStartedAtRef.current = Date.now();
    }

    const capture = (reason: "init" | "change") => {
      const snapshot = buildBattleDevSnapshotRef.current();
      const signature = JSON.stringify(snapshot);
      if (reason === "change" && signature === battleDebugLastSignatureRef.current) {
        return;
      }
      battleDebugLastSignatureRef.current = signature;
      battleDebugSamplesRef.current = [
        ...battleDebugSamplesRef.current,
        {
          id: battleDebugSampleIdRef.current++,
          at: Date.now(),
          reason,
          snapshot,
        },
      ].slice(-800);
      setBattleDebugWatcherVersion((value) => value + 1);
    };

    capture("init");
    const interval = setInterval(() => capture("change"), 300);
    return () => clearInterval(interval);
  }, []);

  const beginCoinChoiceResolution = useCallback((face: CoinFace | null) => {
    setSelectedCoinFace(face);
    setGame((prev) => ({
      ...prev,
      openingCoinChoice: face,
      openingCoinResult: null,
      openingIntroStep: "coin-fall",
    }));
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    window.__battleDev = {
      snapshot: () => buildBattleDevSnapshot(),
      logSnapshot: () => console.log(window.__battleDev?.snapshot()),
      dumpDebugCapture: () => downloadBattleDebugDump(),
      clearDebugCapture: () => clearBattleDebugWatcher(),
      clearAnimationFallbacks: () => {
        animationFallbackHistoryRef.current = [];
        setAnimationFallbackHistoryVersion((value) => value + 1);
      },
      damage: (side, amount = 10) => {
        if (mode === "multiplayer") {
          console.warn("[battleDev] O helper de dano está desativado no multiplayer para não dessincronizar a sala.");
          return;
        }

        const targetIndex = side === "player" ? localPlayerIndex : remotePlayerIndex;
        const winnerIndex = targetIndex === PLAYER ? ENEMY : PLAYER;
        const normalizedAmount = Math.max(0, Math.floor(amount));

        setGame((prev) => {
          if (normalizedAmount <= 0) return prev;
          const currentTarget = prev.players[targetIndex];
          const nextLife = Math.max(0, currentTarget.life - normalizedAmount);
          return {
            ...prev,
            openingIntroStep: "done",
            combatLocked: false,
            currentMessage: null,
            players: prev.players.map((player, index) =>
              index === targetIndex ? { ...player, life: nextLife, flashDamage: normalizedAmount } : { ...player, flashDamage: 0 },
            ),
            winner: nextLife === 0 ? winnerIndex : prev.winner,
          };
        });
      },
      damagePlayer: (amount = 10) => window.__battleDev?.damage("player", amount),
      damageEnemy: (amount = 10) => window.__battleDev?.damage("enemy", amount),
      kill: (side) => window.__battleDev?.damage(side, 999),
      help: () =>
        [
          "window.__battleDev.dumpDebugCapture()",
          "window.__battleDev.clearDebugCapture()",
          "window.__battleDev.clearAnimationFallbacks()",
          "window.__battleDev.damage('player', 10)",
          "window.__battleDev.damage('enemy', 10)",
          "window.__battleDev.kill('enemy')",
        ].join("\n"),
    };

    return () => {
      delete window.__battleDev;
    };
  }, [
    buildBattleDevSnapshot,
    clearBattleDebugWatcher,
    downloadBattleDebugDump,
    mode,
    setAnimationFallbackHistoryVersion,
  ]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      clearVisualTimers();
    };
  }, [clearAllTimers, clearVisualTimers]);

  useEffect(() => {
    const updateViewportMode = () => setIsDesktopViewport(window.innerWidth >= 1024);
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    setIntroPhase(game.openingIntroStep);
    setSelectedCoinFace(game.openingCoinChoice);
    setRevealedCoinFace(game.openingCoinResult);
    setPlannedCoinFace(game.openingCoinResult);
    setOpeningTurnSide(game.turn as typeof PLAYER | typeof ENEMY);
    setCoinChoiceRemainingMs(game.openingIntroStep === "coin-choice" ? INTRO.coinChoiceMs : 0);
    if (game.openingIntroStep !== "coin-result") {
      setCoinResultStage("face");
    }
  }, [game.openingCoinChoice, game.openingCoinResult, game.openingIntroStep, game.turn]);

  useEffect(() => {
    if (introPhase !== "coin-choice") return;

    const startedAt = Date.now();
    setCoinChoiceRemainingMs(INTRO.coinChoiceMs);
    const interval = setInterval(() => {
      const remaining = Math.max(0, INTRO.coinChoiceMs - (Date.now() - startedAt));
      setCoinChoiceRemainingMs(remaining);
    }, 100);
    visualTimersRef.current.push(interval as unknown as NodeJS.Timeout);

    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) {
      return () => {
        clearInterval(interval);
      };
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
    }, INTRO.coinChoiceMs);
    visualTimersRef.current.push(timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [introPhase, localSide, mode]);

  useEffect(() => {
    if (game.winner !== null || introPhase !== "done") return;
    if (game.turnDeadlineAt == null) {
      setTurnRemainingMs(TURN_TIMER.limitMs);
      return;
    }

    const updateRemaining = () => {
      setTurnRemainingMs(Math.max(0, game.turnDeadlineAt! - Date.now()));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 200);

    return () => clearInterval(interval);
  }, [game.turn, game.setupVersion, game.turnDeadlineAt, game.winner, introPhase]);

  useEffect(() => {
    if (game.winner === null || game.combatLocked) {
      pendingResultOverlayRecoveryRef.current = false;
      setShowResultOverlay(false);
      return;
    }

    if (typeof document !== "undefined" && document.hidden) {
      pendingResultOverlayRecoveryRef.current = true;
      return;
    }

    const timer = setTimeout(() => setShowResultOverlay(true), 320);
    visualTimersRef.current.push(timer);
    pendingResultOverlayRecoveryRef.current = false;

    return () => clearTimeout(timer);
  }, [game.combatLocked, game.winner]);

  useEffect(() => {
    if (introPhase !== "coin-fall") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) return;

    let nextCoinFace: CoinFace;
    let nextOpeningTurnSide: typeof PLAYER | typeof ENEMY;
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
    }, INTRO.coinDropMs + INTRO.coinSettleMs);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [introPhase, localPlayerIndex, localSide, mode, remotePlayerIndex]);

  useEffect(() => {
    if (introPhase !== "coin-result") return;

    setCoinResultStage("face");
    const faceTimer = setTimeout(() => {
      setCoinResultStage("starter");
    }, INTRO.coinResultFaceMs);
    visualTimersRef.current.push(faceTimer);

    return () => {
      clearTimeout(faceTimer);
    };
  }, [introPhase]);

  useEffect(() => {
    if (introPhase !== "coin-result") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";
    if (!introAuthorityLocal) return;

    const timer = setTimeout(() => {
      setGame((prev) => ({
        ...prev,
        openingIntroStep: "targets",
      }));
    }, INTRO.coinResultHoldMs);
    visualTimersRef.current.push(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [introPhase, localSide, mode]);

  useEffect(() => {
    if (introPhase !== "targets") return;
    const introAuthorityLocal = mode !== "multiplayer" || localSide === "player";

    const queueInitialTargets = () => {
      const stagedTargets = gameRef.current.players.reduce(
        (acc, player, sideIndex) => [
          ...acc,
          ...player.targets.map((target, slotIndex) => ({
            side: sideIndex as typeof PLAYER | typeof ENEMY,
            slotIndex,
            target,
          })),
        ],
        [] as Array<{
          side: typeof PLAYER | typeof ENEMY;
          slotIndex: number;
          target: GameState["players"][0]["targets"][number];
        }>,
      );

      stagedTargets.forEach(({ side, slotIndex, target }, index) => {
        const timer = setTimeout(() => {
          const configuredOrigin =
            index === 0
              ? activeBattleLayout.animations.openingTargetEntry0Origin
              : index === 1
                ? activeBattleLayout.animations.openingTargetEntry1Origin
                : index === 2
                  ? activeBattleLayout.animations.openingTargetEntry2Origin
                  : activeBattleLayout.animations.openingTargetEntry3Origin;
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
            id: `opening-target-${entity.id}`,
            side,
            slotIndex,
            entity,
            origin,
            delayMs: 0,
            durationMs: TIMINGS.leaveMs,
          });
        }, index * (TIMINGS.leaveMs + INTRO.targetEnterStaggerMs));
        visualTimersRef.current.push(timer);
      });

      const settleTimer = setTimeout(() => {
        if (!introAuthorityLocal) return;
        setGame((prev) => ({
          ...prev,
          openingIntroStep: "done",
          turnDeadlineAt: Date.now() + TURN_RELEASE_DELAY_MS + TURN_TIMER.limitMs,
        }));
      }, (stagedTargets.length - 1) * (TIMINGS.leaveMs + INTRO.targetEnterStaggerMs) + TIMINGS.leaveMs + INTRO.targetSettleMs);

      visualTimersRef.current.push(settleTimer);
    };

    const timer = setTimeout(queueInitialTargets, 40);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [activeBattleLayout.animations, appendIncomingTarget, introPhase, localPlayerIndex, localSide, mode, openingTurnSide, setStableTargetSlot, snapshotSceneAnimationOriginWithFallback, snapshotZone, toVisualTarget, zoneIdForSide]);

  useEffect(() => {
    const currentEnemy = game.players[remotePlayerIndex];
    const signature = `${stableHands[remotePlayerIndex].map((card) => card.id).join("|")}:${incomingHands[remotePlayerIndex]
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
  }, [game.players, incomingHands, remotePlayerIndex, stableHands]);

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
    const nextHands: StableHandsState = {
      [PLAYER]:
        pendingCounts[PLAYER] === 0
          ? reconcileStableSide(PLAYER, game.players[PLAYER].hand, current[PLAYER])
          : current[PLAYER],
      [ENEMY]:
        pendingCounts[ENEMY] === 0
          ? reconcileStableSide(ENEMY, game.players[ENEMY].hand, current[ENEMY])
          : current[ENEMY],
    };

    if (nextHands[PLAYER] !== current[PLAYER] || nextHands[ENEMY] !== current[ENEMY]) {
      commitStableHands(nextHands);
    }
  }, [commitStableHands, game, incomingHands, pendingMulliganDrawCounts, reconcileStableSide, stableHands]);

  useEffect(() => {
    if (introPhase !== "done") return;

    const current = stableTargetsRef.current;
    const nextTargets: StableTargetsState = {
      [PLAYER]: game.players[PLAYER].targets.map((target, index) => {
        if (lockedTargetSlots[PLAYER][index]) return current[PLAYER][index];
        const existing = current[PLAYER][index];
        if (existing?.id === target.uiId) {
          return toVisualTarget(target, PLAYER, index);
        }
        return toVisualTarget(target, PLAYER, index);
      }),
      [ENEMY]: game.players[ENEMY].targets.map((target, index) => {
        if (lockedTargetSlots[ENEMY][index]) return current[ENEMY][index];
        const existing = current[ENEMY][index];
        if (existing?.id === target.uiId) {
          return toVisualTarget(target, ENEMY, index);
        }
        return toVisualTarget(target, ENEMY, index);
      }),
    };

    if (nextTargets[PLAYER] !== current[PLAYER] || nextTargets[ENEMY] !== current[ENEMY]) {
      commitStableTargets(nextTargets);
    }
  }, [commitStableTargets, game.players, introPhase, lockedTargetSlots, toVisualTarget]);

  const hasBlockingVisuals = useCallback(
    () =>
      incomingHandsRef.current[PLAYER].length > 0 ||
      incomingHandsRef.current[ENEMY].length > 0 ||
      incomingTargetsRef.current[PLAYER].length > 0 ||
      incomingTargetsRef.current[ENEMY].length > 0,
    [],
  );

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

  const isIntroSnapshotState = useCallback((state: GameState) => state.openingIntroStep !== "done", []);
  const isWinnerSnapshotState = useCallback((state: GameState) => state.winner !== null && !state.combatLocked, []);

  const finalizeTurn = useCallback(() => {
    if (hasBlockingVisuals()) {
      const retry = setTimeout(finalizeTurn, 120);
      actionTimersRef.current.push(retry);
      return;
    }

    setTurnRemainingMs(TURN_TIMER.limitMs);
    clearAllTimers();
    setGame((prev) => {
      if (prev.winner !== null) return prev;
      const nextTurn = prev.turn === PLAYER ? ENEMY : PLAYER;
      const players = [...prev.players];
      players[nextTurn] = { ...players[nextTurn], mulliganUsedThisRound: false };

      return {
        ...prev,
        players: players.map((p, i) => (i === prev.turn ? clearTransientPlayerState(p) : p)),
        turn: nextTurn,
        turnDeadlineAt: Date.now() + TURN_RELEASE_DELAY_MS + TURN_TIMER.limitMs,
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
  }, [clearAllTimers, emitTurnStartedEvent, hasBlockingVisuals, localPlayerIndex]);

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
    game.actedThisTurn,
    game.setupVersion,
    game.turn,
    game.turnDeadlineAt,
    game.winner,
    introPhase,
    localSide,
    mode,
  ]);

  const handleOutgoingTargetComplete = useCallback(
    (outgoingTarget: BattleFieldOutgoingTarget & { side: typeof PLAYER | typeof ENEMY }) => {
      removeOutgoingTarget(outgoingTarget.side, outgoingTarget.id);
    },
    [removeOutgoingTarget],
  );

  const queueCompletedTargetDeparture = useCallback(
    (result: {
      actorIndex: 0 | 1;
      completedSlot: number | null;
    }) => {
      if (result.completedSlot == null) return;

      const side = result.actorIndex;
      const stableTarget = stableTargetsRef.current[side][result.completedSlot];
      const origin = snapshotZoneSlot(zoneIdForSide(side, "field"), `slot-${result.completedSlot}`);
      const activeDeckSlot = isDesktopViewport ? "desktop" : "mobile";
      const attackIndex = side * CONFIG.targetsInPlay + result.completedSlot;
      const configuredImpact =
        attackIndex === 0
          ? activeBattleLayout.animations.targetAttack0Impact
          : attackIndex === 1
            ? activeBattleLayout.animations.targetAttack1Impact
            : attackIndex === 2
              ? activeBattleLayout.animations.targetAttack2Impact
              : activeBattleLayout.animations.targetAttack3Impact;
      const configuredDestination =
        attackIndex === 0
          ? activeBattleLayout.animations.targetAttack0Destination
          : attackIndex === 1
            ? activeBattleLayout.animations.targetAttack1Destination
            : attackIndex === 2
              ? activeBattleLayout.animations.targetAttack2Destination
              : activeBattleLayout.animations.targetAttack3Destination;
      const impactDestination =
        snapshotSceneAnimationOriginWithFallback(
          `target-attack-impact-${attackIndex}`,
          configuredImpact,
          "field-slot-center",
        ) ?? null;
      const destination =
        snapshotSceneAnimationOriginWithFallback(
          `target-attack-destination-${attackIndex}`,
          configuredDestination,
          `${side === PLAYER ? "player" : "enemy"}-target-deck`,
        ) ??
        snapshotZoneSlot(zoneIdForSide(side, "targetDeck"), activeDeckSlot) ??
        snapshotZone(zoneIdForSide(side, "targetDeck"));

      if (!stableTarget || !origin || !destination) {
        setStableTargetSlot(side, result.completedSlot, null);
        lockTargetSlot(side, result.completedSlot, true);
        return;
      }

      lockTargetSlot(side, result.completedSlot, true);
      setStableTargetSlot(side, result.completedSlot, null);
      appendOutgoingTarget(side, {
        id: `target-motion-${stableTarget.id}-depart`,
        side,
        slotIndex: result.completedSlot,
        entity: stableTarget,
        impactDestination,
        destination,
        delayMs: 0,
        windupMs: FLOW.attackWindupMs + TARGET_ATTACK_WINDUP_EXTRA_MS,
        attackMs: FLOW.attackTravelMs + TARGET_ATTACK_TRAVEL_EXTRA_MS,
        pauseMs: FLOW.impactPauseMs,
        exitMs: FLOW.targetExitMs + TARGET_ATTACK_EXIT_EXTRA_MS,
      });
    },
    [activeBattleLayout.animations, appendOutgoingTarget, isDesktopViewport, lockTargetSlot, setStableTargetSlot, snapshotSceneAnimationOriginWithFallback, snapshotZone, snapshotZoneSlot],
  );

  const queueReplacementTargetArrival = useCallback(
    (
      actorIndex: 0 | 1,
      slotIndex: number,
      logicalTarget: GameState["players"][0]["targets"][number],
    ) => {
      if (!logicalTarget) {
        lockTargetSlot(actorIndex, slotIndex, false);
        return;
      }

      const activeDeckSlot = isDesktopViewport ? "desktop" : "mobile";
      const origin =
        getReplacementTargetEntryOriginSnapshot(actorIndex, slotIndex) ??
        snapshotZoneSlot(zoneIdForSide(actorIndex, "targetDeck"), activeDeckSlot) ??
        snapshotZone(zoneIdForSide(actorIndex, "targetDeck"));
      const entity = toVisualTarget(logicalTarget, actorIndex, slotIndex);

      if (!origin) {
        setStableTargetSlot(actorIndex, slotIndex, entity);
        lockTargetSlot(actorIndex, slotIndex, false);
        return;
      }

      appendIncomingTarget(actorIndex, {
        id: `incoming-target-${entity.id}`,
        side: actorIndex,
        slotIndex,
        entity,
        origin,
        delayMs: 0,
        durationMs: TIMINGS.leaveMs,
      });
    },
    [appendIncomingTarget, getReplacementTargetEntryOriginSnapshot, isDesktopViewport, lockTargetSlot, setStableTargetSlot, snapshotZone, snapshotZoneSlot, toVisualTarget],
  );

  const commitIncomingTargetToField = useCallback(
    (incomingTarget: IncomingTargetCard) => {
      removeIncomingTarget(incomingTarget.side, incomingTarget.id);
      setStableTargetSlot(incomingTarget.side, incomingTarget.slotIndex, incomingTarget.entity);
      lockTargetSlot(incomingTarget.side, incomingTarget.slotIndex, false);
    },
    [lockTargetSlot, removeIncomingTarget, setStableTargetSlot],
  );

  const commitPlayedTargetProgress = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number) => {
      const logicalTarget = gameRef.current.players[side].targets[slotIndex];
      if (!logicalTarget) {
        setPendingTargetPlacement(side, slotIndex, null);
        lockTargetSlot(side, slotIndex, false);
        return;
      }

      setStableTargetSlot(side, slotIndex, toVisualTarget(logicalTarget, side, slotIndex));
      setPendingTargetPlacement(side, slotIndex, null);
      lockTargetSlot(side, slotIndex, false);
    },
    [lockTargetSlot, setPendingTargetPlacement, setStableTargetSlot, toVisualTarget],
  );

  const startCombatSequence = (result: any) => {
    const attackStartDelay = FLOW.cardToFieldMs + FLOW.cardSettleMs;
    const impactDelayMs =
      attackStartDelay +
      FLOW.attackWindupMs +
      TARGET_ATTACK_WINDUP_EXTRA_MS +
      FLOW.attackTravelMs +
      TARGET_ATTACK_TRAVEL_EXTRA_MS;
    const replacementDelayMs =
      attackStartDelay +
      FLOW.attackWindupMs +
      TARGET_ATTACK_WINDUP_EXTRA_MS +
      FLOW.attackTravelMs +
      TARGET_ATTACK_TRAVEL_EXTRA_MS +
      FLOW.impactPauseMs +
      FLOW.targetExitMs +
      TARGET_ATTACK_EXIT_EXTRA_MS +
      FLOW.replacementGapMs;
    const combatResolveEndMs = replacementDelayMs + FLOW.targetEnterMs;
    const drawStartDelayMs = impactDelayMs + FLOW.impactPauseMs + FLOW.drawSettleMs;
    const drawTotalMs =
      (result.drawnCards.length > 0 ? FLOW.drawTravelMs : 0) +
      Math.max(0, result.drawnCards.length - 1) * FLOW.drawStaggerMs;
    const drawResolveEndMs = drawStartDelayMs + drawTotalMs;
    const finishDelayMs = Math.max(combatResolveEndMs, drawResolveEndMs) + FLOW.turnHandoffMs;

    const t1 = setTimeout(() => {
      queueCompletedTargetDeparture(result);
    }, attackStartDelay);

    if (result.drawnCards.length > 0) {
      queueHandDrawBatch(result.actorIndex, result.drawnCards, {
        initialDelayMs: drawStartDelayMs,
        staggerMs: FLOW.drawStaggerMs,
        durationMs: FLOW.drawTravelMs,
        originOverride: getPostPlayHandDrawOriginSnapshot(result.actorIndex),
      });
    }

    const t2 = setTimeout(() => {
      if (!result.damage) return;
      emitDamageAppliedEvent(
        gameRef.current.turn,
        result.actorIndex,
        result.actorIndex === PLAYER ? ENEMY : PLAYER,
        result.damage,
        result.damageSource,
        result.impactLife,
      );
      setGame((prev) => {
        const players = [...prev.players];
        const opponentIndex = result.actorIndex === PLAYER ? ENEMY : PLAYER;
        players[opponentIndex] = {
          ...players[opponentIndex],
          life: result.impactLife,
          flashDamage: result.damage,
        };
        return {
          ...prev,
          players,
        };
      });
    }, impactDelayMs);

    const t3 = setTimeout(() => {
      if (result.completedSlot == null) return;
      const pIdx = result.actorIndex;
      const deck = pIdx === PLAYER ? playerDeck : enemyDeck;
      const previousTargetName = gameRef.current.players[pIdx].targets[result.completedSlot]?.name ?? "";
      const nextPlayer = replaceTargetInSlot(gameRef.current.players[pIdx], result.completedSlot, deck);
      const nextTarget = nextPlayer.targets[result.completedSlot];

      emitTargetReplacedEvent(gameRef.current.turn, result.actorIndex, result.completedSlot, previousTargetName, nextTarget?.name ?? "");

      setGame((prev) => {
        const players = [...prev.players];
        players[pIdx] = nextPlayer;
        return { ...prev, players };
      });

      queueReplacementTargetArrival(result.actorIndex, result.completedSlot, nextTarget);
    }, replacementDelayMs);

    const t4 = setTimeout(() => {
      setGame((prev) => ({
        ...prev,
        combatLocked: false,
        players: prev.players.map((p) => ({ ...p, flashDamage: 0 })),
      }));

      if (result.winner !== null) {
        setGame((prev) => ({ ...prev, winner: result.winner }));
      } else {
        finalizeTurn();
      }
    }, finishDelayMs);

    actionTimersRef.current.push(t1, t2, t3, t4);
  };

  const resolvePlayInternal = (handIndex: number, targetIndex: number) =>
    resolveBattlePlayAction(gameRef.current, handIndex, targetIndex);

  type PlayResolution = NonNullable<ReturnType<typeof resolvePlayInternal>>;

  const applyResolvedPlayFlow = ({
    side,
    targetIndex,
    result,
    clearSelection,
  }: {
    side: typeof PLAYER | typeof ENEMY;
    targetIndex: number;
    result: PlayResolution;
    clearSelection: boolean;
  }) => {
    if (result.damage === 0) {
      queueHandDrawBatch(side, result.drawnCards, {
        initialDelayMs: getPlayDrawStartDelayMs(FLOW),
        staggerMs: FLOW.drawStaggerMs,
        durationMs: FLOW.drawTravelMs,
        originOverride: getPostPlayHandDrawOriginSnapshot(side),
      });
    }

    setGame((prev) => ({
      ...prev,
      players: result.nextPlayers as any,
      winner: result.winner,
      actedThisTurn: true,
      combatLocked: result.damage > 0,
      selectedHandIndexes: clearSelection ? [] : prev.selectedHandIndexes,
      selectedCardForPlay: clearSelection ? null : prev.selectedCardForPlay,
      currentMessage: null,
      log: buildPlayChronicleEntries(side, result, game.players[side].targets[targetIndex]?.name ?? "").reduce(
        (acc, entry) => addLog(acc, entry),
        prev.log,
      ),
    }));

    createPlayResolutionEvents({
      turn: game.turn,
      side,
      playedCard: result.playedCard,
      targetSlot: targetIndex,
      targetName: game.players[side].targets[targetIndex]?.name ?? "",
      damage: result.damage,
      damageSource: result.damageSource,
      completedSlot: result.completedSlot,
      drawnCards: result.drawnCards,
    }).forEach(emitBattleEvent);

    {
      const t = setTimeout(() => commitPlayedTargetProgress(side, targetIndex), getPlayedCardCommitDelayMs(FLOW));
      actionTimersRef.current.push(t);
    }

    if (result.damage > 0) {
      startCombatSequence(result);
    } else {
      const t = setTimeout(finalizeTurn, getPlayFinishDelayMs(FLOW));
      actionTimersRef.current.push(t);
    }
  };

  const applyResolvedMulliganFlow = ({
    side,
    removedStableCards,
    removedCardLayouts,
    remainingStableCount,
    drawnCards,
  }: {
    side: typeof PLAYER | typeof ENEMY;
    removedStableCards: VisualHandCard[];
    removedCardLayouts: Array<{ index: number; total: number }>;
    remainingStableCount: number;
    drawnCards: Syllable[];
  }) => {
    createMulliganResolutionEvents({
      turn: game.turn,
      side,
      returned: removedStableCards.map((card) => card.syllable),
      drawn: drawnCards,
    }).forEach(emitBattleEvent);

    const deckDestination =
      getMulliganHandReturnDestinationSnapshot(side, removedStableCards.length) ??
      snapshotZone(zoneIdForSide(side, "deck"));
    if (deckDestination) {
      removedStableCards.forEach((card, index) => {
        const layout = removedCardLayouts[index];
        if (!layout) return;
        appendOutgoingCard(side, {
          id: `outgoing-${card.id}-${index}`,
          side,
          card,
          destination: deckDestination,
          initialIndex: layout.index,
          initialTotal: layout.total,
          delayMs: index * FLOW.mulliganReturnStaggerMs,
          durationMs: FLOW.mulliganReturnMs,
        });
      });
    }

    commitPendingMulliganDrawCounts({
      ...pendingMulliganDrawCountsRef.current,
      [side]: pendingMulliganDrawCountsRef.current[side] + drawnCards.length,
    });
    const plannedDraws = drawnCards.map((syllable, index) => ({
      syllable,
      finalIndex: Math.min(HAND_LAYOUT_SLOT_COUNT - 1, remainingStableCount + index),
      finalTotal: Math.min(HAND_LAYOUT_SLOT_COUNT, remainingStableCount + drawnCards.length),
      originOverride: getMulliganHandDrawOriginSnapshot(side, drawnCards.length),
    }));
    pendingMulliganDrawQueuesRef.current = {
      ...pendingMulliganDrawQueuesRef.current,
      [side]: plannedDraws.slice(1),
    };
    if (plannedDraws.length > 0) {
      queueHandDrawBatch(side, [plannedDraws[0].syllable], {
        initialDelayMs: getMulliganDrawStartDelayMs(FLOW, removedStableCards.length),
        staggerMs: 0,
        durationMs: FLOW.drawTravelMs,
        finalTotalOverride: plannedDraws[0].finalTotal,
        finalIndexBase: plannedDraws[0].finalIndex,
        originOverride: plannedDraws[0].originOverride,
      });
    }

    const t = setTimeout(finalizeTurn, getMulliganFinishDelayMs(FLOW, removedStableCards.length, drawnCards.length));
    actionTimersRef.current.push(t);
  };

  const executeBattleTurnAction = ({
    side,
    move,
    selectedCardOrigin,
    clearSelection,
    clearIncomingHand,
  }: {
    side: typeof PLAYER | typeof ENEMY;
    move: BattleTurnAction;
    selectedCardOrigin?: ZoneAnchorSnapshot | null;
    clearSelection: boolean;
    clearIncomingHand?: boolean;
  }) => {
    if (move.type === "play") {
      const result = resolvePlayInternal(move.handIndex, move.targetIndex);
      if (!result) return;

      const stableBeforePlay = stableHandsRef.current[side];
      const playedCardLayout = {
        index: move.handIndex,
        total: stableBeforePlay.length,
      };
      const [playedStableCard] = removeStableCards(side, [move.handIndex]);
      lockTargetSlot(side, move.targetIndex, true);
      setPendingTargetPlacement(side, move.targetIndex, result.playedCard);

      if (playedStableCard) {
        const destination =
          getHandPlayTargetDestinationSnapshot(side, move.targetIndex) ??
          snapshotZoneSlot(zoneIdForSide(side, "field"), `slot-${move.targetIndex}`);
        if (destination) {
          appendOutgoingCard(side, {
            id: `play-${playedStableCard.id}-${move.targetIndex}`,
            side,
            card: playedStableCard,
            destination,
            initialIndex: playedCardLayout.index,
            initialTotal: playedCardLayout.total,
            delayMs: 0,
            durationMs: FLOW.cardToFieldMs,
            destinationMode: "zone-center",
            endRotate: side === localPlayerIndex ? 8 : -8,
            endScale: 1,
          });
        }
      }

      applyResolvedPlayFlow({
        side,
        targetIndex: move.targetIndex,
        result,
        clearSelection,
      });
      return;
    }

    if (move.type === "mulligan") {
      const selectedIndexes = [...move.handIndexes].sort((a, b) => b - a);
      const requestedSyllables = selectedIndexes.map(
        (index) => stableHandsRef.current[side][index]?.syllable ?? `missing:${index}`,
      );
      const stableBeforeRemoval = stableHandsRef.current[side];
      const removedCardLayouts = [...selectedIndexes]
        .sort((a, b) => a - b)
        .map((index) => ({
          index,
          total: stableBeforeRemoval.length,
        }));
      const resolution = resolveBattleMulliganAction(gameRef.current, side, selectedIndexes, CONFIG.handSize);
      const removedStableCards = removeStableCards(side, selectedIndexes);
      const remainingStableCount = stableHandsRef.current[side].length;
      const returnedCountForLog = removedStableCards.length;

      if (clearIncomingHand) {
        commitIncomingHands({
          ...incomingHandsRef.current,
          [side]: [],
        });
        commitOutgoingHands({
          ...outgoingHandsRef.current,
          [side]: [],
        });
        commitOutgoingTargets({
          ...outgoingTargetsRef.current,
          [side]: [],
        });
        commitPendingMulliganDrawCounts({
          ...pendingMulliganDrawCountsRef.current,
          [side]: 0,
        });
        pendingMulliganDrawQueuesRef.current = {
          ...pendingMulliganDrawQueuesRef.current,
          [side]: [],
        };
      }

      setGame((prev) => {
        return {
          ...prev,
          players: resolution.nextPlayers as any,
          selectedHandIndexes: clearSelection ? [] : prev.selectedHandIndexes,
          selectedCardForPlay: clearSelection ? null : prev.selectedCardForPlay,
          actedThisTurn: true,
          currentMessage: null,
          log: addLog(prev.log, buildHandSwapChronicleEntry(side, returnedCountForLog)),
        };
      });

      setMulliganDebug({
        source: "executeBattleTurnAction",
        requestedIndexes: [...selectedIndexes],
        requestedSyllables,
        removedStableCards: removedStableCards.map((card) => card.syllable),
        drawnCards: [...resolution.drawnCards],
        externalActionId: null,
        clearIncomingHand: Boolean(clearIncomingHand),
      });

      applyResolvedMulliganFlow({
        side,
        removedStableCards,
        removedCardLayouts,
        remainingStableCount,
        drawnCards: resolution.drawnCards,
      });
      return;
    }

    finalizeTurn();
  };

  const snapshotActionOrigin = useCallback(
    (side: typeof PLAYER | typeof ENEMY, action: BattleTurnAction) => {
      if (action.type !== "play") return null;
      const selectedStableCard = stableHandsRef.current[side][action.handIndex];
      return selectedStableCard ? snapshotHandCard(selectedStableCard.id) : null;
    },
    [snapshotHandCard],
  );

  const requestBattleAction = useCallback(
    (side: typeof PLAYER | typeof ENEMY, action: BattleTurnAction) => {
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
    [localPlayerIndex, mode, onActionRequested, roomTransportKind],
  );

  const shouldExecuteLocallyAfterRequest = useCallback(
    (side: typeof PLAYER | typeof ENEMY) => {
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
      side: typeof PLAYER | typeof ENEMY;
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
    [requestBattleAction, shouldExecuteLocallyAfterRequest, snapshotActionOrigin],
  );

  const playOnTarget = (targetIndex: number) => {
    if (
      introPhase !== "done" ||
      game.turn !== localPlayerIndex ||
      game.winner !== null ||
      game.actedThisTurn ||
      game.selectedCardForPlay === null ||
      game.combatLocked
    ) return;

    dispatchBattleAction({
      side: localPlayerIndex,
      move: {
        type: "play",
        handIndex: game.selectedCardForPlay,
        targetIndex,
      },
      clearSelection: true,
      clearIncomingHand: false,
    });
  };

  const handleMulligan = () => {
    const me = game.players[localPlayerIndex];
    const stuck = isHandStuck(me);

    if (
      introPhase !== "done" ||
      game.turn !== localPlayerIndex ||
      game.winner !== null ||
      game.combatLocked ||
      me.mulliganUsedThisRound ||
      !stuck ||
      game.selectedHandIndexes.length === 0 ||
      game.selectedHandIndexes.length > CONFIG.maxMulligan ||
      game.actedThisTurn
    ) {
      return;
    }

    clearAllTimers();
    const selectedIndexes = [...new Set<number>(game.selectedHandIndexes)].sort((a, b) => b - a);
    const requestedSyllables = selectedIndexes
      .map((index) => stableHandsRef.current[localPlayerIndex][index]?.syllable ?? `missing:${index}`);
    setMulliganDebug({
      source: "handleMulligan",
      requestedIndexes: [...selectedIndexes],
      requestedSyllables,
      removedStableCards: [],
      drawnCards: [],
      externalActionId: null,
      clearIncomingHand: true,
    });
    dispatchBattleAction({
      side: localPlayerIndex,
      move: {
        type: "mulligan",
        handIndexes: selectedIndexes,
      },
      clearSelection: true,
      clearIncomingHand: true,
    });
  };

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
  }, [dispatchBattleAction, enableMockRoomBot, game.turn, game.winner, game.combatLocked, introPhase, mode, remotePlayerIndex]);

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
          (index) => stableHandsRef.current[side][index]?.syllable ?? `missing:${index}`,
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
  }, [executeBattleTurnAction, introPhase, localPlayerIndex, onExternalActionConsumed, pendingExternalAction, snapshotActionOrigin]);

  useEffect(() => {
    if (mode !== "multiplayer" || localSide !== "player" || !onBattleSnapshotPublished) return;
    if (!isIntroSnapshotState(game) && !isWinnerSnapshotState(game) && !isSnapshotCheckpointClear(game)) return;

    const signature = buildBattleSnapshotSignature(game);
    if (publishedSnapshotSignatureRef.current === signature) return;
    publishedSnapshotSignatureRef.current = signature;
    onBattleSnapshotPublished(cloneInitialGame(game));
  }, [
    buildBattleSnapshotSignature,
    cloneInitialGame,
    game,
    isWinnerSnapshotState,
    isSnapshotCheckpointClear,
    localSide,
    mode,
    onBattleSnapshotPublished,
  ]);

  useEffect(() => {
    if (!authoritativeBattleSnapshot || mode !== "multiplayer") return;
    pendingAuthoritativeSnapshotRef.current = authoritativeBattleSnapshot;
  }, [authoritativeBattleSnapshot, mode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityRecovery = () => {
      if (document.hidden) {
        lastHiddenAtRef.current = Date.now();
        return;
      }

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
      setEnemyHandPulse(false);
      setTurnPresentationLocked(false);
      setTurnRemainingMs(TURN_TIMER.limitMs);
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
          onBattleSnapshotPublished(cloneInitialGame(gameRef.current));
        };

        const earlyTimer = setTimeout(publishRecoverySnapshot, 260);
        const settleTimer = setTimeout(publishRecoverySnapshot, 980);
        visualTimersRef.current.push(earlyTimer, settleTimer);
        return;
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

    document.addEventListener("visibilitychange", handleVisibilityRecovery);
    window.addEventListener("focus", handleVisibilityRecovery);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityRecovery);
      window.removeEventListener("focus", handleVisibilityRecovery);
    };
  }, [
    authoritativeBattleSnapshot,
    clearVisualTimers,
    cloneInitialGame,
    hydrateBattleSnapshot,
    isIntroSnapshotState,
    isSnapshotCheckpointClear,
    isWinnerSnapshotState,
    finalizeTurn,
    localSide,
    mode,
    onBattleSnapshotPublished,
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
    buildBattleSnapshotSignature,
    hydrateBattleSnapshot,
    incomingHands,
    incomingTargets,
    isIntroSnapshotState,
    isWinnerSnapshotState,
    isSnapshotCheckpointClear,
    localSide,
    mode,
  ]);

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
    }, TURN_PRESENTATION.preBannerDelayMs);

    const releaseTimer = setTimeout(() => {
      setTurnPresentationLocked(false);
    }, TURN_PRESENTATION.preBannerDelayMs + TURN_PRESENTATION.bannerDurationMs + TURN_PRESENTATION.interactionReleaseBufferMs);

    return () => {
      clearTimeout(queueTimer);
      clearTimeout(releaseTimer);
    };
  }, [game.setupVersion, game.turn, game.turnDeadlineAt, game.winner, getTurnMessageTitle, introPhase]);

  useEffect(() => {
    if (game.currentMessage) {
      const durationMs =
        game.currentMessage.kind === "turn"
          ? TURN_PRESENTATION.bannerDurationMs
          : game.currentMessage.kind === "damage"
            ? 900
            : 1100;
      const t = setTimeout(() => setGame((prev) => ({ ...prev, currentMessage: null })), durationMs);
      return () => clearTimeout(t);
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
    incomingHands,
    incomingTargets,
    introPhase,
  ]);

  const introActive = introPhase !== "done";
  const me = game.players[localPlayerIndex];
  const enemy = game.players[remotePlayerIndex];
  const selectedCard = game.selectedCardForPlay !== null ? me.hand[game.selectedCardForPlay] : null;
  const canSwap =
    !introActive &&
    game.turn === localPlayerIndex &&
    !turnPresentationLocked &&
    !game.combatLocked &&
    !game.actedThisTurn &&
    isHandStuck(me) &&
    !me.mulliganUsedThisRound;
  const displayTurnRemainingMs = introActive
    ? TURN_TIMER.limitMs
    : Math.min(TURN_TIMER.limitMs, turnPresentationLocked ? TURN_TIMER.limitMs : turnRemainingMs);
  const turnSecondsRemaining = Math.max(0, Math.ceil(displayTurnRemainingMs / 1000) - 1);
  const turnClock = introActive ? "--" : String(turnSecondsRemaining).padStart(2, "0");
  const turnClockUrgent = !introActive && game.winner === null && displayTurnRemainingMs <= TURN_TIMER.warningMs;
  const desktopTurnLabel = introActive ? "Inicio do Duelo" : game.turn === localPlayerIndex ? "Seu Turno" : "Turno do Oponente";
  const turnFocusTone: BattleTurnFocusTone = introActive
    ? "neutral"
    : game.turn === localPlayerIndex
      ? "player"
      : "enemy";
  const desktopFallbackLabel =
    introPhase === "coin-choice"
      ? "Escolha a moeda"
      : introActive
        ? "Resolucao de abertura"
        : game.turn === localPlayerIndex
          ? "Aguardando jogada"
          : "Oponente pensando";
  const mulliganSelectionInvalid =
    game.selectedHandIndexes.length === 0 || game.selectedHandIndexes.length > CONFIG.maxMulligan;
  const mulliganDisabled = !canSwap || mulliganSelectionInvalid;
  const selectedStableSyllables = game.selectedHandIndexes.map(
    (index) => stableHands[localPlayerIndex][index]?.syllable ?? `missing:${index}`,
  );
  const mulliganButtonClass =
    "group relative overflow-hidden rounded-[1.6rem] border-4 border-[#d4af37] bg-[#4a1d24] text-amber-50 shadow-[0_18px_38px_rgba(0,0,0,0.42)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/leather.png')] before:opacity-35 disabled:border-[#8a6a25] disabled:bg-[#3f2327] disabled:text-amber-100/45 disabled:shadow-none disabled:hover:translate-y-0";

  const renderPlayerHand = (scale: "desktop" | "mobile") => (
    <BattleHandLane
      side={localPlayerIndex}
      presentation="local"
      stableCards={stableHands[localPlayerIndex]}
      incomingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? incomingHands[localPlayerIndex] : []}
      outgoingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? outgoingHands[localPlayerIndex] : []}
      reservedSlots={Math.max(
        0,
        pendingMulliganDrawCounts[localPlayerIndex] - incomingHands[localPlayerIndex].length,
      )}
      scale={scale}
      anchorRef={bindZoneRef("playerHand", `layout-${scale}`)}
      onIncomingCardComplete={commitIncomingCardToHand}
      onOutgoingCardComplete={handleOutgoingCardComplete}
      hoveredCardIndex={hoveredCardIndex}
      onHoverCard={setHoveredCardIndex}
      selectedIndexes={game.selectedHandIndexes}
      canInteract={!introActive && !turnPresentationLocked && game.turn === localPlayerIndex && !game.combatLocked && !game.actedThisTurn}
      showTurnHighlights={!introActive && game.turn === localPlayerIndex}
      showPlayableHints={!introActive && !turnPresentationLocked && game.turn === localPlayerIndex && !game.combatLocked && !game.actedThisTurn}
      targets={me.targets}
      onCardClick={(i) => {
        setGame((prev) => {
          const already = prev.selectedHandIndexes.includes(i);
          const swapMode =
            introPhase === "done" &&
            prev.turn === localPlayerIndex &&
            !turnPresentationLocked &&
            !prev.combatLocked &&
            !prev.actedThisTurn &&
            !prev.players[localPlayerIndex].mulliganUsedThisRound &&
            isHandStuck(prev.players[localPlayerIndex]);

          const next = already
            ? prev.selectedHandIndexes.filter((index) => index !== i)
            : swapMode
              ? (prev.selectedHandIndexes.length < CONFIG.maxMulligan ? [...prev.selectedHandIndexes, i] : [i])
              : [i];

          return {
            ...prev,
            selectedHandIndexes: next,
            selectedCardForPlay: next.length === 1 ? next[0] : null,
          };
        });
      }}
      freshCardIds={freshCardIds}
      bindCardRef={bindHandCardRef}
      onDebugSnapshot={(snapshot) => setHandLaneDebugSnapshot(`player-${scale}`, snapshot)}
    />
  );

  const renderEnemyHand = (scale: "desktop" | "mobile") => (
    <BattleHandLane
      side={remotePlayerIndex}
      presentation="remote"
      stableCards={stableHands[remotePlayerIndex]}
      incomingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? incomingHands[remotePlayerIndex] : []}
      outgoingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? outgoingHands[remotePlayerIndex] : []}
      reservedSlots={Math.max(
        0,
        pendingMulliganDrawCounts[remotePlayerIndex] - incomingHands[remotePlayerIndex].length,
      )}
      scale={scale}
      pulse={enemyHandPulse}
      anchorRef={bindZoneRef("enemyHand", `layout-${scale}`)}
      onIncomingCardComplete={commitIncomingCardToHand}
      onOutgoingCardComplete={handleOutgoingCardComplete}
      onDebugSnapshot={(snapshot) => setHandLaneDebugSnapshot(`enemy-${scale}`, snapshot)}
    />
  );

  const safeLocalPlayerName = normalizePlayerName(localPlayerName, "VOCE");
  const safeRemotePlayerName = normalizePlayerName(remotePlayerName, "OPONENTE");
  const didLocalPlayerWin = game.winner === localPlayerIndex;
  const resultTitle = didLocalPlayerWin ? "VITÓRIA!" : "DERROTA!";
  const resultAvatar = localPlayerAvatar;
  const resultLabel = safeLocalPlayerName;
  const resultAccentClasses = didLocalPlayerWin
    ? "border-amber-400/80 bg-amber-900/20 text-amber-100 shadow-[0_0_60px_rgba(245,158,11,0.22)]"
    : "border-slate-500/70 bg-slate-950/30 text-slate-100 shadow-[0_0_60px_rgba(15,23,42,0.28)]";
  const isRemoteCoinViewer = mode === "multiplayer" && localSide !== "player";
  const openingTurnIsLocal = openingTurnSide === localPlayerIndex;
  const revealedCoinFaceLabel = revealedCoinFace === "coroa" ? "COROA" : "CARA";
  const openingStarterSubject = openingTurnIsLocal ? safeLocalPlayerName : safeRemotePlayerName;
  const openingStarterAction = "COMECA O DUELO!";
  const openingStarterMessage = `${openingStarterSubject} ${openingStarterAction}`;
  const openingIntroTitle = introPhase === "coin-fall" ? "Girando..." : "Cara ou Coroa";
  const openingIntroSubtitle =
    introPhase === "coin-fall"
      ? "A moeda vai decidir quem abre o duelo."
      : isRemoteCoinViewer
        ? `Se a escolha de ${safeRemotePlayerName} vencer, ${safeRemotePlayerName} comeca o duelo.`
        : "Se sua escolha vencer, voce comeca o duelo.";
  const coinChoiceTimerLabel = `Tempo restante: ${Math.max(0, Math.ceil(coinChoiceRemainingMs / 1000))} segundos`;
  const coinSpinRotations =
    plannedCoinFace === "coroa" ? [0, 180, 360, 540, 720, 900] : [0, 180, 360, 540, 720];
  const coinSpinScales =
    plannedCoinFace === "coroa" ? [0.94, 1, 1.03, 1, 1.02, 1] : [0.94, 1, 1.03, 1, 1];
  const finalCoinRotation = revealedCoinFace === "coroa" ? 900 : 720;
  const enemyFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = stableTargets[remotePlayerIndex][idx];
    const incomingTarget = incomingTargets[remotePlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const outgoingTarget = outgoingTargets[remotePlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = outgoingTarget?.entity ?? incomingTarget?.entity ?? visualTarget;
    const slotNode = zoneNodesRef.current[zoneRefKey("enemyField", `slot-${idx}`)];

    return {
      key: displayedTarget?.id ?? `enemy-slot-${idx}`,
      slotRef: bindZoneRef("enemyField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: slotNode?.getBoundingClientRect() ?? null,
      selectedCard: null,
      canClick: false,
      onClick: () => {},
      onIncomingTargetComplete: commitIncomingTargetToField,
      onOutgoingTargetComplete: handleOutgoingTargetComplete,
      playerHand: [],
    };
  });
  const enemyFieldHasOutgoingTarget = outgoingTargets[remotePlayerIndex].length > 0;
  const playerFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = stableTargets[localPlayerIndex][idx];
    const incomingTarget = incomingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const outgoingTarget = outgoingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = outgoingTarget?.entity ?? incomingTarget?.entity ?? visualTarget;
    const slotNode = zoneNodesRef.current[zoneRefKey("playerField", `slot-${idx}`)];

    return {
      key: displayedTarget?.id ?? `player-slot-${idx}`,
      slotRef: bindZoneRef("playerField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: slotNode?.getBoundingClientRect() ?? null,
      selectedCard,
      pendingCard: pendingTargetPlacements[localPlayerIndex][idx],
      canClick: Boolean(
        displayedTarget &&
          !incomingTarget &&
          !lockedTargetSlots[localPlayerIndex][idx] &&
          !introActive &&
          game.turn === localPlayerIndex &&
          !game.combatLocked &&
          !game.actedThisTurn &&
          game.selectedCardForPlay !== null,
      ),
      onClick: () => playOnTarget(idx),
      onIncomingTargetComplete: commitIncomingTargetToField,
      onOutgoingTargetComplete: handleOutgoingTargetComplete,
      playerHand: me.hand,
    };
  });
  const playerFieldHasOutgoingTarget = outgoingTargets[localPlayerIndex].length > 0;
  const battleDebugLatestSample =
    battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1] ?? null;
  const latestFallbackEvent =
    animationFallbackHistoryRef.current[0] ?? null;
  const battleDebugWatcherSummary = import.meta.env.DEV
    ? `watch:samples:${battleDebugSamplesRef.current.length} fallbacks:${animationFallbackHistoryRef.current.length} last:${battleDebugLatestSample ? new Date(battleDebugLatestSample.at).toLocaleTimeString("pt-BR", { hour12: false }) : "-"}`
    : "";
  const sceneViewModel: BattleSceneViewModel = {
    board: createBattleBoardSurfaceViewModel({
      enemyFieldSlots,
      playerFieldSlots,
      currentMessage: game.currentMessage,
      enemyPortrait: {
        label: safeRemotePlayerName,
        avatar: remotePlayerAvatar,
        isLocal: false,
        life: enemy.life,
        active: game.turn === remotePlayerIndex,
        flashDamage: enemy.flashDamage,
      },
      playerPortrait: {
        label: safeLocalPlayerName,
        avatar: localPlayerAvatar,
        isLocal: true,
        life: me.life,
        active: game.turn === localPlayerIndex,
        flashDamage: me.flashDamage,
      },
    }),
    leftSidebar: {
      decks: {
        targetDeckCount: enemy.targetDeck.length,
        deckCount: enemy.syllableDeck.length,
      },
      chronicles: game.log,
    },
    rightSidebar: {
      hud: {
        title: "Controle",
        turnLabel: desktopTurnLabel,
        clock: turnClock,
        clockUrgent: turnClockUrgent,
      },
      decks: {
        targetDeckCount: me.targetDeck.length,
        deckCount: me.syllableDeck.length,
      },
      action: {
        title: "Trocar",
        subtitle: "Ate 3 cartas",
        disabled: mulliganDisabled,
      },
    },
  };
  return (
    <BattleSceneView
      travelLayer={null}
      targetLayer={null}
      exitControls={
        <div className="absolute bottom-4 left-5 z-30 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="h-9 rounded-lg border border-white/5 px-3 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
          </Button>
          {mode !== "multiplayer" ? (
            <Button variant="ghost" size="sm" onClick={resetGame} className="h-9 w-9 rounded-lg border border-white/5 p-0 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      }
    >
      <main className="relative z-10 flex h-full min-h-0 flex-col">
        <BattleEditableElement element="shell" layout={activeBattleLayout}>
          <BattleBoardShell
          layout={activeBattleLayout}
          leftSidebar={
            <BattleLeftSidebarView
              sidebar={sceneViewModel.leftSidebar}
              targetDeckAnchorRef={bindZoneRef("enemyTargetDeck", "desktop")}
              deckAnchorRef={bindZoneRef("enemyDeck", "desktop")}
              discardAnchorRef={bindZoneRef("enemyDiscard", "desktop")}
              layout={activeBattleLayout}
            />
          }
          centerTopMobile={
            <div className="rounded-[2rem] border border-white/10 bg-black/35 px-3 py-2 shadow-xl lg:hidden sm:px-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <BattleEditableElement element="topHand" layout={activeBattleLayout}>
                  <div className="min-w-0">{renderEnemyHand("mobile")}</div>
                </BattleEditableElement>
                <BattlePileRail
                  layout={activeBattleLayout}
                  discardAnchorRef={bindZoneRef("enemyDiscard", "mobile")}
                  className="w-auto max-w-none"
                >
                  <BattleEditableElement element="enemyTargetDeck" layout={activeBattleLayout}>
                    <BattleSinglePile
                      label="ALVOS"
                      count={sceneViewModel.leftSidebar.decks.targetDeckCount}
                      color="bg-rose-950"
                      variant="target"
                      anchorRef={bindZoneRef("enemyTargetDeck", "mobile")}
                      fitParent
                      className="min-h-[190px]"
                    />
                  </BattleEditableElement>
                  <BattleEditableElement element="enemyDeck" layout={activeBattleLayout}>
                    <BattleSinglePile
                      label="DECK"
                      count={sceneViewModel.leftSidebar.decks.deckCount}
                      color="bg-amber-950"
                      variant="deck"
                      anchorRef={bindZoneRef("enemyDeck", "mobile")}
                      fitParent
                      className="min-h-[190px]"
                    />
                  </BattleEditableElement>
                </BattlePileRail>
              </div>
            </div>
          }
          centerTopDesktop={
            <>
              <BattleEditableElement
                element="topHand"
                layout={activeBattleLayout}
                className="flex items-start justify-center"
              >
                <div className="flex h-full w-full items-start justify-center">
                  {renderEnemyHand("desktop")}
                </div>
              </BattleEditableElement>
            </>
          }
          boardSurface={
            <BattleEditableElement
              element="board"
              layout={activeBattleLayout}
            >
              <BattleBoardSurface layout={activeBattleLayout} />
            </BattleEditableElement>
          }
          centerBottomDesktop={
            <>
              <BattleEditableElement
                element="bottomHand"
                layout={activeBattleLayout}
                className="flex items-end justify-center"
              >
                <div className="flex h-full w-full items-end justify-center overflow-visible">
                  <BattleHandFocusFrame
                    scale="desktop"
                    turnLabel={desktopTurnLabel}
                    clock={turnClock}
                    clockUrgent={turnClockUrgent}
                    tone={turnFocusTone}
                  >
                    {renderPlayerHand("desktop")}
                  </BattleHandFocusFrame>
                </div>
              </BattleEditableElement>
            </>
          }
          centerBottomMobile={null}
          centerControlMobile={
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-2 shadow-xl lg:hidden">
              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <BattlePileRail
                  layout={activeBattleLayout}
                  discardAnchorRef={bindZoneRef("playerDiscard", "mobile")}
                  className="w-auto max-w-none"
                >
                  <BattleEditableElement element="playerTargetDeck" layout={activeBattleLayout}>
                    <BattleSinglePile
                      label="ALVOS"
                      count={sceneViewModel.rightSidebar.decks.targetDeckCount}
                      color="bg-rose-950"
                      variant="target"
                      anchorRef={bindZoneRef("playerTargetDeck", "mobile")}
                      fitParent
                      className="min-h-[190px]"
                    />
                  </BattleEditableElement>
                  <BattleEditableElement element="playerDeck" layout={activeBattleLayout}>
                    <BattleSinglePile
                      label="DECK"
                      count={sceneViewModel.rightSidebar.decks.deckCount}
                      color="bg-amber-950"
                      variant="deck"
                      anchorRef={bindZoneRef("playerDeck", "mobile")}
                      fitParent
                      className="min-h-[190px]"
                    />
                  </BattleEditableElement>
                </BattlePileRail>

                <BattleEditableElement element="status" layout={activeBattleLayout}>
                  <BattleStatusPanel
                    presentation="mobile"
                    title="Tempo"
                    turnLabel={desktopTurnLabel}
                    clock={turnClock}
                    clockUrgent={turnClockUrgent}
                    layout={activeBattleLayout}
                  />
                </BattleEditableElement>

                <BattleEditableElement element="action" layout={activeBattleLayout}>
                  <BattleActionButton
                    presentation="mobile"
                    title="Trocar"
                    layout={activeBattleLayout}
                    className={cn(
                      "border-4 border-[#c89b35]/90 bg-[#4a1d24] text-amber-50 shadow-[0_12px_26px_rgba(0,0,0,0.28)]",
                      mulliganButtonClass,
                    )}
                    disabled={mulliganDisabled}
                    onClick={handleMulligan}
                  />
                </BattleEditableElement>
              </div>
            </div>
          }
          rightSidebar={
            <BattleRightSidebarView
              sidebar={sceneViewModel.rightSidebar}
              action={
                <BattleActionButton
                  presentation="desktop"
                  title={sceneViewModel.rightSidebar.action?.title ?? "Trocar"}
                  subtitle={sceneViewModel.rightSidebar.action?.subtitle ?? "Ate 3 cartas"}
                  layout={activeBattleLayout}
                  className={cn(
                    "border-4 border-[#c89b35]/90 bg-[#4a1d24] text-amber-50 shadow-[0_12px_26px_rgba(0,0,0,0.28)]",
                    mulliganButtonClass,
                  )}
                  disabled={Boolean(sceneViewModel.rightSidebar.action?.disabled ?? mulliganDisabled)}
                  onClick={handleMulligan}
                />
              }
              targetDeckAnchorRef={bindZoneRef("playerTargetDeck", "desktop")}
              deckAnchorRef={bindZoneRef("playerDeck", "desktop")}
              discardAnchorRef={bindZoneRef("playerDiscard", "desktop")}
              layout={activeBattleLayout}
            />
          }
          footerMobileHand={
            <BattleEditableElement element="bottomHand" layout={activeBattleLayout}>
              <BattleHandFocusFrame
                scale="mobile"
                turnLabel={desktopTurnLabel}
                clock={turnClock}
                clockUrgent={turnClockUrgent}
                tone={turnFocusTone}
              >
                {renderPlayerHand("mobile")}
              </BattleHandFocusFrame>
            </BattleEditableElement>
          }
          />
          <BattleEditableElement
            element="enemyField"
            layout={activeBattleLayout}
            className="absolute left-0 top-0"
            zIndexOverride={enemyFieldHasOutgoingTarget ? 90 : undefined}
          >
          <div style={boardVars}>
            <BattleFieldLane
              presentation="enemy"
              containerRef={bindZoneRef("enemyField", "main")}
              sectionClassName="flex min-h-0 items-end justify-center overflow-visible pb-1"
              slots={sceneViewModel.board.enemyFieldSlots}
              onDebugSnapshot={(snapshot) => setFieldLaneDebugSnapshot("enemy", snapshot)}
            />
          </div>
        </BattleEditableElement>
          <BattleEditableElement
            element="playerField"
            layout={activeBattleLayout}
            className="absolute left-0 top-0"
            zIndexOverride={playerFieldHasOutgoingTarget ? 90 : undefined}
          >
          <div style={boardVars}>
            <BattleFieldLane
              presentation="player"
              containerRef={bindZoneRef("playerField", "main")}
              sectionClassName="flex min-h-0 items-start justify-center overflow-visible pt-1"
              slots={sceneViewModel.board.playerFieldSlots}
              onDebugSnapshot={(snapshot) => setFieldLaneDebugSnapshot("player", snapshot)}
            />
          </div>
        </BattleEditableElement>
          <BattleEditableElement
            element="boardMessage"
            layout={activeBattleLayout}
            className="pointer-events-none absolute left-0 top-0 z-20"
          >
            <div className="flex h-full w-full items-center justify-center">
              <AnimatePresence mode="wait">
                {sceneViewModel.board.currentMessage ? (
                  <BattleBoardMessage message={sceneViewModel.board.currentMessage} />
                ) : null}
              </AnimatePresence>
            </div>
          </BattleEditableElement>
          <BattlePillOverlay
            side="enemy"
            portrait={
              <PlayerPortrait
                label={sceneViewModel.board.enemyPortrait.label}
                avatar={sceneViewModel.board.enemyPortrait.avatar}
                isLocal={sceneViewModel.board.enemyPortrait.isLocal}
                life={sceneViewModel.board.enemyPortrait.life}
                active={sceneViewModel.board.enemyPortrait.active}
                flashDamage={sceneViewModel.board.enemyPortrait.flashDamage}
              />
            }
            layout={activeBattleLayout}
          />
          <BattlePillOverlay
            side="player"
            portrait={
              <PlayerPortrait
                label={sceneViewModel.board.playerPortrait.label}
                avatar={sceneViewModel.board.playerPortrait.avatar}
                isLocal={sceneViewModel.board.playerPortrait.isLocal}
                life={sceneViewModel.board.playerPortrait.life}
                active={sceneViewModel.board.playerPortrait.active}
                flashDamage={sceneViewModel.board.playerPortrait.flashDamage}
              />
            }
            layout={activeBattleLayout}
          />
          {import.meta.env.DEV ? (
            <div className="absolute right-3 top-3 z-[80] rounded-md border border-white/10 bg-black/70 px-3 py-2 font-mono text-[10px] leading-tight text-emerald-200">
              <div className="pointer-events-auto mb-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={downloadBattleDebugDump}
                  className="h-7 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 text-[10px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
                >
                  Dump
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={clearBattleDebugWatcher}
                  className="h-7 rounded-md border border-white/15 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
                >
                  Limpar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    animationFallbackHistoryRef.current = [];
                    setAnimationFallbackHistoryVersion((value) => value + 1);
                  }}
                  className="h-7 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
                >
                  Limpar Fallback
                </Button>
              </div>
              <div>{`watcher: ativo`}</div>
              <div>{battleDebugWatcherSummary}</div>
              <div>{`stage: ${liveAnimationDebugData.stageLine.replace(/^stage:/, "")}`}</div>
              <div>{`turn:${game.turn} intro:${game.openingIntroStep} combat:${game.combatLocked ? 1 : 0} msg:${game.currentMessage?.title ?? "-"}`}</div>
              <div>{`probe:${liveAnimationDebugData.probeLines.length} snapshots:${liveAnimationDebugData.snapshotLines.length}`}</div>
              <div className={latestFallbackEvent ? "text-amber-200" : "text-emerald-200"}>
                {latestFallbackEvent
                  ? `ultimo fallback: ${latestFallbackEvent.label}`
                  : "fallback: nenhum"}
              </div>
            </div>
          ) : null}
        </BattleEditableElement>
      </main>

      <AnimatePresence>
        {introPhase !== "done" && introPhase !== "targets" ? (
          <motion.div
            key="battle-opening-coin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[115] flex items-center justify-center p-4 backdrop-blur-[2px] sm:p-6"
          >
            <div className="absolute inset-0 bg-black/45" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="paper-panel relative z-10 flex w-full max-w-[420px] min-h-[336px] flex-col items-center gap-4 rounded-[2rem] border-4 border-amber-900/35 px-6 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="min-h-[14px] text-[11px] font-black uppercase tracking-[0.36em] text-amber-950/60">
                {introPhase === "coin-choice" ? coinChoiceTimerLabel : "\u00A0"}
              </div>
              <motion.div
                initial={false}
                animate={
                  introPhase === "coin-fall"
                    ? { y: [-20, 0], scale: coinSpinScales }
                    : { y: 0, scale: 1 }
                }
                transition={
                  introPhase === "coin-fall"
                    ? {
                        y: { duration: INTRO.coinDropMs / 1000, ease: [0.16, 0.84, 0.28, 1] },
                        scale: { duration: INTRO.coinDropMs / 1000, ease: [0.18, 0.89, 0.32, 1.06] },
                      }
                    : { duration: 0.26 }
                }
                className="relative grid h-28 w-28 place-items-center"
              >
                <motion.div
                  initial={false}
                  animate={
                    introPhase === "coin-fall"
                      ? { rotateY: coinSpinRotations }
                      : { rotateY: introPhase === "coin-result" ? finalCoinRotation : 0 }
                  }
                  transition={
                    introPhase === "coin-fall"
                      ? { duration: INTRO.coinDropMs / 1000, ease: [0.18, 0.89, 0.32, 1.06] }
                      : { duration: 0.26 }
                  }
                  style={{ transformStyle: "preserve-3d" }}
                  className="grid h-28 w-28 place-items-center rounded-full border-4 border-amber-700 bg-[radial-gradient(circle_at_30%_30%,#fde68a_0%,#f59e0b_60%,#92400e_100%)] text-center shadow-[0_16px_45px_rgba(120,53,15,0.45)]"
                >
                  <div className="absolute inset-2 rounded-full border border-amber-900/20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_58%)]" />
                  <div
                    className="absolute inset-0 grid place-items-center"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    <BadgeDollarSign className="h-10 w-10 text-amber-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]" strokeWidth={2.4} />
                  </div>
                  <div
                    className="absolute inset-0 grid place-items-center"
                    style={{
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    <Crown className="h-10 w-10 text-amber-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]" strokeWidth={2.4} />
                  </div>
                </motion.div>

              </motion.div>

              {introPhase === "coin-choice" ? (
                <>
                  <div>
                    <div className="font-serif text-3xl font-black uppercase tracking-tight text-amber-950">
                      {openingIntroTitle}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-amber-950/70">
                      {openingIntroSubtitle}
                    </div>
                  </div>

                  {isRemoteCoinViewer ? (
                    <div className="rounded-2xl border border-amber-900/15 bg-white/40 px-5 py-4 text-sm font-semibold text-amber-950/75">
                      Aguardando a escolha do adversario...
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-3 sm:flex-row">
                      {(["cara", "coroa"] as CoinFace[]).map((face) => (
                        <Button
                          key={face}
                          onClick={() => beginCoinChoiceResolution(face)}
                          className={cn(
                            "h-14 flex-1 rounded-2xl border-2 font-black uppercase tracking-[0.22em] transition-transform hover:scale-[1.02]",
                            selectedCoinFace === face
                              ? "border-amber-400 bg-amber-900/95 text-amber-50"
                              : "border-amber-900/20 bg-white/45 text-amber-950 hover:bg-white/60",
                          )}
                        >
                          {face}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={
                          introPhase === "coin-result"
                            ? coinResultStage === "face"
                              ? `coin-face-${revealedCoinFaceLabel}`
                              : `coin-starter-${openingStarterMessage}`
                            : `coin-copy-${introPhase}`
                        }
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="font-serif text-3xl font-black uppercase tracking-tight text-amber-950">
                          {introPhase === "coin-result" && coinResultStage === "starter" ? (
                            <div className="flex flex-col items-center leading-[0.92]">
                              <span>{openingStarterSubject}</span>
                              <span className="mt-2.5 text-[0.88em]">{openingStarterAction}</span>
                            </div>
                          ) : introPhase === "coin-result" ? (
                            `DEU ${revealedCoinFaceLabel}!`
                          ) : (
                            openingIntroTitle
                          )}
                        </div>
                        {introPhase !== "coin-result" ? (
                          <div className="mt-2 text-sm font-semibold text-amber-950/70">
                            {openingIntroSubtitle}
                          </div>
                        ) : null}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showResultOverlay && game.winner !== null ? (
          <motion.div
            key="battle-result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-[3px] sm:p-6"
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="paper-panel relative z-10 w-full max-w-[680px] rounded-[2rem] border-4 border-amber-900/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-8"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] border border-amber-900/10" />
              <div className="relative flex flex-col items-center gap-5 text-center">
                <div className={cn("flex items-center gap-4 rounded-full border px-5 py-3 transition-all", resultAccentClasses)}>
                  <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-current/70 bg-black/20 text-4xl shadow-inner">
                    {resultAvatar}
                  </div>
                  <div className="text-left">
                    <div className="font-serif text-xl font-black tracking-[0.08em]">
                      {resultLabel}
                    </div>
                  </div>
                </div>

                <div className="flex w-full justify-center">
                  <div
                    className={cn(
                      "font-serif text-4xl font-black uppercase tracking-tight sm:text-6xl",
                      didLocalPlayerWin ? "text-amber-950" : "text-slate-900",
                    )}
                  >
                    {resultTitle}
                  </div>
                </div>

                <div className="h-px w-full max-w-[22rem] bg-gradient-to-r from-transparent via-amber-900/25 to-transparent" />

                {mode === "multiplayer" ? (
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      onClick={onChooseDecksAgain}
                      className="h-14 rounded-2xl border-2 border-amber-500 bg-amber-900/95 px-6 font-black uppercase tracking-[0.18em] text-amber-50 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform hover:scale-[1.02]"
                    >
                      Escolher Decks Novamente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onReturnToLobby ?? onExit}
                      className="h-14 rounded-2xl border-2 border-amber-900/20 bg-white/40 px-6 font-black uppercase tracking-[0.18em] text-amber-950 hover:bg-white/60"
                    >
                      Voltar ao Lobby
                    </Button>
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      onClick={resetGame}
                      className="h-14 rounded-2xl border-2 border-amber-500 bg-amber-900/95 px-6 font-black uppercase tracking-[0.18em] text-amber-50 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform hover:scale-[1.02]"
                    >
                      Jogar Novamente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onExit}
                      className="h-14 rounded-2xl border-2 border-amber-900/20 bg-white/40 px-6 font-black uppercase tracking-[0.18em] text-amber-950 hover:bg-white/60"
                    >
                      Voltar ao Menu
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BattleSceneView>
  );
};
