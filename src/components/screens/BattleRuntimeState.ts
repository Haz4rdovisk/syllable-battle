import { BattleHandLaneOutgoingCard } from "./BattleHandLane";
import { ChronicleEntry, CoinFace, GameState, Syllable } from "../../types/game";
import { VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";
import type { BattleRuntimeCardRef } from "./BattleRuntimeSetup";
import type { BattleTargetFieldState } from "./BattleTargetField";

export const PLAYER = 0 as const;
export const ENEMY = 1 as const;
export const HAND_LAYOUT_SLOT_COUNT = 5;

export type BattleRuntimeSide = typeof PLAYER | typeof ENEMY;
export type BattleIntroPhase = "coin-choice" | "coin-fall" | "coin-result" | "targets" | "done";

export interface VisualHandCard {
  id: string;
  syllable: Syllable;
  cardId?: string;
  runtimeCardId?: string;
  side: BattleRuntimeSide;
  hidden: boolean;
  skipEntryAnimation?: boolean;
}

export type StableHandsState = Record<BattleRuntimeSide, VisualHandCard[]>;
export type StableTargetsState = Record<BattleRuntimeSide, Array<VisualTargetEntity | null>>;
export type LockedTargetSlotsState = Record<BattleRuntimeSide, boolean[]>;
export type PendingTargetPlacementsState = Record<BattleRuntimeSide, Array<Syllable | null>>;

export interface IncomingHandCard {
  id: string;
  side: BattleRuntimeSide;
  card: VisualHandCard;
  origin: ZoneAnchorSnapshot;
  finalIndex: number;
  finalTotal: number;
  delayMs: number;
  durationMs: number;
}

export interface IncomingTargetCard {
  id: string;
  side: BattleRuntimeSide;
  slotIndex: number;
  entity: VisualTargetEntity;
  origin: ZoneAnchorSnapshot;
  delayMs: number;
  durationMs: number;
}

export interface OutgoingTargetCard {
  id: string;
  side: BattleRuntimeSide;
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

export interface MulliganDebugState {
  source: string;
  requestedIndexes: number[];
  requestedSyllables: string[];
  removedStableCards: string[];
  drawnCards: string[];
  externalActionId: string | null;
  clearIncomingHand: boolean;
}

export interface PendingMulliganDraw {
  syllable: Syllable;
  cardRef: BattleRuntimeCardRef;
  finalIndex: number;
  finalTotal: number;
  originOverride: ZoneAnchorSnapshot | null;
}

export interface AnimationFallbackEvent {
  id: string;
  label: string;
  reason: string;
  fallback: string;
  createdAt: number;
}

export interface BattleRuntimeState {
  game: GameState;
  introPhase: BattleIntroPhase;
  openingTurnSide: BattleRuntimeSide;
  coinResultStage: "face" | "starter";
  selectedCoinFace: CoinFace | null;
  revealedCoinFace: CoinFace | null;
  plannedCoinFace: CoinFace | null;
  turnRemainingMs: number;
  coinChoiceRemainingMs: number;
  turnPresentationLocked: boolean;
  showResultOverlay: boolean;
  hoveredCardIndex: number | null;
  stableHands: StableHandsState;
  stableTargets: StableTargetsState;
  targetField: BattleTargetFieldState;
  mulliganDebug: MulliganDebugState;
}

export interface BattleRuntimeDerivedState {
  localPlayerIndex: BattleRuntimeSide;
  remotePlayerIndex: BattleRuntimeSide;
  isDesktopViewport: boolean;
  usesMobileShell: boolean;
}

export interface BattleRuntimePresentation {
  battleDebugWatcherSummary: string;
  latestFallbackEvent: AnimationFallbackEvent | null;
  chronicles: ChronicleEntry[];
}

export type BattleOutgoingHandCardsState = Record<BattleRuntimeSide, BattleHandLaneOutgoingCard[]>;
