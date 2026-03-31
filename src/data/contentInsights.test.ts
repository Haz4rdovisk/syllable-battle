import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRarity, Rarity } from "../types/game";
import { adaptDeckModelToRuntimeDeck, CONTENT_CATALOG, DECK_MODELS_BY_ID } from "./content";
import {
  compareDeckMetrics,
  formatRarityBreakdown,
  getDeckContentMetrics,
  getDeckContentWarnings,
  getDeckRelativeChecks,
  getDeckSyllableBottlenecks,
  getDeckTargetCompetition,
} from "./contentInsights";
import { DeckModel, DeckVisualThemeId } from "./content/types";

interface TargetSeed {
  id: string;
  name: string;
  emoji: string;
  syllables: string[];
  rarity: Rarity;
  description?: string;
}

const createDeckModel = (
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    emoji: string;
    visualTheme: DeckVisualThemeId;
    syllables: Record<string, number>;
    targets: TargetSeed[];
  }> = {},
): DeckModel => {
  const id = overrides.id ?? "deck-test";
  const name = overrides.name ?? "Deck Teste";
  const description = overrides.description ?? "Deck de teste.";
  const emoji = overrides.emoji ?? "T";
  const visualTheme = overrides.visualTheme ?? "harvest";
  const syllables = overrides.syllables ?? {
    BA: 2,
    NA: 2,
    LO: 2,
    BO: 2,
  };
  const targets = overrides.targets ?? [
    { id: "banana", name: "BANANA", emoji: "B", syllables: ["BA", "NA", "NA"], rarity: "raro" },
    { id: "lobo", name: "LOBO", emoji: "L", syllables: ["LO", "BO"], rarity: "comum" },
  ];

  const cards = Object.entries(syllables).map(([syllable, copiesInDeck]) => ({
    cardId: `syllable.${syllable.toLowerCase()}`,
    card: {
      id: `syllable.${syllable.toLowerCase()}`,
      syllable,
    },
    copiesInDeck,
  }));
  const cardsBySyllable = new Map(cards.map((entry) => [entry.card.syllable, entry.card.id]));
  const targetDefinitions = targets.map((target) => ({
    id: target.id,
    name: target.name,
    emoji: target.emoji,
    cardIds: target.syllables.map((syllable) => cardsBySyllable.get(syllable) ?? `syllable.${syllable.toLowerCase()}`),
    rarity: target.rarity,
    description: target.description,
  }));
  const definition = {
    id,
    name,
    description,
    emoji,
    visualTheme,
    cardIds: cards.map((entry) => entry.card.id),
    cardPool: Object.fromEntries(cards.map((entry) => [entry.card.id, entry.copiesInDeck])),
    targetIds: targetDefinitions.map((target) => target.id),
  };

  return {
    id,
    definition,
    cards: cards.map((entry) => ({
      ...entry,
      usedByTargets: targetDefinitions.filter((target) => target.cardIds.includes(entry.card.id)),
    })),
    targetDefinitions,
    targetInstances: targetDefinitions.map((target, instanceIndex) => ({
      instanceKey: `${target.id}-${instanceIndex}`,
      instanceIndex,
      targetId: target.id,
      target,
    })),
  };
};

test("getDeckContentMetrics resume o deck model central fora da battle", () => {
  const deckModel = createDeckModel({
    syllables: {
      BA: 4,
      NA: 3,
      LO: 3,
      BO: 3,
    },
  });

  const metrics = getDeckContentMetrics(deckModel);

  assert.equal(metrics.totalSyllables, 13);
  assert.equal(metrics.uniqueSyllables, 4);
  assert.equal(metrics.averageCopiesPerSyllable, 3.25);
  assert.equal(metrics.longestTargetLength, 3);
  assert.equal(metrics.averageDamage, 1.5);
  assert.equal(metrics.rarityCounts.comum, 1);
  assert.equal(metrics.rarityCounts.raro, 1);
});

test("getDeckContentWarnings gera avisos claros para deck model com perfil arriscado", () => {
  const deckModel = createDeckModel({
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
      { id: "tubarao", name: "TUBARAO", emoji: "S", syllables: ["TU", "BA", "RAO"], rarity: "epico" as Rarity },
      { id: "escorpiao", name: "ESCORPIAO", emoji: "E", syllables: ["ES", "COR", "PI", "AO"], rarity: "epico" as Rarity },
    ],
  });

  const warnings = getDeckContentWarnings(deckModel);

  assert.ok(warnings.some((warning) => warning.id === "long-target"));
  assert.ok(warnings.some((warning) => warning.id === "damage-profile"));
  assert.ok(warnings.some((warning) => warning.id === "thin-syllable-pool"));
});

test("getDeckSyllableBottlenecks destaca silabas com alta pressao no deck model", () => {
  const deckModel = createDeckModel({
    syllables: {
      BA: 2,
      NA: 2,
      BO: 1,
      LO: 3,
      LA: 1,
    },
    targets: [
      { id: "banana", name: "BANANA", emoji: "B", syllables: ["BA", "NA", "NA"], rarity: "raro" },
      { id: "bolo", name: "BOLO", emoji: "O", syllables: ["BO", "LO"], rarity: "comum" },
      { id: "bala", name: "BALA", emoji: "A", syllables: ["BA", "LA"], rarity: "comum" },
    ],
  });

  const bottlenecks = getDeckSyllableBottlenecks(deckModel);

  assert.ok(bottlenecks.some((entry) => entry.syllable === "NA"));
  const naEntry = bottlenecks.find((entry) => entry.syllable === "NA");
  assert.equal(naEntry?.requiredAcrossTargets, 2);
  assert.equal(naEntry?.availableCopies, 2);
  assert.ok(bottlenecks.some((entry) => entry.syllable === "BO"));
});

test("getDeckTargetCompetition sinaliza disputa entre targets usando deck model", () => {
  const deckModel = createDeckModel({
    syllables: {
      BA: 2,
      NA: 2,
      BO: 2,
      LO: 2,
      CA: 2,
    },
    targets: [
      { id: "banana", name: "BANANA", emoji: "B", syllables: ["BA", "NA", "NA"], rarity: "raro" },
      { id: "barco", name: "BARCO", emoji: "R", syllables: ["BA", "CA"], rarity: "comum" },
      { id: "bolo", name: "BOLO", emoji: "O", syllables: ["BO", "LO"], rarity: "comum" },
    ],
  });

  const competition = getDeckTargetCompetition(deckModel);
  const banana = competition.find((entry) => entry.targetId === "banana");

  assert.ok(banana);
  assert.ok(banana?.sharedSyllables.includes("BA"));
  assert.ok(banana?.competingTargets.includes("BARCO"));
  assert.ok((banana?.pressureScore ?? 0) >= 1);
});

test("getDeckTargetCompetition distingue instancias duplicadas quando copies gera targets repetidos", () => {
  const duplicatedDeckModel = createDeckModel({
    syllables: {
      VA: 4,
      CA: 4,
      LO: 3,
    },
    targets: [
      { id: "vaca", name: "VACA", emoji: "V", syllables: ["VA", "CA"], rarity: "comum" },
      { id: "vaca", name: "VACA", emoji: "V", syllables: ["VA", "CA"], rarity: "comum" },
      { id: "cavalo", name: "CAVALO", emoji: "C", syllables: ["CA", "VA", "LO"], rarity: "raro" },
    ],
  });

  const competition = getDeckTargetCompetition(duplicatedDeckModel);

  assert.ok(competition.some((entry) => entry.instanceKey === "vaca-0" && entry.targetName === "VACA #1"));
  assert.ok(competition.some((entry) => entry.instanceKey === "vaca-1" && entry.targetName === "VACA #2"));
  assert.ok(
    competition.some(
      (entry) =>
        entry.targetId === "cavalo" &&
        entry.competingTargets.includes("VACA #1") &&
        entry.competingTargets.includes("VACA #2"),
    ),
  );
});

test("getDeckRelativeChecks compara deck models contra o catalogo central", () => {
  const aggressiveDeck = createDeckModel({
    id: "aggressive",
    name: "Agressivo",
    syllables: {
      DRA: 2,
      GAO: 2,
      TOR: 2,
      NA: 2,
      DO: 2,
    },
    targets: [
      { id: "dragao", name: "DRAGAO", emoji: "D", syllables: ["DRA", "GAO"], rarity: "lendario" as Rarity },
      { id: "tornado", name: "TORNADO", emoji: "T", syllables: ["TOR", "NA", "DO"], rarity: "epico" as Rarity },
    ],
  });
  const steadyDeck = createDeckModel({
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

test("compareDeckMetrics expande comparacao entre deck models para a UI dev-only", () => {
  const baseDeck = createDeckModel({
    id: "base",
    syllables: {
      BA: 4,
      NA: 3,
      LO: 3,
      BO: 3,
    },
  });
  const compareDeck = createDeckModel({
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

test("insights mantem compatibilidade com Deck legado quando preciso", () => {
  const deckModel = DECK_MODELS_BY_ID.farm;
  const runtimeDeck = adaptDeckModelToRuntimeDeck(deckModel, CONTENT_CATALOG);

  assert.deepEqual(getDeckContentMetrics(runtimeDeck), getDeckContentMetrics(deckModel));
});

test("formatRarityBreakdown compacta a distribuicao de raridade para a UI", () => {
  const epic = normalizeRarity("epico");
  const legendary = normalizeRarity("lendario");
  const formatted = formatRarityBreakdown({
    comum: 1,
    raro: 2,
    [epic]: 0,
    [legendary]: 0,
  } as Record<Rarity, number>);

  assert.equal(formatted, "COMUM: 1 • RARO: 2");
});
