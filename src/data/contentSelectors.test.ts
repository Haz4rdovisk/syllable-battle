import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_CATALOG_BY_ID,
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  CONTENT_RARITY_ASCENDING,
  CONTENT_RARITY_DESCENDING,
  DECK_MODELS,
  DECK_MODELS_BY_ID,
  createContentCatalogFiltersView,
  createContentCatalogSyllableViews,
  createContentCatalogTargetViews,
  createContentDeckSummaryView,
  createContentTargetView,
  createContentTargetViewFromSyllables,
  filterAndSortContentTargets,
  filterAndSortContentTargetViews,
  formatTaxonomyLabel,
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
  getContentRarityLabel,
  getContentRarityOrder,
  getContentRarityToneClass,
  getMostReusedCards,
  getSharedTargetsBetweenDeckModels,
  getSharedTargetsBetweenDecks,
  getTargetInstancesForDeck,
  getTargetInstancesForDeckModel,
  getTargetsForDeck,
  getTargetsForDeckModel,
  getTargetsUsingCard,
  normalizeTaxonomyValue,
  resolveTargetSyllables,
} from "./content";

test("selectors basicos resolvem deck, target, card e deck model por id", () => {
  const farmDeck = getCatalogDeckById(CONTENT_CATALOG, "fazenda");
  const farmDeckModel = getDeckModelById(DECK_MODELS_BY_ID, "fazenda");
  const vacaTarget = getCatalogTargetById(CONTENT_CATALOG, "vaca");
  const vaCard = getCatalogCardById(CONTENT_CATALOG, "syllable.va");
  const vaCardCatalogEntry = getCardCatalogEntryById(CARD_CATALOG_BY_ID, "syllable.va");

  assert.equal(farmDeck?.id, "fazenda");
  assert.equal(farmDeckModel?.id, "fazenda");
  assert.equal(vacaTarget?.id, "vaca");
  assert.equal(vaCard?.syllable, "VA");
  assert.equal(vaCardCatalogEntry?.card.id, "syllable.va");
});

test("helpers puros normalizam taxonomia e formatam labels de conteudo", () => {
  assert.equal(normalizeTaxonomyValue("  Reino da Água! "), "reino-da-agua");
  assert.equal(normalizeTaxonomyValue("Fazenda"), "fazenda");
  assert.equal(formatTaxonomyLabel("reino-da-agua", "Sem classe"), "Reino Da Agua");
  assert.equal(formatTaxonomyLabel("", "Sem classe"), "Sem classe");
});

test("helpers puros centralizam ordem labels e tons de raridade", () => {
  assert.deepEqual(CONTENT_RARITY_ASCENDING, ["comum", "raro", "épico", "lendário"]);
  assert.deepEqual(CONTENT_RARITY_DESCENDING, ["lendário", "épico", "raro", "comum"]);
  assert.equal(getContentRarityOrder("lendario"), 3);
  assert.equal(getContentRarityOrder("épico"), 2);
  assert.equal(getContentRarityLabel("epico"), "Épico");
  assert.equal(getContentRarityLabel("lendário", { uppercase: true, stripAccents: true }), "LENDARIO");
  assert.equal(getContentRarityToneClass("raro"), "bg-amber-600");
});

test("helpers puros resolvem silabas de target pelo catalogo normalizado", () => {
  const vacaTarget = getCatalogTargetById(CONTENT_CATALOG, "vaca");

  assert.ok(vacaTarget);
  assert.deepEqual(resolveTargetSyllables(vacaTarget, CONTENT_CATALOG), ["VA", "CA"]);
  assert.deepEqual(
    resolveTargetSyllables({ cardIds: ["syllable.va", "missing.card"] }, CONTENT_CATALOG),
    ["VA", "missing.card"],
  );
});

test("helpers puros filtram e ordenam alvos sem depender de draft do editor", () => {
  const oceanTargets = filterAndSortContentTargets(CONTENT_CATALOG.targets, {
    search: "tub",
    superclass: "animal",
    classKey: "oceano",
    rarity: "épico",
    sortMode: "rarity",
    sortDirection: "desc",
    includeNormalizedTaxonomyInSearch: true,
    includeFormattedTaxonomyInSearch: true,
  });
  const farmTargetsByDamage = filterAndSortContentTargets(CONTENT_CATALOG.targets, {
    superclass: "animal",
    classKey: "fazenda",
    sortMode: "damage",
    sortDirection: "desc",
  });

  assert.deepEqual(oceanTargets.map((target) => target.id), ["tubarao"]);
  assert.deepEqual(
    farmTargetsByDamage.slice(0, 3).map((target) => target.id),
    ["cavalo", "galinha", "ovelha"],
  );
});

test("read models constroem ContentTargetView canonico a partir do catalogo normalizado", () => {
  const vacaTarget = getCatalogTargetById(CONTENT_CATALOG, "vaca");

  assert.ok(vacaTarget);

  const targetView = createContentTargetView(vacaTarget, CONTENT_CATALOG, { copies: 2 });

  assert.equal(targetView.id, "vaca");
  assert.equal(targetView.rarity, "comum");
  assert.equal(targetView.damage, 1);
  assert.equal(targetView.rarityView.uppercaseLabel, "COMUM");
  assert.deepEqual(targetView.cardIds, vacaTarget.cardIds);
  assert.deepEqual(targetView.syllables, ["VA", "CA"]);
  assert.equal(targetView.syllableCount, 2);
  assert.equal(targetView.superclassId, "animal");
  assert.equal(targetView.classId, "fazenda");
  assert.equal(targetView.copies, 2);
  assert.equal(targetView.definition, vacaTarget);
});

test("read models aceitam adapter por silabas sem depender de draft ou save do editor", () => {
  const targetView = createContentTargetViewFromSyllables({
    id: "alvo-preview",
    name: "GANSO",
    emoji: "G",
    rarity: "raro",
    syllables: ["gan", "so"],
    superclass: "animal",
    classKey: "fazenda",
    copies: 3,
  });

  assert.deepEqual(targetView.syllables, ["GAN", "SO"]);
  assert.deepEqual(targetView.cardIds, ["GAN", "SO"]);
  assert.equal(targetView.damage, 2);
  assert.equal(targetView.copies, 3);
  assert.equal(targetView.classLabel, "Fazenda");
});

test("read models constroem ContentDeckSummaryView com silabas copias e metricas equivalentes ao deck model", () => {
  const farmDeckModel = DECK_MODELS_BY_ID.fazenda;
  const summary = createContentDeckSummaryView(farmDeckModel);
  const manualTargetCopies = farmDeckModel.targetInstances.reduce<Map<string, number>>((acc, entry) => {
    acc.set(entry.targetId, (acc.get(entry.targetId) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const manualTotalSyllables = farmDeckModel.cards.reduce((sum, entry) => sum + entry.copiesInDeck, 0);
  const vaSyllable = summary.syllables.find((entry) => entry.cardId === "syllable.va");
  const vacaTarget = summary.targets.find((entry) => entry.id === "vaca");

  assert.equal(summary.id, farmDeckModel.id);
  assert.deepEqual(summary.cardIds, farmDeckModel.definition.cardIds);
  assert.deepEqual(summary.targetIds, farmDeckModel.definition.targetIds);
  assert.equal(summary.metrics.totalTargets, farmDeckModel.targetInstances.length);
  assert.equal(summary.metrics.uniqueTargets, farmDeckModel.targetDefinitions.length);
  assert.equal(summary.metrics.totalSyllables, manualTotalSyllables);
  assert.equal(summary.metrics.uniqueSyllables, farmDeckModel.cards.length);
  assert.ok(vaSyllable);
  assert.equal(vaSyllable?.copies, farmDeckModel.cards.find((entry) => entry.cardId === "syllable.va")?.copiesInDeck);
  assert.ok(vaSyllable?.usedByTargetIds.includes("vaca"));
  assert.ok(vaSyllable?.usedByTargetIds.includes("cavalo"));
  assert.ok(vacaTarget);
  assert.equal(vacaTarget?.copies, manualTargetCopies.get("vaca"));
});

test("read models preservam a leitura da colecao para filtros alvos e silabas", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_CATALOG, { deckModels: DECK_MODELS });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_CATALOG);
  const filtersView = createContentCatalogFiltersView(targetViews, { superclassFilter: "animal" });
  const filteredRawTargets = filterAndSortContentTargets(CONTENT_CATALOG.targets, {
    superclass: "animal",
    classKey: "oceano",
    rarity: "épico",
    sortMode: "rarity",
    sortDirection: "desc",
  });
  const filteredTargetViews = filterAndSortContentTargetViews(targetViews, {
    superclass: "animal",
    classKey: "oceano",
    rarity: "épico",
    sortMode: "rarity",
    sortDirection: "desc",
  });
  const tubaraoView = targetViews.find((target) => target.id === "tubarao");
  const tubaraoDefinition = getCatalogTargetById(CONTENT_CATALOG, "tubarao");
  const raoSyllable = syllableViews.find((entry) => entry.cardId === "syllable.rao");

  assert.deepEqual(
    filteredTargetViews.map((target) => target.id),
    filteredRawTargets.map((target) => target.id),
  );
  assert.deepEqual(filtersView.superclassOptions, [{ id: "animal", label: "Animal" }]);
  assert.ok(filtersView.classOptions.some((option) => option.id === "oceano" && option.label === "Oceano"));
  assert.ok(tubaraoView);
  assert.ok(tubaraoDefinition);
  assert.deepEqual(tubaraoView?.syllables, resolveTargetSyllables(tubaraoDefinition, CONTENT_CATALOG));
  assert.ok(raoSyllable);
  assert.ok(raoSyllable?.usedByTargetIds.includes("tubarao"));
});

test("selectors deck model-first expoem definitions, instancias e cards do deck", () => {
  const farmDeckModel = DECK_MODELS_BY_ID.fazenda;
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
  const farmTargets = getTargetsForDeck(CONTENT_CATALOG, "fazenda");
  const farmTargetInstances = getTargetInstancesForDeck(CONTENT_CATALOG, "fazenda");
  const farmCards = getCardsForDeck(CONTENT_CATALOG, "fazenda");

  assert.deepEqual(
    farmTargets.map((target) => target.id),
    getTargetsForDeckModel(DECK_MODELS_BY_ID.fazenda).map((target) => target.id),
  );
  assert.deepEqual(
    farmTargetInstances.map((entry) => entry.instanceKey),
    getTargetInstancesForDeckModel(DECK_MODELS_BY_ID.fazenda).map((entry) => entry.instanceKey),
  );
  assert.deepEqual(
    farmCards.map((entry) => [entry.card.id, entry.copiesInDeck]),
    getCardsForDeckModel(DECK_MODELS_BY_ID.fazenda).map((entry) => [entry.card.id, entry.copiesInDeck]),
  );
});

test("selectors separam definitions unicas de instancias duplicadas por copies", () => {
  const catalog = {
    ...CONTENT_CATALOG,
    decks: CONTENT_CATALOG.decks.map((deck) =>
      deck.id === "fazenda" ? { ...deck, targetIds: ["vaca", "vaca", "porco"] } : deck,
    ),
    decksById: {
      ...CONTENT_CATALOG.decksById,
      fazenda: {
        ...CONTENT_CATALOG.decksById.fazenda,
        targetIds: ["vaca", "vaca", "porco"],
      },
    },
  };

  const farmTargetDefinitions = getTargetsForDeck(catalog, "fazenda");
  const farmTargetInstances = getTargetInstancesForDeck(catalog, "fazenda");

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
    ["oceano"],
  );
  assert.deepEqual(
    decksUsingRao.map((deck) => deck.id).sort(),
    ["oceano"],
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
    DECK_MODELS_BY_ID.fazenda,
    CONTENT_PIPELINE.deckModels,
  );
  const sharedFarmTargets = getSharedTargetsBetweenDecks(CONTENT_CATALOG, "fazenda");

  assert.deepEqual(sharedFarmTargetsFromDeckModels, []);
  assert.deepEqual(sharedFarmTargets, []);
});
