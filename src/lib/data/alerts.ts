import type { Project, RalphSession, Alert } from '@/lib/types'

/**
 * Derive alerts from project data and Ralph sessions.
 * Alerts are sorted by severity (error > warning > info) then recency.
 */
export function deriveAlerts(
  projects: Project[],
  ralphSessions: RalphSession[],
): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()

  for (const project of projects) {
    // CI failing
    if (project.git.ciStatus === 'failing') {
      alerts.push({
        id: `ci-fail-${project.encodedPath}`,
        severity: 'error',
        title: `CI failing`,
        detail: project.git.branch ? `on ${project.git.branch}` : null,
        project: project.name,
        timestamp: project.lastActivity ?? now,
      })
    }

    // Low health score
    if (project.health.label === 'minimal') {
      alerts.push({
        id: `health-low-${project.encodedPath}`,
        severity: 'warning',
        title: `Health score ${project.health.score}%`,
        detail: 'Missing tests, CI, or steering docs',
        project: project.name,
        timestamp: project.lastActivity ?? now,
      })
    }

    // High dirty file count
    if (project.git.dirtyCount >= 10) {
      alerts.push({
        id: `dirty-${project.encodedPath}`,
        severity: 'warning',
        title: `${project.git.dirtyCount} uncommitted files`,
        detail: null,
        project: project.name,
        timestamp: project.lastActivity ?? now,
      })
    }

    // Audit blockers
    for (const feature of project.features) {
      if (feature.audit.blockers > 0) {
        alerts.push({
          id: `audit-blocker-${project.encodedPath}-${feature.slug}`,
          severity: 'warning',
          title: `${feature.audit.blockers} audit blocker${feature.audit.blockers > 1 ? 's' : ''}`,
          detail: feature.slug,
          project: project.name,
          timestamp: project.lastActivity ?? now,
        })
      }
    }
  }

  // Ralph sessions
  for (const session of ralphSessions) {
    if (session.status === 'blocked') {
      alerts.push({
        id: `ralph-blocked-${session.projectName}`,
        severity: 'error',
        title: 'Ralph blocked',
        detail: session.lastAction,
        project: session.projectName,
        timestamp: session.timestamp ? new Date(session.timestamp).getTime() : now,
      })
    }

    if (session.status === 'completed') {
      alerts.push({
        id: `ralph-done-${session.projectName}`,
        severity: 'info',
        title: `Ralph completed (${session.tasksDone}/${session.tasksTotal} tasks)`,
        detail: null,
        project: session.projectName,
        timestamp: session.timestamp ? new Date(session.timestamp).getTime() : now,
      })
    }
  }

  // Sort: errors first, then warnings, then info; within same severity, most recent first
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return b.timestamp - a.timestamp
  })

  return alerts
}
