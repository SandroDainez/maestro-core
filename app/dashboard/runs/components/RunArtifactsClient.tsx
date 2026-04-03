"use client";

import { useState } from "react";

type FileEntry = {
  name: string;
  relativePath: string;
  size: number;
  type: string;
};

const humanizeBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function RunArtifactsClient({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function toggle() {
    if (!open && files === null) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agent/outputs/${runId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Não foi possível carregar os artefatos");
        }
        const data = await res.json();
        setFiles(data.files ?? []);
      } catch (err: any) {
        setError(err?.message ?? "Erro ao buscar artefatos");
      } finally {
        setLoading(false);
      }
    }
    setOpen((prev) => !prev);
  }

  async function handlePreview(file: FileEntry) {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContent(null);

    try {
      const res = await fetch(
        `/api/agent/outputs/${runId}?file=${encodeURIComponent(file.relativePath)}`
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Não foi possível carregar o artefato");
      }
      const text = await res.text();
      setPreviewContent(text);
    } catch (err: any) {
      setPreviewError(err?.message ?? "Erro ao carregar o artefato");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
      >
        {open ? "Ocultar artefatos" : "Ver artefatos"}
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-slate-300">Carregando artefatos...</p>}
          {error && <p className="text-sm text-rose-200">{error}</p>}
          {!loading && !error && files && (
            <div className="space-y-2">
              {files.length === 0 && (
                <p className="text-sm text-slate-400">Nenhum artefato foi encontrado.</p>
              )}
              {files.length > 0 && (
                <ul className="space-y-2 text-sm text-slate-200">
                  {files.map((file) => (
                    <li
                      key={file.relativePath}
                      className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                            {file.name}
                          </p>
                          <p className="text-[0.7rem] text-slate-400">{file.type.toUpperCase()}</p>
                        </div>
                        <span className="text-[0.7rem] text-slate-400">{humanizeBytes(file.size)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/api/agent/outputs/${runId}?file=${encodeURIComponent(file.relativePath)}`}
                          className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-300"
                        >
                          Baixar
                        </a>
                        <button
                          type="button"
                          onClick={() => handlePreview(file)}
                          className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sky-300"
                        >
                          Visualizar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {previewFile && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>Visualizando: {previewFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="text-slate-500"
                >
                  Fechar
                </button>
              </div>
              {previewLoading && <p className="mt-2 text-slate-300">Renderizando preview...</p>}
              {previewError && <p className="mt-2 text-rose-200">{previewError}</p>}
              {!previewLoading && previewContent && (
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-[0.75rem] leading-relaxed text-slate-200">
                  {previewContent}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
