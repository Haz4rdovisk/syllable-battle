export type BattleCardBackPresetId =
  | "arcane"
  | "sunforge"
  | "ember"
  | "jade";

export type BattlePilePresetId =
  | "arcane"
  | "sunforge"
  | "ember"
  | "jade";

export type LegacyBattleCardStackPresetId =
  | BattleCardBackPresetId
  | BattlePilePresetId;

export const DEFAULT_BATTLE_CARD_BACK_PRESET_ID: BattleCardBackPresetId =
  "arcane";

export const DEFAULT_BATTLE_PILE_PRESET_ID: BattlePilePresetId = "arcane";

export const battleCardBackPresetOptions: Array<{
  value: BattleCardBackPresetId;
  label: string;
}> = [
  { value: "arcane", label: "Arcano" },
  { value: "sunforge", label: "Forja Solar" },
  { value: "ember", label: "Brasa" },
  { value: "jade", label: "Jade" },
];

export const battlePilePresetOptions: Array<{
  value: BattlePilePresetId;
  label: string;
}> = [
  { value: "arcane", label: "Arcano" },
  { value: "sunforge", label: "Forja Solar" },
  { value: "ember", label: "Brasa" },
  { value: "jade", label: "Jade" },
];

type BattleCardBackSurfaceClasses = {
  frameClassName: string;
  textureClassName: string;
  insetClassName: string;
  coreClassName: string;
  emblemClassName: string;
};

type BattlePileSurfaceClasses = {
  layerClassName: string;
  frameClassName: string;
  textureClassName: string;
  insetClassName: string;
  coreClassName: string;
  emblemClassName: string;
  emblemInnerClassName?: string;
};

type BattlePileVisualPresetDefinition = {
  pile: Record<"deck" | "target", BattlePileSurfaceClasses>;
  labelClassName: string;
  countBadgeClassName: string;
  emptyStateClassName: string;
};

const battleCardBackVisualPresets: Record<
  BattleCardBackPresetId,
  BattleCardBackSurfaceClasses
> = {
  arcane: {
    frameClassName:
      "border-amber-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800",
    textureClassName:
      "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20",
    insetClassName: "rounded-lg border border-amber-200/20",
    coreClassName: "inset-4 rounded-full border border-amber-200/15",
    emblemClassName:
      "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-200/30",
  },
  sunforge: {
    frameClassName:
      "border-amber-200/45 bg-gradient-to-br from-stone-950 via-amber-950 to-stone-800",
    textureClassName:
      "bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-18",
    insetClassName: "rounded-lg border border-amber-100/24",
    coreClassName: "inset-4 rounded-full border border-amber-100/18",
    emblemClassName:
      "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-100/35",
  },
  ember: {
    frameClassName:
      "border-rose-200/34 bg-gradient-to-br from-[#2a0f12] via-[#6b1d1d] to-[#2b110c]",
    textureClassName:
      "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-16",
    insetClassName: "rounded-lg border border-rose-100/18",
    coreClassName: "inset-4 rounded-full border border-orange-100/16",
    emblemClassName:
      "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-orange-100/34",
  },
  jade: {
    frameClassName:
      "border-emerald-100/36 bg-gradient-to-br from-[#0b2c2a] via-[#0f4f46] to-[#071815]",
    textureClassName:
      "bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-14",
    insetClassName: "rounded-lg border border-emerald-100/18",
    coreClassName: "inset-4 rounded-full border border-emerald-100/14",
    emblemClassName:
      "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-emerald-100/30",
  },
};

const battlePileVisualPresets: Record<
  BattlePilePresetId,
  BattlePileVisualPresetDefinition
> = {
  arcane: {
    pile: {
      deck: {
        layerClassName:
          "border border-amber-300/18 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800",
        frameClassName:
          "border-amber-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25",
        insetClassName: "rounded-lg border border-amber-200/20",
        coreClassName: "inset-4 rounded-full border border-amber-200/15",
        emblemClassName:
          "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-200/30",
      },
      target: {
        layerClassName:
          "border border-amber-300/22 bg-gradient-to-br from-rose-950 via-red-950 to-stone-950",
        frameClassName:
          "border-amber-300/30 bg-gradient-to-br from-rose-950 via-red-950 to-stone-950",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/exclusive-paper.png')] opacity-25",
        insetClassName: "rounded-lg border border-amber-200/18",
        coreClassName: "inset-4 rounded-xl border border-amber-200/12",
        emblemClassName:
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/15 bg-white/5 backdrop-blur-sm",
        emblemInnerClassName: "h-4 w-4 rotate-45 border border-white/30",
      },
    },
    labelClassName: "text-white/40",
    countBadgeClassName:
      "border-white/10 bg-black/60 text-amber-200 backdrop-blur-md",
    emptyStateClassName:
      "rounded-lg border-2 border-dashed border-white/10 bg-black/20",
  },
  sunforge: {
    pile: {
      deck: {
        layerClassName:
          "border border-amber-200/22 bg-gradient-to-br from-stone-950 via-amber-950 to-stone-800",
        frameClassName:
          "border-amber-200/45 bg-gradient-to-br from-stone-950 via-amber-950 to-stone-800",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-18",
        insetClassName: "rounded-lg border border-amber-100/24",
        coreClassName: "inset-4 rounded-full border border-amber-100/18",
        emblemClassName:
          "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-100/35",
      },
      target: {
        layerClassName:
          "border border-orange-200/24 bg-gradient-to-br from-[#5f2314] via-[#9a3412] to-[#431407]",
        frameClassName:
          "border-orange-200/36 bg-gradient-to-br from-[#5f2314] via-[#9a3412] to-[#431407]",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-14",
        insetClassName: "rounded-lg border border-orange-100/20",
        coreClassName: "inset-4 rounded-xl border border-orange-100/14",
        emblemClassName:
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-100/18 bg-white/5 backdrop-blur-sm",
        emblemInnerClassName: "h-4 w-4 rotate-45 border border-orange-100/34",
      },
    },
    labelClassName: "text-amber-50/45",
    countBadgeClassName:
      "border-amber-100/15 bg-stone-950/65 text-amber-100 backdrop-blur-md",
    emptyStateClassName:
      "rounded-lg border-2 border-dashed border-amber-100/14 bg-stone-950/20",
  },
  ember: {
    pile: {
      deck: {
        layerClassName:
          "border border-rose-200/18 bg-gradient-to-br from-[#2a0f12] via-[#6b1d1d] to-[#2b110c]",
        frameClassName:
          "border-rose-200/34 bg-gradient-to-br from-[#2a0f12] via-[#6b1d1d] to-[#2b110c]",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-16",
        insetClassName: "rounded-lg border border-rose-100/18",
        coreClassName: "inset-4 rounded-full border border-orange-100/16",
        emblemClassName:
          "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-orange-100/34",
      },
      target: {
        layerClassName:
          "border border-amber-200/18 bg-gradient-to-br from-[#44160a] via-[#7c2d12] to-[#31110b]",
        frameClassName:
          "border-amber-200/32 bg-gradient-to-br from-[#44160a] via-[#7c2d12] to-[#31110b]",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/exclusive-paper.png')] opacity-18",
        insetClassName: "rounded-lg border border-amber-100/18",
        coreClassName: "inset-4 rounded-xl border border-amber-100/12",
        emblemClassName:
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-100/16 bg-white/5 backdrop-blur-sm",
        emblemInnerClassName: "h-4 w-4 rotate-45 border border-amber-100/32",
      },
    },
    labelClassName: "text-amber-50/45",
    countBadgeClassName:
      "border-orange-100/10 bg-black/55 text-orange-100 backdrop-blur-md",
    emptyStateClassName:
      "rounded-lg border-2 border-dashed border-orange-100/14 bg-black/20",
  },
  jade: {
    pile: {
      deck: {
        layerClassName:
          "border border-emerald-100/20 bg-gradient-to-br from-[#0b2c2a] via-[#0f4f46] to-[#071815]",
        frameClassName:
          "border-emerald-100/36 bg-gradient-to-br from-[#0b2c2a] via-[#0f4f46] to-[#071815]",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-14",
        insetClassName: "rounded-lg border border-emerald-100/18",
        coreClassName: "inset-4 rounded-full border border-emerald-100/14",
        emblemClassName:
          "h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-emerald-100/30",
      },
      target: {
        layerClassName:
          "border border-cyan-100/20 bg-gradient-to-br from-[#0b2332] via-[#155e75] to-[#0f172a]",
        frameClassName:
          "border-cyan-100/32 bg-gradient-to-br from-[#0b2332] via-[#155e75] to-[#0f172a]",
        textureClassName:
          "bg-[url('https://www.transparenttextures.com/patterns/exclusive-paper.png')] opacity-18",
        insetClassName: "rounded-lg border border-cyan-100/16",
        coreClassName: "inset-4 rounded-xl border border-cyan-100/12",
        emblemClassName:
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-100/16 bg-white/5 backdrop-blur-sm",
        emblemInnerClassName: "h-4 w-4 rotate-45 border border-cyan-100/30",
      },
    },
    labelClassName: "text-emerald-50/45",
    countBadgeClassName:
      "border-emerald-100/10 bg-black/55 text-emerald-100 backdrop-blur-md",
    emptyStateClassName:
      "rounded-lg border-2 border-dashed border-emerald-100/14 bg-black/20",
  },
};

export const getBattleCardBackVisualPreset = (
  presetId: BattleCardBackPresetId,
) => battleCardBackVisualPresets[presetId];

export const getBattlePileVisualPreset = (presetId: BattlePilePresetId) =>
  battlePileVisualPresets[presetId];
