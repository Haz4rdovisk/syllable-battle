import { nanoid } from "nanoid";
import { CONFIG, drawCards, makeUiTarget, shuffle } from "../../logic/gameLogic";
import type {
  BattleSide,
  GameState,
  PlayerState,
  Syllable,
  Target,
} from "../../types/game";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import type {
  BattleCardSpec,
  BattleDeckSpec,
  BattleSetupSpec,
  BattleTargetSpec,
} from "../../data/content";

export interface BattleRuntimeDeckCatalog {
  deckId: string;
  visualTheme: BattleDeckSpec["presentation"]["visualTheme"];
  cardsById: Record<string, BattleCardSpec>;
  cardsBySyllable: Record<Syllable, BattleCardSpec>;
  cardRefsByRuntimeId: Record<string, BattleRuntimeCardRef>;
  cardRefsBySyllable: Record<Syllable, BattleRuntimeCardRef[]>;
  targetSpecsByInstanceId: Record<string, BattleTargetSpec>;
  targetSpecsByTargetId: Record<string, BattleTargetSpec>;
  targetInstanceIdsInOrder: string[];
}

export interface BattleRuntimeCardRef {
  runtimeCardId: string;
  deckId: string;
  cardId: string;
  syllable: Syllable;
  copyIndex: number;
}

export interface BattleRuntimeSetup {
  mode: BattleSetupSpec["mode"];
  roomId?: string;
  playerDeckSpec: BattleDeckSpec;
  enemyDeckSpec: BattleDeckSpec;
  playerDeckCatalog: BattleRuntimeDeckCatalog;
  enemyDeckCatalog: BattleRuntimeDeckCatalog;
}

function createRuntimeTargetFromSpec(target: BattleTargetSpec): Target {
  return {
    id: target.targetId,
    name: target.name,
    emoji: target.emoji,
    syllables: [...target.requiredSyllables],
    rarity: target.rarity,
    description: target.description,
    canonicalTargetId: target.targetId,
    targetInstanceId: target.targetInstanceId,
    requiredCardIds: [...target.requiredCardIds],
    targetSuperclass: target.taxonomy.superclass,
    targetClassKey: target.taxonomy.classKey,
  };
}

function createBattleRuntimeDeckCatalog(deck: BattleDeckSpec): BattleRuntimeDeckCatalog {
  const runtimeCardRefs = deck.cards.flatMap((card) =>
    Array.from({ length: card.copiesInDeck }, (_, copyIndex) => ({
      runtimeCardId: `${deck.deckId}:${card.cardId}:${copyIndex}`,
      deckId: deck.deckId,
      cardId: card.cardId,
      syllable: card.syllable,
      copyIndex,
    })),
  );

  return {
    deckId: deck.deckId,
    visualTheme: deck.presentation.visualTheme,
    cardsById: deck.cards.reduce<Record<string, BattleCardSpec>>((acc, card) => {
      acc[card.cardId] = card;
      return acc;
    }, {}),
    cardsBySyllable: deck.cards.reduce<Record<Syllable, BattleCardSpec>>((acc, card) => {
      acc[card.syllable] = card;
      return acc;
    }, {}),
    cardRefsByRuntimeId: runtimeCardRefs.reduce<Record<string, BattleRuntimeCardRef>>((acc, cardRef) => {
      acc[cardRef.runtimeCardId] = cardRef;
      return acc;
    }, {}),
    cardRefsBySyllable: runtimeCardRefs.reduce<Record<Syllable, BattleRuntimeCardRef[]>>((acc, cardRef) => {
      acc[cardRef.syllable] = [...(acc[cardRef.syllable] ?? []), cardRef];
      return acc;
    }, {}),
    targetSpecsByInstanceId: deck.targetPool.reduce<Record<string, BattleTargetSpec>>((acc, target) => {
      acc[target.targetInstanceId] = target;
      return acc;
    }, {}),
    targetSpecsByTargetId: deck.targetPool.reduce<Record<string, BattleTargetSpec>>((acc, target) => {
      acc[target.targetId] = target;
      return acc;
    }, {}),
    targetInstanceIdsInOrder: deck.gameplay.targetOrder.slice(),
  };
}

function expandBattleRuntimeCardPool(deck: BattleDeckSpec): BattleCardSpec[] {
  const cards: BattleCardSpec[] = [];
  deck.cards.forEach((card) => {
    for (let index = 0; index < card.copiesInDeck; index += 1) {
      cards.push(card);
    }
  });
  return shuffle(cards);
}

function resolveBattleRuntimeCardRefsForPile(
  deckCatalog: BattleRuntimeDeckCatalog,
  pile: Syllable[],
  consumedCounts: Map<Syllable, number>,
): BattleRuntimeCardRef[] {
  return pile.map((syllable) => {
    const refs = deckCatalog.cardRefsBySyllable[syllable] ?? [];
    const nextIndex = consumedCounts.get(syllable) ?? 0;
    consumedCounts.set(syllable, nextIndex + 1);
    return (
      refs[nextIndex] ?? {
        runtimeCardId: `${deckCatalog.deckId}:untracked:${syllable}:${nextIndex}`,
        deckId: deckCatalog.deckId,
        cardId: deckCatalog.cardsBySyllable[syllable]?.cardId ?? `untracked:${syllable}`,
        syllable,
        copyIndex: nextIndex,
      }
    );
  });
}

export function createBattleRuntimeTargetDeck(deck: BattleDeckSpec): Target[] {
  return shuffle(
    deck.targetPool.map((target) => ({
      ...createRuntimeTargetFromSpec(target),
      sourceDeckId: deck.deckId,
    })),
  );
}

export function createBattleRuntimeSyllableDeck(deck: BattleDeckSpec): Syllable[] {
  return expandBattleRuntimeCardPool(deck).map((card) => card.syllable);
}

export function resolveBattleRuntimeDeckThemeClass(deck: BattleDeckSpec): string {
  return DECK_VISUAL_THEME_CLASSES[deck.presentation.visualTheme] ?? DECK_VISUAL_THEME_CLASSES.harvest;
}

export function resolveBattleRuntimePlayerCardPiles(
  player: Pick<PlayerState, "hand" | "syllableDeck" | "discard">,
  deckCatalog: BattleRuntimeDeckCatalog,
) {
  const consumedCounts = new Map<Syllable, number>();
  return {
    hand: resolveBattleRuntimeCardRefsForPile(deckCatalog, player.hand, consumedCounts),
    syllableDeck: resolveBattleRuntimeCardRefsForPile(deckCatalog, player.syllableDeck, consumedCounts),
    discard: resolveBattleRuntimeCardRefsForPile(deckCatalog, player.discard, consumedCounts),
  };
}

export function createBattleRuntimePlayerState(deck: BattleDeckSpec, name: string): PlayerState {
  const targetDeck = createBattleRuntimeTargetDeck(deck);
  const syllableDeck = createBattleRuntimeSyllableDeck(deck);
  const handRes = drawCards(syllableDeck, CONFIG.handSize);
  const targetRes = drawCards(targetDeck, CONFIG.targetsInPlay);

  return {
    id: nanoid(),
    name,
    life: CONFIG.startLife,
    hand: handRes.drawn,
    syllableDeck: handRes.rest,
    discard: [],
    targetDeck: targetRes.rest,
    targets: targetRes.drawn.map((target, slotIndex) => makeUiTarget(target, slotIndex)),
    lastDrawnCount: 0,
    flashDamage: 0,
    deckId: deck.deckId,
    mulliganUsedThisRound: false,
  };
}

export function createBattleRuntimeSetup(setup: BattleSetupSpec): BattleRuntimeSetup {
  return {
    mode: setup.mode,
    roomId: setup.roomId,
    playerDeckSpec: setup.participants.player.deck,
    enemyDeckSpec: setup.participants.enemy.deck,
    playerDeckCatalog: createBattleRuntimeDeckCatalog(setup.participants.player.deck),
    enemyDeckCatalog: createBattleRuntimeDeckCatalog(setup.participants.enemy.deck),
  };
}

export function createBattleRuntimeInitialGameState(setup: BattleSetupSpec): GameState {
  const runtime = createBattleRuntimeSetup(setup);

  return {
    players: [
      createBattleRuntimePlayerState(runtime.playerDeckSpec, "Você"),
      createBattleRuntimePlayerState(
        runtime.enemyDeckSpec,
        runtime.mode === "bot" ? "Inimigo" : "Oponente",
      ),
    ],
    turn: 0,
    turnDeadlineAt: null,
    winner: null,
    actedThisTurn: false,
    selectedHandIndexes: [],
    selectedCardForPlay: null,
    log: [{ text: "Duelo iniciado 🙂 Boa sorte!", tone: "system" }],
    messageQueue: [],
    currentMessage: null,
    setupVersion: Date.now(),
    combatLocked: false,
    mode: runtime.mode,
    openingCoinChoice: null,
    openingCoinResult: null,
    openingIntroStep: "coin-choice",
    roomId: runtime.roomId,
  };
}

export function replaceBattleRuntimeTargetInSlot(
  player: PlayerState,
  slotIndex: number,
  deck: BattleDeckSpec,
): PlayerState {
  const current = { ...player, targets: [...player.targets] };
  const oldTarget = current.targets[slotIndex];
  if (!oldTarget) return current;

  if (current.targetDeck.length === 0) {
    current.targetDeck = createBattleRuntimeTargetDeck(deck);
  }

  const nextTargetData = current.targetDeck[0];
  if (!nextTargetData) return current;

  const nextTarget = makeUiTarget(nextTargetData, slotIndex);
  nextTarget.justArrived = true;
  current.targets[slotIndex] = nextTarget;

  const { uiId, progress, entering, attacking, leaving, justArrived, ...baseTarget } = oldTarget;
  current.targetDeck = [...current.targetDeck.slice(1), baseTarget as Target];

  return current;
}

export function resolveBattleSetupParticipantDeck(
  setup: BattleSetupSpec,
  side: BattleSide,
): BattleDeckSpec {
  return side === "player" ? setup.participants.player.deck : setup.participants.enemy.deck;
}
