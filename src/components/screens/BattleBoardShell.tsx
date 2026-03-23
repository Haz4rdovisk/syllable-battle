import React from "react";

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
}) => {
  return (
    <>
      <section className="grid min-h-0 flex-1 gap-2 lg:hidden">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0">
          {centerTopMobile}

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2">
            {centerTopDesktop}
            {boardSurface}
            {centerBottomDesktop}
            {centerBottomMobile}
          </div>

          {centerControlMobile}
        </div>
      </section>

      <section className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[252px_minmax(0,1fr)_252px] lg:gap-3">
        {leftSidebar}

        <div className="relative min-h-0">
          <div className="absolute inset-x-0 top-0 z-20 h-[128px]">
            {centerTopDesktop}
          </div>

          <div className="absolute inset-x-0 top-[124px] bottom-[142px] min-h-0">
            {boardSurface}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 h-[152px]">
            {centerBottomDesktop}
          </div>
        </div>

        {rightSidebar}
      </section>

      <section className="mt-auto px-0 pt-7 lg:hidden">
        <div>{footerMobileHand}</div>
      </section>
    </>
  );
};
