import type {
  BattlePixiHandTravelDrawable,
  BattlePixiSceneModel,
  BattlePixiTargetDrawable,
} from "./BattlePixiSceneModel";

export interface BattlePixiResolvedDrawable {
  id: string;
  kind: "slot-guide" | "target" | "hand-travel";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  alpha: number;
  zIndex: number;
  label: string;
  emoji?: string;
  accent: "player" | "enemy" | "travel" | "guide";
  pendingCard?: string | null;
}

export interface BattlePixiResolvedFrame {
  drawables: BattlePixiResolvedDrawable[];
  completedMotionIds: string[];
}

const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;

const resolveProgress = ({
  timeMs,
  delayMs,
  durationMs,
}: {
  timeMs: number;
  delayMs: number;
  durationMs: number;
}) => {
  if (timeMs <= delayMs) return 0;
  if (durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, (timeMs - delayMs) / durationMs));
};

const resolveTargetDrawable = (
  drawable: BattlePixiTargetDrawable,
  timeMs: number,
): BattlePixiResolvedDrawable => {
  const slotCenterX = drawable.rect.x + drawable.rect.width / 2;
  const slotCenterY = drawable.rect.y + drawable.rect.height / 2;

  if (!drawable.motion) {
    return {
      id: drawable.id,
      kind: "target",
      x: slotCenterX,
      y: slotCenterY,
      width: drawable.rect.width,
      height: drawable.rect.height,
      rotation: 0,
      scale: 1,
      alpha: 1,
      zIndex: drawable.zIndex,
      label: drawable.label,
      emoji: drawable.emoji,
      accent: drawable.side,
      pendingCard: drawable.pendingCard,
    };
  }

  if (drawable.motion.kind === "incoming") {
    const progress = easeOutCubic(
      resolveProgress({
        timeMs,
        delayMs: drawable.motion.delayMs,
        durationMs: drawable.motion.durationMs,
      }),
    );

    return {
      id: drawable.id,
      kind: "target",
      x: lerp(drawable.motion.startPoint.x, slotCenterX, progress),
      y: lerp(drawable.motion.startPoint.y, slotCenterY, progress),
      width: drawable.rect.width,
      height: drawable.rect.height,
      rotation: lerp(drawable.side === "player" ? 12 : -12, 0, progress),
      scale: lerp(0.88, 1, progress),
      alpha: lerp(0.2, 1, progress),
      zIndex: drawable.zIndex,
      label: drawable.label,
      emoji: drawable.emoji,
      accent: drawable.side,
      pendingCard: drawable.pendingCard,
    };
  }

  const totalMs =
    drawable.motion.windupMs +
    drawable.motion.attackMs +
    drawable.motion.pauseMs +
    drawable.motion.exitMs;
  const localTime = Math.max(0, timeMs - drawable.motion.delayMs);
  const windupEnd = drawable.motion.windupMs;
  const attackEnd = windupEnd + drawable.motion.attackMs;
  const pauseEnd = attackEnd + drawable.motion.pauseMs;
  const impactPoint = drawable.motion.impactPoint ?? {
    x: slotCenterX,
    y: slotCenterY,
  };
  const impactRotation = drawable.side === "player" ? -8 : 8;
  const endRotation = drawable.side === "player" ? 10 : -10;

  if (localTime <= windupEnd || totalMs <= 0) {
    return {
      id: drawable.id,
      kind: "target",
      x: slotCenterX,
      y: slotCenterY,
      width: drawable.rect.width,
      height: drawable.rect.height,
      rotation: 0,
      scale: 1,
      alpha: 1,
      zIndex: drawable.zIndex,
      label: drawable.label,
      emoji: drawable.emoji,
      accent: drawable.side,
      pendingCard: drawable.pendingCard,
    };
  }

  if (localTime <= attackEnd && drawable.motion.attackMs > 0) {
    const progress = easeOutCubic(
      (localTime - windupEnd) / drawable.motion.attackMs,
    );
    return {
      id: drawable.id,
      kind: "target",
      x: lerp(slotCenterX, impactPoint.x, progress),
      y: lerp(slotCenterY, impactPoint.y, progress),
      width: drawable.rect.width,
      height: drawable.rect.height,
      rotation: lerp(0, impactRotation, progress),
      scale: lerp(1, 1.02, progress),
      alpha: 1,
      zIndex: drawable.zIndex,
      label: drawable.label,
      emoji: drawable.emoji,
      accent: drawable.side,
      pendingCard: drawable.pendingCard,
    };
  }

  if (localTime <= pauseEnd) {
    return {
      id: drawable.id,
      kind: "target",
      x: impactPoint.x,
      y: impactPoint.y,
      width: drawable.rect.width,
      height: drawable.rect.height,
      rotation: impactRotation,
      scale: 1.02,
      alpha: 1,
      zIndex: drawable.zIndex,
      label: drawable.label,
      emoji: drawable.emoji,
      accent: drawable.side,
      pendingCard: drawable.pendingCard,
    };
  }

  const exitProgress =
    drawable.motion.exitMs > 0
      ? easeOutCubic((localTime - pauseEnd) / drawable.motion.exitMs)
      : 1;

  return {
    id: drawable.id,
    kind: "target",
    x: lerp(impactPoint.x, drawable.motion.endPoint.x, exitProgress),
    y: lerp(impactPoint.y, drawable.motion.endPoint.y, exitProgress),
    width: drawable.rect.width,
    height: drawable.rect.height,
    rotation: lerp(impactRotation, endRotation, exitProgress),
    scale: lerp(1.02, drawable.motion.endScale, exitProgress),
    alpha: 1,
    zIndex: drawable.zIndex,
    label: drawable.label,
    emoji: drawable.emoji,
    accent: drawable.side,
    pendingCard: drawable.pendingCard,
  };
};

const resolveHandTravelDrawable = (
  drawable: BattlePixiHandTravelDrawable,
  timeMs: number,
): BattlePixiResolvedDrawable => {
  const progress = easeOutCubic(
    resolveProgress({
      timeMs,
      delayMs: drawable.delayMs,
      durationMs: drawable.durationMs,
    }),
  );
  const startCenterX = drawable.startRect.x + drawable.startRect.width / 2;
  const startCenterY = drawable.startRect.y + drawable.startRect.height / 2;
  const endCenterX = drawable.endRect.x + drawable.endRect.width / 2;
  const endCenterY = drawable.endRect.y + drawable.endRect.height / 2;

  return {
    id: drawable.id,
    kind: "hand-travel",
    x: lerp(startCenterX, endCenterX, progress),
    y: lerp(startCenterY, endCenterY, progress),
    width: drawable.startRect.width,
    height: drawable.startRect.height,
    rotation: lerp(0, drawable.endRotate, progress),
    scale: lerp(1, drawable.endScale, progress),
    alpha: 1,
    zIndex: 76,
    label: drawable.syllable,
    accent: "travel",
  };
};

export const resolveBattlePixiFrame = (
  sceneModel: BattlePixiSceneModel,
  timeMs: number,
): BattlePixiResolvedFrame => {
  const drawables: BattlePixiResolvedDrawable[] = [
    ...sceneModel.slotGuides.map((slot) => ({
      id: slot.id,
      kind: "slot-guide" as const,
      x: slot.rect.x + slot.rect.width / 2,
      y: slot.rect.y + slot.rect.height / 2,
      width: slot.rect.width,
      height: slot.rect.height,
      rotation: 0,
      scale: 1,
      alpha: 1,
      zIndex: slot.zIndex,
      label: `${slot.side}-${slot.slotIndex}`,
      accent: "guide" as const,
    })),
    ...sceneModel.targetDrawables.map((drawable) =>
      resolveTargetDrawable(drawable, timeMs),
    ),
    ...sceneModel.handTravelDrawables.map((drawable) =>
      resolveHandTravelDrawable(drawable, timeMs),
    ),
  ].sort((left, right) => left.zIndex - right.zIndex);

  const completedMotionIds = [
    ...sceneModel.targetDrawables.flatMap((drawable) => {
      if (!drawable.motion) return [];
      if (drawable.motion.kind === "incoming") {
        return timeMs >= drawable.motion.delayMs + drawable.motion.durationMs
          ? [drawable.id]
          : [];
      }
      const totalMs =
        drawable.motion.delayMs +
        drawable.motion.windupMs +
        drawable.motion.attackMs +
        drawable.motion.pauseMs +
        drawable.motion.exitMs;
      return timeMs >= totalMs ? [drawable.id] : [];
    }),
    ...sceneModel.handTravelDrawables.flatMap((drawable) =>
      timeMs >= drawable.delayMs + drawable.durationMs ? [drawable.id] : [],
    ),
  ];

  return {
    drawables,
    completedMotionIds,
  };
};
