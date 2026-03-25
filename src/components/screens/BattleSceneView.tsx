import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import {
  BATTLE_STAGE_HEIGHT,
  BATTLE_STAGE_WIDTH,
  getBattleStageMetrics,
} from "./BattleSceneSpace";
import { isBattleLayoutDebugEnabled } from "./BattleDebug";
import { BattleLayoutDebugOverlay } from "./BattleLayoutDebugOverlay";

export interface BattleSceneViewProps {
  controls?: React.ReactNode;
  travelEffects?: React.ReactNode;
  targetEffects?: React.ReactNode;
  exitControls?: React.ReactNode;
  travelLayer?: React.ReactNode;
  targetLayer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  viewportWidth?: number;
  viewportHeight?: number;
}

export const BattleSceneView: React.FC<BattleSceneViewProps> = ({
  controls,
  travelEffects,
  targetEffects,
  exitControls,
  travelLayer,
  targetLayer,
  children,
  className,
  style,
  viewportWidth,
  viewportHeight,
}) => {
  const resolvedControls = controls ?? exitControls ?? null;
  const resolvedTravelLayer = travelEffects ?? travelLayer ?? null;
  const resolvedTargetLayer = targetEffects ?? targetLayer ?? null;
  const [runtimeViewport, setRuntimeViewport] = useState(() => ({
    width: typeof window === "undefined" ? BATTLE_STAGE_WIDTH : window.innerWidth,
    height:
      typeof window === "undefined" ? BATTLE_STAGE_HEIGHT : window.innerHeight,
  }));

  useEffect(() => {
    if (
      viewportWidth !== undefined ||
      viewportHeight !== undefined ||
      typeof window === "undefined"
    ) {
      return;
    }

    const handleResize = () => {
      setRuntimeViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewportHeight, viewportWidth]);

  const sceneWidth = viewportWidth ?? runtimeViewport.width;
  const sceneHeight = viewportHeight ?? runtimeViewport.height;
  const stage = getBattleStageMetrics(sceneWidth, sceneHeight);
  const debugEnabled = isBattleLayoutDebugEnabled();

  return (
    <div
      className={cn("relative flex h-screen w-screen flex-col overflow-hidden bg-[#1a472a] font-sans text-amber-100", className)}
      style={{
        width: `${sceneWidth}px`,
        height: `${sceneHeight}px`,
        ...style,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)" />

      {stage.isPortrait ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="paper-panel max-w-sm rounded-[2rem] border-4 border-amber-900/70 px-8 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="font-serif text-3xl font-black uppercase tracking-tight text-amber-950">
              Gire o aparelho
            </div>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-900/70">
              Esta arena usa palco fixo horizontal.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="absolute left-0 top-0 overflow-hidden"
          data-battle-stage-root="true"
          data-battle-stage-scale={stage.scale}
          data-battle-stage-offset-x={stage.offsetX}
          data-battle-stage-offset-y={stage.offsetY}
          style={{
            width: `${BATTLE_STAGE_WIDTH}px`,
            height: `${BATTLE_STAGE_HEIGHT}px`,
            transform: `translate(${stage.offsetX}px, ${stage.offsetY}px) scale(${stage.scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="relative h-full w-full overflow-hidden bg-[#1a472a] font-sans text-amber-100">
            <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30" />
            <div className="pointer-events-none absolute inset-0 bg-radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)" />
            {resolvedTravelLayer}
            {resolvedTargetLayer}
            {resolvedControls}
            {children}
          </div>
        </div>
      )}
      {debugEnabled ? <BattleLayoutDebugOverlay /> : null}
    </div>
  );
};
