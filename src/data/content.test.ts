import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_RESOLVED_DECKS,
  APP_RESOLVED_DECKS_BY_ID,
  getFirstResolvedDeck,
  getFallbackResolvedEnemyDeck,
  resolveAppBattleSetup,
  resolveAppBattleSetupSelection,
  resolveAppDeckPair,
  resolveAppDeck,
} from "../app/appDeckResolver";
import { CONFIG } from "../logic/gameLogic";
import { resolveBattleMulliganAction } from "../components/screens/battleResolution";
import {
  createBattleRuntimeInitialGameState,
  createBattleRuntimePlayerState,
  createBattleRuntimeSetup,
  replaceBattleRuntimeTargetInSlot,
  resolveBattleRuntimeDeckThemeClass,
  resolveBattleRuntimeDrawnHandCardRefs,
  resolveBattleRuntimePlayerCardPiles,
} from "../components/screens/BattleRuntimeSetup";
import {
  CARD_CATALOG,
  CARD_CATALOG_BY_ID,
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  DeckContentError,
  createBattleDeckSpec,
  createBattleSetupSpec,
  DECKS,
  DECK_MODELS,
  DECK_MODELS_BY_ID,
  RUNTIME_DECKS_BY_ID,
  adaptDeckModelsToRuntimeDecks,
  buildCardCatalog,
  buildDeckModels,
  loadContentCatalog,
  loadDeckCatalog,
  rawTargetCatalog,
} from "./content";
import { RawDeckDefinition, RawTargetDefinition } from "./content/types";

test("CONTENT_CATALOG expÃµe o catÃ¡logo normalizado como fonte de verdade", () => {
  assert.ok(CONTENT_CATALOG.cards.length > 0);
  assert.ok(CONTENT_CATALOG.targets.length >= DECKS.length * CONFIG.targetsInPlay);
  assert.equal(CONTENT_PIPELINE.catalog, CONTENT_CATALOG);
  assert.equal(CONTENT_PIPELINE.cardCatalog, CARD_CATALOG);
  assert.equal(CONTENT_PIPELINE.deckModels, DECK_MODELS);
  assert.equal(CONTENT_PIPELINE.runtimeDecks, DECKS);
  assert.equal(CONTENT_PIPELINE.cardCatalogById, CARD_CATALOG_BY_ID);
  assert.equal(CONTENT_PIPELINE.deckModelsById, DECK_MODELS_BY_ID);
  assert.equal(CONTENT_PIPELINE.runtimeDecksById, RUNTIME_DECKS_BY_ID);

  CONTENT_CATALOG.cards.forEach((card) => {
    assert.ok(card.id.startsWith("syllable."));
    assert.equal(card.syllable, card.syllable.toUpperCase());
    assert.equal(CONTENT_CATALOG.cardsById[card.id], card);
  });

  CONTENT_CATALOG.targets.forEach((target) => {
    assert.equal(CONTENT_CATALOG.targetsById[target.id], target);
    target.cardIds.forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
    });
  });

  CONTENT_CATALOG.decks.forEach((deck) => {
    assert.equal(CONTENT_CATALOG.decksById[deck.id], deck);
    deck.cardIds.forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
      assert.ok(cardId in deck.cardPool);
    });
    deck.targetIds.forEach((targetId) => {
      assert.ok(CONTENT_CATALOG.targetsById[targetId]);
    });
    Object.keys(deck.cardPool).forEach((cardId) => {
      assert.ok(CONTENT_CATALOG.cardsById[cardId]);
    });
  });
});

test("deck models explicitam a fronteira catalogo -> deck model -> runtime legado", () => {
  const deckModels = buildDeckModels(CONTENT_CATALOG);
  const runtimeDecks = adaptDeckModelsToRuntimeDecks(deckModels, CONTENT_CATALOG);

  assert.deepEqual(runtimeDecks, DECKS);
  assert.equal(deckModels.length, CONTENT_CATALOG.decks.length);

  deckModels.forEach((deckModel) => {
    assert.equal(deckModel.definition, CONTENT_CATALOG.decksById[deckModel.id]);
    assert.equal(DECK_MODELS_BY_ID[deckModel.id], CONTENT_PIPELINE.deckModelsById[deckModel.id]);
    assert.equal(RUNTIME_DECKS_BY_ID[deckModel.id], DECKS.find((deck) => deck.id === deckModel.id));
    assert.deepEqual(
      [...deckModel.cards.map((entry) => entry.cardId)].sort(),
      [...deckModel.definition.cardIds].sort(),
    );
    assert.deepEqual(
      deckModel.targetInstances.map((entry) => entry.targetId),
      deckModel.definition.targetIds,
    );

    deckModel.cards.forEach((entry) => {
      assert.equal(entry.card, CONTENT_CATALOG.cardsById[entry.cardId]);
      assert.equal(deckModel.definition.cardPool[entry.cardId], entry.copiesInDeck);
    });
  });
});

test("card catalog explicita cartas canonicas como entidade central do pipeline", () => {
  const rebuiltCardCatalog = buildCardCatalog(CONTENT_CATALOG);

  assert.deepEqual(rebuiltCardCatalog, CARD_CATALOG);
  assert.equal(CARD_CATALOG.length, CONTENT_CATALOG.cards.length);

  CARD_CATALOG.forEach((entry) => {
    assert.equal(CARD_CATALOG_BY_ID[entry.id], entry);
    assert.equal(entry.card, CONTENT_CATALOG.cardsById[entry.id]);
    assert.ok(entry.deckIds.length >= 1);
    assert.ok(entry.targetIds.length >= 1);
    assert.equal(
      entry.totalCopies,
      entry.deckIds.reduce((sum, deckId) => sum + (entry.copiesByDeckId[deckId] ?? 0), 0),
    );
  });
});

test("DECKS expÃµe um catÃ¡logo vÃ¡lido e utilizÃ¡vel pelo runtime atual", () => {
  assert.ok(DECKS.length >= 4);

  const deckIds = new Set<string>();
  DECKS.forEach((deck) => {
    assert.ok(deck.id.length > 0);
    assert.ok(!deckIds.has(deck.id));
    deckIds.add(deck.id);

    const totalSyllables = Object.values(deck.syllables).reduce((sum, count) => sum + count, 0);
    assert.ok(totalSyllables >= CONFIG.handSize);
    assert.ok(deck.targets.length >= CONFIG.targetsInPlay);

    deck.targets.forEach((target) => {
      assert.ok(target.id.length > 0);
      target.syllables.forEach((syllable) => {
        assert.ok(deck.syllables[syllable] > 0);
      });
    });
  });
});

test("loadContentCatalog normaliza decks em deck definitions e cards canÃ´nicos por sÃ­laba", () => {
  const rawTargets: RawTargetDefinition[] = [
    {
      id: "banana",
      name: "BANANA",
      emoji: "ðŸŒ",
      syllables: ["BA", "NA", "NA"],
      rarity: "raro",
    },
    {
      id: "baba",
      name: "BABA",
      emoji: "ðŸ«§",
      syllables: ["BA", "BA"],
      rarity: "comum",
    },
  ];

  const catalog = loadContentCatalog(
    [
      {
        id: "mini",
        name: "Mini",
        description: "Deck mÃ­nimo vÃ¡lido.",
        emoji: "ðŸ§ª",
        visualTheme: "harvest",
        syllables: {
          BA: 3,
          NA: 2,
        },
        targetIds: ["banana", "baba"],
      },
    ],
    rawTargets,
  );

  assert.deepEqual(
    catalog.cards.map((card) => card.syllable).sort(),
    ["BA", "NA"],
  );
  assert.deepEqual(catalog.decks[0]?.targetIds, ["banana", "baba"]);
  assert.deepEqual(catalog.decks[0]?.cardIds, ["syllable.ba", "syllable.na"]);
  assert.deepEqual(catalog.targetsById.banana?.cardIds, ["syllable.ba", "syllable.na", "syllable.na"]);
  assert.equal(catalog.decks[0]?.cardPool["syllable.ba"], 3);
});

test("loadContentCatalog e loadDeckCatalog preservam copies persistido no deck bruto", () => {
  const rawTargets: RawTargetDefinition[] = [
    {
      id: "banana",
      name: "BANANA",
      emoji: "ðŸŒ",
      syllables: ["BA", "NA", "NA"],
      rarity: "raro",
    },
    {
      id: "bola",
      name: "BOLA",
      emoji: "âš½",
      syllables: ["BO", "LA"],
      rarity: "comum",
    },
  ];
  const deckWithCopies: RawDeckDefinition = {
    id: "mini-copies",
    name: "Mini Copies",
    description: "Deck bruto persistido com copies.",
    emoji: "ðŸ§ª",
    visualTheme: "harvest",
    syllables: {
      BA: 3,
      NA: 2,
      BO: 2,
      LA: 1,
    },
    targetIds: ["banana", "banana", "bola"],
  };

  const catalog = loadContentCatalog([deckWithCopies], rawTargets);
  const runtimeDecks = loadDeckCatalog([deckWithCopies], rawTargets);

  assert.deepEqual(catalog.decks[0]?.targetIds, ["banana", "banana", "bola"]);
  assert.equal(runtimeDecks[0]?.targets.filter((target) => target.id === "banana").length, 2);
});

test("loadDeckCatalog rejeita targets impossÃ­veis de completar com as sÃ­labas do deck", () => {
  const rawTargets: RawTargetDefinition[] = [
    {
      id: "banana",
      name: "BANANA",
      emoji: "ðŸŒ",
      syllables: ["BA", "NA", "NA"],
      rarity: "raro",
    },
    {
      id: "bala",
      name: "BALA",
      emoji: "ðŸ¬",
      syllables: ["BA", "LA"],
      rarity: "comum",
    },
  ];
  const invalidDeck: RawDeckDefinition = {
    id: "broken",
    name: "Quebrado",
    description: "Deck invÃ¡lido para teste.",
    emoji: "ðŸ§ª",
    visualTheme: "harvest",
    syllables: {
      BA: 2,
    },
    targetIds: ["banana", "bala"],
  };

  assert.throws(
    () => loadDeckCatalog([invalidDeck], rawTargets),
    (error: unknown) =>
      error instanceof DeckContentError &&
      error.issues.some((issue) => issue.includes('target "banana" needs 2x "NA"')),
  );
});

test("loadDeckCatalog rejeita deck com poucos targets para o board atual", () => {
  const rawTargets: RawTargetDefinition[] = [
    {
      id: "tiny-target",
      name: "TINY",
      emoji: "ðŸ”¹",
      syllables: ["TI", "NY"],
      rarity: "comum",
    },
  ];
  const invalidDeck: RawDeckDefinition = {
    id: "tiny",
    name: "MinÃºsculo",
    description: "Deck invÃ¡lido para teste.",
    emoji: "ðŸ§©",
    visualTheme: "abyss",
    syllables: {
      TI: 3,
      NY: 3,
      TO: 3,
    },
    targetIds: ["tiny-target"],
  };

  assert.throws(
    () => loadDeckCatalog([invalidDeck], rawTargets),
    (error: unknown) =>
      error instanceof DeckContentError &&
      error.issues.some((issue) => issue.includes(`at least ${CONFIG.targetsInPlay} targets`)),
  );
});

test("app deck resolver usa BattleSetupSpec como fronteira central sem expor runtimeDeck", () => {
  assert.equal(APP_RESOLVED_DECKS.length, DECK_MODELS.length);

  APP_RESOLVED_DECKS.forEach((entry) => {
    assert.equal(APP_RESOLVED_DECKS_BY_ID[entry.deckId], entry);
    assert.equal(resolveAppDeck(entry.deckId), entry);
    assert.equal(entry.deckModel, DECK_MODELS_BY_ID[entry.deckId]);
    assert.equal(entry.battleDeck.deckId, entry.deckId);
    assert.equal(entry.definition, entry.deckModel.definition);
    assert.equal(entry.name, entry.deckModel.definition.name);
    assert.equal(entry.description, entry.deckModel.definition.description);
    assert.equal(entry.emoji, entry.deckModel.definition.emoji);
    assert.equal(entry.visualTheme, entry.deckModel.definition.visualTheme);
    assert.equal(entry.targetCardCount, entry.deckModel.targetInstances.length);
    assert.equal(
      entry.syllableReserveCount,
      entry.deckModel.cards.reduce((total, cardEntry) => total + cardEntry.copiesInDeck, 0),
    );
    assert.deepEqual(entry.previewTargets, entry.deckModel.targetInstances.slice(0, 4));
    assert.equal("runtimeDeck" in entry, false);
  });

  const firstResolvedDeck = getFirstResolvedDeck();
  assert.equal(firstResolvedDeck?.deckId, APP_RESOLVED_DECKS[0]?.deckId);
  assert.deepEqual(
    resolveAppDeckPair(APP_RESOLVED_DECKS[0]?.deckId, APP_RESOLVED_DECKS[1]?.deckId),
    APP_RESOLVED_DECKS.length >= 2
      ? {
          localDeck: APP_RESOLVED_DECKS[0],
          remoteDeck: APP_RESOLVED_DECKS[1],
        }
      : null,
  );
  assert.equal(getFallbackResolvedEnemyDeck("multiplayer")?.deckId, getFirstResolvedDeck()?.deckId);
  const selection = resolveAppBattleSetupSelection({
    mode: "multiplayer",
    localDeckId: APP_RESOLVED_DECKS[0]?.deckId,
    remoteDeckId: APP_RESOLVED_DECKS[1]?.deckId,
    localSide: "player",
    roomId: "ROOM-APP",
  });
  assert.equal(selection.localDeck?.deckId, APP_RESOLVED_DECKS[0]?.deckId);
  assert.equal(selection.remoteDeck?.deckId, APP_RESOLVED_DECKS[1]?.deckId);
  assert.equal(selection.battleSetup?.participants.player.deck.deckId, APP_RESOLVED_DECKS[0]?.deckId);
  assert.equal(selection.battleSetup?.participants.enemy.deck.deckId, APP_RESOLVED_DECKS[1]?.deckId);
});

test("createBattleDeckSpec preserva ids canonicos, instancias de target e tema visual sem depender do runtime legado", () => {
  const deckModel = DECK_MODELS_BY_ID.fazenda ?? DECK_MODELS[0];
  assert.ok(deckModel);

  const spec = createBattleDeckSpec(deckModel);

  assert.equal(spec.deckId, deckModel.id);
  assert.equal(spec.presentation.visualTheme, deckModel.definition.visualTheme);
  assert.equal(spec.presentation.name, deckModel.definition.name);
  assert.equal(spec.taxonomy.superclass, deckModel.definition.superclass);
  assert.deepEqual(spec.gameplay.cardPool, deckModel.definition.cardPool);
  assert.deepEqual(
    spec.cards.map((card) => card.cardId),
    deckModel.cards.map((entry) => entry.cardId),
  );
  assert.deepEqual(
    spec.cards.map((card) => card.copiesInDeck),
    deckModel.cards.map((entry) => entry.copiesInDeck),
  );
  assert.deepEqual(
    spec.targetPool.map((target) => target.targetInstanceId),
    deckModel.targetInstances.map((entry) => entry.instanceKey),
  );
  assert.deepEqual(
    spec.targetPool.map((target) => target.targetId),
    deckModel.targetInstances.map((entry) => entry.targetId),
  );
  assert.deepEqual(
    spec.targetPool.map((target) => target.requiredCardIds),
    deckModel.targetInstances.map((entry) => entry.target.cardIds),
  );
  assert.deepEqual(
    spec.targetPool.map((target) => target.requiredSyllables),
    deckModel.targetInstances.map((entry) =>
      entry.target.cardIds.map((cardId) => CONTENT_CATALOG.cardsById[cardId]?.syllable ?? cardId),
    ),
  );
  assert.equal("color" in spec.presentation, false);
});

test("createBattleSetupSpec monta setup canonico da Battle a partir de DeckModel sem passar por runtimeDeck", () => {
  const playerDeck = DECK_MODELS_BY_ID.fazenda ?? DECK_MODELS[0];
  const enemyDeck = DECK_MODELS_BY_ID.oceano ?? DECK_MODELS[1] ?? DECK_MODELS[0];
  assert.ok(playerDeck);
  assert.ok(enemyDeck);

  const setup = createBattleSetupSpec({
    mode: "multiplayer",
    roomId: "ROOM-123",
    playerDeck,
    enemyDeck,
  });

  assert.equal(setup.mode, "multiplayer");
  assert.equal(setup.roomId, "ROOM-123");
  assert.equal(setup.opening.startPolicy, "coin");
  assert.equal(setup.participants.player.side, "player");
  assert.equal(setup.participants.enemy.side, "enemy");
  assert.equal(setup.participants.player.deck.deckId, playerDeck.id);
  assert.equal(setup.participants.enemy.deck.deckId, enemyDeck.id);
  assert.deepEqual(
    setup.participants.player.deck.gameplay.targetOrder,
    playerDeck.targetInstances.map((entry) => entry.instanceKey),
  );
  assert.deepEqual(
    setup.participants.enemy.deck.gameplay.targetOrder,
    enemyDeck.targetInstances.map((entry) => entry.instanceKey),
  );
});

test("resolveAppBattleSetup preserva ids e tema visual ate a entrada publica da Battle", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });

  assert.ok(setup);
  assert.equal(setup?.participants.player.deck.deckId, localDeck.deckId);
  assert.equal(setup?.participants.enemy.deck.deckId, remoteDeck.deckId);
  assert.equal(
    setup?.participants.player.deck.presentation.visualTheme,
    localDeck.visualTheme,
  );
  assert.deepEqual(
    setup?.participants.player.deck.cards.map((card) => card.cardId),
    localDeck.battleDeck.cards.map((card) => card.cardId),
  );
});

test("ponte unica BattleSetupSpec -> runtime atual gera setup local coerente sem tocar gameLogic", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const runtime = createBattleRuntimeSetup(setup!);
  const initialGame = createBattleRuntimeInitialGameState(setup!);

  assert.equal(runtime.playerDeckSpec.deckId, localDeck.deckId);
  assert.equal(runtime.enemyDeckSpec.deckId, remoteDeck.deckId);
  assert.equal(runtime.playerDeckCatalog.deckId, localDeck.deckId);
  assert.equal(runtime.enemyDeckCatalog.deckId, remoteDeck.deckId);
  assert.equal(
    runtime.playerDeckCatalog.cardsById[localDeck.battleDeck.cards[0]!.cardId]?.cardId,
    localDeck.battleDeck.cards[0]!.cardId,
  );
  assert.equal(
    runtime.playerDeckCatalog.cardsBySyllable[localDeck.battleDeck.cards[0]!.syllable]?.cardId,
    localDeck.battleDeck.cards[0]!.cardId,
  );
  assert.equal(
    resolveBattleRuntimeDeckThemeClass(runtime.playerDeckSpec),
    RUNTIME_DECKS_BY_ID[localDeck.deckId]?.color,
  );
  assert.equal(
    resolveBattleRuntimeDeckThemeClass(runtime.enemyDeckSpec),
    RUNTIME_DECKS_BY_ID[remoteDeck.deckId]?.color,
  );
  assert.equal(initialGame.players[0]?.deckId, localDeck.deckId);
  assert.equal(initialGame.players[1]?.deckId, remoteDeck.deckId);
  assert.equal(initialGame.mode, "local");
  assert.equal(initialGame.players[0]?.hand.length, CONFIG.handSize);
  assert.equal(initialGame.players[1]?.hand.length, CONFIG.handSize);
  assert.equal(initialGame.players[0]?.targets.length, CONFIG.targetsInPlay);
  assert.equal(initialGame.players[1]?.targets.length, CONFIG.targetsInPlay);
});

test("ponte unica BattleSetupSpec -> runtime atual respeita a ordenacao player/enemy do room lifecycle", () => {
  const hostDeck = APP_RESOLVED_DECKS[0];
  const guestDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(hostDeck);
  assert.ok(guestDeck);

  const setup = resolveAppBattleSetup({
    mode: "multiplayer",
    localDeckId: guestDeck.deckId,
    remoteDeckId: hostDeck.deckId,
    localSide: "enemy",
    roomId: "ROOM-LIFECYCLE",
  });
  assert.ok(setup);

  const runtime = createBattleRuntimeSetup(setup!);
  const initialGame = createBattleRuntimeInitialGameState(setup!);

  assert.equal(setup?.participants.player.deck.deckId, hostDeck.deckId);
  assert.equal(setup?.participants.enemy.deck.deckId, guestDeck.deckId);
  assert.equal(runtime.playerDeckSpec.deckId, hostDeck.deckId);
  assert.equal(runtime.enemyDeckSpec.deckId, guestDeck.deckId);
  assert.equal(initialGame.players[0]?.deckId, hostDeck.deckId);
  assert.equal(initialGame.players[1]?.deckId, guestDeck.deckId);
  assert.equal(initialGame.roomId, "ROOM-LIFECYCLE");
});

test("runtime interno continua aceitando mulligan sem depender de Deck na borda publica", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const initialGame = createBattleRuntimeInitialGameState(setup);
  const beforeMulliganRefs = resolveBattleRuntimePlayerCardPiles(
    initialGame.players[0]!,
    createBattleRuntimeSetup(setup).playerDeckCatalog,
  );
  const mulligan = resolveBattleMulliganAction(initialGame, 0, [0, 1], CONFIG.handSize);
  const afterMulliganRefs = resolveBattleRuntimePlayerCardPiles(
    mulligan.nextPlayers[0]!,
    createBattleRuntimeSetup(setup).playerDeckCatalog,
  );

  assert.equal(mulligan.nextPlayers[0]?.hand.length, CONFIG.handSize);
  assert.equal(mulligan.nextPlayers[0]?.mulliganUsedThisRound, true);
  assert.equal(mulligan.returnedCards.length, 2);
  assert.equal(mulligan.drawnCards.length, 2);
  assert.equal(beforeMulliganRefs.hand.length, CONFIG.handSize);
  assert.equal(afterMulliganRefs.hand.length, CONFIG.handSize);
  assert.equal(afterMulliganRefs.discard.length, mulligan.nextPlayers[0]?.discard.length ?? 0);
});

test("reposicao de target usa BattleDeckSpec na borda interna sem reintroduzir Deck no flow", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const initialGame = createBattleRuntimeInitialGameState(setup);
  const replacedPlayer = replaceBattleRuntimeTargetInSlot(
    initialGame.players[0]!,
    0,
    setup.participants.player.deck,
  );

  assert.equal(replacedPlayer.deckId, setup.participants.player.deck.deckId);
  assert.equal(replacedPlayer.targets.length, CONFIG.targetsInPlay);
  assert.ok(replacedPlayer.targets[0]);
  assert.equal(replacedPlayer.targets[0]?.justArrived, true);
  assert.equal(
    replacedPlayer.targets[0]?.canonicalTargetId,
    replacedPlayer.targets[0]?.id,
  );
  assert.ok(replacedPlayer.targets[0]?.targetInstanceId);
  assert.deepEqual(
    replacedPlayer.targets[0]?.requiredCardIds,
    setup.participants.player.deck.targetPool.find(
      (target) => target.targetInstanceId === replacedPlayer.targets[0]?.targetInstanceId,
    )?.requiredCardIds,
  );
  assert.ok(
    setup.participants.player.deck.targetPool.some(
      (target) => target.targetId === replacedPlayer.targets[0]?.id,
    ),
  );
});

test("targets do runtime preservam identidade canonica mesmo mantendo o shape operacional", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const initialGame = createBattleRuntimeInitialGameState(setup);
  const firstTarget = initialGame.players[0]?.targets[0];
  assert.ok(firstTarget);

  assert.equal(firstTarget?.canonicalTargetId, firstTarget?.id);
  assert.ok(firstTarget?.targetInstanceId);
  assert.ok(firstTarget?.requiredCardIds?.length);
  assert.equal(firstTarget?.sourceDeckId, setup.participants.player.deck.deckId);
});

test("runtime card lookup preserva cardId ate a borda operacional da mao e da compra", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const runtime = createBattleRuntimeSetup(setup);
  const initialGame = createBattleRuntimeInitialGameState(setup);
  const playerPiles = resolveBattleRuntimePlayerCardPiles(
    initialGame.players[0]!,
    runtime.playerDeckCatalog,
  );

  assert.equal(playerPiles.hand.length, initialGame.players[0]?.hand.length);
  assert.equal(playerPiles.syllableDeck.length, initialGame.players[0]?.syllableDeck.length);
  assert.equal(playerPiles.discard.length, initialGame.players[0]?.discard.length);
  assert.ok(playerPiles.hand.every((cardRef) => cardRef.cardId.startsWith("syllable.")));
  assert.ok(
    playerPiles.hand.every(
      (cardRef) => runtime.playerDeckCatalog.cardsById[cardRef.cardId]?.syllable === cardRef.syllable,
    ),
  );
});

test("runtime card lookup mantem refs unicas entre mao deck e descarte", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  const remoteDeck = APP_RESOLVED_DECKS[1] ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);
  assert.ok(remoteDeck);

  const setup = resolveAppBattleSetup({
    mode: "local",
    localDeckId: localDeck.deckId,
    remoteDeckId: remoteDeck.deckId,
    localSide: "player",
  });
  assert.ok(setup);

  const runtime = createBattleRuntimeSetup(setup);
  const initialGame = createBattleRuntimeInitialGameState(setup);
  const player = initialGame.players[0]!;
  const simulatedPlayer = {
    ...player,
    discard: player.hand.slice(0, 1),
    hand: player.hand.slice(1),
  };
  const piles = resolveBattleRuntimePlayerCardPiles(simulatedPlayer, runtime.playerDeckCatalog);
  const allRuntimeIds = [...piles.hand, ...piles.syllableDeck, ...piles.discard].map((cardRef) => cardRef.runtimeCardId);

  assert.equal(new Set(allRuntimeIds).size, allRuntimeIds.length);
});

test("runtime card lookup resolve compras por runtimeCardId mesmo com silabas duplicadas", () => {
  const localDeck = APP_RESOLVED_DECKS.find((deck) =>
    deck.battleDeck.cards.some((card) => card.copiesInDeck > 1),
  ) ?? APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);

  const runtime = createBattleRuntimeSetup(
    createBattleSetupSpec({
      mode: "local",
      playerDeck: localDeck.deckModel,
      enemyDeck: localDeck.deckModel,
    }),
  );

  const playerState = createBattleRuntimePlayerState(runtime.playerDeckSpec, "Teste");
  const drawnRefs = resolveBattleRuntimeDrawnHandCardRefs(
    playerState,
    runtime.playerDeckCatalog,
    playerState.hand.length,
  );

  assert.equal(drawnRefs.length, playerState.hand.length);
  assert.ok(drawnRefs.every((cardRef) => cardRef.runtimeCardId.includes(cardRef.cardId)));
  assert.equal(new Set(drawnRefs.map((cardRef) => cardRef.runtimeCardId)).size, drawnRefs.length);
});

test("runtime card lookup permanece estavel apos mover cartas entre mao descarte e deck", () => {
  const localDeck = APP_RESOLVED_DECKS[0];
  assert.ok(localDeck);

  const runtime = createBattleRuntimeSetup(
    createBattleSetupSpec({
      mode: "local",
      playerDeck: localDeck.deckModel,
      enemyDeck: localDeck.deckModel,
    }),
  );

  const playerState = createBattleRuntimePlayerState(runtime.playerDeckSpec, "Teste");
  const movedToDiscard = playerState.hand.slice(0, 2);
  const simulatedPlayer = {
    ...playerState,
    hand: playerState.hand.slice(2),
    discard: [...playerState.discard, ...movedToDiscard],
  };
  const piles = resolveBattleRuntimePlayerCardPiles(simulatedPlayer, runtime.playerDeckCatalog);
  const handIds = piles.hand.map((cardRef) => cardRef.runtimeCardId);
  const discardIds = piles.discard.map((cardRef) => cardRef.runtimeCardId);
  const deckIds = piles.syllableDeck.map((cardRef) => cardRef.runtimeCardId);

  assert.equal(new Set([...handIds, ...discardIds, ...deckIds]).size, handIds.length + discardIds.length + deckIds.length);
  assert.equal(discardIds.length, movedToDiscard.length);
});
