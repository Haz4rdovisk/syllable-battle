# GEMINI.md — Syllable Battle

## Instrucao principal

**Leia `AGENTS.md` antes de qualquer tarefa.** Ele contem todo o contexto do projeto, regras de trabalho, constraints e referencias.

**Depois de ler `AGENTS.md`, leia `docs/handoffs/CURRENT.md`.** Esse arquivo contem o estado operacional mais recente do projeto.

## Safety gates

1. **Paridade geometrica**: editor === preview === runtime (invariante inviolavel)
2. **Regras do jogo** (`gameLogic.ts`): nao alterar sem instrucao explicita
3. **Design language**: preservar identidade visual. Ver `.agents/rules/design-language.md`
4. **Pipeline de conteudo**: nao pular validacao de `loadContentCatalog()`
5. **Testes**: `npm test` deve passar antes e depois de qualquer mudanca

## Fluxo de trabalho

1. Ler `AGENTS.md` para regras e contexto do projeto
2. Checar docs relevantes em `docs/`
3. Rodar `npm test` — confirmar testes passando
4. Ler os arquivos que pretende alterar
5. Propor plano se a tarefa for complexa
6. Implementar com diff minimo
7. Rodar `npm test` novamente
8. Resumir mudancas + riscos
