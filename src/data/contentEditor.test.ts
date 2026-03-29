import assert from "node:assert/strict";
import test from "node:test";
import { DECKS } from "./content";
import {
  buildContentEditorPreview,
  createContentEditorDeckDraft,
  createRawDeckDefinitionSource,
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

test("content editor gera source bruto para o deck correto", () => {
  const entry = getRawDeckCatalogEntry("ocean");

  assert.ok(entry);
  assert.equal(entry.filePath, "src/data/content/decks/ocean.ts");

  const source = createRawDeckDefinitionSource(entry.exportName, entry.deck);

  assert.ok(source.includes('export const oceanDeck: RawDeckDefinition = {'));
  assert.ok(source.includes('id: "ocean"'));
  assert.ok(source.includes('visualTheme: "abyss"'));
});
