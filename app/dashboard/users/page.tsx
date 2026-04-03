"use client";

import { useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ name: string; email: string; role: string; status: UserRow["status"] }>({
    name: "",
    email: "",
    role: "",
    status: "active",
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const activeUsers = useMemo(() => users.filter((user) => user.status === "active"), [users]);

  function startEditing(user: UserRow) {
    setEditingId(user.id);
    setFormState({ name: user.name, email: user.email, role: user.role, status: user.status });
    setFormMessage(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const payload = {
      name: formState.name,
      email: formState.email,
      role: formState.role,
      status: formState.status,
    };

    const res = await fetch(`/api/users/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      setFormMessage(error.error || "Não foi possível salvar as alterações.");
      return;
    }

    const responseData = await res.json().catch(() => null);
    if (!responseData?.user) {
      setFormMessage("Não foi possível ler a resposta do servidor.");
      return;
    }

    setUsers((previous) =>
      previous.map((user) => (user.id === editingId ? { ...user, ...responseData.user } : user))
    );
    setEditingId(null);
    setFormMessage("Usuário atualizado com sucesso.");
  }

  const [userToRemove, setUserToRemove] = useState<UserRow | null>(null);
  const [removing, setRemoving] = useState(false);

  async function confirmRemove() {
    if (!userToRemove) return;
    setRemoving(true);
    try {
      const trimmedReason = removeReason.trim();
      if (!trimmedReason) {
        setFormMessage("Informe o motivo da remoção.");
        setRemoving(false);
        return;
      }

      const res = await fetch(`/api/users/${userToRemove.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((user) => user.id !== userToRemove.id));
        setFormMessage(`Usuário ${userToRemove.name} removido.`);
      } else {
        const err = await res.json().catch(() => ({}));
        setFormMessage(err.error || "Falha ao remover o usuário.");
      }
    } finally {
      setRemoving(false);
      setUserToRemove(null);
      setRemoveReason("");
    }
  }

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(
          (data.users ?? []).map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ?? "Member",
            status: user.status ?? "active",
          }))
        );
      });
  }, []);

  return (
    <div className="space-y-8">
      <section className="glass-card space-y-4 p-8 bg-gradient-to-br from-slate-900/80 to-slate-950/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Painel de identidade</p>
            <h1 className="text-2xl font-semibold text-white">Usuários</h1>
            <p className="text-sm text-slate-300">Gerencie acesso, perfis e monitoramento dos times.</p>
          </div>
          <button className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-white/60">
            + Novo usuário
          </button>
        </div>
        <p className="text-[0.7rem] uppercase tracking-[0.5em] text-emerald-400">Ativos: {activeUsers.length}</p>
      </section>

      <section className="space-y-6">
        <div className="glass-card border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.5)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-[0.4em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Perfil</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
          {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-white max-w-[180px] break-words">{user.name}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[220px] break-words">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[0.65rem] font-semibold ${
                          user.status === "active" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-200"
                        }`}
                      >
                        {user.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
                          onClick={() => startEditing(user)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-rose-100 transition hover:bg-rose-400/20"
                          onClick={() => setUserToRemove(user)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {editingId && (
          <div className="glass-card space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-sm text-white shadow-[0_25px_50px_rgba(2,6,23,0.7)]">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Editando usuário</p>
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Nome
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Email
                  <input
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Perfil
                  <input
                    value={formState.role}
                    onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Status
                  <select
                    value={formState.status}
                    onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value as UserRow["status"] }))}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>
              </div>
      <div className="flex gap-3">
        <button
          type="submit"
                  className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-500/50 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
                  onClick={() => setEditingId(null)}
            >
              Cancelar
            </button>
          </div>
          {formMessage && (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
              {formMessage}
            </p>
          )}
        </form>
      </div>
    )}
      </section>
      {userToRemove && (
        <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-white/20 bg-slate-950/95 p-6">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Confirmação de exclusão</p>
            <h3 className="text-lg font-semibold text-white">Deseja remover {userToRemove.name}?</h3>
            <p className="text-sm text-slate-300">
              Essa ação remove o acesso e os dados do usuário. Somente confirmações do administrador são aceitas.
            </p>
            <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Motivo da remoção
              <textarea
                value={removeReason}
                onChange={(event) => setRemoveReason(event.target.value)}
                className="mt-2 h-20 w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-rose-400"
                placeholder="Explique rapidamente por que o usuário precisa ser removido"
              />
            </label>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-rose-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-rose-100"
                onClick={confirmRemove}
                disabled={removing || !removeReason.trim()}
              >
                {removing ? "Removendo..." : "Confirmar remoção"}
              </button>
              <button
                className="flex-1 rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white"
                onClick={() => {
                  setUserToRemove(null);
                  setRemoveReason("");
                }}
                disabled={removing}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
