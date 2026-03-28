\# AGENTS.md



\## Projeto

Este repositório é um card game digital/mobile em desenvolvimento, com foco em battle landscape, animações, UX de jogo e tooling interno de layout/animação.



\## Objetivo atual

Evoluir a base com segurança, preservando o loop jogável, a identidade visual e a confiabilidade do runtime.



\## Regras de trabalho

\- Não fazer refactor amplo sem necessidade.

\- Não alterar regras do jogo sem instrução explícita.

\- Não mexer em múltiplas frentes grandes ao mesmo tempo.

\- Trabalhar em objetivos pequenos, revisáveis e verificáveis.

\- Sempre começar tarefas complexas propondo um plano antes de editar código.

\- Sempre citar os arquivos principais envolvidos.

\- Sempre validar o comportamento alterado.

\- Sempre resumir riscos remanescentes ao final.



\## Restrições importantes

\- No curto prazo, a battle deve ser tratada como landscape-only.

\- Melhorias mobile devem respeitar a estratégia atual de stage, salvo instrução explícita em contrário.

\- Preservar a identidade visual do projeto.

\- Preservar o fluxo audiovisual já existente sempre que possível.

\- Não quebrar editor/preset, watcher/dump, geometria de stage ou sincronização de room sem extrema cautela.



\## Definição de pronto

Uma tarefa só está concluída quando:

\- o objetivo solicitado foi implementado;

\- os arquivos alterados foram listados;

\- a validação executada foi descrita;

\- os riscos remanescentes foram apontados;

\- o diff está pequeno e revisável.



\## Forma de resposta esperada

Sempre responder nesta ordem:

1\. entendimento do objetivo

2\. plano curto

3\. arquivos que pretende inspecionar/alterar

4\. implementação

5\. validação

6\. resumo final

7\. riscos remanescentes

## Invariante crítico de autoria/layout

Mover objetos no editor deve refletir no preview e no runtime live na mesma posição efetiva no stage.

Ajustar âncoras, endpoints e referências de animação no editor deve refletir no runtime live com a mesma geometria efetiva.

Não são aceitas soluções que mantenham apenas “paridade visual aproximada” e percam paridade geométrica.

Qualquer mudança em shell, layout compacto, passthrough, wrappers ou fluxo CSS deve preservar essa garantia.

