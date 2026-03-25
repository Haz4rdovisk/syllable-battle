import React from "react";
import { cn } from "../../lib/utils";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleStatusVisualState } from "./BattleLayoutEditorState";
import type { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";

interface BattleStatusPanelProps {
  presentation: "desktop" | "mobile";
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
  presentation,
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
  const titleStyle = {
    fontSize: `clamp(${Math.max(layout.text.bodyFontSize - 1, 11)}px, 0.8vw, ${layout.text.bodyFontSize}px)`,
    letterSpacing: `${layout.text.bodyLetterSpacing}em`,
    textAlign: layout.text.bodyAlign,
    color: layout.text.bodyColor,
  } as React.CSSProperties;
  const turnStyle = {
    fontSize: `clamp(${Math.max(layout.text.titleFontSize - 1, 13)}px, 1vw, ${Math.max(layout.text.titleFontSize, 13)}px)`,
    letterSpacing: `${layout.text.titleLetterSpacing}em`,
    textAlign: layout.text.titleAlign,
    color: isUrgent ? "#881337" : layout.text.titleColor,
  } as React.CSSProperties;

  if (presentation === "mobile") {
    const mobileVars = {
      "--battle-mobile-status-width": `${layout.hud.mobileStatusWidth}px`,
      "--battle-mobile-status-height": `${layout.hud.mobileStatusHeight}px`,
    } as React.CSSProperties;

    return (
      <div
        className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        style={mobileVars}
      >
        <div
          className={cn(
            "paper-panel relative mx-auto flex w-full min-w-0 flex-col justify-center overflow-hidden rounded-[1.5rem] border-2 px-4 py-3 text-center shadow-xl transition-all duration-300 sm:mx-0",
            isUrgent
              ? "animate-pulse border-rose-300/45 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.94))] shadow-[0_0_28px_rgba(244,63,94,0.16)]"
              : "border-amber-900/25 bg-parchment/95",
            isSelected
              ? "ring-2 ring-amber-200/85 ring-offset-2 ring-offset-[#f5ecd6] shadow-[0_0_0_1px_rgba(180,83,9,0.22),0_18px_34px_rgba(120,53,15,0.18)]"
              : "",
          )}
          style={{
            height: "min(100%, var(--battle-mobile-status-height))",
            maxWidth: "min(100%, var(--battle-mobile-status-width))",
          }}
        >
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
          <div className="font-black uppercase" style={titleStyle}>{resolvedTitle}</div>
          <div className="mt-1 font-black uppercase" style={titleStyle}>{turnLabel}</div>
          <div
            className={cn("mt-2 font-serif font-black tabular-nums leading-none", isUrgent ? "text-rose-900" : "text-amber-950")}
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.25rem)" }}
          >
            {clock}
          </div>
        </div>

        {action ? <div className="flex justify-center sm:justify-end">{action}</div> : null}
      </div>
    );
  }

  const statusVars = {
    "--battle-status-width": `${layout.hud.statusWidth}px`,
    "--battle-status-height": `${layout.hud.statusHeight}px`,
    "--battle-action-slot-height": `${layout.hud.actionSlotHeight}px`,
  } as React.CSSProperties;

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col"
      style={statusVars}
    >
      <div
        data-battle-visual-root="true"
        className={cn(
          "paper-panel relative flex min-h-0 flex-1 w-full min-w-0 flex-col justify-center overflow-hidden rounded-xl border-2 p-4 text-center shadow-2xl transition-all duration-300",
          isUrgent
            ? "animate-pulse border-rose-300/40 bg-parchment/95 shadow-[0_0_30px_rgba(244,63,94,0.18)]"
            : "border-amber-900/30 bg-parchment/95",
          isSelected
            ? "ring-2 ring-amber-200/90 ring-offset-2 ring-offset-[#f5ecd6] shadow-[0_0_0_1px_rgba(180,83,9,0.24),0_18px_40px_rgba(120,53,15,0.2)]"
            : "",
        )}
      >
        {isUrgent ? <div className="absolute inset-0 bg-rose-100/35" /> : null}
        <div className="mb-2 border-b-2 border-amber-900/10 pb-2 font-black uppercase" style={titleStyle}>
          {resolvedTitle}
        </div>
        <div className="flex min-h-[34px] items-center justify-center px-2">
          <div className="max-w-full font-serif font-black uppercase leading-tight" style={turnStyle}>
            {turnLabel}
          </div>
        </div>
        <div
          className={cn("mt-2.5 font-serif font-black tabular-nums leading-none tracking-[0.04em]", isUrgent ? "text-rose-950" : "text-amber-950")}
          style={{ fontSize: "clamp(2.35rem, 4.2vw, 3rem)" }}
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
