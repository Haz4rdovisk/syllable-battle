import React from "react";
import { BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import {
  getBattleCompactShellSlots,
  getBattleDesktopShellSlots,
} from "./BattleSceneSpace";

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
  compact: boolean;
  tight?: boolean;
  layout?: BattleLayoutConfig;
}

export const BattleBoardShell: React.FC<BattleBoardShellProps> = ({
  leftSidebar,
  centerTopMobile,
  centerTopDesktop,
  boardSurface,
  centerBottomDesktop,
  centerBottomMobile,
  centerControlMobile,
  rightSidebar,
  footerMobileHand,
  compact,
  tight = false,
  layout = battleActiveLayoutConfig,
}) => {
  const shellSlots = getBattleDesktopShellSlots(layout);
  const compactShellSlots = getBattleCompactShellSlots(layout, tight);
  const mobileGap = tight ? Math.max(4, layout.board.mobileGap - 4) : layout.board.mobileGap;
  const mobilePadX = tight ? Math.max(8, layout.board.mobilePaddingX - 2) : layout.board.mobilePaddingX;
  const mobilePadY = tight ? Math.max(4, layout.board.mobilePaddingY - 4) : layout.board.mobilePaddingY;
  const mobileFooterPad = tight ? 0 : layout.shell.mobileFooterHandTopPadding;

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
    "--battle-shell-mobile-gap": `${mobileGap}px`,
    "--battle-shell-mobile-pad-x": `${mobilePadX}px`,
    "--battle-shell-mobile-pad-y": `${mobilePadY}px`,
    "--battle-shell-mobile-footer-pad": `${mobileFooterPad}px`,
  } as React.CSSProperties;

  if (compact) {
    return (
      <section className="relative min-h-0 flex-1" style={shellVars}>
        {centerTopMobile ? (
          <div
            className="absolute z-20 overflow-visible"
            style={{
              left: `${compactShellSlots.top.x}px`,
              top: `${compactShellSlots.top.y}px`,
              width: `${compactShellSlots.top.width}px`,
              height: `${compactShellSlots.top.height}px`,
            }}
          >
            {centerTopMobile}
          </div>
        ) : null}

        <div
          className="absolute min-h-0 overflow-visible"
          style={{
            left: `${compactShellSlots.board.x}px`,
            top: `${compactShellSlots.board.y}px`,
            width: `${compactShellSlots.board.width}px`,
            height: `${compactShellSlots.board.height}px`,
          }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">{boardSurface}</div>
          </div>
        </div>

        {centerControlMobile ? (
          <div
            className="absolute z-20 overflow-visible"
            style={{
              left: `${compactShellSlots.control.x}px`,
              top: `${compactShellSlots.control.y}px`,
              width: `${compactShellSlots.control.width}px`,
              height: `${compactShellSlots.control.height}px`,
            }}
          >
            {centerControlMobile}
          </div>
        ) : null}

        {centerBottomMobile && compactShellSlots.bottom ? (
          <div
            className="absolute z-20 overflow-visible"
            style={{
              left: `${compactShellSlots.bottom.x}px`,
              top: `${compactShellSlots.bottom.y}px`,
              width: `${compactShellSlots.bottom.width}px`,
              height: `${compactShellSlots.bottom.height}px`,
            }}
          >
            {centerBottomMobile}
          </div>
        ) : null}

        {footerMobileHand && compactShellSlots.footer ? (
          <div
            className="absolute z-20 overflow-visible pt-[var(--battle-shell-mobile-footer-pad)]"
            style={{
              left: `${compactShellSlots.footer.x}px`,
              top: `${compactShellSlots.footer.y}px`,
              width: `${compactShellSlots.footer.width}px`,
              height: `${compactShellSlots.footer.height}px`,
            }}
          >
            {footerMobileHand}
          </div>
        ) : null}
      </section>
    );
  }

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
