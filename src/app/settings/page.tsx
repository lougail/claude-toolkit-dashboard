import { readDashboardConfig } from '@/lib/config'
import { SettingsForm } from '@/components/dashboard/settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const config = await readDashboardConfig()

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure project directories and scanning behavior
        </p>
      </header>

      <SettingsForm initialConfig={config} />
    </>
  )
}
