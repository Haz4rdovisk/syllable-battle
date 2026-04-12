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
