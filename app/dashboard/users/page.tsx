import Link from "next/link";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

// MOCK inicial — depois ligamos na API
const users: User[] = [
  {
    id: "1",
    name: "Administrador",
    email: "admin@maestro.com",
    role: "Admin",
    status: "active",
  },
  {
    id: "2",
    name: "João Silva",
    email: "joao@maestro.com",
    role: "Operator",
    status: "inactive",
  },
];

export default function UsersPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-gray-500">
            Gerencie usuários e permissões do sistema
          </p>
        </div>

        <button className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          + Novo usuário
        </button>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Nome</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Perfil</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium">
                    {user.name}
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {user.email}
                  </td>

                  <td className="px-5 py-4">{user.role}</td>

                  <td className="px-5 py-4">
                    {user.status === "active" ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        Inativo
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-100">
                        Editar
                      </button>

                      <button className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100">
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
    </div>
  );
}

