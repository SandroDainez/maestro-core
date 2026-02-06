// app/maestro/runs/page.tsx

import Link from "next/link";

type Run = {
  id: string;
  status: string;
  createdAt: string;
  project?: {
    name: string;
  };
};

async function getRuns(): Promise<Run[]> {
  const res = await fetch("http://localhost:3000/api/maestro/runs", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao buscar runs");
  }

  return res.json();
}

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <main className="p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">🚀 Maestro Runs</h1>

        <Link
          href="/"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Voltar
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="p-3">Run ID</th>
              <th className="p-3">Projeto</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado em</th>
            </tr>
          </thead>

          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3 font-mono text-xs">{run.id}</td>

                <td className="p-3">
                  {run.project?.name ?? "—"}
                </td>

                <td className="p-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      run.status === "success"
                        ? "bg-green-100 text-green-700"
                        : run.status === "running"
                        ? "bg-blue-100 text-blue-700"
                        : run.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {run.status}
                  </span>
                </td>

                <td className="p-3">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

