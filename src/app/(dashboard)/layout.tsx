import { DashboardHeader } from '@/components/dashboard-header'
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f4f8]">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        <DashboardHeader />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
