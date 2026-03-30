import assert from "node:assert/strict";
import test from "node:test";
import { CONFIG } from "../logic/gameLogic";
import {
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  DeckContentError,
  DECKS,
  loadContentCatalog,
  loadDeckCatalog,
} from "./content";
import { RawDeckDefinition } from "./content/types";

test("CONTENT_CATALOG expõe o catálogo normalizado como fonte de verdade", () => {
  assert.ok(CONTENT_CATALOG.cards.length > 0);
  assert.ok(CONTENT_CATALOG.targets.length >= DECKS.length * CONFIG.targetsInPlay);
  assert.equal(CONTENT_PIPELINE.catalog, CONTENT_CATALOG);
  assert.equal(CONTENT_PIPELINE.runtimeDecks, DECKS);

  CONTENT_CATALOG.cards.forEach((card) => {
    assert.ok(card.id.startsWith("syllable."));
    assert.equal(card.syllable, card.syllable.toUpperCase());
    assert.equal(CONTENT_CATALOG.cardsById[card.id], card);
  });

  CONTENT_CATALOG.targets.forEach((target) => {
    assert.equal(CONTENT_CATALOG.targetsById[target.id], target);
    target.cardIds.forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
    });
  });

  CONTENT_CATALOG.decks.forEach((deck) => {
    assert.equal(CONTENT_CATALOG.decksById[deck.id], deck);
    deck.targetIds.forEach((targetId) => {
      assert.ok(CONTENT_CATALOG.targetsById[targetId]);
    });
    Object.keys(deck.cardPool).forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
    });
  });
});

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

    deck.targets.forEach((target) => {
      assert.ok(target.id.length > 0);
      target.syllables.forEach((syllable) => {
        assert.ok(deck.syllables[syllable] > 0);
      });
    });
  });
});

test("loadContentCatalog normaliza decks em deck definitions e cards canônicos por sílaba", () => {
  const catalog = loadContentCatalog([
    {
      id: "mini",
      name: "Mini",
      description: "Deck mínimo válido.",
      emoji: "🧪",
      visualTheme: "harvest",
      syllables: {
        BA: 3,
        NA: 2,
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
          id: "baba",
          name: "BABA",
          emoji: "🫧",
          syllables: ["BA", "BA"],
          rarity: "comum",
        },
      ],
    },
  ]);

  assert.deepEqual(
    catalog.cards.map((card) => card.syllable).sort(),
    ["BA", "NA"],
  );
  assert.deepEqual(catalog.decks[0]?.targetIds, ["banana", "baba"]);
  assert.deepEqual(catalog.targetsById.banana?.cardIds, ["syllable.ba", "syllable.na", "syllable.na"]);
  assert.equal(catalog.decks[0]?.cardPool["syllable.ba"], 3);
});

test("loadContentCatalog e loadDeckCatalog preservam copies persistido no deck bruto", () => {
  const deckWithCopies: RawDeckDefinition = {
    id: "mini-copies",
    name: "Mini Copies",
    description: "Deck bruto persistido com copies.",
    emoji: "🧪",
    visualTheme: "harvest",
    syllables: {
      BA: 3,
      NA: 2,
      BO: 2,
      LA: 1,
    },
    targets: [
      {
        id: "banana",
        name: "BANANA",
        emoji: "🍌",
        syllables: ["BA", "NA", "NA"],
        rarity: "raro",
        copies: 2,
      },
      {
        id: "bola",
        name: "BOLA",
        emoji: "⚽",
        syllables: ["BO", "LA"],
        rarity: "comum",
      },
    ],
  };

  const catalog = loadContentCatalog([deckWithCopies]);
  const runtimeDecks = loadDeckCatalog([deckWithCopies]);

  assert.deepEqual(catalog.decks[0]?.targetIds, ["banana", "banana", "bola"]);
  assert.equal(runtimeDecks[0]?.targets.filter((target) => target.id === "banana").length, 2);
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
