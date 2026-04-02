import { Scale } from 'lucide-react'
import { discoverProjects } from '@/lib/data/scanner'
import { DecisionFilter } from '@/components/dashboard/decision-filter'
import { EmptyState } from '@/components/dashboard/empty-state'

export const dynamic = 'force-dynamic'

export default async function DecisionsPage() {
  const projects = await discoverProjects()

  const allEntries = projects.flatMap((project) =>
    project.vaultEntries.map((entry) => ({
      entry,
      projectName: project.name,
    }))
  )

  // Sort by date, most recent first
  allEntries.sort((a, b) => b.entry.date.localeCompare(a.entry.date))

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">
          Decisions & Vault
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Decisions, ideas, insights and research from all projects
        </p>
      </header>

      {allEntries.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Vault is empty"
          description="Vault entries appear in vault/ directories within your projects. Decisions, ideas, and insights are captured automatically during Claude Code sessions."
          action="/kickoff to start capturing"
        />
      ) : (
        <DecisionFilter entries={allEntries} />
      )}
    </>
  )
}
