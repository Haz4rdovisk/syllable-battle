import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, BookOpenText, Layers3, SearchCheck, ShieldCheck } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DECKS } from "../../data/decks";
import {
  formatRarityBreakdown,
  inspectDeckCatalog,
} from "../../data/contentInsights";
import { cn } from "../../lib/utils";

const inspections = inspectDeckCatalog(DECKS);

const warningToneClass: Record<"info" | "warning", string> = {
  info: "border-sky-300/25 bg-sky-500/10 text-sky-100",
  warning: "border-amber-300/25 bg-amber-500/10 text-amber-50",
};

const warningBadgeClass: Record<"info" | "warning", string> = {
  info: "border-sky-300/30 bg-sky-500/15 text-sky-100",
  warning: "border-amber-300/30 bg-amber-500/15 text-amber-50",
};

const rarityToneClass: Record<string, string> = {
  comum: "bg-slate-500",
  raro: "bg-amber-600",
  épico: "bg-purple-700",
  lendário: "bg-rose-800",
};

export const ContentInspector: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => inspections[0]?.deck.id ?? "");

  const selectedInspection = useMemo(
    () => inspections.find((inspection) => inspection.deck.id === selectedDeckId) ?? inspections[0] ?? null,
    [selectedDeckId],
  );

  if (!selectedInspection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a] p-6 text-amber-50">
        Nenhum deck disponível para inspeção.
      </div>
    );
  }

  const { deck, metrics, warnings } = selectedInspection;
  const sortedSyllables = [...Object.entries(deck.syllables)].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#140f0c] text-amber-50">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20" />
        <div className="absolute left-[-10%] top-[-20%] h-[45rem] w-[45rem] rounded-full bg-amber-700/10 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[42rem] w-[42rem] rounded-full bg-sky-600/10 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="w-full shrink-0 rounded-[28px] border border-amber-200/10 bg-black/25 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] lg:w-[22rem] lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/45">Dev Only</div>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-amber-100">Inspeção de Conteúdo</h1>
            </div>
            <Button
              variant="ghost"
              className="border border-amber-200/10 bg-amber-50/5 text-amber-100 hover:bg-amber-50/10"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.location.href = "/";
              }}
            >
              Voltar
            </Button>
          </div>

          <div className="rounded-2xl border border-emerald-300/12 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100/90">
            A ferramenta lê o catálogo real já validado pelo pipeline atual. Nenhum dado daqui altera battle, multiplayer ou layout.
          </div>

          <div className="mt-5 space-y-3">
            {inspections.map((inspection) => (
              <button
                key={inspection.deck.id}
                type="button"
                onClick={() => setSelectedDeckId(inspection.deck.id)}
                className={cn(
                  "w-full rounded-[24px] border p-4 text-left transition-all",
                  selectedDeckId === inspection.deck.id
                    ? "border-amber-300/30 bg-amber-200/12 shadow-[0_18px_34px_rgba(0,0,0,0.22)]"
                    : "border-amber-200/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/7",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner", inspection.deck.color)}>
                      {inspection.deck.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-serif text-xl font-black text-amber-100">{inspection.deck.name}</div>
                      <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                        {inspection.deck.id}
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("border", inspection.warnings.length > 0 ? warningBadgeClass.warning : "border-emerald-300/25 bg-emerald-500/10 text-emerald-100")}>
                    {inspection.warnings.length > 0 ? `${inspection.warnings.length} warning${inspection.warnings.length > 1 ? "s" : ""}` : "sem warning"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <div className={cn("rounded-[32px] border border-amber-200/10 bg-gradient-to-br p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]", deck.color)}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-black/15 text-5xl shadow-[0_12px_24px_rgba(0,0,0,0.2)]">
                  {deck.emoji}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-100/60">Catálogo real</div>
                  <h2 className="mt-2 font-serif text-4xl font-black tracking-tight text-amber-50">{deck.name}</h2>
                  <p className="mt-3 max-w-3xl font-serif text-sm italic leading-relaxed text-amber-50/80">{deck.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Targets" value={String(deck.targets.length)} />
                <MetricCard icon={<BookOpenText className="h-5 w-5" />} label="Sílabas totais" value={String(metrics.totalSyllables)} />
                <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Únicas" value={String(metrics.uniqueSyllables)} />
                <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Dano médio" value={String(metrics.averageDamage)} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Panel title="Warnings de Integridade e Balanceamento" icon={<AlertTriangle className="h-5 w-5" />}>
                {warnings.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                    Nenhum warning heurístico relevante para este deck no recorte atual.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((warning) => (
                      <div key={warning.id} className={cn("rounded-2xl border px-4 py-4", warningToneClass[warning.severity])}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-serif text-lg font-black">{warning.title}</div>
                          <Badge className={cn("border uppercase", warningBadgeClass[warning.severity])}>
                            {warning.severity}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-inherit/90">{warning.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Targets do Deck" icon={<SearchCheck className="h-5 w-5" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  {deck.targets.map((target) => (
                    <div key={target.id} className="rounded-[24px] border border-amber-200/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl leading-none">{target.emoji}</div>
                          <div>
                            <div className="font-serif text-xl font-black text-amber-50">{target.name}</div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">{target.id}</div>
                          </div>
                        </div>
                        <div className={cn("rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white", rarityToneClass[target.rarity])}>
                          {target.rarity}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {target.syllables.map((syllable, index) => (
                          <span
                            key={`${target.id}-${syllable}-${index}`}
                            className="rounded-full border border-amber-200/12 bg-amber-50/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50"
                          >
                            {syllable}
                          </span>
                        ))}
                      </div>
                      {target.description ? (
                        <p className="mt-3 text-sm leading-relaxed text-amber-50/75">{target.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Resumo Estrutural do Deck" icon={<Layers3 className="h-5 w-5" />}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoTile label="Cópias médias por sílaba" value={String(metrics.averageCopiesPerSyllable)} />
                  <InfoTile label="Maior target" value={`${metrics.longestTargetLength} sílabas`} />
                  <InfoTile label="Média de sílabas por target" value={String(metrics.averageTargetLength)} />
                  <InfoTile label="Sílabas de cópia única" value={String(metrics.singleUseSyllableCount)} />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-3 text-sm text-amber-50/85">
                  <span className="font-black text-amber-100">Raridades:</span> {formatRarityBreakdown(metrics.rarityCounts)}
                </div>
              </Panel>

              <Panel title="Distribuição de Sílabas" icon={<BookOpenText className="h-5 w-5" />}>
                <div className="space-y-2">
                  {sortedSyllables.map(([syllable, count]) => {
                    const width = `${Math.max(14, (count / Math.max(1, metrics.highestSyllableCount)) * 100)}%`;
                    return (
                      <div key={syllable} className="rounded-2xl border border-amber-200/10 bg-black/15 px-3 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-black uppercase tracking-[0.18em] text-amber-50">{syllable}</span>
                          <span className="text-sm font-black text-amber-100/80">x{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className={cn("h-full rounded-full bg-gradient-to-r", deck.color)} style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="rounded-[28px] border border-amber-200/10 bg-black/25 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/10 bg-amber-50/8 text-amber-100">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-black tracking-tight text-amber-50">{title}</h3>
    </div>
    {children}
  </section>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-amber-50 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
    <div className="flex items-center gap-2 text-amber-50/80">{icon}</div>
    <div className="mt-3 text-[11px] font-black uppercase tracking-[0.22em] text-amber-50/60">{label}</div>
    <div className="mt-1 font-serif text-3xl font-black">{value}</div>
  </div>
);

const InfoTile: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-4">
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">{label}</div>
    <div className="mt-2 font-serif text-2xl font-black text-amber-50">{value}</div>
  </div>
);
