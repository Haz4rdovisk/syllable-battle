import React from "react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleActionVisualState } from "./BattleLayoutEditorState";
import type { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";

interface BattleActionButtonProps {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
  presentation: "desktop" | "mobile";
  visualState?: BattleActionVisualState;
  className?: string;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  viewportHeight?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  editorMode?: boolean;
  selectedElements?: BattleScenePreviewFocusArea[];
  snapTargets?: Array<unknown>;
}

export const BattleActionButton: React.FC<BattleActionButtonProps> = ({
  title,
  subtitle,
  disabled = false,
  onClick,
  presentation,
  visualState = "normal",
  className,
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
  const isDesktop = presentation === "desktop";
  const effectiveVisualState = disabled ? "disabled" : visualState;
  const resolvedTitle =
    (effectiveVisualState === "hover" && layout.text.actionTitleHover) ||
    (effectiveVisualState === "pressed" && layout.text.actionTitlePressed) ||
    (effectiveVisualState === "disabled" && layout.text.actionTitleDisabled) ||
    (effectiveVisualState === "selected" && layout.text.actionTitleSelected) ||
    layout.text.actionTitle ||
    title;
  const resolvedSubtitle =
    (effectiveVisualState === "hover" && layout.text.actionSubtitleHover) ||
    (effectiveVisualState === "pressed" && layout.text.actionSubtitlePressed) ||
    (effectiveVisualState === "disabled" && layout.text.actionSubtitleDisabled) ||
    (effectiveVisualState === "selected" && layout.text.actionSubtitleSelected) ||
    layout.text.actionSubtitle ||
    subtitle;
  const titleStyle = {
    fontSize: `${Math.max(layout.text.titleFontSize + (isDesktop ? 2 : 0), isDesktop ? 18 : 14)}px`,
    letterSpacing: `${layout.text.titleLetterSpacing}em`,
    textAlign: layout.text.titleAlign,
    color: "#fff8eb",
  } as React.CSSProperties;
  const subtitleStyle = {
    fontSize: `${Math.max(layout.text.bodyFontSize - 1, isDesktop ? 11 : 10)}px`,
    letterSpacing: `${layout.text.bodyLetterSpacing}em`,
    textAlign: layout.text.bodyAlign,
    color: "#fde7c0",
  } as React.CSSProperties;
  const isPressed = effectiveVisualState === "pressed";
  const isSelected = effectiveVisualState === "selected";
  const isHover = effectiveVisualState === "hover";
  const isDisabled = effectiveVisualState === "disabled";

  return (
    <Button
      data-battle-visual-root="true"
      variant="outline"
      disabled={disabled || isDisabled}
      onClick={onClick}
      className={cn(
        "relative isolate flex h-full w-full items-center justify-between gap-0 overflow-hidden font-black transition-all duration-200",
        isDesktop
          ? "rounded-[1.6rem] px-7"
          : "w-full rounded-[1.35rem] px-5",
        isHover ? "brightness-110 saturate-110 shadow-[0_22px_44px_rgba(0,0,0,0.48)]" : "",
        isPressed ? "translate-y-[2px] brightness-95 shadow-[0_10px_24px_rgba(0,0,0,0.38)]" : "",
        isSelected ? "ring-2 ring-amber-100/90 ring-offset-2 ring-offset-[#7f1d1d] shadow-[0_0_0_1px_rgba(251,191,36,0.65),0_20px_44px_rgba(120,53,15,0.42)]" : "",
        isDisabled ? "cursor-not-allowed grayscale-[0.15] opacity-70 shadow-[0_8px_18px_rgba(0,0,0,0.26)]" : "",
        className,
      )}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
      }}
    >
      <div
        className={cn(
          "absolute inset-1 rounded-[inherit] border border-[#d4af37]/35 transition-all duration-200",
          isDisabled
            ? "bg-[linear-gradient(180deg,rgba(120,53,15,0.62),rgba(68,64,60,0.8))]"
            : isSelected
              ? "bg-[linear-gradient(180deg,rgba(225,29,72,0.98),rgba(136,19,55,0.98))]"
              : isPressed
                ? "bg-[linear-gradient(180deg,rgba(157,23,77,0.94),rgba(113,18,18,0.98))]"
                : isHover
                  ? "bg-[linear-gradient(180deg,rgba(219,39,119,0.96),rgba(153,27,27,0.98))]"
                  : "bg-[linear-gradient(180deg,rgba(190,24,93,0.92),rgba(127,29,29,0.96))]",
        )}
      />
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/80 to-transparent" />
      <div
        className={cn(
          "relative shrink-0 place-items-center transition-transform duration-200",
          isDesktop ? "-ml-2 mr-0 grid" : "-ml-2 -mr-1 grid",
          isHover ? "-translate-y-0.5 scale-[1.04]" : "",
          isPressed ? "translate-y-0.5 scale-[0.96]" : "",
        )}
        style={{
          height: isDesktop ? "78%" : "72%",
          aspectRatio: "1 / 1",
        }}
      >
        <span
          className={cn(
            "font-serif font-black leading-none text-amber-50/90 transition-transform duration-200",
            isHover ? "rotate-[-8deg]" : "",
            isPressed ? "rotate-[6deg]" : "",
            isDisabled ? "text-amber-100/65" : "",
          )}
          style={{
            fontSize: `${isDesktop ? 64 : 40}px`,
          }}
        >
          {"\u21BB"}
        </span>
      </div>
      <div
        className={cn(
          "relative flex min-w-0 flex-1 flex-col items-center text-center",
          isDesktop ? "-translate-x-2" : "",
        )}
      >
        <span
          className="font-serif font-black uppercase"
          style={titleStyle}
        >
          {resolvedTitle}
        </span>
        {resolvedSubtitle ? (
          <span
            className="font-black uppercase"
            style={subtitleStyle}
          >
            {resolvedSubtitle}
          </span>
        ) : null}
      </div>
    </Button>
  );
};
