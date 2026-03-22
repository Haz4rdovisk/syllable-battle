import React, { useState } from "react";
import { Button } from "../ui/button";
import { motion } from "motion/react";
import { ChevronLeft, Copy, Check, Play, Loader2, ScrollText } from "lucide-react";
import { nanoid } from "nanoid";
import { BattleSide } from "../../types/game";
import { BattleRoomState } from "../../lib/battleRoomSession";

interface LobbyProps {
  onBack: () => void;
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  activeRoomId?: string;
  localSide?: BattleSide;
  roomState?: BattleRoomState | null;
  onStartRoom?: () => void;
}

const WIZARD_EMOJI = "\uD83E\uDDD9\u200D\u2642\uFE0F";
const ENEMY_EMOJI = "\uD83D\uDC79";

export const Lobby: React.FC<LobbyProps> = ({
  onBack,
  onCreateRoom,
  onJoinRoom,
  activeRoomId,
  localSide = "player",
  roomState = null,
  onStartRoom,
}) => {
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = localSide === "player";
  const opponentConnected = localSide === "player" ? !!roomState?.guest.connected : !!roomState?.host.connected;

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      onCreateRoom(nanoid(6).toUpperCase());
      setIsCreating(false);
    }, 1500);
  };

  const handleJoin = () => {
    if (!roomId) return;
    setIsJoining(true);
    setTimeout(() => {
      onJoinRoom(roomId.toUpperCase());
      setIsJoining(false);
    }, 1500);
  };

  const copyRoomId = () => {
    if (!activeRoomId) return;
    navigator.clipboard.writeText(activeRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (activeRoomId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[80vh] gap-12 p-4 w-full max-w-lg mx-auto"
      >
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif font-black text-amber-100 drop-shadow-lg">SALA DE JOGO</h2>
          <p className="text-amber-100/60 font-serif italic">
            {opponentConnected ? "Seu oponente entrou na sala." : "Envie o codigo para seu oponente."}
          </p>
        </div>

        <div className="paper-panel w-full flex flex-col items-center gap-8 border-4 border-[#3e2723]/30">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black tracking-[0.4em] text-amber-900 uppercase">CODIGO DA SALA</span>
            <div className="flex items-center gap-4 bg-amber-900/5 px-8 py-4 rounded-2xl border-2 border-dashed border-amber-900/20">
              <span className="text-5xl font-serif font-black tracking-tighter text-amber-950">{activeRoomId}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyRoomId}
                className="rounded-full hover:bg-amber-900/10 text-amber-900"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="w-full h-px bg-amber-900/10" />

          <div className="flex items-center gap-6 w-full">
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-700 flex items-center justify-center text-3xl shadow-lg">
                {WIZARD_EMOJI}
              </div>
              <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">VOCE (NA SALA)</span>
            </div>

            <div className="w-10 h-10 rounded-full bg-amber-900/10 flex items-center justify-center text-amber-900 font-serif font-black italic">
              VS
            </div>

            <div className={`flex-1 flex flex-col items-center gap-3 ${opponentConnected ? "" : "opacity-50"}`}>
              <div
                className={
                  opponentConnected
                    ? "w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-700 flex items-center justify-center text-3xl shadow-lg"
                    : "w-16 h-16 rounded-full bg-slate-200 border-4 border-dashed border-slate-400 flex items-center justify-center"
                }
              >
                {opponentConnected ? ENEMY_EMOJI : <Loader2 className="w-8 h-8 animate-spin text-slate-500" />}
              </div>
              <span
                className={`text-xs font-black uppercase tracking-widest ${
                  opponentConnected ? "text-amber-900" : "text-slate-500"
                }`}
              >
                {opponentConnected ? "INIMIGO" : "AGUARDANDO..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Button
            onClick={onStartRoom}
            disabled={!isHost || !opponentConnected}
            className="h-20 rounded-[32px] bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] hover:from-[#388e3c] hover:to-[#2e7d32] border-4 border-[#d4af37] shadow-[0_12px_24px_rgba(0,0,0,0.4)] active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-6 h-6 mr-2 text-emerald-300" />
            <span className="font-serif font-black text-2xl text-emerald-50">
              {isHost ? "INICIAR DUELO" : "AGUARDANDO ANFITRIAO"}
            </span>
          </Button>
          <Button variant="ghost" onClick={onBack} className="text-amber-100/40 hover:text-amber-100 font-serif italic">
            {isHost ? "Dissolver Sala" : "Sair da Sala"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-[80vh] gap-12 p-4 w-full max-w-lg mx-auto"
    >
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-amber-100/40 hover:text-amber-100 font-serif">
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <h2 className="text-3xl font-serif font-black tracking-tight text-amber-100">MULTIPLAYER</h2>
        <div className="w-24" />
      </div>

      <div className="flex flex-col gap-8">
        <div className="paper-panel flex flex-col gap-6 items-center text-center border-4 border-[#3e2723]/30">
          <div className="w-20 h-20 rounded-[28px] bg-emerald-100 flex items-center justify-center shadow-xl border-2 border-emerald-700">
            <ScrollText className="w-10 h-10 text-emerald-800" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-black text-amber-950">CRIAR SALA</h3>
            <p className="text-sm text-amber-900/60 font-serif italic">Crie uma sala e convide um amigo.</p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full h-16 rounded-2xl bg-[#3e2723] hover:bg-[#5d4037] text-amber-100 font-serif font-black text-xl border-b-4 border-black"
          >
            {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : "CRIAR SALA"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-amber-100/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#1a1a1a] px-6 text-amber-100/30 font-serif font-black italic tracking-widest">OU</span>
          </div>
        </div>

        <div className="paper-panel flex flex-col gap-6 items-center text-center border-4 border-[#3e2723]/30">
          <div className="space-y-2 w-full">
            <h3 className="text-2xl font-serif font-black text-amber-950">ENTRAR EM SALA</h3>
            <p className="text-sm text-amber-900/60 font-serif italic">Digite o codigo da sala.</p>
          </div>
          <input
            type="text"
            placeholder="EX: XJ82KP"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="w-full h-16 rounded-2xl bg-amber-900/5 border-2 border-amber-900/20 px-6 text-center text-3xl font-serif font-black tracking-widest text-amber-950 focus:border-amber-600 outline-none transition-all placeholder:text-amber-900/20"
          />
          <Button
            onClick={handleJoin}
            disabled={isJoining || !roomId}
            className="w-full h-16 rounded-2xl bg-[#2e7d32] hover:bg-[#388e3c] text-emerald-50 font-serif font-black text-xl border-b-4 border-[#1b5e20]"
          >
            {isJoining ? <Loader2 className="w-6 h-6 animate-spin" /> : "ENTRAR"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
