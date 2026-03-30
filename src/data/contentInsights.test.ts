import assert from "node:assert/strict";
import test from "node:test";
import { Deck } from "../types/game";
import {
  compareDeckMetrics,
  formatRarityBreakdown,
  getDeckContentMetrics,
  getDeckContentWarnings,
  getDeckRelativeChecks,
  getDeckSyllableBottlenecks,
  getDeckTargetCompetition,
} from "./contentInsights";

const createDeck = (overrides: Partial<Deck> = {}): Deck => ({
  id: "deck-test",
  name: "Deck Teste",
  description: "Deck de teste.",
  emoji: "🧪",
  color: "from-slate-700 to-slate-900",
  syllables: {
    BA: 2,
    NA: 2,
    LO: 2,
    BO: 2,
  },
  targets: [
    { id: "banana", name: "BANANA", emoji: "🍌", syllables: ["BA", "NA", "NA"], rarity: "raro" },
    { id: "lobo", name: "LOBO", emoji: "🐺", syllables: ["LO", "BO"], rarity: "comum" },
  ],
  ...overrides,
});

test("getDeckContentMetrics resume o deck final consumido pelo runtime", () => {
  const deck = createDeck({
    syllables: {
      BA: 4,
      NA: 3,
      LO: 3,
      BO: 3,
    },
  });

  const metrics = getDeckContentMetrics(deck);

  assert.equal(metrics.totalSyllables, 13);
  assert.equal(metrics.uniqueSyllables, 4);
  assert.equal(metrics.averageCopiesPerSyllable, 3.25);
  assert.equal(metrics.longestTargetLength, 3);
  assert.equal(metrics.averageDamage, 1.5);
  assert.equal(metrics.rarityCounts.comum, 1);
  assert.equal(metrics.rarityCounts.raro, 1);
});

test("getDeckContentWarnings gera avisos claros para perfis mais arriscados", () => {
  const deck = createDeck({
    syllables: {
      TU: 2,
      BA: 2,
      RAO: 2,
      ES: 2,
      COR: 2,
      PI: 2,
      AO: 2,
    },
    targets: [
      { id: "tubarao", name: "TUBARAO", emoji: "🦈", syllables: ["TU", "BA", "RAO"], rarity: "épico" },
      { id: "escorpiao", name: "ESCORPIAO", emoji: "🦂", syllables: ["ES", "COR", "PI", "AO"], rarity: "épico" },
    ],
  });

  const warnings = getDeckContentWarnings(deck);

  assert.ok(warnings.some((warning) => warning.id === "long-target"));
  assert.ok(warnings.some((warning) => warning.id === "damage-profile"));
  assert.ok(warnings.some((warning) => warning.id === "thin-syllable-pool"));
});

test("getDeckSyllableBottlenecks destaca silabas com alta pressao no catalogo interno", () => {
  const deck = createDeck({
    syllables: {
      BA: 2,
      NA: 2,
      BO: 1,
      LO: 3,
      LA: 1,
    },
    targets: [
      { id: "banana", name: "BANANA", emoji: "🍌", syllables: ["BA", "NA", "NA"], rarity: "raro" },
      { id: "bolo", name: "BOLO", emoji: "🍰", syllables: ["BO", "LO"], rarity: "comum" },
      { id: "bala", name: "BALA", emoji: "🍬", syllables: ["BA", "LA"], rarity: "comum" },
    ],
  });

  const bottlenecks = getDeckSyllableBottlenecks(deck);

  assert.ok(bottlenecks.some((entry) => entry.syllable === "NA"));
  const naEntry = bottlenecks.find((entry) => entry.syllable === "NA");
  assert.equal(naEntry?.requiredAcrossTargets, 2);
  assert.equal(naEntry?.availableCopies, 2);
  assert.ok(bottlenecks.some((entry) => entry.syllable === "BO"));
});

test("getDeckTargetCompetition sinaliza targets que disputam o mesmo pool de silabas", () => {
  const deck = createDeck({
    syllables: {
      BA: 2,
      NA: 2,
      BO: 2,
      LO: 2,
      CA: 2,
    },
    targets: [
      { id: "banana", name: "BANANA", emoji: "🍌", syllables: ["BA", "NA", "NA"], rarity: "raro" },
      { id: "barco", name: "BARCO", emoji: "⛵", syllables: ["BA", "CA"], rarity: "comum" },
      { id: "bolo", name: "BOLO", emoji: "🍰", syllables: ["BO", "LO"], rarity: "comum" },
    ],
  });

  const competition = getDeckTargetCompetition(deck);
  const banana = competition.find((entry) => entry.targetId === "banana");

  assert.ok(banana);
  assert.ok(banana?.sharedSyllables.includes("BA"));
  assert.ok(banana?.competingTargets.includes("BARCO"));
  assert.ok((banana?.pressureScore ?? 0) >= 1);
});

test("getDeckTargetCompetition distingue instancias duplicadas quando copies gera targets repetidos", () => {
  const deck = createDeck({
    syllables: {
      VA: 4,
      CA: 4,
      LO: 3,
    },
    targets: [
      { id: "vaca", name: "VACA", emoji: "🐮", syllables: ["VA", "CA"], rarity: "comum" },
      { id: "vaca", name: "VACA", emoji: "🐮", syllables: ["VA", "CA"], rarity: "comum" },
      { id: "cavalo", name: "CAVALO", emoji: "🐴", syllables: ["CA", "VA", "LO"], rarity: "raro" },
    ],
  });

  const competition = getDeckTargetCompetition(deck);

  assert.ok(competition.some((entry) => entry.instanceKey === "vaca-0" && entry.targetName === "VACA #1"));
  assert.ok(competition.some((entry) => entry.instanceKey === "vaca-1" && entry.targetName === "VACA #2"));
  assert.ok(
    competition.some(
      (entry) => entry.targetId === "cavalo" && entry.competingTargets.includes("VACA #1") && entry.competingTargets.includes("VACA #2"),
    ),
  );
});

test("getDeckRelativeChecks compara o deck contra o catalogo real", () => {
  const aggressiveDeck = createDeck({
    id: "aggressive",
    name: "Agressivo",
    syllables: {
      BA: 2,
      NA: 2,
      RA: 2,
      TO: 2,
    },
    targets: [
      { id: "dragao", name: "DRAGAO", emoji: "🐉", syllables: ["DRA", "GAO"], rarity: "lendário" },
      { id: "tornado", name: "TORNADO", emoji: "🌪️", syllables: ["TOR", "NA", "DO"], rarity: "épico" },
    ],
  });
  const steadyDeck = createDeck({
    id: "steady",
    name: "Estavel",
    syllables: {
      BA: 4,
      NA: 4,
      LO: 4,
      BO: 4,
    },
  });

  const checks = getDeckRelativeChecks(aggressiveDeck, [aggressiveDeck, steadyDeck]);

  assert.ok(checks.some((check) => check.id === "relative-damage"));
});

test("compareDeckMetrics expande comparacao entre decks para a UI dev-only", () => {
  const baseDeck = createDeck({
    id: "base",
    syllables: {
      BA: 4,
      NA: 3,
      LO: 3,
      BO: 3,
    },
  });
  const compareDeck = createDeck({
    id: "compare",
    syllables: {
      BA: 2,
      NA: 2,
      LO: 2,
      BO: 2,
    },
  });

  const comparison = compareDeckMetrics(baseDeck, compareDeck);
  const totalSyllables = comparison.find((entry) => entry.id === "total-syllables");

  assert.ok(totalSyllables);
  assert.equal(totalSyllables?.baseValue, 13);
  assert.equal(totalSyllables?.compareValue, 8);
  assert.equal(totalSyllables?.delta, 5);
  assert.equal(totalSyllables?.deltaDisplay, "+5");
});

test("formatRarityBreakdown compacta a distribuicao de raridade para a UI", () => {
  const formatted = formatRarityBreakdown({
    comum: 1,
    raro: 2,
    épico: 0,
    lendário: 0,
  });

  assert.equal(formatted, "COMUM: 1 • RARO: 2");
});
