# Arquitetura — :ClínicaCom

## Problema
: criar SaaS para clínica com auth e dashboard

## Domínio
medical

## Usuários
- Administrador
- Profissional de Saúde
- Recepção
- Financeiro
- Paciente (opcional)

## Funcionalidades principais
- Cadastro e gestão de usuários com papéis (RBAC)
- Agendamentos / escalas
- Dashboard operacional
- Auditoria (logs) e rastreabilidade
- Configurações por organização (multi-tenant)

## Requisitos não-funcionais
- Segurança (LGPD quando aplicável)
- Logs e auditoria
- Performance e escalabilidade
- Backups e migrações
- Testes básicos e lint

## Stack
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Next.js Route Handlers (API) ou Fastify (futuro)
- Database: Postgres (ex: Supabase)
- Auth: Supabase Auth (ou NextAuth futuramente)
- Hosting: Vercel (web) + Supabase (db/auth)

## Módulos
- **Auth & RBAC**: Autenticação + papéis/permissões
- **Core Domain**: Regras e entidades principais do produto
- **Dashboard**: Visão geral e métricas operacionais
- **Settings**: Configurações por organização/usuário
- **Audit**: Registro de eventos e ações

## Modelos de dados
- **User**: id, email, role, tenantId, createdAt
- **Tenant**: id, name, plan, createdAt
- **ScheduleItem**: id, tenantId, type, startsAt, endsAt, assignedTo
- **AuditEvent**: id, tenantId, userId, type, data, createdAt

## Endpoints (rascunho)
- POST /api/auth/login — Login
- POST /api/auth/logout — Logout
- GET /api/me — Dados do usuário logado
- GET /api/tenant — Dados do tenant
- POST /api/audit — Registrar evento de auditoria

## Riscos / Alertas
- Definir claramente escopo MVP vs completo
- Evitar acoplamento entre domínio e infraestrutura
- Garantir políticas de acesso (RBAC) consistentes
- LGPD: minimizar dados sensíveis e registrar consentimentos quando aplicável
