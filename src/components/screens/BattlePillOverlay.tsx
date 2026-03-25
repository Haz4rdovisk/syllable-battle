import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";
import { BattleEditableElement } from "./BattleEditableElement";
import { BattleEditableElementKey, BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";

interface BattlePillOverlayProps {
  side: "enemy" | "player";
  portrait: React.ReactNode;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  gridSize?: number;
  snapThreshold?: number;
  previewAnimations?: boolean;
  editorMode?: boolean;
  selected?: boolean;
  snapTargets?: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  className?: string;
}

export const BattlePillOverlay: React.FC<BattlePillOverlayProps> = ({
  side,
  portrait,
  layout = battleActiveLayoutConfig,
  viewportWidth,
  gridSize = 8,
  snapThreshold = 12,
  previewAnimations = false,
  editorMode = false,
  selected = false,
  snapTargets = [],
  className,
}) => {
  const element = side === "enemy" ? "enemyPill" : "playerPill";
  const portraitProps = React.isValidElement<{
    className?: string;
    flashDamage?: number;
    isLocal?: boolean;
    showDamagePopup?: boolean;
  }>(portrait)
    ? portrait.props
    : null;
  const flashDamage = portraitProps?.flashDamage ?? 0;
  const isLocal = portraitProps?.isLocal ?? false;
  const resolvedPortrait = React.isValidElement<{
    className?: string;
    showDamagePopup?: boolean;
  }>(portrait)
    ? React.cloneElement(portrait, {
        className: cn("h-full w-full min-w-0", portrait.props.className),
        showDamagePopup: false,
      })
    : portrait;

  return (
    <BattleEditableElement
      element={element}
      layout={layout}
      viewportWidth={viewportWidth}
      gridSize={gridSize}
      snapThreshold={snapThreshold}
      previewAnimations={previewAnimations}
      editorMode={editorMode}
      selected={selected}
      snapTargets={snapTargets}
      className={cn("absolute left-0 top-0 z-30", className)}
    >
      <div className="pointer-events-none relative h-full w-full overflow-visible">
        {resolvedPortrait}
        <AnimatePresence>
          {flashDamage > 0 ? (
            <motion.div
              key={`pill-damage-${side}`}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={
                isLocal
                  ? {
                      opacity: [0, 1, 1, 0],
                      y: [0, -22, -44, -66],
                      scale: [0.5, 1.8, 1.35, 1],
                    }
                  : {
                      opacity: [0, 1, 1, 0],
                      y: [0, 22, 44, 66],
                      scale: [0.5, 1.8, 1.35, 1],
                    }
              }
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={cn(
                "pointer-events-none absolute left-1/2 z-[160] -translate-x-1/2 text-3xl font-black text-rose-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-5xl",
                isLocal ? "-top-12" : "-bottom-8",
              )}
            >
              -{flashDamage}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BattleEditableElement>
  );
};
