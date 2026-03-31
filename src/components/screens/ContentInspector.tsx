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
import {
  compareDeckMetrics,
  formatRarityBreakdown,
  inspectDeckCatalog,
} from "../../data/contentInsights";
import {
  CONTENT_CATALOG,
  CONTENT_PIPELINE,
  getCatalogCardById,
  getMostReusedCards,
  getSharedTargetsBetweenDeckModels,
} from "../../data/content";
import { cn } from "../../lib/utils";

const inspections = inspectDeckCatalog(
  CONTENT_PIPELINE.deckModels,
  CONTENT_PIPELINE.runtimeDecksById,
);

const warningToneClass: Record<"info" | "warning", string> = {
  info: "border-sky-700/12 bg-sky-100/85 text-sky-950",
  warning: "border-amber-900/15 bg-amber-100/80 text-amber-950",
};

const warningBadgeClass: Record<"info" | "warning", string> = {
  info: "border-sky-700/12 bg-sky-100/85 text-sky-950",
  warning: "border-amber-900/12 bg-white/80 text-amber-950",
};

const rarityToneClass: Record<string, string> = {
  comum: "bg-slate-500",
  raro: "bg-amber-600",
  épico: "bg-purple-700",
  lendário: "bg-rose-800",
};

const metricDeltaToneClass = {
  positive: "border-emerald-700/15 bg-emerald-100/85 text-emerald-950",
  negative: "border-rose-700/15 bg-rose-100/85 text-rose-950",
  neutral: "border-amber-900/12 bg-[rgba(255,252,244,0.88)] text-amber-950/85",
} as const;

const inspectorCardClass =
  "rounded-[24px] border border-amber-900/12 bg-[rgba(255,252,244,0.88)] p-4 text-amber-950 shadow-[0_16px_30px_rgba(0,0,0,0.08)]";

const inspectorInsetClass =
  "rounded-2xl border border-amber-900/12 bg-[rgba(255,250,242,0.76)] px-4 py-3 text-amber-950/80";

const inspectorChipClass =
  "rounded-full border border-amber-900/12 bg-white/85 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950";

const inspectorInputClass =
  "w-full rounded-2xl border border-amber-900/15 bg-white/80 px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35 focus:border-amber-500/30";

export const ContentInspector: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    () => inspections[0]?.deckModel?.id ?? inspections[0]?.deck?.id ?? "",
  );
  const [searchValue, setSearchValue] = useState("");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [compareDeckId, setCompareDeckId] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  const filteredInspections = useMemo(
    () =>
      inspections.filter((inspection) => {
        const deckId = inspection.deckModel?.id ?? inspection.deck?.id ?? "";
        const deckName = inspection.deckModel?.definition.name ?? inspection.deck?.name ?? "";
        const matchesSearch =
          deferredSearchValue.length === 0 ||
          deckName.toLowerCase().includes(deferredSearchValue) ||
          deckId.toLowerCase().includes(deferredSearchValue);
        const matchesWarningFilter = !warningsOnly || inspection.warnings.length > 0;

        return matchesSearch && matchesWarningFilter;
      }),
    [deferredSearchValue, warningsOnly],
  );

  const selectedInspection = useMemo(
    () =>
      filteredInspections.find((inspection) => (inspection.deckModel?.id ?? inspection.deck?.id) === selectedDeckId) ??
      filteredInspections[0] ??
      null,
    [filteredInspections, selectedDeckId],
  );

  const compareCandidates = useMemo(
    () =>
      inspections.filter(
        (inspection) => (inspection.deckModel?.id ?? inspection.deck?.id) !== (selectedInspection?.deckModel?.id ?? selectedInspection?.deck?.id),
      ),
    [selectedInspection],
  );

  const activeCompareDeckId = useMemo(() => {
    if (
      compareDeckId &&
      compareDeckId !== (selectedInspection?.deckModel?.id ?? selectedInspection?.deck?.id) &&
      compareCandidates.some((inspection) => (inspection.deckModel?.id ?? inspection.deck?.id) === compareDeckId)
    ) {
      return compareDeckId;
    }

    return compareCandidates[0]?.deckModel?.id ?? compareCandidates[0]?.deck?.id ?? "";
  }, [compareCandidates, compareDeckId, selectedInspection]);

  const compareInspection = useMemo(
    () =>
      inspections.find((inspection) => (inspection.deckModel?.id ?? inspection.deck?.id) === activeCompareDeckId) ?? null,
    [activeCompareDeckId],
  );

  const metricComparison = useMemo(() => {
    if (!selectedInspection?.deckModel || !compareInspection?.deckModel) return [];
    return compareDeckMetrics(selectedInspection.deckModel, compareInspection.deckModel);
  }, [compareInspection, selectedInspection]);

  const selectedDeckModel = useMemo(
    () => selectedInspection?.deckModel ?? null,
    [selectedInspection],
  );

  const selectedDeckDefinition = useMemo(
    () => selectedDeckModel?.definition ?? null,
    [selectedDeckModel],
  );

  const selectedCatalogTargetDefinitions = useMemo(
    () => selectedDeckModel?.targetDefinitions ?? [],
    [selectedDeckModel],
  );

  const selectedCatalogTargetInstances = useMemo(
    () => selectedDeckModel?.targetInstances ?? [],
    [selectedDeckModel],
  );

  const selectedCatalogCards = useMemo(
    () => selectedDeckModel?.cards ?? [],
    [selectedDeckModel],
  );

  const selectedSharedTargets = useMemo(
    () =>
      selectedDeckModel
        ? getSharedTargetsBetweenDeckModels(selectedDeckModel, CONTENT_PIPELINE.deckModels)
        : [],
    [selectedDeckModel],
  );

  const mostReusedCards = useMemo(
    () => getMostReusedCards(CONTENT_CATALOG, CONTENT_PIPELINE.deckModels, 5),
    [],
  );

  if (!selectedInspection || !selectedInspection.deckModel || !selectedInspection.deck) {
    return (
      <div className="min-h-screen bg-[#f4ede2] px-6 py-10 text-amber-950">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(120,92,72,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,92,72,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute inset-0 opacity-[0.2] mix-blend-multiply [background-image:radial-gradient(rgba(120,92,72,0.18)_0.55px,transparent_0.55px)] [background-size:18px_18px]" />
        </div>
        <div className="paper-panel relative mx-auto w-full max-w-xl rounded-[28px] border-2 border-[#8d6e63]/40 p-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/45">Dev Only</div>
          <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-amber-950">
            Nenhum deck encontrado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-amber-950/70">
            O filtro atual nao encontrou decks no catalogo real.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="ghost"
              className="border border-amber-900/12 bg-white/75 text-amber-950 hover:bg-amber-50/90"
              onClick={() => {
                setSearchValue("");
                setWarningsOnly(false);
              }}
            >
              Limpar filtros
            </Button>
            <Button
              variant="ghost"
              className="border border-amber-900/12 bg-white/75 text-amber-950 hover:bg-amber-50/90"
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
    <div className="min-h-full w-full overflow-y-auto bg-[#f4ede2] text-amber-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,92,72,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,92,72,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 opacity-[0.2] mix-blend-multiply [background-image:radial-gradient(rgba(120,92,72,0.18)_0.55px,transparent_0.55px)] [background-size:18px_18px]" />
        <div className="absolute left-[-10%] top-[-20%] h-[45rem] w-[45rem] rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[42rem] w-[42rem] rounded-full bg-sky-300/20 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="paper-panel w-full shrink-0 rounded-[28px] border-2 border-[#8d6e63]/35 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.12)] lg:w-[24rem] lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/45">Dev Only</div>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-amber-950">
                Inspecao de Conteudo
              </h1>
            </div>
            <Button
              variant="ghost"
              className="border border-amber-900/12 bg-white/75 text-amber-950 hover:bg-amber-50/90"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.location.href = "/";
              }}
            >
              Voltar
            </Button>
          </div>

          <div className="rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-4 py-3 text-sm text-emerald-950/90">
            A ferramenta le o catalogo normalizado e o deck model central, usando a mesma projecao runtime de{" "}
            <span className="font-black text-emerald-950">{CONTENT_PIPELINE.runtimeDecks.length}</span> decks
            derivados e continua em modo somente leitura.
          </div>

          <div className="mt-3 rounded-2xl border border-sky-700/12 bg-sky-100/85 px-4 py-3 text-sm text-sky-950/90">
            Fonte unica: <span className="font-black text-sky-950">{CONTENT_CATALOG.cards.length}</span> cartas
            canonicas, <span className="font-black text-sky-950">{CONTENT_CATALOG.targets.length}</span> targets e{" "}
            <span className="font-black text-sky-950">{CONTENT_CATALOG.decks.length}</span> deck definitions que
            alimentam <span className="font-black text-sky-950">{CONTENT_PIPELINE.deckModels.length}</span> deck
            models centrais.
          </div>

          <div className="mt-5 space-y-3 rounded-[24px] border border-amber-900/12 bg-[rgba(255,250,242,0.76)] p-4">
            <label className="block">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar por nome ou id do deck"
                className={inspectorInputClass}
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWarningsOnly((current) => !current)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] transition",
                  warningsOnly
                    ? "border-amber-900/18 bg-amber-100/80 text-amber-950"
                    : "border-amber-900/12 bg-white/70 text-amber-900/60 hover:border-amber-900/18 hover:text-amber-950",
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
                  className="rounded-full border border-amber-900/12 bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-900/60 transition hover:border-amber-900/18 hover:text-amber-950"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="text-sm text-amber-950/75">
              Exibindo <span className="font-black text-amber-950">{filteredInspections.length}</span> de{" "}
              <span className="font-black text-amber-950">{inspections.length}</span> decks do catalogo real.
            </div>
          </div>

          <div className="mt-5 space-y-3">
                {filteredInspections.map((inspection) => {
                  const inspectionDeck = inspection.deck;
                  const inspectionDeckModel = inspection.deckModel;
                  const inspectionId = inspectionDeckModel?.id ?? inspectionDeck?.id ?? "";
                  const inspectionName = inspectionDeckModel?.definition.name ?? inspectionDeck?.name ?? inspectionId;
                  const inspectionEmoji = inspectionDeckModel?.definition.emoji ?? inspectionDeck?.emoji ?? "🃏";
                  const inspectionColor = inspectionDeck?.color ?? "from-slate-700 to-slate-900";

                  return (
                  <button
                    key={inspectionId}
                    type="button"
                    onClick={() => setSelectedDeckId(inspectionId)}
                    className={cn(
                      "w-full rounded-[24px] border p-4 text-left transition-all",
                      deck.id === inspectionId
                        ? "border-amber-900/20 bg-amber-50/95 shadow-[0_18px_34px_rgba(0,0,0,0.1)]"
                        : "border-amber-900/12 bg-white/70 hover:border-amber-900/18 hover:bg-white/90",
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner",
                            inspectionColor,
                          )}
                        >
                          {inspectionEmoji}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-serif text-xl font-black text-amber-950">
                            {inspectionName}
                          </div>
                          <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                            {inspectionId}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "border",
                          inspection.warnings.length > 0
                            ? warningBadgeClass.warning
                            : "border-emerald-700/15 bg-emerald-100/85 text-emerald-950",
                        )}
                      >
                        {inspection.warnings.length > 0
                          ? `${inspection.warnings.length} warning${inspection.warnings.length > 1 ? "s" : ""}`
                          : "sem warning"}
                      </Badge>
                    </div>
                  </button>
                  );
                })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <div
            className={cn(
              "rounded-[32px] border border-amber-900/12 bg-gradient-to-br p-6 shadow-[0_24px_50px_rgba(0,0,0,0.14)]",
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
                  <div className="rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-4 py-4 text-sm text-emerald-950">
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
                          <div key={entry.syllable} className={inspectorCardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-950">{entry.syllable}</div>
                              <Badge className="border border-amber-900/12 bg-white/80 text-amber-950">
                                pressao {entry.pressure}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-950/75">
                              {entry.requiredAcrossTargets} usos agregados para {entry.availableCopies} copias no deck.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.affectedTargets.map((targetName) => (
                                <span key={`${entry.syllable}-${targetName}`} className={inspectorChipClass}>
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
                          <div key={entry.instanceKey} className={inspectorCardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-950">{entry.targetName}</div>
                              <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                                score {entry.pressureScore}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-950/75">
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

              <Panel title="Targets em Runtime" icon={<SearchCheck className="h-5 w-5" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  {deck.targets.map((target, index) => (
                    <div key={`${target.id}-${index}`} className={inspectorCardClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl leading-none">{target.emoji}</div>
                          <div>
                            <div className="font-serif text-xl font-black text-amber-950">{target.name}</div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
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
                          {target.rarity} · instância {index + 1}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {target.syllables.map((syllable, index) => (
                          <span key={`${target.id}-${syllable}-${index}`} className={inspectorChipClass}>
                            {syllable}
                          </span>
                        ))}
                      </div>
                      {target.description ? (
                        <p className="mt-3 text-sm leading-relaxed text-amber-950/75">{target.description}</p>
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

                <div className={cn("mt-4 text-sm", inspectorInsetClass)}>
                  <span className="font-black text-amber-950">Raridades:</span> {formatRarityBreakdown(metrics.rarityCounts)}
                </div>
              </Panel>

              <Panel title="Leituras do Catalogo Normalizado" icon={<BookOpenText className="h-5 w-5" />}>
                <div className="space-y-5">
                  <Subsection
                    title="Deck definition ativo"
                    subtitle="Leitura do deck model central, montado a partir da camada de catálogo antes da projeção runtime."
                  >
                    {selectedDeckDefinition ? (
                      <div className="grid grid-cols-2 gap-3">
                        <InfoTile label="Visual theme" value={selectedDeckDefinition.visualTheme} />
                        <InfoTile label="Cards canonicos" value={String(selectedCatalogCards.length)} />
                        <InfoTile label="Target definitions" value={String(selectedCatalogTargetDefinitions.length)} />
                        <InfoTile label="Target instances" value={String(selectedCatalogTargetInstances.length)} />
                        <InfoTile
                          label="Copias no card pool"
                          value={String(
                            Object.values(selectedDeckDefinition.cardPool).reduce((sum, count) => sum + count, 0),
                          )}
                        />
                      </div>
                    ) : (
                      <EmptyCallout text="Deck definition nao encontrado no catalogo normalizado." />
                    )}
                  </Subsection>

                  <Subsection
                    title="Cards usados por este deck"
                    subtitle="Mostra a relacao entre pool de cartas canonicas e os targets que consomem cada card."
                  >
                    {selectedCatalogCards.length === 0 ? (
                      <EmptyCallout text="Nenhum card canonico encontrado para este deck." />
                    ) : (
                      <div className="space-y-3">
                        {selectedCatalogCards.slice(0, 6).map((entry) => (
                          <div key={entry.card.id} className={inspectorCardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-serif text-xl font-black text-amber-950">{entry.card.syllable}</div>
                                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                                  {entry.card.id}
                                </div>
                              </div>
                              <Badge className="border border-amber-900/12 bg-white/80 text-amber-950">
                                x{entry.copiesInDeck} no deck
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.usedByTargets.map((target) => (
                                <span key={`${entry.card.id}-${target.id}`} className={inspectorChipClass}>
                                  {target.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>

                  <Subsection
                    title="Targets definidos no catálogo"
                    subtitle="Resolve o deck via deck model e targetIds da camada nova, sem depender apenas da projeção runtime."
                  >
                    {selectedCatalogTargetDefinitions.length === 0 ? (
                      <EmptyCallout text="Nenhum target normalizado encontrado para este deck." />
                    ) : (
                      <div className="space-y-3">
                            {selectedCatalogTargetDefinitions.slice(0, 4).map((target) => (
                              <div key={target.id} className={inspectorCardClass}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-950">{target.name}</div>
                              <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                                {target.cardIds.length} cards
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {target.cardIds.map((cardId, index) => {
                                const card = getCatalogCardById(CONTENT_CATALOG, cardId);
                                const label = card?.syllable ?? cardId;

                                return (
                                  <span key={`${target.id}-${cardId}-${index}`} className={inspectorChipClass}>
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>
                </div>
              </Panel>

              <Panel title="Comparacao entre Decks" icon={<ArrowRightLeft className="h-5 w-5" />}>
                {compareInspection ? (
                  <div className="space-y-4">
                    <label className="block">
                      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                        Comparar com
                      </div>
                      <select
                        value={activeCompareDeckId}
                        onChange={(event) => setCompareDeckId(event.target.value)}
                        className={inspectorInputClass}
                      >
                        {compareCandidates.map((inspection) => (
                          <option key={inspection.deck.id} value={inspection.deck.id}>
                            {inspection.deck.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className={cn("text-sm", inspectorInsetClass)}>
                      Comparando <span className="font-black text-amber-950">{deck.name}</span> com{" "}
                      <span className="font-black text-amber-950">{compareInspection.deck.name}</span>.
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
                          <div key={entry.id} className={inspectorCardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-950">{entry.label}</div>
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
                      <div key={syllable} className="rounded-2xl border border-amber-900/12 bg-[rgba(255,250,242,0.76)] px-3 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-black uppercase tracking-[0.18em] text-amber-950">{syllable}</span>
                          <span className="text-sm font-black text-amber-900/75">x{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-amber-900/8">
                          <div className={cn("h-full rounded-full bg-gradient-to-r", deck.color)} style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Relacoes do Catalogo" icon={<Sparkles className="h-5 w-5" />}>
                <div className="space-y-5">
                  <Subsection
                    title="Cards mais reutilizados no catálogo"
                    subtitle="Leitura transversal do catálogo novo, útil para tooling futuro e autoria mínima."
                  >
                    <div className="space-y-3">
                      {mostReusedCards.map((entry) => (
                        <div key={entry.card.id} className={inspectorCardClass}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="font-serif text-xl font-black text-amber-950">{entry.card.syllable}</div>
                            <Badge className="border border-emerald-700/15 bg-emerald-100/85 text-emerald-950">
                              {entry.deckCount} deck(s)
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-amber-950/75">
                            {entry.targetCount} target(s) e {entry.totalCopies} copias totais no catálogo.
                          </p>
                        </div>
                      ))}
                    </div>
                  </Subsection>

                  <Subsection
                    title="Alvos compartilhados entre decks"
                    subtitle="Hoje ajuda a detectar acoplamentos de autoria e futura reutilização de target definitions."
                  >
                    {selectedSharedTargets.length === 0 ? (
                      <EmptyCallout text="Nenhum target compartilhado por id com outros decks no catálogo atual." />
                    ) : (
                      <div className="space-y-3">
                        {selectedSharedTargets.map((entry) => (
                          <div key={entry.target.id} className={inspectorCardClass}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-serif text-xl font-black text-amber-950">{entry.target.name}</div>
                              <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                                {entry.deckIds.length} deck(s)
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-950/75">
                              Compartilhado por: {entry.deckIds.join(", ")}.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Subsection>
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
  <section className="paper-panel rounded-[28px] border-2 border-[#8d6e63]/30 p-5 shadow-[0_18px_34px_rgba(0,0,0,0.12)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-900/12 bg-amber-100/55 text-amber-950">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-black tracking-tight text-amber-950">{title}</h3>
    </div>
    {children}
  </section>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.72)] px-4 py-3 text-amber-950 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
    <div className="flex items-center gap-2 text-amber-900/65">{icon}</div>
    <div className="mt-3 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">{label}</div>
    <div className="mt-1 font-serif text-3xl font-black text-amber-950">{value}</div>
  </div>
);

const InfoTile: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.88)] px-4 py-4">
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">{label}</div>
    <div className="mt-2 font-serif text-2xl font-black text-amber-950">{value}</div>
  </div>
);

const Subsection: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div>
    <div className="mb-3">
      <div className="font-serif text-xl font-black text-amber-950">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-amber-950/65">{subtitle}</p>
    </div>
    {children}
  </div>
);

const ComparisonCell: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,250,242,0.76)] px-3 py-3">
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">{label}</div>
    <div className="mt-2 font-serif text-xl font-black text-amber-950">{value}</div>
  </div>
);

const EmptyCallout: React.FC<{
  text: string;
}> = ({ text }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,250,242,0.76)] px-4 py-4 text-sm text-amber-950/75">
    {text}
  </div>
);
