import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROJECTS_DIR } from '@/lib/config'
import { discoverProjects } from '@/lib/data/scanner'
import type { Dossier, Project, ProjectState } from '@/lib/types'

/** Temporary directory standing for the home directory: it holds the fake ~/.claude and the projects */
const FAKE_HOME = await vi.hoisted(async () => {
  const { tmpdir } = await import('node:os')
  const path = await import('node:path')
  return path.join(tmpdir(), `scanner_test_${Date.now()}`)
})

/** Output of each external command, keyed by command and subcommand such as "git status" */
const commandOutputs = vi.hoisted(() => new Map<string, string>())

vi.mock(import('@/lib/config'), async (importOriginal) => {
  const config = await importOriginal()
  const claudeHome = `${FAKE_HOME}/claude`
  return {
    ...config,
    CLAUDE_HOME: claudeHome,
    PROJECTS_DIR: `${claudeHome}/projects`,
    HISTORY_FILE: `${claudeHome}/history.jsonl`,
    TASKS_DIR: `${claudeHome}/tasks`,
    readDashboardConfig: async () => ({ projectDirs: [], excludePatterns: [], scanClaudeProjects: true }),
  }
})

// Neither git nor gh runs: a command answers with its registered output, or fails like an absent tool
vi.mock('node:child_process', () => ({
  execFile: (
    command: string,
    args: string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string) => void
  ) => {
    const output = commandOutputs.get(`${command} ${args[0]}`)
    callback(output === undefined ? new Error(`${command} is not available in tests`) : null, output ?? '')
  },
}))

const CODE_DIR = join(FAKE_HOME, 'code')
const COMPLETE_FIXTURE = fileURLToPath(new URL('./fixtures/dossier/complete', import.meta.url))
/** Decisions read from the complete fixture: DECISIONS.md, docs/decisions and vault/decisions together */
const DECISION_COUNT = 7
/** Gaps of the complete fixture: a finished task the journal does not cite, and an undated decision */
const COMPLETE_GAPS: Array<[string, string]> = [
  ['journal', 'task_not_in_journal'],
  ['decisions', 'decision_without_date'],
]

beforeEach(async () => {
  await rm(FAKE_HOME, { recursive: true, force: true })
  await mkdir(PROJECTS_DIR, { recursive: true })
  await mkdir(CODE_DIR, { recursive: true })
  commandOutputs.clear()
})

afterAll(async () => {
  await rm(FAKE_HOME, { recursive: true, force: true })
})

// --- Factories ---

/** Folder name Claude Code gives a project in ~/.claude/projects */
function encodedPathOf(projectPath: string): string {
  return projectPath.replace(/\//g, '-')
}

/** Register a project path in ~/.claude/projects without creating its directory */
async function registerProject(projectPath: string): Promise<void> {
  await mkdir(join(PROJECTS_DIR, encodedPathOf(projectPath)))
}

/** Create a registered project holding the given files and return its path */
async function createProject(name: string, files: Record<string, string> = {}): Promise<string> {
  const projectPath = join(CODE_DIR, name)
  await mkdir(projectPath, { recursive: true })
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(projectPath, relativePath)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }
  await registerProject(projectPath)
  return projectPath
}

/** Create a registered project holding a copy of the complete dossier fixture and return its path */
async function createCompleteProject(name: string): Promise<string> {
  const projectPath = join(CODE_DIR, name)
  await cp(COMPLETE_FIXTURE, projectPath, { recursive: true })
  await registerProject(projectPath)
  return projectPath
}

async function discoverProject(projectPath: string): Promise<Project> {
  const projects = await discoverProjects()
  return projects.find((project) => project.path === projectPath)!
}

function gapsOf(dossier: Dossier): Array<[string, string]> {
  return dossier.gaps.map((gap) => [gap.source, gap.kind])
}

const STATE: ProjectState = {
  project: 'kitchen',
  updatedAt: '2026-11-22T10:00:00Z',
  features: [
    {
      slug: 'recipe-list',
      status: 'building',
      prd: null,
      ralph: { active: false, branch: null, storiesTotal: 0, storiesDone: 0 },
      audit: { lastDate: '2026-11-21', score: 80, blockers: 0 },
      pr: null,
      shipped: false,
    },
  ],
  decisions: { pending: 0, validated: 1, rejected: 0 },
  lastSession: { date: null, branch: null, lastAction: null, nextStep: null },
}

/** A project that passes every health check: state, vault, steering, tests, CI and audit */
function healthyProjectFiles(): Record<string, string> {
  return {
    '.claude/state.json': JSON.stringify(STATE),
    'vault/ideas/2026-11-20-import.md': '---\ntitle: Importer les recettes\n---\n\nDepuis un fichier.\n',
    'steering/product.md': '# Produit\n',
    'vitest.config.ts': 'export default {}\n',
    '.github/workflows/ci.yml': 'name: CI\n',
  }
}

// --- Dossier ---

describe('discoverProjects dossier', () => {
  it('should attach the plan, the journal and the decisions of a complete dossier', async () => {
    const projectPath = await createCompleteProject('recipes')

    const { dossier } = await discoverProject(projectPath)

    expect(dossier.plan?.stateDate).toBe('2026-11-22')
    expect(dossier.plan?.tasks.map((task) => task.number)).toEqual([1, 2, 3])
    expect(dossier.journal?.map((entry) => entry.date)).toEqual(['2026-11-22', '2026-07-03'])
    expect(dossier.decisions).toHaveLength(DECISION_COUNT)
    expect(gapsOf(dossier)).toEqual(COMPLETE_GAPS)
  })

  it('should attach a null plan and a missing_file gap when PLAN.md is absent', async () => {
    const projectPath = await createCompleteProject('recipes')
    await rm(join(projectPath, 'PLAN.md'))

    const { dossier } = await discoverProject(projectPath)

    expect(dossier.plan).toBeNull()
    expect(gapsOf(dossier)).toEqual([
      ['plan', 'missing_file'],
      ['decisions', 'decision_without_date'],
    ])
  })

  it('should still attach the journal and the decisions when PLAN.md is absent', async () => {
    const projectPath = await createCompleteProject('recipes')
    await rm(join(projectPath, 'PLAN.md'))

    const { dossier } = await discoverProject(projectPath)

    expect(dossier.journal).toHaveLength(2)
    expect(dossier.decisions).toHaveLength(DECISION_COUNT)
  })

  it('should report a missing_section gap and keep the rest of the dossier when a PLAN.md heading is renamed', async () => {
    const projectPath = await createCompleteProject('recipes')
    const planPath = join(projectPath, 'PLAN.md')
    const plan = await readFile(planPath, 'utf-8')
    await writeFile(planPath, plan.replace('## Prochaines tâches', '## Tâches suivantes'))

    const { dossier } = await discoverProject(projectPath)

    expect(gapsOf(dossier)).toEqual([
      ['plan', 'missing_section'],
      ['decisions', 'decision_without_date'],
    ])
    expect(dossier.plan?.stateDate).toBe('2026-11-22')
    expect(dossier.plan?.waiting).toHaveLength(2)
    expect(dossier.journal).toHaveLength(2)
    expect(dossier.decisions).toHaveLength(DECISION_COUNT)
  })

  it('should report a missing_file gap for PLAN.md and JOURNAL.md and no decision when the project has no dossier file', async () => {
    const projectPath = await createProject('garden')

    const { dossier } = await discoverProject(projectPath)

    expect(dossier).toMatchObject({ plan: null, journal: null, decisions: [] })
    expect(gapsOf(dossier)).toEqual([
      ['plan', 'missing_file'],
      ['journal', 'missing_file'],
      ['decisions', 'no_decision'],
    ])
  })

  it('should report a missing_file gap for PLAN.md and JOURNAL.md and no decision when the registered directory has disappeared', async () => {
    const projectPath = join(CODE_DIR, 'gone')
    await registerProject(projectPath)

    const { dossier } = await discoverProject(projectPath)

    expect(dossier).toMatchObject({ plan: null, journal: null, decisions: [] })
    expect(gapsOf(dossier)).toEqual([
      ['plan', 'missing_file'],
      ['journal', 'missing_file'],
      ['decisions', 'no_decision'],
    ])
  })

  it('should attach to each of two projects its own dossier at its own path', async () => {
    const completePath = await createCompleteProject('recipes')
    const emptyPath = await createProject('garden')

    const projects = await discoverProjects()

    const summary = projects
      .map((project) => [project.path, project.dossier.projectPath, project.dossier.plan !== null])
      .sort()
    expect(summary).toEqual([
      [emptyPath, emptyPath, false],
      [completePath, completePath, true],
    ])
  })
})

// --- Fields returned before the dossier ---

describe('discoverProjects fields returned before the dossier', () => {
  it('should keep the name, the path and the encoded path', async () => {
    const projectPath = await createProject('kitchen', healthyProjectFiles())

    const project = await discoverProject(projectPath)

    expect(project).toMatchObject({ name: 'kitchen', path: projectPath, encodedPath: encodedPathOf(projectPath) })
  })

  it('should keep the state read from .claude/state.json', async () => {
    const projectPath = await createProject('kitchen', healthyProjectFiles())

    const project = await discoverProject(projectPath)

    expect(project.state).toEqual(STATE)
  })

  it('should keep the vault entries', async () => {
    const projectPath = await createProject('kitchen', healthyProjectFiles())

    const project = await discoverProject(projectPath)

    expect(project.vaultEntries.map((entry) => [entry.title, entry.date, entry.type])).toEqual([
      ['Importer les recettes', '2026-11-20', 'idea'],
    ])
  })

  it('should keep the health score', async () => {
    const projectPath = await createProject('kitchen', healthyProjectFiles())

    const project = await discoverProject(projectPath)

    expect(project.health).toEqual({
      hasState: true,
      hasVault: true,
      hasSteering: true,
      hasTests: true,
      hasCI: true,
      hasAudit: true,
      score: 100,
      label: 'healthy',
    })
  })

  it('should keep the git branch, the changed files count and the CI status', async () => {
    const projectPath = await createProject('kitchen', healthyProjectFiles())
    commandOutputs.set('git rev-parse', 'main')
    commandOutputs.set('git status', ' M src/list.ts\n M src/import.ts')

    const project = await discoverProject(projectPath)

    expect(project.git).toEqual({ branch: 'main', dirtyCount: 2, ciStatus: 'configured', openPRs: 0 })
  })

  it('should give a disappeared directory no state, no vault entry and no git data', async () => {
    const projectPath = join(CODE_DIR, 'gone')
    await registerProject(projectPath)

    const project = await discoverProject(projectPath)

    expect(project).toMatchObject({
      name: 'gone',
      state: null,
      vaultEntries: [],
      git: { branch: null, dirtyCount: 0, ciStatus: 'none', openPRs: 0 },
    })
  })
})
