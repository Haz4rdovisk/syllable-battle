import assert from "node:assert/strict";
import test from "node:test";
import { defaultBattleLayoutConfig } from "./BattleLayoutConfig";
import { getBattleAnimationPreviewDurationMs } from "./battleAnimationPreviewTiming";

const timings = defaultBattleLayoutConfig.timings;

test("preview durations derivados do editor batem com os schedules compartilhados", () => {
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "opening-target-entry-first-round",
      preset: "opening-target-entry-simultaneous",
      timings,
    }),
    5260,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "opening-target-entry-first-round",
      preset: "opening-target-entry-simultaneous",
      timings: {
        ...timings,
        openingTargetInitialDelayMs: 180,
      },
    }),
    5400,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "replacement-target-entry",
      preset: "replacement-target-entry-0",
      timings,
    }),
    1240,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "post-play-hand-draw",
      preset: "post-play-hand-draw",
      timings,
    }),
    1160,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "hand-play-target",
      preset: "hand-play-target-0",
      timings,
    }),
    840,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "target-attack",
      preset: "target-attack-0",
      timings,
    }),
    2890,
  );
});

test("preview durations de combos e mulligan respeitam a mesma composição temporal do runtime", () => {
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "hand-play-draw-combo",
      preset: "hand-play-draw-combo-0",
      timings,
    }),
    2440,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "target-attack-replacement-combo",
      preset: "target-attack-replacement-combo-0",
      timings,
    }),
    5710,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "mulligan-hand-return",
      preset: "mulligan-hand-return-3",
      timings,
    }),
    1240,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "mulligan-hand-draw",
      preset: "mulligan-hand-draw-3",
      timings,
    }),
    4600,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "mulligan-complete-combo",
      preset: "mulligan-complete-combo-3",
      timings,
    }),
    4600,
  );
});

test("sets sem timing authorado continuam estáveis com duração fixa ou zero", () => {
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "board-message",
      preset: "board-message-round-info",
      timings,
    }),
    1100,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "pill-turn",
      preset: "pill-turn-player",
      timings,
    }),
    1120,
  );
  assert.equal(
    getBattleAnimationPreviewDurationMs({
      animationSet: "target-attack",
      preset: "none",
      timings,
    }),
    0,
  );
});
