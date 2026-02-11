import { DashboardHeader } from '@/components/dashboard-header'
import { HeaderProvider } from '@/contexts/header-context'
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f4f8]">
      <Sidebar />
      <HeaderProvider>
        <div className="flex min-h-0 flex-1 flex-col min-w-0">
          <DashboardHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
        </div>
      </HeaderProvider>
    </div>
  )
}
