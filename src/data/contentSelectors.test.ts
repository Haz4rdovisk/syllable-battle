import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_CATALOG_BY_ID,
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  DECK_MODELS,
  DECK_MODELS_BY_ID,
  getCardsForDeck,
  getCardCatalogEntriesForDeckModel,
  getCardCatalogEntryById,
  getCardsForDeckModel,
  getCatalogCardById,
  getCatalogDeckById,
  getCatalogTargetById,
  getDeckModelById,
  getDeckModelsUsingCard,
  getDecksUsingCard,
  getMostReusedCards,
  getSharedTargetsBetweenDeckModels,
  getSharedTargetsBetweenDecks,
  getTargetInstancesForDeck,
  getTargetInstancesForDeckModel,
  getTargetsForDeck,
  getTargetsForDeckModel,
  getTargetsUsingCard,
} from "./content";

test("selectors basicos resolvem deck, target, card e deck model por id", () => {
  const farmDeck = getCatalogDeckById(CONTENT_CATALOG, "farm");
  const farmDeckModel = getDeckModelById(DECK_MODELS_BY_ID, "farm");
  const vacaTarget = getCatalogTargetById(CONTENT_CATALOG, "vaca");
  const vaCard = getCatalogCardById(CONTENT_CATALOG, "syllable.va");
  const vaCardCatalogEntry = getCardCatalogEntryById(CARD_CATALOG_BY_ID, "syllable.va");

  assert.equal(farmDeck?.id, "farm");
  assert.equal(farmDeckModel?.id, "farm");
  assert.equal(vacaTarget?.id, "vaca");
  assert.equal(vaCard?.syllable, "VA");
  assert.equal(vaCardCatalogEntry?.card.id, "syllable.va");
});

test("selectors deck model-first expoem definitions, instancias e cards do deck", () => {
  const farmDeckModel = DECK_MODELS_BY_ID.farm;
  const farmTargets = getTargetsForDeckModel(farmDeckModel);
  const farmTargetInstances = getTargetInstancesForDeckModel(farmDeckModel);
  const farmCards = getCardsForDeckModel(farmDeckModel);
  const farmCardCatalogEntries = getCardCatalogEntriesForDeckModel(CARD_CATALOG_BY_ID, farmDeckModel);
  const vaEntry = farmCards.find((entry) => entry.card.id === "syllable.va");

  assert.equal(farmTargets.length, 6);
  assert.equal(farmTargetInstances.length, 6);
  assert.deepEqual(
    farmCardCatalogEntries.map((entry) => entry.id),
    farmDeckModel.definition.cardIds,
  );
  assert.ok(vaEntry);
  assert.equal(vaEntry?.copiesInDeck, 4);
  assert.ok(vaEntry?.usedByTargets.some((target) => target.id === "vaca"));
  assert.ok(vaEntry?.usedByTargets.some((target) => target.id === "cavalo"));
});

test("wrappers por deckId continuam compativeis com o catalogo normalizado", () => {
  const farmTargets = getTargetsForDeck(CONTENT_CATALOG, "farm");
  const farmTargetInstances = getTargetInstancesForDeck(CONTENT_CATALOG, "farm");
  const farmCards = getCardsForDeck(CONTENT_CATALOG, "farm");

  assert.deepEqual(
    farmTargets.map((target) => target.id),
    getTargetsForDeckModel(DECK_MODELS_BY_ID.farm).map((target) => target.id),
  );
  assert.deepEqual(
    farmTargetInstances.map((entry) => entry.instanceKey),
    getTargetInstancesForDeckModel(DECK_MODELS_BY_ID.farm).map((entry) => entry.instanceKey),
  );
  assert.deepEqual(
    farmCards.map((entry) => [entry.card.id, entry.copiesInDeck]),
    getCardsForDeckModel(DECK_MODELS_BY_ID.farm).map((entry) => [entry.card.id, entry.copiesInDeck]),
  );
});

test("selectors separam definitions unicas de instancias duplicadas por copies", () => {
  const catalog = {
    ...CONTENT_CATALOG,
    decks: CONTENT_CATALOG.decks.map((deck) =>
      deck.id === "farm" ? { ...deck, targetIds: ["vaca", "vaca", "porco"] } : deck,
    ),
    decksById: {
      ...CONTENT_CATALOG.decksById,
      farm: {
        ...CONTENT_CATALOG.decksById.farm,
        targetIds: ["vaca", "vaca", "porco"],
      },
    },
  };

  const farmTargetDefinitions = getTargetsForDeck(catalog, "farm");
  const farmTargetInstances = getTargetInstancesForDeck(catalog, "farm");

  assert.deepEqual(
    farmTargetDefinitions.map((target) => target.id),
    ["vaca", "porco"],
  );
  assert.deepEqual(
    farmTargetInstances.map((entry) => entry.target.id),
    ["vaca", "vaca", "porco"],
  );
  assert.deepEqual(
    farmTargetInstances.map((entry) => entry.instanceKey),
    ["vaca-0", "vaca-1", "porco-2"],
  );
});

test("selectors relacionam cards com targets, deck models e deck definitions", () => {
  const targetsUsingRao = getTargetsUsingCard(CONTENT_CATALOG, "syllable.rao");
  const deckModelsUsingRao = getDeckModelsUsingCard(DECK_MODELS, "syllable.rao");
  const decksUsingRao = getDecksUsingCard(CONTENT_CATALOG, "syllable.rao");

  assert.ok(targetsUsingRao.some((target) => target.id === "tubarao"));
  assert.ok(targetsUsingRao.some((target) => target.id === "camarao"));
  assert.deepEqual(
    deckModelsUsingRao.map((deck) => deck.id).sort(),
    ["ocean"],
  );
  assert.deepEqual(
    decksUsingRao.map((deck) => deck.id).sort(),
    ["ocean"],
  );
});

test("getMostReusedCards destaca cartas canonicas mais reaproveitadas no catalogo", () => {
  const mostReusedCards = getMostReusedCards(CONTENT_CATALOG, DECK_MODELS, 3);

  assert.equal(mostReusedCards.length, 3);
  assert.ok(mostReusedCards[0].deckCount >= mostReusedCards[1].deckCount);
  assert.ok(mostReusedCards[0].targetCount >= 1);
});

test("shared targets via deck model continuam vazios no catalogo atual", () => {
  const sharedFarmTargetsFromDeckModels = getSharedTargetsBetweenDeckModels(
    DECK_MODELS_BY_ID.farm,
    CONTENT_PIPELINE.deckModels,
  );
  const sharedFarmTargets = getSharedTargetsBetweenDecks(CONTENT_CATALOG, "farm");

  assert.deepEqual(sharedFarmTargetsFromDeckModels, []);
  assert.deepEqual(sharedFarmTargets, []);
});
