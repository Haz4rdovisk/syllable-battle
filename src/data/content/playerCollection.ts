import type { DeckDefinition, NormalizedContentCatalog } from "./types";
import type { ContentSyllableView, ContentTargetView } from "./readModels";

export type PlayerCollectionSource = "catalog-full-access" | "local-snapshot" | "remote";
export type PlayerCollectionAvailability = "available" | "unavailable";

export interface PlayerCollectionInventorySnapshot {
  source?: PlayerCollectionSource;
  sourceLabel?: string;
  detail?: string;
  targetCopies?: Record<string, number>;
  cardCopies?: Record<string, number>;
}

export interface PlayerCollectionCountView {
  ownedCopies: number | null;
  usedCopies: number;
  remainingCopies: number | null;
  unlimited: boolean;
}

export interface PlayerCollectionAvailabilityView {
  status: PlayerCollectionAvailability;
  canAdd: boolean;
  reason: string;
}

export interface PlayerCollectionTargetItemView {
  target: ContentTargetView;
  targetId: string;
  inventory: PlayerCollectionCountView;
  requiredCardIds: string[];
  missingCardIds: string[];
  availability: PlayerCollectionAvailabilityView;
}

export interface PlayerCollectionSyllableItemView {
  syllable: ContentSyllableView;
  cardId: string;
  inventory: PlayerCollectionCountView;
  availability: PlayerCollectionAvailabilityView;
}

export interface PlayerCollectionView {
  source: PlayerCollectionSource;
  sourceLabel: string;
  detail: string;
  targets: PlayerCollectionTargetItemView[];
  syllables: PlayerCollectionSyllableItemView[];
  targetsById: Record<string, PlayerCollectionTargetItemView>;
  syllablesByCardId: Record<string, PlayerCollectionSyllableItemView>;
  summary: {
    totalTargets: number;
    availableTargets: number;
    totalSyllables: number;
    availableSyllables: number;
    hasLimitedInventory: boolean;
  };
}

interface CreatePlayerCollectionViewOptions {
  catalog: NormalizedContentCatalog;
  targetViews: readonly ContentTargetView[];
  syllableViews: readonly ContentSyllableView[];
  deckDefinition?: Pick<DeckDefinition, "targetIds" | "cardPool"> | null;
  inventory?: PlayerCollectionInventorySnapshot | null;
}

const countValues = (values: readonly string[]) =>
  values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const normalizeCopies = (value: unknown) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.trunc(count));
};

const createCountView = (
  id: string,
  inventory: Record<string, number> | undefined,
  usedCopies: number,
) => {
  if (!inventory) {
    return {
      ownedCopies: null,
      usedCopies,
      remainingCopies: null,
      unlimited: true,
    } satisfies PlayerCollectionCountView;
  }

  const ownedCopies = normalizeCopies(inventory[id]);
  return {
    ownedCopies,
    usedCopies,
    remainingCopies: Math.max(0, ownedCopies - usedCopies),
    unlimited: false,
  } satisfies PlayerCollectionCountView;
};

const hasRemainingCopies = (countView: PlayerCollectionCountView, requiredCopies = 1) =>
  countView.unlimited || (countView.remainingCopies ?? 0) >= requiredCopies;

const createAvailability = (
  canAdd: boolean,
  availableReason: string,
  unavailableReason: string,
): PlayerCollectionAvailabilityView => ({
  status: canAdd ? "available" : "unavailable",
  canAdd,
  reason: canAdd ? availableReason : unavailableReason,
});

const createIndex = <T,>(entries: T[], getId: (entry: T) => string) =>
  entries.reduce<Record<string, T>>((acc, entry) => {
    acc[getId(entry)] = entry;
    return acc;
  }, {});

export function createCatalogBackedPlayerCollectionView({
  catalog,
  targetViews,
  syllableViews,
  deckDefinition,
  inventory,
}: CreatePlayerCollectionViewOptions): PlayerCollectionView {
  const source = inventory?.source ?? "catalog-full-access";
  const targetInventory = inventory?.targetCopies;
  const cardInventory = inventory?.cardCopies;
  const usedTargetCopies = countValues(deckDefinition?.targetIds ?? []);
  const cardPool = deckDefinition?.cardPool ?? {};
  const hasLimitedInventory = Boolean(targetInventory || cardInventory);

  const syllables = syllableViews.map((syllable) => {
    const inventoryView = createCountView(syllable.cardId, cardInventory, normalizeCopies(cardPool[syllable.cardId]));
    const canAdd = hasRemainingCopies(inventoryView);

    return {
      syllable,
      cardId: syllable.cardId,
      inventory: inventoryView,
      availability: createAvailability(
        canAdd,
        inventoryView.unlimited ? "Disponivel no catalogo local." : "Copia disponivel na colecao.",
        "Sem copias restantes nesta colecao.",
      ),
    } satisfies PlayerCollectionSyllableItemView;
  });
  const syllablesByCardId = createIndex(syllables, (entry) => entry.cardId);

  const targets = targetViews.map((target) => {
    const targetInventoryView = createCountView(target.id, targetInventory, usedTargetCopies[target.id] ?? 0);
    const requiredCardCopies = countValues(target.cardIds);
    const missingCardIds = Object.entries(requiredCardCopies)
      .filter(([cardId, requiredCopies]) => {
        const cardInventoryView = syllablesByCardId[cardId]?.inventory ?? createCountView(cardId, cardInventory, normalizeCopies(cardPool[cardId]));
        return !hasRemainingCopies(cardInventoryView, requiredCopies);
      })
      .map(([cardId]) => cardId);
    const canAddTargetCopy = hasRemainingCopies(targetInventoryView);
    const canAdd = canAddTargetCopy && missingCardIds.length === 0;
    const unavailableReason = !canAddTargetCopy
      ? "Sem copias restantes deste alvo."
      : "Faltam silabas possuidas para este alvo.";

    return {
      target,
      targetId: target.id,
      inventory: targetInventoryView,
      requiredCardIds: target.cardIds,
      missingCardIds,
      availability: createAvailability(
        canAdd,
        targetInventoryView.unlimited ? "Disponivel no catalogo local." : "Copia disponivel na colecao.",
        unavailableReason,
      ),
    } satisfies PlayerCollectionTargetItemView;
  });

  const sourceLabel = inventory?.sourceLabel ?? (source === "catalog-full-access"
    ? "Colecao local"
    : source === "local-snapshot"
      ? "Colecao salva"
      : "Colecao remota");

  return {
    source,
    sourceLabel,
    detail: inventory?.detail ?? (hasLimitedInventory
      ? "Inventario limitado local aplicado a partir do adapter."
      : "Adapter provisório: catalogo completo disponivel neste dispositivo."),
    targets,
    syllables,
    targetsById: createIndex(targets, (entry) => entry.targetId),
    syllablesByCardId,
    summary: {
      totalTargets: targets.length,
      availableTargets: targets.filter((entry) => entry.availability.canAdd).length,
      totalSyllables: syllables.length,
      availableSyllables: syllables.filter((entry) => entry.availability.canAdd).length,
      hasLimitedInventory,
    },
  };
}
