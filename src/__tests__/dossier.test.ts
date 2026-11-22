import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { readDossier } from '@/lib/parsers/dossier'
import type { Dossier, DossierGap, DossierJournalEntry, DossierPlan } from '@/lib/types'

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

async function readPlanOf(...sections: string[]): Promise<{ plan: DossierPlan; gaps: DossierGap[] }> {
  const projectDir = await createProject({ 'PLAN.md': planFile(...sections) })
  const dossier = await readDossier(projectDir)
  return { plan: dossier.plan!, gaps: gapsOf(dossier, 'plan') }
}

async function readTasksOf(header: string[], rows: string[][]) {
  return readPlanOf(stateSection(), section('Prochaines tâches', table(header, rows)), waitingSection())
}

async function readWaitingLineOf(line: string, stateHeading?: string) {
  const { plan, gaps } = await readPlanOf(stateSection(stateHeading), tasksSection(), waitingSection(`1. ${line}`))
  return { item: plan.waiting[0]!, gaps }
}

async function readJournalOf(text: string): Promise<{ journal: DossierJournalEntry[]; gaps: DossierGap[] }> {
  const projectDir = await createProject({ 'JOURNAL.md': text })
  const dossier = await readDossier(projectDir)
  return { journal: dossier.journal!, gaps: gapsOf(dossier, 'journal') }
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
    ])
  })

  it('should return the absolute project path when given a relative one', async () => {
    const absolutePath = join(FIXTURES_DIR, 'complete')

    const dossier = await readDossier(relative(process.cwd(), absolutePath))

    expect(dossier.projectPath).toBe(absolutePath)
  })

  it('should report a missing JOURNAL.md and still read the plan', async () => {
    const projectDir = await createProject({ 'PLAN.md': planFile(stateSection(), tasksSection(), waitingSection()) })

    const dossier = await readDossier(projectDir)

    expect(dossier.journal).toBeNull()
    expect(dossier.plan?.tasks).toHaveLength(1)
    expect(dossier.gaps).toEqual([
      { source: 'journal', kind: 'missing_file', message: 'JOURNAL.md est absent du projet.' },
    ])
  })

  it('should report an unreadable PLAN.md and still read the journal and the decisions', async () => {
    const projectDir = await createProject({
      'JOURNAL.md': journalFile(section('2026-11-22', '- **Fait.** La liste s’affiche.')),
      'docs/decisions/001-liste.md': '# ADR-001 — Afficher la liste\n',
    })
    await mkdir(join(projectDir, 'PLAN.md'))

    const dossier = await readDossier(projectDir)

    expect(dossier.plan).toBeNull()
    expect(kindsOf(dossier.gaps)).toEqual(['unreadable_file'])
    expect(dossier.journal).toHaveLength(1)
    expect(dossier.decisions).toHaveLength(1)
  })

  it('should report an empty PLAN.md with a single empty_file gap', async () => {
    const projectDir = await createProject({ 'PLAN.md': '\n' })

    const dossier = await readDossier(projectDir)

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
    const projectDir = await createProject({ 'PLAN.md': lfPlan.replace(/\n/g, '\r\n') })

    const dossier = await readDossier(projectDir)

    expect(dossier.plan?.stateDate).toBe('2026-11-22')
    expect(dossier.plan?.tasks[0]?.title).toBe('Voir la liste')
    expect(dossier.plan?.waiting[0]?.requestedOn).toBe('2026-11-22')
    expect(gapsOf(dossier, 'plan')).toEqual([])
  })
})

// --- Complete fixture ---

describe('readDossier on a complete dossier', () => {
  it('should report no gap', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.gaps).toEqual([])
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

  it('should read the waiting lines with their rank, request date and cited tasks', async () => {
    const dossier = await readFixture('complete')

    expect(dossier.plan?.waiting).toEqual([
      {
        position: 1,
        text: 'Ouvrir la page et dire si la liste est lisible. Demandé le 22 novembre, la réponse attendue est « vu ».',
        requestedOn: '2026-11-22',
        taskNumbers: [],
      },
      {
        position: 2,
        text: "Choisir l'hébergement. Avec la ligne 1, cela valide la tâche 1. Demandé le 2026-11-21.",
        requestedOn: '2026-11-21',
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
      { source: 'plan', kind: 'task_without_done_when', message: "Dans PLAN.md, la tâche 3 n'a pas de « Fini quand »." },
    ])
  })

  it('should keep an escaped pipe inside its cell', async () => {
    const { plan } = await readTasksOf(TASK_HEADER, [taskRow({ doneWhen: 'La commande `a \\| b` passe.' })])

    expect(plan.tasks[0]?.doneWhen).toBe('La commande `a | b` passe.')
  })

  it('should discard a row whose number is not an integer and report it', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ number: '5a' }), taskRow({ number: '6' })])

    expect(plan.tasks.map((task) => task.number)).toEqual([6])
    expect(kindsOf(gaps)).toEqual(['unreadable_task_row'])
    expect(gaps[0]?.message).toContain('« 5a »')
  })

  it('should give the unknown status to an unknown state and report it', async () => {
    const { plan, gaps } = await readTasksOf(TASK_HEADER, [taskRow({ status: 'bloqué par le fournisseur' })])

    expect(plan.tasks[0]).toMatchObject({ status: 'unknown', statusText: 'bloqué par le fournisseur' })
    expect(kindsOf(gaps)).toEqual(['unknown_status'])
  })

  it.each([
    ['à faire', 'todo'],
    ['En cours depuis lundi', 'in_progress'],
    ['à valider par Louis', 'to_validate'],
    ['a valider', 'to_validate'],
    ['Fait le 22 novembre, commit `a9f228a`', 'done'],
    ['plus tard', 'later'],
  ])('should read the state "%s" as %s', async (statusText, status) => {
    const { plan } = await readTasksOf(TASK_HEADER, [taskRow({ status: statusText })])

    expect(plan.tasks[0]?.status).toBe(status)
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
        message: "Dans PLAN.md, la ligne 1 de « Ce qui attend » n'a pas de « Demandé le » suivi d'une date lisible.",
      },
    ])
  })

  it('should place a request without year in the year before when it would fall after the state date', async () => {
    const { item } = await readWaitingLineOf('Ouvrir la page. Demandé le 28 décembre.', 'Où en est le projet (2027-01-05)')

    expect(item.requestedOn).toBe('2026-12-28')
  })

  it('should leave a request without year undated when the plan has no state date', async () => {
    const { item, gaps } = await readWaitingLineOf('Ouvrir la page. Demandé le 22 novembre.', 'Où en est le projet')

    expect(item.requestedOn).toBeNull()
    expect(kindsOf(gaps)).toEqual(['missing_state_date'])
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
    const { journal } = await readJournalOf(journalFile(section('2026-07-02 (reconstitué depuis git)', '- **Fait.** Rien.')))

    expect(journal[0]).toMatchObject({ date: '2026-07-02', note: 'reconstitué depuis git' })
  })

  it('should discard a heading without a date and report it', async () => {
    const { journal, gaps } = await readJournalOf(
      journalFile(section('Notes diverses', '- **Fait.** Rien.'), section('2026-11-22', '- **Fait.** La liste.'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
    expect(gaps).toEqual([
      {
        source: 'journal',
        kind: 'journal_heading_without_date',
        message: 'Dans JOURNAL.md, le titre « Notes diverses » ne commence pas par une date valide. Il est écarté.',
      },
    ])
  })

  it('should discard a heading whose date does not exist in the calendar', async () => {
    const { journal, gaps } = await readJournalOf(journalFile(section('2026-13-01', '- **Fait.** Rien.')))

    expect(journal).toEqual([])
    expect(kindsOf(gaps)).toEqual(['journal_heading_without_date'])
  })

  it('should keep a session without bullet with no point', async () => {
    const { journal, gaps } = await readJournalOf(journalFile(section('2026-11-22', 'Séance courte.')))

    expect(journal).toEqual([{ date: '2026-11-22', note: null, points: [] }])
    expect(gaps).toEqual([])
  })

  it('should return the sessions from the most recent to the oldest', async () => {
    const { journal } = await readJournalOf(
      journalFile(section('2026-07-03'), section('2026-11-22'), section('2026-11-20'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22', '2026-11-20', '2026-07-03'])
  })
})

// --- Decisions ---

describe('readDossier decisions', () => {
  it('should return no decision and no gap when no decision location exists', async () => {
    const projectDir = await createProject({})

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions).toEqual([])
    expect(gapsOf(dossier, 'decisions')).toEqual([])
  })

  it('should read the level-3 entries of DECISIONS.md under group headings', async () => {
    const dossier = await readFixture('grouped-decisions')

    expect(dossier.decisions.map((decision) => [decision.title, decision.date, decision.status])).toEqual([
      ['Passer à un seul fichier de recettes', '2026-03-10', 'validee'],
      ['Démarrer le carnet', '2025-12-01', null],
      ['Choisir une police lisible', null, null],
    ])
  })

  it('should report a DECISIONS.md without entry', async () => {
    const projectDir = await createProject({ 'DECISIONS.md': 'Aucune décision pour le moment.\n' })

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions).toEqual([])
    expect(kindsOf(gapsOf(dossier, 'decisions'))).toEqual(['no_decision_entry'])
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
    const projectDir = await createProject({
      'vault/decisions/cassee.md': '---\ntitle: [non fermé\n---\n\n# Garder une seule base\n',
    })

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions[0]?.title).toBe('Garder une seule base')
    expect(kindsOf(gapsOf(dossier, 'decisions'))).toEqual(['unreadable_frontmatter'])
  })

  it('should return the decision files of the same date from the highest file name to the lowest', async () => {
    const projectDir = await createProject({
      'docs/decisions/001-liste.md': '# ADR-001 — Afficher la liste\n\n**Date** : 2026-11-22\n',
      'docs/decisions/002-import.md': '# ADR-002 — Importer un fichier\n\n**Date** : 2026-11-22\n',
      'docs/decisions/003-partage.md': '# ADR-003 — Partager une recette\n\n**Date** : 2026-11-22\n',
    })

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions.map((decision) => decision.id)).toEqual(['ADR-003', 'ADR-002', 'ADR-001'])
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
      journalFile(section('2026-11-22', '- **Fait.** La liste.', '```', '## 2026-01-01', '- **Fait.** Faux.', '```'))
    )

    expect(journal.map((entry) => entry.date)).toEqual(['2026-11-22'])
    expect(journal[0]?.points).toHaveLength(1)
    expect(gaps).toEqual([])
  })

  it('should ignore a heading and a status written in a code block of a DECISIONS.md entry', async () => {
    const projectDir = await createProject({
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

    const dossier = await readDossier(projectDir)

    expect(dossier.decisions.map((decision) => [decision.title, decision.date, decision.status])).toEqual([
      ['Garder un seul fichier', '2026-11-19', 'validee'],
      ['Démarrer le carnet', '2026-11-10', null],
    ])
    expect(gapsOf(dossier, 'decisions')).toEqual([])
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
