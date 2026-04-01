import React from "react";
import { Button } from "../ui/button";
import { AnimatePresence, motion } from "motion/react";
import { BadgeDollarSign, Crown, LogOut, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { BattleSceneHost } from "./BattleSceneHost";
import { BattleSceneView } from "./BattleSceneView";
import { BattleControllerProps, useBattleController } from "./BattleController";

const INTRO = {
  coinDropMs: 1920,
  coinSettleMs: 620,
};

const MULLIGAN_BUTTON_CLASS =
  "group relative overflow-hidden rounded-[1.6rem] border-4 border-[#d4af37] bg-[#4a1d24] text-amber-50 shadow-[0_18px_38px_rgba(0,0,0,0.42)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/leather.png')] before:opacity-35 disabled:border-[#8a6a25] disabled:bg-[#3f2327] disabled:text-amber-100/45 disabled:shadow-none disabled:hover:translate-y-0";

export const Battle: React.FC<BattleControllerProps> = ({
  mode,
  localSide = "player",
  onExit,
  onReturnToLobby,
  onChooseDecksAgain,
  ...controllerProps
}) => {
  const controller = useBattleController({
    mode,
    localSide,
    onExit,
    onReturnToLobby,
    onChooseDecksAgain,
    ...controllerProps,
  });
  const {
    runtimeState,
    sceneModel,
    usesMobileShell,
    isCompactTightViewport,
    activeBattleLayout,
    compactTopShellClassName,
    compactControlShellClassName,
    compactFooterFrameClassName,
    bindZoneRef,
    enemyFieldHasOutgoingTarget,
    playerFieldHasOutgoingTarget,
    setFieldLaneDebugSnapshot,
    resetGame,
    clearBattleDebugWatcher,
    downloadBattleDebugDump,
    clearAnimationFallbacks,
    battleDebugWatcherSummary,
    latestFallbackEvent,
    liveAnimationDebugData,
    coinChoiceTimerLabel,
    coinSpinRotations,
    coinSpinScales,
    finalCoinRotation,
    openingIntroTitle,
    openingIntroSubtitle,
    openingStarterMessage,
    revealedCoinFaceLabel,
    resultTitle,
    resultAvatar,
    resultLabel,
    resultAccentClasses,
    beginCoinChoiceResolution,
  } = controller;
  const {
    game,
    introPhase,
    coinResultStage,
    selectedCoinFace,
    revealedCoinFace,
    plannedCoinFace,
    showResultOverlay,
  } = runtimeState;
  const localPlayerIndex = localSide === "player" ? 0 : 1;
  const didLocalPlayerWin = game.winner === localPlayerIndex;
  const openingStarterSubject = openingStarterMessage.replace(/ COMECA O DUELO!$/, "");

  return (
    <BattleSceneView
      travelLayer={null}
      targetLayer={null}
      exitControls={
        <div className="absolute bottom-4 left-5 z-30 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="h-9 rounded-lg border border-white/5 px-3 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
          </Button>
          {mode !== "multiplayer" ? (
            <Button variant="ghost" size="sm" onClick={resetGame} className="h-9 w-9 rounded-lg border border-white/5 p-0 text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      }
    >
      <main className="relative z-10 flex h-full min-h-0 flex-col">
        <BattleSceneHost
          model={sceneModel}
          compact={usesMobileShell}
          tight={isCompactTightViewport}
          layout={activeBattleLayout}
          bindZoneRef={bindZoneRef}
          compactTopShellClassName={compactTopShellClassName}
          compactControlShellClassName={compactControlShellClassName}
          compactFooterFrameClassName={compactFooterFrameClassName}
          actionButtonClassName={cn(
            "border-4 border-[#c89b35]/90 bg-[#4a1d24] text-amber-50 shadow-[0_12px_26px_rgba(0,0,0,0.28)]",
            MULLIGAN_BUTTON_CLASS,
          )}
          elementConfig={{
            classNameByElement: {
              shell: "relative",
              enemyField: "absolute left-0 top-0",
              playerField: "absolute left-0 top-0",
              boardMessage: "pointer-events-none absolute left-0 top-0 z-20",
            },
            zIndexOverrides: {
              enemyField: enemyFieldHasOutgoingTarget ? 90 : undefined,
              playerField: playerFieldHasOutgoingTarget ? 90 : undefined,
            },
          }}
          onEnemyFieldDebugSnapshot={(snapshot) => setFieldLaneDebugSnapshot("enemy", snapshot)}
          onPlayerFieldDebugSnapshot={(snapshot) => setFieldLaneDebugSnapshot("player", snapshot)}
        />
        {import.meta.env.DEV ? (
          <div className="absolute right-3 top-3 z-[80] rounded-md border border-white/10 bg-black/70 px-3 py-2 font-mono text-[10px] leading-tight text-emerald-200">
            <div className="pointer-events-auto mb-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={downloadBattleDebugDump}
                className="h-7 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 text-[10px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
              >
                Dump
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={clearBattleDebugWatcher}
                className="h-7 rounded-md border border-white/15 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
              >
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={clearAnimationFallbacks}
                className="h-7 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
              >
                Limpar Fallback
              </Button>
            </div>
            <div>{`watcher: ativo`}</div>
            <div>{battleDebugWatcherSummary}</div>
            <div>{`stage: ${liveAnimationDebugData.stageLine.replace(/^stage:/, "")}`}</div>
            <div>{`turn:${game.turn} intro:${game.openingIntroStep} combat:${game.combatLocked ? 1 : 0} msg:${game.currentMessage?.title ?? "-"}`}</div>
            <div>{`probe:${liveAnimationDebugData.probeLines.length} snapshots:${liveAnimationDebugData.snapshotLines.length}`}</div>
            <div className={latestFallbackEvent ? "text-amber-200" : "text-emerald-200"}>
              {latestFallbackEvent ? `ultimo fallback: ${latestFallbackEvent.label}` : "fallback: nenhum"}
            </div>
          </div>
        ) : null}
      </main>

      <AnimatePresence>
        {introPhase !== "done" && introPhase !== "targets" ? (
          <motion.div
            key="battle-opening-coin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[115] flex items-center justify-center p-4 backdrop-blur-[2px] sm:p-6"
          >
            <div className="absolute inset-0 bg-black/45" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="paper-panel relative z-10 flex w-full max-w-[420px] min-h-[336px] flex-col items-center gap-4 rounded-[2rem] border-4 border-amber-900/35 px-6 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="min-h-[14px] text-[11px] font-black uppercase tracking-[0.36em] text-amber-950/60">
                {introPhase === "coin-choice" ? coinChoiceTimerLabel : "\u00A0"}
              </div>
              <motion.div
                initial={false}
                animate={introPhase === "coin-fall" ? { y: [-20, 0], scale: coinSpinScales } : { y: 0, scale: 1 }}
                transition={
                  introPhase === "coin-fall"
                    ? {
                        y: { duration: INTRO.coinDropMs / 1000, ease: [0.16, 0.84, 0.28, 1] },
                        scale: { duration: INTRO.coinDropMs / 1000, ease: [0.18, 0.89, 0.32, 1.06] },
                      }
                    : { duration: 0.26 }
                }
                className="relative grid h-28 w-28 place-items-center"
              >
                <motion.div
                  initial={false}
                  animate={{
                    rotateY:
                      introPhase === "coin-fall"
                        ? coinSpinRotations
                        : revealedCoinFace
                          ? finalCoinRotation
                          : 0,
                  }}
                  transition={
                    introPhase === "coin-fall"
                      ? {
                          duration: (INTRO.coinDropMs + INTRO.coinSettleMs) / 1000,
                          ease: [0.2, 0.9, 0.3, 1],
                          times: coinSpinRotations.map((_, index) =>
                            coinSpinRotations.length === 1 ? 1 : index / (coinSpinRotations.length - 1),
                          ),
                        }
                      : { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
                  }
                  className="relative h-full w-full"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-400 bg-[radial-gradient(circle_at_30%_25%,#fde68a_0%,#f59e0b_36%,#92400e_100%)] text-[2.8rem] shadow-[0_16px_36px_rgba(120,53,15,0.45)] [backface-visibility:hidden]">
                    <Crown className="h-11 w-11 text-amber-950/80" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-200 bg-[radial-gradient(circle_at_30%_25%,#fef3c7_0%,#fbbf24_38%,#78350f_100%)] text-[2.8rem] shadow-[0_16px_36px_rgba(120,53,15,0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <BadgeDollarSign className="h-11 w-11 text-amber-950/85" />
                  </div>
                </motion.div>
              </motion.div>
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-900/60">{openingIntroTitle}</div>
                <div className="text-3xl font-black uppercase tracking-[0.08em] text-amber-950">
                  {introPhase === "coin-result" && coinResultStage === "starter" ? openingStarterMessage : openingIntroTitle}
                </div>
                <p className="mx-auto max-w-[30ch] text-sm font-semibold leading-relaxed text-amber-950/80">
                  {introPhase === "coin-result" && coinResultStage === "starter"
                    ? `${openingStarterSubject} recebe a primeira acao desta rodada.`
                    : openingIntroSubtitle}
                </p>
              </div>
              {introPhase === "coin-choice" ? (
                <div className="grid w-full gap-3 sm:grid-cols-2">
                  {(["cara", "coroa"] as const).map((face) => {
                    const active = selectedCoinFace === face;
                    return (
                      <button
                        key={face}
                        type="button"
                        onClick={() => beginCoinChoiceResolution(face)}
                        className={cn(
                          "rounded-[1.4rem] border-4 px-4 py-3 text-left transition-all duration-200",
                          active
                            ? "border-amber-950 bg-amber-950 text-amber-50 shadow-[0_16px_32px_rgba(120,53,15,0.24)]"
                            : "border-amber-900/20 bg-amber-100/85 text-amber-950 hover:-translate-y-0.5 hover:border-amber-900/35",
                        )}
                      >
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-current/65">
                          {face === "cara" ? "Cara" : "Coroa"}
                        </div>
                        <div className="mt-2 text-lg font-black uppercase tracking-[0.08em]">
                          {face === "cara" ? "Atacar primeiro" : "Responder depois"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {introPhase === "coin-result" ? (
                <div className="rounded-full border border-amber-900/15 bg-amber-100/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-950/70">
                  Resultado: {revealedCoinFaceLabel}
                </div>
              ) : null}
              {mode === "multiplayer" && localSide !== "player" && introPhase === "coin-choice" ? (
                <div className="rounded-full border border-amber-900/15 bg-amber-100/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-950/70">
                  Aguardando a escolha do host da sala...
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
        {showResultOverlay && game.winner !== null ? (
          <motion.div
            key="battle-result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[125] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[4px]" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "paper-panel relative z-10 flex w-full max-w-[420px] flex-col items-center gap-5 rounded-[2rem] border-4 px-7 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
                resultAccentClasses,
              )}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.36em] text-current/65">Resultado do Duelo</div>
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-current/30 bg-black/10 text-5xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                {resultAvatar}
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-black uppercase tracking-[0.08em]">{resultTitle}</div>
                <p className="text-sm font-semibold leading-relaxed text-current/80">
                  {didLocalPlayerWin
                    ? `${resultLabel} dominou a mesa e esgotou a vida adversaria.`
                    : `${resultLabel} ficou sem vida antes de estabilizar a batalha.`}
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {onReturnToLobby ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 rounded-[1.2rem] border-2 border-current/25 bg-black/10 text-sm font-black uppercase tracking-[0.2em] text-current hover:bg-black/20"
                    onClick={onReturnToLobby}
                  >
                    Voltar
                  </Button>
                ) : null}
                {onChooseDecksAgain ? (
                  <Button
                    type="button"
                    className="h-12 rounded-[1.2rem] border-2 border-current/20 bg-current text-sm font-black uppercase tracking-[0.2em] text-slate-950 hover:bg-white"
                    onClick={onChooseDecksAgain}
                  >
                    Jogar de Novo
                  </Button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BattleSceneView>
  );
};
