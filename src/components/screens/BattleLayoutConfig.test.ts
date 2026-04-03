import assert from "node:assert/strict";
import test from "node:test";
import {
  createBattleLayoutConfig,
  createBattleLayoutConfigForDevice,
  defaultBattleLayoutConfig,
  mergeBattleLayoutOverrides,
  normalizeBattleLayoutDeviceOverrides,
  pruneBattleLayoutOverrides,
} from "./BattleLayoutConfig";

test("layout config incorpora timings no preset e no active layout sem segunda fonte temporal", () => {
  const layout = createBattleLayoutConfig({
    timings: {
      cardToFieldMs: 720,
      openingTargetInitialDelayMs: 90,
      openingTargetEnterStaggerMs: 180,
    },
  });

  assert.equal(layout.timings.cardToFieldMs, 720);
  assert.equal(layout.timings.openingTargetInitialDelayMs, 90);
  assert.equal(layout.timings.openingTargetEnterStaggerMs, 180);
  assert.equal(
    layout.timings.drawTravelMs,
    defaultBattleLayoutConfig.timings.drawTravelMs,
  );
});

test("merge e prune preservam apenas overrides de timings realmente alterados", () => {
  const merged = mergeBattleLayoutOverrides(
    {
      timings: {
        cardToFieldMs: 720,
      },
    },
    {
      timings: {
        drawTravelMs: 880,
      },
    },
  );

  assert.deepEqual(merged.timings, {
    cardToFieldMs: 720,
    drawTravelMs: 880,
  });

  assert.deepEqual(
    pruneBattleLayoutOverrides({
      timings: {
        cardToFieldMs: defaultBattleLayoutConfig.timings.cardToFieldMs,
        drawTravelMs: 880,
      },
    }),
    {
      timings: {
        drawTravelMs: 880,
      },
    },
  );
});

test("device overrides carregam timings authorados no mesmo caminho de preview e runtime", () => {
  const overrides = normalizeBattleLayoutDeviceOverrides({
    desktop: {
      timings: {
        attackTravelMs: 1330,
      },
    },
  });
  const layout = createBattleLayoutConfigForDevice(overrides, "desktop");

  assert.equal(layout.timings.attackTravelMs, 1330);
  assert.equal(
    layout.timings.mulliganReturnMs,
    defaultBattleLayoutConfig.timings.mulliganReturnMs,
  );
});
