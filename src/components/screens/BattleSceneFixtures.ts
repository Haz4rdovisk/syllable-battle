import { GameMessage, Syllable, UITarget } from "../../types/game";
import {
  BattleActionButtonViewModel,
  BattleSceneViewModel,
  createBattleBoardSurfaceViewModel,
} from "./BattleSceneViewModel";

export interface BattleSceneFixtureHandCard {
  id: string;
  syllable: Syllable;
  side: 0 | 1;
  hidden: boolean;
}

export interface BattleSceneFixtureData {
  scene: BattleSceneViewModel;
  playerHand: BattleSceneFixtureHandCard[];
  enemyHand: BattleSceneFixtureHandCard[];
  selectedIndexes?: number[];
  showPlayableHints?: boolean;
  mulliganDisabled?: boolean;
}

export interface BattleSceneFixtureMeta {
  label: string;
  summary: string;
  description: string;
}

const makeTarget = (
  uiId: string,
  name: string,
  emoji: string,
  rarity: UITarget["rarity"],
  syllables: Syllable[],
  progress: Syllable[] = [],
): UITarget => ({
  id: uiId,
  uiId,
  name,
  emoji,
  rarity,
  syllables,
  progress,
  entering: false,
  attacking: false,
  leaving: false,
  justArrived: false,
});

const makeMessage = (title: string, kind: GameMessage["kind"] = "turn"): GameMessage => ({
  title,
  detail: "",
  kind,
});

const makeAction = (disabled = false): BattleActionButtonViewModel => ({
  title: "Trocar",
  subtitle: "Ate 3 cartas",
  disabled,
});

const noop = () => {};

const enemyTargets = [
  makeTarget("fixture-enemy-0", "TUBARAO", "🦈", "épico", ["TU", "BA", "RAO"], ["TU"]),
  makeTarget("fixture-enemy-1", "BALEIA", "🐋", "raro", ["BA", "LEI", "A"], []),
];

const playerTargets = [
  makeTarget("fixture-player-0", "CAMELO", "🐫", "raro", ["CA", "ME", "LO"], ["CA", "ME"]),
  makeTarget("fixture-player-1", "COBRA", "🐍", "comum", ["CO", "BRA"], []),
];

const playerHandBase: BattleSceneFixtureHandCard[] = ["LO", "BRA", "ME", "CA", "SA"].map((syllable, index) => ({
  id: `fixture-player-hand-${index}`,
  syllable,
  side: 0,
  hidden: false,
}));

const enemyHandBase: BattleSceneFixtureHandCard[] = ["TU", "BA", "RAO", "LEI", "A"].map((syllable, index) => ({
  id: `fixture-enemy-hand-${index}`,
  syllable,
  side: 1,
  hidden: true,
}));

const createSlots = (
  targets: UITarget[],
  side: "player" | "enemy",
  playerHand: Syllable[] = [],
) =>
  targets.map((target, slotIndex) => ({
    key: `${side}-slot-${slotIndex}`,
    slotRef: noop,
    displayedTarget: {
      id: target.uiId,
      side,
      slotIndex,
      target,
    },
    incomingTarget: null,
    slotRect: null,
    selectedCard: side === "player" && slotIndex === 0 ? "LO" : null,
    pendingCard: null,
    canClick: side === "player",
    onClick: noop,
    playerHand,
  }));

const enemyFieldSlots = createSlots(enemyTargets, "enemy");
const playerFieldSlots = createSlots(playerTargets, "player", playerHandBase.map((card) => card.syllable));

const enemyPortrait = {
  label: "BOT",
  avatar: "👾",
  isLocal: false,
  life: 10,
  active: false,
  flashDamage: 0,
} as const;

const playerPortrait = {
  label: "CUDELIN",
  avatar: "🧙",
  isLocal: true,
  life: 10,
  active: true,
  flashDamage: 0,
} as const;

const baseChronicles = [
  { text: "Seu turno comecou", tone: "player" as const },
  { text: "Oponente colocou BA em Baleia", tone: "enemy" as const },
  { text: "Turno do oponente", tone: "enemy" as const },
];

const baseHud = {
  title: "Controle",
  turnLabel: "Seu turno",
  clock: "54",
  clockUrgent: false,
} as const;

const boardMidTurn = createBattleBoardSurfaceViewModel({
  enemyFieldSlots,
  playerFieldSlots,
  currentMessage: makeMessage("Sua vez"),
  enemyPortrait,
  playerPortrait,
});

export const midTurnBattleFixture: BattleSceneFixtureData = {
  scene: {
    board: boardMidTurn,
    leftSidebar: {
      decks: { targetDeckCount: 4, deckCount: 36 },
      chronicles: baseChronicles,
    },
    rightSidebar: {
      hud: baseHud,
      decks: { targetDeckCount: 4, deckCount: 39 },
      action: makeAction(false),
    },
  },
  playerHand: playerHandBase,
  enemyHand: enemyHandBase,
  selectedIndexes: [1],
  showPlayableHints: true,
  mulliganDisabled: false,
};

export const urgentTimerBattleFixture: BattleSceneFixtureData = {
  ...midTurnBattleFixture,
  scene: {
    ...midTurnBattleFixture.scene,
    board: {
      ...midTurnBattleFixture.scene.board,
      currentMessage: null,
    },
    rightSidebar: {
      ...midTurnBattleFixture.scene.rightSidebar,
      hud: {
        ...midTurnBattleFixture.scene.rightSidebar.hud,
        clock: "09",
        clockUrgent: true,
      },
    },
  },
};

export const enemyTurnBattleFixture: BattleSceneFixtureData = {
  ...midTurnBattleFixture,
  scene: {
    ...midTurnBattleFixture.scene,
    board: {
      ...midTurnBattleFixture.scene.board,
      currentMessage: makeMessage("Turno do oponente"),
      enemyPortrait: {
        ...midTurnBattleFixture.scene.board.enemyPortrait,
        active: true,
      },
      playerPortrait: {
        ...midTurnBattleFixture.scene.board.playerPortrait,
        active: false,
      },
    },
    leftSidebar: {
      ...midTurnBattleFixture.scene.leftSidebar,
      chronicles: [
        { text: "Turno do oponente", tone: "enemy" as const },
        { text: "Oponente colocou RAO em Tubarao", tone: "enemy" as const },
        { text: "Seu turno comecou", tone: "player" as const },
      ],
    },
    rightSidebar: {
      ...midTurnBattleFixture.scene.rightSidebar,
      hud: {
        ...midTurnBattleFixture.scene.rightSidebar.hud,
        turnLabel: "Turno do oponente",
        clock: "41",
      },
      action: makeAction(true),
    },
  },
  selectedIndexes: [],
  showPlayableHints: false,
  mulliganDisabled: true,
};

export const damageFlashBattleFixture: BattleSceneFixtureData = {
  ...midTurnBattleFixture,
  scene: {
    ...midTurnBattleFixture.scene,
    board: {
      ...midTurnBattleFixture.scene.board,
      currentMessage: makeMessage("2 de dano", "damage"),
      enemyPortrait: {
        ...midTurnBattleFixture.scene.board.enemyPortrait,
        flashDamage: 2,
      },
    },
    leftSidebar: {
      ...midTurnBattleFixture.scene.leftSidebar,
      chronicles: [
        { text: "Voce concluiu Camelo e causou 2 de dano", tone: "player" as const },
        { text: "Seu turno comecou", tone: "player" as const },
      ],
    },
  },
};

export const calmBoardBattleFixture: BattleSceneFixtureData = {
  ...midTurnBattleFixture,
  scene: {
    ...midTurnBattleFixture.scene,
    board: {
      ...midTurnBattleFixture.scene.board,
      currentMessage: null,
    },
    leftSidebar: {
      ...midTurnBattleFixture.scene.leftSidebar,
      chronicles: [{ text: "Duelo iniciado 🙂 Boa sorte!", tone: "system" as const }],
    },
    rightSidebar: {
      ...midTurnBattleFixture.scene.rightSidebar,
      hud: {
        ...midTurnBattleFixture.scene.rightSidebar.hud,
        clock: "59",
      },
    },
  },
  selectedIndexes: [],
  showPlayableHints: false,
};

export const battleSceneFixtures = {
  mid: midTurnBattleFixture,
  urgent: urgentTimerBattleFixture,
  enemy: enemyTurnBattleFixture,
  damage: damageFlashBattleFixture,
  calm: calmBoardBattleFixture,
} as const;

export type BattleSceneFixtureKey = keyof typeof battleSceneFixtures;

export const battleSceneFixtureMeta: Record<
  BattleSceneFixtureKey,
  BattleSceneFixtureMeta
> = {
  mid: {
    label: "Seu turno",
    summary: "Mao ativa, mensagem central e jogadas disponiveis",
    description:
      "Use esta situacao para ajustar o estado padrao da sua vez: mao do jogador liberada, botao disponivel e mensagem de turno visivel.",
  },
  urgent: {
    label: "Tempo acabando",
    summary: "Relogio urgente com a mesa pronta para jogar",
    description:
      "Boa para revisar peso visual do HUD quando o tempo esta baixo, sem mudar o resto da mesa.",
  },
  enemy: {
    label: "Turno do oponente",
    summary: "Lado remoto ativo e sua mao sem interacao",
    description:
      "Mostra como a batalha fica quando o controle esta do outro lado, com foco no equilibrio da cena sem jogada local.",
  },
  damage: {
    label: "Golpe concluido",
    summary: "Feedback de dano aplicado e cronica ofensiva",
    description:
      "Serve para avaliar impacto visual, retratos sob dano e relacao entre mensagem central e campo.",
  },
  calm: {
    label: "Mesa neutra",
    summary: "Estado limpo para ajustar estrutura e espacamento",
    description:
      "Ideal para mexer em alinhamento, respiro e proporcao da cena com o minimo de ruido visual.",
  },
};
