# PROJECT_CONTEXT

## Visao Atual

Maestro Core e uma plataforma de orquestracao de automacao para projetos de software, com foco em:

- leitura estrutural do repositorio
- planejamento de fases
- execucao automatizada de jobs
- persistencia de runs e fases
- exposicao via API, dashboard e CLI
- evolucao futura para multi-agente, governanca e humano-no-loop

## Arquitetura Escolhida

A arquitetura oficial do projeto passa a ser:

1. `src/core`
   Nucleo de dominio e orquestracao.
2. `app/api`
   Adapters HTTP para expor o nucleo.
3. `src/cli`
   Adapter CLI para operadores humanos.
4. `src/db`
   Persistencia e acesso a dados.
5. `app/`
   Interface web e dashboard operacional.

`src/lib/*` continua existindo como camada de compatibilidade e utilitarios, mas nao deve concentrar regras de negocio novas.

Os fluxos legados de scan, plan e execute que viviam em `src/lib/scan`, `src/lib/analysis`, `src/lib/runner` e `src/lib/engine` foram aposentados em favor do backbone central em `src/core`.

## Fluxo Principal

1. Usuario envia um objetivo humano ou comando explicito.
2. O sistema interpreta a intencao: scan, plan, report ou execute.
3. `MaestroEngine` faz scan do projeto e calcula riscos.
4. O planner gera jobs e tasks.
5. Se permitido, o sistema executa os jobs e persiste o run no banco.
6. API, CLI e dashboard consomem os dados persistidos e os artefatos gerados.

## Estado Atual de Maturidade

O projeto tem base funcional, mas ainda esta em fase de consolidacao arquitetural. Os principais gaps atuais sao:

- duplicidade entre `src/core` e fluxos antigos em `src/lib`
- auth e RBAC ainda simplificados
- algumas fases sao placeholders
- ausencia de testes automatizados de integracao
- memoria longa, governanca e multi-agente ainda nao estao completos

## Diretriz de Evolucao

Toda funcionalidade nova deve:

- entrar primeiro pelo nucleo `src/core`
- ser exposta por adapters HTTP e CLI
- aceitar comandos em linguagem humana quando fizer sentido
- registrar execucao e auditoria
- evitar duplicar regras de negocio em rotas ou componentes

## Governanca e Enterprise

O projeto agora possui fundacoes reais para:

- memoria persistida local do Maestro
- auditoria de eventos de governanca
- bloqueio humano para execucao com risco alto
- endpoint de readiness da plataforma para operacao SaaS

Billing, marketplace, SDK publico e automacoes enterprise avancadas continuam como backlog de produto, nao como capacidade concluida.
