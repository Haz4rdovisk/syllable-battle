import {
  BattleLayoutDeviceOverrides,
  BattleLayoutOverrides,
  createBattleLayoutConfig,
} from "./BattleLayoutConfig";

export const battleActiveLayoutDeviceOverrides: BattleLayoutDeviceOverrides = {
  "desktop": {
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
        "x": -151,
        "y": -350
      },
      "bottomHand": {
        "x": 155,
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
      },
      "enemyFieldSlot0": {
        "x": -90,
        "y": -125,
        "width": 156
      },
      "enemyFieldSlot1": {
        "x": 94,
        "y": -125,
        "width": 156
      },
      "playerFieldSlot0": {
        "x": -90,
        "y": 123,
        "width": 156
      },
      "playerFieldSlot1": {
        "x": 94,
        "y": 123,
        "width": 156
      }
    },
    "text": {
      "actionTitleDisabled": "Indisp.",
      "actionSubtitleDisabled": "Aguarde..."
    },
    "animations": {
      "openingTargetEntry0Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry1Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry2Origin": {
        "x": 100,
        "y": 104
      },
      "openingTargetEntry3Origin": {
        "x": 100,
        "y": 104
      },
      "postPlayHandDrawOrigin": {
        "x": 1425,
        "y": 670
      },
      "targetAttack0Impact": {
        "x": 711,
        "y": 332
      },
      "targetAttack0Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack1Impact": {
        "x": 886,
        "y": 344
      },
      "targetAttack1Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack2Impact": {
        "x": 717,
        "y": 574
      },
      "targetAttack2Destination": {
        "x": 100,
        "y": 105
      },
      "targetAttack3Impact": {
        "x": 886,
        "y": 587
      },
      "targetAttack3Destination": {
        "x": 100,
        "y": 105
      },
      "mulliganReturn1Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn2Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn3Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganDraw1Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw2Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw3Origin": {
        "x": 1425,
        "y": 670
      },
      "handPlayTarget0Destination": {
        "x": 711,
        "y": 573
      },
      "handPlayTarget1Destination": {
        "x": 895,
        "y": 574
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
    },
    "timings": {
      "drawTravelMs": 260,
      "drawSettleMs": 260,
      "targetEnterMs": 640
    },
    "visuals": {
      "cardBackPresetId": "arcane",
      "deckPilePresetId": "arcane",
      "targetPilePresetId": "arcane"
    }
  },
  "tablet": {
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
        "x": -151,
        "y": -350
      },
      "bottomHand": {
        "x": 155,
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
      },
      "enemyFieldSlot0": {
        "x": -90,
        "y": -125,
        "width": 156
      },
      "enemyFieldSlot1": {
        "x": 94,
        "y": -125,
        "width": 156
      },
      "playerFieldSlot0": {
        "x": -90,
        "y": 123,
        "width": 156
      },
      "playerFieldSlot1": {
        "x": 94,
        "y": 123,
        "width": 156
      }
    },
    "text": {
      "actionTitleDisabled": "Indisp.",
      "actionSubtitleDisabled": "Aguarde..."
    },
    "animations": {
      "openingTargetEntry0Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry1Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry2Origin": {
        "x": 100,
        "y": 104
      },
      "openingTargetEntry3Origin": {
        "x": 100,
        "y": 104
      },
      "postPlayHandDrawOrigin": {
        "x": 1425,
        "y": 670
      },
      "targetAttack0Impact": {
        "x": 711,
        "y": 332
      },
      "targetAttack0Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack1Impact": {
        "x": 886,
        "y": 344
      },
      "targetAttack1Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack2Impact": {
        "x": 717,
        "y": 574
      },
      "targetAttack2Destination": {
        "x": 100,
        "y": 105
      },
      "targetAttack3Impact": {
        "x": 886,
        "y": 587
      },
      "targetAttack3Destination": {
        "x": 100,
        "y": 105
      },
      "mulliganReturn1Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn2Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn3Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganDraw1Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw2Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw3Origin": {
        "x": 1425,
        "y": 670
      },
      "handPlayTarget0Destination": {
        "x": 711,
        "y": 573
      },
      "handPlayTarget1Destination": {
        "x": 895,
        "y": 574
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
    },
    "timings": {
      "drawTravelMs": 260,
      "drawSettleMs": 260,
      "targetEnterMs": 640
    }
  },
  "mobile": {
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
        "x": -151,
        "y": -350
      },
      "bottomHand": {
        "x": 155,
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
      },
      "enemyFieldSlot0": {
        "x": -90,
        "y": -125,
        "width": 156
      },
      "enemyFieldSlot1": {
        "x": 94,
        "y": -125,
        "width": 156
      },
      "playerFieldSlot0": {
        "x": -90,
        "y": 123,
        "width": 156
      },
      "playerFieldSlot1": {
        "x": 94,
        "y": 123,
        "width": 156
      }
    },
    "text": {
      "actionTitleDisabled": "Indisp.",
      "actionSubtitleDisabled": "Aguarde..."
    },
    "animations": {
      "openingTargetEntry0Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry1Origin": {
        "x": 1500,
        "y": 743
      },
      "openingTargetEntry2Origin": {
        "x": 100,
        "y": 104
      },
      "openingTargetEntry3Origin": {
        "x": 100,
        "y": 104
      },
      "postPlayHandDrawOrigin": {
        "x": 1425,
        "y": 670
      },
      "targetAttack0Impact": {
        "x": 711,
        "y": 332
      },
      "targetAttack0Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack1Impact": {
        "x": 886,
        "y": 344
      },
      "targetAttack1Destination": {
        "x": 1500,
        "y": 745
      },
      "targetAttack2Impact": {
        "x": 717,
        "y": 574
      },
      "targetAttack2Destination": {
        "x": 100,
        "y": 105
      },
      "targetAttack3Impact": {
        "x": 886,
        "y": 587
      },
      "targetAttack3Destination": {
        "x": 100,
        "y": 105
      },
      "mulliganReturn1Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn2Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganReturn3Destination": {
        "x": 1380,
        "y": 800
      },
      "mulliganDraw1Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw2Origin": {
        "x": 1425,
        "y": 670
      },
      "mulliganDraw3Origin": {
        "x": 1425,
        "y": 670
      },
      "handPlayTarget0Destination": {
        "x": 711,
        "y": 573
      },
      "handPlayTarget1Destination": {
        "x": 895,
        "y": 574
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
    },
    "timings": {
      "drawTravelMs": 260,
      "drawSettleMs": 260,
      "targetEnterMs": 640
    }
  }
};

export const battleActiveDesktopLayoutOverrides: BattleLayoutOverrides =
  battleActiveLayoutDeviceOverrides.desktop;

export const battleActiveTabletLayoutOverrides: BattleLayoutOverrides =
  battleActiveLayoutDeviceOverrides.tablet;

export const battleActiveMobileLayoutOverrides: BattleLayoutOverrides =
  battleActiveLayoutDeviceOverrides.mobile;

export const battleActiveLayoutConfig =
  createBattleLayoutConfig(battleActiveDesktopLayoutOverrides);

export const battleActiveTabletLayoutConfig =
  createBattleLayoutConfig(battleActiveTabletLayoutOverrides);

export const battleActiveMobileLayoutConfig =
  createBattleLayoutConfig(battleActiveMobileLayoutOverrides);
