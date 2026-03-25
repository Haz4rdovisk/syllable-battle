import React from "react";
import { cn } from "../../lib/utils";
import { BattleLeftSidebarViewModel, BattleRightSidebarViewModel } from "./BattleSceneViewModel";
import { BattleChroniclesPanel } from "./BattleChroniclesPanel";
import { BattleSinglePile } from "./BattleSidePanel";
import { BattleStatusPanel } from "./BattleStatusPanel";
import { BattleActionButton } from "./BattleActionButton";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleEditableElement } from "./BattleEditableElement";
import type { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";
import { BattleActionVisualState, BattleChroniclesVisualState, BattleStatusVisualState } from "./BattleLayoutEditorState";

const noopRef = () => {};

export interface BattleLeftSidebarViewProps {
  sidebar: BattleLeftSidebarViewModel;
  targetDeckAnchorRef?: (node: HTMLDivElement | null) => void;
  deckAnchorRef?: (node: HTMLDivElement | null) => void;
  discardAnchorRef?: (node: HTMLDivElement | null) => void;
  className?: string;
  targetDeckClassName?: string;
  deckClassName?: string;
  chroniclesClassName?: string;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  selectedElements?: BattleScenePreviewFocusArea[];
  snapTargets?: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  chroniclesVisualState?: BattleChroniclesVisualState;
}

export interface BattleRightSidebarViewProps {
  sidebar: BattleRightSidebarViewModel;
  action?: React.ReactNode;
  targetDeckAnchorRef?: (node: HTMLDivElement | null) => void;
  deckAnchorRef?: (node: HTMLDivElement | null) => void;
  discardAnchorRef?: (node: HTMLDivElement | null) => void;
  className?: string;
  hudClassName?: string;
  actionSlotClassName?: string;
  targetDeckClassName?: string;
  deckClassName?: string;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  selectedElements?: BattleScenePreviewFocusArea[];
  actionVisualState?: BattleActionVisualState;
  statusVisualState?: BattleStatusVisualState;
  snapTargets?: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export const BattleLeftSidebarView: React.FC<BattleLeftSidebarViewProps> = ({
  sidebar,
  targetDeckAnchorRef = noopRef,
  deckAnchorRef = noopRef,
  discardAnchorRef = noopRef,
  className = "relative h-full min-h-0",
  targetDeckClassName,
  deckClassName,
  chroniclesClassName,
  layout = battleActiveLayoutConfig,
  viewportWidth,
  gridSize = 8,
  snapThreshold = 12,
  previewAnimations = false,
  selectedElements = [],
  snapTargets = [],
  chroniclesVisualState = "normal",
}) => {
  return (
    <aside className={className}>
      <div ref={discardAnchorRef} className="pointer-events-none absolute left-2 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
      <BattleEditableElement
        element="enemyTargetDeck"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("enemyTargetDeck")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <BattleSinglePile
          label="ALVOS"
          count={sidebar.decks.targetDeckCount}
          color="bg-rose-950"
          variant="target"
          anchorRef={targetDeckAnchorRef}
          fitParent
          className={cn("min-h-[190px]", targetDeckClassName)}
        />
      </BattleEditableElement>
      <BattleEditableElement
        element="enemyDeck"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("enemyDeck")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <BattleSinglePile
          label="DECK"
          count={sidebar.decks.deckCount}
          color="bg-amber-950"
          variant="deck"
          anchorRef={deckAnchorRef}
          fitParent
          className={cn("min-h-[190px]", deckClassName)}
        />
      </BattleEditableElement>
      <BattleEditableElement
        element="chronicles"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("chronicles")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <BattleChroniclesPanel
          entries={sidebar.chronicles}
          className={chroniclesClassName}
          layout={layout}
          visualState={chroniclesVisualState}
          viewportWidth={viewportWidth}
          gridSize={gridSize}
          snapThreshold={snapThreshold}
          previewAnimations={previewAnimations}
          editorMode={previewAnimations}
          selectedElements={selectedElements}
          snapTargets={snapTargets}
        />
      </BattleEditableElement>
    </aside>
  );
};

const createDefaultAction = (
  title: string,
  subtitle: string | undefined,
  disabled: boolean,
  layout: BattleLayoutConfig,
  visualState: BattleActionVisualState,
  viewportWidth?: number,
  gridSize: number = 8,
  snapThreshold: number = 12,
  selectedElements: BattleScenePreviewFocusArea[] = [],
  snapTargets: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [],
) => (
  <BattleActionButton
    title={title}
    subtitle={subtitle}
    disabled={disabled}
    presentation="desktop"
    visualState={visualState}
    layout={layout}
    viewportWidth={viewportWidth}
    gridSize={gridSize}
    snapThreshold={snapThreshold}
    previewAnimations={Boolean(viewportWidth)}
    editorMode={Boolean(viewportWidth)}
    selectedElements={selectedElements}
    snapTargets={snapTargets}
    className="border-4 border-[#d4af37] bg-[#4a1d24] text-amber-50 shadow-[0_18px_38px_rgba(0,0,0,0.42)]"
  />
);

export const BattleRightSidebarView: React.FC<BattleRightSidebarViewProps> = ({
  sidebar,
  action,
  targetDeckAnchorRef = noopRef,
  deckAnchorRef = noopRef,
  discardAnchorRef = noopRef,
  className = "relative h-full min-h-0",
  hudClassName,
  actionSlotClassName,
  targetDeckClassName,
  deckClassName,
  layout = battleActiveLayoutConfig,
  viewportWidth,
  gridSize = 8,
  snapThreshold = 12,
  previewAnimations = false,
  selectedElements = [],
  actionVisualState = "normal",
  statusVisualState = "normal",
  snapTargets = [],
}) => {
  const resolvedAction =
    action ??
    (sidebar.action
      ? createDefaultAction(
          sidebar.action.title,
          sidebar.action.subtitle,
          Boolean(sidebar.action.disabled),
          layout,
          actionVisualState,
          viewportWidth,
          gridSize,
          snapThreshold,
          selectedElements,
          snapTargets,
        )
      : null);

  return (
    <aside className={className}>
      <div ref={discardAnchorRef} className="pointer-events-none absolute left-2 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
      <BattleEditableElement
        element="status"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("status")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <div className={cn("flex h-full w-full min-h-0 items-stretch justify-center", hudClassName)}>
          <BattleStatusPanel
            presentation="desktop"
            title={sidebar.hud.title}
            turnLabel={sidebar.hud.turnLabel}
            clock={sidebar.hud.clock}
            clockUrgent={sidebar.hud.clockUrgent}
            visualState={statusVisualState}
            layout={layout}
            viewportWidth={viewportWidth}
            gridSize={gridSize}
            snapThreshold={snapThreshold}
            previewAnimations={previewAnimations}
            editorMode={previewAnimations}
            selectedElements={selectedElements}
            snapTargets={snapTargets}
          />
        </div>
      </BattleEditableElement>
      <BattleEditableElement
        element="action"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("action")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <div className={cn("flex h-full w-full min-h-0 items-center justify-center", actionSlotClassName)}>
          {resolvedAction}
        </div>
      </BattleEditableElement>
      <BattleEditableElement
        element="playerTargetDeck"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("playerTargetDeck")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <BattleSinglePile
          label="ALVOS"
          count={sidebar.decks.targetDeckCount}
          color="bg-rose-950"
          variant="target"
          anchorRef={targetDeckAnchorRef}
          fitParent
          className={cn("min-h-[190px]", targetDeckClassName)}
        />
      </BattleEditableElement>
      <BattleEditableElement
        element="playerDeck"
        layout={layout}
        viewportWidth={viewportWidth}
        gridSize={gridSize}
        snapThreshold={snapThreshold}
        previewAnimations={previewAnimations}
        editorMode={previewAnimations}
        selected={selectedElements.includes("playerDeck")}
        snapTargets={snapTargets}
        className="absolute left-0 top-0"
      >
        <BattleSinglePile
          label="DECK"
          count={sidebar.decks.deckCount}
          color="bg-amber-950"
          variant="deck"
          anchorRef={deckAnchorRef}
          fitParent
          className={cn("min-h-[190px]", deckClassName)}
        />
      </BattleEditableElement>
    </aside>
  );
};
