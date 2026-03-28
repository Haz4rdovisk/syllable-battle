import assert from "node:assert/strict";
import test from "node:test";
import { resolveBattleSimplePlayLiveGeometry } from "./battleSimplePlayGeometry";

test("resolveBattleSimplePlayLiveGeometry preserva geometria visual e fallbacks do simple play", () => {
  const calls: string[] = [];
  const resolved = resolveBattleSimplePlayLiveGeometry({
    side: 0,
    targetIndex: 1,
    hasVisualPlan: true,
    fieldZoneId: "playerField",
    getHandPlayTargetDestinationSnapshot: (side, targetIndex) => {
      calls.push(`hand:${side}:${targetIndex}`);
      return { left: 10, top: 20, width: 30, height: 40 };
    },
    getPostPlayHandDrawOriginSnapshot: (side) => {
      calls.push(`draw:${side}`);
      return { left: 50, top: 60, width: 70, height: 80 };
    },
    snapshotZoneSlot: (zoneId, slot) => {
      calls.push(`slot:${zoneId}:${slot}`);
      return { left: 1, top: 2, width: 3, height: 4 };
    },
  });

  assert.deepEqual(resolved, {
    visualGeometry: {
      handPlayDestination: { left: 10, top: 20, width: 30, height: 40 },
      postPlayDrawOrigin: { left: 50, top: 60, width: 70, height: 80 },
    },
    fallbackHandPlayDestination: { left: 10, top: 20, width: 30, height: 40 },
    fallbackPostPlayDrawOrigin: { left: 50, top: 60, width: 70, height: 80 },
  });
  assert.deepEqual(calls, ["hand:0:1", "draw:0"]);
});

test("resolveBattleSimplePlayLiveGeometry preserva fallback exato para slot quando a ancora live falha", () => {
  const calls: string[] = [];
  const resolved = resolveBattleSimplePlayLiveGeometry({
    side: 1,
    targetIndex: 0,
    hasVisualPlan: true,
    fieldZoneId: "enemyField",
    getHandPlayTargetDestinationSnapshot: (side, targetIndex) => {
      calls.push(`hand:${side}:${targetIndex}`);
      return null;
    },
    getPostPlayHandDrawOriginSnapshot: (side) => {
      calls.push(`draw:${side}`);
      return null;
    },
    snapshotZoneSlot: (zoneId, slot) => {
      calls.push(`slot:${zoneId}:${slot}`);
      return { left: 100, top: 200, width: 20, height: 30 };
    },
  });

  assert.deepEqual(resolved, {
    visualGeometry: {
      handPlayDestination: { left: 100, top: 200, width: 20, height: 30 },
      postPlayDrawOrigin: null,
    },
    fallbackHandPlayDestination: { left: 100, top: 200, width: 20, height: 30 },
    fallbackPostPlayDrawOrigin: null,
  });
  assert.deepEqual(calls, ["hand:1:0", "slot:enemyField:slot-0", "draw:1"]);
});

test("resolveBattleSimplePlayLiveGeometry nao monta visualGeometry quando o simple play visual nao se aplica", () => {
  const resolved = resolveBattleSimplePlayLiveGeometry({
    side: 0,
    targetIndex: 0,
    hasVisualPlan: false,
    fieldZoneId: "playerField",
    getHandPlayTargetDestinationSnapshot: () => null,
    getPostPlayHandDrawOriginSnapshot: () => ({ left: 7, top: 8, width: 9, height: 10 }),
    snapshotZoneSlot: () => ({ left: 11, top: 12, width: 13, height: 14 }),
  });

  assert.deepEqual(resolved, {
    visualGeometry: null,
    fallbackHandPlayDestination: { left: 11, top: 12, width: 13, height: 14 },
    fallbackPostPlayDrawOrigin: { left: 7, top: 8, width: 9, height: 10 },
  });
});
