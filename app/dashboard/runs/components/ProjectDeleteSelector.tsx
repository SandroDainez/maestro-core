"use client";

import { useEffect, useState } from "react";
import DeleteProjectButton from "./DeleteProjectButton";

type ProjectBrief = {
  slug: string;
  name: string;
};

export default function ProjectDeleteSelector() {
  const [projects, setProjects] = useState<ProjectBrief[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects ?? []);
      })
      .catch((err) => setError(err.message ?? "Erro"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Projeto para deletar</p>
      {loading && <p className="text-sm text-slate-300">Carregando...</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!loading && !error && (
        <div className="space-y-3">
          <select
            className="w-full rounded-2xl border border-white/20 bg-slate-900/50 px-4 py-2 text-sm text-white"
            value={selected ?? ""}
            onChange={(event) => setSelected(event.target.value || null)}
          >
            <option value="">Selecione um projeto</option>
            {projects.map((project) => (
              <option key={project.slug} value={project.slug}>
                {project.name}
              </option>
            ))}
          </select>
          {selected && <DeleteProjectButton projectSlug={selected} />}
        </div>
      )}
    </div>
  );
}
