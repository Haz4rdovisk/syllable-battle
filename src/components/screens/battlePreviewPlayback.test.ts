import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SHARED_FLOW_TIMINGS } from "./battleSharedTimings";
import {
  createBattleCombatPreviewSchedule,
  createBattleMulliganPreviewSchedule,
} from "./battleCompositeSchedule";
import {
  BATTLE_OPENING_PREVIEW_INITIAL_DELAY_MS,
  collectBattlePreviewPlayableTargets,
  createBattleCombatPreviewPhaseDebugEntries,
  createBattleHandPlayTargetPreviewPhaseDebugEntries,
  createBattleOpeningPreviewPhaseDebugEntries,
  createBattlePostPlayDrawPreviewPhaseDebugEntries,
  createBattleMulliganPreviewPhaseDebugEntries,
  createBattlePreviewCompletionPlan,
  createBattleReplacementPreviewPhaseDebugEntries,
  createBattleSimplePlayPreviewPhaseDebugEntries,
  formatBattlePreviewCompletionDebugLine,
  formatBattlePreviewPhaseDebugEntry,
  getBattlePreviewPhasesCompletionAtMs,
} from "./battlePreviewPlayback";

test("createBattlePreviewCompletionPlan explicita restart e cleanup sem segunda fonte temporal", () => {
  const loopPlan = createBattlePreviewCompletionPlan({
    completionAtMs: 4370,
    loopMode: true,
    gapMs: 680,
  });
  const playOncePlan = createBattlePreviewCompletionPlan({
    completionAtMs: 4370,
    loopMode: false,
    gapMs: 680,
  });

  assert.deepEqual(loopPlan, {
    completionAtMs: 4370,
    restartAtMs: 5050,
    cleanupAtMs: 4410,
    loopMode: true,
    gapMs: 680,
    cleanupBufferMs: 40,
  });
  assert.deepEqual(playOncePlan, {
    completionAtMs: 4370,
    restartAtMs: null,
    cleanupAtMs: 4410,
    loopMode: false,
    gapMs: 680,
    cleanupBufferMs: 40,
  });
});

test("helpers de debug de preview formatam fases compartilhadas de combat e mulligan", () => {
  const combatSchedule = createBattleCombatPreviewSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    drawnCardCount: 0,
  });
  const mulliganSchedule = createBattleMulliganPreviewSchedule({
    flow: BATTLE_SHARED_FLOW_TIMINGS,
    returnedCount: 2,
    drawnCount: 2,
  });

  assert.deepEqual(createBattleCombatPreviewPhaseDebugEntries(combatSchedule), [
    { key: "attack", atMs: 0, durationMs: 2890, endMs: 2890 },
    { key: "impact", atMs: 1450, durationMs: 0, endMs: 1450, dependsOn: "attackStart" },
    { key: "replacement", atMs: 3110, durationMs: 1000, endMs: 4110, dependsOn: "exit" },
    { key: "finish", atMs: 4370, durationMs: 0, endMs: 4370, dependsOn: "replacement" },
  ]);
  assert.deepEqual(createBattleMulliganPreviewPhaseDebugEntries(mulliganSchedule), [
    { key: "return", atMs: 0, durationMs: 870, endMs: 870 },
    { key: "draw", atMs: 1090, durationMs: 2100, endMs: 3190, dependsOn: "return" },
    { key: "finish", atMs: 3330, durationMs: 0, endMs: 3330, dependsOn: "draw" },
  ]);
  assert.equal(
    formatBattlePreviewPhaseDebugEntry({
      key: "replacement",
      atMs: 3110,
      durationMs: 1000,
      endMs: 4110,
      dependsOn: "exit",
    }),
    "phase:replacement at:3110 dur:1000 end:4110 dep:exit",
  );
  assert.equal(
    formatBattlePreviewCompletionDebugLine(
      createBattlePreviewCompletionPlan({
        completionAtMs: 4370,
        loopMode: true,
        gapMs: 680,
      }),
    ),
    "completion:4370 restart:5050 cleanup:4410 loop:1 gap:680",
  );
});

test("helpers de preview playback cobrem opening, replacement e simple-play sem nova fonte temporal", () => {
  const opening = createBattleOpeningPreviewPhaseDebugEntries({
    targetCount: 3,
    staggerMs: 220,
    enterDurationMs: 1000,
    settleMs: 560,
    initialDelayMs: BATTLE_OPENING_PREVIEW_INITIAL_DELAY_MS,
  });
  const replacement = createBattleReplacementPreviewPhaseDebugEntries({
    enterDurationMs: 1000,
    settleMs: 240,
  });
  const postPlayDraw = createBattlePostPlayDrawPreviewPhaseDebugEntries({
    drawDurationMs: 940,
    settleMs: 220,
  });
  const handPlayTarget = createBattleHandPlayTargetPreviewPhaseDebugEntries({
    travelMs: 660,
    settleMs: 180,
  });
  const combo = createBattleSimplePlayPreviewPhaseDebugEntries({
    commitAtMs: 840,
    drawAtMs: 1060,
    drawDurationMs: 940,
    finishAtMs: 2260,
  });

  assert.deepEqual(opening, [
    { key: "opening-enter", atMs: 0, durationMs: 3480, endMs: 3480 },
    { key: "finish", atMs: 4040, durationMs: 0, endMs: 4040, dependsOn: "opening-enter" },
  ]);
  assert.deepEqual(replacement, [
    { key: "replacement-enter", atMs: 0, durationMs: 1000, endMs: 1000 },
    { key: "finish", atMs: 1240, durationMs: 0, endMs: 1240, dependsOn: "replacement-enter" },
  ]);
  assert.deepEqual(postPlayDraw, [
    { key: "draw", atMs: 0, durationMs: 940, endMs: 940 },
    { key: "finish", atMs: 1160, durationMs: 0, endMs: 1160, dependsOn: "draw" },
  ]);
  assert.deepEqual(handPlayTarget, [
    { key: "hand-exit", atMs: 0, durationMs: 660, endMs: 660 },
    { key: "target-commit", atMs: 840, durationMs: 0, endMs: 840, dependsOn: "hand-exit" },
  ]);
  assert.deepEqual(combo, [
    { key: "hand-exit", atMs: 0, durationMs: 840, endMs: 840 },
    { key: "target-commit", atMs: 840, durationMs: 0, endMs: 840, dependsOn: "hand-exit" },
    { key: "draw", atMs: 1060, durationMs: 940, endMs: 2000, dependsOn: "target-commit" },
    { key: "finish", atMs: 2260, durationMs: 0, endMs: 2260, dependsOn: "draw" },
  ]);
  assert.equal(getBattlePreviewPhasesCompletionAtMs(opening), 4040);
  assert.equal(getBattlePreviewPhasesCompletionAtMs(replacement), 1240);
  assert.equal(getBattlePreviewPhasesCompletionAtMs(postPlayDraw), 1160);
  assert.equal(getBattlePreviewPhasesCompletionAtMs(handPlayTarget), 840);
  assert.equal(getBattlePreviewPhasesCompletionAtMs(combo), 2260);
});

test("collectBattlePreviewPlayableTargets ignora slots ocultos sem quebrar o preview", () => {
  const targets = collectBattlePreviewPlayableTargets([
    {
      displayedTarget: {
        target: { id: "alpha" },
      },
    },
    {
      displayedTarget: null,
    },
    {
      displayedTarget: {
        target: { id: "omega" },
      },
    },
  ]);

  assert.deepEqual(targets, [{ id: "alpha" }, { id: "omega" }]);
});
