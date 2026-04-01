import React from "react";
import { cn } from "../../lib/utils";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleStatusVisualState } from "./BattleLayoutEditorState";
import type { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";

interface BattleStatusPanelProps {
  title: string;
  turnLabel: string;
  clock: string;
  clockUrgent?: boolean;
  visualState?: BattleStatusVisualState;
  action?: React.ReactNode;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  viewportHeight?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  editorMode?: boolean;
  selectedElements?: BattleScenePreviewFocusArea[];
  snapTargets?: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export const BattleStatusPanel: React.FC<BattleStatusPanelProps> = ({
  title,
  turnLabel,
  clock,
  clockUrgent = false,
  visualState = "normal",
  action,
  layout = battleActiveLayoutConfig,
  viewportWidth,
  viewportHeight,
  gridSize = 8,
  snapThreshold = 12,
  previewAnimations = false,
  editorMode = false,
  selectedElements = [],
  snapTargets = [],
}) => {
  const isUrgent = clockUrgent || visualState === "urgent";
  const isSelected = visualState === "selected";
  const resolvedTitle = layout.text.statusTitle || title;
  const statusFrame = layout.elements.status;
  const isCompactFrame = statusFrame.width <= 220 || statusFrame.height <= 96;
  const panelPaddingClass = isCompactFrame ? "px-4 py-3 rounded-[1.4rem]" : "p-4 rounded-xl";
  const titleSpacingClass = isCompactFrame ? "mb-1.5 pb-1.5" : "mb-2 pb-2";
  const turnMinHeightClass = isCompactFrame ? "min-h-[26px]" : "min-h-[34px]";
  const titleStyle = {
    fontSize: `${Math.max(layout.text.bodyFontSize - 1, isCompactFrame ? 10 : 11)}px`,
    letterSpacing: `${layout.text.bodyLetterSpacing}em`,
    textAlign: layout.text.bodyAlign,
    color: layout.text.titleColor,
  } as React.CSSProperties;
  const turnStyle = {
    fontSize: `${Math.max(layout.text.titleFontSize - (isCompactFrame ? 2 : 1), isCompactFrame ? 12 : 13)}px`,
    letterSpacing: `${layout.text.titleLetterSpacing}em`,
    textAlign: layout.text.titleAlign,
    color: isUrgent ? "#881337" : "rgba(120,53,15,0.9)",
  } as React.CSSProperties;
  const statusVars = {
    "--battle-action-slot-height": `${layout.hud.actionSlotHeight}px`,
  } as React.CSSProperties;
  const clockFontSize = Math.round(
    Math.max(
      isCompactFrame ? 28 : 34,
      Math.min(statusFrame.height * (isCompactFrame ? 0.34 : 0.38), isCompactFrame ? 36 : 48),
    ),
  );

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col"
      style={statusVars}
    >
      <div
        data-battle-visual-root="true"
        className={cn(
          "paper-panel relative flex min-h-0 flex-1 w-full min-w-0 flex-col justify-center overflow-hidden border-2 text-center transition-all duration-300",
          panelPaddingClass,
          isUrgent
            ? "animate-pulse border-rose-300/40 bg-parchment/95 shadow-[0_0_30px_rgba(244,63,94,0.18)]"
            : "border-amber-900/18 bg-[linear-gradient(180deg,rgba(245,236,214,0.95),rgba(240,224,191,0.9))] shadow-[0_12px_26px_rgba(0,0,0,0.14)]",
          isSelected
            ? "ring-2 ring-amber-200/90 ring-offset-2 ring-offset-[#f5ecd6] shadow-[0_0_0_1px_rgba(180,83,9,0.24),0_18px_40px_rgba(120,53,15,0.2)]"
            : "",
        )}
      >
        {isUrgent ? <div className="absolute inset-0 bg-rose-100/35" /> : null}
        <div className={cn("border-b-2 border-amber-900/8 font-black uppercase text-amber-950/68", titleSpacingClass)} style={titleStyle}>
          {resolvedTitle}
        </div>
        <div className={cn("flex items-center justify-center px-2", turnMinHeightClass)}>
          <div className="max-w-full font-serif font-black uppercase leading-tight" style={turnStyle}>
            {turnLabel}
          </div>
        </div>
        <div
          className={cn("mt-2.5 font-serif font-black tabular-nums leading-none tracking-[0.04em]", isUrgent ? "text-rose-950" : "text-amber-950/90")}
          style={{ fontSize: `${clockFontSize}px` }}
        >
          {clock}
        </div>
      </div>

      {action ? (
        <div className="mt-4 flex h-[var(--battle-action-slot-height)] w-full items-center justify-center">
          {action}
        </div>
      ) : null}
    </div>
  );
};
