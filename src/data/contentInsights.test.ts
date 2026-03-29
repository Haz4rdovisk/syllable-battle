import assert from "node:assert/strict";
import test from "node:test";
import { Deck } from "../types/game";
import {
  formatRarityBreakdown,
  getDeckContentMetrics,
  getDeckContentWarnings,
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
    RA: 2,
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

test("formatRarityBreakdown compacta a distribuição de raridade para a UI", () => {
  const formatted = formatRarityBreakdown({
    comum: 1,
    raro: 2,
    épico: 0,
    lendário: 0,
  });

  assert.equal(formatted, "COMUM: 1 • RARO: 2");
});
