# ADR 001 - Core Orchestration

## Status
Accepted

## Context

O projeto tinha duas trilhas paralelas de orquestracao:

- `src/core/*`
- `src/lib/scan|analysis|runner`

Isso gerava duplicidade de regra de negocio e endpoints inconsistentes.

## Decision

`src/core/*` passa a ser o backbone oficial da orquestracao. APIs e CLI devem atuar como adapters.

## Consequences

- novos fluxos entram pelo `MaestroEngine`
- `src/lib/*` permanece apenas como camada auxiliar ou de compatibilidade
- a evolucao para linguagem humana passa pelo orquestrador central
