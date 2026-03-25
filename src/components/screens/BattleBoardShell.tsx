import React from "react";
import { BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { getBattleDesktopShellSlots } from "./BattleSceneSpace";

interface BattleBoardShellProps {
  leftSidebar: React.ReactNode;
  centerTopMobile: React.ReactNode;
  centerTopDesktop: React.ReactNode;
  boardSurface: React.ReactNode;
  centerBottomDesktop: React.ReactNode;
  centerBottomMobile: React.ReactNode;
  centerControlMobile: React.ReactNode;
  rightSidebar: React.ReactNode;
  footerMobileHand: React.ReactNode;
  layout?: BattleLayoutConfig;
}

export const BattleBoardShell: React.FC<BattleBoardShellProps> = ({
  leftSidebar,
  centerTopDesktop,
  boardSurface,
  centerBottomDesktop,
  rightSidebar,
  layout = battleActiveLayoutConfig,
}) => {
  const shellSlots = getBattleDesktopShellSlots(layout);

  const shellVars = {
    "--battle-shell-left-x": `${shellSlots.leftSidebar.x}px`,
    "--battle-shell-left-width": `${shellSlots.leftSidebar.width}px`,
    "--battle-shell-right-x": `${shellSlots.rightSidebar.x}px`,
    "--battle-shell-right-width": `${shellSlots.rightSidebar.width}px`,
    "--battle-shell-center-x": `${shellSlots.centerTop.x}px`,
    "--battle-shell-center-width": `${shellSlots.centerTop.width}px`,
    "--battle-shell-top-height": `${shellSlots.centerTop.height}px`,
    "--battle-shell-board-top": `${shellSlots.board.y}px`,
    "--battle-shell-board-height": `${shellSlots.board.height}px`,
    "--battle-shell-bottom-y": `${shellSlots.centerBottom.y}px`,
    "--battle-shell-bottom-height": `${shellSlots.centerBottom.height}px`,
    "--battle-shell-mobile-footer-pad": `${layout.shell.mobileFooterHandTopPadding}px`,
  } as React.CSSProperties;

  return (
    <section className="relative min-h-0 flex-1" style={shellVars}>
      <div className="absolute bottom-0 left-[var(--battle-shell-left-x)] top-0 z-20 w-[var(--battle-shell-left-width)]">
        {leftSidebar}
      </div>

      <div className="absolute bottom-0 left-[var(--battle-shell-right-x)] top-0 z-20 w-[var(--battle-shell-right-width)]">
        {rightSidebar}
      </div>

      <div className="absolute left-[var(--battle-shell-center-x)] top-0 z-20 h-[var(--battle-shell-top-height)] min-h-0 w-[var(--battle-shell-center-width)]">
        {centerTopDesktop}
      </div>

      <div className="absolute left-[var(--battle-shell-center-x)] top-[var(--battle-shell-board-top)] min-h-0 h-[var(--battle-shell-board-height)] w-[var(--battle-shell-center-width)]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1">{boardSurface}</div>
        </div>
      </div>

      <div className="absolute left-[var(--battle-shell-center-x)] top-[var(--battle-shell-bottom-y)] z-20 h-[var(--battle-shell-bottom-height)] min-h-0 w-[var(--battle-shell-center-width)]">
        {centerBottomDesktop}
      </div>
    </section>
  );
};
