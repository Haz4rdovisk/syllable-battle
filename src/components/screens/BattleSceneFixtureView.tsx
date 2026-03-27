import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { LogOut, RotateCcw } from "lucide-react";
import { Syllable } from "../../types/game";
import { BattleSceneView } from "./BattleSceneView";
import { BattleBoardShell } from "./BattleBoardShell";
import { BattleBoardSurface, getBattleBoardSurfaceVars } from "./BattleBoardSurface";
import { BattlePillOverlay } from "./BattlePillOverlay";
import { BattleFieldLane } from "./BattleFieldLane";
import { BattleFieldIncomingTarget } from "./BattleFieldLane";
import {
  BattleHandLane,
  BattleHandLaneCard,
  BattleHandLaneIncomingCard,
  BattleHandLaneOutgoingCard,
} from "./BattleHandLane";
import { BattlePileRail, BattleSinglePile } from "./BattleSidePanel";
import { BattleLeftSidebarView, BattleRightSidebarView } from "./BattleSidebarViews";
import { BattleStatusPanel } from "./BattleStatusPanel";
import { BattleActionButton } from "./BattleActionButton";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleEditableElement } from "./BattleEditableElement";
import { PlayerPortrait, VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";
import {
  BattleSceneFixtureData,
  BattleSceneFixtureHandCard,
  midTurnBattleFixture,
} from "./BattleSceneFixtures";
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
  getBattleDesktopShellSlots,
  getBattleElementSceneRect,
  getBattleStageMetrics,
} from "./BattleSceneSpace";
import { AnimatePresence, motion } from "motion/react";

const noopRef = () => {};
const PLAYER = 0;
const ENEMY = 1;
const FIXTURE_TARGET_ENTER_STAGGER_MS = 220;
const FIXTURE_TARGET_ENTER_SETTLE_MS = 560;
const FIXTURE_TARGET_LOOP_GAP_MS = 680;
const FIXTURE_TARGET_ENTER_DURATION_MS = 780;
const FIXTURE_REPLACEMENT_TARGET_ENTER_SETTLE_MS = 240;
const FIXTURE_POST_PLAY_DRAW_DURATION_MS = 940;
const FIXTURE_POST_PLAY_DRAW_SETTLE_MS = 220;
const FIXTURE_POST_PLAY_DRAW_LOOP_GAP_MS = 680;
const FIXTURE_TARGET_ATTACK_WINDUP_MS = 310;
const FIXTURE_TARGET_ATTACK_TRAVEL_MS = 1140;
const FIXTURE_TARGET_ATTACK_PAUSE_MS = 260;
const FIXTURE_TARGET_ATTACK_EXIT_MS = 960;
const FIXTURE_TARGET_ATTACK_LOOP_GAP_MS = 680;
const FIXTURE_MULLIGAN_RETURN_DURATION_MS = 760;
const FIXTURE_MULLIGAN_RETURN_STAGGER_MS = 110;
const FIXTURE_MULLIGAN_RETURN_SETTLE_MS = 260;
const FIXTURE_MULLIGAN_RETURN_LOOP_GAP_MS = 680;
const FIXTURE_MULLIGAN_DRAW_START_DELAY_MS = 220;
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
  | "playerField"
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
  animationAnchorTool?: BattleLayoutPreviewAnimationAnchorKey | null;
  animationAnchors?: BattleLayoutPreviewAnimationAnchors;
  animationDebugEnabled?: boolean;
}> = ({
  fixture = midTurnBattleFixture,
  layout = battleActiveLayoutConfig,
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
  const isPureOverview = focusArea === "overview";
  const isHandPlayTargetEditorSet =
    animationSet === "hand-play-target" ||
    animationSet === "hand-play-draw-combo";
  const shellSlots = getBattleDesktopShellSlots(layout);
  const boardVars = getBattleBoardSurfaceVars(layout);
  const stageMetrics = getBattleStageMetrics(viewportWidth, viewportHeight);
  const isCompactPreview = viewportHeight <= 428 || viewportWidth <= 915;
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
  const slotNodesRef = useRef<Record<typeof PLAYER | typeof ENEMY, Array<HTMLDivElement | null>>>({
    [PLAYER]: [],
    [ENEMY]: [],
  });
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

  const clearAnimationTimers = useCallback(() => {
    animationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimersRef.current = [];
  }, []);

  const resetPreviewAnimation = useCallback(() => {
    clearAnimationTimers();
    loopGenerationRef.current += 1;
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
  }, [clearAnimationTimers, defaultPlayerStableCards]);

  useEffect(() => {
    setPreviewPlayerStableCards(defaultPlayerStableCards);
    setPreviewFreshCardIds([]);
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
  }, [defaultPlayerStableCards, fixture.selectedIndexes]);

  const readElementSnapshot = useCallback((elementKey: BattleEditableElementKey) => {
    if (typeof document === "undefined") return null;
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
  }, []);

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
      return point && anchor ? [{ label: "O", anchor, point }] : [];
    }

    if (animationSet === "post-play-hand-draw") {
      const point = getAnimationAnchorPoint("post-play-hand-draw-origin");
      return point
        ? [
            {
              label: "O",
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
      return point && anchor ? [{ label: "D", anchor, point }] : [];
    }

    if (animationSet === "mulligan-hand-draw") {
      const anchor = mulliganDrawOriginAnchorToolByPreset[animationPreset] ?? null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor ? [{ label: "O", anchor, point }] : [];
    }

    if (animationSet === "mulligan-hand-return") {
      const anchor =
        mulliganReturnDestinationAnchorToolByPreset[animationPreset] ?? null;
      const point = getAnimationAnchorPoint(anchor);
      return point && anchor ? [{ label: "D", anchor, point }] : [];
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
          ? [{ label: "O", anchor: drawAnchor, point: drawPoint }]
          : []),
        ...(returnPoint && returnAnchor
          ? [{ label: "D", anchor: returnAnchor, point: returnPoint }]
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
          ? [{ label: "O", anchor: replacementAnchor, point: replacementPoint }]
          : []),
        ...(impactPoint && impactAnchor
          ? [{ label: "I", anchor: impactAnchor, point: impactPoint }]
          : []),
        ...(destinationPoint && destinationAnchor
          ? [{ label: "D", anchor: destinationAnchor, point: destinationPoint }]
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
              label: "I",
              anchor: impactAnchor,
              point: getAnimationAnchorPoint(impactAnchor),
            }
          : null,
        destinationAnchor
          ? {
              label: "D",
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
            label: "0",
            anchor: "opening-target-entry-0-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: "1",
            anchor: "opening-target-entry-1-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: "2",
            anchor: "opening-target-entry-2-origin" as BattleLayoutPreviewAnimationAnchorKey,
          },
          {
            label: "3",
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
        label:
          animationPreset === "opening-target-entry-0"
            ? "0"
            : animationPreset === "opening-target-entry-1"
              ? "1"
              : animationPreset === "opening-target-entry-2"
                ? "2"
                : "3",
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

  const debugLines = useMemo(() => {
    const formatPoint = (
      point: { x: number; y: number } | null | undefined,
    ) => (point ? `${point.x},${point.y}` : "-");
    const formatSnapshot = (snapshot: ZoneAnchorSnapshot | null | undefined) =>
      snapshot
        ? `${Math.round(snapshot.left)},${Math.round(snapshot.top)} ${Math.round(snapshot.width)}x${Math.round(snapshot.height)}`
        : "-";
    const formatHandCard = (card: BattleHandLaneCard) =>
      `${card.syllable}#${card.id}${card.skipEntryAnimation ? "*" : ""}`;
    const formatIncomingHand = (card: BattleHandLaneIncomingCard) =>
      `${card.card.syllable}#${card.card.id}@${card.finalIndex}/${card.finalTotal} from ${formatSnapshot(card.origin)}`;
    const formatOutgoingHand = (card: BattleHandLaneOutgoingCard) =>
      `${card.card.syllable}#${card.card.id}@${card.initialIndex}/${card.initialTotal} -> ${formatSnapshot(card.destination)}`;
    const formatTarget = (entity: VisualTargetEntity | null | undefined) =>
      entity
        ? `${entity.target.name}#${entity.id}@${entity.side[0]}${entity.slotIndex}`
        : "-";
    const formatIncomingTarget = (target: FixtureIncomingTarget) =>
      `${formatTarget(target.entity)} from ${formatSnapshot(target.origin)} d:${target.delayMs ?? 0} t:${target.durationMs ?? 0}`;
    const formatOutgoingTarget = (target: FixtureOutgoingTarget) =>
      `${formatTarget(target.entity)} impact:${formatSnapshot(target.impactDestination ?? null)} -> ${formatSnapshot(target.destination)} w:${target.windupMs ?? 0} a:${target.attackMs ?? 0} p:${target.pauseMs ?? 0} e:${target.exitMs ?? 0}`;
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
      `run:${animationRunId} loopGen:${loopGenerationRef.current} timers:${animationTimersRef.current.length}`,
      `anchorTool:${animationAnchorTool ?? "-"} selected:[${previewSelectedIndexes.join(",")}]`,
      `anchors:[${visibleAnimationAnchors.map(({ label, anchor, point }) => `${label}:${anchor}@${formatPoint(point)}`).join(" | ")}]`,
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
        `drawOrigin:${formatPoint(getAnimationAnchorPoint("post-play-hand-draw-origin"))}`,
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
        `playDestination:${formatPoint(
          getAnimationAnchorPoint(destinationAnchor),
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
        `replacementOrigin:${formatPoint(
          getAnimationAnchorPoint(
            replacementAnchorKey,
          ),
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
        `mulliganReturnAnchor:${formatPoint(
          getAnimationAnchorPoint(
            mulliganReturnAnchor,
          ),
        )}`,
      );
      lines.push(
        `mulliganDrawAnchor:${formatPoint(
          getAnimationAnchorPoint(
            mulliganDrawAnchor,
          ),
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
          `impactAnchor:${formatPoint(getAnimationAnchorPoint(impactAnchor))}`,
        );
        lines.push(
          `attackDestination:${formatPoint(
            getAnimationAnchorPoint(destinationAnchor),
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
          .map((anchor) => `${anchor}:${formatPoint(getAnimationAnchorPoint(anchor as BattleLayoutPreviewAnimationAnchorKey))}`)
          .join(" | ")}]`,
      );
      lines.push(
        `destAnchors:[${[
          "target-attack-0-destination",
          "target-attack-1-destination",
          "target-attack-2-destination",
          "target-attack-3-destination",
        ]
          .map((anchor) => `${anchor}:${formatPoint(getAnimationAnchorPoint(anchor as BattleLayoutPreviewAnimationAnchorKey))}`)
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
    previewPendingTargetPlacements,
    previewFreshCardIds,
    previewPlayerStableCards,
    previewPostPlayDebug,
    previewSelectedIndexes,
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
        const anchorPoint = getAnimationAnchorPoint(anchorTool);
        const origin = anchorPoint
          ? {
              left: anchorPoint.x,
              top: anchorPoint.y,
              width: 0,
              height: 0,
            }
          : readElementSnapshot(
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
      const anchorPoint = getAnimationAnchorPoint(anchorTool);
      const origin = anchorPoint
        ? {
            left: anchorPoint.x,
            top: anchorPoint.y,
            width: 0,
            height: 0,
          }
        : readElementSnapshot(
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
      destination: ZoneAnchorSnapshot;
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
      const destination =
        destinationAnchor && getAnimationAnchorPoint(destinationAnchor)
          ? {
              left: getAnimationAnchorPoint(destinationAnchor)!.x,
              top: getAnimationAnchorPoint(destinationAnchor)!.y,
              width: 0,
              height: 0,
            }
          : (() => {
              const slotRect =
                slotNodesRef.current[PLAYER][targetIndex]?.getBoundingClientRect() ??
                null;
              return slotRect
                ? {
                    left: slotRect.left,
                    top: slotRect.top,
                    width: slotRect.width,
                    height: slotRect.height,
                  }
                : null;
            })();
      if (!destination) return null;
      return {
        removedIndex,
        playedCard,
        destination,
      };
    };

    const getPostPlayPreviewDrawData = (removedIndex: number) => {
      const drawSourceIndex =
        removedIndex === defaultPlayerStableCards.length - 1
          ? 0
          : defaultPlayerStableCards.length - 1;
      const drawnCard = defaultPlayerStableCards[drawSourceIndex] ?? null;
      const removedCard = defaultPlayerStableCards[removedIndex] ?? null;
      const origin =
        getAnimationAnchorPoint("post-play-hand-draw-origin")
          ? {
              left: getAnimationAnchorPoint("post-play-hand-draw-origin")!.x,
              top: getAnimationAnchorPoint("post-play-hand-draw-origin")!.y,
              width: 0,
              height: 0,
            }
          : readElementSnapshot("playerDeck");
      return {
        drawSourceIndex,
        drawnCard,
        removedCard,
        origin,
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
      const { drawSourceIndex, drawnCard, removedCard, origin } =
        getPostPlayPreviewDrawData(removedIndex);
      setPreviewPlayerStableCards(
        defaultPlayerStableCards.filter((_, index) => index !== removedIndex),
      );

      if (origin && drawnCard) {
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
                origin,
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
      const { removedIndex, playedCard, destination } = previewSetup;
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
            destination,
            initialIndex: removedIndex,
            initialTotal: defaultPlayerStableCards.length,
            delayMs: 0,
            durationMs: 660,
            destinationMode: "zone-center",
            endRotate: 8,
            endScale: 1,
          },
        ],
        [ENEMY]: [],
      });
      const totalMs = 660 + 180;
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
      const { removedIndex, playedCard, destination } = previewSetup;
      const { drawSourceIndex, drawnCard, removedCard, origin } =
        getPostPlayPreviewDrawData(removedIndex);

      setPreviewPlayerStableCards(
        defaultPlayerStableCards.filter((_, index) => index !== removedIndex),
      );
      setPreviewPendingTargetPlacements({
        [PLAYER]: fixture.scene.board.playerFieldSlots.map((_, index) =>
          index === targetIndex ? playedCard.syllable : null,
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
            destination,
            initialIndex: removedIndex,
            initialTotal: defaultPlayerStableCards.length,
            delayMs: 0,
            durationMs: 660,
            destinationMode: "zone-center",
            endRotate: 8,
            endScale: 1,
          },
        ],
        [ENEMY]: [],
      });

      const playTotalMs = 660 + 180;
      const clearPendingTimer = window.setTimeout(() => {
        if (loopGenerationRef.current !== generation) return;
        setPreviewPendingTargetPlacements({
          [PLAYER]: [],
          [ENEMY]: [],
        });
      }, playTotalMs);
      animationTimersRef.current.push(clearPendingTimer);

      if (origin && drawnCard) {
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
                origin,
                finalIndex: 4,
                finalTotal: 5,
                delayMs: 0,
                durationMs: FIXTURE_POST_PLAY_DRAW_DURATION_MS,
              },
            ],
            [ENEMY]: [],
          });
        }, playTotalMs);
        animationTimersRef.current.push(drawTimer);
      }

      const totalMs =
        playTotalMs +
        FIXTURE_POST_PLAY_DRAW_DURATION_MS +
        FIXTURE_POST_PLAY_DRAW_SETTLE_MS;
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

    const buildAnimationAnchorSnapshot = (
      anchorKey: BattleLayoutPreviewAnimationAnchorKey | null | undefined,
    ) => {
      const point = anchorKey ? getAnimationAnchorPoint(anchorKey) : null;
      return point
        ? {
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
          }
        : null;
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
      const impactPoint =
        getAnimationAnchorPoint(
          targetAttackImpactAnchorToolByPreset[animationPreset] ?? null,
        );
      const destinationPoint =
        getAnimationAnchorPoint(
          targetAttackDestinationAnchorToolByPreset[animationPreset] ?? null,
        );
      const destination =
        destinationPoint
          ? {
              left: destinationPoint.x,
              top: destinationPoint.y,
              width: 0,
              height: 0,
            }
          : readElementSnapshot(side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck");
      if (!entity || !destination) {
        return;
      }
      const outgoingTarget: FixtureOutgoingTarget = {
        id: `fixture-target-attack-${animationRunId}-${generation}-${side}-${slotIndex}`,
        side,
        slotIndex,
        entity,
        impactDestination: impactPoint
          ? {
              left: impactPoint.x,
              top: impactPoint.y,
              width: 0,
              height: 0,
            }
          : null,
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

      const impactPoint =
        getAnimationAnchorPoint(
          targetAttackImpactAnchorToolByPreset[
            `target-attack-${attackIndex}` as const
          ] ?? null,
        );
      const destinationPoint =
        getAnimationAnchorPoint(
          targetAttackDestinationAnchorToolByPreset[
            `target-attack-${attackIndex}` as const
          ] ?? null,
        );
      const destination =
        destinationPoint
          ? {
              left: destinationPoint.x,
              top: destinationPoint.y,
              width: 0,
              height: 0,
            }
          : readElementSnapshot(side === PLAYER ? "playerTargetDeck" : "enemyTargetDeck");
      if (!destination) return;

      setOutgoingPreviewTargets({
        [PLAYER]: side === PLAYER ? [
          {
            id: `fixture-target-attack-replacement-${animationRunId}-${generation}-${side}-${slotIndex}`,
            side,
            slotIndex,
            entity,
            impactDestination: impactPoint
              ? {
                  left: impactPoint.x,
                  top: impactPoint.y,
                  width: 0,
                  height: 0,
                }
              : null,
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
            impactDestination: impactPoint
              ? {
                  left: impactPoint.x,
                  top: impactPoint.y,
                  width: 0,
                  height: 0,
                }
              : null,
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
  }, [animationMode, animationPreset, animationRunId, animationSet, clearAnimationTimers, defaultPlayerStableCards, fixture.scene.board.enemyFieldSlots, fixture.scene.board.playerFieldSlots, getAnimationAnchorPoint, readElementSnapshot, resetPreviewAnimation, updateHiddenStableTarget]);

  useEffect(() => () => resetPreviewAnimation(), [resetPreviewAnimation]);

  const createSlotRef = useCallback(
    (side: typeof PLAYER | typeof ENEMY, slotIndex: number) => (node: HTMLDivElement | null) => {
      slotNodesRef.current[side][slotIndex] = node;
    },
    [],
  );

  const enemyFieldSlots = useMemo(
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

  const playerFieldSlots = useMemo(
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
                )}
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                }}
              >
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-md bg-sky-950/90 px-1.5 py-0.5 text-[10px] font-black leading-none text-sky-100">
                  {label}
                </span>
                <span className="pointer-events-none absolute inset-[5px] rounded-full border border-sky-200/80" />
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100" />
              </button>
            );
          })
        : null}
      {editorMode && animationDebugEnabled ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[90] max-w-[360px] rounded-lg border border-cyan-300/20 bg-black/75 px-3 py-2 font-mono text-[10px] leading-tight text-cyan-100 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          {debugLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
      <main className="relative z-10 flex h-full min-h-0 flex-col">
        <BattleEditableElement
          element="shell"
          layout={layout}
          viewportWidth={viewportWidth}
          gridSize={gridSize}
          snapThreshold={snapThreshold}
          previewAnimations={editorMode}
          editorMode={editorMode}
          selected={isSelected("shell")}
          previewSelectable={false}
          snapTargets={snapTargets}
          className={cn(
            "relative transition-all duration-200",
            focusArea === "shell" && !isPureOverview
              ? "rounded-[2rem] ring-4 ring-amber-200/20 ring-offset-4 ring-offset-[#0d2418]"
              : "",
          )}
        >
          {focusArea === "shell" && !isPureOverview ? (
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
          ) : null}

          <BattleBoardShell
            layout={layout}
          leftSidebar={
            <BattleLeftSidebarView
                sidebar={fixture.scene.leftSidebar}
                targetDeckAnchorRef={noopRef}
                deckAnchorRef={noopRef}
                discardAnchorRef={noopRef}
                targetDeckClassName={getPreviewAreaClass(focusArea, ["enemyTargetDeck"])}
                deckClassName={getPreviewAreaClass(focusArea, ["enemyDeck"])}
                chroniclesClassName={getPreviewAreaClass(focusArea, ["chronicles"])}
                layout={layout}
                viewportWidth={viewportWidth}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations={editorMode}
                selectedElements={selectedElements}
                snapTargets={snapTargets}
                chroniclesVisualState={chroniclesVisualState}
              />
            }
          centerTopMobile={
            <div className="rounded-[2rem] border border-white/10 bg-black/35 px-3 py-2 shadow-xl lg:hidden sm:px-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <BattleEditableElement
                    element="topHand"
                    layout={layout}
                    viewportWidth={viewportWidth}
                    gridSize={gridSize}
                    snapThreshold={snapThreshold}
                    viewportHeight={viewportHeight}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selected={isSelected("topHand")}
                    snapTargets={snapTargets}
                    className={cn("transition-all duration-200", getPreviewAreaClass(focusArea, ["topHand"]))}
                  >
                    <BattleHandLane
                      side={1}
                      presentation="remote"
                      stableCards={fixture.enemyHand}
                      scale="mobile"
                    />
                  </BattleEditableElement>
                </div>
                <BattlePileRail layout={layout} className="w-auto max-w-none">
                  <BattleEditableElement
                    element="enemyTargetDeck"
                    layout={layout}
                    viewportWidth={viewportWidth}
                    viewportHeight={viewportHeight}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selected={isSelected("enemyTargetDeck")}
                    snapTargets={snapTargets}
                  >
                    <BattleSinglePile
                      label="ALVOS"
                      count={fixture.scene.leftSidebar.decks.targetDeckCount}
                      color="bg-rose-950"
                      variant="target"
                      fitParent
                      className={cn("min-h-[190px]", getPreviewAreaClass(focusArea, ["enemyTargetDeck"]))}
                    />
                  </BattleEditableElement>
                  <BattleEditableElement
                    element="enemyDeck"
                    layout={layout}
                    viewportWidth={viewportWidth}
                    viewportHeight={viewportHeight}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selected={isSelected("enemyDeck")}
                    snapTargets={snapTargets}
                  >
                    <BattleSinglePile
                      label="DECK"
                      count={fixture.scene.leftSidebar.decks.deckCount}
                      color="bg-amber-950"
                      variant="deck"
                      fitParent
                      className={cn("min-h-[190px]", getPreviewAreaClass(focusArea, ["enemyDeck"]))}
                    />
                  </BattleEditableElement>
                </BattlePileRail>
              </div>
            </div>
          }
            centerTopDesktop={
              <BattleEditableElement
                element="topHand"
                layout={layout}
                viewportWidth={viewportWidth}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations={editorMode}
                editorMode={editorMode}
                selected={isSelected("topHand")}
                snapTargets={snapTargets}
                className={cn("flex items-start justify-center", getPreviewAreaClass(focusArea, ["topHand"]))}
              >
                <div className="flex h-full w-full items-start justify-center">
                  <BattleHandLane
                    side={1}
                    presentation="remote"
                    stableCards={fixture.enemyHand}
                    scale="desktop"
                  />
                </div>
              </BattleEditableElement>
            }
            boardSurface={
              <BattleEditableElement
                element="board"
                layout={layout}
                viewportWidth={viewportWidth}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations={editorMode}
                editorMode={editorMode}
                selected={isSelected("board")}
                snapTargets={snapTargets}
              >
              <BattleBoardSurface
                className={getPreviewAreaClass(focusArea, ["board"])}
                layout={layout}
              />
              </BattleEditableElement>
            }
            centerBottomDesktop={
              <BattleEditableElement
                element="bottomHand"
                layout={layout}
                viewportWidth={viewportWidth}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations={editorMode}
                editorMode={editorMode}
                selected={isSelected("bottomHand") && !isHandPlayTargetEditorSet}
                previewSelectable={!isHandPlayTargetEditorSet}
                snapTargets={snapTargets}
                className={cn("flex items-end justify-center", getPreviewAreaClass(focusArea, ["bottomHand"]))}
              >
                <div className="flex h-full w-full items-end justify-center overflow-visible">
                  <BattleHandLane
                    side={0}
                    presentation="local"
                    stableCards={previewPlayerStableCards}
                    incomingCards={incomingPreviewHands[PLAYER]}
                    outgoingCards={outgoingPreviewHands[PLAYER]}
                    reservedSlots={previewReservedSlots}
                    scale="desktop"
                    onIncomingCardComplete={handleIncomingPreviewHandComplete}
                    onOutgoingCardComplete={(outgoingCard) => {
                      setOutgoingPreviewHands((current) => ({
                        ...current,
                        [PLAYER]: current[PLAYER].filter((item) => item.id !== outgoingCard.id),
                      }));
                    }}
                    canInteract={true}
                    showTurnHighlights={true}
                    showPlayableHints={fixture.showPlayableHints ?? true}
                    selectedIndexes={previewSelectedIndexes}
                    targets={fixture.scene.board.playerFieldSlots.map((slot) => slot.displayedTarget!.target)}
                    freshCardIds={previewFreshCardIds}
                    onCardClick={
                      (animationSet === "hand-play-target" ||
                        animationSet === "hand-play-draw-combo")
                        ? (index) => {
                            setPreviewSelectedIndexes([index]);
                          }
                        : undefined
                    }
                  />
                </div>
              </BattleEditableElement>
            }
          centerBottomMobile={null}
          centerControlMobile={
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-2 shadow-xl lg:hidden">
              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <BattlePileRail layout={layout} className="w-auto max-w-none">
                  <BattleEditableElement
                    element="playerTargetDeck"
                    layout={layout}
                    viewportWidth={viewportWidth}
                    gridSize={gridSize}
                    snapThreshold={snapThreshold}
                    viewportHeight={viewportHeight}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selected={isSelected("playerTargetDeck")}
                    snapTargets={snapTargets}
                  >
                    <BattleSinglePile
                      label="ALVOS"
                      count={fixture.scene.rightSidebar.decks.targetDeckCount}
                      color="bg-rose-950"
                      variant="target"
                      fitParent
                      className={cn("min-h-[190px]", getPreviewAreaClass(focusArea, ["playerTargetDeck"]))}
                    />
                  </BattleEditableElement>
                  <BattleEditableElement
                    element="playerDeck"
                    layout={layout}
                    viewportWidth={viewportWidth}
                    gridSize={gridSize}
                    snapThreshold={snapThreshold}
                    viewportHeight={viewportHeight}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selected={isSelected("playerDeck")}
                    snapTargets={snapTargets}
                  >
                    <BattleSinglePile
                      label="DECK"
                      count={fixture.scene.rightSidebar.decks.deckCount}
                      color="bg-amber-950"
                      variant="deck"
                      fitParent
                      className={cn("min-h-[190px]", getPreviewAreaClass(focusArea, ["playerDeck"]))}
                    />
                  </BattleEditableElement>
                </BattlePileRail>

                <BattleEditableElement
                  element="status"
                  layout={layout}
                  viewportWidth={viewportWidth}
                  gridSize={gridSize}
                  snapThreshold={snapThreshold}
                  viewportHeight={viewportHeight}
                  previewAnimations={editorMode}
                  editorMode={editorMode}
                  selected={isSelected("status")}
                  snapTargets={snapTargets}
                >
                  <BattleStatusPanel
                    presentation="mobile"
                    title={fixture.scene.rightSidebar.hud.title}
                    turnLabel={fixture.scene.rightSidebar.hud.turnLabel}
                    clock={fixture.scene.rightSidebar.hud.clock}
                    clockUrgent={fixture.scene.rightSidebar.hud.clockUrgent}
                    visualState={statusVisualState}
                    layout={layout}
                    viewportWidth={viewportWidth}
                    viewportHeight={viewportHeight}
                    gridSize={gridSize}
                    snapThreshold={snapThreshold}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selectedElements={selectedElements}
                    snapTargets={snapTargets}
                  />
                </BattleEditableElement>

                <BattleEditableElement
                  element="action"
                  layout={layout}
                  viewportWidth={viewportWidth}
                  gridSize={gridSize}
                  snapThreshold={snapThreshold}
                  viewportHeight={viewportHeight}
                  previewAnimations={editorMode}
                  editorMode={editorMode}
                  selected={isSelected("action")}
                  snapTargets={snapTargets}
                >
                  <BattleActionButton
                    presentation="mobile"
                    title={fixture.scene.rightSidebar.action?.title ?? "Trocar"}
                    subtitle={fixture.scene.rightSidebar.action?.subtitle ?? "Ate 3 cartas"}
                    layout={layout}
                    visualState={actionVisualState}
                    viewportWidth={viewportWidth}
                    viewportHeight={viewportHeight}
                    gridSize={gridSize}
                    snapThreshold={snapThreshold}
                    previewAnimations={editorMode}
                    editorMode={editorMode}
                    selectedElements={selectedElements}
                    snapTargets={snapTargets}
                    className={cn(
                      "border-4 border-[#d4af37] bg-[#4a1d24] text-amber-50 shadow-[0_18px_38px_rgba(0,0,0,0.42)]",
                      getPreviewAreaClass(focusArea, ["action"]),
                    )}
                  />
                </BattleEditableElement>
              </div>
            </div>
          }
            rightSidebar={
              <BattleRightSidebarView
                sidebar={fixture.scene.rightSidebar}
                targetDeckAnchorRef={noopRef}
                deckAnchorRef={noopRef}
                discardAnchorRef={noopRef}
                hudClassName={getPreviewAreaClass(focusArea, ["status"])}
                actionSlotClassName={getPreviewAreaClass(focusArea, ["action"])}
                targetDeckClassName={getPreviewAreaClass(focusArea, ["playerTargetDeck"])}
                deckClassName={getPreviewAreaClass(focusArea, ["playerDeck"])}
                layout={layout}
                viewportWidth={viewportWidth}
                gridSize={gridSize}
                snapThreshold={snapThreshold}
                previewAnimations={editorMode}
                selectedElements={selectedElements}
                actionVisualState={actionVisualState}
                statusVisualState={statusVisualState}
                snapTargets={snapTargets}
              />
            }
          footerMobileHand={
            <BattleEditableElement
              element="bottomHand"
              layout={layout}
              viewportWidth={viewportWidth}
              gridSize={gridSize}
              snapThreshold={snapThreshold}
              viewportHeight={viewportHeight}
              previewAnimations={editorMode}
              editorMode={editorMode}
              selected={isSelected("bottomHand") && !isHandPlayTargetEditorSet}
              previewSelectable={!isHandPlayTargetEditorSet}
              snapTargets={snapTargets}
              className={cn("transition-all duration-200", getPreviewAreaClass(focusArea, ["bottomHand"]))}
            >
              <BattleHandLane
                side={0}
                presentation="local"
                stableCards={previewPlayerStableCards}
                incomingCards={incomingPreviewHands[PLAYER]}
                outgoingCards={outgoingPreviewHands[PLAYER]}
                reservedSlots={previewReservedSlots}
                scale="mobile"
                onIncomingCardComplete={handleIncomingPreviewHandComplete}
                onOutgoingCardComplete={(outgoingCard) => {
                  setOutgoingPreviewHands((current) => ({
                    ...current,
                    [PLAYER]: current[PLAYER].filter((item) => item.id !== outgoingCard.id),
                  }));
                }}
                canInteract={true}
                showTurnHighlights={true}
                showPlayableHints={fixture.showPlayableHints ?? true}
                selectedIndexes={previewSelectedIndexes}
                targets={fixture.scene.board.playerFieldSlots.map((slot) => slot.displayedTarget!.target)}
                freshCardIds={previewFreshCardIds}
                onCardClick={
                  (animationSet === "hand-play-target" ||
                    animationSet === "hand-play-draw-combo")
                    ? (index) => {
                        setPreviewSelectedIndexes([index]);
                      }
                    : undefined
                }
              />
            </BattleEditableElement>
          }
          />
          <BattleEditableElement
            element="enemyField"
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            viewportHeight={viewportHeight}
            previewAnimations={editorMode}
            editorMode={editorMode}
            selected={isSelected("enemyField")}
            snapTargets={snapTargets}
            className={cn("absolute left-0 top-0 z-10", getPreviewAreaClass(focusArea, ["enemyField"]))}
          >
            <div style={boardVars}>
              <BattleFieldLane
                presentation="enemy"
                containerRef={noopRef}
                sectionClassName="flex min-h-0 items-end justify-center overflow-visible pb-1"
                slots={enemyFieldSlots}
              />
            </div>
          </BattleEditableElement>
          <BattleEditableElement
            element="playerField"
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            viewportHeight={viewportHeight}
            previewAnimations={editorMode}
            editorMode={editorMode}
            selected={isSelected("playerField")}
            snapTargets={snapTargets}
            className={cn("absolute left-0 top-0 z-10", getPreviewAreaClass(focusArea, ["playerField"]))}
          >
            <div style={boardVars}>
              <BattleFieldLane
                presentation="player"
                containerRef={noopRef}
                sectionClassName="flex min-h-0 items-start justify-center overflow-visible pt-1"
                slots={playerFieldSlots}
              />
            </div>
          </BattleEditableElement>
          <BattleEditableElement
            element="boardMessage"
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            viewportHeight={viewportHeight}
            previewAnimations={editorMode}
            editorMode={editorMode}
            selected={isSelected("boardMessage")}
            snapTargets={snapTargets}
            className="pointer-events-none absolute left-0 top-0 z-20"
          >
            <div className="flex h-full w-full items-center justify-center">
              <AnimatePresence mode="wait">
                {fixture.scene.board.currentMessage ? (
                  <motion.div
                    key={fixture.scene.board.currentMessage.title}
                    initial={{ opacity: 0, scale: 0.4, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.8, y: -20 }}
                    className={cn(
                      "paper-panel z-50 min-w-[260px] rounded-2xl border-4 px-8 py-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                      fixture.scene.board.currentMessage.kind === "damage"
                        ? "border-rose-900 bg-rose-50"
                        : "border-amber-900 bg-amber-50",
                    )}
                  >
                    <div
                      className={cn(
                        "text-center font-serif text-3xl font-black uppercase tracking-tighter",
                        fixture.scene.board.currentMessage.kind === "damage"
                          ? "text-rose-900"
                          : "text-amber-950",
                      )}
                    >
                      {fixture.scene.board.currentMessage.title}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </BattleEditableElement>
          <BattlePillOverlay
            side="enemy"
            portrait={fixture.scene.board.enemyPortrait ? (
              <PlayerPortrait
                label={fixture.scene.board.enemyPortrait.label}
                avatar={fixture.scene.board.enemyPortrait.avatar}
                isLocal={fixture.scene.board.enemyPortrait.isLocal}
                life={fixture.scene.board.enemyPortrait.life}
                active={fixture.scene.board.enemyPortrait.active}
                flashDamage={fixture.scene.board.enemyPortrait.flashDamage}
              />
            ) : null}
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            previewAnimations={editorMode}
            editorMode={editorMode}
            selected={isSelected("enemyPill")}
            snapTargets={snapTargets}
            className={getPreviewAreaClass(focusArea, ["enemyPill"])}
          />
          <BattlePillOverlay
            side="player"
            portrait={fixture.scene.board.playerPortrait ? (
              <PlayerPortrait
                label={fixture.scene.board.playerPortrait.label}
                avatar={fixture.scene.board.playerPortrait.avatar}
                isLocal={fixture.scene.board.playerPortrait.isLocal}
                life={fixture.scene.board.playerPortrait.life}
                active={fixture.scene.board.playerPortrait.active}
                flashDamage={fixture.scene.board.playerPortrait.flashDamage}
              />
            ) : null}
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            previewAnimations={editorMode}
            editorMode={editorMode}
            selected={isSelected("playerPill")}
            snapTargets={snapTargets}
            className={getPreviewAreaClass(focusArea, ["playerPill"])}
          />
        </BattleEditableElement>
      </main>
    </BattleSceneView>
  );
};
