import React from "react";
import { Button } from "../ui/button";
import { LogOut, RotateCcw } from "lucide-react";
import { BattleSceneView } from "./BattleSceneView";
import { BattleBoardShell } from "./BattleBoardShell";
import { BattleBoardSurface, getBattleBoardSurfaceVars } from "./BattleBoardSurface";
import { BattlePillOverlay } from "./BattlePillOverlay";
import { BattleFieldLane } from "./BattleFieldLane";
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
import { BattleActionVisualState, BattleChroniclesVisualState, BattleStatusVisualState } from "./BattleLayoutEditorState";
import {
  BATTLE_STAGE_HEIGHT,
  getBattleDesktopShellSlots,
  getBattleElementSceneRect,
  getBattleStageMetrics,
} from "./BattleSceneSpace";
import { AnimatePresence, motion } from "motion/react";

const noopRef = () => {};

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
                slots={fixture.scene.board.enemyFieldSlots}
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
                slots={fixture.scene.board.playerFieldSlots}
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
