import assert from "node:assert/strict";
import test from "node:test";
import {
  getBattleHandIncomingTravelMotion,
  getBattleHandOutgoingTravelMotion,
} from "./battleHandTravelGeometry";

test("incoming hand travel parte do ponto authored no stage em vez do centro genérico do stage", () => {
  const motion = getBattleHandIncomingTravelMotion({
    originRect: {
      left: 1444.9439116618312,
      top: 658.2535739677283,
      width: 0,
      height: 0,
    },
    layout: {
      x: 216,
      y: 20,
      rotate: 10,
      scale: 1,
    },
    baseHandFrame: {
      width: 598,
      height: 192,
    },
    bottomOffset: 31,
    cardWidth: 110,
    cardHeight: 150,
    handSceneScale: 0.9818181818181818,
    sceneRect: {
      sceneLeft: 661.6608339665526,
      sceneTop: 704.4296642877881,
    },
  });

  const actualStartLeft = motion.portalBaseLeft + motion.startX;
  const desiredStartLeft = 1444.9439116618312 - 55;
  const actualEndLeft = motion.portalBaseLeft + motion.slotX;
  const desiredEndLeft = motion.portalBaseLeft + 216 * 0.9818181818181818;

  assert.ok(Math.abs(actualStartLeft - desiredStartLeft) < 0.001);
  assert.ok(Math.abs(actualEndLeft - desiredEndLeft) < 0.001);
});

test("outgoing hand travel termina no centro do destino authored no stage", () => {
  const motion = getBattleHandOutgoingTravelMotion({
    destinationRect: {
      left: 711.6608339665526,
      top: 573.2213209733494,
      width: 0,
      height: 0,
    },
    destinationMode: "zone-center",
    layout: {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    },
    baseHandFrame: {
      width: 598,
      height: 192,
    },
    bottomOffset: 31,
    cardWidth: 110,
    cardHeight: 150,
    handSceneScale: 0.9818181818181818,
    sceneRect: {
      sceneLeft: 661.6608339665526,
      sceneTop: 704.4296642877881,
    },
  });

  const actualEndLeft = motion.portalBaseLeft + motion.endX;
  const desiredEndLeft = 711.6608339665526 - 55;
  const actualStartLeft = motion.portalBaseLeft + motion.slotX;
  const desiredStartLeft = motion.portalBaseLeft;

  assert.ok(Math.abs(actualEndLeft - desiredEndLeft) < 0.001);
  assert.ok(Math.abs(actualStartLeft - desiredStartLeft) < 0.001);
});

test("deck-bottom mantem a mesma base do host da mao e usa o destino em stage", () => {
  const motion = getBattleHandOutgoingTravelMotion({
    destinationRect: {
      left: 1382.962455351686,
      top: 746.2873696407879,
      width: 0,
      height: 0,
    },
    destinationMode: "deck-bottom",
    layout: {
      x: 108,
      y: 10,
      rotate: 5,
      scale: 1,
    },
    baseHandFrame: {
      width: 598,
      height: 192,
    },
    bottomOffset: 31,
    cardWidth: 110,
    cardHeight: 150,
    handSceneScale: 0.9818181818181818,
    sceneRect: {
      sceneLeft: 661.6608339665526,
      sceneTop: 704.4296642877881,
    },
  });

  const actualSlotLeft = motion.portalBaseLeft + motion.slotX;
  const expectedSlotLeft = motion.portalBaseLeft + 108 * 0.9818181818181818;
  const actualEndLeft = motion.portalBaseLeft + motion.endX;
  const expectedEndLeft = 1382.962455351686 - 55;

  assert.ok(Math.abs(actualSlotLeft - expectedSlotLeft) < 0.001);
  assert.ok(Math.abs(actualEndLeft - expectedEndLeft) < 0.001);
  assert.equal(motion.endScale, 0.72);
});
