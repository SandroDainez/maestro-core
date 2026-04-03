import { AuditLogger } from "@/src/core/governance/AuditLogger";
import { MemoryManager } from "@/src/core/memory/MemoryManager";
import { PlatformReadinessService } from "@/src/core/platform/PlatformReadinessService";

export const dynamic = "force-dynamic";

const readinessService = new PlatformReadinessService();
const memory = new MemoryManager();
const audit = new AuditLogger();

function toLabel(value: boolean) {
  return value ? "Configurado" : "Ausente";
}

export default async function GovernancePage() {
  const [status, events] = await Promise.all([
    readinessService.getStatus(),
    Promise.resolve(audit.list(20)),
  ]);

  const memorySnapshot = {
    preferences: memory.getAllPreferences(),
    decisions: memory.getDecisions().slice(-5).reverse(),
    recentProjects: memory.getRecentProjects(),
  };

  const approvalEvents = events.filter((event) => event.type === "approval_required").length;
  const executionBlockedEvents = events.filter((event) => event.type === "execution_blocked").length;
  const completedExecutions = events.filter((event) => event.type === "execution_completed").length;

  const featureCards = [
    { label: "Auth", value: toLabel(status.authConfigured) },
    { label: "Database", value: toLabel(status.databaseConfigured) },
    { label: "Governança", value: status.features.governanceAudit ? "Ativa" : "Inativa" },
    { label: "Approval Gate", value: status.features.humanApprovalGate ? "Ativo" : "Inativo" },
    { label: "Aprovações", value: String(approvalEvents) },
    { label: "Bloqueios", value: String(executionBlockedEvents) },
    { label: "Execuções", value: String(completedExecutions) },
  ];

  return (
    <div className="space-y-8 text-white">
      <section className="glass-card space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-8 shadow-[0_35px_70px_rgba(2,6,23,0.8)]">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
          Governança
        </p>
        <h1 className="text-3xl font-semibold">Operação, memória e auditoria</h1>
        <p className="max-w-3xl text-sm text-slate-300">
          Este painel expõe o estado operacional da plataforma, a memória persistida do Maestro
          e os eventos recentes de governança registrados no ambiente.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {featureCards.map((card) => (
          <article
            key={card.label}
            className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.5)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-card space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Readiness</p>
            <h2 className="text-2xl font-semibold text-white">Status da plataforma</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ambiente</p>
              <p className="mt-2 text-base text-white">{status.environment}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
              <p className="mt-2 text-base text-white">{status.status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tenants</p>
              <p className="mt-2 text-base text-white">{status.tenants}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Runs</p>
              <p className="mt-2 text-base text-white">{status.runs}</p>
            </div>
          </div>
        </article>

        <article className="glass-card space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Memória</p>
            <h2 className="text-2xl font-semibold text-white">Snapshot atual</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Preferências</p>
              <pre className="mt-2 whitespace-pre-wrap text-[0.75rem] text-slate-200">
                {JSON.stringify(memorySnapshot.preferences, null, 2)}
              </pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Projetos recentes</p>
              <p className="mt-2 text-slate-200">
                {memorySnapshot.recentProjects.length
                  ? memorySnapshot.recentProjects.join(", ")
                  : "Nenhum projeto registrado ainda."}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Decisões recentes</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {memorySnapshot.decisions.length ? (
              memorySnapshot.decisions.map((decision) => (
                <div key={decision} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  {decision}
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-slate-400">
                Nenhuma decisão persistida ainda.
              </p>
            )}
          </div>
        </article>

        <article className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Auditoria</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {events.length ? (
              events.map((event) => (
                <div key={`${event.timestamp}-${event.type}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.65rem] uppercase tracking-[0.4em] text-cyan-300">
                      {event.type}
                    </span>
                    <span className="text-[0.7rem] text-slate-500">{event.timestamp}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {event.projectPath ?? "escopo global"}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap text-[0.72rem] text-slate-200">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-slate-400">
                Nenhum evento auditável registrado ainda.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
