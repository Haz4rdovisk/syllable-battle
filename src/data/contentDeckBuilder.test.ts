import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_PIPELINE, createDeckModel } from "./content";
import {
  addCardToDeckBuilderDraft,
  addTargetToDeckBuilderDraft,
  createDeckBuilderDraftFromDeckModel,
  createDeckDefinitionFromBuilderDraft,
  createEmptyDeckBuilderDraft,
  removeCardFromDeckBuilderDraft,
  removeTargetFromDeckBuilderDraft,
} from "./content/deckBuilder";

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
