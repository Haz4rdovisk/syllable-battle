import React, { useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  BookOpenText,
  Filter,
  Layers3,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DECKS } from "../../data/decks";
import {
  compareDeckMetrics,
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

const metricDeltaToneClass = {
  positive: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
  negative: "border-rose-300/30 bg-rose-500/10 text-rose-100",
  neutral: "border-amber-200/15 bg-white/5 text-amber-50/80",
} as const;

export const ContentInspector: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => inspections[0]?.deck.id ?? "");
  const [searchValue, setSearchValue] = useState("");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [compareDeckId, setCompareDeckId] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  const filteredInspections = useMemo(
    () =>
      inspections.filter((inspection) => {
        const matchesSearch =
          deferredSearchValue.length === 0 ||
          inspection.deck.name.toLowerCase().includes(deferredSearchValue) ||
          inspection.deck.id.toLowerCase().includes(deferredSearchValue);
        const matchesWarningFilter = !warningsOnly || inspection.warnings.length > 0;

        return matchesSearch && matchesWarningFilter;
      }),
    [deferredSearchValue, warningsOnly],
  );

  const selectedInspection = useMemo(
    () =>
      filteredInspections.find((inspection) => inspection.deck.id === selectedDeckId) ??
      filteredInspections[0] ??
      null,
    [filteredInspections, selectedDeckId],
  );

  const compareCandidates = useMemo(
    () => inspections.filter((inspection) => inspection.deck.id !== selectedInspection?.deck.id),
    [selectedInspection],
  );

  const activeCompareDeckId = useMemo(() => {
    if (
      compareDeckId &&
      compareDeckId !== selectedInspection?.deck.id &&
      compareCandidates.some((inspection) => inspection.deck.id === compareDeckId)
    ) {
      return compareDeckId;
    }

    return compareCandidates[0]?.deck.id ?? "";
  }, [compareCandidates, compareDeckId, selectedInspection]);

  const compareInspection = useMemo(
    () => inspections.find((inspection) => inspection.deck.id === activeCompareDeckId) ?? null,
    [activeCompareDeckId],
  );

  const metricComparison = useMemo(() => {
    if (!selectedInspection || !compareInspection) return [];
    return compareDeckMetrics(selectedInspection.deck, compareInspection.deck);
  }, [compareInspection, selectedInspection]);

  if (!selectedInspection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a] p-6 text-amber-50">
        <div className="w-full max-w-xl rounded-[28px] border border-amber-200/10 bg-black/30 p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/45">Dev Only</div>
          <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-amber-100">
            Nenhum deck encontrado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-amber-50/75">
            O filtro atual nao encontrou decks no catalogo real.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="ghost"
              className="border border-amber-200/10 bg-amber-50/5 text-amber-100 hover:bg-amber-50/10"
              onClick={() => {
                setSearchValue("");
                setWarningsOnly(false);
              }}
            >
              Limpar filtros
            </Button>
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
        </div>
      </div>
    );
  }

  const { deck, metrics, warnings, bottlenecks, relativeChecks, targetCompetition } = selectedInspection;
  const sortedSyllables = [...Object.entries(deck.syllables)].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#140f0c] text-amber-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20" />
        <div className="absolute left-[-10%] top-[-20%] h-[45rem] w-[45rem] rounded-full bg-amber-700/10 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[42rem] w-[42rem] rounded-full bg-sky-600/10 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="w-full shrink-0 rounded-[28px] border border-amber-200/10 bg-black/25 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] lg:w-[24rem] lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/45">Dev Only</div>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-amber-100">
                Inspecao de Conteudo
              </h1>
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
            A ferramenta le o catalogo real validado pelo pipeline atual e continua em modo somente leitura.
          </div>

          <div className="mt-5 space-y-3 rounded-[24px] border border-amber-200/10 bg-black/15 p-4">
            <label className="block">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/50">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar por nome ou id do deck"
                className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/30"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWarningsOnly((current) => !current)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] transition",
                  warningsOnly
                    ? "border-amber-300/30 bg-amber-500/15 text-amber-50"
                    : "border-amber-200/10 bg-white/5 text-amber-100/55 hover:border-amber-200/20 hover:text-amber-50",
                )}
              >
                So decks com warnings
              </button>

              {(searchValue.length > 0 || warningsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    setWarningsOnly(false);
                  }}
                  className="rounded-full border border-amber-200/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-100/55 transition hover:border-amber-200/20 hover:text-amber-50"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="text-sm text-amber-50/75">
              Exibindo <span className="font-black text-amber-50">{filteredInspections.length}</span> de{" "}
              <span className="font-black text-amber-50">{inspections.length}</span> decks do catalogo real.
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredInspections.map((inspection) => (
              <button
                key={inspection.deck.id}
                type="button"
                onClick={() => setSelectedDeckId(inspection.deck.id)}
                className={cn(
                  "w-full rounded-[24px] border p-4 text-left transition-all",
                  deck.id === inspection.deck.id
                    ? "border-amber-300/30 bg-amber-200/12 shadow-[0_18px_34px_rgba(0,0,0,0.22)]"
                    : "border-amber-200/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/7",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner",
                        inspection.deck.color,
                      )}
                    >
                      {inspection.deck.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-serif text-xl font-black text-amber-100">
                        {inspection.deck.name}
                      </div>
                      <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                        {inspection.deck.id}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "border",
                      inspection.warnings.length > 0
                        ? warningBadgeClass.warning
                        : "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
                    )}
                  >
                    {inspection.warnings.length > 0
                      ? `${inspection.warnings.length} warning${inspection.warnings.length > 1 ? "s" : ""}`
                      : "sem warning"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <div
            className={cn(
              "rounded-[32px] border border-amber-200/10 bg-gradient-to-br p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]",
              deck.color,
            )}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-black/15 text-5xl shadow-[0_12px_24px_rgba(0,0,0,0.2)]">
                  {deck.emoji}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-100/60">
                    Catalogo real
                  </div>
                  <h2 className="mt-2 font-serif text-4xl font-black tracking-tight text-amber-50">
                    {deck.name}
                  </h2>
                  <p className="mt-3 max-w-3xl font-serif text-sm italic leading-relaxed text-amber-50/80">
                    {deck.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Targets" value={String(deck.targets.length)} />
                <MetricCard
                  icon={<BookOpenText className="h-5 w-5" />}
                  label="Silabas totais"
                  value={String(metrics.totalSyllables)}
                />
                <MetricCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Unicas"
                  value={String(metrics.uniqueSyllables)}
                />
                <MetricCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="Dano medio"
                  value={String(metrics.averageDamage)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <Panel title="Warnings de Integridade e Balanceamento" icon={<AlertTriangle className="h-5 w-5" />}>
                {warnings.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                    Nenhum warning heuristico relevante para este deck no recorte atual.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((warning) => (
                      <div
                        key={warning.id}
                        className={cn("rounded-2xl border px-4 py-4", warningToneClass[warning.severity])}
                      >
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

              <Panel title="Checks Acionaveis" icon={<Sparkles className="h-5 w-5" />}>
                <div className="space-y-5">
                  <Subsection
                    title="Silabas gargalo"
                    subtitle="Leitura rapida de pressao entre oferta no deck e demanda agregada dos targets."
                  >
                    {bottlenecks.length === 0 ? (
                      <EmptyCallout text="Nenhum gargalo relevante apareceu para o deck atual." />
                    ) : (
                      <div className="space-y-3">
                        {bottlenecks.slice(0, 5).map((entry) => (
                          <div key={entry.syllable} className="rounded-2xl border border-amber-200/10 bg-black/20 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-50">{entry.syllable}</div>
                              <Badge className="border border-amber-300/20 bg-amber-500/10 text-amber-50">
                                pressao {entry.pressure}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-50/75">
                              {entry.requiredAcrossTargets} usos agregados para {entry.availableCopies} copias no deck.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.affectedTargets.map((targetName) => (
                                <span
                                  key={`${entry.syllable}-${targetName}`}
                                  className="rounded-full border border-amber-200/12 bg-amber-50/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50"
                                >
                                  {targetName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>

                  <Subsection
                    title="Targets com alta competicao interna"
                    subtitle="Mostra quais alvos disputam o mesmo pool de silabas dentro do deck."
                  >
                    {targetCompetition.length === 0 ? (
                      <EmptyCallout text="Nao ha competicao interna relevante entre targets no recorte atual." />
                    ) : (
                      <div className="space-y-3">
                        {targetCompetition.slice(0, 4).map((entry) => (
                          <div
                            key={entry.targetId}
                            className="rounded-2xl border border-amber-200/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-50">{entry.targetName}</div>
                              <Badge className="border border-sky-300/25 bg-sky-500/10 text-sky-100">
                                score {entry.pressureScore}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-50/75">
                              Compartilha {entry.sharedSyllables.join(", ")} com {entry.competingTargets.join(", ")}.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>

                  <Subsection
                    title="Leitura relativa do catalogo"
                    subtitle="Compara este deck com o restante do catalogo real ja validado."
                  >
                    {relativeChecks.length === 0 ? (
                      <EmptyCallout text="Nenhum desvio relativo forte contra o restante do catalogo atual." />
                    ) : (
                      <div className="space-y-3">
                        {relativeChecks.map((check) => (
                          <div
                            key={check.id}
                            className={cn("rounded-2xl border px-4 py-4", warningToneClass[check.severity])}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-serif text-lg font-black">{check.title}</div>
                              <Badge className={cn("border uppercase", warningBadgeClass[check.severity])}>
                                {check.severity}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-inherit/90">{check.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>
                </div>
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
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                              {target.id}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white",
                            rarityToneClass[target.rarity],
                          )}
                        >
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
                  <InfoTile label="Copias medias por silaba" value={String(metrics.averageCopiesPerSyllable)} />
                  <InfoTile label="Maior target" value={`${metrics.longestTargetLength} silabas`} />
                  <InfoTile label="Media de silabas por target" value={String(metrics.averageTargetLength)} />
                  <InfoTile label="Silabas de copia unica" value={String(metrics.singleUseSyllableCount)} />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-3 text-sm text-amber-50/85">
                  <span className="font-black text-amber-100">Raridades:</span> {formatRarityBreakdown(metrics.rarityCounts)}
                </div>
              </Panel>

              <Panel title="Comparacao entre Decks" icon={<ArrowRightLeft className="h-5 w-5" />}>
                {compareInspection ? (
                  <div className="space-y-4">
                    <label className="block">
                      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                        Comparar com
                      </div>
                      <select
                        value={activeCompareDeckId}
                        onChange={(event) => setCompareDeckId(event.target.value)}
                        className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                      >
                        {compareCandidates.map((inspection) => (
                          <option key={inspection.deck.id} value={inspection.deck.id}>
                            {inspection.deck.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-3 text-sm text-amber-50/75">
                      Comparando <span className="font-black text-amber-50">{deck.name}</span> com{" "}
                      <span className="font-black text-amber-50">{compareInspection.deck.name}</span>.
                    </div>

                    <div className="grid gap-3">
                      {metricComparison.map((entry) => {
                        const deltaTone =
                          entry.delta > 0
                            ? metricDeltaToneClass.positive
                            : entry.delta < 0
                              ? metricDeltaToneClass.negative
                              : metricDeltaToneClass.neutral;

                        return (
                          <div
                            key={entry.id}
                            className="rounded-[24px] border border-amber-200/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-50">{entry.label}</div>
                              <Badge className={cn("border", deltaTone)}>{entry.deltaDisplay}</Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                              <ComparisonCell label={deck.name} value={entry.baseDisplay} />
                              <ComparisonCell label={compareInspection.deck.name} value={entry.compareDisplay} />
                              <ComparisonCell label="Delta" value={entry.deltaDisplay} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyCallout text="Nao ha outro deck disponivel para comparacao." />
                )}
              </Panel>

              <Panel title="Distribuicao de Silabas" icon={<BookOpenText className="h-5 w-5" />}>
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

const Subsection: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div>
    <div className="mb-3">
      <div className="font-serif text-xl font-black text-amber-50">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-amber-50/65">{subtitle}</p>
    </div>
    {children}
  </div>
);

const ComparisonCell: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-black/20 px-3 py-3">
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">{label}</div>
    <div className="mt-2 font-serif text-xl font-black text-amber-50">{value}</div>
  </div>
);

const EmptyCallout: React.FC<{
  text: string;
}> = ({ text }) => (
  <div className="rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-4 text-sm text-amber-50/75">
    {text}
  </div>
);
