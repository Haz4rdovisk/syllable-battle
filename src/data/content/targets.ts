import { RawTargetDefinition } from "./types";

export const rawTargetCatalog: RawTargetDefinition[] = [
  { id: "vaca", name: "VACA", emoji: "🐮", rarity: "comum", syllables: ["VA", "CA"], superclass: "animal", classKey: "fazenda" },
  { id: "porco", name: "PORCO", emoji: "🐷", rarity: "comum", syllables: ["POR", "CO"], superclass: "animal", classKey: "fazenda" },
  { id: "galinha", name: "GALINHA", emoji: "🐔", rarity: "raro", syllables: ["GA", "LI", "NHA"], superclass: "animal", classKey: "fazenda" },
  { id: "pato", name: "PATO", emoji: "🦆", rarity: "comum", syllables: ["PA", "TO"], superclass: "animal", classKey: "fazenda" },
  { id: "ovelha", name: "OVELHA", emoji: "🐑", rarity: "raro", syllables: ["O", "VE", "LHA"], superclass: "animal", classKey: "fazenda" },
  { id: "cavalo", name: "CAVALO", emoji: "🐴", rarity: "raro", syllables: ["CA", "VA", "LO"], superclass: "animal", classKey: "fazenda" },
  { id: "baleia", name: "BALEIA", emoji: "🐋", rarity: "raro", syllables: ["BA", "LEI", "A"], superclass: "animal", classKey: "oceano" },
  { id: "peixe", name: "PEIXE", emoji: "🐟", rarity: "comum", syllables: ["PEI", "XE"], superclass: "animal", classKey: "oceano" },
  { id: "tubarao", name: "TUBARAO", emoji: "🦈", rarity: "épico", syllables: ["TU", "BA", "RAO"], superclass: "animal", classKey: "oceano" },
  { id: "polvo", name: "POLVO", emoji: "🐙", rarity: "raro", syllables: ["PO", "LVO"], superclass: "animal", classKey: "oceano" },
  { id: "siri", name: "SIRI", emoji: "🦀", rarity: "comum", syllables: ["SI", "RI"], superclass: "animal", classKey: "oceano" },
  { id: "camarao", name: "CAMARAO", emoji: "🦐", rarity: "raro", syllables: ["CA", "MA", "RAO"], superclass: "animal", classKey: "oceano" },
  { id: "lobo", name: "LOBO", emoji: "🐺", rarity: "comum", syllables: ["LO", "BO"], superclass: "animal", classKey: "floresta" },
  { id: "raposa", name: "RAPOSA", emoji: "🦊", rarity: "raro", syllables: ["RA", "PO", "SA"], superclass: "animal", classKey: "floresta" },
  { id: "esquilo", name: "ESQUILO", emoji: "🐿️", rarity: "raro", syllables: ["ES", "QUI", "LO"], superclass: "animal", classKey: "floresta" },
  { id: "urso", name: "URSO", emoji: "🐻", rarity: "raro", syllables: ["UR", "SO"], superclass: "animal", classKey: "floresta" },
  { id: "coruja", name: "CORUJA", emoji: "🦉", rarity: "raro", syllables: ["CO", "RU", "JA"], superclass: "animal", classKey: "floresta" },
  { id: "jacare", name: "JACARE", emoji: "🐊", rarity: "raro", syllables: ["JA", "CA", "RE"], superclass: "animal", classKey: "floresta" },
  { id: "camelo", name: "CAMELO", emoji: "🐫", rarity: "raro", syllables: ["CA", "ME", "LO"], superclass: "animal", classKey: "deserto" },
  { id: "cobra", name: "COBRA", emoji: "🐍", rarity: "comum", syllables: ["CO", "BRA"], superclass: "animal", classKey: "deserto" },
  { id: "abutre", name: "ABUTRE", emoji: "🦅", rarity: "raro", syllables: ["A", "BU", "TRE"], superclass: "animal", classKey: "deserto" },
  { id: "feneco", name: "FENECO", emoji: "🦊", rarity: "raro", syllables: ["FE", "NE", "CO"], superclass: "animal", classKey: "deserto" },
  { id: "escorpiao", name: "ESCORPIAO", emoji: "🦂", rarity: "épico", syllables: ["ES", "COR", "PI", "AO"], superclass: "animal", classKey: "deserto" },
  { id: "lagarto", name: "LAGARTO", emoji: "🦎", rarity: "raro", syllables: ["LA", "GAR", "TO"], superclass: "animal", classKey: "deserto" },
];

export function getRawTargetCatalogEntry(targetId: string) {
  return rawTargetCatalog.find((target) => target.id === targetId) ?? null;
}
