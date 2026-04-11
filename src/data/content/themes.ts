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

export const DECK_LOBBY_THEME_ART: Record<
  DeckVisualThemeId,
  {
    panelClassName: string;
    avatarClassName: string;
    accentClassName: string;
    buttonClassName: string;
    pressedClassName: "gold" | "green" | "amber" | "blue";
    artStyle: { backgroundImage: string };
  }
> = {
  harvest: {
    panelClassName: "border-[#d2ac69] bg-[#fff8e8]",
    avatarClassName: "border-[#d89a35]/42 bg-[#fff2c7] text-[#9b5b16]",
    accentClassName: "bg-[#d89a35]/70",
    buttonClassName: "border-[#8f5f12] bg-[#c88a32] shadow-[0_4px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.16)] text-amber-50 [@media(hover:hover)]:hover:bg-[#d29134]",
    pressedClassName: "amber",
    artStyle: {
      backgroundImage:
        "radial-gradient(circle at 16% 20%, rgba(255, 210, 103, 0.34), transparent 24%), linear-gradient(135deg, rgba(158, 94, 28, 0.18), transparent 56%), repeating-linear-gradient(90deg, rgba(139, 83, 31, 0.09) 0 2px, transparent 2px 14px)",
    },
  },
  abyss: {
    panelClassName: "border-[#96b6c9] bg-[#f4f9fb]",
    avatarClassName: "border-[#4f8fb7]/38 bg-[#e5f4fb] text-[#1f5f86]",
    accentClassName: "bg-[#3c89b8]/62",
    buttonClassName: "border-[#2b6d9a] bg-[#4c95c4] shadow-[0_4px_0_#28597d,0_10px_16px_rgba(40,89,125,0.18)] text-blue-50 [@media(hover:hover)]:hover:bg-[#5aa1ce]",
    pressedClassName: "blue",
    artStyle: {
      backgroundImage:
        "radial-gradient(circle at 82% 20%, rgba(82, 178, 220, 0.28), transparent 24%), radial-gradient(circle at 18% 84%, rgba(37, 99, 175, 0.16), transparent 34%), repeating-radial-gradient(ellipse at 70% 90%, rgba(30, 92, 135, 0.1) 0 2px, transparent 2px 9px)",
    },
  },
  canopy: {
    panelClassName: "border-[#9bbc8e] bg-[#f3fbef]",
    avatarClassName: "border-[#3f9b57]/36 bg-[#e7f7e7] text-[#226b37]",
    accentClassName: "bg-[#4f9f58]/62",
    buttonClassName: "border-[#1f7a46] bg-[#2f9a56] shadow-[0_4px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] text-emerald-50 [@media(hover:hover)]:hover:bg-[#35a55d]",
    pressedClassName: "green",
    artStyle: {
      backgroundImage:
        "radial-gradient(circle at 18% 30%, rgba(86, 172, 86, 0.24), transparent 27%), linear-gradient(145deg, rgba(35, 112, 56, 0.17), transparent 58%), repeating-linear-gradient(135deg, rgba(51, 124, 63, 0.08) 0 3px, transparent 3px 15px)",
    },
  },
  dune: {
    panelClassName: "border-[#ccb27a] bg-[#fff6e5]",
    avatarClassName: "border-[#be8b3a]/40 bg-[#f8e8c4] text-[#8a5c19]",
    accentClassName: "bg-[#c18a35]/64",
    buttonClassName: "border-[#b77912] bg-[#d9a22b] shadow-[0_4px_0_#8f5f12,0_10px_16px_rgba(143,95,18,0.14)] text-yellow-50 [@media(hover:hover)]:hover:bg-[#e0ac37]",
    pressedClassName: "gold",
    artStyle: {
      backgroundImage:
        "radial-gradient(circle at 84% 18%, rgba(224, 153, 54, 0.28), transparent 23%), linear-gradient(155deg, rgba(168, 91, 30, 0.15), transparent 56%), repeating-linear-gradient(165deg, rgba(146, 91, 34, 0.08) 0 2px, transparent 2px 13px)",
    },
  },
};
