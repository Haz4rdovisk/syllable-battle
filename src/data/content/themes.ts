import { DeckVisualThemeId } from "./types";

export const DECK_VISUAL_THEME_CLASSES: Record<DeckVisualThemeId, string> = {
  harvest: "from-amber-600 to-amber-800",
  abyss: "from-blue-800 to-slate-900",
  canopy: "from-emerald-800 to-emerald-950",
  dune: "from-[#b9964a] to-[#8b5a1f]",
};

export const DECK_VISUAL_THEME_TONE_CLASSES: Record<DeckVisualThemeId, string> = {
  harvest: "from-amber-100 to-amber-200",
  abyss: "from-blue-100 to-blue-200",
  canopy: "from-emerald-100 to-emerald-200",
  dune: "from-[#f1e7d0] to-[#e7d9b9]",
};
