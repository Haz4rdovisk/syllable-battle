import { BattleEvent, BattleSide, Syllable } from "../../types/game";

type EventPayload<TType extends BattleEvent["type"]> = Omit<Extract<BattleEvent, { type: TType }>, "id" | "createdAt">;
type BattleEventPayload = EventPayload<BattleEvent["type"]>;

export const toBattleSide = (side: number): BattleSide => (side === 0 ? "player" : "enemy");

export const createTurnStartedEvent = (
  turn: number,
  side: number,
): EventPayload<"TURN_STARTED"> => ({
  type: "TURN_STARTED",
  turn,
  side: toBattleSide(side),
});

export const createCardDrawnEvent = (
  turn: number,
  side: number,
  reason: "play" | "mulligan",
  syllables: Syllable[],
): EventPayload<"CARD_DRAWN"> | null =>
  syllables.length === 0
    ? null
    : {
        type: "CARD_DRAWN",
        turn,
        side: toBattleSide(side),
        reason,
        syllables,
      };

export const createCardPlayedEvent = (
  turn: number,
  side: number,
  syllable: Syllable,
  targetSlot: number,
  targetName: string,
): EventPayload<"CARD_PLAYED"> => ({
  type: "CARD_PLAYED",
  turn,
  side: toBattleSide(side),
  syllable,
  targetSlot,
  targetName,
});

export const createTargetCompletedEvent = (
  turn: number,
  side: number,
  slotIndex: number,
  targetName: string,
  damage: number,
): EventPayload<"TARGET_COMPLETED"> => ({
  type: "TARGET_COMPLETED",
  turn,
  side: toBattleSide(side),
  slotIndex,
  targetName,
  damage,
});

export const createDamageAppliedEvent = (
  turn: number,
  sourceSide: number,
  targetSide: number,
  amount: number,
  sourceTargetName: string,
  lifeAfter: number,
): EventPayload<"DAMAGE_APPLIED"> => ({
  type: "DAMAGE_APPLIED",
  turn,
  sourceSide: toBattleSide(sourceSide),
  targetSide: toBattleSide(targetSide),
  amount,
  sourceTargetName,
  lifeAfter,
});

export const createTargetReplacedEvent = (
  turn: number,
  side: number,
  slotIndex: number,
  previousTargetName: string,
  nextTargetName: string,
): EventPayload<"TARGET_REPLACED"> | null =>
  !previousTargetName || !nextTargetName
    ? null
    : {
        type: "TARGET_REPLACED",
        turn,
        side: toBattleSide(side),
        slotIndex,
        previousTargetName,
        nextTargetName,
      };

export const createMulliganResolvedEvent = (
  turn: number,
  side: number,
  returned: Syllable[],
  drawn: Syllable[],
): EventPayload<"MULLIGAN_RESOLVED"> => ({
  type: "MULLIGAN_RESOLVED",
  turn,
  side: toBattleSide(side),
  returned,
  drawn,
});

export const createPlayResolutionEvents = (args: {
  turn: number;
  side: number;
  playedCard: Syllable;
  targetSlot: number;
  targetName: string;
  damage: number;
  damageSource: string;
  completedSlot: number | null;
  drawnCards: Syllable[];
}): BattleEventPayload[] => {
  const events: BattleEventPayload[] = [
    createCardPlayedEvent(args.turn, args.side, args.playedCard, args.targetSlot, args.targetName),
  ];

  if (args.damage > 0 && args.completedSlot !== null) {
    events.push(createTargetCompletedEvent(args.turn, args.side, args.completedSlot, args.damageSource, args.damage));
  }

  const drawEvent = createCardDrawnEvent(args.turn, args.side, "play", args.drawnCards);
  if (drawEvent) events.push(drawEvent);

  return events;
};

export const createMulliganResolutionEvents = (args: {
  turn: number;
  side: number;
  returned: Syllable[];
  drawn: Syllable[];
}): BattleEventPayload[] => {
  const events: BattleEventPayload[] = [createMulliganResolvedEvent(args.turn, args.side, args.returned, args.drawn)];
  const drawEvent = createCardDrawnEvent(args.turn, args.side, "mulligan", args.drawn);
  if (drawEvent) events.push(drawEvent);
  return events;
};
