import React from "react";
import { AnimatePresence } from "motion/react";
import { PlayerPortrait } from "../game/GameComponents";
import { BattleBoardMessage } from "./BattleBoardMessage";
import { BattleBoardShell } from "./BattleBoardShell";
import { BattleEditableElement, BattleEditableElementProps } from "./BattleEditableElement";
import { BattleFieldLane, BattleFieldLaneDebugSnapshot } from "./BattleFieldLane";
import { BattleLayoutConfig, BattleEditableElementKey } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattlePillOverlay } from "./BattlePillOverlay";
import { getBattleBoardSurfaceVars } from "./BattleBoardSurface";
import { BATTLE_SCENE_LAYER_ORDER, getBattleSceneElementLayer } from "./BattleSceneLayerPolicy";
import { BattleSceneModel } from "./BattleSceneViewModel";
import {
  battleGlobalFrameToScenePosition,
  getBattleFieldContainerSceneRect,
  getBattleTargetFieldSlotSceneRect,
} from "./BattleSceneSpace";
import type { BattleElementPropertyConfig } from "./BattleLayoutConfig";
import { BattleTravelLayerContext } from "./BattleTravelLayer";

type BattleSceneSnapTargets = NonNullable<BattleEditableElementProps["snapTargets"]>;

export interface BattleSceneRendererShellSlots {
  leftSidebar: React.ReactNode;
  centerTopMobile: React.ReactNode;
  centerTopDesktop: React.ReactNode;
  boardSurface: React.ReactNode;
  centerBottomDesktop: React.ReactNode;
  centerBottomMobile: React.ReactNode;
  centerControlMobile: React.ReactNode;
  rightSidebar: React.ReactNode;
  footerMobileHand: React.ReactNode;
}

export interface BattleSceneRendererElementConfig {
  viewportWidth?: number;
  viewportHeight?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  editorMode?: boolean;
  selectedElements?: BattleEditableElementKey[];
  previewSelectableByElement?: Partial<Record<BattleEditableElementKey, boolean>>;
  selectionReadOnlyByElement?: Partial<Record<BattleEditableElementKey, boolean>>;
  motionReplayNonceByElement?: Partial<Record<BattleEditableElementKey, number>>;
  classNameByElement?: Partial<Record<BattleEditableElementKey, string>>;
  zIndexOverrides?: Partial<Record<BattleEditableElementKey, number>>;
  snapTargets?: BattleSceneSnapTargets;
}

export interface BattleSceneRendererDebugBindings {
  onEnemyFieldDebugSnapshot?: (snapshot: BattleFieldLaneDebugSnapshot) => void;
  onPlayerFieldDebugSnapshot?: (snapshot: BattleFieldLaneDebugSnapshot) => void;
}

export interface BattleSceneRendererProps extends BattleSceneRendererDebugBindings {
  model: BattleSceneModel;
  shellSlots: BattleSceneRendererShellSlots;
  compact: boolean;
  tight?: boolean;
  layout?: BattleLayoutConfig;
  shellOverlay?: React.ReactNode;
  elementConfig?: BattleSceneRendererElementConfig;
}

export const BattleSceneRenderer: React.FC<BattleSceneRendererProps> = ({
  model,
  shellSlots,
  compact,
  tight = false,
  layout = battleActiveLayoutConfig,
  shellOverlay = null,
  elementConfig,
  onEnemyFieldDebugSnapshot,
  onPlayerFieldDebugSnapshot,
}) => {
  const boardVars = getBattleBoardSurfaceVars(layout);
  const [travelLayerNode, setTravelLayerNode] =
    React.useState<HTMLDivElement | null>(null);
  const selectedElements = elementConfig?.selectedElements ?? [];
  const selectedSet = React.useMemo(
    () => new Set<BattleEditableElementKey>(selectedElements),
    [selectedElements],
  );
  const snapTargets = elementConfig?.snapTargets ?? [];
  const classNameByElement = elementConfig?.classNameByElement ?? {};
  const motionReplayNonceByElement = elementConfig?.motionReplayNonceByElement ?? {};
  const previewSelectableByElement = elementConfig?.previewSelectableByElement ?? {};
  const selectionReadOnlyByElement =
    elementConfig?.selectionReadOnlyByElement ?? {};
  const zIndexOverrides = elementConfig?.zIndexOverrides ?? {};
  const enemyFieldSceneRect = getBattleFieldContainerSceneRect("enemy", layout);
  const playerFieldSceneRect = getBattleFieldContainerSceneRect("player", layout);
  const enemyFieldSlots = React.useMemo(
    () =>
      model.board.enemyFieldSlots.map((slot, slotIndex) => ({
        ...slot,
        authoredSceneRect: getBattleTargetFieldSlotSceneRect("enemy", slotIndex, layout),
      })),
    [layout, model.board.enemyFieldSlots],
  );
  const playerFieldSlots = React.useMemo(
    () =>
      model.board.playerFieldSlots.map((slot, slotIndex) => ({
        ...slot,
        authoredSceneRect: getBattleTargetFieldSlotSceneRect("player", slotIndex, layout),
      })),
    [layout, model.board.playerFieldSlots],
  );

  const createDerivedFieldConfig = React.useCallback(
    (
      element: "enemyField" | "playerField",
      rect: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ): BattleElementPropertyConfig => {
      const base = layout.elements[element];
      const nextPosition = battleGlobalFrameToScenePosition(rect, "center");
      return {
        ...base,
        anchor: "center",
        x: nextPosition.x,
        y: nextPosition.y,
        width: rect.width,
        height: rect.height,
      };
    },
    [layout],
  );
  const enemyFieldConfig = React.useMemo(
    () => createDerivedFieldConfig("enemyField", enemyFieldSceneRect),
    [createDerivedFieldConfig, enemyFieldSceneRect],
  );
  const playerFieldConfig = React.useMemo(
    () => createDerivedFieldConfig("playerField", playerFieldSceneRect),
    [createDerivedFieldConfig, playerFieldSceneRect],
  );

  const renderEditableElement = (
    element: BattleEditableElementKey,
    children: React.ReactNode,
    options?: {
      configOverride?: BattleElementPropertyConfig;
    },
  ) => (
    <BattleEditableElement
      element={element}
      configOverride={options?.configOverride}
      motionReplayNonce={motionReplayNonceByElement[element] ?? 0}
      layout={layout}
      viewportWidth={elementConfig?.viewportWidth}
      viewportHeight={elementConfig?.viewportHeight}
      gridSize={elementConfig?.gridSize}
      snapThreshold={elementConfig?.snapThreshold}
      previewAnimations={elementConfig?.previewAnimations}
      editorMode={elementConfig?.editorMode}
      selected={selectedSet.has(element)}
      selectionReadOnly={selectionReadOnlyByElement[element]}
      previewSelectable={previewSelectableByElement[element]}
      snapTargets={snapTargets}
      className={classNameByElement[element]}
      zIndexOverride={getBattleSceneElementLayer(element, zIndexOverrides[element])}
    >
      {children}
    </BattleEditableElement>
  );

  return (
    <BattleTravelLayerContext.Provider value={travelLayerNode}>
      <>
        {renderEditableElement(
          "shell",
          <>
            {shellOverlay}
            <BattleBoardShell
              layout={layout}
              compact={compact}
              tight={tight}
              leftSidebar={shellSlots.leftSidebar}
              centerTopMobile={shellSlots.centerTopMobile}
              centerTopDesktop={shellSlots.centerTopDesktop}
              boardSurface={shellSlots.boardSurface}
              centerBottomDesktop={shellSlots.centerBottomDesktop}
              centerBottomMobile={shellSlots.centerBottomMobile}
              centerControlMobile={shellSlots.centerControlMobile}
              rightSidebar={shellSlots.rightSidebar}
              footerMobileHand={shellSlots.footerMobileHand}
            />
          </>,
        )}
        {renderEditableElement(
          "enemyField",
          <div style={boardVars}>
            <BattleFieldLane
              presentation="enemy"
              sectionClassName="overflow-visible"
              fieldSceneRect={enemyFieldSceneRect}
              slots={enemyFieldSlots}
              onDebugSnapshot={onEnemyFieldDebugSnapshot}
            />
          </div>,
          { configOverride: enemyFieldConfig },
        )}
        {renderEditableElement(
          "playerField",
          <div style={boardVars}>
            <BattleFieldLane
              presentation="player"
              sectionClassName="overflow-visible"
              fieldSceneRect={playerFieldSceneRect}
              slots={playerFieldSlots}
              onDebugSnapshot={onPlayerFieldDebugSnapshot}
            />
          </div>,
          { configOverride: playerFieldConfig },
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{ zIndex: BATTLE_SCENE_LAYER_ORDER.travel }}
        >
          <div
            ref={setTravelLayerNode}
            className="relative h-full w-full overflow-visible"
          />
        </div>
        {renderEditableElement(
          "boardMessage",
          <div className="flex h-full w-full items-center justify-center">
            <AnimatePresence mode="wait">
              {model.board.currentMessage ? (
                <BattleBoardMessage message={model.board.currentMessage} />
              ) : null}
            </AnimatePresence>
          </div>,
        )}
        <BattlePillOverlay
          side="enemy"
          portrait={
            <PlayerPortrait
              label={model.board.enemyPortrait.label}
              avatar={model.board.enemyPortrait.avatar}
              isLocal={model.board.enemyPortrait.isLocal}
              life={model.board.enemyPortrait.life}
              active={model.board.enemyPortrait.active}
              flashDamage={model.board.enemyPortrait.flashDamage}
            />
          }
          layout={layout}
          viewportWidth={elementConfig?.viewportWidth}
          gridSize={elementConfig?.gridSize}
          snapThreshold={elementConfig?.snapThreshold}
          previewAnimations={elementConfig?.previewAnimations}
          editorMode={elementConfig?.editorMode}
          selected={selectedSet.has("enemyPill")}
          motionReplayNonce={motionReplayNonceByElement.enemyPill ?? 0}
          snapTargets={snapTargets}
          className={classNameByElement.enemyPill}
        />
        <BattlePillOverlay
          side="player"
          portrait={
            <PlayerPortrait
              label={model.board.playerPortrait.label}
              avatar={model.board.playerPortrait.avatar}
              isLocal={model.board.playerPortrait.isLocal}
              life={model.board.playerPortrait.life}
              active={model.board.playerPortrait.active}
              flashDamage={model.board.playerPortrait.flashDamage}
            />
          }
          layout={layout}
          viewportWidth={elementConfig?.viewportWidth}
          gridSize={elementConfig?.gridSize}
          snapThreshold={elementConfig?.snapThreshold}
          previewAnimations={elementConfig?.previewAnimations}
          editorMode={elementConfig?.editorMode}
          selected={selectedSet.has("playerPill")}
          motionReplayNonce={motionReplayNonceByElement.playerPill ?? 0}
          snapTargets={snapTargets}
          className={classNameByElement.playerPill}
        />
      </>
    </BattleTravelLayerContext.Provider>
  );
};
