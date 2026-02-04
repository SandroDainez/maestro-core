import { ArchitectureSpec } from "../types";

export class AppArchitectAgent {
  buildSpec(objective: string): ArchitectureSpec {
    const lower = objective.toLowerCase();

    const isMedical =
      lower.includes("med") ||
      lower.includes("clín") ||
      lower.includes("clin") ||
      lower.includes("hospital") ||
      lower.includes("paciente") ||
      lower.includes("prontu") ||
      lower.includes("escala");

    const productName = this.suggestName(objective);

    const users = isMedical
      ? ["Administrador", "Profissional de Saúde", "Recepção", "Financeiro", "Paciente (opcional)"]
      : ["Administrador", "Usuário", "Operações", "Financeiro"];

    const coreFeatures = isMedical
      ? [
          "Cadastro e gestão de usuários com papéis (RBAC)",
          "Agendamentos / escalas",
          "Dashboard operacional",
          "Auditoria (logs) e rastreabilidade",
          "Configurações por organização (multi-tenant)"
        ]
      : [
          "Cadastro e gestão de usuários com papéis (RBAC)",
          "Dashboard",
          "CRUD principal do produto",
          "Multi-tenant (se aplicável)",
          "Auditoria (logs)"
        ];

    const nonFunctional = [
      "Segurança (LGPD quando aplicável)",
      "Logs e auditoria",
      "Performance e escalabilidade",
      "Backups e migrações",
      "Testes básicos e lint"
    ];

    const modules = [
      { name: "Auth & RBAC", description: "Autenticação + papéis/permissões" },
      { name: "Core Domain", description: "Regras e entidades principais do produto" },
      { name: "Dashboard", description: "Visão geral e métricas operacionais" },
      { name: "Settings", description: "Configurações por organização/usuário" },
      { name: "Audit", description: "Registro de eventos e ações" }
    ];

    const dataModels = isMedical
      ? [
          { name: "User", fields: ["id", "email", "role", "tenantId", "createdAt"] },
          { name: "Tenant", fields: ["id", "name", "plan", "createdAt"] },
          { name: "ScheduleItem", fields: ["id", "tenantId", "type", "startsAt", "endsAt", "assignedTo"] },
          { name: "AuditEvent", fields: ["id", "tenantId", "userId", "type", "data", "createdAt"] }
        ]
      : [
          { name: "User", fields: ["id", "email", "role", "tenantId", "createdAt"] },
          { name: "Tenant", fields: ["id", "name", "plan", "createdAt"] },
          { name: "Item", fields: ["id", "tenantId", "name", "status", "createdAt"] },
          { name: "AuditEvent", fields: ["id", "tenantId", "userId", "type", "data", "createdAt"] }
        ];

    const apiEndpoints = [
      { method: "POST", path: "/api/auth/login", description: "Login" },
      { method: "POST", path: "/api/auth/logout", description: "Logout" },
      { method: "GET", path: "/api/me", description: "Dados do usuário logado" },
      { method: "GET", path: "/api/tenant", description: "Dados do tenant" },
      { method: "POST", path: "/api/audit", description: "Registrar evento de auditoria" }
    ];

    const risks = [
      "Definir claramente escopo MVP vs completo",
      "Evitar acoplamento entre domínio e infraestrutura",
      "Garantir políticas de acesso (RBAC) consistentes",
      "LGPD: minimizar dados sensíveis e registrar consentimentos quando aplicável"
    ];

    return {
      productName,
      domain: isMedical ? "medical" : "generic",
      problem: objective,
      users,
      coreFeatures,
      nonFunctional,
      stack: {
        frontend: "Next.js + TypeScript + Tailwind",
        backend: "Next.js Route Handlers (API) ou Fastify (futuro)",
        database: "Postgres (ex: Supabase)",
        auth: "Supabase Auth (ou NextAuth futuramente)",
        hosting: "Vercel (web) + Supabase (db/auth)"
      },
      modules,
      dataModels,
      apiEndpoints,
      risks
    };
  }

  private suggestName(objective: string): string {
    const cleaned = objective
      .replace(/criar|app|saas|aplicativo|um|uma|de|para/gi, "")
      .trim()
      .slice(0, 40);

    if (!cleaned) return "MaestroApp";
    const words = cleaned.split(/\s+/).slice(0, 3);
    const base = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    return base || "MaestroApp";
  }
}

