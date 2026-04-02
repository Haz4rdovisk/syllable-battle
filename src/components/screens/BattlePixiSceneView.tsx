import React from "react";
import {
  BattlePreviewPlaybackSelection,
  BattleTimelineSnapshot,
  isBattlePixiTimelineOwnedPreviewClipSet,
} from "./battlePlaybackTimeline";
import { BattlePixiSceneRuntime } from "./BattlePixiSceneRuntime";
import type { BattleSceneRenderModel } from "./BattleSceneViewModel";

export interface BattlePixiSceneViewProps {
  renderModel: BattleSceneRenderModel;
  previewPlayback?: BattlePreviewPlaybackSelection | null;
  className?: string;
  allowKeyboardPlaybackControls?: boolean;
}

export const BattlePixiSceneView: React.FC<BattlePixiSceneViewProps> = ({
  renderModel,
  previewPlayback = null,
  className,
  allowKeyboardPlaybackControls = false,
}) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const runtimeRef = React.useRef<BattlePixiSceneRuntime | null>(null);
  const [timelineSnapshot, setTimelineSnapshot] =
    React.useState<BattleTimelineSnapshot>({
      phase: "idle",
      timeMs: 0,
      durationMs: 0,
      loop: previewPlayback?.loop ?? false,
      iteration: 0,
    });
  const [loopEnabled, setLoopEnabled] = React.useState(
    previewPlayback?.loop ?? false,
  );
  const isPreviewPlaybackHudEnabled = Boolean(
    previewPlayback?.active &&
      previewPlayback?.clipSet &&
      isBattlePixiTimelineOwnedPreviewClipSet(previewPlayback.clipSet),
  );

  React.useEffect(() => {
    let cancelled = false;
    const runtime = new BattlePixiSceneRuntime();
    runtimeRef.current = runtime;
    runtime.setSnapshotListener(setTimelineSnapshot);

    const mount = async () => {
      if (!hostRef.current) return;
      await runtime.mount(hostRef.current);
      if (cancelled) return;
      runtime.update({
        renderModel,
        previewPlayback,
      });
    };

    void mount();

    return () => {
      cancelled = true;
      runtime.setSnapshotListener(null);
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    runtimeRef.current?.update({
      renderModel,
      previewPlayback,
    });
    runtimeRef.current?.setLoop(loopEnabled);
  }, [loopEnabled, previewPlayback, renderModel]);

  React.useEffect(() => {
    if (!previewPlayback) return;
    setLoopEnabled(previewPlayback.loop);
  }, [previewPlayback?.clipId, previewPlayback?.loop]);

  React.useEffect(() => {
    runtimeRef.current?.setLoop(loopEnabled);
  }, [loopEnabled]);

  React.useEffect(() => {
    if (!allowKeyboardPlaybackControls) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        runtimeRef.current?.pause();
        return;
      }
      if (event.code === "KeyP") {
        runtimeRef.current?.play();
        return;
      }
      if (event.code === "KeyR") {
        runtimeRef.current?.replay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allowKeyboardPlaybackControls]);

  return (
    <div className={`relative ${className ?? ""}`.trim()} aria-hidden="true">
      <div ref={hostRef} className="h-full w-full" />
      {isPreviewPlaybackHudEnabled ? (
        <div className="pointer-events-auto absolute right-3 top-3 z-[72] flex w-[320px] flex-col gap-2 rounded-xl border border-amber-200/25 bg-[#0d2418]/90 p-3 text-amber-50 shadow-[0_14px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/70">
                Pixi Timeline
              </div>
              <div className="truncate text-xs font-bold text-amber-50">
                {previewPlayback?.clipId ?? "preview"}
              </div>
            </div>
            <div className="rounded-full border border-amber-200/20 bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/80">
              {timelineSnapshot.phase}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-amber-200/20 bg-amber-100/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50"
              onClick={() =>
                timelineSnapshot.phase === "running"
                  ? runtimeRef.current?.pause()
                  : runtimeRef.current?.play()
              }
            >
              {timelineSnapshot.phase === "running" ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-200/20 bg-amber-100/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50"
              onClick={() => runtimeRef.current?.replay()}
            >
              Replay
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-200/20 bg-amber-100/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50"
              onClick={() => runtimeRef.current?.step(-100)}
            >
              -100ms
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-200/20 bg-amber-100/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50"
              onClick={() => runtimeRef.current?.step(100)}
            >
              +100ms
            </button>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/80">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(event) => setLoopEnabled(event.target.checked)}
            />
            Loop
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(1, timelineSnapshot.durationMs)}
            step={10}
            value={Math.min(
              timelineSnapshot.timeMs,
              Math.max(1, timelineSnapshot.durationMs),
            )}
            onChange={(event) =>
              runtimeRef.current?.seek(Number(event.target.value))
            }
          />
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-100/70">
            <span>{`${timelineSnapshot.timeMs}ms / ${timelineSnapshot.durationMs}ms`}</span>
            <span>{`iter ${timelineSnapshot.iteration}`}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
