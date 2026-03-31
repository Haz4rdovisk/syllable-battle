import assert from "node:assert/strict";
import test from "node:test";
import { DECK_MODELS_BY_ID, RUNTIME_DECKS_BY_ID } from "./content";
import {
  appendContentEditorTargetSyllable,
  buildContentEditorTargetNameValidation,
  clampContentEditorSyllableCount,
  buildContentEditorReviewSummary,
  buildContentEditorSourceDiff,
  buildContentEditorPreview,
  createEmptyContentEditorDeckEntry,
  createContentEditorDeckDraft,
  createDeckIdCandidate,
  createDuplicatedContentEditorDeckEntry,
  createRawDeckCatalogIndexSource,
  createRawDeckDefinitionSource,
  createRawTargetCatalogSource,
  hydratePreviewRawDeckDefinitionFromDraft,
  hydrateRawDeckDefinitionFromDraft,
  hydrateRawTargetCatalogFromDraftTargets,
  parseContentEditorTargetSyllables,
  removeRawDeckFromCatalog,
  removeContentEditorTargetSyllableAt,
  syncDeckPoolWithTargetMinimums,
  upsertRawDeckInCatalog,
  validateContentDeckSaveEntry,
} from "./content/editor";
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from "./content/decks";
import { rawTargetCatalog } from "./content/targets";

const createSaveableNewDeckDraft = () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));
  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);

  draft.name = "Deck Builder Alpha";
  draft.description = "Deck novo montado a partir do catalogo canonico.";
  draft.emoji = "🧪";
  draft.visualTheme = "dune";
  draft.manualPoolAdjustments = [{ id: "row-va", syllable: "VA", count: "1", mode: "manual" }];
  draft.targets = [
    {
      id: `${entry.id}-vaca`,
      name: "VACA",
      copies: "1",
      description: "",
      emoji: "🐮",
      rarity: "comum",
      syllablesText: "VA, CA",
    },
    {
      id: `${entry.id}-pato`,
      name: "PATO",
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
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);

  assert.deepEqual(rawDeck, entry.deck);

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.deepEqual(preview.selectedDeckModel, DECK_MODELS_BY_ID[entry.id]);
  assert.deepEqual(preview.selectedRuntimeDeck, RUNTIME_DECKS_BY_ID[entry.id] ?? null);
});

test("content editor draft guarda apenas ajustes manuais do pool e deriva o resto dos alvos", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);

  assert.ok(draft.manualPoolAdjustments.every((row) => Number(row.count) > 0));

  const draftRawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.deepEqual(draftRawDeck.syllables, entry.deck.syllables);
});

test("content editor reutiliza a validacao real do pipeline", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets[0] = {
    ...draft.targets[0],
    syllablesText: "ZZ, ZZ",
  };

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, false);
  if (preview.ok) return;

  assert.ok(
    preview.issues.some((issue) => issue.includes('target "vaca" needs') && issue.includes('"ZZ"')),
  );
});

test("content editor nao mascara copies invalido como 1 no preview do pipeline", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "0",
  };

  const previewDeck = hydratePreviewRawDeckDefinitionFromDraft(draft);
  assert.equal(previewDeck.targetIds.filter((targetId) => targetId === draft.targets[0]?.id).length, 0);

  const saveDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(saveDeck.targetIds.filter((targetId) => targetId === draft.targets[0]?.id).length, 0);

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, true);
});

test("content editor persiste copies de alvo e replica target no deck final", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };

  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(rawDeck.targetIds.filter((targetId) => targetId === draft.targets[0]?.id).length, 2);

  const source = createRawDeckDefinitionSource(entry.exportName, rawDeck);
  assert.ok(source.includes('targetIds: ["vaca", "vaca"'));

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  const copiesInRuntime = preview.selectedRuntimeDeck?.targets.filter((target) => target.id === draft.targets[0]?.id).length;
  assert.equal(copiesInRuntime, 2);
});

test("content editor omite copies no source bruto quando o valor volta para 1", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "1",
  };

  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.equal(rawDeck.targetIds.filter((targetId) => targetId === draft.targets[0]?.id).length, 1);

  const source = createRawDeckDefinitionSource(entry.exportName, rawDeck);
  assert.ok(!source.includes("copies:"));
});

test("content editor gera source bruto para o deck correto", () => {
  const entry = getRawDeckCatalogEntry("oceano");

  assert.ok(entry);
  assert.equal(entry.filePath, "src/data/content/decks/oceano.ts");

  const source = createRawDeckDefinitionSource(entry.exportName, entry.deck);

  assert.ok(source.includes('export const oceanoDeck: RawDeckDefinition = {'));
  assert.ok(source.includes('id: "oceano"'));
  assert.ok(source.includes('visualTheme: "abyss"'));
});

test("content editor cria deck novo com metadata de catalogo bruto persistivel", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));

  assert.match(entry.id, /^novo-deck/);
  assert.equal(entry.filePath, `src/data/content/decks/${entry.id}.ts`);
  assert.ok(entry.exportName.endsWith("Deck"));
  assert.equal(entry.deck.id, entry.id);
});

test("content editor monta silabas de target pelo builder sem perder duplicatas", () => {
  let syllablesText = "";
  syllablesText = appendContentEditorTargetSyllable(syllablesText, "va");
  syllablesText = appendContentEditorTargetSyllable(syllablesText, "CA");
  syllablesText = appendContentEditorTargetSyllable(syllablesText, "ca");

  assert.equal(syllablesText, "VA, CA, CA");
  assert.deepEqual(parseContentEditorTargetSyllables(syllablesText), ["VA", "CA", "CA"]);

  const removed = removeContentEditorTargetSyllableAt(syllablesText, 1);
  assert.equal(removed, "VA, CA");
});

test("content editor parseia silabas separadas por virgula ou quebra de linha", () => {
  assert.deepEqual(parseContentEditorTargetSyllables("CA,VA,LO"), ["CA", "VA", "LO"]);
  assert.deepEqual(parseContentEditorTargetSyllables("CA, VA, LO"), ["CA", "VA", "LO"]);
  assert.deepEqual(parseContentEditorTargetSyllables("CA\nVA\nLO"), ["CA", "VA", "LO"]);
});

test("content editor valida nome do alvo concatenando as silabas normalizadas", () => {
  const validation = buildContentEditorTargetNameValidation("CAVALO", "CA,VA,LO");

  assert.equal(validation.canValidate, true);
  assert.equal(validation.matchesName, true);
  assert.equal(validation.normalizedName, "CAVALO");
  assert.equal(validation.normalizedSyllableWord, "CAVALO");
  assert.equal(validation.respectsExplicitSegmentation, true);
});

test("content editor detecta quando as silabas nao formam o nome do alvo", () => {
  const validation = buildContentEditorTargetNameValidation("Banana", "BA, NA");

  assert.equal(validation.canValidate, true);
  assert.equal(validation.matchesName, false);
  assert.equal(validation.normalizedName, "BANANA");
  assert.equal(validation.normalizedSyllableWord, "BANA");
});

test("content editor rejeita nome inteiro como token unico de silaba", () => {
  const validation = buildContentEditorTargetNameValidation("CAVALO", "CAVALO");

  assert.equal(validation.canValidate, true);
  assert.equal(validation.normalizedName, "CAVALO");
  assert.equal(validation.normalizedSyllableWord, "CAVALO");
  assert.equal(validation.respectsExplicitSegmentation, false);
  assert.equal(validation.matchesName, false);
});

test("content editor popula o pool minimo a partir de targets validos e remove linhas sem alvo", () => {
  const nextRows = syncDeckPoolWithTargetMinimums(
    [{ id: "row-manual", syllable: "EX", count: "3" }],
    [
      {
        id: "banana",
        name: "Banana",
        copies: "1",
        description: "",
        emoji: "🍌",
        rarity: "comum",
        syllablesText: "BA, NA, NA",
      },
      {
        id: "borboleta",
        name: "Borboleta",
        copies: "1",
        description: "",
        emoji: "🦋",
        rarity: "comum",
        syllablesText: "BOR, BO, LE, TA",
      },
    ],
  );

  assert.deepEqual(
    nextRows.map((row) => ({ syllable: row.syllable, count: row.count })),
    [
      { syllable: "BA", count: "1" },
      { syllable: "NA", count: "2" },
      { syllable: "BOR", count: "1" },
      { syllable: "BO", count: "1" },
      { syllable: "LE", count: "1" },
      { syllable: "TA", count: "1" },
    ],
  );
});


test("content editor nao deixa baixar copies abaixo do minimo exigido pelos alvos", () => {
  const targets = [
    {
      id: "banana",
      name: "Banana",
      copies: "1",
      description: "",
      emoji: "🍌",
      rarity: "comum",
      syllablesText: "BA, NA, NA",
    },
  ];

  assert.equal(clampContentEditorSyllableCount("1", "NA", targets), "2");
  assert.equal(clampContentEditorSyllableCount("0", "NA", targets), "2");
  assert.equal(clampContentEditorSyllableCount("", "NA", targets), "2");
  assert.equal(clampContentEditorSyllableCount("5", "NA", targets), "5");
});



test("content editor deriva o pool salvo dos targets validos e remove silabas orfas", () => {
  const rawDeck = hydrateRawDeckDefinitionFromDraft({
    id: "deck-teste",
    name: "Deck Teste",
    description: "Deck para validar derivacao do pool.",
    emoji: "ðŸ§ª",
    visualTheme: "harvest",
    manualPoolAdjustments: [
      { id: "row-ba", syllable: "BA", count: "2", mode: "manual" },
      { id: "row-na", syllable: "NA", count: "2", mode: "manual" },
      { id: "row-zz", syllable: "ZZ", count: "7", mode: "manual" },
    ],
    targets: [
      {
        id: "banana",
        name: "Banana",
        copies: "1",
        description: "",
        emoji: "ðŸŒ",
        rarity: "comum",
        syllablesText: "BA, NA, NA",
      },
    ],
  });

  assert.deepEqual(rawDeck.syllables, {
    BA: 3,
    NA: 4,
  });
});

test("content editor nao depende de pool previo para aceitar alvo valido com silabas livres", () => {
  const rawDeck = hydrateRawDeckDefinitionFromDraft({
    id: "deck-teste",
    name: "Deck Teste",
    description: "Deck para validar alvo primeiro.",
    emoji: "ðŸ§ª",
    visualTheme: "harvest",
    manualPoolAdjustments: [],
    targets: [
      {
        id: "banana",
        name: "Banana",
        copies: "1",
        description: "",
        emoji: "ðŸŒ",
        rarity: "comum",
        syllablesText: "BA, NA, NA",
      },
    ],
  });

  assert.deepEqual(rawDeck.syllables, {
    BA: 1,
    NA: 2,
  });
});


test("content editor valida metadata canonica de save para deck novo", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));
  const validatedEntry = validateContentDeckSaveEntry(entry);

  assert.equal(validatedEntry.id, entry.id);
  assert.equal(validatedEntry.exportName, entry.exportName);
  assert.equal(validatedEntry.filePath, entry.filePath);
  assert.notEqual(validatedEntry.deck, entry.deck);
});

test("content editor rejeita deckId inseguro no save dev-only", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));

  assert.throws(
    () =>
      validateContentDeckSaveEntry({
        ...entry,
        id: "../fora",
        deck: {
          ...entry.deck,
          id: "../fora",
        },
      }),
    /not safe for dev-only save/i,
  );
});

test("content editor rejeita exportName divergente no save dev-only", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));

  assert.throws(
    () =>
      validateContentDeckSaveEntry({
        ...entry,
        exportName: "unsafeDeck",
      }),
    /must use exportName/i,
  );
});

test("content editor rejeita filePath divergente no save dev-only", () => {
  const entry = createEmptyContentEditorDeckEntry(rawDeckCatalogEntries.map((deckEntry) => deckEntry.id));

  assert.throws(
    () =>
      validateContentDeckSaveEntry({
        ...entry,
        filePath: "src/data/content/decks/../escape.ts",
      }),
    /must use filePath/i,
  );
});

test("content editor injeta deck novo no pipeline real antes do save", () => {
  const { entry, draft } = createSaveableNewDeckDraft();
  const previewEntries = upsertRawDeckInCatalog(rawDeckCatalogEntries, entry);
  const preview = buildContentEditorPreview(previewEntries, rawTargetCatalog, entry.id, draft);

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

test("content editor permite criar editar e remover target no draft mantendo catalogo global como fonte raw", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  const removedTargetId = draft.targets[0]?.id;
  assert.ok(removedTargetId);

  draft.targets = draft.targets.slice(1);
  draft.targets.push({
    id: "fazenda-builder-target",
    name: "VACA BUILDER",
    copies: "2",
    description: "Target criado no builder minimo.",
    emoji: "🐮",
    rarity: "raro",
    syllablesText: "VA, CA",
  });

  const rawDeck = hydrateRawDeckDefinitionFromDraft(draft);
  assert.ok(!rawDeck.targetIds.includes(removedTargetId));
  assert.equal(rawDeck.targetIds.filter((targetId) => targetId === "fazenda-builder-target").length, 2);
  const nextTargetCatalog = hydrateRawTargetCatalogFromDraftTargets(rawTargetCatalog, draft.targets);
  assert.deepEqual(nextTargetCatalog.find((target) => target.id === "fazenda-builder-target"), {
    id: "fazenda-builder-target",
    name: "VACA BUILDER",
    description: "Target criado no builder minimo.",
    emoji: "🐮",
    rarity: "raro",
    syllables: ["VA", "CA"],
  });

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.ok(preview.selectedDeckModel?.targetDefinitions.some((target) => target.id === "fazenda-builder-target"));
  assert.ok(preview.selectedRuntimeDeck?.targets.some((target) => target.id === "fazenda-builder-target"));
});

test("content editor aceita silabas novas validas no alvo e mantem pipeline coerente", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets.push({
    id: "fazenda-lagarta",
    name: "Lagarta",
    copies: "1",
    description: "",
    emoji: "🐛",
    rarity: "comum",
    syllablesText: "LA, GAR, TA",
  });

  const preview = buildContentEditorPreview(rawDeckCatalogEntries, rawTargetCatalog, entry.id, draft);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;

  assert.ok(preview.selectedDeckModel?.definition.cardIds.includes("syllable.gar"));
  assert.equal(preview.selectedRuntimeDeck?.syllables.LA, 1);
  assert.equal(preview.selectedRuntimeDeck?.syllables.GAR, 1);
  assert.equal(preview.selectedRuntimeDeck?.syllables.TA >= 1, true);
});

test("content editor gera index bruto incluindo deck novo", () => {
  const { entry } = createSaveableNewDeckDraft();
  const indexSource = createRawDeckCatalogIndexSource(upsertRawDeckInCatalog(rawDeckCatalogEntries, entry));

  assert.ok(indexSource.includes(`import { ${entry.exportName} } from "./${entry.id}";`));
  assert.ok(indexSource.includes(`id: "${entry.id}"`));
  assert.ok(indexSource.includes(`filePath: "src/data/content/decks/${entry.id}.ts"`));
});

test("content editor duplica deck com deckId novo e preserva targetIds canonicos", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  const duplicate = createDuplicatedContentEditorDeckEntry(
    draft,
    rawDeckCatalogEntries.map((deckEntry) => deckEntry.id),
  );

  assert.notEqual(duplicate.id, entry.id);
  assert.equal(duplicate.deck.id, duplicate.id);
  assert.equal(duplicate.exportName.endsWith("Deck"), true);
  assert.equal(duplicate.filePath, `src/data/content/decks/${duplicate.id}.ts`);
  assert.deepEqual(duplicate.deck.targetIds, entry.deck.targetIds);

  const preview = buildContentEditorPreview(
    upsertRawDeckInCatalog(rawDeckCatalogEntries, duplicate),
    rawTargetCatalog,
    duplicate.id,
    createContentEditorDeckDraft(duplicate.deck, rawTargetCatalog),
  );
  assert.equal(preview.ok, true);
});

test("content editor deriva deckId canonico do nome do deck para checagem e save", () => {
  assert.equal(createDeckIdCandidate("Fazenda Turbo"), "fazenda-turbo");
  assert.equal(createDeckIdCandidate("  Ação Épica  "), "acao-epica");
  assert.equal(createDeckIdCandidate("", "fazenda"), "fazenda");
});

test("content editor remove deck do catalogo bruto sem deixar entrada fantasma no indice", () => {
  const nextEntries = removeRawDeckFromCatalog(rawDeckCatalogEntries, "fazenda");
  const indexSource = createRawDeckCatalogIndexSource(nextEntries);

  assert.ok(!nextEntries.some((entry) => entry.id === "fazenda"));
  assert.ok(!indexSource.includes('id: "fazenda"'));
});

test("content editor gera diff legivel do source bruto antes do save", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };

  const currentSource = createRawDeckDefinitionSource(entry.exportName, entry.deck);
  const nextSource = createRawDeckDefinitionSource(entry.exportName, hydrateRawDeckDefinitionFromDraft(draft));
  const diff = buildContentEditorSourceDiff(currentSource, nextSource);

  assert.equal(diff.hasChanges, true);
  assert.ok(diff.addedCount > 0);
  assert.ok(diff.lines.some((line) => line.type === "added" && line.value.includes("targetIds")));
});

test("content editor gera source para o catalogo global de targets com alvos do draft", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  draft.targets.push({
    id: "fazenda-ganso",
    name: "GANSO",
    copies: "1",
    description: "Alvo adicionado so para validar o source global.",
    emoji: "🪿",
    rarity: "comum",
    syllablesText: "GAN, SO",
  });

  const nextTargetCatalog = hydrateRawTargetCatalogFromDraftTargets(rawTargetCatalog, draft.targets);
  const source = createRawTargetCatalogSource(nextTargetCatalog);

  assert.ok(source.includes('export const rawTargetCatalog: RawTargetDefinition[] = ['));
  assert.ok(source.includes('id: "fazenda-ganso"'));
  assert.ok(source.includes('syllables: ["GAN", "SO"]'));
});

test("content editor resume mudancas por categoria antes do save", () => {
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const baseline = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);

  draft.name = "Fazenda Turbo";
  draft.targets[0] = {
    ...draft.targets[0],
    copies: "2",
  };
  draft.manualPoolAdjustments = [{ id: "manual-va", syllable: "VA", count: "3", mode: "manual" }];

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
  const entry = getRawDeckCatalogEntry("fazenda");

  assert.ok(entry);

  const baseline = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);
  const draft = createContentEditorDeckDraft(entry.deck, rawTargetCatalog);

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
