import assert from "node:assert/strict";
import test from "node:test";
import { CONFIG } from "../logic/gameLogic";
import { DeckContentError, DECKS, loadDeckCatalog } from "./content";
import { RawDeckDefinition } from "./content/types";

test("DECKS expõe um catálogo válido e utilizável pelo runtime atual", () => {
  assert.ok(DECKS.length >= 4);

  const deckIds = new Set<string>();
  DECKS.forEach((deck) => {
    assert.ok(deck.id.length > 0);
    assert.ok(!deckIds.has(deck.id));
    deckIds.add(deck.id);

    const totalSyllables = Object.values(deck.syllables).reduce((sum, count) => sum + count, 0);
    assert.ok(totalSyllables >= CONFIG.handSize);
    assert.ok(deck.targets.length >= CONFIG.targetsInPlay);

    const targetIds = new Set<string>();
    deck.targets.forEach((target) => {
      assert.ok(target.id.length > 0);
      assert.ok(!targetIds.has(target.id));
      targetIds.add(target.id);
      target.syllables.forEach((syllable) => {
        assert.ok(deck.syllables[syllable] > 0);
      });
    });
  });
});

test("loadDeckCatalog rejeita targets impossíveis de completar com as sílabas do deck", () => {
  const invalidDeck: RawDeckDefinition = {
    id: "broken",
    name: "Quebrado",
    description: "Deck inválido para teste.",
    emoji: "🧪",
    visualTheme: "harvest",
    syllables: {
      BA: 2,
    },
    targets: [
      {
        id: "banana",
        name: "BANANA",
        emoji: "🍌",
        syllables: ["BA", "NA", "NA"],
        rarity: "raro",
      },
      {
        id: "bala",
        name: "BALA",
        emoji: "🍬",
        syllables: ["BA", "LA"],
        rarity: "comum",
      },
    ],
  };

  assert.throws(
    () => loadDeckCatalog([invalidDeck]),
    (error: unknown) =>
      error instanceof DeckContentError &&
      error.issues.some((issue) => issue.includes('target "banana" needs 2x "NA"')),
  );
});

test("loadDeckCatalog rejeita deck com poucos targets para o board atual", () => {
  const invalidDeck: RawDeckDefinition = {
    id: "tiny",
    name: "Minúsculo",
    description: "Deck inválido para teste.",
    emoji: "🧩",
    visualTheme: "abyss",
    syllables: {
      TI: 3,
      NY: 3,
      TO: 3,
    },
    targets: [
      {
        id: "tiny-target",
        name: "TINY",
        emoji: "🔹",
        syllables: ["TI", "NY"],
        rarity: "comum",
      },
    ],
  };

  assert.throws(
    () => loadDeckCatalog([invalidDeck]),
    (error: unknown) =>
      error instanceof DeckContentError &&
      error.issues.some((issue) => issue.includes(`at least ${CONFIG.targetsInPlay} targets`)),
  );
});
