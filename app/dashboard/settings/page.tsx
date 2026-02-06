export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Configurações
      </h1>

      <p className="text-sm text-gray-500">
        Preferências do sistema, integrações e parâmetros globais.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-medium mb-2">
            Geral
          </h2>

          <p className="text-sm text-gray-500">
            Nome do ambiente, timezone, idioma.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-medium mb-2">
            Segurança
          </h2>

          <p className="text-sm text-gray-500">
            Autenticação, tokens, acessos.
          </p>
        </div>
      </div>
    </div>
  );
}

