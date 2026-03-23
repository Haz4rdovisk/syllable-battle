import React, { useCallback, useEffect, useRef, useState } from "react";
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
  normalizePlayerName,
} from "../../types/game";
import {
  makeInitialGame,
  CONFIG,
  TIMINGS,
  canPlace,
  isHandStuck,
  clearTransientPlayerState,
  replaceTargetInSlot,
} from "../../logic/gameLogic";
import {
  TargetCard,
  PlayerPortrait,
  SyllableCard,
  CardBackCard,
  CardPile,
  BoardTravelLayer,
  BoardTravelMotion,
  BoardZoneId,
  ZoneAnchorSnapshot,
  TRAVEL_TARGET_CARD_SIZE,
  getTravelSyllableCardSize,
  VisualTargetEntity,
  TargetMotionLayer,
  TargetTransitMotion,
} from "../game/GameComponents";
import { BattleFieldLane } from "./BattleFieldLane";
import { AnimatePresence, motion } from "motion/react";
import { BadgeDollarSign, Crown, LogOut, RefreshCw, RotateCcw, Swords } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  createDamageAppliedEvent,
  createMulliganResolutionEvents,
  createPlayResolutionEvents,
  createTargetReplacedEvent,
  createTurnStartedEvent,
} from "./battleEvents";
import {
  getEnemyHandLayout,
  getMulliganDrawStartDelayMs,
  getMulliganFinishDelayMs,
  getPlayDrawStartDelayMs,
  getPlayFinishDelayMs,
  getPlayedCardCommitDelayMs,
  getPlayerHandLayout,
  resolveBotTurnAction,
} from "./battleFlow";
import { resolveBattleMulliganAction, resolveBattlePlayAction } from "./battleResolution";

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

  if (next.turn !== current.turn) return next.turn - current.turn;

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

const HandFan: React.FC<{
  side: typeof PLAYER | typeof ENEMY;
  presentation: "local" | "remote";
  stableCards: VisualHandCard[];
  incomingCards?: IncomingHandCard[];
  scale: "desktop" | "mobile";
  pulse?: boolean;
  anchorRef?: React.Ref<HTMLDivElement>;
  onIncomingCardComplete?: (incomingCard: IncomingHandCard) => void;
  hoveredCardIndex?: number | null;
  onHoverCard?: (index: number | null) => void;
  selectedIndexes?: number[];
  canInteract?: boolean;
  showTurnHighlights?: boolean;
  showPlayableHints?: boolean;
  targets?: GameState["players"][0]["targets"];
  onCardClick?: (index: number) => void;
  freshCardIds?: string[];
  bindCardRef?: (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => void;
}> = ({
  side,
  presentation,
  stableCards,
  scale,
  pulse = false,
  anchorRef,
  incomingCards = [],
  onIncomingCardComplete,
  hoveredCardIndex = null,
  onHoverCard,
  selectedIndexes = [],
  canInteract = false,
  showTurnHighlights = false,
  showPlayableHints = false,
  targets = [],
  onCardClick,
  freshCardIds = [],
  bindCardRef,
}) => {
  const isLocalPresentation = presentation === "local";
  const isDesktop = scale === "desktop";
  const visibleCards = Math.min(stableCards.length, 5);
  const minHeight = isDesktop ? "min-h-[150px]" : "min-h-[120px]";
  const height = isDesktop ? "h-[150px]" : "h-[120px]";
  const width =
    isLocalPresentation
      ? isDesktop
        ? "max-w-[720px]"
        : "max-w-[660px]"
      : isDesktop
        ? "max-w-[560px]"
        : "max-w-[320px]";
  const hostRef = useRef<HTMLDivElement | null>(null);
  const totalCards = Math.min(HAND_LAYOUT_SLOT_COUNT, stableCards.length + incomingCards.length);
  const getLayout = isLocalPresentation ? getPlayerHandLayout : getEnemyHandLayout;

  return (
    <motion.div
      animate={pulse ? { y: [0, -6, 0], rotate: [0, 1, 0] } : {}}
      transition={{ duration: 0.62, ease: "easeOut" }}
      className={cn("relative flex w-full items-end justify-center overflow-visible", minHeight)}
    >
      <div
        ref={(node) => {
          hostRef.current = node;
          if (typeof anchorRef === "function") anchorRef(node);
        }}
        className={cn("relative flex h-full w-full items-end justify-center", height, width)}
      >
        <AnimatePresence>
          {stableCards.map((card, i) => {
            const layout = getLayout(totalCards, i, isDesktop);
            const selected = selectedIndexes.includes(i);
            const playable = isLocalPresentation ? targets.some((target) => canPlace(card.syllable, target)) : false;

            return (
              <motion.div
                key={card.id}
                initial={
                  card.skipEntryAnimation
                    ? false
                    : isLocalPresentation
                      ? { x: 600, y: 0, opacity: 0, rotate: 90, scale: 1 }
                      : { x: 0, y: -60, opacity: 0, rotate: layout.rotate, scale: 0.9 }
                }
                animate={{
                  x: layout.x,
                  y: isLocalPresentation && selected ? (isDesktop ? -28 : -18) : layout.y,
                  rotate: layout.rotate,
                  opacity: 1,
                  scale: isLocalPresentation && hoveredCardIndex === i ? 1.14 : 1,
                }}
                exit={{ opacity: 0, transition: { duration: 0.01 } }}
                transition={{ type: "spring", stiffness: 82, damping: 22 }}
                onMouseEnter={() => onHoverCard?.(i)}
                onMouseLeave={() => onHoverCard?.(null)}
                ref={bindCardRef?.(card.id, scale)}
                className={cn("absolute bottom-0", isLocalPresentation && "cursor-pointer")}
                style={{ zIndex: isLocalPresentation && hoveredCardIndex === i ? 100 : i }}
              >
                {isLocalPresentation ? (
                  <SyllableCard
                    syllable={card.syllable}
                    selected={selected}
                    playable={playable && showPlayableHints}
                    newlyDrawn={freshCardIds.includes(card.id) && showTurnHighlights}
                    attentionPulse={playable && showPlayableHints}
                    disabled={!canInteract}
                    onClick={() => onCardClick?.(i)}
                  />
                ) : (
                  <CardBackCard />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hostRef.current &&
          incomingCards.map((incomingCard) => {
            const hostRect = hostRef.current!.getBoundingClientRect();
            const cardSize = getTravelSyllableCardSize();
            const layout = getLayout(incomingCard.finalTotal, incomingCard.finalIndex, isDesktop);
            const startX = incomingCard.origin.left + incomingCard.origin.width / 2 - hostRect.left - cardSize.width / 2;
            const startY = incomingCard.origin.top + incomingCard.origin.height / 2 - hostRect.top - cardSize.height / 2;
            const endX = hostRect.width / 2 - cardSize.width / 2 + layout.x;
            const endY = hostRect.height - cardSize.height + layout.y;

            return (
              <motion.div
                key={incomingCard.id}
                initial={{ x: startX, y: startY, rotate: 0, scale: 0.94, opacity: 0 }}
                animate={{ x: endX, y: endY, rotate: layout.rotate, scale: 1, opacity: 1 }}
                transition={{
                  delay: incomingCard.delayMs / 1000,
                  duration: incomingCard.durationMs / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={() => onIncomingCardComplete?.(incomingCard)}
                className="pointer-events-none absolute left-0 top-0 z-[120]"
              >
                {isLocalPresentation ? (
                  <SyllableCard
                    syllable={incomingCard.card.syllable}
                    selected={false}
                    playable={showPlayableHints}
                    newlyDrawn={showTurnHighlights}
                    attentionPulse={false}
                    floating={true}
                    disabled={true}
                    onClick={() => {}}
                  />
                ) : (
                  <CardBackCard floating={true} />
                )}
              </motion.div>
            );
          })}
      </div>
    </motion.div>
  );
};

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
  const [turnElapsedMs, setTurnElapsedMs] = useState(0);
  const [enemyHandPulse, setEnemyHandPulse] = useState(false);
  const [travelMotions, setTravelMotions] = useState<BoardTravelMotion[]>([]);
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
  const travelMotionsRef = useRef<BoardTravelMotion[]>(travelMotions);
  const travelMotionIdRef = useRef(0);
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
  const presentedTurnKeyRef = useRef(
    initialGameRef.current.openingIntroStep === "done"
      ? `${initialGameRef.current.setupVersion}:${initialGameRef.current.turn}`
      : `${initialGameRef.current.setupVersion}:intro`,
  );
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
  const [incomingTargets, setIncomingTargets] = useState<Record<typeof PLAYER | typeof ENEMY, IncomingTargetCard[]>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const incomingTargetsRef = useRef(incomingTargets);
  const [targetMotions, setTargetMotions] = useState<TargetTransitMotion[]>([]);
  const targetMotionsRef = useRef<TargetTransitMotion[]>([]);
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
  gameRef.current = game;
  const previousEnemyHandSignatureRef = useRef<string>("");
  const lastHiddenAtRef = useRef<number | null>(null);
  const needsVisibilityRecoveryRef = useRef(false);
  const pendingResultOverlayRecoveryRef = useRef(false);

  const addLog = (log: string[], message: string) => [message, ...log].slice(0, CONFIG.logSize);
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

  const commitIncomingTargets = useCallback(
    (nextTargets: Record<typeof PLAYER | typeof ENEMY, IncomingTargetCard[]>) => {
      incomingTargetsRef.current = nextTargets;
      setIncomingTargets(nextTargets);
    },
    [],
  );

  const commitTargetMotions = useCallback((nextMotions: TargetTransitMotion[]) => {
    targetMotionsRef.current = nextMotions;
    setTargetMotions(nextMotions);
  }, []);

  const commitLockedTargetSlots = useCallback((nextLockedSlots: LockedTargetSlotsState) => {
    lockedTargetSlotsRef.current = nextLockedSlots;
    setLockedTargetSlots(nextLockedSlots);
  }, []);

  const commitPendingTargetPlacements = useCallback((nextPending: PendingTargetPlacementsState) => {
    pendingTargetPlacementsRef.current = nextPending;
    setPendingTargetPlacements(nextPending);
  }, []);

  const commitTravelMotions = useCallback((nextMotions: BoardTravelMotion[]) => {
    travelMotionsRef.current = nextMotions;
    setTravelMotions(nextMotions);
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

  const appendTargetMotion = useCallback(
    (motion: TargetTransitMotion) => {
      const current = targetMotionsRef.current;
      commitTargetMotions([...current, motion]);
    },
    [commitTargetMotions],
  );

  const removeTargetMotion = useCallback(
    (motionId: string) => {
      const current = targetMotionsRef.current;
      commitTargetMotions(current.filter((motion) => motion.id !== motionId));
    },
    [commitTargetMotions],
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

  // Battle resolve as zonas nomeadas em snapshots absolutos e agenda a ordem dos eventos.
  const queueZoneTravel = useCallback(
    (
      motion: Omit<BoardTravelMotion, "id" | "origin" | "destination">,
    ) => {
      const origin = motion.originOverride ?? snapshotZone(motion.from);
      const destination = motion.destinationOverride ?? snapshotZone(motion.to);

      if (!origin || !destination) return null;

      const id = `travel-${travelMotionIdRef.current++}`;
      commitTravelMotions([
        ...travelMotionsRef.current,
        {
          ...motion,
          id,
          origin,
          destination,
        },
      ]);
      return id;
    },
    [commitTravelMotions, snapshotZone],
  );

  const handleTravelMotionComplete = useCallback((id: string) => {
    commitTravelMotions(travelMotionsRef.current.filter((motion) => motion.id !== id));
  }, [commitTravelMotions]);

  const queueStableCardTravel = useCallback(
    (
      card: VisualHandCard,
      config: Omit<BoardTravelMotion, "id" | "origin" | "destination" | "entityId" | "label" | "side">,
    ) => {
      return queueZoneTravel({
        ...config,
        entityId: card.id,
        label: card.syllable,
        side: card.side === PLAYER ? "player" : "enemy",
      });
    },
    [queueZoneTravel],
  );

  const queueHandDrawBatch = useCallback(
    (
      side: typeof PLAYER | typeof ENEMY,
      cards: Syllable[],
      config?: { initialDelayMs?: number; staggerMs?: number; durationMs?: number },
    ) => {
      if (cards.length === 0) return;

      const origin = snapshotZone(zoneIdForSide(side, "deck"));
      const stableCount = stableHandsRef.current[side].length;
      const incomingCount = incomingHandsRef.current[side].length;
      const baseCount = stableCount + incomingCount;
      const finalTotal = Math.min(HAND_LAYOUT_SLOT_COUNT, baseCount + cards.length);

      cards.forEach((card, index) => {
        const visualCard = createVisualHandCard(card, side);
        if (!origin) {
          appendStableCard(side, visualCard, { skipEntryAnimation: false });
          return;
        }

        appendIncomingCard(side, {
          id: `incoming-${visualCard.id}`,
          side,
          card: visualCard,
          origin,
          finalIndex: Math.min(HAND_LAYOUT_SLOT_COUNT - 1, baseCount + index),
          finalTotal,
          delayMs: (config?.initialDelayMs ?? 0) + index * (config?.staggerMs ?? 130),
          durationMs: config?.durationMs ?? 940,
        });
      });
    },
    [appendIncomingCard, appendStableCard, createVisualHandCard, snapshotZone],
  );

  const commitIncomingCardToHand = useCallback(
    (incomingCard: IncomingHandCard) => {
      removeIncomingCard(incomingCard.side, incomingCard.id);
      appendStableCard(incomingCard.side, incomingCard.card, { skipEntryAnimation: true });
      if (incomingCard.side === PLAYER) {
        markFreshCard(incomingCard.card.id);
      }
    },
    [appendStableCard, markFreshCard, removeIncomingCard],
  );

  const buildBattleSnapshotSignature = useCallback(
    (state: GameState) =>
      JSON.stringify({
        setupVersion: state.setupVersion,
        turn: state.turn,
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
      const nextTurnPresentationKey = `${freshGame.setupVersion}:${freshGame.turn}`;
      const shouldReplayTurnPresentation =
        freshGame.openingIntroStep === "done" &&
        (previousGame.setupVersion !== freshGame.setupVersion || previousGame.turn !== freshGame.turn);
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
      commitIncomingTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      commitPendingTargetPlacements({
        [PLAYER]: Array(CONFIG.targetsInPlay).fill(null),
        [ENEMY]: Array(CONFIG.targetsInPlay).fill(null),
      });
      commitTargetMotions([]);
      commitLockedTargetSlots({
        [PLAYER]: Array(CONFIG.targetsInPlay).fill(false),
        [ENEMY]: Array(CONFIG.targetsInPlay).fill(false),
      });
      commitTravelMotions([]);
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
      processedExternalActionIdsRef.current = new Set();
      pendingAuthoritativeSnapshotRef.current = null;
      publishedSnapshotSignatureRef.current = "";
      actionSequenceRef.current = {
        [PLAYER]: 0,
        [ENEMY]: 0,
      };
      presentedTurnKeyRef.current =
        freshGame.openingIntroStep !== "done"
          ? `${freshGame.setupVersion}:intro`
          : shouldReplayTurnPresentation
            ? ""
            : nextTurnPresentationKey;
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
      commitIncomingTargets,
      commitLockedTargetSlots,
      commitPendingTargetPlacements,
      commitTargetMotions,
      commitTravelMotions,
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
          "window.__battleDev.damage('player', 10)",
          "window.__battleDev.damage('enemy', 10)",
          "window.__battleDev.kill('enemy')",
        ].join("\n"),
    };

    return () => {
      delete window.__battleDev;
    };
  }, [localPlayerIndex, mode, remotePlayerIndex]);

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

    const startedAt = Date.now();
    setTurnElapsedMs(0);

    const interval = setInterval(() => {
      setTurnElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [game.turn, game.setupVersion, game.winner, introPhase]);

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
        const origin = snapshotZone(zoneIdForSide(side, "targetDeck"));
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
          delayMs: index * INTRO.targetEnterStaggerMs,
          durationMs: TIMINGS.leaveMs,
        });
      });

      const settleTimer = setTimeout(() => {
        if (!introAuthorityLocal) return;
        setGame((prev) => ({
          ...prev,
          openingIntroStep: "done",
        }));
      }, (stagedTargets.length - 1) * INTRO.targetEnterStaggerMs + TIMINGS.leaveMs + INTRO.targetSettleMs);

      visualTimersRef.current.push(settleTimer);
    };

    const timer = setTimeout(queueInitialTargets, 40);
    visualTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [appendIncomingTarget, introPhase, localPlayerIndex, localSide, mode, openingTurnSide, setStableTargetSlot, snapshotZone, toVisualTarget, zoneIdForSide]);

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
      [PLAYER]: incomingHands[PLAYER].length,
      [ENEMY]: incomingHands[ENEMY].length,
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
  }, [commitStableHands, game, incomingHands, reconcileStableSide, stableHands]);

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
      travelMotionsRef.current.length > 0 ||
      incomingHandsRef.current[PLAYER].length > 0 ||
      incomingHandsRef.current[ENEMY].length > 0 ||
      incomingTargetsRef.current[PLAYER].length > 0 ||
      incomingTargetsRef.current[ENEMY].length > 0 ||
      targetMotionsRef.current.length > 0,
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
        actedThisTurn: false,
        combatLocked: false,
        selectedHandIndexes: [],
        selectedCardForPlay: null,
        log: addLog(prev.log, nextTurn === localPlayerIndex ? "Seu turno comecou." : "Turno do oponente."),
      };
    });
    const nextTurnSide = gameRef.current.turn === PLAYER ? ENEMY : PLAYER;
    emitTurnStartedEvent(gameRef.current.turn + 1, nextTurnSide);
  }, [clearAllTimers, emitTurnStartedEvent, hasBlockingVisuals, localPlayerIndex]);

  const handleTargetMotionComplete = useCallback(
    (motionId: string) => {
      const motion = targetMotionsRef.current.find((item) => item.id === motionId);
      if (!motion) return;

      removeTargetMotion(motionId);
    },
    [removeTargetMotion],
  );

  const queueCompletedTargetDeparture = useCallback(
    (result: {
      actorIndex: number;
      completedSlot: number | null;
    }) => {
      if (result.completedSlot == null) return;

      const side = result.actorIndex;
      const stableTarget = stableTargetsRef.current[side][result.completedSlot];
      const origin = snapshotZoneSlot(zoneIdForSide(side, "field"), `slot-${result.completedSlot}`);
      const destination = snapshotZone(zoneIdForSide(side, "discard"));

      if (!stableTarget || !origin || !destination) {
        setStableTargetSlot(side, result.completedSlot, null);
        lockTargetSlot(side, result.completedSlot, true);
        return;
      }

      lockTargetSlot(side, result.completedSlot, true);
      setStableTargetSlot(side, result.completedSlot, null);
      appendTargetMotion({
        id: `target-motion-${stableTarget.id}-depart`,
        type: "attack-exit",
        side: side === localPlayerIndex ? "player" : "enemy",
        slotIndex: result.completedSlot,
        entity: stableTarget,
        origin,
        destination,
        attackMs: TIMINGS.attackMs - 280,
        pauseMs: 220,
        exitMs: TIMINGS.leaveMs,
      });
    },
    [appendTargetMotion, localPlayerIndex, lockTargetSlot, setStableTargetSlot, snapshotZone, snapshotZoneSlot],
  );

  const queueReplacementTargetArrival = useCallback(
    (
      actorIndex: number,
      slotIndex: number,
      logicalTarget: GameState["players"][0]["targets"][number],
    ) => {
      if (!logicalTarget) {
        lockTargetSlot(actorIndex, slotIndex, false);
        return;
      }

      const origin = snapshotZone(zoneIdForSide(actorIndex, "targetDeck"));
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
    [appendIncomingTarget, lockTargetSlot, setStableTargetSlot, snapshotZone, toVisualTarget],
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
    const attackStartDelay = FLOW.cardToFieldMs + FLOW.cardSettleMs + FLOW.attackWindupMs;
    const impactDelayMs = attackStartDelay + FLOW.attackTravelMs;
    const replacementDelayMs =
      attackStartDelay +
      FLOW.attackTravelMs +
      FLOW.impactPauseMs +
      FLOW.targetExitMs +
      FLOW.replacementGapMs;
    const combatResolveEndMs = replacementDelayMs + FLOW.targetEnterMs;
    const drawStartDelayMs = impactDelayMs + FLOW.impactPauseMs + 120;
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
      log: result.logs.reduce((acc, l) => addLog(acc, l), prev.log),
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
    drawnCards,
  }: {
    side: typeof PLAYER | typeof ENEMY;
    removedStableCards: VisualHandCard[];
    drawnCards: Syllable[];
  }) => {
    createMulliganResolutionEvents({
      turn: game.turn,
      side,
      returned: removedStableCards.map((card) => card.syllable),
      drawn: drawnCards,
    }).forEach(emitBattleEvent);

    removedStableCards.forEach((card, index) => {
      queueStableCardTravel(card, {
        from: zoneIdForSide(side, "hand"),
        to: zoneIdForSide(side, "deck"),
        kind: side === localPlayerIndex ? "syllable" : "card-back",
        delayMs: index * FLOW.mulliganReturnStaggerMs,
        durationMs: FLOW.mulliganReturnMs,
        arcHeight: 92,
      });
    });

    queueHandDrawBatch(side, drawnCards, {
      initialDelayMs: getMulliganDrawStartDelayMs(FLOW, removedStableCards.length),
      staggerMs: FLOW.drawStaggerMs,
      durationMs: FLOW.drawTravelMs,
    });

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

      const [playedStableCard] = removeStableCards(side, [move.handIndex]);
      lockTargetSlot(side, move.targetIndex, true);
      setPendingTargetPlacement(side, move.targetIndex, result.playedCard);

      if (playedStableCard) {
        queueStableCardTravel(playedStableCard, {
          from: zoneIdForSide(side, "hand"),
          to: zoneIdForSide(side, "field"),
          kind: side === localPlayerIndex ? "syllable" : "card-back",
          originOverride: selectedCardOrigin ?? undefined,
          destinationOverride: snapshotZoneSlot(zoneIdForSide(side, "field"), `slot-${move.targetIndex}`) ?? undefined,
          durationMs: FLOW.cardToFieldMs,
          arcHeight: side === localPlayerIndex ? 82 : 86,
          selectedVisual: side === localPlayerIndex,
          playableVisual: false,
        });
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
      const removedStableCards = removeStableCards(side, selectedIndexes);

      if (clearIncomingHand) {
        commitIncomingHands({
          ...incomingHandsRef.current,
          [side]: [],
        });
      }

      let drawnCards: Syllable[] = [];
      let returnedCount = 0;
      setGame((prev) => {
        const resolution = resolveBattleMulliganAction(prev, side, selectedIndexes, CONFIG.handSize);
        drawnCards = [...resolution.drawnCards];
        returnedCount = resolution.returnedCards.length;
        return {
          ...prev,
          players: resolution.nextPlayers as any,
          selectedHandIndexes: clearSelection ? [] : prev.selectedHandIndexes,
          selectedCardForPlay: clearSelection ? null : prev.selectedCardForPlay,
          actedThisTurn: true,
          currentMessage: null,
          log: addLog(
            prev.log,
            side === PLAYER
              ? `Mulligan: devolveu ${returnedCount} cartas e encerrou o turno.`
              : "Oponente usou Mulligan.",
          ),
        };
      });

      applyResolvedMulliganFlow({
        side,
        removedStableCards,
        drawnCards,
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
      onActionRequested({
        id: `battle-action-${side === PLAYER ? "player" : "enemy"}-${gameRef.current.setupVersion}-${battleActionIdRef.current++}`,
        setupVersion: gameRef.current.setupVersion,
        sequence,
        turn: gameRef.current.turn,
        side: side === PLAYER ? "player" : "enemy",
        action,
      });
      return true;
    },
    [mode, onActionRequested],
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
      setGame((prev) => (prev.currentMessage?.kind === "turn" ? { ...prev, currentMessage: null } : prev));
      if (pendingResultOverlayRecoveryRef.current || (gameRef.current.winner !== null && !gameRef.current.combatLocked)) {
        setShowResultOverlay(true);
        pendingResultOverlayRecoveryRef.current = false;
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
    targetMotions,
    travelMotions,
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

    const presentationKey = `${game.setupVersion}:${game.turn}`;
    if (presentedTurnKeyRef.current === presentationKey) return;
    presentedTurnKeyRef.current = presentationKey;
    setTurnPresentationLocked(true);

    const queueTimer = setTimeout(() => {
      setGame((prev) => {
        if (prev.winner !== null || prev.openingIntroStep !== "done") return prev;
        if (prev.setupVersion !== game.setupVersion || prev.turn !== game.turn) return prev;
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
  }, [game.setupVersion, game.turn, game.winner, getTurnMessageTitle, introPhase]);

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
    targetMotions,
    travelMotions,
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
  const turnMinutes = Math.floor(turnElapsedMs / 60000);
  const turnSeconds = Math.floor((turnElapsedMs % 60000) / 1000);
  const turnClock = `${String(turnMinutes).padStart(2, "0")}:${String(turnSeconds).padStart(2, "0")}`;

  const renderPlayerHand = (scale: "desktop" | "mobile") => (
    <HandFan
      side={localPlayerIndex}
      presentation="local"
      stableCards={stableHands[localPlayerIndex]}
      incomingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? incomingHands[localPlayerIndex] : []}
      scale={scale}
      anchorRef={bindZoneRef("playerHand", `layout-${scale}`)}
      onIncomingCardComplete={commitIncomingCardToHand}
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
    />
  );

  const renderEnemyHand = (scale: "desktop" | "mobile") => (
    <HandFan
      side={remotePlayerIndex}
      presentation="remote"
      stableCards={stableHands[remotePlayerIndex]}
      incomingCards={scale === (isDesktopViewport ? "desktop" : "mobile") ? incomingHands[remotePlayerIndex] : []}
      scale={scale}
      pulse={enemyHandPulse}
      anchorRef={bindZoneRef("enemyHand", `layout-${scale}`)}
      onIncomingCardComplete={commitIncomingCardToHand}
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
    const displayedTarget = incomingTarget?.entity ?? visualTarget;
    const slotNode = zoneNodesRef.current[zoneRefKey("enemyField", `slot-${idx}`)];

    return {
      key: displayedTarget?.id ?? `enemy-slot-${idx}`,
      slotRef: bindZoneRef("enemyField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
      slotRect: slotNode?.getBoundingClientRect() ?? null,
      selectedCard: null,
      canClick: false,
      onClick: () => {},
      onIncomingTargetComplete: commitIncomingTargetToField,
      playerHand: [],
    };
  });
  const playerFieldSlots = Array.from({ length: CONFIG.targetsInPlay }).map((_, idx) => {
    const visualTarget = stableTargets[localPlayerIndex][idx];
    const incomingTarget = incomingTargets[localPlayerIndex].find((target) => target.slotIndex === idx) ?? null;
    const displayedTarget = incomingTarget?.entity ?? visualTarget;
    const slotNode = zoneNodesRef.current[zoneRefKey("playerField", `slot-${idx}`)];

    return {
      key: displayedTarget?.id ?? `player-slot-${idx}`,
      slotRef: bindZoneRef("playerField", `slot-${idx}`),
      displayedTarget,
      incomingTarget,
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
      playerHand: me.hand,
    };
  });

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#1a472a] font-sans text-amber-100">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)" />
      <BoardTravelLayer motions={travelMotions} onMotionComplete={handleTravelMotionComplete} />
      <TargetMotionLayer motions={targetMotions} onMotionComplete={handleTargetMotionComplete} />

      <main className="relative z-10 flex h-full min-h-0 flex-col gap-1 px-3 py-2 sm:gap-2 sm:px-4 sm:py-3 lg:gap-0 lg:px-5 lg:pt-2 lg:pb-3">
        <header className="grid grid-cols-[1fr_auto] items-start gap-2 lg:grid-cols-[240px_1fr_240px]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onExit} className="h-9 rounded-lg border border-white/5 px-3 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
            </Button>
            {mode !== "multiplayer" ? (
              <Button variant="ghost" size="sm" onClick={resetGame} className="h-9 w-9 rounded-lg border border-white/5 p-0 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : (
              <div className="h-9 w-9" />
            )}
          </div>

          <div className="hidden lg:block" />

          <div className="hidden lg:block" />
        </header>

        <section className="grid min-h-0 flex-1 gap-2 lg:gap-1 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
          <aside className="hidden min-h-0 flex-col gap-3 pt-4 lg:flex">
            <div className="px-2 pt-4 pb-1">
              <div className="relative flex items-start justify-center gap-3">
                <div ref={bindZoneRef("enemyDiscard", "desktop")} className="pointer-events-none absolute -left-4 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
                <div>
                  <CardPile
                    label="ALVOS"
                    count={enemy.targetDeck.length}
                    color="bg-rose-950"
                    anchorRef={bindZoneRef("enemyTargetDeck", "desktop")}
                  />
                </div>
                <div>
                  <CardPile
                    label="DECK"
                    count={enemy.syllableDeck.length}
                    color="bg-amber-950"
                    anchorRef={bindZoneRef("enemyDeck", "desktop")}
                  />
                </div>
              </div>
            </div>

            <div className="paper-panel h-[320px] overflow-y-auto rounded-xl border-2 border-amber-900/30 bg-parchment/95 p-4 text-[11px] font-serif italic text-amber-950 shadow-2xl no-scrollbar">
              <div className="mb-3 border-b-2 border-amber-900/10 pb-2 text-center text-[10px] font-black uppercase tracking-[0.2em]">
                Cronicas
              </div>
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {game.log.map((item, idx) => (
                    <motion.div
                      key={`${idx}-${item}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-r-md border-l-2 border-amber-900/20 bg-black/5 py-1 pl-3 leading-relaxed"
                    >
                      {item}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 lg:mx-auto lg:w-full lg:max-w-[980px]">
            <div className="rounded-[2rem] border border-white/10 bg-black/35 px-4 py-2 shadow-xl lg:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="w-full">
                  {renderEnemyHand("mobile")}
                </div>
                <div className="flex gap-3">
                  <div>
                    <CardPile
                      label="ALVOS"
                      count={enemy.targetDeck.length}
                      color="bg-rose-950"
                      anchorRef={bindZoneRef("enemyTargetDeck", "mobile")}
                    />
                  </div>
                  <div>
                    <CardPile
                      label="DECK"
                      count={enemy.syllableDeck.length}
                      color="bg-amber-950"
                      anchorRef={bindZoneRef("enemyDeck", "mobile")}
                    />
                  </div>
                  <div ref={bindZoneRef("enemyDiscard", "mobile")} className="pointer-events-none h-0 w-0 opacity-0" />
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 lg:grid-rows-[84px_minmax(0,1fr)_156px]">
              <div className="flex justify-center -mt-3 -mb-2 sm:-mt-2 lg:hidden">
                <PlayerPortrait label={safeRemotePlayerName} avatar={remotePlayerAvatar} isLocal={false} life={enemy.life} active={game.turn === remotePlayerIndex} flashDamage={enemy.flashDamage} />
              </div>

              <div className="hidden h-[84px] items-start px-2 lg:grid lg:grid-cols-[1fr_300px] lg:gap-3">
                <div className="flex items-start justify-end pr-6 -mt-20">
                  {renderEnemyHand("desktop")}
                </div>
                <div className="flex items-start justify-start -mt-6 pl-9">
                  <PlayerPortrait label={safeRemotePlayerName} avatar={remotePlayerAvatar} isLocal={false} life={enemy.life} active={game.turn === remotePlayerIndex} flashDamage={enemy.flashDamage} />
                </div>
              </div>

              <div className="relative min-h-0 overflow-visible rounded-[2.5rem] border-8 border-amber-900/40 bg-black/40 shadow-[inset_0_0_120px_rgba(0,0,0,0.7)] lg:h-full">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.05)_0%,rgba(0,0,0,0.45)_100%)]" />
                </div>

                <div className="grid h-full min-h-0 grid-rows-[minmax(180px,1fr)_minmax(180px,1fr)] gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:pt-2 lg:pb-4">
                  <BattleFieldLane
                    presentation="enemy"
                    containerRef={bindZoneRef("enemyField", "main")}
                    sectionClassName="flex min-h-0 items-start justify-center overflow-visible pt-1 lg:pt-0"
                    slots={enemyFieldSlots}
                  />

                  <BattleFieldLane
                    presentation="player"
                    containerRef={bindZoneRef("playerField", "main")}
                    sectionClassName="flex min-h-0 items-start justify-center overflow-visible pt-2 lg:pt-3"
                    slots={playerFieldSlots}
                  />
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
                  <div className="flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {game.currentMessage ? (
                        <motion.div
                          key={game.currentMessage.title}
                          initial={{ opacity: 0, scale: 0.4, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 1.8, y: -20 }}
                          className={cn(
                            "paper-panel z-50 min-w-[200px] rounded-2xl border-4 px-5 py-3 shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:min-w-[260px] sm:px-8 sm:py-4",
                            game.currentMessage.kind === "damage" ? "bg-rose-50 border-rose-900" : "bg-amber-50 border-amber-900",
                          )}
                        >
                          <div
                            className={cn(
                              "text-center font-serif text-xl font-black uppercase tracking-tighter sm:text-3xl",
                              game.currentMessage.kind === "damage" ? "text-rose-900" : "text-amber-950",
                            )}
                          >
                            {game.currentMessage.title}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-4 opacity-10 sm:gap-6">
                          <div className="h-0.5 w-16 bg-amber-100 sm:w-36" />
                          <Swords className="h-7 w-7 text-amber-100 sm:h-8 sm:w-8" />
                          <div className="h-0.5 w-16 bg-amber-100 sm:w-36" />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="hidden h-[156px] items-end px-2 lg:grid lg:grid-cols-[260px_1fr] lg:gap-4">
                <div className="flex items-end justify-end pr-1 pb-7">
                  <PlayerPortrait label={safeLocalPlayerName} avatar={localPlayerAvatar} isLocal life={me.life} active={game.turn === localPlayerIndex} flashDamage={me.flashDamage} />
                </div>
                <div className="flex items-end justify-start overflow-visible">
                  {renderPlayerHand("desktop")}
                </div>
              </div>

              <div className="flex justify-center lg:hidden">
                <PlayerPortrait label={safeLocalPlayerName} avatar={localPlayerAvatar} isLocal life={me.life} active={game.turn === localPlayerIndex} flashDamage={me.flashDamage} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-2 shadow-xl lg:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3">
                  <div>
                    <CardPile
                      label="ALVOS"
                      count={me.targetDeck.length}
                      color="bg-rose-950"
                      anchorRef={bindZoneRef("playerTargetDeck", "mobile")}
                    />
                  </div>
                  <div>
                    <CardPile
                      label="DECK"
                      count={me.syllableDeck.length}
                      color="bg-amber-950"
                      anchorRef={bindZoneRef("playerDeck", "mobile")}
                    />
                  </div>
                  <div ref={bindZoneRef("playerDiscard", "mobile")} className="pointer-events-none h-0 w-0 opacity-0" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center shadow-xl">
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-100/30">Tempo</div>
                    <div className="mt-1 text-lg font-black text-amber-200">{turnClock}</div>
                  </div>

                  {canSwap && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-2xl border-4 border-amber-500 bg-amber-900/95 px-5 font-black text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-transform hover:scale-105"
                      disabled={game.selectedHandIndexes.length === 0 || game.selectedHandIndexes.length > CONFIG.maxMulligan}
                      onClick={handleMulligan}
                    >
                      <RefreshCw className="mr-2 h-5 w-5" />
                      TROCAR 3
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden min-h-0 flex-col justify-between gap-2 lg:flex">
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-xl">
              <div className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-amber-100/30">Controle</div>
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center text-[11px] font-black uppercase tracking-[0.4em] text-amber-100/50">
                    {introActive ? "Inicio do Duelo" : game.turn === localPlayerIndex ? "Seu Turno" : "Turno do Oponente"}
                </div>
              </div>
            </div>

            <div className="px-2 py-1">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full rounded-[1.25rem] border border-white/10 bg-black/30 px-4 py-4 text-center shadow-inner">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-100/30">Tempo</div>
                  <div className="mt-2 text-3xl font-black tracking-wider text-amber-200">{turnClock}</div>
                </div>

                {canSwap ? (
                  <Button
                    variant="outline"
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-amber-500 bg-amber-900/95 font-black text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-transform hover:scale-105"
                    disabled={game.selectedHandIndexes.length === 0 || game.selectedHandIndexes.length > CONFIG.maxMulligan}
                    onClick={handleMulligan}
                  >
                    <RefreshCw className="mb-1 h-8 w-8" />
                    <span className="text-center font-serif text-[10px] leading-tight">TROCAR 3</span>
                  </Button>
                ) : (
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/35">
                    {introPhase === "coin-choice"
                      ? "Escolha a moeda"
                      : introActive
                        ? "Resolucao de abertura"
                        : game.turn === localPlayerIndex
                          ? "Aguardando jogada"
                          : "Oponente pensando"}
                  </div>
                )}
              </div>
            </div>

            <div className="px-2 py-1">
              <div className="relative flex items-start justify-center gap-3">
                <div ref={bindZoneRef("playerDiscard", "desktop")} className="pointer-events-none absolute -left-4 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
                <div>
                  <CardPile
                    label="ALVOS"
                    count={me.targetDeck.length}
                    color="bg-rose-950"
                    anchorRef={bindZoneRef("playerTargetDeck", "desktop")}
                  />
                </div>
                <div>
                  <CardPile
                    label="DECK"
                    count={me.syllableDeck.length}
                    color="bg-amber-950"
                    anchorRef={bindZoneRef("playerDeck", "desktop")}
                  />
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-auto px-0 pt-7 lg:hidden">
          <div>
            {renderPlayerHand("mobile")}
          </div>
        </section>
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
    </div>
  );
};
