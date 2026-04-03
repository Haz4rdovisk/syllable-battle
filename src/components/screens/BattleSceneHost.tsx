import React from "react";
import { BoardZoneId } from "../game/GameComponents";
import { cn } from "../../lib/utils";
import { BattleActionButton } from "./BattleActionButton";
import { BattleBoardSurface } from "./BattleBoardSurface";
import { BattleChroniclesPanel } from "./BattleChroniclesPanel";
import { BattleChroniclesVisualState, BattleActionVisualState, BattleStatusVisualState } from "./BattleLayoutEditorState";
import { BattleEditableElement } from "./BattleEditableElement";
import { BattleHandFocusFrame } from "./BattleHandFocusFrame";
import { BattleHandLane } from "./BattleHandLane";
import { BattleLayoutConfig, BattleEditableElementKey } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import {
  BattleSceneRenderer,
  BattleSceneRendererDebugBindings,
  BattleSceneRendererElementConfig,
} from "./BattleSceneRenderer";
import { BattleSinglePile } from "./BattleSidePanel";
import { BattleLeftSidebarView, BattleRightSidebarView } from "./BattleSidebarViews";
import { BattleStatusPanel } from "./BattleStatusPanel";
import { BattleSceneHandModel, BattleSceneModel } from "./BattleSceneViewModel";
import { getBattleCompactShellSlots } from "./BattleSceneSpace";

const DEFAULT_ACTION_CLASS_NAME =
  "border-4 border-[#c89b35]/90 bg-[#4a1d24] text-amber-50 shadow-[0_12px_26px_rgba(0,0,0,0.28)]";

export interface BattleSceneHostProps extends BattleSceneRendererDebugBindings {
  model: BattleSceneModel;
  compact: boolean;
  tight?: boolean;
  layout?: BattleLayoutConfig;
  bindZoneRef: (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => void;
  shellOverlay?: React.ReactNode;
  elementConfig?: BattleSceneRendererElementConfig;
  compactTopShellClassName?: string;
  compactControlShellClassName?: string;
  compactFooterFrameClassName?: string;
  leftSidebarClassNameByElement?: Partial<Record<"enemyTargetDeck" | "enemyDeck" | "chronicles", string>>;
  rightSidebarClassNameByElement?: Partial<Record<"status" | "action" | "playerTargetDeck" | "playerDeck", string>>;
  chroniclesVisualState?: BattleChroniclesVisualState;
  actionVisualState?: BattleActionVisualState;
  statusVisualState?: BattleStatusVisualState;
  actionButtonClassName?: string;
}

const getHandZoneId = (hand: BattleSceneHandModel): BoardZoneId =>
  hand.presentation === "local" ? "playerHand" : "enemyHand";

export const BattleSceneHost: React.FC<BattleSceneHostProps> = ({
  model,
  compact,
  tight = false,
  layout = battleActiveLayoutConfig,
  bindZoneRef,
  shellOverlay = null,
  elementConfig,
  compactTopShellClassName = "h-full w-full",
  compactControlShellClassName = "h-full w-full",
  compactFooterFrameClassName,
  leftSidebarClassNameByElement = {},
  rightSidebarClassNameByElement = {},
  chroniclesVisualState = "normal",
  actionVisualState = "normal",
  statusVisualState = "normal",
  actionButtonClassName = DEFAULT_ACTION_CLASS_NAME,
  onEnemyFieldDebugSnapshot,
  onPlayerFieldDebugSnapshot,
}) => {
  const compactShellSlots = getBattleCompactShellSlots(layout, tight);
  const selectedElements = elementConfig?.selectedElements ?? [];
  const selectedSet = React.useMemo(
    () => new Set<BattleEditableElementKey>(selectedElements),
    [selectedElements],
  );
  const classNameByElement = elementConfig?.classNameByElement ?? {};
  const motionReplayNonceByElement = elementConfig?.motionReplayNonceByElement ?? {};
  const previewSelectableByElement = elementConfig?.previewSelectableByElement ?? {};
  const snapTargets = elementConfig?.snapTargets ?? [];

  const renderHandLane = (
    hand: BattleSceneHandModel,
    scale: "desktop" | "mobile",
  ) => (
    <BattleHandLane
      side={hand.side}
      presentation={hand.presentation}
      cardBackPresetId={layout.visuals.cardBackPresetId}
      stableCards={hand.stableCards}
      incomingCards={hand.incomingCards}
      outgoingCards={hand.outgoingCards}
      reservedSlots={hand.reservedSlots}
      scale={scale}
      anchorRef={bindZoneRef(getHandZoneId(hand), `layout-${scale}`)}
      onIncomingCardComplete={hand.onIncomingCardComplete}
      onOutgoingCardComplete={hand.onOutgoingCardComplete}
      hoveredCardIndex={hand.hoveredCardIndex}
      onHoverCard={hand.onHoverCard}
      selectedIndexes={hand.selectedIndexes}
      canInteract={hand.canInteract}
      showTurnHighlights={hand.showTurnHighlights}
      showPlayableHints={hand.showPlayableHints}
      targets={hand.targets}
      onCardClick={hand.onCardClick}
      freshCardIds={hand.freshCardIds}
      bindCardRef={hand.bindCardRef}
      onDebugSnapshot={hand.onDebugSnapshotByScale?.[scale]}
    />
  );

  const renderEditableHostElement = (
    element: BattleEditableElementKey,
    children: React.ReactNode,
    options?: {
      baseX?: number;
      baseY?: number;
      className?: string;
      previewSelectable?: boolean;
    },
  ) => (
    <BattleEditableElement
      element={element}
      motionReplayNonce={motionReplayNonceByElement[element] ?? 0}
      layout={layout}
      viewportWidth={elementConfig?.viewportWidth}
      viewportHeight={elementConfig?.viewportHeight}
      gridSize={elementConfig?.gridSize}
      snapThreshold={elementConfig?.snapThreshold}
      baseX={options?.baseX}
      baseY={options?.baseY}
      previewAnimations={elementConfig?.previewAnimations}
      editorMode={elementConfig?.editorMode}
      selected={selectedSet.has(element)}
      selectionReadOnly={elementConfig?.selectionReadOnlyByElement?.[element]}
      previewSelectable={options?.previewSelectable ?? previewSelectableByElement[element]}
      snapTargets={snapTargets}
      className={cn(options?.className, classNameByElement[element])}
    >
      {children}
    </BattleEditableElement>
  );

  const renderActionButton = () => {
    const action = model.rightSidebar.action;
    if (!action) return null;

    return (
      <BattleActionButton
        title={action.title}
        subtitle={action.subtitle}
        disabled={Boolean(action.disabled)}
        onClick={action.onClick}
        visualState={actionVisualState}
        layout={layout}
        viewportWidth={elementConfig?.viewportWidth}
        viewportHeight={elementConfig?.viewportHeight}
        gridSize={elementConfig?.gridSize}
        snapThreshold={elementConfig?.snapThreshold}
        previewAnimations={elementConfig?.previewAnimations}
        editorMode={elementConfig?.editorMode}
        selectedElements={selectedElements}
        snapTargets={snapTargets}
        className={actionButtonClassName}
      />
    );
  };

  const sceneShellSlots = {
    leftSidebar: (
      <BattleLeftSidebarView
        sidebar={model.leftSidebar}
        motionReplayNonceByElement={motionReplayNonceByElement}
        targetDeckAnchorRef={bindZoneRef("enemyTargetDeck", "desktop")}
        deckAnchorRef={bindZoneRef("enemyDeck", "desktop")}
        discardAnchorRef={bindZoneRef("enemyDiscard", "desktop")}
        targetDeckClassName={leftSidebarClassNameByElement.enemyTargetDeck}
        deckClassName={leftSidebarClassNameByElement.enemyDeck}
        chroniclesClassName={leftSidebarClassNameByElement.chronicles}
        layout={layout}
        viewportWidth={elementConfig?.viewportWidth}
        gridSize={elementConfig?.gridSize}
        snapThreshold={elementConfig?.snapThreshold}
        previewAnimations={elementConfig?.previewAnimations}
        selectedElements={selectedElements}
        snapTargets={snapTargets}
        chroniclesVisualState={chroniclesVisualState}
      />
    ),
    centerTopMobile: (
      <div className={compactTopShellClassName}>
        <div className="relative h-full w-full overflow-visible">
          {renderEditableHostElement(
            "enemyTargetDeck",
            <BattleSinglePile
              label="ALVOS"
              count={model.leftSidebar.decks.targetDeckCount}
              color="bg-rose-950"
              variant="target"
              anchorRef={bindZoneRef("enemyTargetDeck", "mobile")}
              fitParent
              pilePresetId={layout.visuals.targetPilePresetId}
              className={leftSidebarClassNameByElement.enemyTargetDeck}
            />,
            {
              baseX: compactShellSlots.top.x,
              baseY: compactShellSlots.top.y,
              className: "absolute left-0 top-0",
            },
          )}
          {renderEditableHostElement(
            "enemyDeck",
            <BattleSinglePile
              label="DECK"
              count={model.leftSidebar.decks.deckCount}
              color="bg-amber-950"
              variant="deck"
              anchorRef={bindZoneRef("enemyDeck", "mobile")}
              fitParent
              pilePresetId={layout.visuals.deckPilePresetId}
              className={leftSidebarClassNameByElement.enemyDeck}
            />,
            {
              baseX: compactShellSlots.top.x,
              baseY: compactShellSlots.top.y,
              className: "absolute left-0 top-0",
            },
          )}
          {renderEditableHostElement(
            "chronicles",
            <BattleChroniclesPanel
              entries={model.leftSidebar.chronicles}
              className={leftSidebarClassNameByElement.chronicles}
              layout={layout}
              visualState={chroniclesVisualState}
              viewportWidth={elementConfig?.viewportWidth}
              viewportHeight={elementConfig?.viewportHeight}
              gridSize={elementConfig?.gridSize}
              snapThreshold={elementConfig?.snapThreshold}
              previewAnimations={elementConfig?.previewAnimations}
              editorMode={elementConfig?.editorMode}
              selectedElements={selectedElements}
              snapTargets={snapTargets}
            />,
            {
              baseX: compactShellSlots.top.x,
              baseY: compactShellSlots.top.y,
              className: "absolute left-0 top-0",
            },
          )}
        </div>
      </div>
    ),
    boardSurface: renderEditableHostElement(
      "board",
      <BattleBoardSurface layout={layout} />,
      compact
        ? {
            baseX: compactShellSlots.board.x,
            baseY: compactShellSlots.board.y,
          }
        : undefined,
    ),
    centerControlMobile: (
      <div className={compactControlShellClassName}>
        <div className="relative h-full w-full overflow-visible">
          {renderEditableHostElement(
            "playerTargetDeck",
            <BattleSinglePile
              label="ALVOS"
              count={model.rightSidebar.decks.targetDeckCount}
              color="bg-rose-950"
              variant="target"
              anchorRef={bindZoneRef("playerTargetDeck", "mobile")}
              fitParent
              pilePresetId={layout.visuals.targetPilePresetId}
              className={rightSidebarClassNameByElement.playerTargetDeck}
            />,
            {
              baseX: compactShellSlots.control.x,
              baseY: compactShellSlots.control.y,
              className: "absolute left-0 top-0",
            },
          )}
          {renderEditableHostElement(
            "playerDeck",
            <BattleSinglePile
              label="DECK"
              count={model.rightSidebar.decks.deckCount}
              color="bg-amber-950"
              variant="deck"
              anchorRef={bindZoneRef("playerDeck", "mobile")}
              fitParent
              pilePresetId={layout.visuals.deckPilePresetId}
              className={rightSidebarClassNameByElement.playerDeck}
            />,
            {
              baseX: compactShellSlots.control.x,
              baseY: compactShellSlots.control.y,
              className: "absolute left-0 top-0",
            },
          )}
          {renderEditableHostElement(
            "status",
            <BattleStatusPanel
              title={model.rightSidebar.hud.title}
              turnLabel={model.rightSidebar.hud.turnLabel}
              clock={model.rightSidebar.hud.clock}
              clockUrgent={model.rightSidebar.hud.clockUrgent}
              visualState={statusVisualState}
              layout={layout}
              viewportWidth={elementConfig?.viewportWidth}
              viewportHeight={elementConfig?.viewportHeight}
              gridSize={elementConfig?.gridSize}
              snapThreshold={elementConfig?.snapThreshold}
              previewAnimations={elementConfig?.previewAnimations}
              editorMode={elementConfig?.editorMode}
              selectedElements={selectedElements}
              snapTargets={snapTargets}
            />,
            {
              baseX: compactShellSlots.control.x,
              baseY: compactShellSlots.control.y,
              className: "absolute left-0 top-0",
            },
          )}
          {renderEditableHostElement(
            "action",
            renderActionButton(),
            {
              baseX: compactShellSlots.control.x,
              baseY: compactShellSlots.control.y,
              className: "absolute left-0 top-0",
            },
          )}
        </div>
      </div>
    ),
    rightSidebar: (
      <BattleRightSidebarView
        sidebar={model.rightSidebar}
        action={renderActionButton()}
        motionReplayNonceByElement={motionReplayNonceByElement}
        targetDeckAnchorRef={bindZoneRef("playerTargetDeck", "desktop")}
        deckAnchorRef={bindZoneRef("playerDeck", "desktop")}
        discardAnchorRef={bindZoneRef("playerDiscard", "desktop")}
        hudClassName={rightSidebarClassNameByElement.status}
        actionSlotClassName={rightSidebarClassNameByElement.action}
        targetDeckClassName={rightSidebarClassNameByElement.playerTargetDeck}
        deckClassName={rightSidebarClassNameByElement.playerDeck}
        layout={layout}
        viewportWidth={elementConfig?.viewportWidth}
        gridSize={elementConfig?.gridSize}
        snapThreshold={elementConfig?.snapThreshold}
        previewAnimations={elementConfig?.previewAnimations}
        selectedElements={selectedElements}
        actionVisualState={actionVisualState}
        statusVisualState={statusVisualState}
        snapTargets={snapTargets}
      />
    ),
  } satisfies React.ComponentProps<typeof BattleSceneRenderer>["shellSlots"];
  const sceneHandSlots = {
    topDesktop: renderEditableHostElement(
      "topHand",
      <div className="flex h-full w-full items-start justify-center">
        {renderHandLane(model.hands.top, "desktop")}
      </div>,
      {
        className: "flex h-full w-full items-start justify-center",
      },
    ),
    topMobile: renderEditableHostElement(
      "topHand",
      <div className="flex h-full w-full items-start justify-center">
        {renderHandLane(model.hands.top, "mobile")}
      </div>,
      {
        baseX: compactShellSlots.top.x,
        baseY: compactShellSlots.top.y,
        className: "absolute left-0 top-0",
      },
    ),
    bottomDesktop: renderEditableHostElement(
      "bottomHand",
      <div className="flex h-full w-full items-end justify-center overflow-visible">
        <BattleHandFocusFrame scale="desktop">
          {renderHandLane(model.hands.bottom, "desktop")}
        </BattleHandFocusFrame>
      </div>,
      {
        className: "flex h-full w-full items-end justify-center",
      },
    ),
    bottomMobile: tight
      ? renderEditableHostElement(
          "bottomHand",
          <BattleHandFocusFrame
            scale="mobile"
            className={compactFooterFrameClassName}
          >
            {renderHandLane(model.hands.bottom, "mobile")}
          </BattleHandFocusFrame>,
          {
            baseX: compactShellSlots.bottom?.x,
            baseY: compactShellSlots.bottom?.y,
            className: "absolute left-0 top-0",
          },
        )
      : null,
    footerMobile: tight
      ? null
      : renderEditableHostElement(
          "bottomHand",
          <BattleHandFocusFrame scale="mobile" className={compactFooterFrameClassName}>
            {renderHandLane(model.hands.bottom, "mobile")}
          </BattleHandFocusFrame>,
          {
            baseX: compactShellSlots.footer?.x,
            baseY: compactShellSlots.footer?.y,
            className: "absolute left-0 top-0",
          },
        ),
  } satisfies React.ComponentProps<typeof BattleSceneRenderer>["handSlots"];

  return (
    <BattleSceneRenderer
      model={model}
      shellSlots={sceneShellSlots}
      handSlots={sceneHandSlots}
      compact={compact}
      tight={tight}
      layout={layout}
      shellOverlay={shellOverlay}
      elementConfig={elementConfig}
      onEnemyFieldDebugSnapshot={onEnemyFieldDebugSnapshot}
      onPlayerFieldDebugSnapshot={onPlayerFieldDebugSnapshot}
    />
  );
};
