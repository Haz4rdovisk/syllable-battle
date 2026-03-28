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
  },
  "animations": {
    "openingTargetEntry0Origin": {
      "x": 1482,
      "y": 745
    },
    "openingTargetEntry1Origin": {
      "x": 1517,
      "y": 744
    },
    "openingTargetEntry2Origin": {
      "x": 85,
      "y": 103
    },
    "openingTargetEntry3Origin": {
      "x": 118,
      "y": 103
    },
    "postPlayHandDrawOrigin": {
      "x": 1444,
      "y": 658
    },
    "targetAttack0Impact": {
      "x": 711,
      "y": 332
    },
    "targetAttack0Destination": {
      "x": 1500,
      "y": 770
    },
    "targetAttack1Impact": {
      "x": 886,
      "y": 344
    },
    "targetAttack1Destination": {
      "x": 1500,
      "y": 770
    },
    "targetAttack2Impact": {
      "x": 717,
      "y": 574
    },
    "targetAttack2Destination": {
      "x": 98,
      "y": 104
    },
    "targetAttack3Impact": {
      "x": 886,
      "y": 587
    },
    "targetAttack3Destination": {
      "x": 99,
      "y": 103
    },
    "mulliganReturn1Destination": {
      "x": 1380,
      "y": 770
    },
    "mulliganReturn2Destination": {
      "x": 1380,
      "y": 770
    },
    "mulliganReturn3Destination": {
      "x": 1380,
      "y": 774
    },
    "mulliganDraw1Origin": {
      "x": 1380,
      "y": 770
    },
    "mulliganDraw2Origin": {
      "x": 1380,
      "y": 770
    },
    "mulliganDraw3Origin": {
      "x": 1380,
      "y": 770
    },
    "handPlayTarget0Destination": {
      "x": 717,
      "y": 576
    },
    "handPlayTarget1Destination": {
      "x": 883,
      "y": 576
    },
    "replacementTargetEntry0Origin": {
      "x": 1500,
      "y": 770
    },
    "replacementTargetEntry1Origin": {
      "x": 1500,
      "y": 770
    },
    "replacementTargetEntry2Origin": {
      "x": 100,
      "y": 130
    },
    "replacementTargetEntry3Origin": {
      "x": 100,
      "y": 130
    }
  }
};

export const battleActiveLayoutConfig =
  createBattleLayoutConfig(battleActiveLayoutOverrides);
