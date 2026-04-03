import { GitBranch } from 'lucide-react'
import { discoverProjects } from '@/lib/data/scanner'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PipelineBoard } from '@/components/dashboard/pipeline-board'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const projects = await discoverProjects()

  const allFeatures: { feature: (typeof projects)[number]['features'][number]; projectName: string }[] = []
  const projectNameSet = new Set<string>()

  for (const project of projects) {
    for (const feature of project.features) {
      allFeatures.push({ feature, projectName: project.name })
      projectNameSet.add(project.name)
    }
  }

  const projectNames = [...projectNameSet].sort()

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">
          Feature Pipeline
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track features from planning to shipped across all projects
        </p>
      </header>

      {allFeatures.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No features tracked"
          description="Features appear when projects have a .claude/state.json with tracked features. Create a PRD and start implementation to see features here."
          action="/prd to create a feature spec"
        />
      ) : (
        <PipelineBoard features={allFeatures} projectNames={projectNames} />
      )}
    </>
  )
}
