export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Usuários
      </h1>

      <p className="text-sm text-gray-500">
        Gerencie usuários, permissões e acessos ao sistema.
      </p>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-gray-400 text-sm">
          Nenhum usuário cadastrado ainda.
        </p>
      </div>
    </div>
  );
}

