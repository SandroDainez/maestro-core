import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [tenantCount, userCount, projectCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.project.count(),
  ]);

  const cards = [
    { title: "Ambiente", copy: `NODE_ENV: ${process.env.NODE_ENV ?? "development"}` },
    { title: "Auth", copy: process.env.NEXTAUTH_SECRET ? "NextAuth configurado" : "NEXTAUTH_SECRET ausente" },
    { title: "Banco", copy: process.env.DATABASE_URL ? "DATABASE_URL configurada" : "DATABASE_URL ausente" },
    { title: "Admin", copy: "Acesso administrativo controlado por role do usuário." },
    { title: "Tenants", copy: `${tenantCount} tenants registrados` },
    { title: "Usuários", copy: `${userCount} usuários registrados` },
    { title: "Projetos", copy: `${projectCount} projetos registrados` },
  ];

  return (
    <div className="space-y-8 text-white">
      <section className="glass-card space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-8 shadow-[0_35px_70px_rgba(2,6,23,0.8)]">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
          Configurações globais
        </p>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-300">
          Estado real da configuração da plataforma no ambiente atual.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.title}
            className="glass-card space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.5)]"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="text-sm text-slate-300 break-words">{card.copy}</p>
            <button className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              Editar
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
