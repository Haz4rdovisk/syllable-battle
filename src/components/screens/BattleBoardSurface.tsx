import React from "react";
import { Swords } from "lucide-react";
import { cn } from "../../lib/utils";
import { BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";

export interface BattleBoardSurfaceProps {
  className?: string;
  layout?: BattleLayoutConfig;
}

export const getBattleBoardSurfaceVars = (
  layout: BattleLayoutConfig,
): React.CSSProperties =>
  ({
    "--battle-board-max-width": `${layout.board.desktopMaxWidth}px`,
    "--battle-board-lane-max-width-desktop": `${layout.board.desktopLaneMaxWidth}px`,
    "--battle-board-lane-max-width-mobile": `${layout.board.mobileLaneMaxWidth}px`,
    "--battle-board-mobile-row-min": `min(${layout.board.mobileRowMinHeight}px, 22vh)`,
    "--battle-board-mobile-gap": `${layout.board.mobileGap}px`,
    "--battle-board-desktop-gap": `${layout.board.desktopGap}px`,
    "--battle-board-mobile-pad-x": `${layout.board.mobilePaddingX}px`,
    "--battle-board-mobile-pad-y": `${layout.board.mobilePaddingY}px`,
    "--battle-board-desktop-pad-x": `${layout.board.desktopPaddingX}px`,
    "--battle-board-desktop-pad-top": `${layout.board.desktopPaddingTop}px`,
    "--battle-board-desktop-pad-bottom": `${layout.board.desktopPaddingBottom}px`,
    "--battle-target-card-min-width": `${layout.board.targetCardMinWidth}px`,
    "--battle-target-card-max-width": `${layout.board.targetCardMaxWidth}px`,
    "--battle-target-card-min-height": `${layout.board.targetCardMinHeight}px`,
    "--battle-target-card-max-height": `${layout.board.targetCardMaxHeight}px`,
  }) as React.CSSProperties;

export const BattleBoardSurface: React.FC<BattleBoardSurfaceProps> = ({
  className,
  layout = battleActiveLayoutConfig,
}) => {
  const boardVars = getBattleBoardSurfaceVars(layout);

  return (
    <div
      className={cn(
        "relative mx-auto h-full w-full max-w-[var(--battle-board-max-width)] min-h-0 overflow-visible rounded-[2.5rem] border-8 border-amber-900/40 bg-black/40 shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]",
        className,
      )}
      style={boardVars}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.05)_0%,rgba(0,0,0,0.45)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-6 opacity-10">
            <div className="h-0.5 w-36 bg-amber-100" />
            <Swords className="h-8 w-8 text-amber-100" />
            <div className="h-0.5 w-36 bg-amber-100" />
          </div>
        </div>
      </div>
    </div>
  );
};
