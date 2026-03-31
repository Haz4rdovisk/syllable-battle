import { RawDeckDefinition } from "../types";

export const desertoDeck: RawDeckDefinition = {
  id: "deserto",
  name: "Deserto",
  description: "Criaturas do deserto. Precisas e resistentes.",
  emoji: "🏜️",
  visualTheme: "dune",
  syllables: {
    CA: 4,
    ME: 3,
    LO: 3,
    CO: 4,
    BRA: 3,
    A: 3,
    BU: 3,
    TRE: 3,
    FE: 3,
    NE: 3,
    ES: 3,
    COR: 3,
    PI: 3,
    AO: 3,
    LA: 3,
    GAR: 3,
    TO: 4
  },
  targets: [
    {
      id: "camelo",
      name: "CAMELO",
      emoji: "🐫",
      rarity: "raro",
      syllables: ["CA", "ME", "LO"]
    },
    {
      id: "cobra",
      name: "COBRA",
      emoji: "🐍",
      rarity: "comum",
      syllables: ["CO", "BRA"]
    },
    {
      id: "abutre",
      name: "ABUTRE",
      emoji: "🦅",
      rarity: "raro",
      syllables: ["A", "BU", "TRE"]
    },
    {
      id: "feneco",
      name: "FENECO",
      emoji: "🦊",
      rarity: "raro",
      syllables: ["FE", "NE", "CO"]
    },
    {
      id: "escorpiao",
      name: "ESCORPIAO",
      emoji: "🦂",
      rarity: "épico",
      syllables: ["ES", "COR", "PI", "AO"]
    },
    {
      id: "lagarto",
      name: "LAGARTO",
      emoji: "🦎",
      rarity: "raro",
      syllables: ["LA", "GAR", "TO"]
    }
  ]
};
