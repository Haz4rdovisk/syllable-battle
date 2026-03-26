import {
  BattleLayoutOverrides,
  createBattleLayoutConfig,
} from "./BattleLayoutConfig";

export const battleActiveLayoutOverrides: BattleLayoutOverrides = {
  "elements": {
    "enemyDeck": {
      "x": -580,
      "y": -320
    },
    "board": {
      "y": 0,
      "height": 510,
      "width": 900
    },
    "action": {
      "x": 634,
      "y": 0
    },
    "chronicles": {
      "y": 40,
      "x": -630
    },
    "enemyField": {
      "y": -122
    },
    "playerField": {
      "y": 126
    },
    "topHand": {
      "x": -155,
      "y": -350
    },
    "bottomHand": {
      "x": 150,
      "y": 350
    },
    "playerPill": {
      "x": -320,
      "y": 340
    },
    "enemyPill": {
      "y": -340,
      "x": 330
    },
    "enemyTargetDeck": {
      "y": -320,
      "x": -700
    },
    "playerTargetDeck": {
      "y": 320,
      "x": 700
    },
    "playerDeck": {
      "y": 320,
      "x": 580
    },
    "status": {
      "x": 630,
      "y": -330
    },
    "boardMessage": {
      "y": 0
    }
  },
  "text": {
    "actionTitleDisabled": "Indisp.",
    "actionSubtitleDisabled": "Aguarde..."
  }
};

export const battleActiveLayoutConfig =
  createBattleLayoutConfig(battleActiveLayoutOverrides);
