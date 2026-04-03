import type { BattleFlowTimings } from "./battleFlow";

export interface BattleCompositeFlowTimings extends BattleFlowTimings {
  attackWindupMs: number;
  attackTravelMs: number;
  impactPauseMs: number;
  targetExitMs: number;
  replacementGapMs: number;
  targetEnterMs: number;
  attackWindupBufferMs: number;
  attackTravelBufferMs: number;
  targetExitBufferMs: number;
}

export interface BattleCompositeSchedulePhase {
  atMs: number;
  durationMs: number;
  endMs: number;
  dependsOn?: string;
}

export interface BattleCombatSchedule {
  attackStart: BattleCompositeSchedulePhase;
  targetMotion: {
    windupMs: number;
    attackMs: number;
    pauseMs: number;
    exitMs: number;
  };
  impact: BattleCompositeSchedulePhase;
  exit: BattleCompositeSchedulePhase;
  replacement: BattleCompositeSchedulePhase;
  draw: BattleCompositeSchedulePhase;
  finish: BattleCompositeSchedulePhase;
}

export interface BattleMulliganSchedule {
  return: BattleCompositeSchedulePhase & {
    staggerMs: number;
  };
  draw: BattleCompositeSchedulePhase;
  finish: BattleCompositeSchedulePhase;
}

export interface BattleCombatPreviewSchedule {
  attack: {
    atMs: 0;
    durationMs: number;
    endMs: number;
  };
  impact: BattleCompositeSchedulePhase;
  replacement: BattleCompositeSchedulePhase;
  draw: BattleCompositeSchedulePhase;
  finish: BattleCompositeSchedulePhase;
  targetMotion: BattleCombatSchedule["targetMotion"];
}

export interface BattleMulliganPreviewSchedule {
  return: BattleMulliganSchedule["return"];
  draw: BattleCompositeSchedulePhase & {
    cardStaggerMs: number;
  };
  finish: BattleCompositeSchedulePhase;
}

const createPhase = (
  atMs: number,
  durationMs: number,
  dependsOn?: string,
): BattleCompositeSchedulePhase => ({
  atMs,
  durationMs,
  endMs: atMs + durationMs,
  dependsOn,
});

export const getBattleCombatTargetMotionDurations = (
  flow: BattleCompositeFlowTimings,
) => {
  const windupMs = flow.attackWindupMs + flow.attackWindupBufferMs;
  const attackMs = flow.attackTravelMs + flow.attackTravelBufferMs;
  const pauseMs = flow.impactPauseMs;
  const exitMs = flow.targetExitMs + flow.targetExitBufferMs;

  return {
    windupMs,
    attackMs,
    pauseMs,
    exitMs,
    impactAtMs: windupMs + attackMs,
  };
};

export const createBattleCombatSchedule = (args: {
  flow: BattleCompositeFlowTimings;
  drawnCardCount: number;
}): BattleCombatSchedule => {
  const { flow, drawnCardCount } = args;
  const attackStart = createPhase(flow.cardToFieldMs + flow.cardSettleMs, 0);
  const targetMotion = getBattleCombatTargetMotionDurations(flow);
  const impact = createPhase(
    attackStart.atMs + targetMotion.impactAtMs,
    0,
    "attackStart",
  );
  const exit = createPhase(
    impact.atMs + targetMotion.pauseMs,
    targetMotion.exitMs,
    "impact",
  );
  const replacement = createPhase(
    exit.endMs + flow.replacementGapMs,
    flow.targetEnterMs,
    "exit",
  );
  const drawDurationMs =
    drawnCardCount > 0
      ? flow.drawTravelMs + Math.max(0, drawnCardCount - 1) * flow.drawStaggerMs
      : 0;
  const drawStartAtMs =
    drawnCardCount > 0
      ? replacement.endMs + flow.visualSettleBufferMs + flow.drawSettleMs
      : replacement.endMs;
  const draw = createPhase(
    drawStartAtMs,
    drawDurationMs,
    "replacement",
  );
  const finish = createPhase(
    Math.max(replacement.endMs, draw.endMs) + flow.turnHandoffMs,
    0,
    replacement.endMs >= draw.endMs ? "replacement" : "draw",
  );

  return {
    attackStart,
    targetMotion,
    impact,
    exit,
    replacement,
    draw,
    finish,
  };
};

export const createBattleMulliganSchedule = (args: {
  flow: BattleCompositeFlowTimings;
  returnedCount: number;
  drawnCount: number;
}): BattleMulliganSchedule => {
  const { flow, returnedCount, drawnCount } = args;
  const returnDurationMs =
    returnedCount > 0
      ? flow.mulliganReturnMs +
        Math.max(0, returnedCount - 1) * flow.mulliganReturnStaggerMs
      : 0;
  const returnPhase = {
    ...createPhase(0, returnDurationMs),
    staggerMs: flow.mulliganReturnStaggerMs,
  };
  const drawDurationMs =
    Math.max(0, drawnCount) * flow.drawTravelMs +
    Math.max(0, drawnCount - 1) * flow.drawSettleMs;
  const draw = createPhase(
    returnPhase.endMs + flow.mulliganDrawDelayMs,
    drawDurationMs,
    "return",
  );
  const finish = createPhase(
    draw.endMs + flow.mulliganTurnHandoffMs,
    0,
    "draw",
  );

  return {
    return: returnPhase,
    draw,
    finish,
  };
};

export const createBattleCombatPreviewSchedule = (args: {
  flow: BattleCompositeFlowTimings;
  drawnCardCount: number;
}): BattleCombatPreviewSchedule => {
  const schedule = createBattleCombatSchedule(args);
  const previewOffsetMs = schedule.attackStart.atMs;
  const attackDurationMs =
    schedule.exit.endMs - schedule.attackStart.atMs;

  return {
    attack: {
      atMs: 0,
      durationMs: attackDurationMs,
      endMs: attackDurationMs,
    },
    impact: createPhase(
      schedule.impact.atMs - previewOffsetMs,
      schedule.impact.durationMs,
      schedule.impact.dependsOn,
    ),
    replacement: createPhase(
      schedule.replacement.atMs - previewOffsetMs,
      schedule.replacement.durationMs,
      schedule.replacement.dependsOn,
    ),
    draw: createPhase(
      schedule.draw.atMs - previewOffsetMs,
      schedule.draw.durationMs,
      schedule.draw.dependsOn,
    ),
    finish: createPhase(
      schedule.finish.atMs - previewOffsetMs,
      schedule.finish.durationMs,
      schedule.finish.dependsOn,
    ),
    targetMotion: schedule.targetMotion,
  };
};

export const createBattleMulliganPreviewSchedule = (args: {
  flow: BattleCompositeFlowTimings;
  returnedCount: number;
  drawnCount: number;
}): BattleMulliganPreviewSchedule => {
  const schedule = createBattleMulliganSchedule(args);

  return {
    return: schedule.return,
    draw: {
      ...schedule.draw,
      cardStaggerMs: args.flow.drawTravelMs + args.flow.drawSettleMs,
    },
    finish: schedule.finish,
  };
};
