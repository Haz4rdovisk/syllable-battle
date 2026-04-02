import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GameState,
  Syllable,
  BattleEvent,
  BattleSide,
  BattleSubmittedAction,
  BattleTurnAction,
  CoinFace,
  ChronicleEntry,
  normalizePlayerName,
} from "../../types/game";
import type { BattleSetupSpec } from "../../data/content";
import {
  CONFIG,
  isHandStuck,
} from "../../logic/gameLogic";
import {
  BoardZoneId,
  ZoneAnchorSnapshot,
  VisualTargetEntity,
} from "../game/GameComponents";
import {
  useActiveBattleLayoutConfig,
} from "./BattleActiveLayout";
import {
  BattleFieldLaneDebugSnapshot,
} from "./BattleFieldLane";
import {
  BattleHandLaneOutgoingCard,
  BattleHandLaneDebugSnapshot,
} from "./BattleHandLane";
import { BattleSceneModel } from "./BattleSceneViewModel";
import {
  createDamageAppliedEvent,
  createTargetReplacedEvent,
  createTurnStartedEvent,
} from "./battleEvents";
import { resolveBattlePlayAction } from "./battleResolution";
import {
  BATTLE_STAGE_HEIGHT,
  BATTLE_STAGE_WIDTH,
  resolveBattleRuntimeLayoutDevice,
  shouldUseBattleMobileShell,
} from "./BattleSceneSpace";
import { BattleDevWatcherSample, useBattleDevRuntime } from "./BattleDevRuntime";
import {
  BATTLE_SHARED_FLOW_TIMINGS,
  BATTLE_SHARED_OPENING_TARGET_TIMINGS,
} from "./battleSharedTimings";
import { buildBattleSceneModelFromRuntime } from "./BattleSceneRuntimeAdapter";
import {
  AnimationFallbackEvent,
  BattleIntroPhase,
  BattleRuntimeState as BattleRuntimeStateContract,
  ENEMY,
  HAND_LAYOUT_SLOT_COUNT,
  IncomingHandCard,
  IncomingTargetCard,
  LockedTargetSlotsState,
  MulliganDebugState,
  OutgoingTargetCard,
  PendingMulliganDraw,
  PendingTargetPlacementsState,
  PLAYER,
  StableHandsState,
  StableTargetsState,
  VisualHandCard,
} from "./BattleRuntimeState";
import { BattleVisualQueueState as BattleVisualQueueStateContract } from "./BattleVisualQueue";
import {
  getTurnPresentationKey,
  useBattleSnapshotAuthority,
} from "./BattleSnapshotAuthority";
import { useBattleTurnFlow } from "./BattleTurnFlow";
import { useBattleIntroFlow } from "./BattleIntroFlow";
import { useBattleVisualOrchestrator } from "./BattleVisualOrchestrator";
import { useBattleRoomBridge } from "./BattleRoomBridge";
import { useBattleCombatFlow } from "./BattleCombatFlow";
import { useBattleControllerGeometry } from "./BattleControllerGeometry";
import { useBattleControllerDebug } from "./BattleControllerDebug";
import {
  createBattleRuntimeInitialGameState,
  createBattleRuntimeSetup,
  resolveBattleRuntimePlayerCardPiles,
} from "./BattleRuntimeSetup";

const FLOW = BATTLE_SHARED_FLOW_TIMINGS;

const INTRO = {
  coinChoiceMs: 20000,
  coinDropMs: 1920,
  coinSettleMs: 620,
  coinResultHoldMs: 3400,
  coinResultFaceMs: 1450,
  targetEnterStaggerMs: BATTLE_SHARED_OPENING_TARGET_TIMINGS.targetEnterStaggerMs,
  targetSettleMs: BATTLE_SHARED_OPENING_TARGET_TIMINGS.targetSettleMs,
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

type PlayResolution = NonNullable<ReturnType<typeof resolveBattlePlayAction>>;


export interface BattleControllerProps {
  setup: BattleSetupSpec;
  localPlayerName?: string;
  remotePlayerName?: string;
  localPlayerAvatar?: string;
  remotePlayerAvatar?: string;
  roomTransportKind?: "mock" | "broadcast" | "remote";
  initialGameState?: GameState;
  authoritativeBattleSnapshot?: GameState;
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

export interface BattleController {
  viewportWidth: number;
  viewportHeight: number;
  usesMobileShell: boolean;
  isCompactTightViewport: boolean;
  activeBattleLayout: ReturnType<typeof useActiveBattleLayoutConfig>;
  compactTopShellClassName: string;
  compactControlShellClassName: string;
  compactFooterFrameClassName?: string;
  runtimeState: BattleRuntimeStateContract;
  visualQueue: BattleVisualQueueStateContract;
  sceneModel: BattleSceneModel;
  enemyFieldHasOutgoingTarget: boolean;
  playerFieldHasOutgoingTarget: boolean;
  bindZoneRef: (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => void;
  setFieldLaneDebugSnapshot: (key: string, snapshot: BattleFieldLaneDebugSnapshot) => void;
  resetGame: () => void;
  clearBattleDebugWatcher: () => void;
  downloadBattleDebugDump: () => void;
  clearAnimationFallbacks: () => void;
  battleDebugWatcherSummary: string;
  latestFallbackEvent: AnimationFallbackEvent | null;
  liveAnimationDebugData: {
    stageLine: string;
    probeLines: string[];
    snapshotLines: string[];
    anchorsLine: string;
  };
  coinChoiceTimerLabel: string;
  coinSpinRotations: number[];
  coinSpinScales: number[];
  finalCoinRotation: number;
  openingIntroTitle: string;
  openingIntroSubtitle: string;
  openingStarterMessage: string;
  revealedCoinFaceLabel: string;
  resultTitle: string;
  resultAvatar?: string;
  resultLabel: string;
  resultAccentClasses: string;
  beginCoinChoiceResolution: (face: CoinFace | null) => void;
}

export const useBattleController = ({
  setup,
  localPlayerName = "VOCE",
  remotePlayerName = "OPONENTE",
  localPlayerAvatar = "\u{1F9D9}\u200D\u2642\uFE0F",
  remotePlayerAvatar = "\u{1F479}",
  roomTransportKind,
  initialGameState,
  authoritativeBattleSnapshot,
  localSide = "player",
  pendingExternalAction = null,
  onExternalActionConsumed,
  onBattleSnapshotPublished,
  onActionRequested,
  enableMockRoomBot = false,
  onExit,
  onReturnToLobby,
  onChooseDecksAgain,
}: BattleControllerProps): BattleController => {
  const runtimeSetup = useMemo(() => createBattleRuntimeSetup(setup), [setup]);
  const { mode, roomId, playerDeckSpec, enemyDeckSpec } = runtimeSetup;
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? BATTLE_STAGE_WIDTH : window.innerWidth,
  );
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === "undefined" ? BATTLE_STAGE_HEIGHT : window.innerHeight,
  );
  const activeLayoutDevice = resolveBattleRuntimeLayoutDevice(viewportWidth);
  const usesMobileShell = shouldUseBattleMobileShell(activeLayoutDevice);
  const isDesktopViewport = activeLayoutDevice !== "mobile";
  const activeBattleLayout = useActiveBattleLayoutConfig(activeLayoutDevice);
  const localPlayerIndex = localSide === "player" ? PLAYER : ENEMY;
  const remotePlayerIndex = localPlayerIndex === PLAYER ? ENEMY : PLAYER;
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
    initialGameRef.current = initialGameState
      ? cloneInitialGame(initialGameState)
      : createBattleRuntimeInitialGameState(setup);
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
  const resolveDeckCatalogForSide = useCallback(
    (side: typeof PLAYER | typeof ENEMY) =>
      side === PLAYER ? runtimeSetup.playerDeckCatalog : runtimeSetup.enemyDeckCatalog,
    [runtimeSetup],
  );
  const createVisualHandCard = useCallback(
    (
      syllable: Syllable,
      side: typeof PLAYER | typeof ENEMY,
      cardRef?: { cardId: string; runtimeCardId: string },
    ): VisualHandCard => ({
      id: `hand-card-${side}-${handCardIdRef.current++}`,
      syllable,
      cardId: cardRef?.cardId,
      runtimeCardId: cardRef?.runtimeCardId,
      side,
      hidden: side === ENEMY,
      skipEntryAnimation: false,
    }),
    [],
  );
  const buildStableHands = useCallback(
    (state: GameState): StableHandsState => {
      const playerHandRefs = resolveBattleRuntimePlayerCardPiles(
        state.players[PLAYER],
        resolveDeckCatalogForSide(PLAYER),
      ).hand;
      const enemyHandRefs = resolveBattleRuntimePlayerCardPiles(
        state.players[ENEMY],
        resolveDeckCatalogForSide(ENEMY),
      ).hand;

      return {
        [PLAYER]: state.players[PLAYER].hand.map((syllable, index) =>
          createVisualHandCard(syllable, PLAYER, playerHandRefs[index]),
        ),
        [ENEMY]: state.players[ENEMY].hand.map((syllable, index) =>
          createVisualHandCard(syllable, ENEMY, enemyHandRefs[index]),
        ),
      };
    },
    [createVisualHandCard, resolveDeckCatalogForSide],
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
  gameRef.current = game;
  const previousEnemyHandSignatureRef = useRef<string>("");
  const lastHiddenAtRef = useRef<number | null>(null);
  const needsVisibilityRecoveryRef = useRef(false);
  const pendingResultOverlayRecoveryRef = useRef(false);
  const visibilityRecoveryFrameRef = useRef<number | null>(null);

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
      const handRefs = resolveBattleRuntimePlayerCardPiles(
        gameRef.current.players[side],
        resolveDeckCatalogForSide(side),
      ).hand;
      const buckets = new Map<string, VisualHandCard[]>();
      currentStableSide.forEach((card) => {
        const bucketKey = card.runtimeCardId ?? card.syllable;
        const bucket = buckets.get(bucketKey) ?? [];
        bucket.push(card);
        buckets.set(bucketKey, bucket);
      });

      return logicalHand.map((syllable, index) => {
        const cardRef = handRefs[index];
        const bucket = buckets.get(cardRef?.runtimeCardId ?? syllable);
        if (bucket && bucket.length > 0) {
          return bucket.shift()!;
        }

        return createVisualHandCard(syllable, side, cardRef);
      });
    },
    [createVisualHandCard, gameRef, resolveDeckCatalogForSide],
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
      if (!current[side].some((card) => card.id === id)) return;
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
      if (!current[side].some((card) => card.id === id)) return;
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
  const {
    bindZoneRef,
    bindHandCardRef,
    snapshotZone,
    snapshotZoneSlot,
    getZoneSlotRect,
    snapshotHandCard,
    resolveBattleStageMetrics,
    serializeZoneAnchorSnapshot,
    snapshotSceneAnimationOrigin,
    snapshotSceneAnimationOriginWithFallback,
    getPostPlayHandDrawOriginSnapshot,
    getHandPlayTargetDestinationSnapshot,
    getReplacementTargetEntryOriginSnapshot,
    getMulliganHandReturnDestinationSnapshot,
    getMulliganHandDrawOriginSnapshot,
    getBattleStageMetrics,
  } = useBattleControllerGeometry({
    localPlayerIndex,
    animations: activeBattleLayout.animations,
    zoneNodesRef,
    handCardNodesRef,
    animationFallbackHistoryRef,
    animationFallbackIdRef,
    setAnimationFallbackHistoryVersion,
  });
  const {
    liveAnimationDebugData,
    buildBattleDevSnapshot,
    latestFallbackEvent,
    battleDebugWatcherSummary,
  } = useBattleControllerDebug({
    animations: activeBattleLayout.animations,
    game,
    localPlayerIndex,
    remotePlayerIndex,
    mode,
    roomTransportKind,
    authoritativeBattleSnapshot,
    pendingExternalAction,
    stableHands,
    incomingHands,
    outgoingHands,
    pendingMulliganDrawCountsRef,
    pendingMulliganDrawQueuesRef,
    incomingTargets,
    outgoingTargets,
    lockedTargetSlots,
    pendingTargetPlacements,
    freshCardIds,
    mulliganDebug,
    battleEventsRef,
    battleDebugSamplesRef,
    battleDebugStartedAtRef,
    battleDebugLastSignatureRef,
    animationFallbackHistoryRef,
    battleDebugWatcherVersion,
    animationFallbackHistoryVersion,
    turnRemainingMs,
    coinChoiceRemainingMs,
    actionTimersRef,
    visualTimersRef,
    zoneNodesRef,
    handCardNodesRef,
    handLaneDebugRef,
    fieldLaneDebugRef,
    getBattleStageMetrics,
    resolveBattleStageMetrics,
    serializeZoneAnchorSnapshot,
    snapshotSceneAnimationOrigin,
    snapshotZone,
    snapshotZoneSlot,
    snapshotHandCard,
  });
  const bumpBattleDebugWatcherVersion = useCallback(() => {
    setBattleDebugWatcherVersion((value) => value + 1);
  }, []);

  const clearAnimationFallbacks = useCallback(() => {
    animationFallbackHistoryRef.current = [];
    setAnimationFallbackHistoryVersion((value) => value + 1);
  }, []);

  const damageBattleDev = useCallback(
    (side: "player" | "enemy", amount = 10) => {
      if (mode === "multiplayer") {
        console.warn("[battleDev] O helper de dano estÃ¡ desativado no multiplayer para nÃ£o dessincronizar a sala.");
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
    [localPlayerIndex, mode, remotePlayerIndex],
  );

  const { clearBattleDebugWatcher, downloadBattleDebugDump } = useBattleDevRuntime({
    enabled: import.meta.env.DEV,
    buildBattleDevSnapshot,
    battleDebugSamplesRef,
    battleDebugSampleIdRef,
    battleDebugStartedAtRef,
    battleDebugLastSignatureRef,
    bumpBattleDebugWatcherVersion,
    clearAnimationFallbacks,
    damage: damageBattleDev,
  });

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
      const handRefs = resolveBattleRuntimePlayerCardPiles(
        gameRef.current.players[side],
        resolveDeckCatalogForSide(side),
      ).hand;

      cards.forEach((card, index) => {
        const resolvedHandIndex = Math.min(handRefs.length - 1, finalIndexBase + index);
        const visualCard = createVisualHandCard(
          card,
          side,
          resolvedHandIndex >= 0 ? handRefs[resolvedHandIndex] : undefined,
        );
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
    [appendIncomingCard, appendStableCard, createVisualHandCard, gameRef, resolveDeckCatalogForSide, snapshotZone],
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
      if (!incomingHandsRef.current[incomingCard.side].some((card) => card.id === incomingCard.id)) {
        return;
      }
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
      if (!outgoingHandsRef.current[outgoingCard.side].some((card) => card.id === outgoingCard.id)) {
        return;
      }
      removeOutgoingCard(outgoingCard.side, outgoingCard.id);
    },
    [removeOutgoingCard],
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
    const freshGame = initialGameState
      ? cloneInitialGame(initialGameState)
      : createBattleRuntimeInitialGameState(setup);
    hydrateBattleSnapshot(freshGame);
  };

  const { beginCoinChoiceResolution } = useBattleIntroFlow<VisualTargetEntity>({
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
    animations: activeBattleLayout.animations,
    zoneIdForSide,
    snapshotSceneAnimationOriginWithFallback,
    snapshotZone,
    toVisualTarget,
    appendIncomingTarget,
    setStableTargetSlot,
    timing: {
      coinChoiceMs: INTRO.coinChoiceMs,
      coinDropMs: INTRO.coinDropMs,
      coinSettleMs: INTRO.coinSettleMs,
      coinResultHoldMs: INTRO.coinResultHoldMs,
      coinResultFaceMs: INTRO.coinResultFaceMs,
      targetEnterStaggerMs: INTRO.targetEnterStaggerMs,
      targetSettleMs: INTRO.targetSettleMs,
      turnReleaseDelayMs: TURN_RELEASE_DELAY_MS,
      turnLimitMs: TURN_TIMER.limitMs,
    },
  });


  useEffect(() => {
    return () => {
      clearAllTimers();
      clearVisualTimers();
    };
  }, [clearAllTimers, clearVisualTimers]);

  useEffect(() => {
    const updateViewportMode = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);
  const isCompactTightViewport = usesMobileShell && viewportHeight <= 464;
  const compactTopShellClassName = isCompactTightViewport
    ? "h-full w-full"
    : "h-full w-full";
  const compactControlShellClassName = isCompactTightViewport
    ? "h-full w-full"
    : "h-full w-full";
  const compactFooterFrameClassName = isCompactTightViewport ? "origin-top scale-[0.86]" : undefined;
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


  const { hasBlockingVisuals } = useBattleVisualOrchestrator<
    VisualHandCard,
    StableHandsState,
    StableTargetsState,
    LockedTargetSlotsState
  >({
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
  });

  const {
    finalizeTurn,
    getTurnMessageTitle,
    isSnapshotCheckpointClear,
    isIntroSnapshotState,
    isWinnerSnapshotState,
  } = useBattleTurnFlow({
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
    timing: {
      turnLimitMs: TURN_TIMER.limitMs,
      warningMs: TURN_TIMER.warningMs,
      releaseDelayMs: TURN_RELEASE_DELAY_MS,
      bannerDurationMs: TURN_PRESENTATION.bannerDurationMs,
      preBannerDelayMs: TURN_PRESENTATION.preBannerDelayMs,
      interactionReleaseBufferMs: TURN_PRESENTATION.interactionReleaseBufferMs,
    },
  });

  const {
    handleOutgoingTargetComplete,
    commitIncomingTargetToField,
    executeBattleTurnAction,
  } = useBattleCombatFlow<VisualHandCard, VisualTargetEntity>({
    flow: FLOW,
    localPlayerIndex,
    playerDeckSpec,
    enemyDeckSpec,
    handLayoutSlotCount: HAND_LAYOUT_SLOT_COUNT,
    game,
    gameRef,
    stableHandsRef,
    stableTargetsRef,
    pendingMulliganDrawCountsRef,
    pendingMulliganDrawQueuesRef,
    actionTimersRef,
    activeBattleLayoutAnimations: activeBattleLayout.animations,
    isDesktopViewport,
    zoneIdForSide,
    snapshotSceneAnimationOriginWithFallback,
    snapshotZone,
    snapshotZoneSlot,
    getPostPlayHandDrawOriginSnapshot,
    getReplacementTargetEntryOriginSnapshot,
    getMulliganHandReturnDestinationSnapshot,
    getMulliganHandDrawOriginSnapshot,
    getHandPlayTargetDestinationSnapshot,
    appendOutgoingTarget,
    removeOutgoingTarget,
    appendIncomingTarget,
    removeIncomingTarget,
    appendOutgoingCard,
    removeStableCards,
    queueHandDrawBatch,
    setStableTargetSlot,
    lockTargetSlot,
    setPendingTargetPlacement,
    commitPendingMulliganDrawCounts,
    commitIncomingHands,
    commitOutgoingHands,
    commitOutgoingTargets,
    incomingHandsRef,
    outgoingHandsRef,
    outgoingTargetsRef,
    toVisualTarget,
    finalizeTurn,
    setGame,
    addLog,
    buildPlayChronicleEntries,
    buildHandSwapChronicleEntry,
    emitBattleEvent,
    emitDamageAppliedEvent,
    emitTargetReplacedEvent,
  });


  const snapshotActionOrigin = useCallback(
    (side: typeof PLAYER | typeof ENEMY, action: BattleTurnAction) => {
      if (action.type !== "play") return null;
      const selectedStableCard = stableHandsRef.current[side][action.handIndex];
      return selectedStableCard ? snapshotHandCard(selectedStableCard.id) : null;
    },
    [snapshotHandCard],
  );

  const { dispatchBattleAction } = useBattleRoomBridge<VisualHandCard>({
    mode,
    localSide,
    roomTransportKind,
    enableMockRoomBot,
    localPlayerIndex,
    remotePlayerIndex,
    introPhase,
    game,
    gameRef,
    onActionRequested,
    pendingExternalAction,
    onExternalActionConsumed,
    processedExternalActionIdsRef,
    actionSequenceRef,
    battleActionIdRef,
    stableHandsRef,
    setMulliganDebug,
    snapshotActionOrigin,
    executeBattleTurnAction,
  });


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

  useBattleSnapshotAuthority({
    mode,
    localSide,
    authoritativeBattleSnapshot,
    onBattleSnapshotPublished,
    game,
    gameRef,
    introPhase,
    turnPresentationLocked,
    visualQueue: {
      incomingHands,
      outgoingHands,
      pendingMulliganDrawCounts,
      incomingTargets,
      outgoingTargets,
      lockedTargetSlots,
      pendingTargetPlacements,
      freshCardIds,
      enemyHandPulse,
    },
    cloneGame: cloneInitialGame,
    clearVisualTimers,
    setFreshCardIds,
    setEnemyHandPulse,
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
  });


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

    return {
      key: displayedTarget?.id ?? `enemy-slot-${idx}`,
      slotRef: bindZoneRef("enemyField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: getZoneSlotRect("enemyField", `slot-${idx}`),
      selectedCard: null,
      canClick: false,
      onClick: () => {},
      onIncomingTargetComplete: commitIncomingTargetToField,
      onOutgoingTargetComplete: handleOutgoingTargetComplete,
      playerHand: [],
    };
  });
  const playerFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = stableTargets[localPlayerIndex][idx];
    const incomingTarget = incomingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const outgoingTarget = outgoingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = outgoingTarget?.entity ?? incomingTarget?.entity ?? visualTarget;

    return {
      key: displayedTarget?.id ?? `player-slot-${idx}`,
      slotRef: bindZoneRef("playerField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      slotRect: getZoneSlotRect("playerField", `slot-${idx}`),
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
  const handleSelectPlayerHandCard = useCallback(
    (index: number) => {
      setGame((prev) => {
        const already = prev.selectedHandIndexes.includes(index);
        const swapMode =
          introPhase === "done" &&
          prev.turn === localPlayerIndex &&
          !turnPresentationLocked &&
          !prev.combatLocked &&
          !prev.actedThisTurn &&
          !prev.players[localPlayerIndex].mulliganUsedThisRound &&
          isHandStuck(prev.players[localPlayerIndex]);

        const next = already
          ? prev.selectedHandIndexes.filter((selectedIndex) => selectedIndex !== index)
          : swapMode
            ? (prev.selectedHandIndexes.length < CONFIG.maxMulligan
                ? [...prev.selectedHandIndexes, index]
                : [index])
            : [index];

        return {
          ...prev,
          selectedHandIndexes: next,
          selectedCardForPlay: next.length === 1 ? next[0] : null,
        };
      });
    },
    [introPhase, localPlayerIndex, turnPresentationLocked],
  );
  const { sceneModel, enemyFieldHasOutgoingTarget, playerFieldHasOutgoingTarget } = useMemo(
    () =>
      buildBattleSceneModelFromRuntime({
        runtime: {
          game,
          introPhase,
          openingTurnSide,
          coinResultStage,
          selectedCoinFace,
          revealedCoinFace,
          plannedCoinFace,
          turnRemainingMs,
          coinChoiceRemainingMs,
          turnPresentationLocked,
          showResultOverlay,
          hoveredCardIndex,
          stableHands,
          stableTargets,
          mulliganDebug,
        },
        visualQueue: {
          incomingHands,
          outgoingHands,
          pendingMulliganDrawCounts,
          incomingTargets,
          outgoingTargets,
          lockedTargetSlots,
          pendingTargetPlacements,
          freshCardIds,
          enemyHandPulse,
        },
        localPlayerIndex,
        remotePlayerIndex,
        localPlayerName: safeLocalPlayerName,
        remotePlayerName: safeRemotePlayerName,
        localPlayerAvatar,
        remotePlayerAvatar,
        bindZoneRef,
        onPlayTarget: playOnTarget,
        onMulligan: handleMulligan,
        onHoverPlayerHandCard: setHoveredCardIndex,
        onSelectPlayerHandCard: handleSelectPlayerHandCard,
        bindHandCardRef,
        onCommitIncomingHandCard: commitIncomingCardToHand,
        onCompleteOutgoingHandCard: handleOutgoingCardComplete,
        onCommitIncomingTarget: commitIncomingTargetToField,
        onCompleteOutgoingTarget: handleOutgoingTargetComplete,
        onHandDebugSnapshot: setHandLaneDebugSnapshot,
      }),
    [
      bindHandCardRef,
      bindZoneRef,
      coinChoiceRemainingMs,
      coinResultStage,
      commitIncomingCardToHand,
      commitIncomingTargetToField,
      enemyHandPulse,
      freshCardIds,
      game,
      handleMulligan,
      handleOutgoingCardComplete,
      handleOutgoingTargetComplete,
      handleSelectPlayerHandCard,
      hoveredCardIndex,
      incomingHands,
      incomingTargets,
      introPhase,
      localPlayerAvatar,
      localPlayerIndex,
      lockedTargetSlots,
      mulliganDebug,
      openingTurnSide,
      outgoingHands,
      outgoingTargets,
      pendingMulliganDrawCounts,
      pendingTargetPlacements,
      plannedCoinFace,
      playOnTarget,
      remotePlayerAvatar,
      remotePlayerIndex,
      revealedCoinFace,
      safeLocalPlayerName,
      safeRemotePlayerName,
      selectedCoinFace,
      setHandLaneDebugSnapshot,
      showResultOverlay,
      stableHands,
      stableTargets,
      turnPresentationLocked,
      turnRemainingMs,
    ],
  );

  return {
    viewportWidth,
    viewportHeight,
    usesMobileShell,
    isCompactTightViewport,
    activeBattleLayout,
    compactTopShellClassName,
    compactControlShellClassName,
    compactFooterFrameClassName,
    runtimeState: {
      game,
      introPhase,
      openingTurnSide,
      coinResultStage,
      selectedCoinFace,
      revealedCoinFace,
      plannedCoinFace,
      turnRemainingMs,
      coinChoiceRemainingMs,
      turnPresentationLocked,
      showResultOverlay,
      hoveredCardIndex,
      stableHands,
      stableTargets,
      mulliganDebug,
    },
    visualQueue: {
      incomingHands,
      outgoingHands,
      pendingMulliganDrawCounts,
      incomingTargets,
      outgoingTargets,
      lockedTargetSlots,
      pendingTargetPlacements,
      freshCardIds,
      enemyHandPulse,
    },
    sceneModel,
    enemyFieldHasOutgoingTarget,
    playerFieldHasOutgoingTarget,
    bindZoneRef,
    setFieldLaneDebugSnapshot,
    resetGame,
    clearBattleDebugWatcher,
    downloadBattleDebugDump,
    clearAnimationFallbacks,
    battleDebugWatcherSummary,
    latestFallbackEvent,
    liveAnimationDebugData,
    coinChoiceTimerLabel,
    coinSpinRotations,
    coinSpinScales,
    finalCoinRotation,
    openingIntroTitle,
    openingIntroSubtitle,
    openingStarterMessage,
    revealedCoinFaceLabel,
    resultTitle,
    resultAvatar,
    resultLabel,
    resultAccentClasses,
    beginCoinChoiceResolution,
  } satisfies BattleController;
};



