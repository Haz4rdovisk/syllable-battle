import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_CATALOG,
  getCardsForDeck,
  getCatalogCardById,
  getCatalogDeckById,
  getCatalogTargetById,
  getDecksUsingCard,
  getMostReusedCards,
  getSharedTargetsBetweenDecks,
  getTargetInstancesForDeck,
  getTargetsForDeck,
  getTargetsUsingCard,
} from "./content";

test("selectors básicos resolvem deck, target e card por id", () => {
  const farmDeck = getCatalogDeckById(CONTENT_CATALOG, "farm");
  const vacaTarget = getCatalogTargetById(CONTENT_CATALOG, "vaca");
  const vaCard = getCatalogCardById(CONTENT_CATALOG, "syllable.va");

  assert.equal(farmDeck?.id, "farm");
  assert.equal(vacaTarget?.id, "vaca");
  assert.equal(vaCard?.syllable, "VA");
});

test("getTargetsForDeck expõe definitions únicas e getTargetInstancesForDeck expõe instâncias do deck", () => {
  const farmTargets = getTargetsForDeck(CONTENT_CATALOG, "farm");
  const farmTargetInstances = getTargetInstancesForDeck(CONTENT_CATALOG, "farm");
  const farmCards = getCardsForDeck(CONTENT_CATALOG, "farm");
  const vaEntry = farmCards.find((entry) => entry.card.id === "syllable.va");

  assert.equal(farmTargets.length, 6);
  assert.equal(farmTargetInstances.length, 6);
  assert.ok(vaEntry);
  assert.equal(vaEntry?.copiesInDeck, 4);
  assert.ok(vaEntry?.usedByTargets.some((target) => target.id === "vaca"));
  assert.ok(vaEntry?.usedByTargets.some((target) => target.id === "cavalo"));
});

test("selectors separam definitions únicas de instâncias duplicadas por copies", () => {
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

test("getTargetsUsingCard e getDecksUsingCard relacionam cards com targets e decks", () => {
  const targetsUsingRao = getTargetsUsingCard(CONTENT_CATALOG, "syllable.rao");
  const decksUsingRao = getDecksUsingCard(CONTENT_CATALOG, "syllable.rao");

  assert.ok(targetsUsingRao.some((target) => target.id === "tubarao"));
  assert.ok(targetsUsingRao.some((target) => target.id === "camarao"));
  assert.deepEqual(
    decksUsingRao.map((deck) => deck.id).sort(),
    ["ocean"],
  );
});

test("getMostReusedCards destaca cartas canônicas mais reaproveitadas no catálogo", () => {
  const mostReusedCards = getMostReusedCards(CONTENT_CATALOG, 3);

  assert.equal(mostReusedCards.length, 3);
  assert.ok(mostReusedCards[0].deckCount >= mostReusedCards[1].deckCount);
  assert.ok(mostReusedCards[0].targetCount >= 1);
});

test("getSharedTargetsBetweenDecks retorna vazio quando o catálogo atual não compartilha targets por id", () => {
  const sharedFarmTargets = getSharedTargetsBetweenDecks(CONTENT_CATALOG, "farm");

  assert.deepEqual(sharedFarmTargets, []);
});
