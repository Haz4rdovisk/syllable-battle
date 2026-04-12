import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_PIPELINE, createDeckModel } from "./content";
import {
  addCardToDeckBuilderDraft,
  addTargetToDeckBuilderDraft,
  createDeckBuilderCompositionView,
  createDuplicatedDeckBuilderDraftFromDeckModel,
  createDeckBuilderDraftFromDeckModel,
  createDeckDefinitionFromBuilderDraft,
  createEmptyDeckBuilderDraft,
  renameDeckBuilderDraft,
  removeCardFromDeckBuilderDraft,
  removeTargetFromDeckBuilderDraft,
  validateDeckBuilderDefinition,
} from "./content/deckBuilder";
import {
  DECK_BUILDER_STORAGE_KEY,
  loadDeckBuilderLocalState,
  saveDeckBuilderLocalState,
} from "./content/deckBuilderStorage";
import {
  createCatalogBackedPlayerCollectionView,
} from "./content/playerCollection";
import {
  createLocalPlayerInventorySnapshot,
  loadPlayerInventoryLocalState,
  PLAYER_INVENTORY_LOCAL_STORAGE_KEY,
  savePlayerInventoryLocalState,
} from "./content/playerInventoryLocal";
import {
  createContentCatalogSyllableViews,
  createContentCatalogTargetViews,
} from "./content/readModels";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("deck builder draft edita targets e cards sem alterar o deck model original", () => {
  const sourceModel = CONTENT_PIPELINE.deckModelsById.fazenda;
  assert.ok(sourceModel);

  const draft = createDeckBuilderDraftFromDeckModel(sourceModel);
  const target = CONTENT_PIPELINE.catalog.targetsById.vaca;
  assert.ok(target);
  const firstCard = CONTENT_PIPELINE.catalog.cardsById[target.cardIds[0]];
  assert.ok(firstCard);

  const withTarget = addTargetToDeckBuilderDraft(draft, target);
  assert.equal(withTarget.targetIds.filter((targetId) => targetId === target.id).length, 2);
  assert.equal(withTarget.cardPool[firstCard.id], (draft.cardPool[firstCard.id] ?? 0) + 1);

  const withoutTarget = removeTargetFromDeckBuilderDraft(withTarget, target);
  assert.deepEqual(withoutTarget.targetIds, draft.targetIds);
  assert.equal(withoutTarget.cardPool[firstCard.id], draft.cardPool[firstCard.id]);

  const withCard = addCardToDeckBuilderDraft(draft, firstCard);
  assert.equal(withCard.cardPool[firstCard.id], (draft.cardPool[firstCard.id] ?? 0) + 1);

  const withoutCard = removeCardFromDeckBuilderDraft(withCard, firstCard);
  assert.equal(withoutCard.cardPool[firstCard.id], draft.cardPool[firstCard.id]);
  assert.equal(sourceModel.definition.cardPool[firstCard.id], draft.cardPool[firstCard.id]);
});

test("deck builder draft projeta DeckDefinition e DeckModel para os read models", () => {
  const draft = createEmptyDeckBuilderDraft(CONTENT_PIPELINE.catalog, CONTENT_PIPELINE.deckModels.map((deck) => deck.id));
  const target = CONTENT_PIPELINE.catalog.targetsById.pato;
  assert.ok(target);

  const editedDraft = addTargetToDeckBuilderDraft(draft, target);
  const definition = createDeckDefinitionFromBuilderDraft(editedDraft, CONTENT_PIPELINE.catalog);
  const deckModel = createDeckModel(definition, CONTENT_PIPELINE.catalog);

  assert.equal(definition.id, "novo-deck");
  assert.deepEqual(definition.targetIds, [target.id]);
  assert.equal(deckModel.targetInstances.length, 1);
  assert.equal(deckModel.cards.reduce((sum, card) => sum + card.copiesInDeck, 0), target.cardIds.length);
});

test("deck builder duplica e renomeia deck sem manter vinculo com o catalogo original", () => {
  const sourceModel = CONTENT_PIPELINE.deckModelsById.fazenda;
  assert.ok(sourceModel);

  const duplicated = createDuplicatedDeckBuilderDraftFromDeckModel(
    sourceModel,
    CONTENT_PIPELINE.deckModels.map((deck) => deck.id),
  );
  const renamed = renameDeckBuilderDraft(duplicated, "Fazenda Rapida");

  assert.notEqual(duplicated.id, sourceModel.id);
  assert.equal(duplicated.sourceDeckId, undefined);
  assert.deepEqual(duplicated.targetIds, sourceModel.definition.targetIds);
  assert.deepEqual(duplicated.cardPool, sourceModel.definition.cardPool);
  assert.equal(renamed.name, "Fazenda Rapida");
  assert.equal(renamed.id, duplicated.id);
});

test("deck builder valida vazio incompleto e pronto com regras minimas", () => {
  const empty = validateDeckBuilderDefinition({ targetIds: [], cardPool: {} }, { minTargets: 2, minSyllables: 5 });
  assert.equal(empty.status, "empty");

  const incomplete = validateDeckBuilderDefinition(
    { targetIds: ["vaca"], cardPool: { "syllable.va": 1 } },
    { minTargets: 2, minSyllables: 5 },
  );
  assert.equal(incomplete.status, "incomplete");
  assert.deepEqual(incomplete.issues.map((issue) => issue.id), ["min-targets", "min-syllables"]);

  const ready = validateDeckBuilderDefinition(
    {
      targetIds: ["vaca", "pato"],
      cardPool: { "syllable.va": 2, "syllable.ca": 2, "syllable.to": 1 },
    },
    { minTargets: 2, minSyllables: 5 },
  );
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.issues, []);
});

test("deck builder resume composicao com progresso e copias repetidas", () => {
  const empty = createDeckBuilderCompositionView({ targetIds: [], cardPool: {} }, { minTargets: 2, minSyllables: 5 });
  assert.equal(empty.label, "Sem composicao");
  assert.equal(empty.overallProgress, 0);

  const incomplete = createDeckBuilderCompositionView(
    { targetIds: ["vaca"], cardPool: { "syllable.va": 2 } },
    { minTargets: 2, minSyllables: 5 },
  );
  assert.equal(incomplete.label, "Abaixo do minimo");
  assert.equal(incomplete.totalTargets, 1);
  assert.equal(incomplete.uniqueSyllables, 1);
  assert.equal(incomplete.repeatedCopies, 1);

  const aboveMinimum = createDeckBuilderCompositionView(
    {
      targetIds: ["vaca", "vaca", "pato"],
      cardPool: { "syllable.va": 2, "syllable.ca": 2, "syllable.to": 1 },
    },
    { minTargets: 2, minSyllables: 5 },
  );
  assert.equal(aboveMinimum.label, "Acima do minimo");
  assert.equal(aboveMinimum.totalTargets, 3);
  assert.equal(aboveMinimum.uniqueTargets, 2);
  assert.equal(aboveMinimum.repeatedCopies, 3);
  assert.equal(aboveMinimum.overallProgress, 1);
});

test("deck builder local storage salva e hidrata decks locais sanitizados", () => {
  const storage = new MemoryStorage();
  const sourceModel = CONTENT_PIPELINE.deckModelsById.fazenda;
  assert.ok(sourceModel);

  const draft = addTargetToDeckBuilderDraft(
    createDeckBuilderDraftFromDeckModel(sourceModel),
    CONTENT_PIPELINE.catalog.targetsById.pato!,
  );
  const definition = createDeckDefinitionFromBuilderDraft(draft, CONTENT_PIPELINE.catalog);

  assert.equal(
    saveDeckBuilderLocalState(storage, { decks: [definition], selectedDeckId: definition.id }, CONTENT_PIPELINE.catalog),
    true,
  );

  const loaded = loadDeckBuilderLocalState(storage, CONTENT_PIPELINE.catalog);
  assert.equal(loaded.selectedDeckId, definition.id);
  assert.equal(loaded.decks.length, 1);
  assert.deepEqual(loaded.decks[0], definition);
});

test("deck builder local storage tolera payload corrompido ou ids removidos do catalogo", () => {
  const storage = new MemoryStorage();
  storage.setItem(DECK_BUILDER_STORAGE_KEY, "{payload quebrado");

  assert.deepEqual(loadDeckBuilderLocalState(storage, CONTENT_PIPELINE.catalog), { decks: [] });

  storage.setItem(
    DECK_BUILDER_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      selectedDeckId: "deck-local",
      decks: [
        {
          id: "deck-local",
          name: "Deck Local",
          description: "Persistido",
          emoji: "🃏",
          superclass: "animal",
          visualTheme: "tema-inexistente",
          cardPool: {
            "syllable.va": 2,
            "syllable.inexistente": 9,
          },
          targetIds: ["vaca", "alvo-inexistente"],
        },
      ],
    }),
  );

  const loaded = loadDeckBuilderLocalState(storage, CONTENT_PIPELINE.catalog);
  assert.equal(loaded.decks.length, 1);
  assert.deepEqual(loaded.decks[0]?.targetIds, ["vaca"]);
  assert.deepEqual(loaded.decks[0]?.cardPool, { "syllable.va": 2 });
  assert.equal(loaded.decks[0]?.visualTheme, CONTENT_PIPELINE.catalog.decks[0]?.visualTheme);
});

test("player collection adapter expoe catalogo completo como colecao local provisoria", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog);
  const deck = CONTENT_PIPELINE.deckModelsById.fazenda.definition;
  const view = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    deckDefinition: deck,
  });

  assert.equal(view.source, "catalog-full-access");
  assert.equal(view.summary.hasLimitedInventory, false);
  assert.equal(view.summary.availableTargets, view.summary.totalTargets);
  assert.equal(view.summary.availableSyllables, view.summary.totalSyllables);
  assert.equal(view.targetsById.vaca.inventory.ownedCopies, null);
  assert.equal(view.targetsById.vaca.inventory.usedCopies, deck.targetIds.filter((targetId) => targetId === "vaca").length);
  assert.equal(view.targetsById.vaca.availability.canAdd, true);
});

test("player collection adapter suporta inventario limitado e itens indisponiveis", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog);
  const view = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    deckDefinition: {
      targetIds: ["vaca"],
      cardPool: {
        "syllable.va": 1,
        "syllable.ca": 1,
      },
    },
    inventory: {
      source: "local-snapshot",
      targetCopies: {
        vaca: 1,
      },
      cardCopies: {
        "syllable.va": 1,
      },
    },
  });

  assert.equal(view.source, "local-snapshot");
  assert.equal(view.summary.hasLimitedInventory, true);
  assert.equal(view.targetsById.vaca.inventory.remainingCopies, 0);
  assert.equal(view.targetsById.vaca.availability.canAdd, false);
  assert.equal(view.syllablesByCardId["syllable.ca"].availability.canAdd, false);
});

test("player inventory local salva modo e tolera payload invalido", () => {
  const storage = new MemoryStorage();

  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "catalog-full" });
  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-partial" }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-partial" });

  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-scarce" }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-scarce" });

  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-almost-empty" }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-almost-empty" });

  storage.setItem(PLAYER_INVENTORY_LOCAL_STORAGE_KEY, JSON.stringify({ version: 1, mode: "modo-inexistente" }));
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "catalog-full" });
});

test("player inventory local cria fixture parcial com disponiveis nao possuidos e sem copias", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog);
  const fullInventory = createLocalPlayerInventorySnapshot(CONTENT_PIPELINE.catalog, "catalog-full");
  const partialInventory = createLocalPlayerInventorySnapshot(CONTENT_PIPELINE.catalog, "qa-partial");
  const firstOwnedTarget = CONTENT_PIPELINE.catalog.targets[0];
  assert.ok(firstOwnedTarget);

  const fullView = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    inventory: fullInventory,
  });
  assert.equal(fullView.summary.hasLimitedInventory, false);
  assert.equal(fullView.targetsById[firstOwnedTarget.id].inventory.unlimited, true);

  const partialView = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    inventory: partialInventory,
  });
  const unavailableTargets = partialView.targets.filter((entry) => !entry.availability.canAdd);
  assert.equal(partialView.sourceLabel, "Colecao QA");
  assert.equal(partialView.summary.hasLimitedInventory, true);
  assert.ok(partialView.summary.availableTargets > 0);
  assert.ok(unavailableTargets.length > 0);
  assert.equal(partialView.targetsById[firstOwnedTarget.id].inventory.ownedCopies, 1);

  const exhaustedView = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    deckDefinition: {
      targetIds: [firstOwnedTarget.id],
      cardPool: firstOwnedTarget.cardIds.reduce<Record<string, number>>((acc, cardId) => {
        acc[cardId] = (acc[cardId] ?? 0) + 1;
        return acc;
      }, {}),
    },
    inventory: partialInventory,
  });
  assert.equal(exhaustedView.targetsById[firstOwnedTarget.id].inventory.remainingCopies, 0);
  assert.equal(exhaustedView.targetsById[firstOwnedTarget.id].availability.canAdd, false);
});

test("player inventory local qa-scarce produz inventario muito limitado com pelo menos 1 target", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog);
  const scarceInventory = createLocalPlayerInventorySnapshot(CONTENT_PIPELINE.catalog, "qa-scarce");

  assert.equal(scarceInventory.source, "local-snapshot");
  assert.equal(scarceInventory.sourceLabel, "Colecao escassa");
  assert.ok(scarceInventory.targetCopies);

  const scarceView = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    inventory: scarceInventory,
  });

  assert.equal(scarceView.summary.hasLimitedInventory, true);
  assert.ok(scarceView.summary.availableTargets > 0, "qa-scarce deve ter pelo menos 1 target disponivel");
  assert.ok(
    scarceView.summary.availableTargets < scarceView.summary.totalTargets,
    "qa-scarce deve ter menos targets que o total",
  );
});

test("player inventory local qa-almost-empty produz inventario minimo com 1-2 targets", () => {
  const targetViews = createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog);
  const almostEmptyInventory = createLocalPlayerInventorySnapshot(CONTENT_PIPELINE.catalog, "qa-almost-empty");

  assert.equal(almostEmptyInventory.source, "local-snapshot");
  assert.equal(almostEmptyInventory.sourceLabel, "Colecao quase vazia");
  assert.ok(almostEmptyInventory.targetCopies);

  const almostEmptyView = createCatalogBackedPlayerCollectionView({
    catalog: CONTENT_PIPELINE.catalog,
    targetViews,
    syllableViews,
    inventory: almostEmptyInventory,
  });

  assert.equal(almostEmptyView.summary.hasLimitedInventory, true);
  assert.ok(almostEmptyView.summary.availableTargets > 0, "qa-almost-empty deve ter pelo menos 1 target disponivel");
  assert.ok(almostEmptyView.summary.availableTargets <= 2, "qa-almost-empty deve ter no maximo 2 targets disponiveis");
  assert.ok(
    almostEmptyView.summary.availableTargets < almostEmptyView.summary.totalTargets,
    "qa-almost-empty deve ter muito menos targets que o total",
  );
});
