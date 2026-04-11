import React, { useState } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { MAX_PLAYER_NAME_LENGTH, PlayerProfile, normalizePlayerName } from "../../types/game";
import { Check, PenLine, Sparkles, Star } from "lucide-react";
import { cn } from "../../lib/utils";

const AVATAR_OPTIONS = ["🧙‍♂️", "🧙‍♀️", "🛡️", "🐉", "🦊", "🦉", "🌙", "🔥", "⚔️", "🦁", "❄️", "🌿", "🦂", "🦇", "🌊", "☀️"];

interface ProfileSetupProps {
  initialProfile?: PlayerProfile | null;
  onSave: (profile: PlayerProfile) => void;
  isEditing?: boolean;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  initialProfile = null,
  onSave,
  isEditing = false,
}) => {
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [avatar, setAvatar] = useState(initialProfile?.avatar ?? AVATAR_OPTIONS[0]);
  const [isSavePressed, setIsSavePressed] = useState(false);
  const touchActivatedSaveRef = React.useRef(false);

  const trimmedName = normalizePlayerName(name, "");
  const canSave = trimmedName.length >= 2;
  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: trimmedName, avatar });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ece3d3] p-3 text-[#31271e] [@media(pointer:coarse)_and_(max-height:480px)]:items-start [@media(pointer:coarse)_and_(max-height:480px)]:p-1.5 sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#ece3d3]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,155,176,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,155,176,0.1)_1px,transparent_1px)] bg-[size:120px_120px] opacity-45" />
      </div>

      <div className="relative z-10 w-full max-w-[68rem]">
        <div className="paper-panel relative h-[min(40rem,calc(100dvh-24px))] overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-4 py-5 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[calc(100dvh-10px)] [@media(pointer:coarse)_and_(max-height:480px)]:min-h-0 [@media(pointer:coarse)_and_(max-height:480px)]:px-2 [@media(pointer:coarse)_and_(max-height:480px)]:py-2 sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-white/28" />
          <div className="absolute inset-y-[14px] left-[14px] right-[14px] rounded-[1.4rem] border border-[#d9c8a9] [@media(pointer:coarse)_and_(max-height:480px)]:top-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1rem] lg:rounded-[1.6rem]" />
          <div className="pointer-events-none absolute bottom-[18px] left-[12px] right-[12px] top-[18px] rounded-[1.25rem] border border-white/32 [@media(pointer:coarse)_and_(max-height:480px)]:top-[11px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[14px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] lg:rounded-[1.45rem]" />

          <div className="relative flex h-full min-h-0 flex-col gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-3">
            <div className="relative z-20 flex items-center justify-between gap-3 px-1 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2 [@media(pointer:coarse)_and_(max-height:480px)]:px-[0.65rem] [@media(pointer:coarse)_and_(max-height:480px)]:pt-[0.25rem]">
              <div className="flex min-w-0 items-center gap-3 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2">
                <span className="flex h-[4.8rem] w-[4.8rem] shrink-0 items-center justify-center rounded-[1.55rem] border-2 border-[#efcf78] bg-[#f7eac5] text-[2.4rem] shadow-[0_14px_24px_rgba(0,0,0,0.08)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[3.15rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[3.15rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.6rem] sm:h-[5.3rem] sm:w-[5.3rem] sm:text-[2.7rem]">
                  {avatar}
                </span>
                <div className="min-w-0">
                  <h1 className="mt-1 truncate font-serif text-[2rem] font-black leading-none text-[#5b2408] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.2rem] sm:text-[2.45rem]">
                    {isEditing ? "Editar Perfil" : "Escolha Seu Perfil"}
                  </h1>
                </div>
              </div>

              <div className="relative inline-flex min-h-[3.4rem] min-w-[9.9rem] shrink-0 items-center overflow-hidden rounded-full border border-[#d6b66e] bg-[linear-gradient(180deg,rgba(255,250,236,0.98),rgba(236,205,132,0.96))] px-4 py-2 text-[#7a5526] shadow-[0_12px_22px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] [@media(pointer:coarse)_and_(max-height:480px)]:min-h-[2.55rem] [@media(pointer:coarse)_and_(max-height:480px)]:min-w-[7rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-1.25">
                <span className="pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-white/70" />
                <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/28" />
                <div className="relative flex w-full items-center gap-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.75">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c99d46] bg-[radial-gradient(circle_at_top,#fff4cf,#e1b75d)] text-[#8a5c19] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] [@media(pointer:coarse)_and_(max-height:480px)]:h-6 [@media(pointer:coarse)_and_(max-height:480px)]:w-6">
                    <Star className="h-4 w-4 fill-current [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                  </span>
                  <span className="flex min-w-0 flex-col justify-center self-center leading-none">
                    <span className="text-[0.54rem] font-black uppercase tracking-[0.24em] text-[#9a6f2f]/80 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.42rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.14em]">
                      Duelista
                    </span>
                    <span className="mt-[2px] text-[1rem] font-black uppercase tracking-[0.14em] leading-none [@media(pointer:coarse)_and_(max-height:480px)]:mt-[1px] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.08em]">
                      Nivel 1
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-20 flex min-h-0 flex-1 items-center justify-center [@media(pointer:coarse)_and_(max-height:480px)]:-mt-2">
              <div className="mx-auto flex h-full min-h-0 w-full max-w-[42rem] flex-col gap-3 [@media(pointer:coarse)_and_(max-height:480px)]:max-w-[37.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:gap-2.75">
                <div className="rounded-[1.4rem] border border-amber-900/12 bg-white/48 px-3 py-3 shadow-inner [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.98rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-2.5">
                      <div className="flex items-center justify-between gap-3 text-amber-900/70">
                        <div className="flex items-center gap-2">
                          <PenLine className="h-4 w-4 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                          <span className="text-[11px] font-black uppercase tracking-[0.24em] [@media(pointer:coarse)_and_(max-height:480px)]:text-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.16em]">
                            Nome do Duelista
                          </span>
                        </div>
                        <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/55 [@media(pointer:coarse)_and_(max-height:480px)]:text-[8px]">
                          {trimmedName.length}/{MAX_PLAYER_NAME_LENGTH}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value.slice(0, MAX_PLAYER_NAME_LENGTH))}
                        placeholder="Ex: Arkan"
                        className="mt-3 h-[3.35rem] w-full rounded-[1.15rem] border-2 border-amber-900/14 bg-amber-50/82 px-4 text-center font-serif text-[1.5rem] font-black tracking-tight text-amber-950 outline-none transition-all placeholder:text-amber-900/20 focus:border-amber-500 [@media(pointer:coarse)_and_(max-height:480px)]:mt-2 [@media(pointer:coarse)_and_(max-height:480px)]:h-[2.5rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-3 [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.05rem] sm:text-[1.7rem]"
                      />
                </div>

                <div className="rounded-[1.4rem] border border-amber-900/12 bg-white/48 px-3 py-3 shadow-inner [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.98rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-2 [@media(pointer:coarse)_and_(max-height:480px)]:pt-2 [@media(pointer:coarse)_and_(max-height:480px)]:pb-[0.8rem] sm:px-4 sm:py-4">
                  <div className="flex min-h-0 flex-col gap-3 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2.5">
                    <div className="flex items-center justify-between gap-3 text-amber-900/70">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] [@media(pointer:coarse)_and_(max-height:480px)]:text-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.16em]">
                          Escolha seu icone
                        </span>
                      </div>
                      <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/55 [@media(pointer:coarse)_and_(max-height:480px)]:text-[8px]">
                        16 opcoes
                      </span>
                    </div>

                    <div className="grid grid-cols-8 gap-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.75 sm:gap-2.75">
                      {AVATAR_OPTIONS.map((option) => {
                        const selected = option === avatar;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAvatar(option)}
                            className={cn(
                              "relative flex h-[4.2rem] touch-manipulation select-none items-center justify-center rounded-[1.05rem] border-2 bg-amber-50 text-[2rem] shadow-[0_10px_18px_rgba(0,0,0,0.1)] transition-all [@media(hover:hover)]:hover:-translate-y-1 [@media(pointer:coarse)_and_(max-height:480px)]:h-[3.2rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.45rem] sm:h-[4.5rem] sm:text-[2.2rem]",
                              selected
                                ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                                : "border-amber-900/10 [@media(hover:hover)]:hover:border-amber-500/40",
                            )}
                          >
                            {option}
                            {selected ? (
                              <span className="absolute right-1 top-1 rounded-full bg-emerald-500 p-1 text-white [@media(pointer:coarse)_and_(max-height:480px)]:right-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:top-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:p-0.5">
                                <Check className="h-3 w-3 [@media(pointer:coarse)_and_(max-height:480px)]:h-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:w-2.5" />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex justify-center [@media(pointer:coarse)_and_(max-height:480px)]:mt-0.75">
                      <Button
                        onClick={(event) => {
                          if (touchActivatedSaveRef.current) {
                            touchActivatedSaveRef.current = false;
                            event.preventDefault();
                            return;
                          }

                          setIsSavePressed(false);
                          handleSave();
                        }}
                        onPointerDown={(event) => {
                          if (event.pointerType === "mouse" || !canSave) return;
                          touchActivatedSaveRef.current = false;
                          setIsSavePressed(true);
                        }}
                        onPointerUp={(event) => {
                          if (event.pointerType === "mouse") return;
                          if (isSavePressed && canSave) {
                            touchActivatedSaveRef.current = true;
                            handleSave();
                          }
                          setIsSavePressed(false);
                        }}
                        onPointerCancel={() => setIsSavePressed(false)}
                        onPointerLeave={() => setIsSavePressed(false)}
                        disabled={!canSave}
                        className={`group relative h-[3.5rem] w-full touch-manipulation overflow-hidden rounded-[1.15rem] border-[3px] border-[#1f7a46] bg-[#2f9a56] px-5 font-serif text-[1.05rem] font-black text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:[@media(hover:hover)]:hover:translate-y-0 disabled:[@media(hover:hover)]:hover:bg-[#2f9a56] disabled:[@media(hover:hover)]:hover:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[2.75rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.88rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-3 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.75rem] sm:h-[3.85rem] sm:text-[1.15rem] ${isSavePressed ? "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]" : ""}`}
                      >
                        <span className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-15 mix-blend-soft-light" />
                        <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-x-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!h-[1.5px] [@media(pointer:coarse)_and_(max-height:480px)]:!bg-white/18" />
                        <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-x-2 [@media(pointer:coarse)_and_(max-height:480px)]:!h-px [@media(pointer:coarse)_and_(max-height:480px)]:!bg-white/10" />
                        <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[0.95rem] border border-white/18 [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.75rem]" />
                        <span className="relative z-10">
                          {isEditing ? "SALVAR PERFIL" : "ENTRAR NA TAVERNA"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
