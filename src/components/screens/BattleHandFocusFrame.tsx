import React from "react";
import { cn } from "../../lib/utils";

interface BattleHandFocusFrameProps {
  scale: "desktop" | "mobile";
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const BattleHandFocusFrame: React.FC<BattleHandFocusFrameProps> = ({
  scale,
  compact = false,
  className,
  children,
}) => {
  const isMobile = scale === "mobile";
  const isCompactMobile = isMobile && compact;

  return (
    <div className={cn("relative flex h-full w-full min-h-0 items-end justify-center overflow-visible", className)}>
      <div
        className={cn(
          "relative z-[1] flex h-full w-full min-h-0 items-end justify-center overflow-visible",
          isCompactMobile ? "px-0.5 pb-0.5" : "px-1 pb-1",
        )}
      >
        {children}
      </div>
    </div>
  );
};
