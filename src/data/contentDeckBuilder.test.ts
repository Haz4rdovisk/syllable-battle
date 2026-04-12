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
  validateDeckBuilderFormal,
  getDeckBuilderTargetCopyLimit,
  getDeckBuilderTargetFormalCanAdd,
  getDeckBuilderSyllableFamilyCopies,
  getDeckBuilderSyllableFormalCanAdd,
  DECK_BUILDER_CONSTRUCTION_RULES,
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
  const empty = { mode: "catalog-full" as const, targetCopiesOverride: {} };

  assert.deepEqual(loadPlayerInventoryLocalState(storage), empty);
  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-partial", targetCopiesOverride: {} }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-partial", targetCopiesOverride: {} });

  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-scarce", targetCopiesOverride: {} }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-scarce", targetCopiesOverride: {} });

  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-almost-empty", targetCopiesOverride: {} }), true);
  assert.deepEqual(loadPlayerInventoryLocalState(storage), { mode: "qa-almost-empty", targetCopiesOverride: {} });

  // v1 data (version mismatch) → fallback para default
  storage.setItem(PLAYER_INVENTORY_LOCAL_STORAGE_KEY, JSON.stringify({ version: 1, mode: "qa-partial" }));
  assert.deepEqual(loadPlayerInventoryLocalState(storage), empty);

  // modo invalido → fallback para default
  storage.setItem(PLAYER_INVENTORY_LOCAL_STORAGE_KEY, JSON.stringify({ version: 2, mode: "modo-inexistente" }));
  assert.deepEqual(loadPlayerInventoryLocalState(storage), empty);
});

test("player inventory local v2 persiste e restaura targetCopiesOverride", () => {
  const storage = new MemoryStorage();
  const overrides = { "target-abc": 3, "target-xyz": 0 };

  assert.equal(savePlayerInventoryLocalState(storage, { mode: "qa-partial", targetCopiesOverride: overrides }), true);
  const loaded = loadPlayerInventoryLocalState(storage);
  assert.equal(loaded.mode, "qa-partial");
  assert.deepEqual(loaded.targetCopiesOverride, overrides);
});

test("player inventory local override manual aplica-se sobre o preset e recalcula cards derivadas", () => {
  const catalog = CONTENT_PIPELINE.catalog;
  const targetViews = createContentCatalogTargetViews(catalog, { deckModels: CONTENT_PIPELINE.deckModels });
  const syllableViews = createContentCatalogSyllableViews(catalog);

  // qa-almost-empty: targets[0] e targets[1] tem 1 copia, targets[2] tem 0
  const targetWithZeroCopies = catalog.targets[2];
  assert.ok(targetWithZeroCopies, "catalogo deve ter pelo menos 3 targets para este teste");

  const noOverride = createLocalPlayerInventorySnapshot(catalog, "qa-almost-empty");
  assert.equal(noOverride.targetCopies?.[targetWithZeroCopies.id], 0);

  const withOverride = createLocalPlayerInventorySnapshot(catalog, "qa-almost-empty", { [targetWithZeroCopies.id]: 2 });
  assert.equal(withOverride.targetCopies?.[targetWithZeroCopies.id], 2);

  // override deve propagar para as cards do target
  const overrideView = createCatalogBackedPlayerCollectionView({
    catalog,
    targetViews,
    syllableViews,
    inventory: withOverride,
  });
  assert.equal(overrideView.targetsById[targetWithZeroCopies.id].inventory.ownedCopies, 2);

  // override 0 torna target indisponivel independente do preset
  const firstTarget = catalog.targets[0];
  assert.ok(firstTarget);
  const zeroOverride = createLocalPlayerInventorySnapshot(catalog, "qa-almost-empty", { [firstTarget.id]: 0 });
  const zeroView = createCatalogBackedPlayerCollectionView({
    catalog,
    targetViews,
    syllableViews,
    inventory: zeroOverride,
  });
  assert.equal(zeroView.targetsById[firstTarget.id].inventory.ownedCopies, 0);
  assert.equal(zeroView.targetsById[firstTarget.id].availability.canAdd, false);
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

// ─── Formal construction rules ───────────────────────────────────────────────

const catalog = CONTENT_PIPELINE.catalog;

// Helper: build a definition with the given targetIds and cardPool
function buildDefinitionWithTargets(targetIds: string[], cardPool: Record<string, number>) {
  return { targetIds, cardPool };
}

/**
 * Builds a clean syllable pool that:
 * - has exactly ≥ 60 total copies (valid-min range: 60–71)
 * - gives multi-family cards (used by 3+ targets) ≥ 3 copies (avoids multi-family issue)
 * - all other cards get 2 copies
 * - stays within 60–80 total (never exceeds max)
 */
function buildCleanMinSyllablePool(): Record<string, number> {
  const multiFamilyCardIds = new Set(
    catalog.cards
      .filter((c) => catalog.targets.filter((t) => t.cardIds.includes(c.id)).length >= 3)
      .map((c) => c.id),
  );
  const pool: Record<string, number> = {};
  let total = 0;
  // Multi-family cards: give 3 copies (satisfies multi-family min rule)
  for (const cardId of multiFamilyCardIds) {
    pool[cardId] = 3;
    total += 3;
  }
  // Regular cards: 2 copies each until we reach 60 (but stop before 80)
  for (const card of catalog.cards) {
    if (multiFamilyCardIds.has(card.id)) continue;
    if (total + 2 > 80) break;
    pool[card.id] = 2;
    total += 2;
    if (total >= 60) break;
  }
  return pool;
}

/**
 * Builds a clean ideal pool in the [72, 80] range with no rule violations.
 */
function buildCleanIdealSyllablePool(): Record<string, number> {
  const multiFamilyCardIds = new Set(
    catalog.cards
      .filter((c) => catalog.targets.filter((t) => t.cardIds.includes(c.id)).length >= 3)
      .map((c) => c.id),
  );
  const pool: Record<string, number> = {};
  let total = 0;
  for (const cardId of multiFamilyCardIds) {
    pool[cardId] = 3;
    total += 3;
  }
  // Fill with regular cards at 2 copies up to ~72 total
  for (const card of catalog.cards) {
    if (multiFamilyCardIds.has(card.id)) continue;
    if (total + 2 > 80) break;
    pool[card.id] = 2;
    total += 2;
    if (total >= 72) break;
  }
  return pool;
}

const allTargetIds = catalog.targets.map((t) => t.id); // 24 targets
const minSyllablePool = buildCleanMinSyllablePool();
const idealSyllablePool = buildCleanIdealSyllablePool();

test("deck builder formal valida deck vazio", () => {
  const result = validateDeckBuilderFormal({ targetIds: [], cardPool: {} }, catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "empty");
  assert.ok(result.issues.some((i) => i.id === "empty"));
});

test("deck builder formal valida deck de alvos abaixo de 24 (caso 1)", () => {
  const targetIds = allTargetIds.slice(0, 10);
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(targetIds, minSyllablePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "incomplete");
  assert.ok(result.issues.some((i) => i.id === "min-targets"), "deve ter issue min-targets");
});

test("deck builder formal valida deck de alvos entre 24 e 31 (caso 2: valid-min)", () => {
  // Exactly 24 targets (= min, below ideal 32) with a clean syllable pool in [60, 71]
  const targetIds = allTargetIds.slice(0, 24);
  const minTotal = Object.values(minSyllablePool).reduce((s, v) => s + v, 0);
  assert.ok(minTotal >= 60 && minTotal <= 80, `minSyllablePool deve estar em [60,80], got ${minTotal}`);
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(targetIds, minSyllablePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(
    result.status === "valid-min" || result.status === "ideal",
    `status deve ser valid-min ou ideal, got ${result.status}; issues: ${result.issues.map((i) => i.id).join(", ")}`,
  );
  assert.deepEqual(result.issues, []);
});

test("deck builder formal valida deck de alvos acima de 36 (caso 4: exceeded)", () => {
  // Build 37 targets by repeating within rarity limits
  const padded: string[] = [];
  for (const t of catalog.targets) {
    const copies = DECK_BUILDER_CONSTRUCTION_RULES.maxTargetCopiesByRarity[t.rarity] ?? 1;
    for (let i = 0; i < copies; i++) padded.push(t.id);
    if (padded.length >= 37) break;
  }
  if (padded.length < 37) return; // catalog too small to reach 37, skip
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(padded.slice(0, 37), minSyllablePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "exceeded", `status deve ser exceeded, got ${result.status}`);
  assert.ok(result.issues.some((i) => i.id === "max-targets"), "deve ter issue max-targets");
});

test("deck builder formal bloqueia alvo comum acima de 3 copias (caso 5)", () => {
  const comumTarget = catalog.targets.find((t) => t.rarity === "comum")!;
  assert.ok(comumTarget, "deve existir alvo comum");
  // 4 copies of a comum target (limit is 3) — force the copy count without growing total too much
  const targetIds = [...allTargetIds.slice(0, 20), comumTarget.id, comumTarget.id, comumTarget.id, comumTarget.id];
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(targetIds, minSyllablePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(result.issues.some((i) => i.id === "target-copy-limit"), "deve ter issue target-copy-limit");
});

test("deck builder formal bloqueia alvo raro acima de 2 copias (caso 6)", () => {
  const raroTarget = catalog.targets.find((t) => t.rarity === "raro")!;
  assert.ok(raroTarget, "deve existir alvo raro");
  // 3 copies of a raro target (limit is 2) with only 24 total targets
  const otherTargets = allTargetIds.filter((id) => id !== raroTarget.id).slice(0, 21);
  const targetIds = [...otherTargets, raroTarget.id, raroTarget.id, raroTarget.id];
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(targetIds, minSyllablePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(result.issues.some((i) => i.id === "target-copy-limit"), "deve ter issue target-copy-limit para raro");
});

test("deck builder formal valida deck de silabas abaixo de 60 (caso 9)", () => {
  const smallPool: Record<string, number> = {};
  catalog.cards.slice(0, 5).forEach((c) => { smallPool[c.id] = 2; });
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(allTargetIds, smallPool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "incomplete");
  assert.ok(result.issues.some((i) => i.id === "min-syllables"), "deve ter issue min-syllables");
});

test("deck builder formal valida deck de silabas acima de 80 (caso 12)", () => {
  const largePool: Record<string, number> = {};
  catalog.cards.forEach((c) => { largePool[c.id] = 4; }); // 46 × 4 = 184 syllables
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(allTargetIds, largePool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "exceeded");
  assert.ok(result.issues.some((i) => i.id === "max-syllables"), "deve ter issue max-syllables");
});

test("deck builder formal bloqueia silaba versao exata acima de 4 (caso 14)", () => {
  const pool = { ...minSyllablePool };
  // Pick a non-multi-family card to avoid conflating issues
  const regularCard = catalog.cards.find((c) =>
    catalog.targets.filter((t) => t.cardIds.includes(c.id)).length < 3,
  )!;
  pool[regularCard.id] = 5; // over exact limit (4)
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(allTargetIds, pool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(result.issues.some((i) => i.id === "syllable-exact-limit"), "deve ter issue syllable-exact-limit");
});

test("deck builder formal detecta silaba abaixo de 2 copias (caso 15)", () => {
  const pool = { ...minSyllablePool };
  // Pick a non-multi-family card to isolate the issue
  const regularCard = catalog.cards.find((c) =>
    catalog.targets.filter((t) => t.cardIds.includes(c.id)).length < 3,
  )!;
  pool[regularCard.id] = 1; // below min copies (2)
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(allTargetIds, pool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(result.issues.some((i) => i.id === "syllable-min-copies"), "deve ter issue syllable-min-copies");
});

test("deck builder formal detecta silaba multi-familia com menos de 3 copias (caso 16)", () => {
  // CA, CO, LO are each used by 3+ targets in the full catalog
  const multiCard = catalog.cards.find((c) =>
    catalog.targets.filter((t) => t.cardIds.includes(c.id)).length >= 3,
  );
  if (!multiCard) return; // skip if catalog changed
  // Use clean min pool but override the multi-family card to 2 copies (below min 3 required)
  const pool = { ...minSyllablePool, [multiCard.id]: 2 };
  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(allTargetIds, pool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.ok(
    result.issues.some((i) => i.id === "syllable-multi-family-min"),
    `silaba ${multiCard.syllable} usada por 3+ alvos com 2 copias deve gerar issue syllable-multi-family-min`,
  );
});

test("deck builder formal retorna ideal quando 32-36 alvos e 72-80 silabas", () => {
  // Build exactly 32 targets (requires repeating some with copies ≥ 2)
  const targetIds: string[] = [];
  for (const t of catalog.targets) {
    const limit = DECK_BUILDER_CONSTRUCTION_RULES.maxTargetCopiesByRarity[t.rarity] ?? 1;
    const copies = Math.min(limit, 2); // use up to 2 copies per target to fill up
    for (let i = 0; i < copies && targetIds.length < 32; i++) {
      targetIds.push(t.id);
    }
    if (targetIds.length >= 32) break;
  }
  if (targetIds.length < 32) return; // catalog too small to reach 32, skip

  const idealPool = buildCleanIdealSyllablePool();
  const idealTotal = Object.values(idealPool).reduce((s, v) => s + v, 0);
  if (idealTotal < 72 || idealTotal > 80) return; // can't form ideal pool with this catalog, skip

  const result = validateDeckBuilderFormal(buildDefinitionWithTargets(targetIds.slice(0, 32), idealPool), catalog, DECK_BUILDER_CONSTRUCTION_RULES);
  assert.equal(result.status, "ideal", `esperado ideal, got ${result.status}; issues: ${result.issues.map((i) => i.id).join(", ")}`);
});

test("deck builder formal getDeckBuilderTargetCopyLimit retorna limite por raridade", () => {
  assert.equal(getDeckBuilderTargetCopyLimit("comum", DECK_BUILDER_CONSTRUCTION_RULES), 3);
  assert.equal(getDeckBuilderTargetCopyLimit("raro", DECK_BUILDER_CONSTRUCTION_RULES), 2);
  assert.equal(getDeckBuilderTargetCopyLimit("épico", DECK_BUILDER_CONSTRUCTION_RULES), 2);
  assert.equal(getDeckBuilderTargetCopyLimit("lendário", DECK_BUILDER_CONSTRUCTION_RULES), 1);
  assert.equal(getDeckBuilderTargetCopyLimit("inexistente", DECK_BUILDER_CONSTRUCTION_RULES), 1);
});

test("deck builder formal getDeckBuilderTargetFormalCanAdd bloqueia quando acima do limite", () => {
  const copies = { "vaca": 3 };
  assert.equal(getDeckBuilderTargetFormalCanAdd("vaca", "comum", copies, DECK_BUILDER_CONSTRUCTION_RULES), false, "3 copias = no limite, nao pode adicionar");
  assert.equal(getDeckBuilderTargetFormalCanAdd("vaca", "comum", { "vaca": 2 }, DECK_BUILDER_CONSTRUCTION_RULES), true, "2 copias = abaixo do limite");
  assert.equal(getDeckBuilderTargetFormalCanAdd("pato", "raro", { "pato": 2 }, DECK_BUILDER_CONSTRUCTION_RULES), false, "2 copias de raro = no limite");
  assert.equal(getDeckBuilderTargetFormalCanAdd("pato", "raro", { "pato": 1 }, DECK_BUILDER_CONSTRUCTION_RULES), true, "1 copia de raro = abaixo do limite");
});

test("deck builder formal getDeckBuilderSyllableFamilyCopies agrupa por texto de silaba", () => {
  const pool = { "syllable.va": 3, "syllable.ca": 2 };
  const families = getDeckBuilderSyllableFamilyCopies(pool, catalog);
  assert.equal(families["VA"], 3);
  assert.equal(families["CA"], 2);
  assert.equal(families["inexistente"], undefined);
});

test("deck builder formal getDeckBuilderSyllableFormalCanAdd bloqueia quando acima do limite exato ou de familia", () => {
  const pool = { "syllable.va": 4 };
  const families = getDeckBuilderSyllableFamilyCopies(pool, catalog);
  // exact limit (4) reached
  assert.equal(getDeckBuilderSyllableFormalCanAdd("syllable.va", "VA", pool, families, DECK_BUILDER_CONSTRUCTION_RULES), false);
  // one below exact limit
  assert.equal(getDeckBuilderSyllableFormalCanAdd("syllable.va", "VA", { "syllable.va": 3 }, getDeckBuilderSyllableFamilyCopies({ "syllable.va": 3 }, catalog), DECK_BUILDER_CONSTRUCTION_RULES), true);
});

test("deck builder formal createDeckBuilderCompositionView com regras formais retorna faixa correta", () => {
  const emptyResult = createDeckBuilderCompositionView({ targetIds: [], cardPool: {} }, {
    minTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.min,
    idealTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.ideal,
    maxTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.max,
    minSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.min,
    idealSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.ideal,
    maxSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.max,
  });
  assert.equal(emptyResult.label, "Sem composicao");
  assert.equal(emptyResult.idealTargets, 32);
  assert.equal(emptyResult.maxTargets, 36);
  assert.equal(emptyResult.idealSyllables, 72);
  assert.equal(emptyResult.maxSyllables, 80);

  const incompleteResult = createDeckBuilderCompositionView({ targetIds: ["vaca"], cardPool: { "syllable.va": 2 } }, {
    minTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.min,
    idealTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.ideal,
    maxTargets: DECK_BUILDER_CONSTRUCTION_RULES.targets.max,
    minSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.min,
    idealSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.ideal,
    maxSyllables: DECK_BUILDER_CONSTRUCTION_RULES.syllables.max,
  });
  assert.equal(incompleteResult.label, "Abaixo do minimo");

  // Old tests are still valid (no ideal/max → old label logic)
  const oldStyleResult = createDeckBuilderCompositionView(
    { targetIds: ["vaca", "vaca"], cardPool: { "syllable.va": 5 } },
    { minTargets: 2, minSyllables: 5 },
  );
  assert.equal(oldStyleResult.label, "Minimo atendido");
  assert.equal(oldStyleResult.idealTargets, 0);
  assert.equal(oldStyleResult.maxTargets, 0);
});
