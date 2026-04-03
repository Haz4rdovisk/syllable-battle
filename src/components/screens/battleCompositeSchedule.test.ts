import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SHARED_FLOW_TIMINGS } from "./battleSharedTimings";
import {
  createBattleCombatSchedule,
  createBattleCombatPreviewSchedule,
  createBattleMulliganSchedule,
  createBattleMulliganPreviewSchedule,
  getBattleCombatTargetMotionDurations,
} from "./battleCompositeSchedule";

test("createBattleCombatSchedule mantém a ordem temporal composta de attack -> impact -> exit -> replacement", () => {
  const targetMotion = getBattleCombatTargetMotionDurations(BATTLE_SHARED_FLOW_TIMINGS);
  const schedule = createBattleCombatSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    drawnCardCount: 1,
  });

  assert.deepEqual(targetMotion, {
    windupMs: 310,
    attackMs: 1140,
    pauseMs: 260,
    exitMs: 1180,
    impactAtMs: 1450,
  });
  assert.equal(schedule.attackStart.atMs, 840);
  assert.equal(schedule.impact.atMs, 2290);
  assert.equal(schedule.exit.atMs, 2550);
  assert.equal(schedule.exit.endMs, 3730);
  assert.equal(schedule.replacement.atMs, 3950);
  assert.equal(schedule.replacement.endMs, 4950);
  assert.equal(schedule.draw.atMs, 5350);
  assert.equal(schedule.draw.endMs, 6290);
  assert.equal(schedule.finish.atMs, 6550);
  assert.equal(schedule.impact.dependsOn, "attackStart");
  assert.equal(schedule.exit.dependsOn, "impact");
  assert.equal(schedule.replacement.dependsOn, "exit");
  assert.equal(schedule.draw.dependsOn, "replacement");
  assert.equal(schedule.finish.dependsOn, "draw");
});

test("createBattleCombatSchedule mantém finish previsível quando draw termina depois do replacement", () => {
  const schedule = createBattleCombatSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    drawnCardCount: 20,
  });

  assert.equal(schedule.replacement.endMs, 4950);
  assert.equal(schedule.draw.atMs, 5350);
  assert.equal(schedule.draw.endMs, 8760);
  assert.equal(schedule.finish.atMs, 9020);
  assert.equal(schedule.finish.dependsOn, "draw");
});

test("createBattleMulliganSchedule mantém return -> draw -> finish com duração composta explícita", () => {
  const schedule = createBattleMulliganSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    returnedCount: 3,
    drawnCount: 2,
  });

  assert.equal(schedule.return.atMs, 0);
  assert.equal(schedule.return.durationMs, 980);
  assert.equal(schedule.return.endMs, 980);
  assert.equal(schedule.return.staggerMs, 110);
  assert.equal(schedule.draw.atMs, 1200);
  assert.equal(schedule.draw.durationMs, 2100);
  assert.equal(schedule.draw.endMs, 3300);
  assert.equal(schedule.draw.dependsOn, "return");
  assert.equal(schedule.finish.atMs, 3440);
  assert.equal(schedule.finish.dependsOn, "draw");
});

test("createBattleMulliganSchedule permanece estável mesmo sem cartas retornadas ou compradas", () => {
  const schedule = createBattleMulliganSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    returnedCount: 0,
    drawnCount: 0,
  });

  assert.equal(schedule.return.durationMs, 0);
  assert.equal(schedule.draw.atMs, BATTLE_SHARED_FLOW_TIMINGS.mulliganDrawDelayMs);
  assert.equal(schedule.draw.durationMs, 0);
  assert.equal(
    schedule.finish.atMs,
    BATTLE_SHARED_FLOW_TIMINGS.mulliganDrawDelayMs +
      BATTLE_SHARED_FLOW_TIMINGS.mulliganTurnHandoffMs,
  );
});

test("createBattleCombatPreviewSchedule preserva a ordem temporal do runtime em tempo relativo ao preview", () => {
  const preview = createBattleCombatPreviewSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    drawnCardCount: 0,
  });

  assert.equal(preview.attack.atMs, 0);
  assert.equal(preview.attack.endMs, 2890);
  assert.equal(preview.impact.atMs, 1450);
  assert.equal(preview.replacement.atMs, 3110);
  assert.equal(preview.replacement.durationMs, 1000);
  assert.equal(preview.finish.atMs, 4370);
  assert.deepEqual(preview.targetMotion, {
    windupMs: 310,
    attackMs: 1140,
    pauseMs: 260,
    exitMs: 1180,
    impactAtMs: 1450,
  });
});

test("createBattleMulliganPreviewSchedule preserva return -> draw -> finish para replay e loop do preview", () => {
  const preview = createBattleMulliganPreviewSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    returnedCount: 3,
    drawnCount: 3,
  });

  assert.equal(preview.return.endMs, 980);
  assert.equal(preview.draw.atMs, 1200);
  assert.equal(preview.draw.cardStaggerMs, 1160);
  assert.equal(preview.draw.durationMs, 3260);
  assert.equal(preview.finish.atMs, 4600);
});
