import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_RESOLVED_DECKS,
  APP_RESOLVED_DECKS_BY_ID,
  getFirstResolvedDeck,
  getFallbackResolvedEnemyDeck,
  resolveAppBattleDeckSelection,
  resolveAppDeckPair,
  resolveAppDeck,
} from "../app/appDeckResolver";
import { CONFIG } from "../logic/gameLogic";
import {
  CARD_CATALOG,
  CARD_CATALOG_BY_ID,
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  DeckContentError,
  DECKS,
  DECK_MODELS,
  DECK_MODELS_BY_ID,
  RUNTIME_DECKS_BY_ID,
  adaptDeckModelsToRuntimeDecks,
  buildCardCatalog,
  buildDeckModels,
  loadContentCatalog,
  loadDeckCatalog,
} from "./content";
import { RawDeckDefinition } from "./content/types";

test("CONTENT_CATALOG expõe o catálogo normalizado como fonte de verdade", () => {
  assert.ok(CONTENT_CATALOG.cards.length > 0);
  assert.ok(CONTENT_CATALOG.targets.length >= DECKS.length * CONFIG.targetsInPlay);
  assert.equal(CONTENT_PIPELINE.catalog, CONTENT_CATALOG);
  assert.equal(CONTENT_PIPELINE.cardCatalog, CARD_CATALOG);
  assert.equal(CONTENT_PIPELINE.deckModels, DECK_MODELS);
  assert.equal(CONTENT_PIPELINE.runtimeDecks, DECKS);
  assert.equal(CONTENT_PIPELINE.cardCatalogById, CARD_CATALOG_BY_ID);
  assert.equal(CONTENT_PIPELINE.deckModelsById, DECK_MODELS_BY_ID);
  assert.equal(CONTENT_PIPELINE.runtimeDecksById, RUNTIME_DECKS_BY_ID);

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
    deck.cardIds.forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
      assert.ok(cardId in deck.cardPool);
    });
    deck.targetIds.forEach((targetId) => {
      assert.ok(CONTENT_CATALOG.targetsById[targetId]);
    });
    Object.keys(deck.cardPool).forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
    });
  });
});

test("deck models explicitam a fronteira catalogo -> deck model -> runtime legado", () => {
  const deckModels = buildDeckModels(CONTENT_CATALOG);
  const runtimeDecks = adaptDeckModelsToRuntimeDecks(deckModels, CONTENT_CATALOG);

  assert.deepEqual(runtimeDecks, DECKS);
  assert.equal(deckModels.length, CONTENT_CATALOG.decks.length);

  deckModels.forEach((deckModel) => {
    assert.equal(deckModel.definition, CONTENT_CATALOG.decksById[deckModel.id]);
    assert.equal(DECK_MODELS_BY_ID[deckModel.id], CONTENT_PIPELINE.deckModelsById[deckModel.id]);
    assert.equal(RUNTIME_DECKS_BY_ID[deckModel.id], DECKS.find((deck) => deck.id === deckModel.id));
    assert.deepEqual(
      [...deckModel.cards.map((entry) => entry.cardId)].sort(),
      [...deckModel.definition.cardIds].sort(),
    );
    assert.deepEqual(
      deckModel.targetInstances.map((entry) => entry.targetId),
      deckModel.definition.targetIds,
    );

    deckModel.cards.forEach((entry) => {
      assert.equal(entry.card, CONTENT_CATALOG.cardsById[entry.cardId]);
      assert.equal(deckModel.definition.cardPool[entry.cardId], entry.copiesInDeck);
    });
  });
});

test("card catalog explicita cartas canonicas como entidade central do pipeline", () => {
  const rebuiltCardCatalog = buildCardCatalog(CONTENT_CATALOG);

  assert.deepEqual(rebuiltCardCatalog, CARD_CATALOG);
  assert.equal(CARD_CATALOG.length, CONTENT_CATALOG.cards.length);

  CARD_CATALOG.forEach((entry) => {
    assert.equal(CARD_CATALOG_BY_ID[entry.id], entry);
    assert.equal(entry.card, CONTENT_CATALOG.cardsById[entry.id]);
    assert.ok(entry.deckIds.length >= 1);
    assert.ok(entry.targetIds.length >= 1);
    assert.equal(
      entry.totalCopies,
      entry.deckIds.reduce((sum, deckId) => sum + (entry.copiesByDeckId[deckId] ?? 0), 0),
    );
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
  assert.deepEqual(catalog.decks[0]?.cardIds, ["syllable.ba", "syllable.na"]);
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

test("app deck resolver explicita a ultima ponte entre deck model e runtime legado", () => {
  assert.equal(APP_RESOLVED_DECKS.length, DECK_MODELS.length);

  APP_RESOLVED_DECKS.forEach((entry) => {
    assert.equal(APP_RESOLVED_DECKS_BY_ID[entry.deckId], entry);
    assert.equal(resolveAppDeck(entry.deckId), entry);
    assert.equal(entry.deckModel, DECK_MODELS_BY_ID[entry.deckId]);
    assert.equal(entry.runtimeDeck, RUNTIME_DECKS_BY_ID[entry.deckId]);
    assert.equal(entry.definition, entry.deckModel.definition);
    assert.equal(entry.name, entry.deckModel.definition.name);
    assert.equal(entry.description, entry.deckModel.definition.description);
    assert.equal(entry.emoji, entry.deckModel.definition.emoji);
    assert.equal(entry.visualTheme, entry.deckModel.definition.visualTheme);
    assert.equal(entry.runtimeColorClass, entry.runtimeDeck.color);
    assert.equal(entry.targetCardCount, entry.deckModel.targetInstances.length);
    assert.equal(
      entry.syllableReserveCount,
      entry.deckModel.cards.reduce((total, cardEntry) => total + cardEntry.copiesInDeck, 0),
    );
    assert.deepEqual(entry.previewTargets, entry.deckModel.targetInstances.slice(0, 4));
  });

  const firstResolvedDeck = getFirstResolvedDeck();
  assert.equal(firstResolvedDeck?.deckId, APP_RESOLVED_DECKS[0]?.deckId);
  assert.deepEqual(
    resolveAppDeckPair(APP_RESOLVED_DECKS[0]?.deckId, APP_RESOLVED_DECKS[1]?.deckId),
    APP_RESOLVED_DECKS.length >= 2
      ? {
          localDeck: APP_RESOLVED_DECKS[0],
          remoteDeck: APP_RESOLVED_DECKS[1],
        }
      : null,
  );
  assert.equal(getFallbackResolvedEnemyDeck("multiplayer")?.deckId, getFirstResolvedDeck()?.deckId);
  assert.equal(
    resolveAppBattleDeckSelection("multiplayer", APP_RESOLVED_DECKS[0]?.deckId, APP_RESOLVED_DECKS[1]?.deckId)
      .playerDeck?.deckId,
    APP_RESOLVED_DECKS[0]?.deckId,
  );
});
