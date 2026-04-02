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
import type { BattleDeckSpec, BattleSetupSpec, BattleTargetSpec } from "../../data/content";

export interface BattleRuntimeSetup {
  mode: BattleSetupSpec["mode"];
  roomId?: string;
  playerDeckSpec: BattleDeckSpec;
  enemyDeckSpec: BattleDeckSpec;
}

function createRuntimeTargetFromSpec(target: BattleTargetSpec): Target {
  return {
    id: target.targetId,
    name: target.name,
    emoji: target.emoji,
    syllables: [...target.requiredSyllables],
    rarity: target.rarity,
    description: target.description,
  };
}

export function createBattleRuntimeTargetDeck(deck: BattleDeckSpec): Target[] {
  return shuffle(deck.targetPool.map(createRuntimeTargetFromSpec));
}

export function createBattleRuntimeSyllableDeck(deck: BattleDeckSpec): Syllable[] {
  const syllables: Syllable[] = [];
  deck.cards.forEach((card) => {
    for (let index = 0; index < card.copiesInDeck; index += 1) {
      syllables.push(card.syllable);
    }
  });
  return shuffle(syllables);
}

export function resolveBattleRuntimeDeckThemeClass(deck: BattleDeckSpec): string {
  return DECK_VISUAL_THEME_CLASSES[deck.presentation.visualTheme] ?? DECK_VISUAL_THEME_CLASSES.harvest;
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
