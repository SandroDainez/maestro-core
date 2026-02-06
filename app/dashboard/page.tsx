export default function DashboardHome() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Usuários</h3>
        <p className="text-2xl mt-2">128</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Receita</h3>
        <p className="text-2xl mt-2">R$ 4.230</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Projetos</h3>
        <p className="text-2xl mt-2">42</p>
      </div>
    </div>
  );
}