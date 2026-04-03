# ADR 002 - Auth and RBAC

## Status
Accepted

## Context

O projeto usava credenciais hardcoded e checks de autorizacao por email fixo.

## Decision

- autenticacao por credenciais deve consultar a tabela `User`
- senha deve ser validada por `bcrypt`
- autorizacao administrativa deve usar role (`admin` ou `owner`)
- email fixo fica apenas como fallback de emergencia durante a transicao

## Consequences

- o seed precisa manter ao menos um usuario administrativo ativo
- dashboard e rotas administrativas passam a refletir session e role reais
