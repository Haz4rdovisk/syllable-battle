import { RawTargetDefinition } from "./types";

export const rawTargetCatalog: RawTargetDefinition[] = [
  { id: "vaca", name: "VACA", emoji: "🐮", rarity: "comum", syllables: ["VA", "CA"] },
  { id: "porco", name: "PORCO", emoji: "🐷", rarity: "comum", syllables: ["POR", "CO"] },
  { id: "galinha", name: "GALINHA", emoji: "🐔", rarity: "raro", syllables: ["GA", "LI", "NHA"] },
  { id: "pato", name: "PATO", emoji: "🦆", rarity: "comum", syllables: ["PA", "TO"] },
  { id: "ovelha", name: "OVELHA", emoji: "🐑", rarity: "raro", syllables: ["O", "VE", "LHA"] },
  { id: "cavalo", name: "CAVALO", emoji: "🐴", rarity: "raro", syllables: ["CA", "VA", "LO"] },
  { id: "baleia", name: "BALEIA", emoji: "🐋", rarity: "raro", syllables: ["BA", "LEI", "A"] },
  { id: "peixe", name: "PEIXE", emoji: "🐟", rarity: "comum", syllables: ["PEI", "XE"] },
  { id: "tubarao", name: "TUBARAO", emoji: "🦈", rarity: "épico", syllables: ["TU", "BA", "RAO"] },
  { id: "polvo", name: "POLVO", emoji: "🐙", rarity: "raro", syllables: ["PO", "LVO"] },
  { id: "siri", name: "SIRI", emoji: "🦀", rarity: "comum", syllables: ["SI", "RI"] },
  { id: "camarao", name: "CAMARAO", emoji: "🦐", rarity: "raro", syllables: ["CA", "MA", "RAO"] },
  { id: "lobo", name: "LOBO", emoji: "🐺", rarity: "comum", syllables: ["LO", "BO"] },
  { id: "raposa", name: "RAPOSA", emoji: "🦊", rarity: "raro", syllables: ["RA", "PO", "SA"] },
  { id: "esquilo", name: "ESQUILO", emoji: "🐿️", rarity: "raro", syllables: ["ES", "QUI", "LO"] },
  { id: "urso", name: "URSO", emoji: "🐻", rarity: "raro", syllables: ["UR", "SO"] },
  { id: "coruja", name: "CORUJA", emoji: "🦉", rarity: "raro", syllables: ["CO", "RU", "JA"] },
  { id: "jacare", name: "JACARE", emoji: "🐊", rarity: "raro", syllables: ["JA", "CA", "RE"] },
  { id: "camelo", name: "CAMELO", emoji: "🐫", rarity: "raro", syllables: ["CA", "ME", "LO"] },
  { id: "cobra", name: "COBRA", emoji: "🐍", rarity: "comum", syllables: ["CO", "BRA"] },
  { id: "abutre", name: "ABUTRE", emoji: "🦅", rarity: "raro", syllables: ["A", "BU", "TRE"] },
  { id: "feneco", name: "FENECO", emoji: "🦊", rarity: "raro", syllables: ["FE", "NE", "CO"] },
  { id: "escorpiao", name: "ESCORPIAO", emoji: "🦂", rarity: "épico", syllables: ["ES", "COR", "PI", "AO"] },
  { id: "lagarto", name: "LAGARTO", emoji: "🦎", rarity: "raro", syllables: ["LA", "GAR", "TO"] },
];

export function getRawTargetCatalogEntry(targetId: string) {
  return rawTargetCatalog.find((target) => target.id === targetId) ?? null;
}
