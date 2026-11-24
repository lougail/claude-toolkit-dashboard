import { AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { RefreshIndicator } from '@/components/dashboard/refresh-indicator'
import { discoverProjects } from '@/lib/data/scanner'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const projects = await discoverProjects()

  // Only show projects with recent activity or toolkit config
  const activeProjects = projects.filter(
    (p) => p.recentSessions.length > 0 || p.health.score > 0
  )

  return (
    <>
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        <RefreshIndicator />
      </header>

      <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4" aria-label="Projects list">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">Projects</h2>
          {projects.length > 0 && (
            <span className="text-[11px] text-zinc-500">
              {activeProjects.length} actifs / {projects.length} total
            </span>
          )}
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No projects detected"
            description="Projects appear when you use Claude Code in a directory. Check that ~/.claude/projects/ exists and contains project folders."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeProjects.map((project) => (
              <li
                key={project.encodedPath}
                className="rounded-md border border-white/[0.04] bg-zinc-900/30 px-4 py-3"
              >
                <p className="text-sm font-medium text-zinc-200">
                  {project.name}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate">
                  {project.path}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
