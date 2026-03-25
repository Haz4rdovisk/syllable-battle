import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChronicleEntry } from "../../types/game";
import { cn } from "../../lib/utils";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BattleChroniclesVisualState } from "./BattleLayoutEditorState";
import type { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";

interface BattleChroniclesPanelProps {
  entries: ChronicleEntry[];
  className?: string;
  layout?: BattleLayoutConfig;
  visualState?: BattleChroniclesVisualState;
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

export const BattleChroniclesPanel: React.FC<BattleChroniclesPanelProps> = ({
  entries,
  className,
  layout = battleActiveLayoutConfig,
  visualState = "normal",
  viewportWidth,
  viewportHeight,
  gridSize = 8,
  snapThreshold = 12,
  previewAnimations = false,
  editorMode = false,
  selectedElements = [],
  snapTargets = [],
}) => {
  const resolvedTitle = layout.text.chroniclesTitle || "Cronicas";
  const titleStyle = {
    fontSize: `${Math.max(layout.text.titleFontSize - 1, 14)}px`,
    letterSpacing: `${layout.text.titleLetterSpacing}em`,
    textAlign: layout.text.titleAlign,
    color: layout.text.titleColor,
  } as React.CSSProperties;
  const entryStyle = {
    fontSize: `${Math.max(layout.text.bodyFontSize, 12)}px`,
    letterSpacing: `${layout.text.bodyLetterSpacing}em`,
    textAlign: layout.text.bodyAlign,
    color: layout.text.bodyColor,
  } as React.CSSProperties;
  const isHighlighted = visualState === "highlighted";
  const isSelected = visualState === "selected";

  return (
    <div
      data-battle-visual-root="true"
      className={cn(
        "paper-panel relative h-full w-full min-w-0 overflow-y-auto rounded-xl border-2 border-amber-900/30 bg-parchment/95 p-4 font-serif italic text-amber-950 shadow-2xl no-scrollbar transition-all duration-200",
        isHighlighted
          ? "border-amber-400/55 shadow-[0_0_28px_rgba(245,158,11,0.16)]"
          : "",
        isSelected
          ? "ring-2 ring-amber-200/90 ring-offset-2 ring-offset-[#f5ecd6] shadow-[0_0_0_1px_rgba(180,83,9,0.22),0_16px_34px_rgba(120,53,15,0.18)]"
          : "",
        className,
      )}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <div
        className="mb-3 border-b-2 border-amber-900/10 pb-2 font-serif font-black uppercase leading-tight"
        style={titleStyle}
      >
        {resolvedTitle}
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {entries.map((item, idx) => (
            <motion.div
              key={`${idx}-${item.tone}-${item.text}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl border px-3 py-2 text-center font-semibold leading-relaxed shadow-sm",
                item.tone === "player" &&
                  "border-emerald-900/30 bg-emerald-100 text-emerald-950",
                item.tone === "enemy" &&
                  "border-rose-900/30 bg-rose-100 text-rose-950",
                item.tone === "system" &&
                  "border-amber-900/20 bg-amber-50/85 text-amber-950",
              )}
              style={entryStyle}
            >
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
