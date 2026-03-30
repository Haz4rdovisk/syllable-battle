import assert from "node:assert/strict";
import test from "node:test";
import { DECKS } from "./content";
import {
  buildContentEditorSourceDiff,
  buildContentEditorPreview,
  createContentEditorDeckDraft,
  createRawDeckDefinitionSource,
  hydratePreviewRawDeckDefinitionFromDraft,
  hydrateRawDeckDefinitionFromDraft,
} from "./content/editor";
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from "./content/decks";

test("content editor roundtrip preserva o deck bruto e o deck final do runtime", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);

  assert.deepEqual(rawDeck, entry.deck);

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.deepEqual(
    preview.selectedRuntimeDeck,
    DECKS.find((deck) => deck.id === entry.id) ?? null,
  );
});

test("content editor reutiliza a validacao real do pipeline", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  draft.targets[0] = {
    ...draft.targets[0],
    syllablesText: "ZZ, ZZ",
  };

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, entry.id, draft);
  assert.equal(preview.ok, false);
  if (preview.ok) return;

  assert.ok(
    preview.issues.some((issue) => issue.includes('target "vaca" needs') && issue.includes('"ZZ"')),
  );
});

test("content editor nao mascara copies invalido como 1 no preview do pipeline", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "0",
  };

  const previewDeck = hydratePreviewRawDeckDefinitionFromDraft(draft);
  assert.equal(previewDeck.targets[0]?.copies, 0);

  const saveDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(saveDeck.targets[0]?.copies, undefined);

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, entry.id, draft);
  assert.equal(preview.ok, false);
  if (preview.ok) return;

  assert.ok(preview.issues.some((issue) => issue.includes('target "vaca" copies must be a positive integer')));
});

test("content editor persiste copies de alvo e replica target no deck final", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };

  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(rawDeck.targets[0]?.copies, 2);

  const source = createRawDeckDefinitionSource(entry.exportName, rawDeck);
  assert.ok(source.includes("copies: 2"));

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  const copiesInRuntime = preview.selectedRuntimeDeck?.targets.filter((target) => target.id === draft.targets[0]?.id).length;
  assert.equal(copiesInRuntime, 2);
});

test("content editor omite copies no source bruto quando o valor volta para 1", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "1",
  };

  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(rawDeck.targets[0]?.copies, undefined);

  const source = createRawDeckDefinitionSource(entry.exportName, rawDeck);
  assert.ok(!source.includes("copies:"));
});

test("content editor gera source bruto para o deck correto", () => {
  const entry = getRawDeckCatalogEntry("ocean");

  assert.ok(entry);
  assert.equal(entry.filePath, "src/data/content/decks/ocean.ts");

  const source = createRawDeckDefinitionSource(entry.exportName, entry.deck);

  assert.ok(source.includes('export const oceanDeck: RawDeckDefinition = {'));
  assert.ok(source.includes('id: "ocean"'));
  assert.ok(source.includes('visualTheme: "abyss"'));
});

test("content editor gera diff legivel do source bruto antes do save", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };

  const currentSource = createRawDeckDefinitionSource(entry.exportName, entry.deck);
  const nextSource = createRawDeckDefinitionSource(entry.exportName, hydrateRawDeckDefinitionFromDraft(draft));
  const diff = buildContentEditorSourceDiff(currentSource, nextSource);

  assert.equal(diff.hasChanges, true);
  assert.ok(diff.addedCount > 0);
  assert.ok(diff.lines.some((line) => line.type === "added" && line.value.includes("copies: 2")));
});
