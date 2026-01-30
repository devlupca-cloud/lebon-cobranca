'use client'

import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export function DashboardHeader() {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-[#1E3A8A]/30 bg-[#1E3A8A] px-6 shadow-sm">
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        Sair
      </button>
    </header>
  )
}
