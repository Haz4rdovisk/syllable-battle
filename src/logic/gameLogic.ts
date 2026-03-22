import { nanoid } from "nanoid";
import {
  Deck,
  PlayerState,
  Syllable,
  Target,
  UITarget,
  GameState,
  GameMode,
} from "../types/game";

export const CONFIG = {
  startLife: 10,
  handSize: 5,
  targetsInPlay: 2,
  maxMulligan: 3,
  logSize: 12,
};

export const TIMINGS = {
  messageMs: 1450,
  botThinkMs: 1400,
  attackMs: 1300,
  damageGapMs: 180,
  leaveMs: 1000,
  enterMs: 900,
  endGapMs: 350,
  autoEndMs: 950,
  startEnterGapMs: 650,
};

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeSyllableDeck(deckData: Deck): Syllable[] {
  const deck: Syllable[] = [];
  Object.entries(deckData.syllables).forEach(([syllable, count]) => {
    for (let i = 0; i < count; i += 1) deck.push(syllable);
  });
  return shuffle(deck);
}

export function makeTargetDeck(deckData: Deck): Target[] {
  return shuffle(deckData.targets);
}

export function drawCards<T>(deck: T[], amount: number): { drawn: T[]; rest: T[] } {
  return { drawn: deck.slice(0, amount), rest: deck.slice(amount) };
}

export function makeUiTarget(target: Target, slotIndex: number): UITarget {
  return {
    ...target,
    progress: [],
    uiId: `${target.id}-${slotIndex}-${nanoid(6)}`,
    entering: true,
    attacking: false,
    leaving: false,
    justArrived: false,
  };
}

export function makePlayerState(deck: Deck, name: string): PlayerState {
  const targetDeck = makeTargetDeck(deck);
  const syllableDeck = makeSyllableDeck(deck);
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
    targets: targetRes.drawn.map((target, i) => makeUiTarget(target, i)),
    lastDrawnCount: 0,
    flashDamage: 0,
    deckId: deck.id,
    mulliganUsedThisRound: false,
  };
}

export function makeInitialGame(mode: GameMode, playerDeck: Deck, enemyDeck: Deck, roomId?: string): GameState {
  return {
    players: [
      makePlayerState(playerDeck, "Voc\u00EA"),
      makePlayerState(enemyDeck, mode === "bot" ? "Inimigo" : "Oponente"),
    ],
    turn: 0,
    winner: null,
    actedThisTurn: false,
    selectedHandIndexes: [],
    selectedCardForPlay: null,
    log: ["\uD83C\uDFAE Jogo iniciado. Boa sorte!"],
    messageQueue: [],
    currentMessage: null,
    setupVersion: Date.now(),
    combatLocked: false,
    mode,
    openingCoinChoice: null,
    openingCoinResult: null,
    openingIntroStep: "coin-choice",
    roomId,
  };
}

function normalizeSyllable(value: Syllable): string {
  return value.trim().toUpperCase();
}

function countOccurrences(values: Syllable[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = normalizeSyllable(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

export function canPlace(card: Syllable, target: UITarget): boolean {
  const neededCounts = countOccurrences(target.syllables);
  const placedCounts = countOccurrences(target.progress);
  const cardKey = normalizeSyllable(card);
  return (placedCounts.get(cardKey) ?? 0) < (neededCounts.get(cardKey) ?? 0);
}

export function isHandStuck(player: PlayerState): boolean {
  return !player.hand.some((card) => player.targets.some((target) => canPlace(card, target)));
}

export function ensureDeck(player: PlayerState): PlayerState {
  if (player.syllableDeck.length > 0 || player.discard.length === 0) return player;
  return { ...player, syllableDeck: shuffle(player.discard), discard: [] };
}

export function drawFromSyllableDeck(player: PlayerState, amount: number): { player: PlayerState; drawn: Syllable[] } {
  let current = { ...player };
  const drawn: Syllable[] = [];
  for (let i = 0; i < amount; i += 1) {
    current = ensureDeck(current);
    if (current.syllableDeck.length === 0) break;
    drawn.push(current.syllableDeck[0]);
    current = { ...current, syllableDeck: current.syllableDeck.slice(1) };
  }
  return { player: current, drawn };
}

export function clearTransientPlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    lastDrawnCount: 0,
    flashDamage: 0,
    targets: player.targets.map((target) => ({
      ...target,
      attacking: false,
      leaving: false,
      justArrived: false,
    })),
  };
}

export function replaceTargetInSlot(player: PlayerState, slotIndex: number, deckData: Deck): PlayerState {
  const current = { ...player, targets: [...player.targets] };
  const oldTarget = current.targets[slotIndex];
  if (!oldTarget) return current;

  if (current.targetDeck.length === 0) current.targetDeck = makeTargetDeck(deckData);

  const nextTargetData = current.targetDeck[0];
  if (!nextTargetData) return current;
  const next = makeUiTarget(nextTargetData, slotIndex);
  next.justArrived = true;

  current.targets[slotIndex] = next;

  const { uiId, progress, entering, attacking, leaving, justArrived, ...baseTarget } = oldTarget;
  current.targetDeck = [...current.targetDeck.slice(1), baseTarget as Target];

  return current;
}
