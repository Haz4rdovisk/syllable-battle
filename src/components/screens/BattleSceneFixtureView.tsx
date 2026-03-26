import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { LogOut, RotateCcw } from "lucide-react";
import { BattleSceneView } from "./BattleSceneView";
import { BattleBoardShell } from "./BattleBoardShell";
import { BattleBoardSurface, getBattleBoardSurfaceVars } from "./BattleBoardSurface";
import { BattlePillOverlay } from "./BattlePillOverlay";
import { BattleFieldLane } from "./BattleFieldLane";
import { BattleFieldIncomingTarget } from "./BattleFieldLane";
import { BattleHandLane } from "./BattleHandLane";
import { BattlePileRail, BattleSinglePile } from "./BattleSidePanel";
import { BattleLeftSidebarView, BattleRightSidebarView } from "./BattleSidebarViews";
import { BattleStatusPanel } from "./BattleStatusPanel";
import { BattleActionButton } from "./BattleActionButton";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleEditableElement } from "./BattleEditableElement";
import { PlayerPortrait } from "../game/GameComponents";
import {
  BattleSceneFixtureData,
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
const openingTargetEntryAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "opening-target-entry-0": "opening-target-entry-0-origin",
  "opening-target-entry-1": "opening-target-entry-1-origin",
  "opening-target-entry-2": "opening-target-entry-2-origin",
  "opening-target-entry-3": "opening-target-entry-3-origin",
};
type FixtureIncomingTarget = BattleFieldIncomingTarget & {
  side: typeof PLAYER | typeof ENEMY;
  slotIndex: number;
  entryIndex: number;
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
  animationAnchors = {
    openingTargetEntry0Origin: null,
    openingTargetEntry1Origin: null,
    openingTargetEntry2Origin: null,
    openingTargetEntry3Origin: null,
  },
}) => {
  const isPureOverview = focusArea === "overview";
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
  }, [clearAnimationTimers]);

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

  const getAnimationAnchorPoint = useCallback(
    (anchor: BattleLayoutPreviewAnimationAnchorKey | null) => {
      if (anchor === "opening-target-entry-0-origin") {
        return animationAnchors.openingTargetEntry0Origin;
      }
      if (anchor === "opening-target-entry-1-origin") {
        return animationAnchors.openingTargetEntry1Origin;
      }
      if (anchor === "opening-target-entry-2-origin") {
        return animationAnchors.openingTargetEntry2Origin;
      }
      if (anchor === "opening-target-entry-3-origin") {
        return animationAnchors.openingTargetEntry3Origin;
      }
      return null;
    },
    [animationAnchors],
  );
  const visibleAnimationAnchors = useMemo(() => {
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
  }, [animationPreset, getAnimationAnchorPoint]);

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
    if (
      animationSet !== "opening-target-entry-first-round" ||
      animationPreset === "none" ||
      animationMode !== "opening-target-entry-loop" &&
      animationMode !== "opening-target-entry-play-once"
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
        Exclude<BattleLayoutPreviewAnimationPreset, "opening-target-entry-simultaneous" | "none">,
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

    const startLoop = () => {
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
          startLoop();
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

    startLoop();

    return () => {
      clearAnimationTimers();
    };
  }, [animationAnchors, animationMode, animationPreset, animationRunId, animationSet, clearAnimationTimers, fixture.scene.board.enemyFieldSlots, fixture.scene.board.playerFieldSlots, getAnimationAnchorPoint, readElementSnapshot, resetPreviewAnimation, updateHiddenStableTarget]);

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
        const displayStable = !(hiddenStableTargets[ENEMY]?.[slotIndex] ?? false);
        return {
          ...slot,
          slotRef: createSlotRef(ENEMY, slotIndex),
          displayedTarget: incomingTarget?.entity ?? (displayStable ? slot.displayedTarget : null),
          incomingTarget,
          slotRect: slotNodesRef.current[ENEMY][slotIndex]?.getBoundingClientRect() ?? null,
          onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
        };
      }),
    [createSlotRef, fixture.scene.board.enemyFieldSlots, handleIncomingPreviewTargetComplete, hiddenStableTargets, incomingPreviewTargets],
  );

  const playerFieldSlots = useMemo(
    () =>
      fixture.scene.board.playerFieldSlots.map((slot, slotIndex) => {
        const incomingTarget =
          incomingPreviewTargets[PLAYER].find((target) => target.slotIndex === slotIndex) ?? null;
        const displayStable = !(hiddenStableTargets[PLAYER]?.[slotIndex] ?? false);
        return {
          ...slot,
          slotRef: createSlotRef(PLAYER, slotIndex),
          displayedTarget: incomingTarget?.entity ?? (displayStable ? slot.displayedTarget : null),
          incomingTarget,
          slotRect: slotNodesRef.current[PLAYER][slotIndex]?.getBoundingClientRect() ?? null,
          onIncomingTargetComplete: handleIncomingPreviewTargetComplete,
        };
      }),
    [createSlotRef, fixture.scene.board.playerFieldSlots, handleIncomingPreviewTargetComplete, hiddenStableTargets, incomingPreviewTargets],
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
              animationPreset !== "opening-target-entry-simultaneous" &&
              animationAnchorTool === anchor;
            return (
              <button
                key={`${anchor}-${label}`}
                type="button"
                aria-label={`Ancora de origem ${label}`}
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
                selected={isSelected("bottomHand")}
                snapTargets={snapTargets}
                className={cn("flex items-end justify-center", getPreviewAreaClass(focusArea, ["bottomHand"]))}
              >
                <div className="flex h-full w-full items-end justify-center overflow-visible">
                  <BattleHandLane
                    side={0}
                    presentation="local"
                    stableCards={fixture.playerHand}
                    scale="desktop"
                    canInteract={true}
                    showTurnHighlights={true}
                    showPlayableHints={fixture.showPlayableHints ?? true}
                    selectedIndexes={fixture.selectedIndexes ?? []}
                    targets={fixture.scene.board.playerFieldSlots.map((slot) => slot.displayedTarget!.target)}
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
              selected={isSelected("bottomHand")}
              snapTargets={snapTargets}
              className={cn("transition-all duration-200", getPreviewAreaClass(focusArea, ["bottomHand"]))}
            >
              <BattleHandLane
                side={0}
                presentation="local"
                stableCards={fixture.playerHand}
                scale="mobile"
                canInteract={true}
                showTurnHighlights={true}
                showPlayableHints={fixture.showPlayableHints ?? true}
                selectedIndexes={fixture.selectedIndexes ?? []}
                targets={fixture.scene.board.playerFieldSlots.map((slot) => slot.displayedTarget!.target)}
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
