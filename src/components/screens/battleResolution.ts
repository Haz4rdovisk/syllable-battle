import { GameState, PlayerState, RARITY_DAMAGE, Syllable, normalizeRarity } from "../../types/game";
import { canPlace, drawFromSyllableDeck } from "../../logic/gameLogic";

export interface ResolvedBattlePlayAction {
  nextPlayers: PlayerState[];
  logs: string[];
  damage: number;
  damageSource: string;
  impactLife: number;
  winner: number | null;
  completedSlot: number | null;
  actorIndex: number;
  playedCard: Syllable;
  drawnCards: Syllable[];
}

export interface ResolvedBattleMulliganAction {
  nextPlayers: PlayerState[];
  returnedCards: Syllable[];
  drawnCards: Syllable[];
}

export const resolveBattlePlayAction = (
  gameState: GameState,
  handIndex: number,
  targetIndex: number,
): ResolvedBattlePlayAction | null => {
  const currentIndex = gameState.turn;
  const opponentIndex = currentIndex === 0 ? 1 : 0;

  let actor = { ...gameState.players[currentIndex] };
  let opponent = { ...gameState.players[opponentIndex], flashDamage: 0 };

  const targetSource = actor.targets[targetIndex];
  const card = actor.hand[handIndex];

  if (!card || !targetSource) return null;

  const target = { ...targetSource, progress: [...targetSource.progress] };

  if (!canPlace(card, target)) return null;

  actor.hand = actor.hand.filter((_, index) => index !== handIndex);
  target.progress.push(card);
  actor.targets = actor.targets.map((candidate, index) => (index === targetIndex ? target : candidate));

  const actorLabel = currentIndex === 0 ? "Voc\u00EA" : "Oponente";
  const logs = [`${actorLabel} jogou ${card} em ${target.name}.`];

  let damage = 0;
  let damageSource = "";
  let winner: number | null = null;
  let completedSlot: number | null = null;
  let impactLife = opponent.life;

  if (target.progress.length === target.syllables.length) {
    const resolvedDamage = RARITY_DAMAGE[normalizeRarity(target.rarity)];
    damage = resolvedDamage;
    damageSource = target.name;
    impactLife = Math.max(0, opponent.life - resolvedDamage);
    opponent.flashDamage = 0;
    target.attacking = true;
    actor.syllableDeck = [...actor.syllableDeck, ...target.progress];
    logs.unshift(`${actorLabel} completou ${target.name}! ${resolvedDamage} de dano!`);
    completedSlot = targetIndex;
    if (impactLife <= 0) winner = currentIndex;
  }

  const drawRes = drawFromSyllableDeck(actor, 1);
  actor = drawRes.player;
  actor.hand = [...actor.hand, ...drawRes.drawn];

  const nextPlayers = [...gameState.players];
  nextPlayers[currentIndex] = actor;
  nextPlayers[opponentIndex] = opponent;

  return {
    nextPlayers,
    logs,
    damage,
    damageSource,
    impactLife,
    winner,
    completedSlot,
    actorIndex: currentIndex,
    playedCard: card,
    drawnCards: drawRes.drawn,
  };
};

export const resolveBattleMulliganAction = (
  gameState: GameState,
  actorIndex: number,
  selectedIndexes: number[],
  handSize: number,
): ResolvedBattleMulliganAction => {
  let actor = { ...gameState.players[actorIndex] };
  const sortedIndexes = [...new Set<number>(selectedIndexes)].sort((a, b) => b - a);
  const returnedCards: Syllable[] = [];

  sortedIndexes.forEach((index) => {
    const card = actor.hand[index];
    if (!card) return;
    returnedCards.push(card);
    actor.hand.splice(index, 1);
  });

  actor.syllableDeck = [...actor.syllableDeck, ...returnedCards];

  const drawRes = drawFromSyllableDeck(actor, handSize - actor.hand.length);
  actor = drawRes.player;
  actor.hand = [...actor.hand, ...drawRes.drawn];
  actor.mulliganUsedThisRound = true;

  const nextPlayers = [...gameState.players];
  nextPlayers[actorIndex] = actor;

  return {
    nextPlayers,
    returnedCards,
    drawnCards: drawRes.drawn,
  };
};
