import { Deck } from "../types/game";

export const DECKS: Deck[] = [
  {
    id: "farm",
    name: "Fazenda",
    description: "Animais comuns. Ideal para começar.",
    emoji: "🚜",
    color: "from-amber-600 to-amber-800",
    syllables: {
      VA: 4, CA: 4, POR: 3, CO: 3, GA: 4, LI: 3, NHA: 3, PA: 4, TO: 4, O: 3, VE: 3, LHA: 3, LO: 3,
    },
    targets: [
      { id: "vaca", name: "VACA", syllables: ["VA", "CA"], rarity: "comum", emoji: "🐮" },
      { id: "porco", name: "PORCO", syllables: ["POR", "CO"], rarity: "comum", emoji: "🐷" },
      { id: "galinha", name: "GALINHA", syllables: ["GA", "LI", "NHA"], rarity: "raro", emoji: "🐔" },
      { id: "pato", name: "PATO", syllables: ["PA", "TO"], rarity: "comum", emoji: "🦆" },
      { id: "ovelha", name: "OVELHA", syllables: ["O", "VE", "LHA"], rarity: "raro", emoji: "🐑" },
      { id: "cavalo", name: "CAVALO", syllables: ["CA", "VA", "LO"], rarity: "raro", emoji: "🐴" },
    ],
  },
  {
    id: "ocean",
    name: "Oceano",
    description: "Criaturas marinhas. Alto dano.",
    emoji: "🔱",
    color: "from-blue-800 to-slate-900",
    syllables: {
      BA: 4, LEI: 3, A: 3, PEI: 4, XE: 4, TU: 3, RAO: 3, PO: 3, LVO: 3, SI: 3, RI: 3, CA: 3, MA: 3,
    },
    targets: [
      { id: "baleia", name: "BALEIA", syllables: ["BA", "LEI", "A"], rarity: "raro", emoji: "🐋" },
      { id: "peixe", name: "PEIXE", syllables: ["PEI", "XE"], rarity: "comum", emoji: "🐟" },
      { id: "tubarao", name: "TUBARÃO", syllables: ["TU", "BA", "RAO"], rarity: "épico", emoji: "🦈" },
      { id: "polvo", name: "POLVO", syllables: ["PO", "LVO"], rarity: "raro", emoji: "🐙" },
      { id: "siri", name: "SIRI", syllables: ["SI", "RI"], rarity: "comum", emoji: "🦀" },
      { id: "camarao", name: "CAMARÃO", syllables: ["CA", "MA", "RAO"], rarity: "raro", emoji: "🦐" },
    ],
  },
  {
    id: "forest",
    name: "Floresta",
    description: "Animais ágeis. Equilibrado.",
    emoji: "🌿",
    color: "from-emerald-800 to-emerald-950",
    syllables: {
      LO: 4, BO: 4, RA: 4, PO: 4, SA: 3, ES: 3, QUI: 3, UR: 3, SO: 3, CO: 3, RU: 3, JA: 3, CA: 3, RE: 3,
    },
    targets: [
      { id: "lobo", name: "LOBO", syllables: ["LO", "BO"], rarity: "comum", emoji: "🐺" },
      { id: "raposa", name: "RAPOSA", syllables: ["RA", "PO", "SA"], rarity: "raro", emoji: "🦊" },
      { id: "esquilo", name: "ESQUILO", syllables: ["ES", "QUI", "LO"], rarity: "raro", emoji: "🐿️" },
      { id: "urso", name: "URSO", syllables: ["UR", "SO"], rarity: "raro", emoji: "🐻" },
      { id: "coruja", name: "CORUJA", syllables: ["CO", "RU", "JA"], rarity: "raro", emoji: "🦉" },
      { id: "jacare", name: "JACARÉ", syllables: ["JA", "CA", "RE"], rarity: "raro", emoji: "🐊" },
    ],
  },
];
