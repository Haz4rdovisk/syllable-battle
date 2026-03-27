import assert from "node:assert/strict";
import test from "node:test";
import { PlayerState, UITarget } from "../types/game";
import { canPlace, drawFromSyllableDeck, ensureDeck, isHandStuck } from "./gameLogic";

const createTarget = (syllables: string[], progress: string[] = []): UITarget => ({
  id: "target-under-test",
  name: "ALVO TESTE",
  emoji: "*",
  syllables,
  rarity: "comum",
  progress,
  uiId: "target-under-test-ui",
  entering: false,
  attacking: false,
  leaving: false,
  justArrived: false,
});

const createPlayer = (hand: string[], target: UITarget): PlayerState => ({
  id: "player-under-test",
  name: "Jogador",
  life: 10,
  hand,
  syllableDeck: [],
  discard: [],
  targetDeck: [],
  targets: [target],
  lastDrawnCount: 0,
  flashDamage: 0,
  deckId: "deck-under-test",
  mulliganUsedThisRound: false,
});

test("canPlace aceita silaba enquanto a contagem alvo ainda nao foi esgotada", () => {
  const target = createTarget(["BA", "BA", "NA"], ["BA"]);

  assert.equal(canPlace("BA", target), true);
  assert.equal(canPlace("NA", target), true);
});

test("canPlace rejeita silaba fora do alvo ou com contagem ja preenchida", () => {
  const target = createTarget(["BA", "BA", "NA"], ["BA", "BA"]);

  assert.equal(canPlace("BA", target), false);
  assert.equal(canPlace("LA", target), false);
});

test("isHandStuck retorna true quando nenhuma carta entra em nenhum alvo", () => {
  const player = {
    ...createPlayer(["LA", "RI"], createTarget(["BA", "BE"])),
    targets: [createTarget(["BA", "BE"]), createTarget(["TU", "BA"])],
  };

  assert.equal(isHandStuck(player), true);
});

test("ensureDeck recicla o discard quando o syllableDeck acabou", () => {
  const player = {
    ...createPlayer([], createTarget(["BA"])),
    syllableDeck: [],
    discard: ["BA", "NA"],
  };

  const recycled = ensureDeck(player);

  assert.equal(recycled.discard.length, 0);
  assert.equal(recycled.syllableDeck.length, 2);
  assert.deepEqual([...recycled.syllableDeck].sort(), ["BA", "NA"]);
});

test("drawFromSyllableDeck compra usando o deck atual e depois recicla o discard se preciso", () => {
  const player = {
    ...createPlayer([], createTarget(["BA"])),
    syllableDeck: ["CA"],
    discard: ["ME"],
  };

  const result = drawFromSyllableDeck(player, 2);

  assert.deepEqual(result.drawn, ["CA", "ME"]);
  assert.equal(result.player.syllableDeck.length, 0);
  assert.equal(result.player.discard.length, 0);
});
