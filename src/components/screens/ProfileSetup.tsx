import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { MAX_PLAYER_NAME_LENGTH, PlayerProfile, normalizePlayerName } from "../../types/game";
import { Check, PenLine } from "lucide-react";
import { cn } from "../../lib/utils";

const AVATAR_OPTIONS = ["🧙‍♂️", "🧙‍♀️", "🛡️", "🐉", "🦊", "🦉", "🌙", "🔥", "⚔️", "🦁", "❄️", "🌿"];

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

  const trimmedName = normalizePlayerName(name, "");
  const canSave = trimmedName.length >= 2;

  const helperCopy = useMemo(
    () =>
      isEditing
        ? "Ajuste como voce quer aparecer nos duelos."
        : "Escolha como voce sera conhecido antes de entrar na arena.",
    [isEditing],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full w-full items-center justify-center overflow-y-auto p-3 sm:p-5"
    >
      <div className="paper-panel relative max-h-[92vh] w-full max-w-[56rem] overflow-y-auto border-4 border-[#3e2723]/30 px-5 py-6 shadow-[0_35px_80px_rgba(0,0,0,0.42)] no-scrollbar sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_38%)]" />

        <div className="relative flex flex-col gap-6">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.7rem] border-2 border-amber-300/30 bg-amber-950/10 text-4xl shadow-[0_18px_30px_rgba(0,0,0,0.16)] sm:h-[4.6rem] sm:w-[4.6rem] sm:text-[2.8rem]">
              {avatar}
            </div>
            <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-amber-950 sm:text-[3.35rem]">
              {isEditing ? "SEU PERFIL" : "ESCOLHA SEU PERFIL"}
            </h1>
            <div className="mx-auto mt-2 h-1 w-28 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            <p className="mx-auto mt-3 max-w-2xl font-serif text-sm italic text-amber-900/70">{helperCopy}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-4">
              <div className="rounded-[1.8rem] border border-amber-900/12 bg-white/45 px-4 py-4 shadow-inner sm:px-5 sm:py-5">
                <div className="flex items-center gap-3 text-amber-900/70">
                  <PenLine className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.28em]">Nome do Duelista</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, MAX_PLAYER_NAME_LENGTH))}
                  placeholder="Ex: Arkan"
                  className="mt-3 h-12 w-full rounded-2xl border-2 border-amber-900/14 bg-amber-50/80 px-5 text-center font-serif text-xl font-black tracking-tight text-amber-950 outline-none transition-all placeholder:text-amber-900/20 focus:border-amber-500 sm:h-[3.3rem] sm:text-[1.75rem]"
                />
              </div>

              <div className="rounded-[1.8rem] border border-amber-900/12 bg-white/45 px-4 py-4 shadow-inner sm:px-5 sm:py-5">
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/70">Como voce sera visto</div>
                <div className="mt-3 flex items-center gap-4 rounded-[1.6rem] border border-amber-900/10 bg-amber-100/60 px-4 py-3.5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-700/30 bg-amber-50 text-4xl shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:h-[4.6rem] sm:w-[4.6rem] sm:text-[2.8rem]">
                    {avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-900/45">Pronto para o duelo</div>
                    <div className="mt-1 truncate font-serif text-2xl font-black tracking-tight text-amber-950 sm:text-[2.1rem]">
                      {trimmedName || "Seu nome"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-amber-900/12 bg-white/45 px-4 py-4 shadow-inner sm:px-5 sm:py-5">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/70">Escolha seu icone</div>
              <div className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3">
                {AVATAR_OPTIONS.map((option) => {
                  const selected = option === avatar;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAvatar(option)}
                      className={cn(
                        "relative flex h-16 items-center justify-center rounded-[1.35rem] border-2 bg-amber-50 text-3xl shadow-[0_10px_18px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 sm:h-[4.5rem] sm:text-[2.35rem]",
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                          : "border-amber-900/10 hover:border-amber-500/40",
                      )}
                    >
                      {option}
                      {selected ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 p-1 text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => canSave && onSave({ name: trimmedName, avatar })}
              disabled={!canSave}
              className="group relative h-14 overflow-hidden rounded-[1.25rem] border-[3px] border-[#1f7a46] bg-[#2f9a56] px-8 font-serif text-lg font-black text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] transition-all duration-150 ease-out hover:-translate-y-1 hover:bg-[#35a55d] hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] active:translate-y-[4px] active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#2f9a56] disabled:hover:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] disabled:active:translate-y-0 sm:h-[3.9rem] sm:text-xl"
            >
              <span className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-15 mix-blend-soft-light" />
              <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22" />
              <span className="pointer-events-none absolute inset-[5px] z-0 rounded-[0.95rem] border border-white/16" />
              <span className="relative z-10">
                {isEditing ? "SALVAR PERFIL" : "ENTRAR NA TAVERNA"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
