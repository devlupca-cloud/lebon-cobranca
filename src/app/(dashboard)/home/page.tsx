import Link from 'next/link'

const KPIS = [
  {
    title: 'Total de Clientes',
    value: '1.234',
    change: '+12% em relação ao mês anterior',
    icon: (
      <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.2-.786-3.298M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: 'Contratos Ativos',
    value: '856',
    change: '+8% em relação ao mês anterior',
    icon: (
      <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Valor Total',
    value: 'R$ 2,4M',
    change: '+15% em relação ao mês anterior',
    icon: (
      <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Novos Este Mês',
    value: '47',
    change: '+23% em relação ao mês anterior',
    icon: (
      <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 10.5a10.5 10.5 0 1011 0H3z" />
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <main className="min-h-full bg-[#f1f4f8]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600">
            Bem-vindo ao sistema de gestão da Lebon Cobranças
          </p>
        </header>

        {/* KPI Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div
              key={kpi.title}
              className="rounded-[8px] border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-slate-500">{kpi.title}</span>
                {kpi.icon}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{kpi.value}</p>
              <p className="mt-1 text-xs font-medium text-emerald-600">{kpi.change}</p>
            </div>
          ))}
        </section>

        {/* Ações rápidas */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Clientes */}
          <div className="rounded-[8px] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.2-.786-3.298M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Clientes</h2>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Adicione um novo cliente (Pessoa Física ou Jurídica) ao sistema
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/clientes"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1e40af]"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.2-.786-3.298M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Clientes
              </Link>
              <Link
                href="/cadastrar-cliente"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1e40af]"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                + Novo Cliente
              </Link>
              <Link
                href="/extrato-fianceiro"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1e40af]"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                Extrato Financeiro
              </Link>
            </div>
          </div>

          {/* Contratos */}
          <div className="rounded-[8px] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Contratos</h2>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Crie um novo contrato de confissão de dívida
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/contratos"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-teal-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-500"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Contratos
              </Link>
              <Link
                href="/novo-contrato"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-teal-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-500"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                + Novo Contrato
              </Link>
              <Link
                href="/inadimplentes01"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-500"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                X Inadimplêntes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
