import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { appendFile, chmod, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { readDossier } from '@/lib/parsers/dossier'
import type { Dossier, DossierGap, DossierGapKind, DossierGapSeverity, DossierJournalEntry, DossierPlan } from '@/lib/types'

const FIXTURES_DIR = fileURLToPath(new URL('./fixtures/dossier', import.meta.url))
const TEST_DIR = join(tmpdir(), 'dossier-test-' + Date.now())
let projectCount = 0

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true })
})

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true })
})

// --- Factories ---

/** Write the files into a fresh project directory and return its path */
async function createProject(files: Record<string, string>): Promise<string> {
  projectCount += 1
  const projectDir = join(TEST_DIR, `project-${projectCount}`)
  await mkdir(projectDir, { recursive: true })
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(projectDir, relativePath)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }
  return projectDir
}

async function readDossierOf(files: Record<string, string>): Promise<Dossier> {
  return readDossier(await createProject(files))
}

function readFixture(name: string): Promise<Dossier> {
  return readDossier(join(FIXTURES_DIR, name))
}

function gapsOf(dossier: Dossier, source: DossierGap['source']): DossierGap[] {
  return dossier.gaps.filter((gap) => gap.source === source)
}

function kindsOf(gaps: DossierGap[]): string[] {
  return gaps.map((gap) => gap.kind)
}

function section(heading: string, ...body: string[]): string {
  return [`## ${heading}`, '', ...body].join('\n')
}

function planFile(...sections: string[]): string {
  return ['# Plan', ...sections].join('\n\n') + '\n'
}

function journalFile(...sections: string[]): string {
  return ['# Journal', ...sections].join('\n\n') + '\n'
}

/** A journal session with its three points */
function sessionSection(heading: string, done = 'La liste s’affiche.'): string {
  return section(heading, `- **Fait.** ${done}`, '- **Appris.** Rien.', '- **Bloque.** Rien.')
}

const TASK_HEADER = ['#', 'Tâche', 'Fini quand', 'État']

interface TaskRowFields {
  number: string
  task: string
  doneWhen: string
  status: string
}

/** A task row in the default column order: #, Tâche, Fini quand, État */
function taskRow(fields: Partial<TaskRowFields> = {}): string[] {
  const row: TaskRowFields = {
    number: '1',
    task: '**Voir la liste.** Les recettes importées s’affichent.',
    doneWhen: 'Louis voit ses dix recettes.',
    status: 'à faire',
    ...fields,
  }
  return [row.number, row.task, row.doneWhen, row.status]
}

function table(header: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [line(header), line(header.map(() => '---')), ...rows.map(line)].join('\n')
}

function stateSection(heading = 'Où en est le projet (2026-11-22)'): string {
  return section(heading, '- **Fait.** L’import des recettes fonctionne.')
}

function tasksSection(rows: string[][] = [taskRow()]): string {
  return section('Prochaines tâches', table(TASK_HEADER, rows))
}

function waitingSection(...lines: string[]): string {
  return section('Ce qui attend Louis', ...lines)
}

/** A plan whose three sections are well formed, with the given task rows */
function planWithTasks(rows: string[][], stateHeading?: string): string {
  return planFile(stateSection(stateHeading), tasksSection(rows), waitingSection())
}

async function readPlanOf(...sections: string[]): Promise<{ plan: DossierPlan; gaps: DossierGap[] }> {
  const dossier = await readDossierOf({ 'PLAN.md': planFile(...sections) })
  return { plan: dossier.plan!, gaps: gapsOf(dossier, 'plan') }
}

async function readTasksOf(header: string[], rows: string[][]) {
  return readPlanOf(stateSection(), section('Prochaines tâches', table(header, rows)), waitingSection())
}

async function readTaskWithStatus(status: string, stateHeading?: string) {
  const { plan, gaps } = await readPlanOf(stateSection(stateHeading), tasksSection([taskRow({ status })]), waitingSection())
  return { task: plan.tasks[0]!, gaps }
}

async function readWaitingLineOf(line: string, stateHeading?: string) {
  const { plan, gaps } = await readPlanOf(stateSection(stateHeading), tasksSection(), waitingSection(`1. ${line}`))
  return { item: plan.waiting[0]!, gaps }
}

async function readWaitingSectionOf(heading: string, ...lines: string[]) {
  const { plan, gaps } = await readPlanOf(stateSection(), tasksSection(), section(heading, ...lines))
  return { waiting: plan.waiting, gaps }
}

async function readJournalOf(text: string): Promise<{ journal: DossierJournalEntry[]; gaps: DossierGap[] }> {
  const dossier = await readDossierOf({ 'JOURNAL.md': text })
  return { journal: dossier.journal!, gaps: gapsOf(dossier, 'journal') }
}

async function readDecisionsOf(files: Record<string, string>) {
  const dossier = await readDossierOf(files)
  return { decisions: dossier.decisions, gaps: gapsOf(dossier, 'decisions') }
}

// --- Files ---

describe('readDossier files', () => {
  it('should return an empty dossier with a missing_file gap per file when the project directory does not exist', async () => {
    const projectDir = join(TEST_DIR, 'does-not-exist')

    const dossier = await readDossier(projectDir)

    expect(dossier).toMatchObject({ plan: null, journal: null, decisions: [] })
    expect(dossier.gaps.map((gap) => [gap.source, gap.kind])).toEqual([
      ['plan', 'missing_file'],
      ['journal', 'missing_file'],
      ['decisions', 'no_decision'],
    ])
  })

  it('should return the absolute project path when given a relative one', async () => {
    const absolutePath = join(FIXTURES_DIR, 'complete')

    const dossier = await readDossier(relative(process.cwd(), absolutePath))

    expect(dossier.projectPath).toBe(absolutePath)
  })

  it('should report a missing JOURNAL.md and still read the plan', async () => {
    const dossier = await readDossierOf({ 'PLAN.md': planFile(stateSection(), tasksSection(), waitingSection()) })

    expect(dossier.journal).toBeNull()
    expect(dossier.plan?.tasks).toHaveLength(1)
    expect(gapsOf(dossier, 'journal')).toEqual([
      { source: 'journal', kind: 'missing_file', severity: 'error', message: 'JOURNAL.md est absent du projet.' },
    ])
  })

  it('should report a PLAN.md that is a directory as unreadable and still read the journal and the decisions', async () => {
    const dossier = await readDossierOf({
      'PLAN.md/notes.md': 'Un dossier à la place du plan.',
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
      'docs/decisions/001-liste.md': '# ADR-001 — Afficher la liste\n\n**Date** : 2026-11-22\n',
    })

    expect(dossier.plan).toBeNull()
    expect(kindsOf(dossier.gaps)).toEqual(['unreadable_file'])
    expect(dossier.journal).toHaveLength(1)
    expect(dossier.decisions).toHaveLength(1)
  })

  it('should report a PLAN.md without read permission as unreadable', async () => {
    const projectDir = await createProject({ 'PLAN.md': planFile(stateSection(), tasksSection(), waitingSection()) })
    await chmod(join(projectDir, 'PLAN.md'), 0o000)

    const dossier = await readDossier(projectDir)
    await chmod(join(projectDir, 'PLAN.md'), 0o644)

    expect(gapsOf(dossier, 'plan')).toEqual([
      { source: 'plan', kind: 'unreadable_file', severity: 'error', message: "PLAN.md existe mais n'a pas pu être lu." },
    ])
  })

  it('should report PLAN.md and JOURNAL.md as missing when the project path is a file', async () => {
    const projectDir = await createProject({ 'notes.txt': 'Un fichier, pas un projet.' })

    const dossier = await readDossier(join(projectDir, 'notes.txt'))

    expect(kindsOf(dossier.gaps)).toEqual(['missing_file', 'missing_file', 'no_decision'])
  })

  it('should report a PLAN.md that is not valid UTF-8 as unreadable', async () => {
    const projectDir = await createProject({ 'PLAN.md': planWithTasks([taskRow()]) })
    await appendFile(join(projectDir, 'PLAN.md'), Buffer.from([0xff]))

    const dossier = await readDossier(projectDir)

    expect(dossier.plan).toBeNull()
    expect(kindsOf(gapsOf(dossier, 'plan'))).toEqual(['unreadable_file'])
  })

  it('should report an empty PLAN.md with a single empty_file gap', async () => {
    const dossier = await readDossierOf({ 'PLAN.md': '\n' })

    expect(dossier.plan).toEqual({ stateDate: null, state: [], tasks: [], waiting: [] })
    expect(kindsOf(gapsOf(dossier, 'plan'))).toEqual(['empty_file'])
  })

  it('should report an empty JOURNAL.md with a single empty_file gap', async () => {
    const { journal, gaps } = await readJournalOf('')

    expect(journal).toEqual([])
    expect(kindsOf(gaps)).toEqual(['empty_file'])
  })

  it('should read files with CRLF line endings', async () => {
    const lfPlan = planFile(stateSection(), tasksSection(), waitingSection('1. Ouvrir la page. Demandé le 22 novembre.'))

    const dossier = await readDossierOf({ 'PLAN.md': lfPlan.replace(/\n/g, '\r\n') })

    expect(dossier.plan?.stateDate).toBe('2026-11-22')
    expect(dossier.plan?.tasks[0]?.title).toBe('Voir la liste')
    expect(dossier.plan?.waiting[0]?.requestedOn).toBe('2026-11-22')
    expect(gapsOf(dossier, 'plan')).toEqual([])
  })
})

// --- Severity ---

/** For each kind of gap, its severity and a project that gives it */
const SEVERITY_CASES: Record<DossierGapKind, { severity: DossierGapSeverity; files: Record<string, string> }> = {
  missing_file: { severity: 'error', files: {} },
  unreadable_file: { severity: 'error', files: { 'PLAN.md/notes.md': 'Un dossier à la place du plan.' } },
  empty_file: { severity: 'error', files: { 'PLAN.md': '' } },
  missing_title: { severity: 'error', files: { 'PLAN.md': '# Notes\n' } },
  missing_section: { severity: 'error', files: { 'PLAN.md': planFile() } },
  missing_state_date: { severity: 'error', files: { 'PLAN.md': planWithTasks([taskRow()], 'Où en est le projet') } },
  unreadable_tasks_table: { severity: 'error', files: { 'PLAN.md': planFile(section('Prochaines tâches', 'Rien.')) } },
  unreadable_task_row: { severity: 'error', files: { 'PLAN.md': planWithTasks([taskRow({ number: 'un' })]) } },
  unknown_status: { severity: 'error', files: { 'PLAN.md': planWithTasks([taskRow({ status: 'bloqué' })]) } },
  duplicate_task_number: { severity: 'error', files: { 'PLAN.md': planWithTasks([taskRow(), taskRow()]) } },
  journal_heading_without_date: { severity: 'error', files: { 'JOURNAL.md': journalFile(sessionSection('Notes')) } },
  point_without_label: {
    severity: 'warning',
    files: { 'PLAN.md': planFile(section('Où en est le projet (2026-11-22)', '- Sans libellé.')) },
  },
  task_without_done_when: { severity: 'warning', files: { 'PLAN.md': planWithTasks([taskRow({ doneWhen: '' })]) } },
  validation_without_name: { severity: 'warning', files: { 'PLAN.md': planWithTasks([taskRow({ status: 'à valider' })]) } },
  done_without_date: { severity: 'warning', files: { 'PLAN.md': planWithTasks([taskRow({ status: 'fait' })]) } },
  done_without_proof: { severity: 'warning', files: { 'PLAN.md': planWithTasks([taskRow({ status: 'fait le 20 novembre' })]) } },
  waiting_without_date: { severity: 'warning', files: { 'PLAN.md': planFile(section('Ce qui attend Camille', '1. Relire.')) } },
  waiting_without_addressee: {
    severity: 'warning',
    files: { 'PLAN.md': planFile(stateSection(), section('Ce qui attend', '1. Relire. Demandé le 20 novembre.')) },
  },
  journal_without_session: { severity: 'warning', files: { 'JOURNAL.md': '# Journal\n' } },
  session_missing_point: { severity: 'warning', files: { 'JOURNAL.md': journalFile(section('2026-11-22', '- **Fait.** Rien.')) } },
  journal_out_of_order: {
    severity: 'warning',
    files: { 'JOURNAL.md': journalFile(sessionSection('2026-11-20'), sessionSection('2026-11-22')) },
  },
  state_behind_journal: {
    severity: 'warning',
    files: {
      'PLAN.md': planWithTasks([taskRow()], 'Où en est le projet (2026-11-20)'),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
    },
  },
  journal_behind_state: {
    severity: 'warning',
    files: { 'PLAN.md': planWithTasks([taskRow()]), 'JOURNAL.md': journalFile(sessionSection('2026-11-20')) },
  },
  task_not_in_journal: {
    severity: 'warning',
    files: {
      'PLAN.md': planWithTasks([taskRow({ status: 'en cours' })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
    },
  },
  decision_without_date: { severity: 'warning', files: { 'DECISIONS.md': '# Décisions\n\n## Garder une seule base\n' } },
  no_decision: { severity: 'warning', files: {} },
  unreadable_frontmatter: { severity: 'warning', files: { 'vault/decisions/cassee.md': '---\ntitle: [non fermé\n---\n' } },
}

describe('readDossier gap severity', () => {
  it.each(Object.entries(SEVERITY_CASES))('should give the %s gap its severity', async (kind, { severity, files }) => {
    const dossier = await readDossierOf(files)

    expect(dossier.gaps.find((gap) => gap.kind === kind)?.severity).toBe(severity)
  })
})

// --- Fixture shared with the check command ---

describe('readDossier on the valid fixture shared with the check command', () => {
  it('should report no gap', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.gaps).toEqual([])
  })

  it('should read the state date', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.plan?.stateDate).toBe('2026-03-14')
  })

  it('should read the five tasks with their five states', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.plan?.tasks.map((task) => [task.number, task.status])).toEqual([
      [1, 'done'],
      [2, 'in_progress'],
      [3, 'to_validate'],
      [4, 'todo'],
      [5, 'later'],
    ])
  })

  it('should read the date and the proof of the finished task', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.plan?.tasks[0]).toMatchObject({ doneOn: '2026-03-12', proof: 'commit `1a2b3c4`' })
  })

  it('should read who validates the task to validate', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.plan?.tasks[2]?.validator).toBe('Camille')
  })

  it('should address one waiting line to the name in the heading and the other to the name after its date', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.plan?.waiting.map((item) => [item.requestedOn, item.addressee])).toEqual([
      ['2026-03-14', 'Camille'],
      ['2026-03-13', 'Jeanne'],
    ])
  })

  it('should read the two sessions and the dated decision', async () => {
    const dossier = await readFixture('valid')

    expect(dossier.journal?.map((entry) => entry.date)).toEqual(['2026-03-14', '2026-03-12'])
    expect(dossier.decisions.map((decision) => [decision.date, decision.title])).toEqual([
      ['2026-03-10', 'Garder les prêts dans un fichier SQLite'],
    ])
  })
})

// --- Complete fixture ---

describe('readDossier on a complete dossier', () => {
  it('should report only the finished task the journal does not cite and the undated decision', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.gaps.map((gap) => [gap.source, gap.kind])).toEqual([
      ['journal', 'task_not_in_journal'],
      ['decisions', 'decision_without_date'],
    ])
  })

  it('should read the state date and the labelled points of the plan', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.stateDate).toBe('2026-11-22')
    expect(dossier.plan?.state.map((point) => point.label)).toEqual(['Fait', 'Mesuré', 'En cours'])
    expect(dossier.plan?.state[2]).toEqual({
      label: 'En cours',
      text: "La tâche 1 est construite et attend que Louis l'essaie.",
      taskNumbers: [1],
    })
  })

  it('should join a bullet with its indented continuation line', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.state[1]?.text).toBe("La liste s'ouvre en moins d'une seconde sur un vieux téléphone.")
  })

  it('should read the bold part of a task cell as title without its final period', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.tasks[0]).toEqual({
      number: 1,
      title: 'Voir la liste',
      description: "Les recettes importées s'affichent.",
      doneWhen: 'Louis ouvre la page et voit ses dix recettes.',
      status: 'to_validate',
      statusText: 'à valider par Louis',
      validator: 'Louis',
      doneOn: null,
      proof: null,
    })
  })

  it('should keep the rest of the task cell after the bold part as description', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.tasks[1]).toMatchObject({ title: 'Chercher', description: ', par nom ou par ingrédient.' })
  })

  it('should use the whole task cell as title when it has no bold part', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.tasks[2]).toMatchObject({ title: 'Partager une recette', description: '' })
  })

  it('should keep the whole status cell when a known status is followed by a detail', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.tasks[2]).toMatchObject({
      status: 'done',
      statusText: 'fait le 20 novembre, commit `b41c9e2`',
    })
  })

  it('should read the waiting lines with their rank, request date, addressee and cited tasks', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.waiting).toEqual([
      {
        position: 1,
        text: 'Ouvrir la page et dire si la liste est lisible. Demandé le 22 novembre, la réponse attendue est « vu ».',
        requestedOn: '2026-11-22',
        addressee: 'Louis',
        taskNumbers: [],
      },
      {
        position: 2,
        text: "Choisir l'hébergement. Avec la ligne 1, cela valide la tâche 1. Demandé le 2026-11-21.",
        requestedOn: '2026-11-21',
        addressee: 'Louis',
        taskNumbers: [1],
      },
    ])
  })

  it('should read the journal sessions with their note', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.journal?.map((entry) => [entry.date, entry.note])).toEqual([
      ['2026-11-22', null],
      ['2026-07-03', 'reconstitué depuis git'],
    ])
  })

  it('should read the labelled points of a journal session with their cited tasks', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.journal?.[0]?.points).toEqual([
      { label: 'Fait', text: "L'écran de la tâche 1 affiche la liste.", taskNumbers: [1] },
      { label: 'Appris', text: "Le fichier d'export contient des lignes vides.", taskNumbers: [] },
      { label: 'Bloque', text: 'La validation de la tâche 1 attend Louis.', taskNumbers: [1] },
    ])
  })

  it('should read the decisions of the three locations from the most recent to the undated', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.decisions.map((decision) => decision.date)).toEqual([
      '2026-11-21',
      '2026-11-20',
      '2026-11-19',
      '2026-11-18',
      '2026-07-02',
      '2026-04-07',
      null,
    ])
  })

  it('should read the id, title, date and status of an ADR file', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.decisions.find((decision) => decision.id === 'ADR-001')).toEqual({
      id: 'ADR-001',
      title: 'Importer les recettes depuis un fichier CSV',
      date: '2026-07-02',
      status: 'remplacé le 2026-11-21 par ADR-002',
      path: join(FIXTURES_DIR, 'complete', 'docs', 'decisions', '001-import-csv.md'),
    })
  })

  it('should read a decision file frontmatter with an unquoted date', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.decisions[1]).toMatchObject({
      id: null,
      title: 'Héberger le carnet sur un serveur partagé',
      date: '2026-11-20',
      status: 'validee',
    })
  })

  it('should read a decision file written as a dated heading followed by a status bullet', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.decisions[3]).toMatchObject({
      title: 'Garder le format Markdown pour les recettes',
      date: '2026-11-18',
      status: 'validee',
    })
  })

  it('should ignore a status written after the second heading of a decision file', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.decisions[5]).toMatchObject({
      title: 'Cadrage du carnet de recettes',
      date: '2026-04-07',
      status: null,
    })
  })

  it('should read the entries of DECISIONS.md written as level-2 headings', async () => {
    const dossier = await readFixture('complete')
    const entries = dossier.decisions.filter((decision) => decision.path.endsWith('DECISIONS.md'))

    expect(entries.map((entry) => [entry.title, entry.date, entry.status])).toEqual([
      ['Afficher les recettes par ordre alphabétique', '2026-11-19', 'accepté'],
      ['Garder les recettes hors ligne', null, null],
    ])
  })
})

// --- Titles ---

describe('readDossier file titles', () => {
  it('should accept a plan title that starts with "Plan"', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow()]).replace('# Plan', '# Plan du carnet'),
    })

    expect(gapsOf(dossier, 'plan')).toEqual([])
  })

  it('should compare the title without case or accents', async () => {
    const { gaps } = await readJournalOf('# JOURNAL\n\n' + sessionSection('2026-11-22'))

    expect(gaps).toEqual([])
  })

  it('should report a plan whose first level-1 heading is another title', async () => {
    const dossier = await readDossierOf({ 'PLAN.md': '# Notes\n\n# Plan\n' })

    expect(gapsOf(dossier, 'plan')[0]).toEqual({
      source: 'plan',
      kind: 'missing_title',
      severity: 'error',
      message: 'PLAN.md commence par le titre « # Plan » dans le format, et porte « # Notes ».',
    })
  })

  it('should report a journal without any level-1 heading', async () => {
    const { gaps } = await readJournalOf(sessionSection('2026-11-22'))

    expect(gaps).toEqual([
      {
        source: 'journal',
        kind: 'missing_title',
        severity: 'error',
        message: "JOURNAL.md commence par le titre « # Journal » dans le format, et n'a aucun titre.",
      },
    ])
  })

  it('should ignore a level-1 heading written in a code block', async () => {
    const dossier = await readDossierOf({ 'PLAN.md': '```\n# Exemple\n```\n\n# Plan\n' })

    expect(kindsOf(gapsOf(dossier, 'plan'))).not.toContain('missing_title')
  })
})

// --- Indented headings ---

describe('readDossier indented headings', () => {
  it('should read a heading indented by three spaces', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection(),
      '   ' + section('Prochaines tâches', table(TASK_HEADER, [taskRow()])),
      waitingSection()
    )

    expect(plan.tasks).toHaveLength(1)
    expect(gaps).toEqual([])
  })

  it('should not read a line indented by four spaces as a heading', async () => {
    const { gaps } = await readPlanOf(
      stateSection(),
      '    ' + section('Prochaines tâches', table(TASK_HEADER, [taskRow()])),
      waitingSection()
    )

    expect(kindsOf(gaps)).toEqual(['missing_section'])
  })
})

// --- PLAN.md sections ---

describe('readDossier plan sections', () => {
  it('should report a renamed waiting section with the headings found and still read the tasks', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection(),
      tasksSection(),
      section('En attente d’une réponse de Louis', '1. Ouvrir la page.')
    )

    expect(plan.waiting).toEqual([])
    expect(plan.tasks).toHaveLength(1)
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'missing_section',
        severity: 'error',
        message:
          'Dans PLAN.md, la section « Ce qui attend » est absente. Les titres trouvés sont « Où en est le projet (2026-11-22) », « Prochaines tâches », « En attente d’une réponse de Louis ».',
      },
    ])
  })

  it('should report an absent tasks section with a single gap', async () => {
    const { plan, gaps } = await readPlanOf(stateSection(), waitingSection())

    expect(plan.tasks).toEqual([])
    expect(kindsOf(gaps)).toEqual(['missing_section'])
  })

  it('should report the three sections when the plan has no section heading', async () => {
    const { gaps } = await readPlanOf('Un plan écrit sans titre.')

    expect(kindsOf(gaps)).toEqual(['missing_section', 'missing_section', 'missing_section'])
    expect(gaps[0]?.message).toContain("Le fichier n'a aucun titre de section.")
  })

  it('should read the sections in any order', async () => {
    const { plan, gaps } = await readPlanOf(
      waitingSection('1. Ouvrir la page. Demandé le 22 novembre.'),
      tasksSection(),
      stateSection()
    )

    expect(plan.stateDate).toBe('2026-11-22')
    expect(plan.tasks).toHaveLength(1)
    expect(plan.waiting).toHaveLength(1)
    expect(gaps).toEqual([])
  })

  it('should match section headings without case or accents', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection('OU EN EST LE PROJET (2026-11-22)'),
      section('prochaines taches', table(TASK_HEADER, [taskRow()])),
      section('Ce qui attend l’équipe')
    )

    expect(plan.tasks).toHaveLength(1)
    expect(gaps).toEqual([])
  })

  it('should read a plan with extra columns and an extra section without any gap', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection(),
      section('Prochaines tâches', table([...TASK_HEADER, 'Qui', 'Sprint'], [[...taskRow(), 'Malo', '3']])),
      section('Sprint 3', '- Finir la liste.'),
      waitingSection()
    )

    expect(plan.tasks).toHaveLength(1)
    expect(gaps).toEqual([])
  })

  it('should report a state heading without a date', async () => {
    const { plan, gaps } = await readPlanOf(stateSection('Où en est le projet'), tasksSection(), waitingSection())

    expect(plan.stateDate).toBeNull()
    expect(kindsOf(gaps)).toEqual(['missing_state_date'])
  })

  it('should report a state heading whose date does not exist in the calendar', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection('Où en est le projet (2026-02-30)'),
      tasksSection(),
      waitingSection()
    )

    expect(plan.stateDate).toBeNull()
    expect(kindsOf(gaps)).toEqual(['missing_state_date'])
  })

  it('should read the state date in parentheses anywhere in the heading', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection('Où en est le projet (mis à jour) (2026-03-14)'),
      tasksSection(),
      waitingSection()
    )

    expect(plan.stateDate).toBe('2026-03-14')
    expect(gaps).toEqual([])
  })

  it('should report a state date not closed by a parenthesis right after the day', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection('Où en est le projet (2026-03-14, soir)'),
      tasksSection(),
      waitingSection()
    )

    expect(plan.stateDate).toBeNull()
    expect(kindsOf(gaps)).toEqual(['missing_state_date'])
  })

  it('should read a state date in the years 1 to 99', async () => {
    const { plan } = await readPlanOf(stateSection('Où en est le projet (0099-01-01)'), tasksSection(), waitingSection())

    expect(plan.stateDate).toBe('0099-01-01')
  })

  it('should report a state date in the year 0', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection('Où en est le projet (0000-01-01)'),
      tasksSection(),
      waitingSection()
    )

    expect(plan.stateDate).toBeNull()
    expect(kindsOf(gaps)).toEqual(['missing_state_date'])
  })

  it('should keep a state bullet without a bold label and report it', async () => {
    const { plan, gaps } = await readPlanOf(
      section('Où en est le projet (2026-11-22)', '- La tâche 2 avance.'),
      tasksSection(),
      waitingSection()
    )

    expect(plan.state).toEqual([{ label: '', text: 'La tâche 2 avance.', taskNumbers: [2] }])
    expect(kindsOf(gaps)).toEqual(['point_without_label'])
  })

  it('should return no waiting line and no gap when the waiting section has no numbered line', async () => {
    const { plan, gaps } = await readPlanOf(stateSection(), tasksSection(), waitingSection('Rien pour le moment.'))

    expect(plan.waiting).toEqual([])
    expect(gaps).toEqual([])
  })
})

// --- Tasks table ---

describe('readDossier tasks table', () => {
  it('should report a tasks section without a table', async () => {
    const { plan, gaps } = await readPlanOf(
      stateSection(),
      section('Prochaines tâches', 'Le tableau viendra plus tard.'),
      waitingSection()
    )

    expect(plan.tasks).toEqual([])
    expect(kindsOf(gaps)).toEqual(['unreadable_tasks_table'])
  })

  it('should report a missing column by its name and read no task', async () => {
    const { plan, gaps } = await readTasksOf(['#', 'Tâche', 'État'], [['1', '**Voir la liste.**', 'à faire']])

    expect(plan.tasks).toEqual([])
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'unreadable_tasks_table',
        severity: 'error',
        message: "Dans PLAN.md, le tableau des tâches n'a pas de colonne « Fini quand ».",
      },
    ])
  })

  it('should ignore an extra column', async () => {
    const { plan, gaps } = await readTasksOf(
      ['#', 'Tâche', 'Responsable', 'Fini quand', 'État'],
      [['1', '**Voir la liste.**', 'Louis', 'La liste s’affiche.', 'en cours']]
    )

    expect(plan.tasks).toEqual([
      {
        number: 1,
        title: 'Voir la liste',
        description: '',
        doneWhen: 'La liste s’affiche.',
        status: 'in_progress',
        statusText: 'en cours',
        validator: null,
        doneOn: null,
        proof: null,
      },
    ])
    expect(gaps).toEqual([])
  })

  it('should find the columns by their header name in any order', async () => {
    const { plan } = await readTasksOf(
      ['État', 'Fini quand', '#', 'Tâche'],
      [['plus tard', 'La liste s’affiche.', '4', '**Voir la liste.**']]
    )

    expect(plan.tasks[0]).toMatchObject({ number: 4, title: 'Voir la liste', status: 'later' })
  })

  it('should keep a task with an empty done-when cell and report it', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ number: '3', doneWhen: '' })])

    expect(plan.tasks[0]?.doneWhen).toBe('')
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'task_without_done_when',
        severity: 'warning',
        message: "Dans PLAN.md, la tâche 3 n'a pas de « Fini quand ».",
      },
    ])
  })

  it('should keep an escaped pipe inside its cell', async () => {
    const { plan } = await readTasksOf(TASK_HEADER, [taskRow({ doneWhen: 'La commande `a \\| b` passe.' })])

    expect(plan.tasks[0]?.doneWhen).toBe('La commande `a | b` passe.')
  })

  it('should discard a row whose number is not an integer and report it with the row text', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ number: '5a', task: 'Voir' }), taskRow({ number: '6' })])

    expect(plan.tasks.map((task) => task.number)).toEqual([6])
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'unreadable_task_row',
        severity: 'error',
        message:
          'Dans PLAN.md, la ligne « 5a | Voir | Louis voit ses dix recettes. | à faire » du tableau des tâches est illisible. ' +
          'Une ligne porte un numéro et les quatre colonnes.',
      },
    ])
  })

  it('should discard a row with fewer cells than the rightmost column needs', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [['7', '**Voir la liste.**', 'La liste s’affiche.']])

    expect(plan.tasks).toEqual([])
    expect(kindsOf(gaps)).toEqual(['unreadable_task_row'])
  })

  it('should cut the quoted row after sixty characters', async () => {
    const { gaps } = await readTasksOf(TASK_HEADER, [taskRow({ number: 'x', task: 'a'.repeat(80) })])

    expect(gaps[0]?.message).toContain(`« x | ${'a'.repeat(56)}… »`)
  })

  it('should give the unknown status to an unknown state and report it', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ status: 'bloqué par le fournisseur' })])

    expect(plan.tasks[0]).toMatchObject({ status: 'unknown', statusText: 'bloqué par le fournisseur' })
    expect(kindsOf(gaps)).toEqual(['unknown_status'])
  })

  it('should keep a task with an unknown state and still report its empty done-when cell', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ status: 'bloqué', doneWhen: '' })])

    expect(plan.tasks).toHaveLength(1)
    expect(kindsOf(gaps)).toEqual(['unknown_status', 'task_without_done_when'])
  })

  it.each([
    ['à faire', 'todo'],
    ['En cours depuis lundi', 'in_progress'],
    ['à valider par Louis', 'to_validate'],
    ['Fait le 22 novembre, commit `a9f228a`', 'done'],
    ['fait.', 'done'],
    ['plus tard', 'later'],
    ['faites', 'unknown'],
    ['en coursier', 'unknown'],
  ])('should read the state "%s" as %s', async (statusText, status) => {
    const { plan } = await readTasksOf(TASK_HEADER, [taskRow({ status: statusText })])

    expect(plan.tasks[0]?.status).toBe(status)
  })

  it('should keep both tasks that carry the same number and report the second', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ number: '2' }), taskRow({ number: '2' })])

    expect(plan.tasks.map((task) => task.number)).toEqual([2, 2])
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'duplicate_task_number',
        severity: 'error',
        message: 'Dans PLAN.md, le numéro 2 est porté par deux tâches.',
      },
    ])
  })

  it('should report a duplicate_task_number gap for each extra row with the same number', async () => {
    const { gaps } = await readTasksOf(TASK_HEADER, [taskRow(), taskRow(), taskRow()])

    expect(kindsOf(gaps)).toEqual(['duplicate_task_number', 'duplicate_task_number'])
  })
})

// --- Task state details ---

describe('readDossier task to validate', () => {
  it('should read who validates the task', async () => {
    const { task, gaps } = await readTaskWithStatus('à valider par Camille')

    expect(task.validator).toBe('Camille')
    expect(gaps).toEqual([])
  })

  it('should stop the name at a comma', async () => {
    const { task } = await readTaskWithStatus('à valider par Camille, avant vendredi')

    expect(task.validator).toBe('Camille')
  })

  it('should keep a name of several words up to an opening parenthesis', async () => {
    const { task } = await readTaskWithStatus('à valider par Jeanne Martel (cliente)')

    expect(task.validator).toBe('Jeanne Martel')
  })

  it('should return the name with its accent when the status is written with decomposed accents', async () => {
    const { task } = await readTaskWithStatus('a\u0300 valider par Zoe\u0301')

    expect(task.validator).toBe('Zoe\u0301')
  })

  it('should report a task to validate without a name', async () => {
    const { task, gaps } = await readTaskWithStatus('à valider')

    expect(task.validator).toBeNull()
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'validation_without_name',
        severity: 'warning',
        message: "Dans PLAN.md, la tâche 1 est à valider sans dire par qui. L'état s'écrit « à valider par Nom ».",
      },
    ])
  })

  it('should give no validator to a task in another state', async () => {
    const { task } = await readTaskWithStatus('en cours par Camille')

    expect(task.validator).toBeNull()
  })
})

describe('readDossier finished task', () => {
  it('should read the date and the proof of a finished task', async () => {
    const { task, gaps } = await readTaskWithStatus('fait le 12 mars, commit `1a2b3c4`')

    expect(task).toMatchObject({ doneOn: '2026-03-12', proof: 'commit `1a2b3c4`' })
    expect(gaps).toEqual([])
  })

  it.each([
    ['fait le 1er décembre 2025 — lien https://exemple.org/recettes', '2025-12-01', 'lien https://exemple.org/recettes'],
    ['fait le 2026-03-12 : fichier docs/Recettes.md.', '2026-03-12', 'fichier docs/Recettes.md'],
    ['Fait le 3 février; Essai À la main', '2026-02-03', 'Essai À la main'],
  ])('should read "%s" as done on %s with the proof "%s"', async (status, doneOn, proof) => {
    const { task } = await readTaskWithStatus(status)

    expect(task).toMatchObject({ doneOn, proof })
  })

  it('should keep the proof as written after a date written with a decomposed accent', async () => {
    const { task } = await readTaskWithStatus('fait le 12 fe\u0301vrier, commit `1a2b3c4`')

    expect(task).toMatchObject({ doneOn: '2026-02-12', proof: 'commit `1a2b3c4`' })
  })

  it('should report a finished task whose date has no proof after it', async () => {
    const { task, gaps } = await readTaskWithStatus('fait le 12 mars.')

    expect(task).toMatchObject({ doneOn: '2026-03-12', proof: null })
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'done_without_proof',
        severity: 'warning',
        message: "Dans PLAN.md, la tâche 1 est faite sans preuve. La date est suivie d'un commit, d'un lien ou d'un fichier.",
      },
    ])
  })

  it.each(['fait', 'fait.', 'fait le lundi, commit `1a2b3c4`', 'fait le 31 février, commit `1a2b3c4`'])(
    'should report a finished task without a readable date: "%s"',
    async (status) => {
      const { task, gaps } = await readTaskWithStatus(status)

      expect(task).toMatchObject({ doneOn: null, proof: null })
      expect(gaps).toEqual([
        {
          source: 'plan',
          kind: 'done_without_date',
          severity: 'warning',
          message: "Dans PLAN.md, la tâche 1 est faite sans date. L'état s'écrit « fait le 12 mars, » suivi de la preuve.",
        },
      ])
    }
  )

  it('should place a finished date without year in the year before when it would fall after the state date', async () => {
    const { task } = await readTaskWithStatus('fait le 28 décembre, commit `1a2b3c4`', 'Où en est le projet (2027-01-05)')

    expect(task.doneOn).toBe('2026-12-28')
  })

  it('should give no date and no proof to a task in another state', async () => {
    const { task } = await readTaskWithStatus('plus tard le 12 mars, commit `1a2b3c4`')

    expect(task).toMatchObject({ doneOn: null, proof: null })
  })
})

describe('readDossier dates without year when the plan has no state date', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 0, 5, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should place a request date without year against today', async () => {
    const { item } = await readWaitingLineOf('Ouvrir la page. Demandé le 28 décembre.', 'Où en est le projet')

    expect(item.requestedOn).toBe('2026-12-28')
  })

  it('should place a finished date without year against today', async () => {
    const { task } = await readTaskWithStatus('fait le 3 janvier, commit `1a2b3c4`', 'Où en est le projet')

    expect(task.doneOn).toBe('2027-01-03')
  })
})

// --- Waiting lines ---

describe('readDossier waiting lines', () => {
  it.each([
    ['Ouvrir la page. Demandé le 22 novembre.', '2026-11-22'],
    ['Ouvrir la page. Demandé le 1er décembre 2025.', '2025-12-01'],
    ['Ouvrir la page. Demandé le 2026-11-20.', '2026-11-20'],
    ['Ouvrir la page. demande le 3 fevrier 2026.', '2026-02-03'],
    ['Ouvrir la page. Demandé le 15 aout.', '2026-08-15'],
  ])('should read the request date of "%s"', async (line, requestedOn) => {
    const { item, gaps } = await readWaitingLineOf(line)

    expect(item.requestedOn).toBe(requestedOn)
    expect(gaps).toEqual([])
  })

  it.each([
    'Ouvrir la page.',
    'Ouvrir la page. Demandé le 31 février.',
    'Ouvrir la page. Demandé le 2026-02-30.',
    'Ouvrir la page. Demandé le lundi.',
  ])('should report a waiting line without a readable request date: "%s"', async (line) => {
    const { item, gaps } = await readWaitingLineOf(line)

    expect(item.requestedOn).toBeNull()
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'waiting_without_date',
        severity: 'warning',
        message: "Dans PLAN.md, la ligne 1 de « Ce qui attend » n'a pas de « Demandé le » suivi d'une date lisible.",
      },
    ])
  })

  it('should place a request without year in the year before when it would fall after the state date', async () => {
    const { item } = await readWaitingLineOf('Ouvrir la page. Demandé le 28 décembre.', 'Où en est le projet (2027-01-05)')

    expect(item.requestedOn).toBe('2026-12-28')
  })

  it('should join a numbered line with its indented continuation', async () => {
    const { plan } = await readPlanOf(
      stateSection(),
      tasksSection(),
      waitingSection('1. Ouvrir la page.', '   Demandé le 22 novembre.', '2. Choisir l’hébergement. Demandé le 21 novembre.')
    )

    expect(plan.waiting.map((item) => [item.position, item.text])).toEqual([
      [1, 'Ouvrir la page. Demandé le 22 novembre.'],
      [2, 'Choisir l’hébergement. Demandé le 21 novembre.'],
    ])
  })
})

describe('readDossier who answers a waiting line', () => {
  it('should address every line to the name ending the heading', async () => {
    const { waiting, gaps } = await readWaitingSectionOf(
      'Ce qui attend Camille',
      '1. Relire la page. Demandé le 20 novembre.',
      '2. Choisir un format. Demandé le 21 novembre.'
    )

    expect(waiting.map((item) => item.addressee)).toEqual(['Camille', 'Camille'])
    expect(gaps).toEqual([])
  })

  it('should address a line to the name written after its date', async () => {
    const { waiting } = await readWaitingSectionOf('Ce qui attend Camille', '1. Relire la page. Demandé le 20 novembre à Jeanne.')

    expect(waiting[0]?.addressee).toBe('Jeanne')
  })

  it('should read the name after an ISO date and keep its accent', async () => {
    const { waiting, gaps } = await readWaitingSectionOf(
      'Ce qui attend',
      '1. Relire la page. Demandé le 2026-11-20 à Zoé, par courriel.'
    )

    expect(waiting[0]?.addressee).toBe('Zoé')
    expect(gaps).toEqual([])
  })

  it('should report a dated line that names nobody under a heading without a name', async () => {
    const { waiting, gaps } = await readWaitingSectionOf('Ce qui attend', '1. Relire la page. Demandé le 20 novembre.')

    expect(waiting[0]?.addressee).toBeNull()
    expect(gaps).toEqual([
      {
        source: 'plan',
        kind: 'waiting_without_addressee',
        severity: 'warning',
        message:
          "Dans PLAN.md, la ligne 1 de « Ce qui attend » ne dit pas qui doit répondre. Le nom s'écrit dans le titre, ou après la date avec « à Nom ».",
      },
    ])
  })

  it('should not report a missing addressee on a line without a date', async () => {
    const { gaps } = await readWaitingSectionOf('Ce qui attend', '1. Relire la page.')

    expect(kindsOf(gaps)).toEqual(['waiting_without_date'])
  })

  it('should address an undated line to the name ending the heading', async () => {
    const { waiting } = await readWaitingSectionOf('Ce qui attend Camille', '1. Relire la page.')

    expect(waiting[0]?.addressee).toBe('Camille')
  })
})

// --- Task references ---

describe('readDossier task references', () => {
  it.each([
    ['Cela valide la tâche 1.', [1]],
    ['Cela valide les tâches 2 et 3.', [2, 3]],
    ['Cela valide la tache 4.', [4]],
    ['Cela valide les Tâches 5, 6 et 7.', [5, 6, 7]],
    ['Cela ne valide rien.', []],
  ])('should find the tasks cited in "%s"', async (text, taskNumbers) => {
    const { item } = await readWaitingLineOf(`${text} Demandé le 22 novembre.`)

    expect(item.taskNumbers).toEqual(taskNumbers)
  })

  it('should list a task cited twice only once', async () => {
    const { item } = await readWaitingLineOf('La tâche 1 puis encore la tâche 1. Demandé le 22 novembre.')

    expect(item.taskNumbers).toEqual([1])
  })
})

// --- JOURNAL.md ---

describe('readDossier journal', () => {
  it('should read the text in parentheses after the date as note', async () => {
    const { journal } = await readJournalOf(journalFile(sessionSection('2026-07-02 (reconstitué depuis git)')))

    expect(journal[0]).toMatchObject({ date: '2026-07-02', note: 'reconstitué depuis git' })
  })

  it('should discard a heading without a date and report it', async () => {
    const { journal, gaps } = await readJournalOf(journalFile(sessionSection('2026-11-22'), sessionSection('Notes diverses')))

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
    expect(gaps).toEqual([
      {
        source: 'journal',
        kind: 'journal_heading_without_date',
        severity: 'error',
        message: 'Dans JOURNAL.md, le titre « Notes diverses » ne commence pas par une date valide. Il est écarté.',
      },
    ])
  })

  it('should discard a heading whose date does not exist in the calendar', async () => {
    const { journal, gaps } = await readJournalOf(journalFile(sessionSection('2026-13-01')))

    expect(journal).toEqual([])
    expect(kindsOf(gaps)).toEqual(['journal_heading_without_date'])
  })

  it('should keep a session without bullet with no point', async () => {
    const { journal } = await readJournalOf(journalFile(section('2026-11-22', 'Séance courte.')))

    expect(journal).toEqual([{ date: '2026-11-22', note: null, points: [] }])
  })

  it('should return the sessions from the most recent to the oldest', async () => {
    const { journal } = await readJournalOf(
      journalFile(sessionSection('2026-07-03'), sessionSection('2026-11-22'), sessionSection('2026-11-20'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22', '2026-11-20', '2026-07-03'])
  })

  it('should report no gap for a session with its three points', async () => {
    const { gaps } = await readJournalOf(journalFile(sessionSection('2026-11-22')))

    expect(gaps).toEqual([])
  })

  it('should report the points a session lacks in a single gap', async () => {
    const { gaps } = await readJournalOf(journalFile(section('2026-11-22', '- **Fait.** La liste.')))

    expect(gaps).toEqual([
      {
        source: 'journal',
        kind: 'session_missing_point',
        severity: 'warning',
        message: "Dans JOURNAL.md, la séance du 2026-11-22 n'a pas de point « Appris. », « Bloque. ».",
      },
    ])
  })

  it('should compare the point labels without case, accents or final periods', async () => {
    const { gaps } = await readJournalOf(
      journalFile(section('2026-11-22', '- **FAIT** La liste.', '- **appris..** Rien.', '- **Bloqué.** Rien.'))
    )

    expect(gaps).toEqual([])
  })

  it('should not count a label followed by a colon as the expected point', async () => {
    const { journal, gaps } = await readJournalOf(
      journalFile(section('2026-11-22', '- **Fait :** La liste.', '- **Appris.** Rien.', '- **Bloque.** Rien.'))
    )

    expect(journal[0]?.points[0]?.label).toBe('Fait')
    expect(gaps.map((gap) => gap.message)).toEqual(["Dans JOURNAL.md, la séance du 2026-11-22 n'a pas de point « Fait. »."])
  })

  it('should report sessions that do not go from the most recent to the oldest in the file', async () => {
    const { gaps } = await readJournalOf(journalFile(sessionSection('2026-11-20'), sessionSection('2026-11-22')))

    expect(gaps).toEqual([
      {
        source: 'journal',
        kind: 'journal_out_of_order',
        severity: 'warning',
        message: 'Dans JOURNAL.md, les séances ne vont pas de la plus récente à la plus ancienne.',
      },
    ])
  })

  it('should leave the sessions without a date out of the order check', async () => {
    const { gaps } = await readJournalOf(
      journalFile(sessionSection('2026-11-22'), sessionSection('Notes'), sessionSection('2026-11-20'))
    )

    expect(kindsOf(gaps)).toEqual(['journal_heading_without_date'])
  })

  it('should report a journal without any level-2 heading', async () => {
    const { journal, gaps } = await readJournalOf('# Journal\n\nRien encore.\n')

    expect(journal).toEqual([])
    expect(gaps).toEqual([
      { source: 'journal', kind: 'journal_without_session', severity: 'warning', message: "JOURNAL.md n'a encore aucune séance." },
    ])
  })
})

// --- What the plan and the journal say together ---

describe('readDossier plan against journal', () => {
  it('should report a state older than the latest session', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow()], 'Où en est le projet (2026-11-20)'),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
    })

    expect(gapsOf(dossier, 'plan')).toEqual([
      {
        source: 'plan',
        kind: 'state_behind_journal',
        severity: 'warning',
        message:
          "L'état du projet dans PLAN.md date du 2026-11-20, et JOURNAL.md a une séance du 2026-11-22. L'état est à mettre à jour.",
      },
    ])
  })

  it('should report a latest session older than the state', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow()]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-20')),
    })

    expect(gapsOf(dossier, 'journal')).toEqual([
      {
        source: 'journal',
        kind: 'journal_behind_state',
        severity: 'warning',
        message:
          "L'état du projet dans PLAN.md date du 2026-11-22, et la dernière séance de JOURNAL.md est du 2026-11-20. La séance du 2026-11-22 manque au journal.",
      },
    ])
  })

  it('should compare the state date with the most recent session whatever the file order', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow()]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-20'), sessionSection('2026-11-22')),
    })

    expect(kindsOf(dossier.gaps)).toEqual(['journal_out_of_order', 'no_decision'])
  })

  it('should report a task in progress that no session cites', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ number: '2', status: 'en cours' })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
    })

    expect(gapsOf(dossier, 'journal')).toEqual([
      {
        source: 'journal',
        kind: 'task_not_in_journal',
        severity: 'warning',
        message: 'La tâche 2 est « en cours » dans PLAN.md, et aucune séance de JOURNAL.md ne cite « tâche 2 ».',
      },
    ])
  })

  it('should find a task cited in a paragraph of a session', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ number: '2', status: 'à valider par Camille' })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22') + '\n\nLa tâche 2 attend Camille.'),
    })

    expect(gapsOf(dossier, 'journal')).toEqual([])
  })

  it('should find the tasks cited together as "tâches 2 et 3"', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([
        taskRow({ number: '2', status: 'en cours' }),
        taskRow({ number: '3', status: 'fait le 22 novembre, commit `1a2b3c4`' }),
      ]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22', 'Les tâches 2 et 3 avancent.')),
    })

    expect(gapsOf(dossier, 'journal')).toEqual([])
  })

  it('should not count a task cited only in a session heading', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ number: '2', status: 'en cours' })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22 (tâche 2)')),
    })

    expect(kindsOf(gapsOf(dossier, 'journal'))).toEqual(['task_not_in_journal'])
  })

  it('should not count a task cited only in a session without a date', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ number: '2', status: 'en cours' })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22'), sessionSection('Notes', 'La tâche 2 avance.')),
    })

    expect(kindsOf(gapsOf(dossier, 'journal'))).toEqual(['journal_heading_without_date', 'task_not_in_journal'])
  })

  it.each(['à faire', 'plus tard'])('should not report a task "%s" that no session cites', async (status) => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ status })]),
      'JOURNAL.md': journalFile(sessionSection('2026-11-22')),
    })

    expect(gapsOf(dossier, 'journal')).toEqual([])
  })

  it('should report no crossed gap for a project without a journal', async () => {
    const dossier = await readDossierOf({ 'PLAN.md': planWithTasks([taskRow({ status: 'en cours' })]) })

    expect(kindsOf(dossier.gaps)).toEqual(['missing_file', 'no_decision'])
  })

  it('should report no crossed gap when the journal has no dated session', async () => {
    const dossier = await readDossierOf({
      'PLAN.md': planWithTasks([taskRow({ status: 'en cours' })]),
      'JOURNAL.md': '# Journal\n\nRien encore.\n',
    })

    expect(kindsOf(dossier.gaps)).toEqual(['journal_without_session', 'no_decision'])
  })
})

// --- Decisions ---

describe('readDossier decisions', () => {
  it('should report a single no_decision gap when no decision location exists', async () => {
    const { decisions, gaps } = await readDecisionsOf({})

    expect(decisions).toEqual([])
    expect(gaps).toEqual([
      {
        source: 'decisions',
        kind: 'no_decision',
        severity: 'warning',
        message: "Aucune décision n'est notée, ni dans DECISIONS.md ni dans docs/decisions/.",
      },
    ])
  })

  it('should report a DECISIONS.md without any decision heading as no decision', async () => {
    const { decisions, gaps } = await readDecisionsOf({ 'DECISIONS.md': 'Aucune décision pour le moment.\n' })

    expect(decisions).toEqual([])
    expect(kindsOf(gaps)).toEqual(['no_decision'])
  })

  it('should read the level-3 entries of DECISIONS.md under group headings', async () => {
    const dossier = await readFixture('grouped-decisions')

    expect(dossier.decisions.map((decision) => [decision.title, decision.date, decision.status])).toEqual([
      ['Passer à un seul fichier de recettes', '2026-03-10', 'validee'],
      ['Démarrer le carnet', '2025-12-01', null],
      ['Choisir une police lisible', null, null],
    ])
  })

  it('should read a dated decision with a "Contexte" subheading as one decision', async () => {
    const { decisions } = await readDecisionsOf({
      'DECISIONS.md': '# Décisions\n\n## 2026-03-10 — Garder SQLite\n\n### Contexte\n\nUn seul poste.\n',
    })

    expect(decisions.map((decision) => [decision.title, decision.date])).toEqual([['Garder SQLite', '2026-03-10']])
  })

  it('should read a decision whose heading opens with an id as one decision', async () => {
    const { decisions } = await readDecisionsOf({
      'DECISIONS.md': '# Décisions\n\n## ADR-005 — Garder SQLite\n\n**Date** : 2026-03-10\n\n### Contexte\n',
    })

    expect(decisions.map((decision) => [decision.id, decision.title, decision.date])).toEqual([
      ['ADR-005', 'Garder SQLite', '2026-03-10'],
    ])
  })

  it('should read a section with a status field before its first subheading as one decision', async () => {
    const { decisions } = await readDecisionsOf({
      'DECISIONS.md': '# Décisions\n\n## Choisir l’hébergement\n\n**Statut** : accepté\n\n### Contexte\n',
    })

    expect(decisions.map((decision) => [decision.title, decision.status])).toEqual([['Choisir l’hébergement', 'accepté']])
  })

  it('should ignore the fields written under the subheadings of a decision', async () => {
    const { decisions } = await readDecisionsOf({
      'DECISIONS.md': '# Décisions\n\n## 2026-03-10 — Garder SQLite\n\n### Suite\n\n**Statut** : remplacé\n',
    })

    expect(decisions[0]?.status).toBeNull()
  })

  it('should read a dated decision and a group of older decisions in the same file', async () => {
    const { decisions } = await readDecisionsOf({
      'DECISIONS.md': [
        '# Décisions',
        '',
        '## 2026-03-10 — Garder SQLite',
        '',
        '### Contexte',
        '',
        '## Anciennes décisions',
        '',
        '### [2025-12-01] Démarrer le carnet',
        '',
        '### Choisir une police lisible',
        '',
      ].join('\n'),
    })

    expect(decisions.map((decision) => [decision.title, decision.date])).toEqual([
      ['Garder SQLite', '2026-03-10'],
      ['Démarrer le carnet', '2025-12-01'],
      ['Choisir une police lisible', null],
    ])
  })

  it('should report a decision of DECISIONS.md without a date by its heading', async () => {
    const { gaps } = await readDecisionsOf({ 'DECISIONS.md': '# Décisions\n\n## Garder une seule base\n' })

    expect(gaps).toEqual([
      {
        source: 'decisions',
        kind: 'decision_without_date',
        severity: 'warning',
        message: "Dans DECISIONS.md, la décision « Garder une seule base » n'a pas de date.",
      },
    ])
  })

  it('should report a decision file without a date by its path', async () => {
    const { gaps } = await readDecisionsOf({ 'docs/decisions/001-base.md': '# ADR-001 — Garder une seule base\n' })

    expect(gaps).toEqual([
      {
        source: 'decisions',
        kind: 'decision_without_date',
        severity: 'warning',
        message: "La décision docs/decisions/001-base.md n'a pas de date.",
      },
    ])
  })

  it.each(['docs/decisions/README.md', 'vault/decisions/readme.md'])('should not read %s as a decision', async (path) => {
    const { decisions, gaps } = await readDecisionsOf({ [path]: '# Les décisions du carnet\n' })

    expect(decisions).toEqual([])
    expect(kindsOf(gaps)).toEqual(['no_decision'])
  })

  it('should report a DECISIONS.md that is a directory as unreadable', async () => {
    const { gaps } = await readDecisionsOf({ 'DECISIONS.md/notes.md': 'Un dossier à la place du fichier.' })

    expect(gaps[0]).toEqual({
      source: 'decisions',
      kind: 'unreadable_file',
      severity: 'error',
      message: "DECISIONS.md existe mais n'a pas pu être lu.",
    })
  })

  it('should report a decision folder without read permission as unreadable', async () => {
    const projectDir = await createProject({ 'docs/decisions/001-base.md': '# ADR-001 — Base\n\n**Date** : 2026-03-10\n' })
    const folderPath = join(projectDir, 'docs', 'decisions')
    await chmod(folderPath, 0o000)

    const dossier = await readDossier(projectDir)
    await chmod(folderPath, 0o755)

    expect(gapsOf(dossier, 'decisions')[0]).toEqual({
      source: 'decisions',
      kind: 'unreadable_file',
      severity: 'error',
      message: "Le dossier docs/decisions existe mais n'a pas pu être lu.",
    })
  })

  it('should report a decision file without read permission as unreadable', async () => {
    const projectDir = await createProject({ 'vault/decisions/base.md': '# Base\n' })
    const filePath = join(projectDir, 'vault', 'decisions', 'base.md')
    await chmod(filePath, 0o000)

    const dossier = await readDossier(projectDir)
    await chmod(filePath, 0o644)

    expect(kindsOf(gapsOf(dossier, 'decisions'))).toEqual(['unreadable_file', 'no_decision'])
  })

  it('should read a decision file reached through a symbolic link', async () => {
    const projectDir = await createProject({ 'notes/001-base.md': '# ADR-001 — Base\n\n**Date** : 2026-03-10\n' })
    await mkdir(join(projectDir, 'docs', 'decisions'), { recursive: true })
    await symlink(join(projectDir, 'notes', '001-base.md'), join(projectDir, 'docs', 'decisions', '001-base.md'))

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions.map((decision) => decision.id)).toEqual(['ADR-001'])
  })

  it('should take the title from the file name when a decision file has no heading', async () => {
    const projectDir = await createProject({ 'vault/decisions/2026-11-10-choisir-un-nom.md': 'Le nom reste à trouver.\n' })

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions).toEqual([
      {
        id: null,
        title: '2026-11-10-choisir-un-nom',
        date: '2026-11-10',
        status: null,
        path: join(projectDir, 'vault', 'decisions', '2026-11-10-choisir-un-nom.md'),
      },
    ])
  })

  it('should still read a decision whose frontmatter is invalid and report it', async () => {
    const { decisions, gaps } = await readDecisionsOf({
      'vault/decisions/cassee.md': '---\ntitle: [non fermé\n---\n\n# Garder une seule base\n\n**Date** : 2026-11-10\n',
    })

    expect(decisions[0]?.title).toBe('Garder une seule base')
    expect(kindsOf(gaps)).toEqual(['unreadable_frontmatter'])
  })

  it('should report an invalid frontmatter again when the same decision is read a second time', async () => {
    const projectDir = await createProject({
      'vault/decisions/relue.md': '---\ntitle: [relue deux fois\n---\n\n# Changer de base\n\n**Date** : 2026-11-10\n',
    })
    await readDossier(projectDir)

    const dossier = await readDossier(projectDir)

    expect(kindsOf(gapsOf(dossier, 'decisions'))).toEqual(['unreadable_frontmatter'])
  })

  it('should read a decision whose frontmatter is written in JavaScript without running its code', async () => {
    const { decisions, gaps } = await readDecisionsOf({
      'vault/decisions/piegee.md':
        '---js\n{ title: (globalThis.__dossierTestRan = true, "x") }\n---\n\n# Garder une seule base\n\n**Date** : 2026-11-10\n',
    })

    expect((globalThis as Record<string, unknown>).__dossierTestRan).toBeUndefined()
    expect(decisions[0]?.title).toBe('Garder une seule base')
    expect(kindsOf(gaps)).toEqual(['unreadable_frontmatter'])
  })

  it('should return the decision files of the same date from the highest file name to the lowest', async () => {
    const { decisions } = await readDecisionsOf({
      'docs/decisions/001-liste.md': '# ADR-001 — Afficher la liste\n\n**Date** : 2026-11-22\n',
      'docs/decisions/002-import.md': '# ADR-002 — Importer un fichier\n\n**Date** : 2026-11-22\n',
      'docs/decisions/003-partage.md': '# ADR-003 — Partager une recette\n\n**Date** : 2026-11-22\n',
    })

    expect(decisions.map((decision) => decision.id)).toEqual(['ADR-003', 'ADR-002', 'ADR-001'])
  })
})

// --- Fenced code blocks ---

describe('readDossier fenced code blocks', () => {
  it('should ignore a heading, a table and a comment written in a code block of the plan', async () => {
    const example = section(
      'Comment écrire le plan',
      '```markdown',
      '## Prochaines tâches',
      table(TASK_HEADER, [taskRow({ number: '9', task: '**Fausse tâche.** Un exemple.' })]),
      '# commentaire',
      '```'
    )

    const { plan, gaps } = await readPlanOf(stateSection(), example, tasksSection(), waitingSection())

    expect(plan.tasks.map((task) => task.number)).toEqual([1])
    expect(gaps).toEqual([])
  })

  it('should ignore a session heading written in a code block of the journal', async () => {
    const { journal, gaps } = await readJournalOf(
      journalFile(sessionSection('2026-11-22') + '\n\n' + ['```', '## 2026-01-01', '- **Fait.** Faux.', '```'].join('\n'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
    expect(journal[0]?.points).toHaveLength(3)
    expect(gaps).toEqual([])
  })

  it('should ignore a heading and a status written in a code block of a DECISIONS.md entry', async () => {
    const { decisions, gaps } = await readDecisionsOf({
      'DECISIONS.md': [
        '# Décisions',
        '',
        '## 2026-11-19 — Garder un seul fichier',
        '',
        '```bash',
        '# commentaire',
        '### Fausse décision',
        '**Statut** : faux',
        '```',
        '',
        '**Statut** : validee',
        '',
        '## 2026-11-10 — Démarrer le carnet',
        '',
      ].join('\n'),
    })

    expect(decisions.map((decision) => [decision.title, decision.date, decision.status])).toEqual([
      ['Garder un seul fichier', '2026-11-19', 'validee'],
      ['Démarrer le carnet', '2026-11-10', null],
    ])
    expect(gaps).toEqual([])
  })

  it('should keep a block opened by four backticks open across a line of three backticks', async () => {
    const { journal } = await readJournalOf(
      journalFile(section('2026-11-22', '````markdown', '```', '## 2026-01-01', '```', '````', '- **Fait.** La liste.'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
    expect(journal[0]?.points).toHaveLength(1)
  })

  it('should ignore everything after a code block that is never closed', async () => {
    const { journal } = await readJournalOf(
      journalFile(section('2026-11-22', '- **Fait.** La liste.', '~~~'), section('2026-01-01', '- **Fait.** Faux.'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
  })
})
