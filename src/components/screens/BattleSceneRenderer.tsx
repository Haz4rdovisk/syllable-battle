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
import { BattleSceneModel } from "./BattleSceneViewModel";

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
  const selectedElements = elementConfig?.selectedElements ?? [];
  const selectedSet = React.useMemo(
    () => new Set<BattleEditableElementKey>(selectedElements),
    [selectedElements],
  );
  const snapTargets = elementConfig?.snapTargets ?? [];
  const classNameByElement = elementConfig?.classNameByElement ?? {};
  const motionReplayNonceByElement = elementConfig?.motionReplayNonceByElement ?? {};
  const previewSelectableByElement = elementConfig?.previewSelectableByElement ?? {};
  const zIndexOverrides = elementConfig?.zIndexOverrides ?? {};

  const renderEditableElement = (
    element: BattleEditableElementKey,
    children: React.ReactNode,
  ) => (
    <BattleEditableElement
      element={element}
      motionReplayNonce={motionReplayNonceByElement[element] ?? 0}
      layout={layout}
      viewportWidth={elementConfig?.viewportWidth}
      viewportHeight={elementConfig?.viewportHeight}
      gridSize={elementConfig?.gridSize}
      snapThreshold={elementConfig?.snapThreshold}
      previewAnimations={elementConfig?.previewAnimations}
      editorMode={elementConfig?.editorMode}
      selected={selectedSet.has(element)}
      previewSelectable={previewSelectableByElement[element]}
      snapTargets={snapTargets}
      className={classNameByElement[element]}
      zIndexOverride={zIndexOverrides[element]}
    >
      {children}
    </BattleEditableElement>
  );

  return (
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
            sectionClassName="flex min-h-0 items-end justify-center overflow-visible pb-1"
            slots={model.board.enemyFieldSlots}
            onDebugSnapshot={onEnemyFieldDebugSnapshot}
          />
        </div>,
      )}
      {renderEditableElement(
        "playerField",
        <div style={boardVars}>
          <BattleFieldLane
            presentation="player"
            sectionClassName="flex min-h-0 items-start justify-center overflow-visible pt-1"
            slots={model.board.playerFieldSlots}
            onDebugSnapshot={onPlayerFieldDebugSnapshot}
          />
        </div>,
      )}
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
  );
};
