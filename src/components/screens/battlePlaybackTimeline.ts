export type BattlePlaybackPhase = "idle" | "running" | "paused" | "stopped";

export interface BattlePlaybackCue {
  id: string;
  atMs: number;
}

export interface BattlePlaybackClipDefinition {
  id: string;
  durationMs: number;
  cues: BattlePlaybackCue[];
}

export const battlePixiTimelineOwnedPreviewClipSets = [
  "opening-target-entry-first-round",
  "replacement-target-entry",
  "hand-play-target",
  "target-attack",
  "target-attack-replacement-combo",
] as const;

export const isBattlePixiTimelineOwnedPreviewClipSet = (
  clipSet: string,
): clipSet is (typeof battlePixiTimelineOwnedPreviewClipSets)[number] =>
  battlePixiTimelineOwnedPreviewClipSets.includes(
    clipSet as (typeof battlePixiTimelineOwnedPreviewClipSets)[number],
  );

export interface BattleTimelineSnapshot {
  phase: BattlePlaybackPhase;
  timeMs: number;
  durationMs: number;
  loop: boolean;
  iteration: number;
}

export interface BattlePreviewPlaybackSelection<
  AnimationSet extends string = string,
  AnimationMode extends string = string,
  AnimationPreset extends string = string,
> {
  clipSet: AnimationSet;
  clipMode: AnimationMode;
  preset: AnimationPreset;
  runId: number;
  active: boolean;
  loop: boolean;
  playbackPhase: "idle" | "play-once" | "loop";
  clipId: string | null;
}

export const createBattlePreviewPlaybackSelection = <
  AnimationSet extends string,
  AnimationMode extends string,
  AnimationPreset extends string,
>({
  clipSet,
  clipMode,
  preset,
  runId,
}: {
  clipSet: AnimationSet;
  clipMode: AnimationMode;
  preset: AnimationPreset;
  runId: number;
}): BattlePreviewPlaybackSelection<AnimationSet, AnimationMode, AnimationPreset> => {
  const normalizedMode = String(clipMode);
  const playbackPhase = normalizedMode.endsWith("-loop")
    ? "loop"
    : normalizedMode.endsWith("-play-once")
      ? "play-once"
      : "idle";
  const active = preset !== ("none" as AnimationPreset) && playbackPhase !== "idle";
  return {
    clipSet,
    clipMode,
    preset,
    runId,
    active,
    loop: playbackPhase === "loop",
    playbackPhase,
    clipId: active ? `${clipSet}:${preset}:${runId}` : null,
  };
};

export const isBattlePreviewPlaybackActiveForSet = <
  AnimationSet extends string,
  AnimationMode extends string,
  AnimationPreset extends string,
>(
  selection: BattlePreviewPlaybackSelection<
    AnimationSet,
    AnimationMode,
    AnimationPreset
  >,
  clipSet: AnimationSet,
) => selection.active && selection.clipSet === clipSet;

export class BattleTimelineRuntime {
  private readonly now: () => number;

  private durationMs = 0;

  private loop = false;

  private phase: BattlePlaybackPhase = "idle";

  private anchorTimeMs = 0;

  private startedAtMs: number | null = null;

  constructor(args?: { now?: () => number }) {
    this.now = args?.now ?? (() => Date.now());
  }

  configure(config: { durationMs: number; loop: boolean }) {
    this.durationMs = Math.max(0, config.durationMs);
    this.loop = config.loop;
    if (this.phase === "running") {
      this.startedAtMs = this.now();
    }
    return this.getSnapshot();
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    return this.getSnapshot();
  }

  play() {
    if (this.phase === "running") return this.getSnapshot();
    this.phase = "running";
    this.startedAtMs = this.now();
    return this.getSnapshot();
  }

  pause() {
    if (this.phase !== "running") return this.getSnapshot();
    this.anchorTimeMs = this.getSnapshot().timeMs;
    this.phase = "paused";
    this.startedAtMs = null;
    return this.getSnapshot();
  }

  stop() {
    this.phase = "stopped";
    this.anchorTimeMs = 0;
    this.startedAtMs = null;
    return this.getSnapshot();
  }

  replay() {
    this.anchorTimeMs = 0;
    this.phase = "running";
    this.startedAtMs = this.now();
    return this.getSnapshot();
  }

  seek(timeMs: number) {
    this.anchorTimeMs = this.clamp(timeMs);
    if (this.phase === "running") {
      this.startedAtMs = this.now();
    }
    return this.getSnapshot();
  }

  step(deltaMs: number) {
    this.anchorTimeMs = this.clamp(this.getSnapshot().timeMs + deltaMs);
    if (this.phase === "running") {
      this.startedAtMs = this.now();
    }
    return this.getSnapshot();
  }

  getSnapshot(): BattleTimelineSnapshot {
    const durationMs = this.durationMs;
    const baseTimeMs =
      this.phase === "running" && this.startedAtMs != null
        ? this.anchorTimeMs + Math.max(0, this.now() - this.startedAtMs)
        : this.anchorTimeMs;
    const effectiveTimeMs =
      this.loop && durationMs > 0
        ? baseTimeMs % durationMs
        : this.clamp(baseTimeMs);
    const iteration =
      this.loop && durationMs > 0 ? Math.floor(baseTimeMs / durationMs) : 0;

    return {
      phase: this.phase,
      timeMs: effectiveTimeMs,
      durationMs,
      loop: this.loop,
      iteration,
    };
  }

  private clamp(value: number) {
    if (this.durationMs <= 0) return Math.max(0, Math.round(value));
    return Math.max(0, Math.min(this.durationMs, Math.round(value)));
  }
}
