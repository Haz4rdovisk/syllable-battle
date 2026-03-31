import assert from "node:assert/strict";
import test from "node:test";
import { DECK_MODELS_BY_ID, RUNTIME_DECKS_BY_ID } from "./content";
import {
  buildContentEditorReviewSummary,
  buildContentEditorSourceDiff,
  buildContentEditorPreview,
  createEmptyContentEditorDeckEntry,
  createContentEditorDeckDraft,
  createRawDeckCatalogIndexSource,
  createRawDeckDefinitionSource,
  hydratePreviewRawDeckDefinitionFromDraft,
  hydrateRawDeckDefinitionFromDraft,
  upsertRawDeckInCatalog,
} from "./content/editor";
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from "./content/decks";

const createSaveableNewDeckDraft = () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));
  const draft = createContentEditorDeckDraft(entry.deck);

  draft.name = "Deck Builder Alpha";
  draft.description = "Deck novo montado a partir do catalogo canonico.";
  draft.emoji = "🧪";
  draft.visualTheme = "dune";
  draft.syllableRows = [
    { id: "row-va", syllable: "VA", count: "2" },
    { id: "row-ca", syllable: "CA", count: "1" },
    { id: "row-pa", syllable: "PA", count: "1" },
    { id: "row-to", syllable: "TO", count: "1" },
  ];
  draft.targets = [
    {
      id: `${entry.id}-vaca`,
      name: "VACA DE TESTE",
      copies: "1",
      description: "",
      emoji: "🐮",
      rarity: "comum",
      syllablesText: "VA, CA",
    },
    {
      id: `${entry.id}-pato`,
      name: "PATO DE TESTE",
      copies: "1",
      description: "",
      emoji: "🦆",
      rarity: "comum",
      syllablesText: "PA, TO",
    },
  ];

  return { entry, draft };
};

test("content editor roundtrip preserva o deck bruto e o deck final do runtime", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck);
  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);

  assert.deepEqual(rawDeck, entry.deck);

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.deepEqual(preview.selectedDeckModel, DECK_MODELS_BY_ID[entry.id]);
  assert.deepEqual(preview.selectedRuntimeDeck, RUNTIME_DECKS_BY_ID[entry.id] ?? null);
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

test("content editor cria deck novo com metadata de catalogo bruto persistivel", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));

  assert.match(entry.id, /^novo-deck/);
  assert.equal(entry.filePath, `src/data/content/decks/${entry.id}.ts`);
  assert.ok(entry.exportName.endsWith("Deck"));
  assert.equal(entry.deck.id, entry.id);
});

test("content editor injeta deck novo no pipeline real antes do save", () => {
  const { entry, draft } = createSaveableNewDeckDraft();
  const previewEntries = upsertRawDeckInCatalog(rawDeckCatalogEntries, entry);
  const preview = buildContentEditorPreview(previewEntries, entry.id, draft);

  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.equal(preview.selectedDeckModel?.id, entry.id);
  assert.equal(preview.selectedDeckModel?.definition.cardIds.join(","), "syllable.va,syllable.ca,syllable.pa,syllable.to");
  assert.equal(preview.selectedRuntimeDeck?.id, entry.id);
  assert.deepEqual(preview.selectedRuntimeDeck?.syllables, {
    VA: 2,
    CA: 1,
    PA: 1,
    TO: 1,
  });
});

test("content editor gera index bruto incluindo deck novo", () => {
  const { entry } = createSaveableNewDeckDraft();
  const indexSource = createRawDeckCatalogIndexSource(upsertRawDeckInCatalog(rawDeckCatalogEntries, entry));

  assert.ok(indexSource.includes(`import { ${entry.exportName} } from "./${entry.id}";`));
  assert.ok(indexSource.includes(`id: "${entry.id}"`));
  assert.ok(indexSource.includes(`filePath: "src/data/content/decks/${entry.id}.ts"`));
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

test("content editor resume mudancas por categoria antes do save", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const baseline = createContentEditorDeckDraft(entry.deck);
  const draft = createContentEditorDeckDraft(entry.deck);

  draft.name = "Fazenda Turbo";
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };
  draft.syllableRows[0] = {
    ...draft.syllableRows[0],
    count: "5",
  };

  const summary = buildContentEditorReviewSummary(baseline, draft, {
    pipelineOk: true,
    sourceReady: true,
    hasSourceChanges: true,
    localIssueCount: 0,
    pipelineIssueCount: 0,
    blockerCount: 0,
  });

  assert.equal(summary.hasMeaningfulChanges, true);
  assert.equal(summary.categories.find((category) => category.id === "metadata")?.changed, true);
  assert.equal(summary.categories.find((category) => category.id === "targets")?.changed, true);
  assert.equal(summary.categories.find((category) => category.id === "syllables")?.changed, true);
  assert.equal(summary.categories.find((category) => category.id === "pipeline")?.headline, "pipeline ok");
  assert.equal(summary.categories.find((category) => category.id === "source")?.headline, "pronto para save");
});

test("content editor resume bloqueio de pipeline e source no review gate", () => {
  const entry = getRawDeckCatalogEntry("farm");

  assert.ok(entry);

  const baseline = createContentEditorDeckDraft(entry.deck);
  const draft = createContentEditorDeckDraft(entry.deck);

  draft.targets[0] = {
    ...draft.targets[0],
    copies: "0",
  };

  const summary = buildContentEditorReviewSummary(baseline, draft, {
    pipelineOk: false,
    sourceReady: false,
    hasSourceChanges: true,
    localIssueCount: 1,
    pipelineIssueCount: 1,
    blockerCount: 2,
  });

  assert.equal(summary.categories.find((category) => category.id === "pipeline")?.headline, "com erro");
  assert.equal(summary.categories.find((category) => category.id === "source")?.headline, "bloqueado");
  assert.match(summary.categories.find((category) => category.id === "source")?.detail ?? "", /2 bloqueador/);
});
