import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { LogOut, RotateCcw } from "lucide-react";
import { Syllable } from "../../types/game";
import { BattleSceneView } from "./BattleSceneView";
import type { BattleFieldLane } from "./BattleFieldLane";
import { BattleFieldIncomingTarget } from "./BattleFieldLane";
import {
  BattleHandLaneCard,
  BattleHandLaneIncomingCard,
  BattleHandLaneOutgoingCard,
} from "./BattleHandLane";
import { BattleSceneHost } from "./BattleSceneHost";
import {
  battleTargetFieldSlotElementKeys,
  getBattleTargetFieldSlotElementKey,
  BattleEditableElementKey,
  BattleLayoutConfig,
  BattleLayoutDeviceKey,
} from "./BattleLayoutConfig";
import { BattleEditableElement } from "./BattleEditableElement";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import {
  BoardZoneId,
  PlayerPortrait,
  VisualTargetEntity,
  ZoneAnchorSnapshot,
} from "../game/GameComponents";
import {
  BattleSceneFixtureData,
  BattleSceneFixtureHandCard,
  midTurnBattleFixture,
} from "./BattleSceneFixtures";
import { BattleSceneModel } from "./BattleSceneViewModel";
import { buildBattleTargetFieldStateFromSceneSlots } from "./BattleTargetField";
import { cn } from "../../lib/utils";
import {
  BattleActionVisualState,
  BattleLayoutPreviewAnimationAnchors,
  BattleLayoutPreviewAnimationAnchorKey,
  BattleLayoutPreviewAnimationSet,
  BattleChroniclesVisualState,
  BattleLayoutPreviewAnimationMode,
  BattleLayoutPreviewAnimationPreset,
  BattleStatusVisualState,
  BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE,
} from "./BattleLayoutEditorState";
import {
  BATTLE_STAGE_HEIGHT,
  BATTLE_STAGE_WIDTH,
  getBattleCompactShellSlots,
  getBattleDesktopShellSlots,
  getBattleElementSceneRect,
  getBattleStageMetrics,
  resolveBattleRuntimeLayoutDevice,
  shouldUseBattleMobileShell,
} from "./BattleSceneSpace";
import { AnimatePresence, motion } from "motion/react";
import { GameMessage } from "../../types/game";
import {
  BATTLE_SHARED_FLOW_TIMINGS,
  BATTLE_SHARED_OPENING_TARGET_TIMINGS,
} from "./battleSharedTimings";
import {
  buildBattleDebugPointSnapshot,
  buildBattleProbeRow,
  formatBattleDebugPoint,
  formatBattleDebugSnapshot,
  formatBattleProbeLine,
  getPreviewAnimationAnchorReferenceTarget,
  toBattleDebugScenePoint,
  toBattleDebugScreenPoint,
} from "./BattleDebugGeometry";
import { createSimplePlayVisualPlan } from "./battleVisualPlan";
import { buildBattleFieldLaneSlotsFromTargetField } from "./battleTargetMotionPlan";

const noopRef = () => {};
const PLAYER = 0;
const ENEMY = 1;
const zoneRefKey = (zoneId: BoardZoneId, slot: string) => `${zoneId}:${slot}`;
const FIXTURE_TARGET_ENTER_STAGGER_MS =
  BATTLE_SHARED_OPENING_TARGET_TIMINGS.targetEnterStaggerMs;
const FIXTURE_TARGET_ENTER_SETTLE_MS =
  BATTLE_SHARED_OPENING_TARGET_TIMINGS.targetSettleMs;
const FIXTURE_TARGET_LOOP_GAP_MS = 680;
const FIXTURE_TARGET_ENTER_DURATION_MS = 780;
const FIXTURE_REPLACEMENT_TARGET_ENTER_SETTLE_MS =
  BATTLE_SHARED_FLOW_TIMINGS.targetSettleMs;
const FIXTURE_PILL_DAMAGE_DURATION_MS = 1200;
const FIXTURE_PILL_DAMAGE_LOOP_GAP_MS = 680;
const FIXTURE_PILL_DAMAGE_AMOUNT = 2;
const FIXTURE_PILL_TURN_DURATION_MS = 1120;
const FIXTURE_PILL_TURN_LOOP_GAP_MS = 680;
const FIXTURE_BOARD_MESSAGE_TURN_DURATION_MS = 1120;
const FIXTURE_BOARD_MESSAGE_INFO_DURATION_MS = 1100;
const FIXTURE_BOARD_MESSAGE_LOOP_GAP_MS = 680;
const FIXTURE_POST_PLAY_DRAW_DURATION_MS = BATTLE_SHARED_FLOW_TIMINGS.drawTravelMs;
const FIXTURE_POST_PLAY_DRAW_SETTLE_MS = BATTLE_SHARED_FLOW_TIMINGS.drawSettleMs;
const FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS = 680;
const FIXTURE_TARGET_ATTACK_WINDUP_MS = 310;
const FIXTURE_TARGET_ATTACK_TRAVEL_MS = 1140;
const FIXTURE_TARGET_ATTACK_PAUSE_MS = 260;
const FIXTURE_TARGET_ATTACK_EXIT_MS = 960;
const FIXTURE_TARGET_ATTACK_LOOP_GAP_MS = 680;
const FIXTURE_MULLIGAN_RETURN_DURATION_MS =
  BATTLE_SHARED_FLOW_TIMINGS.mulliganReturnMs;
const FIXTURE_MULLIGAN_RETURN_STAGGER_MS =
  BATTLE_SHARED_FLOW_TIMINGS.mulliganReturnStaggerMs;
const FIXTURE_MULLIGAN_RETURN_SETTLE_MS =
  BATTLE_SHARED_FLOW_TIMINGS.mulliganSettleMs;
const FIXTURE_MULLIGAN_RETURN_LOOP_GAP_MS = 680;
const FIXTURE_MULLIGAN_DRAW_START_DELAY_MS =
  BATTLE_SHARED_FLOW_TIMINGS.mulliganDrawDelayMs;

const getAnimationAnchorReferenceBadgeLabel = (
  anchor: BattleLayoutPreviewAnimationAnchorKey | null,
) => {
  if (!anchor) return "REF";
  if (anchor.endsWith("-impact")) return "IMPACTO";
  if (anchor.endsWith("-destination")) return "DESTINO";
  return "ORIGEM";
};

const getVisibleAnimationAnchorLabel = (
  anchor: BattleLayoutPreviewAnimationAnchorKey,
) => {
  if (anchor.startsWith("opening-target-entry-")) {
    const index = anchor.match(/^opening-target-entry-(\d)-origin$/)?.[1] ?? "?";
    return `${index} - nova origem`;
  }
  if (anchor.startsWith("replacement-target-entry-")) {
    const index = anchor.match(/^replacement-target-entry-(\d)-origin$/)?.[1] ?? "?";
    return `${index} - nova origem`;
  }
  if (anchor === "post-play-hand-draw-origin") {
    return "nova origem";
  }
  if (anchor.startsWith("hand-play-target-")) {
    const index = anchor.match(/^hand-play-target-(\d)-destination$/)?.[1] ?? "?";
    return `${index} - novo destino`;
  }
  if (anchor.startsWith("mulligan-hand-draw-")) {
    const index = anchor.match(/^mulligan-hand-draw-(\d)-origin$/)?.[1] ?? "?";
    return `${index} - nova origem`;
  }
  if (anchor.startsWith("mulligan-hand-return-")) {
    const index = anchor.match(/^mulligan-hand-return-(\d)-destination$/)?.[1] ?? "?";
    return `${index} - novo destino`;
  }
  if (anchor.endsWith("-impact")) {
    const index = anchor.match(/^target-attack-(\d)-impact$/)?.[1] ?? "?";
    return `${index} - novo impacto`;
  }
  if (anchor.endsWith("-destination")) {
    const index = anchor.match(/^target-attack-(\d)-destination$/)?.[1] ?? "?";
    return `${index} - novo destino`;
  }
  return anchor;
};
const FIXTURE_MULLIGAN_DRAW_DURATION_MS = FIXTURE_POST_PLAY_DRAW_DURATION_MS;
const FIXTURE_MULLIGAN_DRAW_SETTLE_MS = FIXTURE_POST_PLAY_DRAW_SETTLE_MS;
const FIXTURE_MULLIGAN_DRAW_STAGGER_MS =
  FIXTURE_MULLIGAN_DRAW_DURATION_MS + FIXTURE_MULLIGAN_DRAW_SETTLE_MS;
const openingTargetEntryAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "opening-target-entry-0": "opening-target-entry-0-origin",
  "opening-target-entry-1": "opening-target-entry-1-origin",
  "opening-target-entry-2": "opening-target-entry-2-origin",
  "opening-target-entry-3": "opening-target-entry-3-origin",
};
const replacementTargetEntryAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "replacement-target-entry-0": "replacement-target-entry-0-origin",
  "replacement-target-entry-1": "replacement-target-entry-1-origin",
  "replacement-target-entry-2": "replacement-target-entry-2-origin",
  "replacement-target-entry-3": "replacement-target-entry-3-origin",
};
const targetAttackImpactAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "target-attack-0": "target-attack-0-impact",
  "target-attack-1": "target-attack-1-impact",
  "target-attack-2": "target-attack-2-impact",
  "target-attack-3": "target-attack-3-impact",
};
const targetAttackDestinationAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "target-attack-0": "target-attack-0-destination",
  "target-attack-1": "target-attack-1-destination",
  "target-attack-2": "target-attack-2-destination",
  "target-attack-3": "target-attack-3-destination",
};
const handPlayTargetDestinationAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "hand-play-target-0": "hand-play-target-0-destination",
  "hand-play-target-1": "hand-play-target-1-destination",
};
type FixtureIncomingTarget = BattleFieldIncomingTarget & {
  side: typeof PLAYER | typeof ENEMY;
  slotIndex: number;
  entryIndex: number;
};
type FixtureOutgoingTarget = NonNullable<
  React.ComponentProps<typeof BattleFieldLane>["slots"][number]["outgoingTarget"]
> & {
  slotIndex: number;
};

const getMulliganCountFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 1 | 2 | 3 | null => {
  if (
    preset === "mulligan-hand-return-1" ||
    preset === "mulligan-hand-draw-1"
  ) {
    return 1;
  }
  if (
    preset === "mulligan-hand-return-2" ||
    preset === "mulligan-hand-draw-2"
  ) {
    return 2;
  }
  if (
    preset === "mulligan-hand-return-3" ||
    preset === "mulligan-hand-draw-3"
  ) {
    return 3;
  }
  return null;
};

const getHandPlayTargetIndexFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 0 | 1 | null => {
  if (preset === "hand-play-target-0") return 0;
  if (preset === "hand-play-target-1") return 1;
  return null;
};

const getHandPlayDrawComboTargetIndexFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 0 | 1 | null => {
  if (preset === "hand-play-draw-combo-0") return 0;
  if (preset === "hand-play-draw-combo-1") return 1;
  return null;
};

const getReplacementTargetEntryIndexFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 0 | 1 | 2 | 3 | null => {
  if (preset === "replacement-target-entry-0") return 0;
  if (preset === "replacement-target-entry-1") return 1;
  if (preset === "replacement-target-entry-2") return 2;
  if (preset === "replacement-target-entry-3") return 3;
  return null;
};

const getAttackReplacementComboIndexFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 0 | 1 | 2 | 3 | null => {
  if (preset === "target-attack-replacement-combo-0") return 0;
  if (preset === "target-attack-replacement-combo-1") return 1;
  if (preset === "target-attack-replacement-combo-2") return 2;
  if (preset === "target-attack-replacement-combo-3") return 3;
  return null;
};

const getMulliganCompleteComboCountFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 1 | 2 | 3 | null => {
  if (preset === "mulligan-complete-combo-1") return 1;
  if (preset === "mulligan-complete-combo-2") return 2;
  if (preset === "mulligan-complete-combo-3") return 3;
  return null;
};

const mulliganDrawOriginAnchorToolByPreset = {
  "mulligan-hand-draw-1": "mulligan-hand-draw-1-origin",
  "mulligan-hand-draw-2": "mulligan-hand-draw-2-origin",
  "mulligan-hand-draw-3": "mulligan-hand-draw-3-origin",
} as const;

const mulliganReturnDestinationAnchorToolByPreset = {
  "mulligan-hand-return-1": "mulligan-hand-return-1-destination",
  "mulligan-hand-return-2": "mulligan-hand-return-2-destination",
  "mulligan-hand-return-3": "mulligan-hand-return-3-destination",
} as const;

const getMulliganPreviewReservedSlots = (
  animationSet: BattleLayoutPreviewAnimationSet,
  animationPreset: BattleLayoutPreviewAnimationPreset,
  incomingCount: number,
) => {
  const count =
    animationSet === "mulligan-complete-combo"
      ? getMulliganCompleteComboCountFromPreset(animationPreset)
      : getMulliganCountFromPreset(animationPreset);
  if (!count) return 0;
  if (animationSet === "mulligan-hand-return") {
    return count;
  }
  if (
    animationSet === "mulligan-hand-draw" ||
    animationSet === "mulligan-complete-combo"
  ) {
    return Math.max(0, count - incomingCount);
  }
  return 0;
};

export type BattleScenePreviewFocusArea =
  | "overview"
  | "shell"
  | "board"
  | "enemyField"
  | "enemyFieldSlot0"
  | "enemyFieldSlot1"
  | "playerField"
  | "playerFieldSlot0"
  | "playerFieldSlot1"
  | "boardMessage"
  | "chronicles"
  | "enemyTargetDeck"
  | "enemyDeck"
  | "playerTargetDeck"
  | "playerDeck"
  | "topHand"
  | "bottomHand"
  | "status"
  | "action"
  | "enemyPill"
  | "playerPill";

const getPreviewAreaClass = (
  focusArea: BattleScenePreviewFocusArea,
  areas: BattleScenePreviewFocusArea[],
) => {
  if (focusArea === "overview" || focusArea === "shell") {
    return "";
  }

  return areas.includes(focusArea)
    ? "ring-2 ring-amber-300/85 ring-offset-4 ring-offset-[#0d2418] shadow-[0_0_30px_rgba(251,191,36,0.2)]"
    : "";
};

export const BattleSceneFixtureView: React.FC<{
  fixture?: BattleSceneFixtureData;
  layout?: BattleLayoutConfig;
  layoutPreviewDevice?: BattleLayoutDeviceKey;
  focusArea?: BattleScenePreviewFocusArea;
  selectedElements?: BattleScenePreviewFocusArea[];
  viewportWidth?: number;
  viewportHeight?: number;
  editorMode?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  snapThreshold?: number;
  actionVisualState?: BattleActionVisualState;
  statusVisualState?: BattleStatusVisualState;
  chroniclesVisualState?: BattleChroniclesVisualState;
  animationSet?: BattleLayoutPreviewAnimationSet;
  animationMode?: BattleLayoutPreviewAnimationMode;
  animationPreset?: BattleLayoutPreviewAnimationPreset;
  animationRunId?: number;
  localMotionPreviewElement?: BattleEditableElementKey | null;
  localMotionPreviewRunId?: number;
  animationAnchorTool?: BattleLayoutPreviewAnimationAnchorKey | null;
  animationAnchors?: BattleLayoutPreviewAnimationAnchors;
  animationDebugEnabled?: boolean;
}> = ({
  fixture = midTurnBattleFixture,
  layout = battleActiveLayoutConfig,
  layoutPreviewDevice,
  focusArea = "overview",
  selectedElements = [],
  viewportWidth = 1600,
  viewportHeight = 900,
  editorMode = false,
  showGrid = false,
  gridSize = 8,
  snapThreshold = 12,
  actionVisualState = "normal",
  statusVisualState = "normal",
  chroniclesVisualState = "normal",
  animationSet = "opening-target-entry-first-round",
  animationMode = "idle",
  animationPreset = "none",
  animationRunId = 0,
  localMotionPreviewElement = null,
  localMotionPreviewRunId = 0,
  animationAnchorTool = null,
  animationDebugEnabled = false,
  animationAnchors = {
    openingTargetEntry0Origin: null,
    openingTargetEntry1Origin: null,
    openingTargetEntry2Origin: null,
    openingTargetEntry3Origin: null,
    replacementTargetEntry0Origin: null,
    replacementTargetEntry1Origin: null,
    replacementTargetEntry2Origin: null,
    replacementTargetEntry3Origin: null,
    postPlayHandDrawOrigin: null,
    handPlayTarget0Destination: null,
    handPlayTarget1Destination: null,
    mulliganReturn1Destination: null,
    mulliganReturn2Destination: null,
    mulliganReturn3Destination: null,
    mulliganDraw1Origin: null,
    mulliganDraw2Origin: null,
    mulliganDraw3Origin: null,
    targetAttack0Impact: null,
    targetAttack1Impact: null,
    targetAttack2Impact: null,
    targetAttack3Impact: null,
    targetAttack0Destination: null,
    targetAttack1Destination: null,
    targetAttack2Destination: null,
    targetAttack3Destination: null,
  },
}) => {
  const usesMobileShell = shouldUseBattleMobileShell(
    layoutPreviewDevice ?? resolveBattleRuntimeLayoutDevice(viewportWidth),
  );
  const isPureOverview = focusArea === "overview";
  const isHandPlayTargetEditorSet =
    animationSet === "hand-play-target" ||
    animationSet === "hand-play-draw-combo";
  const shellSlots = getBattleDesktopShellSlots(layout);
  const stageMetrics = getBattleStageMetrics(viewportWidth, viewportHeight);
  const isCompactPreview = usesMobileShell;
  const isCompactShellPreview = usesMobileShell;
  const isCompactTightPreview = isCompactShellPreview && viewportHeight <= 464;
  const compactTopShellClassName = isCompactTightPreview
    ? "h-full w-full"
    : "h-full w-full";
  const compactControlShellClassName = isCompactTightPreview
    ? "h-full w-full"
    : "h-full w-full";
  const compactFooterFrameClassName = isCompactTightPreview ? "origin-top scale-[0.86]" : undefined;
  const compactShellSlots = getBattleCompactShellSlots(layout, isCompactTightPreview);
  const majorGridMultiplier = stageMetrics.scale < 0.55 || isCompactPreview ? 8 : 4;
  const majorGridSize = gridSize * majorGridMultiplier;
  const minorGridColor = isCompactPreview
    ? "rgba(251,191,36,0.14)"
    : "rgba(251,191,36,0.12)";
  const majorGridColor = isCompactPreview
    ? "rgba(251,191,36,0.4)"
    : "rgba(251,191,36,0.28)";
  const isSelected = (area: BattleScenePreviewFocusArea) =>
    selectedElements.includes(area);
  const getMotionReplayNonce = useCallback(
    (
      elementOrElements:
        | BattleEditableElementKey
        | BattleEditableElementKey[],
    ) => {
      if (localMotionPreviewElement === null || localMotionPreviewRunId <= 0) return 0;
      const elements = Array.isArray(elementOrElements)
        ? elementOrElements
        : [elementOrElements];
      return elements.includes(localMotionPreviewElement)
        ? localMotionPreviewRunId
        : 0;
    },
    [localMotionPreviewElement, localMotionPreviewRunId],
  );
  const getFieldSlotSceneRect = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number) =>
      getBattleElementSceneRect(
        getBattleTargetFieldSlotElementKey(
          side === PLAYER ? "player" : "enemy",
          slotIndex,
        ),
        layout,
      ),
    [layout],
  );
  const zoneNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const slotNodesRef = useRef<Record<typeof PLAYER | typeof ENEMY, Array<HTMLDivElement | null>>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const bindZoneRef = useCallback(
    (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => {
      zoneNodesRef.current[zoneRefKey(zoneId, slot)] = node;
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
  const createPreviewHandCard = useCallback(
    (
      handCard: BattleSceneFixtureHandCard,
      side: typeof PLAYER | typeof ENEMY,
      key: string,
    ): BattleHandLaneCard => ({
      id: `fixture-hand-${side}-${key}`,
      syllable: handCard.syllable,
      side,
      hidden: side === ENEMY,
      skipEntryAnimation: false,
    }),
    [],
  );
  const defaultPlayerStableCards = useMemo(
    () =>
      fixture.playerHand.map((handCard, index) =>
        createPreviewHandCard(handCard, PLAYER, `stable-${index}`),
      ),
    [createPreviewHandCard, fixture.playerHand],
  );
  const anchorDragRef = useRef<{
    anchor: BattleLayoutPreviewAnimationAnchorKey;
    stageRoot: HTMLElement;
  } | null>(null);
  const animationTimersRef = useRef<number[]>([]);
  const loopGenerationRef = useRef(0);
  const [incomingPreviewTargets, setIncomingPreviewTargets] = useState<
    Record<typeof PLAYER | typeof ENEMY, FixtureIncomingTarget[]>
  >({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [hiddenStableTargets, setHiddenStableTargets] = useState<
    Record<typeof PLAYER | typeof ENEMY, boolean[]>
  >({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [outgoingPreviewTargets, setOutgoingPreviewTargets] = useState<
    Record<typeof PLAYER | typeof ENEMY, FixtureOutgoingTarget[]>
  >({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [previewPlayerStableCards, setPreviewPlayerStableCards] = useState<
    BattleHandLaneCard[]
  >(defaultPlayerStableCards);
  const [previewSelectedIndexes, setPreviewSelectedIndexes] = useState<number[]>(
    fixture.selectedIndexes ?? [],
  );
  const [previewPendingTargetPlacements, setPreviewPendingTargetPlacements] =
    useState<Record<typeof PLAYER | typeof ENEMY, Array<Syllable | null>>>({
      [PLAYER]: [],
      [ENEMY]: [],
    });
  const [previewFreshCardIds, setPreviewFreshCardIds] = useState<string[]>([]);
  const [incomingPreviewHands, setIncomingPreviewHands] = useState<
    Record<typeof PLAYER | typeof ENEMY, BattleHandLaneIncomingCard[]>
  >({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [outgoingPreviewHands, setOutgoingPreviewHands] = useState<
    Record<typeof PLAYER | typeof ENEMY, BattleHandLaneOutgoingCard[]>
  >({
    [PLAYER]: [],
    [ENEMY]: [],
  });
  const [previewPostPlayDebug, setPreviewPostPlayDebug] = useState<{
    removedIndex: number | null;
    drawSourceIndex: number | null;
    removedCardLabel: string | null;
    drawnCardLabel: string | null;
    committedCardLabel: string | null;
    phase: "idle" | "setup" | "incoming" | "committed";
  }>({
    removedIndex: null,
    drawSourceIndex: null,
    removedCardLabel: null,
    drawnCardLabel: null,
    committedCardLabel: null,
    phase: "idle",
  });
  const [previewPillFlashDamage, setPreviewPillFlashDamage] = useState<
    Record<typeof PLAYER | typeof ENEMY, number>
  >({
    [PLAYER]: fixture.scene.board.playerPortrait?.flashDamage ?? 0,
    [ENEMY]: fixture.scene.board.enemyPortrait?.flashDamage ?? 0,
  });
  const [previewPillActive, setPreviewPillActive] = useState<
    Record<typeof PLAYER | typeof ENEMY, boolean>
  >({
    [PLAYER]: fixture.scene.board.playerPortrait?.active ?? false,
    [ENEMY]: fixture.scene.board.enemyPortrait?.active ?? false,
  });
  const [previewBoardMessage, setPreviewBoardMessage] = useState<GameMessage | null>(
    fixture.scene.board.currentMessage ?? null,
  );

  const clearAnimationTimers = useCallback(() => {
    animationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimersRef.current = [];
  }, []);

  const rehydrateFixturePreviewBaseline = useCallback(() => {
    setIncomingPreviewTargets({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setHiddenStableTargets({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setOutgoingPreviewTargets({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setPreviewPlayerStableCards(defaultPlayerStableCards);
    setPreviewPendingTargetPlacements({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setPreviewFreshCardIds([]);
    setIncomingPreviewHands({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setOutgoingPreviewHands({
      [PLAYER]: [],
      [ENEMY]: [],
    });
    setPreviewSelectedIndexes(fixture.selectedIndexes ?? []);
    setPreviewPostPlayDebug({
      removedIndex: null,
      drawSourceIndex: null,
      removedCardLabel: null,
      drawnCardLabel: null,
      committedCardLabel: null,
      phase: "idle",
    });
    setPreviewPillFlashDamage({
      [PLAYER]: fixture.scene.board.playerPortrait?.flashDamage ?? 0,
      [ENEMY]: fixture.scene.board.enemyPortrait?.flashDamage ?? 0,
    });
    setPreviewPillActive({
      [PLAYER]: fixture.scene.board.playerPortrait?.active ?? false,
      [ENEMY]: fixture.scene.board.enemyPortrait?.active ?? false,
    });
    setPreviewBoardMessage(fixture.scene.board.currentMessage ?? null);
  }, [
    defaultPlayerStableCards,
    fixture.selectedIndexes,
    fixture.scene.board.currentMessage,
    fixture.scene.board.enemyPortrait?.active,
    fixture.scene.board.enemyPortrait?.flashDamage,
    fixture.scene.board.playerPortrait?.active,
    fixture.scene.board.playerPortrait?.flashDamage,
  ]);

  const resetPreviewAnimation = useCallback(() => {
    clearAnimationTimers();
    loopGenerationRef.current += 1;
    rehydrateFixturePreviewBaseline();
  }, [clearAnimationTimers, rehydrateFixturePreviewBaseline]);

  useEffect(() => {
    resetPreviewAnimation();
  }, [resetPreviewAnimation]);

  const readElementSnapshot = useCallback((elementKey: BattleEditableElementKey) => {
    if (typeof document === "undefined") return null;
    const zoneSnapshot = (() => {
      switch (elementKey) {
        case "topHand":
          return snapshotZone("enemyHand");
        case "bottomHand":
          return snapshotZone("playerHand");
        case "enemyTargetDeck":
          return snapshotZone("enemyTargetDeck");
        case "enemyDeck":
          return snapshotZone("enemyDeck");
        case "playerTargetDeck":
          return snapshotZone("playerTargetDeck");
        case "playerDeck":
          return snapshotZone("playerDeck");
        default:
          return null;
      }
    })();
    if (zoneSnapshot) return zoneSnapshot;
    const node = document.querySelector<HTMLElement>(`[data-battle-element-key="${elementKey}"]`);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, [snapshotZone]);

  const updateHiddenStableTarget = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number, hidden: boolean) => {
      setHiddenStableTargets((current) => {
        const sideValues = [...(current[side] ?? [])];
        sideValues[slotIndex] = hidden;
        return {
          ...current,
          [side]: sideValues,
        };
      });
    },
    [],
  );

  const handleIncomingPreviewTargetComplete = useCallback((incomingTarget: FixtureIncomingTarget) => {
    setIncomingPreviewTargets((current) => ({
      ...current,
      [incomingTarget.side]: current[incomingTarget.side].filter((item) => item.id !== incomingTarget.id),
    }));
    updateHiddenStableTarget(incomingTarget.side, incomingTarget.slotIndex, false);
  }, [updateHiddenStableTarget]);
  const handleIncomingPreviewHandComplete = useCallback(
    (incomingCard: BattleHandLaneIncomingCard) => {
      setIncomingPreviewHands((current) => ({
        ...current,
        [incomingCard.side]: current[incomingCard.side].filter(
          (item) => item.id !== incomingCard.id,
        ),
      }));
      if (incomingCard.side === PLAYER) {
        setPreviewPlayerStableCards((current) => [
          ...current,
          {
            ...incomingCard.card,
            skipEntryAnimation: true,
          },
        ]);
        setPreviewFreshCardIds([incomingCard.card.id]);
        setPreviewPostPlayDebug((current) => ({
          ...current,
          committedCardLabel: `${incomingCard.card.syllable}#${incomingCard.card.id}`,
          phase: "committed",
        }));
      }
    },
    [],
  );
  const handleOutgoingPreviewTargetComplete = useCallback(
    (outgoingTarget: FixtureOutgoingTarget) => {
      setOutgoingPreviewTargets((current) => ({
        ...current,
        [outgoingTarget.side]: current[outgoingTarget.side].filter(
          (item) => item.id !== outgoingTarget.id,
        ),
      }));
    },
    [],
  );

  const getAnimationAnchorPoint = useCallback(
    (anchor: BattleLayoutPreviewAnimationAnchorKey | null) => {
      switch (anchor) {
        case "opening-target-entry-0-origin":
          return animationAnchors.openingTargetEntry0Origin;
        case "opening-target-entry-1-origin":
          return animationAnchors.openingTargetEntry1Origin;
        case "opening-target-entry-2-origin":
          return animationAnchors.openingTargetEntry2Origin;
        case "opening-target-entry-3-origin":
          return animationAnchors.openingTargetEntry3Origin;
        case "replacement-target-entry-0-origin":
          return animationAnchors.replacementTargetEntry0Origin;
        case "replacement-target-entry-1-origin":
          return animationAnchors.replacementTargetEntry1Origin;
        case "replacement-target-entry-2-origin":
          return animationAnchors.replacementTargetEntry2Origin;
        case "replacement-target-entry-3-origin":
          return animationAnchors.replacementTargetEntry3Origin;
        case "post-play-hand-draw-origin":
          return animationAnchors.postPlayHandDrawOrigin;
        case "hand-play-target-0-destination":
          return animationAnchors.handPlayTarget0Destination;
        case "hand-play-target-1-destination":
          return animationAnchors.handPlayTarget1Destination;
        case "mulligan-hand-return-1-destination":
          return animationAnchors.mulliganReturn1Destination;
        case "mulligan-hand-return-2-destination":
          return animationAnchors.mulliganReturn2Destination;
        case "mulligan-hand-return-3-destination":
          return animationAnchors.mulliganReturn3Destination;
        case "mulligan-hand-draw-1-origin":
          return animationAnchors.mulliganDraw1Origin;
        case "mulligan-hand-draw-2-origin":
          return animationAnchors.mulliganDraw2Origin;
        case "mulligan-hand-draw-3-origin":
          return animationAnchors.mulliganDraw3Origin;
        case "target-attack-0-impact":
          return animationAnchors.targetAttack0Impact;
        case "target-attack-1-impact":
          return animationAnchors.targetAttack1Impact;
        case "target-attack-2-impact":
          return animationAnchors.targetAttack2Impact;
        case "target-attack-3-impact":
          return animationAnchors.targetAttack3Impact;
        case "target-attack-0-destination":
          return animationAnchors.targetAttack0Destination;
        case "target-attack-1-destination":
          return animationAnchors.targetAttack1Destination;
        case "target-attack-2-destination":
          return animationAnchors.targetAttack2Destination;
        case "target-attack-3-destination":
          return animationAnchors.targetAttack3Destination;
        default:
          return null;
      }
    },
    [animationAnchors],
  );
  const visibleAnimationAnchors = useMemo(() => {
    if (animationSet === "replacement-target-entry") {
      const anchor =
        replacementTargetEntryAnchorToolByPreset[animationPreset] ?? null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor
        ? [{ label: getVisibleAnimationAnchorLabel(anchor), anchor, point }]
        : [];
    }

    if (animationSet === "post-play-hand-draw") {
      const point = getAnimationAnchorPoint("post-play-hand-draw-origin");
      return point
        ? [
            {
              label: getVisibleAnimationAnchorLabel(
                "post-play-hand-draw-origin" as BattleLayoutPreviewAnimationAnchorKey,
              ),
              anchor: "post-play-hand-draw-origin" as BattleLayoutPreviewAnimationAnchorKey,
              point,
            },
          ]
        : [];
    }

    if (animationSet === "hand-play-target" || animationSet === "hand-play-draw-combo") {
      const targetIndex =
        animationSet === "hand-play-target"
          ? getHandPlayTargetIndexFromPreset(animationPreset)
          : getHandPlayDrawComboTargetIndexFromPreset(animationPreset);
      const anchor =
        targetIndex != null
          ? handPlayTargetDestinationAnchorToolByPreset[
              `hand-play-target-${targetIndex}` as const
            ] ?? null
          : null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor
        ? [{ label: getVisibleAnimationAnchorLabel(anchor), anchor, point }]
        : [];
    }

    if (animationSet === "mulligan-hand-draw") {
      const anchor = mulliganDrawOriginAnchorToolByPreset[animationPreset] ?? null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor
        ? [{ label: getVisibleAnimationAnchorLabel(anchor), anchor, point }]
        : [];
    }

    if (animationSet === "mulligan-hand-return") {
      const anchor =
        mulliganReturnDestinationAnchorToolByPreset[animationPreset] ?? null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor
        ? [{ label: getVisibleAnimationAnchorLabel(anchor), anchor, point }]
        : [];
    }

    if (animationSet === "mulligan-complete-combo") {
      const count = getMulliganCompleteComboCountFromPreset(animationPreset);
      if (!count) return [];
      const drawAnchor =
        mulliganDrawOriginAnchorToolByPreset[
          `mulligan-hand-draw-${count}` as const
        ] ?? null;
      const returnAnchor =
        mulliganReturnDestinationAnchorToolByPreset[
          `mulligan-hand-return-${count}` as const
        ] ?? null;
      const drawPoint = getAnimationAnchorPoint(drawAnchor);
      const returnPoint = getAnimationAnchorPoint(returnAnchor);
      return [
        ...(drawPoint && drawAnchor
          ? [{
              label: getVisibleAnimationAnchorLabel(drawAnchor),
              anchor: drawAnchor,
              point: drawPoint,
            }]
          : []),
        ...(returnPoint && returnAnchor
          ? [{
              label: getVisibleAnimationAnchorLabel(returnAnchor),
              anchor: returnAnchor,
              point: returnPoint,
            }]
          : []),
      ];
    }

    if (animationSet === "target-attack-replacement-combo") {
      const attackIndex = getAttackReplacementComboIndexFromPreset(animationPreset);
      if (attackIndex == null) return [];
      const replacementAnchor =
        replacementTargetEntryAnchorToolByPreset[
          `replacement-target-entry-${attackIndex}` as const
        ] ?? null;
      const impactAnchor =
        targetAttackImpactAnchorToolByPreset[
          `target-attack-${attackIndex}` as const
        ] ?? null;
      const destinationAnchor =
        targetAttackDestinationAnchorToolByPreset[
          `target-attack-${attackIndex}` as const
        ] ?? null;
      const replacementPoint = getAnimationAnchorPoint(replacementAnchor);
      const impactPoint = getAnimationAnchorPoint(impactAnchor);
      const destinationPoint = getAnimationAnchorPoint(destinationAnchor);
      return [
        ...(replacementPoint && replacementAnchor
          ? [{
              label: getVisibleAnimationAnchorLabel(replacementAnchor),
              anchor: replacementAnchor,
              point: replacementPoint,
            }]
          : []),
        ...(impactPoint && impactAnchor
          ? [{
              label: getVisibleAnimationAnchorLabel(impactAnchor),
              anchor: impactAnchor,
              point: impactPoint,
            }]
          : []),
        ...(destinationPoint && destinationAnchor
          ? [{
              label: getVisibleAnimationAnchorLabel(destinationAnchor),
              anchor: destinationAnchor,
              point: destinationPoint,
            }]
          : []),
      ];
    }

    if (animationSet === "target-attack") {
      const impactAnchor =
        targetAttackImpactAnchorToolByPreset[animationPreset] ?? null;
      const destinationAnchor =
        targetAttackDestinationAnchorToolByPreset[animationPreset] ?? null;
      const entries = [
        impactAnchor
          ? {
              label: getVisibleAnimationAnchorLabel(impactAnchor),
              anchor: impactAnchor,
              point: getAnimationAnchorPoint(impactAnchor),
            }
          : null,
        destinationAnchor
          ? {
              label: getVisibleAnimationAnchorLabel(destinationAnchor),
              anchor: destinationAnchor,
              point: getAnimationAnchorPoint(destinationAnchor),
            }
          : null,
      ].filter(
        (entry): entry is {
          label: string;
          anchor: BattleLayoutPreviewAnimationAnchorKey;
          point: NonNullable<ReturnType<typeof getAnimationAnchorPoint>>;
        } => Boolean(entry?.point),
      );
      return entries;
    }

    if (animationPreset === "opening-target-entry-simultaneous") {
      return (
        [
          {
            label: getVisibleAnimationAnchorLabel(
              "opening-target-entry-0-origin" as BattleLayoutPreviewAnimationAnchorKey,
            ),
            anchor: "opening-target-entry-0-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: getVisibleAnimationAnchorLabel(
              "opening-target-entry-1-origin" as BattleLayoutPreviewAnimationAnchorKey,
            ),
            anchor: "opening-target-entry-1-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: getVisibleAnimationAnchorLabel(
              "opening-target-entry-2-origin" as BattleLayoutPreviewAnimationAnchorKey,
            ),
            anchor: "opening-target-entry-2-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: getVisibleAnimationAnchorLabel(
              "opening-target-entry-3-origin" as BattleLayoutPreviewAnimationAnchorKey,
            ),
            anchor: "opening-target-entry-3-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
        ]
          .map((entry) => ({
            ...entry,
            point: getAnimationAnchorPoint(entry.anchor),
          }))
          .filter((entry): entry is typeof entry & { point: NonNullable<typeof entry.point> } =>
            Boolean(entry.point),
          )
      );
    }

    const selectedAnchor =
      openingTargetEntryAnchorToolByPreset[animationPreset] ?? null;
    const selectedPoint = getAnimationAnchorPoint(selectedAnchor);
    if (!selectedAnchor || !selectedPoint) return [];
    return [
      {
        label: getVisibleAnimationAnchorLabel(selectedAnchor),
        anchor: selectedAnchor,
        point: selectedPoint,
      },
    ];
  }, [animationPreset, animationSet, getAnimationAnchorPoint]);

  const previewReservedSlots = useMemo(() => {
    return getMulliganPreviewReservedSlots(
      animationSet,
      animationPreset,
      incomingPreviewHands[PLAYER].length,
    );
  }, [animationPreset, animationSet, incomingPreviewHands]);

  const getScenePointFromScreenPoint = useCallback(
    (point: { x: number; y: number } | null | undefined) =>
      toBattleDebugScenePoint(point, {
        rect: {
          left: stageMetrics.offsetX,
          top: stageMetrics.offsetY,
        },
        scaleX: stageMetrics.scale,
        scaleY: stageMetrics.scale,
      }),
    [stageMetrics.offsetX, stageMetrics.offsetY, stageMetrics.scale],
  );

  const getScreenPointFromScenePoint = useCallback(
    (point: { x: number; y: number } | null | undefined) =>
      toBattleDebugScreenPoint(point, {
        rect: {
          left: stageMetrics.offsetX,
          top: stageMetrics.offsetY,
        },
        scaleX: stageMetrics.scale,
        scaleY: stageMetrics.scale,
      }),
    [stageMetrics.offsetX, stageMetrics.offsetY, stageMetrics.scale],
  );

  const getReferenceScenePointForAnchor = useCallback(
    (anchor: BattleLayoutPreviewAnimationAnchorKey | null | undefined) => {
      if (!anchor) return null;

      const getRectCenter = (key: BattleEditableElementKey) => {
        const snapshot = readElementSnapshot(key);
        if (!snapshot) {
          const rect = getBattleElementSceneRect(key, layout);
          return {
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
          };
        }
        return getScenePointFromScreenPoint({
          x: snapshot.left + snapshot.width / 2,
          y: snapshot.top + snapshot.height / 2,
        });
      };

      const getFieldSlotCenter = (side: typeof PLAYER | typeof ENEMY, slotIndex: number) => {
        const slotRect = slotNodesRef.current[side][slotIndex]?.getBoundingClientRect() ?? null;
        if (slotRect && slotRect.width > 0 && slotRect.height > 0) {
          return getScenePointFromScreenPoint({
            x: slotRect.left + slotRect.width / 2,
            y: slotRect.top + slotRect.height / 2,
          });
        }
        const fieldRect = getFieldSlotSceneRect(side, slotIndex);
        return {
          x: Math.round(fieldRect.x + fieldRect.width / 2),
          y: Math.round(fieldRect.y + fieldRect.height / 2),
        };
      };

      if (anchor.startsWith("opening-target-entry-")) {
        const match = anchor.match(/^opening-target-entry-(\d)-origin$/);
        const entryIndex = match ? Number(match[1]) : null;
        if (entryIndex == null) return null;
        const allStagedTargets = [
          ...fixture.scene.board.playerFieldSlots.map((slot, slotIndex) => ({
            side: PLAYER as typeof PLAYER | typeof ENEMY,
            slotIndex,
            hasTarget: Boolean(slot.displayedTarget),
          })),
          ...fixture.scene.board.enemyFieldSlots.map((slot, slotIndex) => ({
            side: ENEMY as typeof PLAYER | typeof ENEMY,
            slotIndex,
            hasTarget: Boolean(slot.displayedTarget),
          })),
        ].filter((entry) => entry.hasTarget);
        const selectedEntry = allStagedTargets[entryIndex];
        return selectedEntry
          ? getRectCenter(selectedEntry.side === ENEMY ? "enemyTargetDeck" : "playerTargetDeck")
          : null;
      }

      const referenceTarget = getPreviewAnimationAnchorReferenceTarget(
        anchor,
        fixture.scene.board.playerFieldSlots.length,
      );
      if (referenceTarget?.kind === "zone") {
        if (
          referenceTarget.zoneId === "playerDeck" ||
          referenceTarget.zoneId === "enemyDeck" ||
          referenceTarget.zoneId === "playerTargetDeck" ||
          referenceTarget.zoneId === "enemyTargetDeck"
        ) {
          return getRectCenter(referenceTarget.zoneId);
        }
        return null;
      }
      if (referenceTarget?.kind === "slot") {
        const slotIndex = Number(referenceTarget.slot.replace("slot-", ""));
        if (Number.isNaN(slotIndex)) return null;
        return getFieldSlotCenter(
          referenceTarget.zoneId === "enemyField" ? ENEMY : PLAYER,
          slotIndex,
        );
      }

      return null;
    },
    [
      fixture.scene.board.enemyFieldSlots,
      fixture.scene.board.playerFieldSlots,
      getFieldSlotSceneRect,
      getScenePointFromScreenPoint,
      readElementSnapshot,
    ],
  );

  const anchorProbeRows = useMemo(
    () =>
      visibleAnimationAnchors.map(({ label, anchor, point }) => {
        const reference = getReferenceScenePointForAnchor(anchor);
        const screen = getScreenPointFromScenePoint(point);
        const referenceScreen = getScreenPointFromScenePoint(reference);
        return {
          label,
          ...buildBattleProbeRow({
            anchor,
            point,
            screen,
            reference,
            referenceScreen,
          }),
        };
      }),
    [getReferenceScenePointForAnchor, getScreenPointFromScenePoint, visibleAnimationAnchors],
  );
  const activeAnimationAnchorReferencePoint = useMemo(
    () => getReferenceScenePointForAnchor(animationAnchorTool),
    [animationAnchorTool, getReferenceScenePointForAnchor],
  );
  const activeAnimationAnchorPoint = useMemo(
    () => getAnimationAnchorPoint(animationAnchorTool),
    [animationAnchorTool, getAnimationAnchorPoint],
  );
  const activeAnimationAnchorReferenceLabel = useMemo(
    () => getAnimationAnchorReferenceBadgeLabel(animationAnchorTool),
    [animationAnchorTool],
  );

  const buildAnimationAnchorSnapshotFromPoint = useCallback(
    (point: { x: number; y: number } | null | undefined) =>
      buildBattleDebugPointSnapshot(point, {
        rect: {
          left: stageMetrics.offsetX,
          top: stageMetrics.offsetY,
        },
        scaleX: stageMetrics.scale,
        scaleY: stageMetrics.scale,
      }),
    [stageMetrics.offsetX, stageMetrics.offsetY, stageMetrics.scale],
  );

  const buildAnimationAnchorSnapshot = useCallback(
    (anchorKey: BattleLayoutPreviewAnimationAnchorKey | null | undefined) =>
      buildAnimationAnchorSnapshotFromPoint(
        anchorKey ? getAnimationAnchorPoint(anchorKey) : null,
      ),
    [buildAnimationAnchorSnapshotFromPoint, getAnimationAnchorPoint],
  );

  const debugLines = useMemo(() => {
    const formatHandCard = (card: BattleHandLaneCard) =>
      `${card.syllable}#${card.id}${card.skipEntryAnimation ? "*" : ""}`;
    const formatIncomingHand = (card: BattleHandLaneIncomingCard) =>
      `${card.card.syllable}#${card.card.id}@${card.finalIndex}/${card.finalTotal} from ${formatBattleDebugSnapshot(card.origin)}`;
    const formatOutgoingHand = (card: BattleHandLaneOutgoingCard) =>
      `${card.card.syllable}#${card.card.id}@${card.initialIndex}/${card.initialTotal} -> ${formatBattleDebugSnapshot(card.destination)}`;
    const formatTarget = (entity: VisualTargetEntity | null | undefined) =>
      entity
        ? `${entity.target.name}#${entity.id}@${entity.side[0]}${entity.slotIndex}`
        : "-";
    const formatIncomingTarget = (target: FixtureIncomingTarget) =>
      `${formatTarget(target.entity)} from ${formatBattleDebugSnapshot(target.origin)} d:${target.delayMs ?? 0} t:${target.durationMs ?? 0}`;
    const formatOutgoingTarget = (target: FixtureOutgoingTarget) =>
      `${formatTarget(target.entity)} impact:${formatBattleDebugSnapshot(target.impactDestination ?? null)} -> ${formatBattleDebugSnapshot(target.destination)} w:${target.windupMs ?? 0} a:${target.attackMs ?? 0} p:${target.pauseMs ?? 0} e:${target.exitMs ?? 0}`;
    const formatHiddenFlags = (flags: boolean[] | undefined) =>
      flags && flags.length > 0
        ? flags.map((flag, index) => `${index}:${flag ? "1" : "0"}`).join(" ")
        : "-";
    const mulliganCount =
      animationSet === "mulligan-complete-combo"
        ? getMulliganCompleteComboCountFromPreset(animationPreset)
        : getMulliganCountFromPreset(animationPreset);
    const mulliganReservedSlots = getMulliganPreviewReservedSlots(
      animationSet,
      animationPreset,
      incomingPreviewHands[PLAYER].length,
    );

    const lines = [
      `set:${animationSet} preset:${animationPreset} mode:${animationMode}`,
      `stage:${viewportWidth}x${viewportHeight} scale:${stageMetrics.scale.toFixed(3)} off:${Math.round(stageMetrics.offsetX)},${Math.round(stageMetrics.offsetY)}`,
      `run:${animationRunId} loopGen:${loopGenerationRef.current} timers:${animationTimersRef.current.length}`,
      `anchorTool:${animationAnchorTool ?? "-"} selected:[${previewSelectedIndexes.join(",")}]`,
      `anchors:[${visibleAnimationAnchors.map(({ label, anchor, point }) => `${label}:${anchor}@${formatBattleDebugPoint(point)}`).join(" | ")}]`,
      `playerStable:[${previewPlayerStableCards.map(formatHandCard).join(",")}]`,
      `playerIncoming:[${incomingPreviewHands[PLAYER].map(formatIncomingHand).join(" | ")}]`,
      `playerOutgoing:[${outgoingPreviewHands[PLAYER].map(formatOutgoingHand).join(" | ")}]`,
      `enemyIncoming:[${incomingPreviewHands[ENEMY].map(formatIncomingHand).join(" | ")}]`,
      `fresh:[${previewFreshCardIds.join(",")}]`,
      `playerSlots:[${fixture.scene.board.playerFieldSlots.map((slot, index) => `${index}:${formatTarget(slot.displayedTarget)}`).join(" | ")}]`,
      `enemySlots:[${fixture.scene.board.enemyFieldSlots.map((slot, index) => `${index}:${formatTarget(slot.displayedTarget)}`).join(" | ")}]`,
      `hiddenPlayer:${formatHiddenFlags(hiddenStableTargets[PLAYER])}`,
      `hiddenEnemy:${formatHiddenFlags(hiddenStableTargets[ENEMY])}`,
      `incomingTargetsP:[${incomingPreviewTargets[PLAYER].map(formatIncomingTarget).join(" || ")}]`,
      `incomingTargetsE:[${incomingPreviewTargets[ENEMY].map(formatIncomingTarget).join(" || ")}]`,
      `outgoingTargetsP:[${outgoingPreviewTargets[PLAYER].map(formatOutgoingTarget).join(" || ")}]`,
      `outgoingTargetsE:[${outgoingPreviewTargets[ENEMY].map(formatOutgoingTarget).join(" || ")}]`,
    ];

    if (anchorProbeRows.length > 0) {
      lines.push(
        ...anchorProbeRows.map((row) => formatBattleProbeLine(row, row.label)),
      );
    }

    if (animationSet === "post-play-hand-draw") {
      lines.push(`phase:${previewPostPlayDebug.phase}`);
      lines.push(
        `removedIndex:${previewPostPlayDebug.removedIndex ?? "-"} drawSource:${previewPostPlayDebug.drawSourceIndex ?? "-"}`,
      );
      lines.push(`removedCard:${previewPostPlayDebug.removedCardLabel ?? "-"}`);
      lines.push(`drawnCard:${previewPostPlayDebug.drawnCardLabel ?? "-"}`);
      lines.push(`committed:${previewPostPlayDebug.committedCardLabel ?? "-"}`);
      lines.push(
        `fixtureHand:[${defaultPlayerStableCards
          .map((card) => `${card.syllable}#${card.id}`)
          .join(",")}]`,
      );
      lines.push(
        `drawOrigin:${formatBattleDebugPoint(
          getAnimationAnchorPoint("post-play-hand-draw-origin"),
        )}`,
      );
      lines.push(
        `drawOriginSnap:${formatBattleDebugSnapshot(
          buildAnimationAnchorSnapshot("post-play-hand-draw-origin"),
        )}`,
      );
    }

    if (animationSet === "hand-play-target" || animationSet === "hand-play-draw-combo") {
      const targetIndex =
        animationSet === "hand-play-target"
          ? getHandPlayTargetIndexFromPreset(animationPreset)
          : getHandPlayDrawComboTargetIndexFromPreset(animationPreset);
      const destinationAnchor =
        targetIndex != null
          ? handPlayTargetDestinationAnchorToolByPreset[
              `hand-play-target-${targetIndex}` as const
            ] ?? null
          : null;
      lines.push(
        `playTargetPreset:${targetIndex ?? "-"}`,
      );
      lines.push(
        `playDestination:${formatBattleDebugPoint(
          getAnimationAnchorPoint(destinationAnchor),
        )}`,
      );
      lines.push(
        `playDestinationSnap:${formatBattleDebugSnapshot(
          buildAnimationAnchorSnapshot(destinationAnchor),
        )}`,
      );
      lines.push(
        `pendingPlayer:[${previewPendingTargetPlacements[PLAYER]
          .map((value, index) => `${index}:${value ?? "-"}`)
          .join(",")}]`,
      );
    }

    if (animationSet === "opening-target-entry-first-round") {
      lines.push(
        `openingPreset:${animationPreset === "opening-target-entry-simultaneous" ? "simultaneous" : "single"}`,
      );
    }

    if (animationSet === "pill-damage") {
      lines.push(
        `pillPreset:${animationPreset === "pill-damage-player" ? "player" : animationPreset === "pill-damage-enemy" ? "enemy" : "-"}`,
      );
      lines.push(
        `pillFlash:player:${previewPillFlashDamage[PLAYER]} enemy:${previewPillFlashDamage[ENEMY]}`,
      );
    }

    if (animationSet === "pill-turn") {
      lines.push(
        `pillTurnPreset:${animationPreset === "pill-turn-player" ? "player" : animationPreset === "pill-turn-enemy" ? "enemy" : "-"}`,
      );
      lines.push(
        `pillActive:player:${previewPillActive[PLAYER] ? 1 : 0} enemy:${previewPillActive[ENEMY] ? 1 : 0}`,
      );
    }

    if (animationSet === "board-message") {
      lines.push(
        `boardMessagePreset:${
          animationPreset === "board-message-turn-player"
            ? "turn-player"
            : animationPreset === "board-message-turn-enemy"
              ? "turn-enemy"
              : animationPreset === "board-message-round-info"
                ? "round-info"
                : "-"
        }`,
      );
      lines.push(
        `boardMessage:${previewBoardMessage ? `${previewBoardMessage.kind}:${previewBoardMessage.title}` : "-"}`,
      );
    }

    if (
      animationSet === "replacement-target-entry" ||
      animationSet === "target-attack-replacement-combo"
    ) {
      const replacementIndex =
        animationSet === "replacement-target-entry"
          ? getReplacementTargetEntryIndexFromPreset(animationPreset)
          : getAttackReplacementComboIndexFromPreset(animationPreset);
      const replacementAnchorKey =
        replacementIndex != null
          ? (`replacement-target-entry-${replacementIndex}-origin` as const)
          : null;
      lines.push(`replacementPreset:${replacementIndex ?? "-"}`);
      lines.push(
        `replacementOrigin:${formatBattleDebugPoint(
          getAnimationAnchorPoint(
            replacementAnchorKey,
          ),
        )}`,
      );
      lines.push(
        `replacementOriginSnap:${formatBattleDebugSnapshot(
          buildAnimationAnchorSnapshot(replacementAnchorKey),
        )}`,
      );
    }

    if (
      animationSet === "mulligan-hand-return" ||
      animationSet === "mulligan-hand-draw" ||
      animationSet === "mulligan-complete-combo"
    ) {
      const mulliganReturnAnchor =
        mulliganCount != null
          ? mulliganReturnDestinationAnchorToolByPreset[
              `mulligan-hand-return-${mulliganCount}` as const
            ] ?? null
          : null;
      const mulliganDrawAnchor =
        mulliganCount != null
          ? mulliganDrawOriginAnchorToolByPreset[
              `mulligan-hand-draw-${mulliganCount}` as const
            ] ?? null
          : null;
      lines.push(
        `mulliganCount:${mulliganCount ?? "-"} reservedSlots:${mulliganReservedSlots}`,
      );
      lines.push(
        `remainingStableCount:${previewPlayerStableCards.length} plannedIncomingCount:${Math.max(0, (mulliganCount ?? 0) - incomingPreviewHands[PLAYER].length)}`,
      );
      lines.push(
        `mulliganReturnAnchor:${formatBattleDebugPoint(
          getAnimationAnchorPoint(
            mulliganReturnAnchor,
          ),
        )}`,
      );
      lines.push(
        `mulliganReturnSnap:${formatBattleDebugSnapshot(
          buildAnimationAnchorSnapshot(mulliganReturnAnchor),
        )}`,
      );
      lines.push(
        `mulliganDrawAnchor:${formatBattleDebugPoint(
          getAnimationAnchorPoint(
            mulliganDrawAnchor,
          ),
        )}`,
      );
      lines.push(
        `mulliganDrawSnap:${formatBattleDebugSnapshot(
          buildAnimationAnchorSnapshot(mulliganDrawAnchor),
        )}`,
      );
    }

    if (
      animationSet === "target-attack" ||
      animationSet === "target-attack-replacement-combo"
    ) {
      if (animationSet === "target-attack-replacement-combo") {
        const attackIndex = getAttackReplacementComboIndexFromPreset(animationPreset);
        const impactAnchor =
          attackIndex != null
            ? (`target-attack-${attackIndex}-impact` as const)
            : null;
        const destinationAnchor =
          attackIndex != null
            ? (`target-attack-${attackIndex}-destination` as const)
            : null;
        lines.push(`attackPreset:${attackIndex ?? "-"}`);
        lines.push(
          `impactAnchor:${formatBattleDebugPoint(getAnimationAnchorPoint(impactAnchor))}`,
        );
        lines.push(
          `attackDestination:${formatBattleDebugPoint(
            getAnimationAnchorPoint(destinationAnchor),
          )}`,
        );
        lines.push(
          `impactSnap:${formatBattleDebugSnapshot(
            buildAnimationAnchorSnapshot(impactAnchor),
          )}`,
        );
        lines.push(
          `attackDestinationSnap:${formatBattleDebugSnapshot(
            buildAnimationAnchorSnapshot(destinationAnchor),
          )}`,
        );
      }
      lines.push(
        `impactAnchors:[${[
          "target-attack-0-impact",
          "target-attack-1-impact",
          "target-attack-2-impact",
          "target-attack-3-impact",
        ]
          .map((anchor) => `${anchor}:${formatBattleDebugPoint(getAnimationAnchorPoint(anchor as BattleLayoutPreviewAnimationAnchorKey))}`)
          .join(" | ")}]`,
      );
      lines.push(
        `destAnchors:[${[
          "target-attack-0-destination",
          "target-attack-1-destination",
          "target-attack-2-destination",
          "target-attack-3-destination",
        ]
          .map((anchor) => `${anchor}:${formatBattleDebugPoint(getAnimationAnchorPoint(anchor as BattleLayoutPreviewAnimationAnchorKey))}`)
          .join(" | ")}]`,
      );
    }

    return lines;
  }, [
    animationAnchorTool,
    animationMode,
    animationPreset,
    animationRunId,
    animationSet,
    defaultPlayerStableCards,
    fixture.scene.board.enemyFieldSlots,
    fixture.scene.board.playerFieldSlots,
    getAnimationAnchorPoint,
    hiddenStableTargets,
    incomingPreviewHands,
    incomingPreviewTargets,
    outgoingPreviewHands,
    outgoingPreviewTargets,
    anchorProbeRows,
    buildAnimationAnchorSnapshot,
    previewPendingTargetPlacements,
    previewFreshCardIds,
    previewPlayerStableCards,
    previewPostPlayDebug,
    previewPillFlashDamage,
    previewPillActive,
    previewBoardMessage,
    previewSelectedIndexes,
    stageMetrics.offsetX,
    stageMetrics.offsetY,
    stageMetrics.scale,
    viewportHeight,
    viewportWidth,
    visibleAnimationAnchors,
  ]);

  const postAnimationAnchorUpdate = useCallback(
    (
      anchor: BattleLayoutPreviewAnimationAnchorKey,
      point: { x: number; y: number },
    ) => {
      if (typeof window === "undefined" || !window.parent) return;
      window.parent.postMessage(
        {
          type: BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE,
          payload: {
            kind: "update-animation-anchor",
            anchor,
            point,
          },
        },
        window.location.origin,
      );
    },
    [],
  );

  const getScenePointFromClient = useCallback(
    (clientX: number, clientY: number, stageRoot: HTMLElement) => {
      const rect = stageRoot.getBoundingClientRect();
      const x = Math.round((clientX - rect.left) / stageMetrics.scale);
      const y = Math.round((clientY - rect.top) / stageMetrics.scale);
      return {
        x: Math.max(0, Math.min(BATTLE_STAGE_WIDTH, x)),
        y: Math.max(0, Math.min(BATTLE_STAGE_HEIGHT, y)),
      };
    },
    [stageMetrics.scale],
  );

  const beginAnimationAnchorDrag = useCallback(
    (anchor: BattleLayoutPreviewAnimationAnchorKey) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!editorMode || animationAnchorTool !== anchor) return;
        const stageRoot = event.currentTarget.closest(
          '[data-battle-stage-root="true"]',
        );
        if (!(stageRoot instanceof HTMLElement)) return;
        event.preventDefault();
        anchorDragRef.current = { anchor, stageRoot };
        postAnimationAnchorUpdate(
          anchor,
          getScenePointFromClient(event.clientX, event.clientY, stageRoot),
        );
      },
    [animationAnchorTool, editorMode, getScenePointFromClient, postAnimationAnchorUpdate],
  );

  useEffect(() => {
    if (!editorMode) return;

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = anchorDragRef.current;
      if (!dragState) return;
      event.preventDefault();
      postAnimationAnchorUpdate(
        dragState.anchor,
        getScenePointFromClient(
          event.clientX,
          event.clientY,
          dragState.stageRoot,
        ),
      );
    };

    const handleMouseUp = () => {
      anchorDragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editorMode, getScenePointFromClient, postAnimationAnchorUpdate]);

  useEffect(() => {
    const isOpeningTargetEntryAnimation =
      animationSet === "opening-target-entry-first-round" &&
      (animationMode === "opening-target-entry-loop" ||
        animationMode === "opening-target-entry-play-once");
    const isPillDamageAnimation =
      animationSet === "pill-damage" &&
      (animationMode === "pill-damage-loop" ||
        animationMode === "pill-damage-play-once");
    const isPillTurnAnimation =
      animationSet === "pill-turn" &&
      (animationMode === "pill-turn-loop" ||
        animationMode === "pill-turn-play-once");
    const isBoardMessageAnimation =
      animationSet === "board-message" &&
      (animationMode === "board-message-loop" ||
        animationMode === "board-message-play-once");
    const isReplacementTargetEntryAnimation =
      animationSet === "replacement-target-entry" &&
      (animationMode === "replacement-target-entry-loop" ||
        animationMode === "replacement-target-entry-play-once");
    const isPostPlayHandDrawAnimation =
      animationSet === "post-play-hand-draw" &&
      (animationMode === "post-play-hand-draw-loop" ||
        animationMode === "post-play-hand-draw-play-once");
    const isHandPlayTargetAnimation =
      animationSet === "hand-play-target" &&
      (animationMode === "hand-play-target-loop" ||
        animationMode === "hand-play-target-play-once");
    const isMulliganReturnAnimation =
      animationSet === "mulligan-hand-return" &&
      (animationMode === "mulligan-hand-return-loop" ||
        animationMode === "mulligan-hand-return-play-once");
    const isMulliganDrawAnimation =
      animationSet === "mulligan-hand-draw" &&
      (animationMode === "mulligan-hand-draw-loop" ||
        animationMode === "mulligan-hand-draw-play-once");
    const isTargetAttackAnimation =
      animationSet === "target-attack" &&
      (animationMode === "target-attack-loop" ||
        animationMode === "target-attack-play-once");
    const isHandPlayDrawComboAnimation =
      animationSet === "hand-play-draw-combo" &&
      (animationMode === "hand-play-draw-combo-loop" ||
        animationMode === "hand-play-draw-combo-play-once");
    const isTargetAttackReplacementComboAnimation =
      animationSet === "target-attack-replacement-combo" &&
      (animationMode === "target-attack-replacement-combo-loop" ||
        animationMode === "target-attack-replacement-combo-play-once");
    const isMulliganCompleteComboAnimation =
      animationSet === "mulligan-complete-combo" &&
      (animationMode === "mulligan-complete-combo-loop" ||
        animationMode === "mulligan-complete-combo-play-once");

    if (
      animationPreset === "none" ||
      (!isOpeningTargetEntryAnimation &&
        !isPillDamageAnimation &&
        !isPillTurnAnimation &&
        !isBoardMessageAnimation &&
        !isReplacementTargetEntryAnimation &&
        !isPostPlayHandDrawAnimation &&
        !isHandPlayTargetAnimation &&
        !isMulliganReturnAnimation &&
        !isMulliganDrawAnimation &&
        !isTargetAttackAnimation &&
        !isHandPlayDrawComboAnimation &&
        !isTargetAttackReplacementComboAnimation &&
        !isMulliganCompleteComboAnimation)
    ) {
      resetPreviewAnimation();
      return;
    }

    const generation = loopGenerationRef.current + 1;
    loopGenerationRef.current = generation;
    clearAnimationTimers();

    const buildStagedTargets = () => {
      const allStagedTargets = [
        ...fixture.scene.board.playerFieldSlots.map((slot, slotIndex) => ({
          side: PLAYER as typeof PLAYER | typeof ENEMY,
          slotIndex,
          entity: slot.displayedTarget,
        })),
        ...fixture.scene.board.enemyFieldSlots.map((slot, slotIndex) => ({
          side: ENEMY as typeof PLAYER | typeof ENEMY,
          slotIndex,
          entity: slot.displayedTarget,
        })),
      ]
        .filter((entry): entry is {
        side: typeof PLAYER | typeof ENEMY;
        slotIndex: number;
        entity: NonNullable<typeof fixture.scene.board.playerFieldSlots[number]["displayedTarget"]>;
      } => Boolean(entry.entity))
        .map((entry, entryIndex) => ({
          ...entry,
          entryIndex,
        }));

      if (animationPreset === "opening-target-entry-simultaneous") {
        return allStagedTargets;
      }

      const presetIndexMap: Record<
        | "opening-target-entry-0"
        | "opening-target-entry-1"
        | "opening-target-entry-2"
        | "opening-target-entry-3",
        number
      > = {
        "opening-target-entry-0": 0,
        "opening-target-entry-1": 1,
        "opening-target-entry-2": 2,
        "opening-target-entry-3": 3,
      };

      const selectedTarget = allStagedTargets[presetIndexMap[animationPreset]];
      return selectedTarget ? [selectedTarget] : [];
    };

    const startOpeningLoop = () => {
      if (loopGenerationRef.current !== generation) return;

      setIncomingPreviewTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      const stagedTargets = buildStagedTargets();

      setHiddenStableTargets({
        [PLAYER]: fixture.scene.board.playerFieldSlots.map((slot, slotIndex) =>
          stagedTargets.some((entry) => entry.side === PLAYER && entry.slotIndex === slotIndex)
            ? Boolean(slot.displayedTarget)
            : false,
        ),
        [ENEMY]: fixture.scene.board.enemyFieldSlots.map((slot, slotIndex) =>
          stagedTargets.some((entry) => entry.side === ENEMY && entry.slotIndex === slotIndex)
            ? Boolean(slot.displayedTarget)
            : false,
        ),
      });

      stagedTargets.forEach(({ side, slotIndex, entity, entryIndex }, index) => {
        const anchorTool =
          openingTargetEntryAnchorToolByPreset[
            `opening-target-entry-${entryIndex}` as Extract<
              BattleLayoutPreviewAnimationPreset,
              "opening-target-entry-0" |
              "opening-target-entry-1" |
              "opening-target-entry-2" |
              "opening-target-entry-3"
            >
          ] ?? null;
        const origin = buildAnimationAnchorSnapshot(anchorTool) ?? readElementSnapshot(
              side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck",
            );
        if (!origin) {
          updateHiddenStableTarget(side, slotIndex, false);
          return;
        }

        const timer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          setIncomingPreviewTargets((current) => ({
            ...current,
            [side]: [
              ...current[side],
              {
                id: `fixture-opening-target-${animationRunId}-${generation}-${side}-${slotIndex}`,
                side,
                slotIndex,
                entryIndex,
                entity,
                origin,
                delayMs: 0,
                durationMs: FIXTURE_TARGET_ENTER_DURATION_MS,
              },
            ],
          }));
        }, stagedTargets.length === 1 ? 0 : index * FIXTURE_TARGET_ENTER_STAGGER_MS);
        animationTimersRef.current.push(timer);
      });

      const totalMs =
        Math.max(0, (stagedTargets.length - 1) * FIXTURE_TARGET_ENTER_STAGGER_MS) +
        FIXTURE_TARGET_ENTER_DURATION_MS +
        FIXTURE_TARGET_ENTER_SETTLE_MS;

      if (animationMode === "opening-target-entry-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startOpeningLoop();
        }, totalMs + FIXTURE_TARGET_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startPillDamageLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      const side =
        animationPreset === "pill-damage-enemy" ? ENEMY : PLAYER;
      setPreviewPillFlashDamage({
        [PLAYER]: side === PLAYER ? FIXTURE_PILL_DAMAGE_AMOUNT : 0,
        [ENEMY]: side === ENEMY ? FIXTURE_PILL_DAMAGE_AMOUNT : 0,
      });

      const clearTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewPillFlashDamage({
          [PLAYER]: 0,
          [ENEMY]: 0,
        });
      }, FIXTURE_PILL_DAMAGE_DURATION_MS);
      animationTimersRef.current.push(clearTimer);

      if (animationMode === "pill-damage-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startPillDamageLoop();
        }, FIXTURE_PILL_DAMAGE_DURATION_MS + FIXTURE_PILL_DAMAGE_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, FIXTURE_PILL_DAMAGE_DURATION_MS + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startPillTurnLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      const activeSide =
        animationPreset === "pill-turn-enemy" ? ENEMY : PLAYER;
      setPreviewPillActive({
        [PLAYER]: activeSide === PLAYER,
        [ENEMY]: activeSide === ENEMY,
      });

      const resetTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewPillActive({
          [PLAYER]: fixture.scene.board.playerPortrait?.active ?? false,
          [ENEMY]: fixture.scene.board.enemyPortrait?.active ?? false,
        });
      }, FIXTURE_PILL_TURN_DURATION_MS);
      animationTimersRef.current.push(resetTimer);

      if (animationMode === "pill-turn-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startPillTurnLoop();
        }, FIXTURE_PILL_TURN_DURATION_MS + FIXTURE_PILL_TURN_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, FIXTURE_PILL_TURN_DURATION_MS + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startBoardMessageLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      const previewMessage: GameMessage =
        animationPreset === "board-message-turn-enemy"
          ? { title: "Turno do Oponente", detail: "", kind: "turn" }
          : animationPreset === "board-message-round-info"
            ? { title: "Novo Round", detail: "", kind: "info" }
            : { title: "Seu Turno", detail: "", kind: "turn" };
      const durationMs =
        previewMessage.kind === "info"
          ? FIXTURE_BOARD_MESSAGE_INFO_DURATION_MS
          : FIXTURE_BOARD_MESSAGE_TURN_DURATION_MS;
      setPreviewBoardMessage(previewMessage);

      const resetTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewBoardMessage(null);
      }, durationMs);
      animationTimersRef.current.push(resetTimer);

      if (animationMode === "board-message-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startBoardMessageLoop();
        }, durationMs + FIXTURE_BOARD_MESSAGE_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, durationMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startReplacementTargetEntryLoop = () => {
      if (loopGenerationRef.current !== generation) return;

      setIncomingPreviewTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });

      const replacementIndex =
        getReplacementTargetEntryIndexFromPreset(animationPreset);
      if (replacementIndex == null) {
        resetPreviewAnimation();
        return;
      }
      const side = replacementIndex >= 2 ? ENEMY : PLAYER;
      const slotIndex = replacementIndex % 2;
      const sourceSlot =
        side === PLAYER
          ? fixture.scene.board.playerFieldSlots[slotIndex]
          : fixture.scene.board.enemyFieldSlots[slotIndex];
      const entity = sourceSlot?.displayedTarget ?? null;

      if (!entity) {
        resetPreviewAnimation();
        return;
      }

      const anchorTool =
        replacementTargetEntryAnchorToolByPreset[animationPreset] ?? null;
      const origin = buildAnimationAnchorSnapshot(anchorTool) ?? readElementSnapshot(
            side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck",
          );

      if (!origin) {
        updateHiddenStableTarget(side, slotIndex, false);
        return;
      }

      setHiddenStableTargets({
        [PLAYER]: fixture.scene.board.playerFieldSlots.map((slot, index) =>
          side === PLAYER && index === slotIndex ? Boolean(slot.displayedTarget) : false,
        ),
        [ENEMY]: fixture.scene.board.enemyFieldSlots.map((slot, index) =>
          side === ENEMY && index === slotIndex ? Boolean(slot.displayedTarget) : false,
        ),
      });

      const timer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setIncomingPreviewTargets((current) => ({
          ...current,
          [side]: [
            ...current[side],
            {
              id: `fixture-replacement-target-${animationRunId}-${generation}-${side}-${slotIndex}`,
              side,
              slotIndex,
              entryIndex: replacementIndex,
              entity,
              origin,
              delayMs: 0,
              durationMs: FIXTURE_TARGET_ENTER_DURATION_MS,
            },
          ],
        }));
      }, 0);
      animationTimersRef.current.push(timer);

      const totalMs =
        FIXTURE_TARGET_ENTER_DURATION_MS +
        FIXTURE_REPLACEMENT_TARGET_ENTER_SETTLE_MS;

      if (animationMode === "replacement-target-entry-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startReplacementTargetEntryLoop();
        }, totalMs + FIXTURE_TARGET_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const getSelectedHandPlayPreviewSetup = (
      targetIndex: 0 | 1,
    ): {
      removedIndex: number;
      playedCard: BattleHandLaneCard;
      handPlayDestination: ZoneAnchorSnapshot;
    } | null => {
      const removedIndex =
        previewSelectedIndexes[0] ??
        fixture.selectedIndexes?.[0] ??
        Math.max(0, defaultPlayerStableCards.length - 1);
      const playedCard = defaultPlayerStableCards[removedIndex] ?? null;
      if (!playedCard) return null;
      const destinationAnchor =
        handPlayTargetDestinationAnchorToolByPreset[
          `hand-play-target-${targetIndex}` as const
        ] ?? null;
      const destination = buildAnimationAnchorSnapshot(destinationAnchor) ?? (() => {
        const slotRect =
          slotNodesRef.current[PLAYER][targetIndex]?.getBoundingClientRect() ??
          null;
        if (slotRect) {
          return {
            left: slotRect.left,
            top: slotRect.top,
            width: slotRect.width,
            height: slotRect.height,
          };
        }
        const sceneRect = getFieldSlotSceneRect(PLAYER, targetIndex);
        return {
          left: sceneRect.x * stageMetrics.scale + stageMetrics.offsetX,
          top: sceneRect.y * stageMetrics.scale + stageMetrics.offsetY,
          width: sceneRect.width * stageMetrics.scale,
          height: sceneRect.height * stageMetrics.scale,
        };
      })();
      if (!destination) return null;
      return {
        removedIndex,
        playedCard,
        handPlayDestination: destination,
      };
    };

    const resolveSimplePlayPreviewDrawGeometry = (removedIndex: number) => {
      const drawSourceIndex =
        removedIndex === defaultPlayerStableCards.length - 1
          ? 0
          : defaultPlayerStableCards.length - 1;
      const drawnCard = defaultPlayerStableCards[drawSourceIndex] ?? null;
      const removedCard = defaultPlayerStableCards[removedIndex] ?? null;
      const origin =
        buildAnimationAnchorSnapshot("post-play-hand-draw-origin") ??
        readElementSnapshot("playerDeck");
      return {
        drawSourceIndex,
        drawnCard,
        removedCard,
        postPlayDrawOrigin: origin,
      };
    };

    const startPostPlayHandDrawLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      setIncomingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setPreviewFreshCardIds([]);
      const removedIndex =
        fixture.selectedIndexes?.[0] ?? Math.max(0, defaultPlayerStableCards.length - 1);
      const {
        drawSourceIndex,
        drawnCard,
        removedCard,
        postPlayDrawOrigin,
      } = resolveSimplePlayPreviewDrawGeometry(removedIndex);
      setPreviewPlayerStableCards(
        defaultPlayerStableCards.filter((_, index) => index !== removedIndex),
      );

      if (postPlayDrawOrigin && drawnCard) {
        setPreviewPostPlayDebug({
          removedIndex,
          drawSourceIndex,
          removedCardLabel: removedCard
            ? `${removedCard.syllable}#${removedCard.id}`
            : null,
          drawnCardLabel: `${drawnCard.syllable}#${drawnCard.id}`,
          committedCardLabel: null,
          phase: "setup",
        });
        const timer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          setPreviewPostPlayDebug((current) => ({
            ...current,
            phase: "incoming",
          }));
          setIncomingPreviewHands({
            [PLAYER]: [
              {
                id: `fixture-post-play-draw-${animationRunId}-${generation}`,
                side: PLAYER,
                card: {
                  ...drawnCard,
                  id: `${drawnCard.id}-incoming-${generation}`,
                },
                origin: postPlayDrawOrigin,
                finalIndex: 4,
                finalTotal: 5,
                delayMs: 0,
                durationMs: FIXTURE_POST_PLAY_DRAW_DURATION_MS,
              },
            ],
            [ENEMY]: [],
          });
        }, 0);
        animationTimersRef.current.push(timer);
      } else {
        setPreviewPostPlayDebug({
          removedIndex,
          drawSourceIndex,
          removedCardLabel: removedCard
            ? `${removedCard.syllable}#${removedCard.id}`
            : null,
          drawnCardLabel: drawnCard ? `${drawnCard.syllable}#${drawnCard.id}` : null,
          committedCardLabel: null,
          phase: "setup",
        });
      }

      const totalMs =
        FIXTURE_POST_PLAY_DRAW_DURATION_MS + FIXTURE_POST_PLAY_DRAW_SETTLE_MS;
      if (animationMode === "post-play-hand-draw-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startPostPlayHandDrawLoop();
        }, totalMs + FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startHandPlayTargetLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      setIncomingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setOutgoingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setPreviewFreshCardIds([]);
      setPreviewPendingTargetPlacements({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      const targetIndex = getHandPlayTargetIndexFromPreset(animationPreset) ?? 0;
      const previewSetup = getSelectedHandPlayPreviewSetup(targetIndex);
      if (!previewSetup) return;
      const { removedIndex, playedCard, handPlayDestination } = previewSetup;
      setPreviewPlayerStableCards(
        defaultPlayerStableCards.filter((_, index) => index !== removedIndex),
      );
      setPreviewPendingTargetPlacements({
        [PLAYER]: fixture.scene.board.playerFieldSlots.map((_, index) =>
          index === targetIndex ? playedCard.syllable : null,
        ),
        [ENEMY]: [],
      });
      setOutgoingPreviewHands({
        [PLAYER]: [
          {
            id: `fixture-hand-play-target-${animationRunId}-${generation}-${targetIndex}`,
            side: PLAYER,
            card: playedCard,
            destination: handPlayDestination,
            initialIndex: removedIndex,
            initialTotal: defaultPlayerStableCards.length,
            delayMs: 0,
            durationMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
            destinationMode: "zone-center",
            endRotate: 8,
            endScale: 1,
            targetSlotIndex: targetIndex,
            pendingCardRevealDelayMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
          },
        ],
        [ENEMY]: [],
      });
      const totalMs =
        BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs +
        BATTLE_SHARED_FLOW_TIMINGS.cardSettleMs;
      const clearPendingTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewPendingTargetPlacements({
          [PLAYER]: [],
          [ENEMY]: [],
        });
      }, totalMs);
      animationTimersRef.current.push(clearPendingTimer);
      if (animationMode === "hand-play-target-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startHandPlayTargetLoop();
        }, totalMs + FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startHandPlayDrawComboLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      setIncomingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setOutgoingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setPreviewFreshCardIds([]);
      setPreviewPendingTargetPlacements({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      const targetIndex = getHandPlayDrawComboTargetIndexFromPreset(animationPreset);
      if (targetIndex == null) return;
      const previewSetup = getSelectedHandPlayPreviewSetup(targetIndex);
      if (!previewSetup) return;
      const { removedIndex, playedCard, handPlayDestination } = previewSetup;
      const {
        drawSourceIndex,
        drawnCard,
        removedCard,
        postPlayDrawOrigin,
      } = resolveSimplePlayPreviewDrawGeometry(removedIndex);
      const visualPlan = createSimplePlayVisualPlan({
        flow: BATTLE_SHARED_FLOW_TIMINGS,
        result: {
          damage: 0,
          completedSlot: null,
          actorIndex: PLAYER,
          playedCard: playedCard.syllable,
          drawnCards: drawnCard ? [drawnCard.syllable] : [],
        },
        targetIndex,
        handIndex: removedIndex,
        stableHandCountBeforePlay: defaultPlayerStableCards.length,
      });
      if (!visualPlan) return;

      setPreviewPlayerStableCards(
        defaultPlayerStableCards.filter(
          (_, index) => index !== visualPlan.handExit.handIndex,
        ),
      );
      setPreviewPendingTargetPlacements({
        [PLAYER]: fixture.scene.board.playerFieldSlots.map((_, index) =>
          index === visualPlan.targetProgressCommit.targetIndex
            ? playedCard.syllable
            : null,
        ),
        [ENEMY]: [],
      });
      setPreviewPostPlayDebug({
        removedIndex,
        drawSourceIndex,
        removedCardLabel: removedCard ? `${removedCard.syllable}#${removedCard.id}` : null,
        drawnCardLabel: drawnCard ? `${drawnCard.syllable}#${drawnCard.id}` : null,
        committedCardLabel: null,
        phase: "setup",
      });
      setOutgoingPreviewHands({
        [PLAYER]: [
          {
            id: `fixture-hand-play-draw-combo-${animationRunId}-${generation}-${targetIndex}`,
            side: PLAYER,
            card: playedCard,
            destination: handPlayDestination,
            initialIndex: visualPlan.handExit.handIndex,
            initialTotal: visualPlan.handExit.handCountBefore,
            delayMs: 0,
            durationMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
            destinationMode: "zone-center",
            endRotate: 8,
            endScale: 1,
            targetSlotIndex: targetIndex,
            pendingCardRevealDelayMs: BATTLE_SHARED_FLOW_TIMINGS.cardToFieldMs,
          },
        ],
        [ENEMY]: [],
      });

      const clearPendingTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewPendingTargetPlacements({
          [PLAYER]: [],
          [ENEMY]: [],
        });
      }, visualPlan.targetProgressCommit.atMs);
      animationTimersRef.current.push(clearPendingTimer);

      if (postPlayDrawOrigin && drawnCard && visualPlan.postPlayDraw) {
        const drawTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          setPreviewPostPlayDebug((current) => ({
            ...current,
            phase: "incoming",
          }));
          setIncomingPreviewHands({
            [PLAYER]: [
              {
                id: `fixture-hand-play-draw-combo-draw-${animationRunId}-${generation}`,
                side: PLAYER,
                card: {
                  ...drawnCard,
                  id: `${drawnCard.id}-combo-incoming-${generation}`,
                },
                origin: postPlayDrawOrigin,
                finalIndex: visualPlan.postPlayDraw.finalIndexBase,
                finalTotal: visualPlan.postPlayDraw.finalTotal,
                delayMs: 0,
                durationMs: visualPlan.postPlayDraw.durationMs,
              },
            ],
            [ENEMY]: [],
          });
        }, visualPlan.postPlayDraw.atMs);
        animationTimersRef.current.push(drawTimer);
      }

      const totalMs = visualPlan.finish.atMs;
      if (animationMode === "hand-play-draw-combo-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startHandPlayDrawComboLoop();
        }, totalMs + FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const resetMulliganPreviewHandAnimationState = () => {
      setIncomingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setOutgoingPreviewHands({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setPreviewFreshCardIds([]);
    };

    const getMulliganPreviewHandState = () => {
      const count = getMulliganCountFromPreset(animationPreset);
      if (!count) return null;
      return {
        count,
        removedCards: defaultPlayerStableCards.slice(0, count),
        remainingCards: defaultPlayerStableCards.slice(count),
      };
    };

    const getMulliganReturnDestination = () => {
      const destinationAnchor =
        mulliganReturnDestinationAnchorToolByPreset[animationPreset];
      return (
        buildAnimationAnchorSnapshot(destinationAnchor) ??
        readElementSnapshot("playerDeck")
      );
    };

    const getMulliganDrawOrigin = () => {
      const originAnchor = mulliganDrawOriginAnchorToolByPreset[animationPreset];
      return (
        buildAnimationAnchorSnapshot(originAnchor) ??
        readElementSnapshot("playerDeck")
      );
    };

    const scheduleMulliganPreviewCompletion = (
      totalMs: number,
      loopMode: boolean,
      restart: () => void,
      gapMs: number,
    ) => {
      if (loopMode) {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          restart();
        }, totalMs + gapMs);
        animationTimersRef.current.push(restartTimer);
        return;
      }
      const cleanupTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        resetPreviewAnimation();
      }, totalMs + 40);
      animationTimersRef.current.push(cleanupTimer);
    };

    const startMulliganReturnLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      resetMulliganPreviewHandAnimationState();
      const handState = getMulliganPreviewHandState();
      if (!handState) return;
      const { count, removedCards, remainingCards } = handState;
      setPreviewPlayerStableCards(remainingCards);
      const destination = getMulliganReturnDestination();
      if (!destination) return;
      setOutgoingPreviewHands({
        [PLAYER]: removedCards.map((card, index) => ({
          id: `fixture-mulligan-return-${animationRunId}-${generation}-${index}`,
          side: PLAYER,
          card,
          destination,
          initialIndex: index,
          initialTotal: defaultPlayerStableCards.length,
          delayMs: index * FIXTURE_MULLIGAN_RETURN_STAGGER_MS,
          durationMs: FIXTURE_MULLIGAN_RETURN_DURATION_MS,
        })),
        [ENEMY]: [],
      });

      const totalMs =
        Math.max(0, (count - 1) * FIXTURE_MULLIGAN_RETURN_STAGGER_MS) +
        FIXTURE_MULLIGAN_RETURN_DURATION_MS +
        FIXTURE_MULLIGAN_RETURN_SETTLE_MS;
      scheduleMulliganPreviewCompletion(
        totalMs,
        animationMode === "mulligan-hand-return-loop",
        startMulliganReturnLoop,
        FIXTURE_MULLIGAN_RETURN_LOOP_GAP_MS,
      );
    };

    const startMulliganDrawLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      resetMulliganPreviewHandAnimationState();
      const handState = getMulliganPreviewHandState();
      if (!handState) return;
      const { count, removedCards, remainingCards } = handState;
      setPreviewPlayerStableCards(remainingCards);
      const origin = getMulliganDrawOrigin();
      if (!origin) return;
      const startDelayMs =
        FIXTURE_MULLIGAN_RETURN_DURATION_MS +
        Math.max(0, count - 1) * FIXTURE_MULLIGAN_RETURN_STAGGER_MS +
        FIXTURE_MULLIGAN_DRAW_START_DELAY_MS;
      removedCards.forEach((card, index) => {
        const timer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          setIncomingPreviewHands((current) => ({
            ...current,
            [PLAYER]: [
              ...current[PLAYER],
              {
                id: `fixture-mulligan-draw-${animationRunId}-${generation}-${index}`,
                side: PLAYER,
                card: {
                  ...card,
                  id: `${card.id}-mulligan-incoming-${generation}-${index}`,
                },
                origin,
                finalIndex: remainingCards.length + index,
                finalTotal: remainingCards.length + count,
                delayMs: 0,
                durationMs: FIXTURE_MULLIGAN_DRAW_DURATION_MS,
              },
            ],
          }));
        }, startDelayMs + index * FIXTURE_MULLIGAN_DRAW_STAGGER_MS);
        animationTimersRef.current.push(timer);
      });

      const totalMs =
        startDelayMs +
        Math.max(0, (count - 1) * FIXTURE_MULLIGAN_DRAW_STAGGER_MS) +
        FIXTURE_MULLIGAN_DRAW_DURATION_MS +
        FIXTURE_MULLIGAN_DRAW_SETTLE_MS;
      scheduleMulliganPreviewCompletion(
        totalMs,
        animationMode === "mulligan-hand-draw-loop",
        startMulliganDrawLoop,
        FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS,
      );
    };

    const startMulliganCompleteComboLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      resetMulliganPreviewHandAnimationState();
      const count = getMulliganCompleteComboCountFromPreset(animationPreset);
      if (!count) return;
      const removedCards = defaultPlayerStableCards.slice(0, count);
      const remainingCards = defaultPlayerStableCards.slice(count);
      setPreviewPlayerStableCards(remainingCards);
      const destination =
        buildAnimationAnchorSnapshot(
          mulliganReturnDestinationAnchorToolByPreset[
            `mulligan-hand-return-${count}` as const
          ] ?? null,
        ) ?? readElementSnapshot("playerDeck");
      const origin =
        buildAnimationAnchorSnapshot(
          mulliganDrawOriginAnchorToolByPreset[
            `mulligan-hand-draw-${count}` as const
          ] ?? null,
        ) ?? readElementSnapshot("playerDeck");
      if (!destination || !origin) return;

      setOutgoingPreviewHands({
        [PLAYER]: removedCards.map((card, index) => ({
          id: `fixture-mulligan-complete-return-${animationRunId}-${generation}-${index}`,
          side: PLAYER,
          card,
          destination,
          initialIndex: index,
          initialTotal: defaultPlayerStableCards.length,
          delayMs: index * FIXTURE_MULLIGAN_RETURN_STAGGER_MS,
          durationMs: FIXTURE_MULLIGAN_RETURN_DURATION_MS,
        })),
        [ENEMY]: [],
      });

      const startDelayMs =
        FIXTURE_MULLIGAN_RETURN_DURATION_MS +
        Math.max(0, count - 1) * FIXTURE_MULLIGAN_RETURN_STAGGER_MS +
        FIXTURE_MULLIGAN_DRAW_START_DELAY_MS;
      removedCards.forEach((card, index) => {
        const timer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          setIncomingPreviewHands((current) => ({
            ...current,
            [PLAYER]: [
              ...current[PLAYER],
              {
                id: `fixture-mulligan-complete-draw-${animationRunId}-${generation}-${index}`,
                side: PLAYER,
                card: {
                  ...card,
                  id: `${card.id}-mulligan-complete-${generation}-${index}`,
                },
                origin,
                finalIndex: remainingCards.length + index,
                finalTotal: remainingCards.length + count,
                delayMs: 0,
                durationMs: FIXTURE_MULLIGAN_DRAW_DURATION_MS,
              },
            ],
          }));
        }, startDelayMs + index * FIXTURE_MULLIGAN_DRAW_STAGGER_MS);
        animationTimersRef.current.push(timer);
      });

      const totalMs =
        startDelayMs +
        Math.max(0, (count - 1) * FIXTURE_MULLIGAN_DRAW_STAGGER_MS) +
        FIXTURE_MULLIGAN_DRAW_DURATION_MS +
        FIXTURE_MULLIGAN_DRAW_SETTLE_MS;
      scheduleMulliganPreviewCompletion(
        totalMs,
        animationMode === "mulligan-complete-combo-loop",
        startMulliganCompleteComboLoop,
        FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS,
      );
    };

    const startTargetAttackLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      setOutgoingPreviewTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      const attackIndex =
        animationPreset === "target-attack-0"
          ? 0
          : animationPreset === "target-attack-1"
            ? 1
            : animationPreset === "target-attack-2"
              ? 2
              : 3;
      const side = attackIndex >= 2 ? ENEMY : PLAYER;
      const slotIndex = attackIndex % 2;
      const slot =
        side === PLAYER
          ? fixture.scene.board.playerFieldSlots[slotIndex]
          : fixture.scene.board.enemyFieldSlots[slotIndex];
      const entity = slot?.displayedTarget ?? null;
      const impactSnapshot = buildAnimationAnchorSnapshot(
        targetAttackImpactAnchorToolByPreset[animationPreset] ?? null,
      );
      const destination =
        buildAnimationAnchorSnapshot(
          targetAttackDestinationAnchorToolByPreset[animationPreset] ?? null,
        ) ?? readElementSnapshot(side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck");
      if (!entity || !destination) {
        return;
      }
      const outgoingTarget: FixtureOutgoingTarget = {
        id: `fixture-target-attack-${animationRunId}-${generation}-${side}-${slotIndex}`,
        side,
        slotIndex,
        entity,
        impactDestination: impactSnapshot,
        destination,
        delayMs: 0,
        windupMs: FIXTURE_TARGET_ATTACK_WINDUP_MS,
        attackMs: FIXTURE_TARGET_ATTACK_TRAVEL_MS,
        pauseMs: FIXTURE_TARGET_ATTACK_PAUSE_MS,
        exitMs: FIXTURE_TARGET_ATTACK_EXIT_MS,
      };
      const timer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setOutgoingPreviewTargets((current) => ({
          ...current,
          [side]: [outgoingTarget],
        }));
      }, 0);
      animationTimersRef.current.push(timer);

      const totalMs =
        FIXTURE_TARGET_ATTACK_WINDUP_MS +
        FIXTURE_TARGET_ATTACK_TRAVEL_MS +
        FIXTURE_TARGET_ATTACK_PAUSE_MS +
        FIXTURE_TARGET_ATTACK_EXIT_MS;
      if (animationMode === "target-attack-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startTargetAttackLoop();
        }, totalMs + FIXTURE_TARGET_ATTACK_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    const startTargetAttackReplacementComboLoop = () => {
      if (loopGenerationRef.current !== generation) return;
      setIncomingPreviewTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });
      setOutgoingPreviewTargets({
        [PLAYER]: [],
        [ENEMY]: [],
      });

      const attackIndex = getAttackReplacementComboIndexFromPreset(animationPreset);
      if (attackIndex == null) return;
      const side = attackIndex >= 2 ? ENEMY : PLAYER;
      const slotIndex = attackIndex % 2;
      const slot =
        side === PLAYER
          ? fixture.scene.board.playerFieldSlots[slotIndex]
          : fixture.scene.board.enemyFieldSlots[slotIndex];
      const entity = slot?.displayedTarget ?? null;
      if (!entity) return;
      updateHiddenStableTarget(side, slotIndex, true);

      const impactSnapshot =
        buildAnimationAnchorSnapshot(
          targetAttackImpactAnchorToolByPreset[
            `target-attack-${attackIndex}` as const
          ] ?? null,
        );
      const destination =
        buildAnimationAnchorSnapshot(
          targetAttackDestinationAnchorToolByPreset[
            `target-attack-${attackIndex}` as const
          ] ?? null,
        ) ?? readElementSnapshot(side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck");
      if (!destination) return;

      setOutgoingPreviewTargets({
        [PLAYER]: side === PLAYER ? [
          {
            id: `fixture-target-attack-replacement-${animationRunId}-${generation}-${side}-${slotIndex}`,
            side,
            slotIndex,
            entity,
            impactDestination: impactSnapshot,
            destination,
            delayMs: 0,
            windupMs: FIXTURE_TARGET_ATTACK_WINDUP_MS,
            attackMs: FIXTURE_TARGET_ATTACK_TRAVEL_MS,
            pauseMs: FIXTURE_TARGET_ATTACK_PAUSE_MS,
            exitMs: FIXTURE_TARGET_ATTACK_EXIT_MS,
          },
        ] : [],
        [ENEMY]: side === ENEMY ? [
          {
            id: `fixture-target-attack-replacement-${animationRunId}-${generation}-${side}-${slotIndex}`,
            side,
            slotIndex,
            entity,
            impactDestination: impactSnapshot,
            destination,
            delayMs: 0,
            windupMs: FIXTURE_TARGET_ATTACK_WINDUP_MS,
            attackMs: FIXTURE_TARGET_ATTACK_TRAVEL_MS,
            pauseMs: FIXTURE_TARGET_ATTACK_PAUSE_MS,
            exitMs: FIXTURE_TARGET_ATTACK_EXIT_MS,
          },
        ] : [],
      });

      const replacementOrigin =
        buildAnimationAnchorSnapshot(
          replacementTargetEntryAnchorToolByPreset[
            `replacement-target-entry-${attackIndex}` as const
          ] ?? null,
        ) ?? readElementSnapshot(side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck");
      if (!replacementOrigin) return;

      const attackTotalMs =
        FIXTURE_TARGET_ATTACK_WINDUP_MS +
        FIXTURE_TARGET_ATTACK_TRAVEL_MS +
        FIXTURE_TARGET_ATTACK_PAUSE_MS +
        FIXTURE_TARGET_ATTACK_EXIT_MS;
      const incomingTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setIncomingPreviewTargets((current) => ({
          ...current,
          [side]: [
            ...current[side],
            {
              id: `fixture-target-replacement-combo-${animationRunId}-${generation}-${side}-${slotIndex}`,
              side,
              slotIndex,
              entryIndex: attackIndex,
              entity,
              origin: replacementOrigin,
              delayMs: 0,
              durationMs: FIXTURE_TARGET_ENTER_DURATION_MS,
            },
          ],
        }));
      }, attackTotalMs);
      animationTimersRef.current.push(incomingTimer);

      const totalMs =
        attackTotalMs +
        FIXTURE_TARGET_ENTER_DURATION_MS +
        FIXTURE_REPLACEMENT_TARGET_ENTER_SETTLE_MS;
      if (animationMode === "target-attack-replacement-combo-loop") {
        const restartTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          startTargetAttackReplacementComboLoop();
        }, totalMs + FIXTURE_TARGET_LOOP_GAP_MS);
        animationTimersRef.current.push(restartTimer);
      } else {
        const cleanupTimer = window.setTimeout(() => {
          if (loopGenerationRef.current !== generation) return;
          resetPreviewAnimation();
        }, totalMs + 40);
        animationTimersRef.current.push(cleanupTimer);
      }
    };

    if (isOpeningTargetEntryAnimation) {
      startOpeningLoop();
    } else if (isPillDamageAnimation) {
      startPillDamageLoop();
    } else if (isPillTurnAnimation) {
      startPillTurnLoop();
    } else if (isBoardMessageAnimation) {
      startBoardMessageLoop();
    } else if (isReplacementTargetEntryAnimation) {
      startReplacementTargetEntryLoop();
    } else if (isPostPlayHandDrawAnimation) {
      startPostPlayHandDrawLoop();
    } else if (isHandPlayTargetAnimation) {
      startHandPlayTargetLoop();
    } else if (isMulliganReturnAnimation) {
      startMulliganReturnLoop();
    } else if (isMulliganDrawAnimation) {
      startMulliganDrawLoop();
    } else if (isTargetAttackAnimation) {
      startTargetAttackLoop();
    } else if (isHandPlayDrawComboAnimation) {
      startHandPlayDrawComboLoop();
    } else if (isTargetAttackReplacementComboAnimation) {
      startTargetAttackReplacementComboLoop();
    } else if (isMulliganCompleteComboAnimation) {
      startMulliganCompleteComboLoop();
    }

    return () => {
      clearAnimationTimers();
    };
  }, [animationMode, animationPreset, animationRunId, animationSet, clearAnimationTimers, defaultPlayerStableCards, fixture.scene.board.currentMessage, fixture.scene.board.enemyFieldSlots, fixture.scene.board.enemyPortrait?.active, fixture.scene.board.enemyPortrait?.flashDamage, fixture.scene.board.playerFieldSlots, fixture.scene.board.playerPortrait?.active, fixture.scene.board.playerPortrait?.flashDamage, getAnimationAnchorPoint, readElementSnapshot, resetPreviewAnimation, updateHiddenStableTarget]);

  useEffect(
    () => () => {
      clearAnimationTimers();
      loopGenerationRef.current += 1;
    },
    [clearAnimationTimers],
  );

  const createSlotRef = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number) => (node: HTMLDivElement | null) => {
      slotNodesRef.current[side][slotIndex] = node;
    },
    [],
  );

  const rawEnemyFieldSlots = useMemo(
    () =>
      fixture.scene.board.enemyFieldSlots.map((slot, slotIndex) => {
        const incomingTarget =
          incomingPreviewTargets[ENEMY].find((target) => target.slotIndex === slotIndex) ?? null;
        const outgoingTarget =
          outgoingPreviewTargets[ENEMY].find((target) => target.slotIndex === slotIndex) ?? null;
        const displayStable = !(hiddenStableTargets[ENEMY]?.[slotIndex] ?? false);
        return {
          ...slot,
          slotRef: createSlotRef(ENEMY, slotIndex),
          displayedTarget:
            outgoingTarget?.entity ??
            incomingTarget?.entity ??
            (displayStable ? slot.displayedTarget : null),
          incomingTarget,
          outgoingTarget,
          pendingCard:
            previewPendingTargetPlacements[ENEMY]?.[slotIndex] ?? slot.pendingCard,
          slotRect: slotNodesRef.current[ENEMY][slotIndex]?.getBoundingClientRect() ?? null,
          onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
          onOutgoingTargetComplete: handleOutgoingPreviewTargetComplete,
        };
      }),
    [createSlotRef, fixture.scene.board.enemyFieldSlots, handleIncomingPreviewTargetComplete, handleOutgoingPreviewTargetComplete, hiddenStableTargets, incomingPreviewTargets, outgoingPreviewTargets, previewPendingTargetPlacements],
  );

  const rawPlayerFieldSlots = useMemo(
    () =>
      fixture.scene.board.playerFieldSlots.map((slot, slotIndex) => {
        const incomingTarget =
          incomingPreviewTargets[PLAYER].find((target) => target.slotIndex === slotIndex) ?? null;
        const outgoingTarget =
          outgoingPreviewTargets[PLAYER].find((target) => target.slotIndex === slotIndex) ?? null;
        const displayStable = !(hiddenStableTargets[PLAYER]?.[slotIndex] ?? false);
        return {
          ...slot,
          slotRef: createSlotRef(PLAYER, slotIndex),
          displayedTarget:
            outgoingTarget?.entity ??
            incomingTarget?.entity ??
            (displayStable ? slot.displayedTarget : null),
          incomingTarget,
          outgoingTarget,
          pendingCard:
            previewPendingTargetPlacements[PLAYER]?.[slotIndex] ?? slot.pendingCard,
          slotRect: slotNodesRef.current[PLAYER][slotIndex]?.getBoundingClientRect() ?? null,
          onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
          onOutgoingTargetComplete: handleOutgoingPreviewTargetComplete,
        };
      }),
    [createSlotRef, fixture.scene.board.playerFieldSlots, handleIncomingPreviewTargetComplete, handleOutgoingPreviewTargetComplete, hiddenStableTargets, incomingPreviewTargets, outgoingPreviewTargets, previewPendingTargetPlacements],
  );
  const previewTargetField = useMemo(
    () =>
      buildBattleTargetFieldStateFromSceneSlots({
        enemyFieldSlots: rawEnemyFieldSlots,
        playerFieldSlots: rawPlayerFieldSlots,
      }),
    [rawEnemyFieldSlots, rawPlayerFieldSlots],
  );
  const enemyFieldSlots = useMemo(
    () =>
      buildBattleFieldLaneSlotsFromTargetField({
        fieldSlots: previewTargetField.enemySlots,
        bindSlotRef: (slotIndex) => createSlotRef(ENEMY, slotIndex),
        getSlotRect: (slotIndex) =>
          slotNodesRef.current[ENEMY][slotIndex]?.getBoundingClientRect() ?? null,
        getSelectedCard: (slotIndex) =>
          rawEnemyFieldSlots[slotIndex]?.selectedCard ?? null,
        getPendingCard: (slotIndex) =>
          previewPendingTargetPlacements[ENEMY]?.[slotIndex] ?? null,
        getPendingCardMotion: (slotIndex) => {
          const outgoingCard = outgoingPreviewHands[ENEMY].find(
            (card) =>
              card.destinationMode === "zone-center" &&
              card.targetSlotIndex === slotIndex,
          );
          return outgoingCard
            ? { delayMs: outgoingCard.pendingCardRevealDelayMs ?? outgoingCard.durationMs }
            : null;
        },
        getCanClick: () => false,
        onClick: () => {},
        onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
        onOutgoingTargetComplete: handleOutgoingPreviewTargetComplete,
        getPlayerHand: (slotIndex) =>
          rawEnemyFieldSlots[slotIndex]?.playerHand ?? [],
      }),
    [
      createSlotRef,
      handleIncomingPreviewTargetComplete,
      handleOutgoingPreviewTargetComplete,
      outgoingPreviewHands,
      previewPendingTargetPlacements,
      previewTargetField.enemySlots,
      rawEnemyFieldSlots,
    ],
  );
  const playerFieldSlots = useMemo(
    () =>
      buildBattleFieldLaneSlotsFromTargetField({
        fieldSlots: previewTargetField.playerSlots,
        bindSlotRef: (slotIndex) => createSlotRef(PLAYER, slotIndex),
        getSlotRect: (slotIndex) =>
          slotNodesRef.current[PLAYER][slotIndex]?.getBoundingClientRect() ?? null,
        getSelectedCard: (slotIndex) =>
          rawPlayerFieldSlots[slotIndex]?.selectedCard ?? null,
        getPendingCard: (slotIndex) =>
          previewPendingTargetPlacements[PLAYER]?.[slotIndex] ?? null,
        getPendingCardMotion: (slotIndex) => {
          const outgoingCard = outgoingPreviewHands[PLAYER].find(
            (card) =>
              card.destinationMode === "zone-center" &&
              card.targetSlotIndex === slotIndex,
          );
          return outgoingCard
            ? { delayMs: outgoingCard.pendingCardRevealDelayMs ?? outgoingCard.durationMs }
            : null;
        },
        getCanClick: () => false,
        onClick: () => {},
        onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
        onOutgoingTargetComplete: handleOutgoingPreviewTargetComplete,
        getPlayerHand: (slotIndex) =>
          rawPlayerFieldSlots[slotIndex]?.playerHand ?? [],
      }),
    [
      createSlotRef,
      handleIncomingPreviewTargetComplete,
      handleOutgoingPreviewTargetComplete,
      outgoingPreviewHands,
      previewPendingTargetPlacements,
      previewTargetField.playerSlots,
      rawPlayerFieldSlots,
    ],
  );
  const snapTargets = (
    Object.entries(layout.elements) as Array<[BattleEditableElementKey, (typeof layout.elements)[BattleEditableElementKey]]>
  ).map(([key, config]) => {
    const rect = getBattleElementSceneRect(key, layout);
    return {
    key,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    };
  });
  const selectedSceneElements = useMemo(
    () =>
      selectedElements.filter(
        (element): element is BattleEditableElementKey => element !== "overview",
      ),
    [selectedElements],
  );
  const hostSelectedSceneElements = useMemo(
    () =>
      isHandPlayTargetEditorSet
        ? selectedSceneElements.filter((element) => element !== "bottomHand")
        : selectedSceneElements,
    [isHandPlayTargetEditorSet, selectedSceneElements],
  );
  const sceneModel = useMemo<BattleSceneModel>(
    () => ({
      ...fixture.scene,
      board: {
        ...fixture.scene.board,
        enemyFieldSlots,
        playerFieldSlots,
        enemyFieldObjects: previewTargetField.enemySlots,
        playerFieldObjects: previewTargetField.playerSlots,
        currentMessage: previewBoardMessage,
        enemyPortrait: {
          ...fixture.scene.board.enemyPortrait,
          active: previewPillActive[ENEMY],
          flashDamage: previewPillFlashDamage[ENEMY],
        },
        playerPortrait: {
          ...fixture.scene.board.playerPortrait,
          active: previewPillActive[PLAYER],
          flashDamage: previewPillFlashDamage[PLAYER],
        },
      },
      hands: {
        top: {
          ...fixture.scene.hands.top,
          stableCards: fixture.enemyHand,
        },
        bottom: {
          ...fixture.scene.hands.bottom,
          stableCards: previewPlayerStableCards,
          incomingCards: incomingPreviewHands[PLAYER],
          outgoingCards: outgoingPreviewHands[PLAYER],
          reservedSlots: previewReservedSlots,
          canInteract: true,
          showTurnHighlights: true,
          showPlayableHints: fixture.showPlayableHints ?? true,
          selectedIndexes: previewSelectedIndexes,
          targets: playerFieldSlots.map((slot) => slot.displayedTarget!.target),
          freshCardIds: previewFreshCardIds,
          onIncomingCardComplete: handleIncomingPreviewHandComplete,
          onOutgoingCardComplete: (outgoingCard) => {
            setOutgoingPreviewHands((current) => ({
              ...current,
              [PLAYER]: current[PLAYER].filter((item) => item.id !== outgoingCard.id),
            }));
          },
          onCardClick:
            animationSet === "hand-play-target" || animationSet === "hand-play-draw-combo"
              ? (index) => {
                  setPreviewSelectedIndexes([index]);
                }
              : undefined,
        },
      },
    }),
    [
      animationSet,
      enemyFieldSlots,
      fixture.enemyHand,
      fixture.scene,
      fixture.showPlayableHints,
      handleIncomingPreviewHandComplete,
      incomingPreviewHands,
      playerFieldSlots,
      previewFreshCardIds,
      previewBoardMessage,
      previewPlayerStableCards,
      previewPillActive,
      previewPillFlashDamage,
      previewReservedSlots,
      previewSelectedIndexes,
      previewTargetField,
      setOutgoingPreviewHands,
      setPreviewSelectedIndexes,
      outgoingPreviewHands,
    ],
  );

  return (
    <BattleSceneView
      className="h-full w-full"
      style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
      viewportWidth={viewportWidth}
      viewportHeight={viewportHeight}
      travelLayer={null}
      targetLayer={null}
      exitControls={
        <div className="absolute bottom-4 left-5 z-30 flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 rounded-lg border border-white/5 px-3 text-amber-100/60">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg border border-white/5 p-0 text-amber-100/60">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {editorMode && showGrid ? (
        <div
          className="pointer-events-none absolute inset-0 z-[4]"
          style={{
            backgroundImage: [
              `linear-gradient(to right, ${minorGridColor} 1px, transparent 1px)`,
              `linear-gradient(to bottom, ${minorGridColor} 1px, transparent 1px)`,
              `linear-gradient(to right, ${majorGridColor} 1px, transparent 1px)`,
              `linear-gradient(to bottom, ${majorGridColor} 1px, transparent 1px)`,
            ].join(", "),
            backgroundSize: [
              `${gridSize}px ${gridSize}px`,
              `${gridSize}px ${gridSize}px`,
              `${majorGridSize}px ${majorGridSize}px`,
              `${majorGridSize}px ${majorGridSize}px`,
            ].join(", "),
            boxShadow: "inset 0 0 0 1px rgba(251,191,36,0.08)",
          }}
        />
      ) : null}
      {editorMode
        ? visibleAnimationAnchors.map(({ label, anchor, point }) => {
            const isInteractive =
              !(animationSet === "opening-target-entry-first-round" &&
                animationPreset === "opening-target-entry-simultaneous") &&
              animationAnchorTool === anchor;
            const isActive = animationAnchorTool === anchor;
            return (
              <button
                key={`${anchor}-${label}`}
                type="button"
                aria-label={`Ancora de animacao ${label}`}
                onMouseDown={isInteractive ? beginAnimationAnchorDrag(anchor) : undefined}
                className={cn(
                  "absolute z-[65] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-sky-500/20 shadow-[0_0_26px_rgba(56,189,248,0.35)] transition-opacity",
                  isInteractive
                    ? "cursor-grab opacity-100"
                    : "pointer-events-none opacity-80",
                  isActive ? "scale-110 border-amber-200 bg-amber-400/25 shadow-[0_0_34px_rgba(251,191,36,0.45)]" : "",
                )}
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                }}
              >
                <span className="pointer-events-none absolute -top-6 left-1/2 min-w-max -translate-x-1/2 whitespace-nowrap rounded-md bg-sky-950/90 px-1.5 py-0.5 text-[10px] font-black leading-none text-sky-100">
                  {label}
                </span>
                <span className="pointer-events-none absolute inset-[5px] rounded-full border border-sky-200/80" />
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100" />
              </button>
            );
          })
        : null}
      {editorMode &&
      animationAnchorTool &&
      activeAnimationAnchorReferencePoint &&
      activeAnimationAnchorPoint ? (
        <div className="pointer-events-none absolute inset-0 z-[64]">
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            <line
              x1={activeAnimationAnchorReferencePoint.x}
              y1={activeAnimationAnchorReferencePoint.y}
              x2={activeAnimationAnchorPoint.x}
              y2={activeAnimationAnchorPoint.y}
              stroke="rgba(251,191,36,0.92)"
              strokeWidth={2}
              strokeDasharray="8 6"
            />
          </svg>
          <div
            className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-200 bg-amber-500/20 shadow-[0_0_28px_rgba(251,191,36,0.35)]"
            style={{
              left: `${activeAnimationAnchorReferencePoint.x}px`,
              top: `${activeAnimationAnchorReferencePoint.y}px`,
            }}
          >
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-md bg-amber-950/90 px-1.5 py-0.5 text-[10px] font-black leading-none text-amber-100">
              {activeAnimationAnchorReferenceLabel}
            </span>
            <span className="pointer-events-none absolute inset-[5px] rounded-full border border-amber-100/80" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100" />
          </div>
        </div>
      ) : null}
      {editorMode && animationDebugEnabled ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[90] max-w-[360px] rounded-lg border border-cyan-300/20 bg-black/75 px-3 py-2 font-mono text-[10px] leading-tight text-cyan-100 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          {debugLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
      <main className="relative z-10 flex h-full min-h-0 flex-col">
        <BattleSceneHost
          model={sceneModel}
          compact={isCompactShellPreview}
          tight={isCompactTightPreview}
          layout={layout}
          bindZoneRef={bindZoneRef}
          shellOverlay={
            focusArea === "shell" && !isPureOverview ? (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]">
                <div className="absolute inset-0 rounded-[2rem] border-2 border-dashed border-amber-300/85" />
                <div
                  className="absolute bottom-0 top-0 border-l-2 border-dashed border-amber-200/70"
                  style={{ left: `${shellSlots.leftSidebar.width}px` }}
                />
                <div
                  className="absolute bottom-0 top-0 border-l-2 border-dashed border-amber-200/70"
                  style={{ right: `${shellSlots.rightSidebar.width}px` }}
                />
                <div
                  className="absolute left-[calc(var(--left-guide,0px)+12px)] right-[calc(var(--right-guide,0px)+12px)] border-t-2 border-dashed border-amber-200/70"
                  style={{
                    top: `${shellSlots.board.y}px`,
                    ["--left-guide" as string]: `${shellSlots.leftSidebar.width}px`,
                    ["--right-guide" as string]: `${shellSlots.rightSidebar.width}px`,
                  }}
                />
                <div
                  className="absolute left-[calc(var(--left-guide,0px)+12px)] right-[calc(var(--right-guide,0px)+12px)] border-t-2 border-dashed border-amber-200/70"
                  style={{
                    bottom: `${BATTLE_STAGE_HEIGHT - shellSlots.centerBottom.y}px`,
                    ["--left-guide" as string]: `${shellSlots.leftSidebar.width}px`,
                    ["--right-guide" as string]: `${shellSlots.rightSidebar.width}px`,
                  }}
                />
              </div>
            ) : null
          }
          compactTopShellClassName={compactTopShellClassName}
          compactControlShellClassName={compactControlShellClassName}
          compactFooterFrameClassName={compactFooterFrameClassName}
          leftSidebarClassNameByElement={{
            enemyTargetDeck: getPreviewAreaClass(focusArea, ["enemyTargetDeck"]),
            enemyDeck: getPreviewAreaClass(focusArea, ["enemyDeck"]),
            chronicles: getPreviewAreaClass(focusArea, ["chronicles"]),
          }}
          rightSidebarClassNameByElement={{
            status: getPreviewAreaClass(focusArea, ["status"]),
            action: getPreviewAreaClass(focusArea, ["action"]),
            playerTargetDeck: getPreviewAreaClass(focusArea, ["playerTargetDeck"]),
            playerDeck: getPreviewAreaClass(focusArea, ["playerDeck"]),
          }}
          chroniclesVisualState={chroniclesVisualState}
          actionVisualState={actionVisualState}
          statusVisualState={statusVisualState}
          actionButtonClassName={cn(
            "border-4 border-[#c89b35]/90 bg-[#4a1d24] text-amber-50 shadow-[0_12px_26px_rgba(0,0,0,0.28)]",
            getPreviewAreaClass(focusArea, ["action"]),
          )}
          elementConfig={{
            viewportWidth,
            viewportHeight,
            gridSize,
            snapThreshold,
            previewAnimations: editorMode,
            editorMode,
            selectedElements: hostSelectedSceneElements,
            previewSelectableByElement: {
              shell: false,
              enemyField: false,
              playerField: false,
              bottomHand: !isHandPlayTargetEditorSet,
            },
            selectionReadOnlyByElement: {
              enemyField: true,
              playerField: true,
            },
            motionReplayNonceByElement: {
              topHand: getMotionReplayNonce("topHand"),
              enemyTargetDeck: getMotionReplayNonce("enemyTargetDeck"),
              enemyDeck: getMotionReplayNonce("enemyDeck"),
              chronicles: getMotionReplayNonce("chronicles"),
              board: getMotionReplayNonce("board"),
              bottomHand: getMotionReplayNonce("bottomHand"),
              playerTargetDeck: getMotionReplayNonce("playerTargetDeck"),
              playerDeck: getMotionReplayNonce("playerDeck"),
              status: getMotionReplayNonce("status"),
              action: getMotionReplayNonce("action"),
              shell: getMotionReplayNonce("shell"),
              enemyField: getMotionReplayNonce("enemyField"),
              playerField: getMotionReplayNonce("playerField"),
              boardMessage: getMotionReplayNonce("boardMessage"),
              enemyPill: getMotionReplayNonce("enemyPill"),
              playerPill: getMotionReplayNonce("playerPill"),
            },
            classNameByElement: {
              shell: cn(
                "relative transition-all duration-200",
                focusArea === "shell" && !isPureOverview
                  ? "rounded-[2rem] ring-4 ring-amber-200/20 ring-offset-4 ring-offset-[#0d2418]"
                  : "",
              ),
              topHand: cn(
                "transition-all duration-200",
                getPreviewAreaClass(focusArea, ["topHand"]),
              ),
              board: getPreviewAreaClass(focusArea, ["board"]),
              bottomHand: cn(
                "transition-all duration-200",
                getPreviewAreaClass(focusArea, ["bottomHand"]),
              ),
              enemyField: cn(
                "absolute left-0 top-0 z-10",
                getPreviewAreaClass(focusArea, ["enemyField"]),
              ),
              playerField: cn(
                "absolute left-0 top-0 z-10",
                getPreviewAreaClass(focusArea, ["playerField"]),
              ),
              boardMessage: "pointer-events-none absolute left-0 top-0 z-20",
              enemyPill: getPreviewAreaClass(focusArea, ["enemyPill"]),
              playerPill: getPreviewAreaClass(focusArea, ["playerPill"]),
            },
            snapTargets,
          }}
        />
        {editorMode
          ? battleTargetFieldSlotElementKeys.map((slotKey) => (
              <BattleEditableElement
                key={slotKey}
                element={slotKey}
                motionReplayNonce={getMotionReplayNonce(slotKey)}
                layout={layout}
                viewportWidth={viewportWidth}
                viewportHeight={viewportHeight}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations
                editorMode
                selected={selectedElements.includes(slotKey)}
                snapTargets={snapTargets}
                className={cn(
                  "absolute left-0 top-0 z-[56]",
                  getPreviewAreaClass(focusArea, [slotKey]),
                )}
              >
                <div className="h-full w-full rounded-[1.4rem] border border-dashed border-amber-300/45 bg-amber-200/5 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]" />
              </BattleEditableElement>
            ))
          : null}
      </main>
    </BattleSceneView>
  );
};

