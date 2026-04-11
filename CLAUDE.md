<!-- ghost:header -->
## Ghost — AI Session Memory

**ALWAYS search Ghost before reading code or grepping.** When asked about a feature, bug, scenario,
or component — your FIRST action must be a Ghost search. Past sessions contain architecture decisions,
dead ends, failed approaches, and reasoning that code cannot reveal. Do not skip this step.

Use the `ghost-sessions` MCP tool with `deep_search` (not `search`). Fallback CLI: `ghost search <query>`
<!-- ghost:header -->

---

# CLAUDE.md — Syllable Battle

## Instrucao principal

**Leia `AGENTS.md` no inicio de cada conversa.** Ele contem todo o contexto do projeto, regras de trabalho, constraints e referencias.

## Safety gates

1. **Paridade geometrica**: editor === preview === runtime (invariante inviolavel)
2. **Regras do jogo** (`gameLogic.ts`): nao alterar sem instrucao explicita
3. **Design language**: preservar identidade visual. Ver `.agents/rules/design-language.md`
4. **Pipeline de conteudo**: nao pular validacao de `loadContentCatalog()`
5. **Testes**: `npm test` deve passar antes e depois de qualquer mudanca

## Fluxo de trabalho

1. Buscar no Ghost por contexto relevante
2. Ler `AGENTS.md` para regras e contexto do projeto
3. Checar docs relevantes em `docs/`
4. Rodar `npm test` — confirmar testes passando
5. Ler os arquivos que pretende alterar
6. Propor plano se a tarefa for complexa
7. Implementar com diff minimo
8. Rodar `npm test` novamente
9. Resumir mudancas + riscos

## Nota sobre UI

Para trabalho visual, ler `.agents/rules/design-language.md` antes de editar componentes.
Skills do projeto em `.claude/skills/`.
