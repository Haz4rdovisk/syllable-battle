import assert from "node:assert/strict";
import test from "node:test";
import { GameState, PlayerState, UITarget } from "../../types/game";
import {
  resolveBattleMulliganAction,
  resolveBattlePlayAction,
} from "./battleResolution";

const createTarget = (
  syllables: string[],
  progress: string[] = [],
  rarity: UITarget["rarity"] = "comum",
): UITarget => ({
  id: "target-under-test",
  name: "ALVO TESTE",
  emoji: "*",
  syllables,
  rarity,
  progress,
  uiId: "target-under-test-ui",
  entering: false,
  attacking: false,
  leaving: false,
  justArrived: false,
});

const createPlayer = (
  hand: string[],
  target: UITarget,
  overrides: Partial<PlayerState> = {},
): PlayerState => ({
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
  ...overrides,
});

const createGameState = (
  player: PlayerState,
  enemy: PlayerState,
  turn = 0,
): GameState => ({
  players: [player, enemy],
  turn,
  turnDeadlineAt: null,
  winner: null,
  actedThisTurn: false,
  selectedHandIndexes: [],
  selectedCardForPlay: null,
  log: [],
  messageQueue: [],
  currentMessage: null,
  setupVersion: 1,
  combatLocked: false,
  mode: "local",
  openingCoinChoice: null,
  openingCoinResult: null,
  openingIntroStep: "done",
});

test("resolveBattlePlayAction aplica jogada simples sem dano e compra uma carta", () => {
  const player = createPlayer(
    ["BA", "ME"],
    createTarget(["BA", "NA"]),
    { syllableDeck: ["LO"] },
  );
  const enemy = createPlayer([], createTarget(["TU"]));
  const gameState = createGameState(player, enemy);

  const result = resolveBattlePlayAction(gameState, 0, 0);

  assert.ok(result);
  assert.equal(result.damage, 0);
  assert.equal(result.completedSlot, null);
  assert.deepEqual(result.nextPlayers[0].targets[0].progress, ["BA"]);
  assert.deepEqual(result.nextPlayers[0].hand, ["ME", "LO"]);
  assert.deepEqual(result.drawnCards, ["LO"]);
});

test("resolveBattlePlayAction conclui alvo, aplica dano e define winner quando a vida zera", () => {
  const player = createPlayer(
    ["NA"],
    createTarget(["BA", "NA"], ["BA"], "raro"),
    { syllableDeck: [], targetDeck: [createTarget(["TU"], [], "comum")] as any },
  );
  const enemy = createPlayer([], createTarget(["LA"]), { life: 2 });
  const gameState = createGameState(player, enemy);

  const result = resolveBattlePlayAction(gameState, 0, 0);

  assert.ok(result);
  assert.equal(result.damage, 2);
  assert.equal(result.damageSource, "ALVO TESTE");
  assert.equal(result.impactLife, 0);
  assert.equal(result.completedSlot, 0);
  assert.equal(result.winner, 0);
  assert.deepEqual(result.drawnCards, ["BA"]);
  assert.deepEqual(result.nextPlayers[0].hand, ["BA"]);
  assert.deepEqual(result.nextPlayers[0].syllableDeck, ["NA"]);
});

test("resolveBattleMulliganAction devolve cartas escolhidas ao deck e recompra ate o tamanho pedido", () => {
  const player = createPlayer(
    ["BA", "NA", "ME"],
    createTarget(["BA"]),
    { syllableDeck: ["LO", "CA"] },
  );
  const enemy = createPlayer([], createTarget(["TU"]));
  const gameState = createGameState(player, enemy);

  const result = resolveBattleMulliganAction(gameState, 0, [0, 2], 3);

  assert.deepEqual(result.returnedCards, ["ME", "BA"]);
  assert.deepEqual(result.drawnCards, ["LO", "CA"]);
  assert.deepEqual(result.nextPlayers[0].hand, ["NA", "LO", "CA"]);
  assert.equal(result.nextPlayers[0].mulliganUsedThisRound, true);
});
