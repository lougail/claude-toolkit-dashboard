import { readFile, readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { parseFrontmatter } from '@/lib/parsers/frontmatter'
import type {
  Dossier,
  DossierDecision,
  DossierGap,
  DossierGapKind,
  DossierGapSeverity,
  DossierJournalEntry,
  DossierPlan,
  DossierPoint,
  DossierTask,
  DossierTaskStatus,
  DossierWaitingItem,
} from '@/lib/types'

type GapSource = DossierGap['source']

/**
 * Each kind of gap and its severity. An error is a broken format, where the check command
 * (~/.claude/scripts/check-dossier.py) fails. A warning is content to complete, which the command lists.
 */
const GAP_SEVERITY: Record<DossierGapKind, DossierGapSeverity> = {
  missing_file: 'error',
  unreadable_file: 'error',
  empty_file: 'error',
  missing_title: 'error',
  missing_section: 'error',
  missing_state_date: 'error',
  unreadable_tasks_table: 'error',
  unreadable_task_row: 'error',
  unknown_status: 'error',
  duplicate_task_number: 'error',
  journal_heading_without_date: 'error',
  point_without_label: 'warning',
  task_without_done_when: 'warning',
  validation_without_name: 'warning',
  done_without_date: 'warning',
  done_without_proof: 'warning',
  waiting_without_date: 'warning',
  waiting_without_addressee: 'warning',
  journal_without_session: 'warning',
  session_missing_point: 'warning',
  journal_out_of_order: 'warning',
  state_behind_journal: 'warning',
  journal_behind_state: 'warning',
  task_not_in_journal: 'warning',
  decision_without_date: 'warning',
  no_decision: 'warning',
  unreadable_frontmatter: 'warning',
}

/** The five task states, as they open the normalized "État" cell and end on a word boundary */
const TASK_STATES: ReadonlyArray<{ pattern: RegExp; status: DossierTaskStatus }> = [
  { pattern: /^a faire\b/, status: 'todo' },
  { pattern: /^en cours\b/, status: 'in_progress' },
  { pattern: /^a valider\b/, status: 'to_validate' },
  { pattern: /^fait\b/, status: 'done' },
  { pattern: /^plus tard\b/, status: 'later' },
]

/** A task in one of these states has moved, so the journal is expected to cite it */
const MOVED_STATUSES: DossierTaskStatus[] = ['in_progress', 'to_validate', 'done']

/** Start of the three expected PLAN.md headings, compared without case or accents */
const PLAN_HEADINGS = {
  state: 'Où en est le projet',
  tasks: 'Prochaines tâches',
  waiting: 'Ce qui attend',
}

/** The three points every journal session gives, compared without case, accents or final periods */
const JOURNAL_LABELS = ['Fait', 'Appris', 'Bloque']

type TaskColumn = 'number' | 'task' | 'doneWhen' | 'status'

const TASK_COLUMNS: TaskColumn[] = ['number', 'task', 'doneWhen', 'status']

/** Header names of the task table, compared without case or accents */
const TASK_COLUMN_NAMES: Record<TaskColumn, string> = {
  number: '#',
  task: 'Tâche',
  doneWhen: 'Fini quand',
  status: 'État',
}

/** Month names without accents, as they appear after normalizeText */
const FRENCH_MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
]

/** Folders holding one decision per markdown file, relative to the project */
const DECISION_FOLDERS = ['docs/decisions', 'vault/decisions']

/** Longest text quoted in a gap message, as in the check command */
const QUOTED_TEXT_LIMIT = 60

const COMBINING_MARKS = /[\u0300-\u036f]/g
// The line breaks of Python's str.splitlines, which cuts the text for the check command
const LINE_BREAK = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/
// A code fence opens with at least three backticks or tildes, optionally followed by a language name
const CODE_FENCE = /^\s*(`{3,}|~{3,})(.*)$/
// As in CommonMark, a heading may be indented by up to three spaces. Its text runs to the end of the line
const HEADING = /^ {0,3}(#{1,6})\s+(.*)/
const BULLET_ITEM = /^[-*+]\s+(.*)$/
const NUMBERED_ITEM = /^\d+[.)]\s+(.*)$/
const INDENTED_LINE = /^\s+\S/
const BOLD_START = /^\*\*(.+?)\*\*(.*)$/
// A pattern closed by "+$" opens with a lookbehind, so that it is tried once on each run of characters.
// Without it, a long run that does not close the text is read again from each of its characters.
const TRAILING_PUNCTUATION = /(?<![\s.:;,!?…])[\s.:;,!?…]+$/
const TRAILING_PERIOD = /\.\s*$/
const TRAILING_PERIODS = /(?<!\.)\.+$/
const TABLE_LINE = /^\s*\|/
const TABLE_SEPARATOR = /^[\s|:-]+$/
const TASK_NUMBER = /^\d+$/
const ISO_DATE_START = /^\[?(\d{4})-(\d{2})-(\d{2})\]?/
// The state date is written (YYYY-MM-DD), the closing parenthesis right after the day
const STATE_HEADING_DATE = /\((\d{4}-\d{2}-\d{2})\)/
const JOURNAL_NOTE = /^\d{4}-\d{2}-\d{2}\s*\((.*)\)/
// A name stops at a comma, a semicolon, a colon, an opening parenthesis, or a period followed by a space or the end
const NAME_END = /[,;:(]|\.(?=\s|$)/
// Spaces and signs around the proof of a finished task
const AROUND_PROOF = /^[\s,.;:\-–—]+|(?<![\s,.;:\-–—])[\s,.;:\-–—]+$/g
// The patterns below run on normalized text: lower case, without accents
const REQUESTED_ON = /\bdemande le\s+/
const VALIDATED_BY = /^a valider par\s+(?=\S)/
const DONE_ON = /^fait le\s+/
const ADDRESSED_TO = /^\s*a\s+(?=\S)/
const FRENCH_DATE_START = /^(\d{1,2})(?:er)?\s+([a-z]+)(?:\s+(\d{4}))?/
const TASK_REFERENCE = /\btaches?\s+(\d+(?:\s*(?:,|et)\s*\d+)*)/g
// Decision headings such as "2026-11-20 — Title", "[2026-11-20] Title" or "ADR-005 — Title"
const DECISION_DATE_PREFIX = /^\[?(\d{4}-\d{2}-\d{2})\]?\s*[—–:-]?\s*/
const DECISION_ID_PREFIX = /^([A-Z]{2,}-\d+)\s*[—–:-]?\s*/
// "**Date** : value" and "**Date :** value" are both written. Spaces after a colon are only looked for
// behind a colon: two runs of spaces side by side would share a long run of spaces in every possible way.
const DATE_FIELD = /\*\*date\s*(?::\s*)?\*\*\s*(?::\s*)?(.*)$/i
const STATUS_FIELD = /\*\*statut\s*(?::\s*)?\*\*\s*(?::\s*)?(.*)$/i
const FIELD_SEPARATOR = ' · '

interface Section {
  heading: string
  lines: string[]
}

type FileContent = { status: 'read'; text: string } | { status: 'missing' } | { status: 'unreadable' }

// PLAN.md and JOURNAL.md must be valid UTF-8, as in the check command. The byte order mark stays in the text
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

function decodeStrictly(bytes: Buffer): string {
  return STRICT_UTF8.decode(bytes)
}

/** A decision is read with its invalid bytes replaced, as in the check command */
function decodeLeniently(bytes: Buffer): string {
  return bytes.toString('utf-8')
}

interface JournalReading {
  entries: DossierJournalEntry[]
  /** Task numbers cited anywhere in the text of the dated sessions, headings left out */
  citedTaskNumbers: Set<number>
}

/** A date read in a normalized text, with the position right after it */
interface WrittenDate {
  date: string
  end: number
}

/** Text in lower case without accents, keeping for each of its characters the index it comes from in the original */
interface NormalizedText {
  original: string
  text: string
  origins: number[]
}

interface DecisionSource {
  frontmatter: Record<string, unknown>
  /** Text of the decision heading, empty when there is none */
  heading: string
  /** Lines where "**Date**" and "**Statut**" are looked for */
  headerLines: string[]
  path: string
}

/**
 * Read the dossier kept in a project: PLAN.md, JOURNAL.md and the decisions.
 * Always returns a Dossier. Everything expected that could not be read is listed in gaps.
 */
export async function readDossier(projectDir: string): Promise<Dossier> {
  const projectPath = resolve(projectDir)
  const gaps: DossierGap[] = []
  const plan = await readPlan(projectPath, gaps)
  const journal = await readJournal(projectPath, gaps)
  checkPlanAgainstJournal(plan, journal, gaps)
  const decisions = await readDecisions(projectPath, gaps)
  return { projectPath, plan, journal: journal === null ? null : journal.entries, decisions, gaps }
}

function addGap(gaps: DossierGap[], source: GapSource, kind: DossierGapKind, message: string): void {
  gaps.push({ source, kind, severity: GAP_SEVERITY[kind], message })
}

// --- Files ---

async function readPlan(projectPath: string, gaps: DossierGap[]): Promise<DossierPlan | null> {
  const text = await readDossierFile(projectPath, 'PLAN.md', 'plan', gaps)
  return text === null ? null : parsePlan(text, gaps)
}

async function readJournal(projectPath: string, gaps: DossierGap[]): Promise<JournalReading | null> {
  const text = await readDossierFile(projectPath, 'JOURNAL.md', 'journal', gaps)
  return text === null ? null : parseJournal(text, gaps)
}

async function readDossierFile(
  projectPath: string,
  fileName: string,
  source: GapSource,
  gaps: DossierGap[]
): Promise<string | null> {
  const content = await readFileContent(join(projectPath, fileName), decodeStrictly)
  if (content.status === 'missing') {
    addGap(gaps, source, 'missing_file', `${fileName} est absent du projet.`)
    return null
  }
  if (content.status === 'unreadable') {
    addUnreadableFileGap(gaps, source, fileName)
    return null
  }
  return content.text
}

/** The text of a file that may be absent: an absent file gives null quietly, an unreadable one gives null and a gap */
async function readOptionalFile(
  path: string,
  displayName: string,
  source: GapSource,
  gaps: DossierGap[]
): Promise<string | null> {
  const content = await readFileContent(path, decodeLeniently)
  if (content.status === 'unreadable') {
    addUnreadableFileGap(gaps, source, displayName)
  }
  return content.status === 'read' ? content.text : null
}

/** The file is opened without checking first that it exists, so that only the error tells absent from unreadable */
async function readFileContent(path: string, decode: (bytes: Buffer) => string): Promise<FileContent> {
  try {
    return { status: 'read', text: decode(await readFile(path)) }
  } catch (error) {
    return { status: isMissingPathError(error) ? 'missing' : 'unreadable' }
  }
}

function isMissingPathError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

function addUnreadableFileGap(gaps: DossierGap[], source: GapSource, displayName: string): void {
  addGap(gaps, source, 'unreadable_file', `${displayName} existe mais n'a pas pu être lu.`)
}

// --- Titles ---

/** The first level-1 heading of the file starts with the expected word */
function checkTitle(lines: string[], expected: string, fileName: string, source: GapSource, gaps: DossierGap[]): void {
  const titleLine = lines.find((line) => headingLevel(line) === 1)
  const title = titleLine === undefined ? null : headingText(titleLine)
  if (title !== null && normalizeText(title).startsWith(normalizeText(expected))) {
    return
  }
  const written = title === null ? "n'a aucun titre" : `porte « # ${title} »`
  addGap(gaps, source, 'missing_title', `${fileName} commence par le titre « # ${expected} » dans le format, et ${written}.`)
}

// --- PLAN.md ---

function parsePlan(text: string, gaps: DossierGap[]): DossierPlan {
  if (isBlank(text)) {
    addGap(gaps, 'plan', 'empty_file', 'PLAN.md est vide.')
    return { stateDate: null, state: [], tasks: [], waiting: [] }
  }

  const lines = splitLines(text)
  checkTitle(lines, 'Plan', 'PLAN.md', 'plan', gaps)
  const sections = splitSections(lines, 2)
  const stateSection = findPlanSection(sections, PLAN_HEADINGS.state, gaps)
  const tasksSection = findPlanSection(sections, PLAN_HEADINGS.tasks, gaps)
  const waitingSection = findPlanSection(sections, PLAN_HEADINGS.waiting, gaps)
  const stateDate = stateSection === null ? null : readStateDate(stateSection.heading, gaps)
  // A date written without a year is placed against the state date, or today when the plan has none
  const reference = stateDate ?? today()
  const statePlace = `dans la section « ${PLAN_HEADINGS.state} » de PLAN.md`

  return {
    stateDate,
    state: stateSection === null ? [] : readPoints(readListItems(stateSection.lines, BULLET_ITEM), statePlace, 'plan', gaps),
    tasks: tasksSection === null ? [] : readTasks(tasksSection.lines, reference, gaps),
    waiting: waitingSection === null ? [] : readWaiting(waitingSection, reference, gaps),
  }
}

function findPlanSection(sections: Section[], expectedStart: string, gaps: DossierGap[]): Section | null {
  const section = sections.find((candidate) =>
    normalizeText(candidate.heading).startsWith(normalizeText(expectedStart))
  )
  if (section === undefined) {
    addGap(
      gaps,
      'plan',
      'missing_section',
      `Dans PLAN.md, la section « ${expectedStart} » est absente. ${describeHeadings(sections)}`
    )
    return null
  }
  return section
}

function describeHeadings(sections: Section[]): string {
  if (sections.length === 0) {
    return "Le fichier n'a aucun titre de section."
  }
  const headings = sections.map((section) => `« ${section.heading} »`)
  return `Les titres trouvés sont ${headings.join(', ')}.`
}

function readStateDate(heading: string, gaps: DossierGap[]): string | null {
  const written = STATE_HEADING_DATE.exec(heading)
  const date = written === null ? null : readIsoDate(written[1])
  if (date === null) {
    addGap(gaps, 'plan', 'missing_state_date', `Dans PLAN.md, le titre « ${heading} » n'a pas de date valide entre parenthèses.`)
  }
  return date
}

function readTasks(lines: string[], reference: string, gaps: DossierGap[]): DossierTask[] {
  const rows = readTableRows(lines)
  if (rows.length === 0) {
    addGap(gaps, 'plan', 'unreadable_tasks_table', `Dans PLAN.md, la section « ${PLAN_HEADINGS.tasks} » n'a pas de tableau.`)
    return []
  }

  const columns = locateTaskColumns(rows[0])
  const missingColumns = TASK_COLUMNS.filter((column) => columns[column] === -1)
  if (missingColumns.length > 0) {
    const names = missingColumns.map((column) => `« ${TASK_COLUMN_NAMES[column]} »`)
    addGap(
      gaps,
      'plan',
      'unreadable_tasks_table',
      `Dans PLAN.md, le tableau des tâches n'a pas de colonne ${names.join(' ni de colonne ')}.`
    )
    return []
  }

  const tasks: DossierTask[] = []
  for (const row of rows.slice(1)) {
    const task = readTaskRow(row, columns, reference, gaps)
    if (task === null) {
      continue
    }
    if (tasks.some((other) => other.number === task.number)) {
      addGap(gaps, 'plan', 'duplicate_task_number', `Dans PLAN.md, le numéro ${task.number} est porté par deux tâches.`)
    }
    tasks.push(task)
  }
  return tasks
}

function locateTaskColumns(headerCells: string[]): Record<TaskColumn, number> {
  const names = headerCells.map(normalizeText)
  const findColumn = (column: TaskColumn) => names.indexOf(normalizeText(TASK_COLUMN_NAMES[column]))
  return {
    number: findColumn('number'),
    task: findColumn('task'),
    doneWhen: findColumn('doneWhen'),
    status: findColumn('status'),
  }
}

function readTaskRow(
  row: string[],
  columns: Record<TaskColumn, number>,
  reference: string,
  gaps: DossierGap[]
): DossierTask | null {
  const rightmostColumn = Math.max(...TASK_COLUMNS.map((column) => columns[column]))
  if (row.length <= rightmostColumn || !TASK_NUMBER.test(row[columns.number])) {
    addGap(
      gaps,
      'plan',
      'unreadable_task_row',
      `Dans PLAN.md, la ligne « ${shorten(row.join(' | '))} » du tableau des tâches est illisible. ` +
        'Une ligne porte un numéro et les quatre colonnes.'
    )
    return null
  }

  const number = Number(row[columns.number])
  const statusText = row[columns.status]
  const status = readTaskStatus(statusText)
  const doneWhen = row[columns.doneWhen]
  if (status === 'unknown') {
    addGap(
      gaps,
      'plan',
      'unknown_status',
      `Dans PLAN.md, l'état « ${statusText} » de la tâche ${number} n'est pas reconnu.`
    )
  }
  if (doneWhen === '') {
    addGap(gaps, 'plan', 'task_without_done_when', `Dans PLAN.md, la tâche ${number} n'a pas de « Fini quand ».`)
  }

  return {
    number,
    ...splitTaskCell(row[columns.task]),
    doneWhen,
    status,
    statusText,
    validator: status === 'to_validate' ? readValidator(number, statusText, gaps) : null,
    ...(status === 'done' ? readDoneDetails(number, statusText, reference, gaps) : { doneOn: null, proof: null }),
  }
}

/** "**Voir la liste.** Les recettes s'affichent." gives the bold part as title and the rest as description */
function splitTaskCell(cell: string): { title: string; description: string } {
  const bold = BOLD_START.exec(cell)
  if (bold === null) {
    return { title: cell, description: '' }
  }
  return { title: bold[1].trim().replace(TRAILING_PERIOD, ''), description: bold[2].trim() }
}

function readTaskStatus(statusText: string): DossierTaskStatus {
  const written = normalizeText(statusText)
  const known = TASK_STATES.find((state) => state.pattern.test(written))
  return known === undefined ? 'unknown' : known.status
}

/** "à valider par Camille" gives "Camille", as written in the cell */
function readValidator(taskNumber: number, statusText: string, gaps: DossierGap[]): string | null {
  const written = normalizeKeepingOrigins(statusText)
  const validatedBy = VALIDATED_BY.exec(written.text)
  if (validatedBy === null) {
    addGap(
      gaps,
      'plan',
      'validation_without_name',
      `Dans PLAN.md, la tâche ${taskNumber} est à valider sans dire par qui. L'état s'écrit « à valider par Nom ».`
    )
    return null
  }
  return readName(originalFrom(written, validatedBy[0].length))
}

/** "fait le 12 mars, commit `1a2b3c4`" gives the date and the proof that follows it, as written in the cell */
function readDoneDetails(
  taskNumber: number,
  statusText: string,
  reference: string,
  gaps: DossierGap[]
): { doneOn: string | null; proof: string | null } {
  const written = normalizeKeepingOrigins(statusText)
  const doneOn = DONE_ON.exec(written.text)
  const date = doneOn === null ? null : readDate(written.text, doneOn[0].length, reference)
  if (date === null) {
    addGap(
      gaps,
      'plan',
      'done_without_date',
      `Dans PLAN.md, la tâche ${taskNumber} est faite sans date. L'état s'écrit « fait le 12 mars, » suivi de la preuve.`
    )
    return { doneOn: null, proof: null }
  }

  const proof = originalFrom(written, date.end).replace(AROUND_PROOF, '')
  if (proof === '') {
    addGap(
      gaps,
      'plan',
      'done_without_proof',
      `Dans PLAN.md, la tâche ${taskNumber} est faite sans preuve. La date est suivie d'un commit, d'un lien ou d'un fichier.`
    )
  }
  return { doneOn: date.date, proof: proof === '' ? null : proof }
}

function readWaiting(section: Section, reference: string, gaps: DossierGap[]): DossierWaitingItem[] {
  const nameInHeading = section.heading.slice(PLAN_HEADINGS.waiting.length).trim()
  return readListItems(section.lines, NUMBERED_ITEM).map((text, index) =>
    readWaitingItem(text, index + 1, section.heading, nameInHeading, reference, gaps)
  )
}

/** "Essayer la page. Demandé le 14 mars à Jeanne." gives the request date and who is expected to answer */
function readWaitingItem(
  text: string,
  position: number,
  heading: string,
  nameInHeading: string,
  reference: string,
  gaps: DossierGap[]
): DossierWaitingItem {
  const written = normalizeKeepingOrigins(text)
  const requested = REQUESTED_ON.exec(written.text)
  const date = requested === null ? null : readDate(written.text, requested.index + requested[0].length, reference)
  if (date === null) {
    addGap(
      gaps,
      'plan',
      'waiting_without_date',
      `Dans PLAN.md, la ligne ${position} de « ${PLAN_HEADINGS.waiting} » n'a pas de « Demandé le » suivi d'une date lisible.`
    )
  }

  const addressedTo = date === null ? null : ADDRESSED_TO.exec(written.text.slice(date.end))
  if (date !== null && addressedTo === null && nameInHeading === '') {
    addGap(
      gaps,
      'plan',
      'waiting_without_addressee',
      `Dans PLAN.md, la ligne ${position} de « ${heading} » ne dit pas qui doit répondre. ` +
        "Le nom s'écrit dans le titre, ou après la date avec « à Nom »."
    )
  }

  const nameAfterDate =
    date === null || addressedTo === null ? null : readName(originalFrom(written, date.end + addressedTo[0].length))
  return {
    position,
    text,
    requestedOn: date === null ? null : date.date,
    addressee: nameAfterDate ?? readName(nameInHeading),
    taskNumbers: findTaskNumbers(text),
  }
}

// --- JOURNAL.md ---

function parseJournal(text: string, gaps: DossierGap[]): JournalReading {
  if (isBlank(text)) {
    addGap(gaps, 'journal', 'empty_file', 'JOURNAL.md est vide.')
    return { entries: [], citedTaskNumbers: new Set() }
  }

  const lines = splitLines(text)
  checkTitle(lines, 'Journal', 'JOURNAL.md', 'journal', gaps)
  const sections = splitSections(lines, 2)
  const entries: DossierJournalEntry[] = []
  const citedTaskNumbers = new Set<number>()
  for (const section of sections) {
    const entry = readJournalEntry(section, gaps)
    if (entry !== null) {
      entries.push(entry)
      for (const taskNumber of findTaskNumbers(section.lines.join('\n'))) {
        citedTaskNumbers.add(taskNumber)
      }
    }
  }

  // The order is checked as written in the file, before the entries are sorted
  if (sections.length === 0) {
    addGap(gaps, 'journal', 'journal_without_session', "JOURNAL.md n'a encore aucune séance.")
  } else if (entries.some((entry, index) => index > 0 && entry.date > entries[index - 1].date)) {
    addGap(
      gaps,
      'journal',
      'journal_out_of_order',
      'Dans JOURNAL.md, les séances ne vont pas de la plus récente à la plus ancienne.'
    )
  }
  return { entries: entries.sort((a, b) => compareNewestFirst(a.date, b.date)), citedTaskNumbers }
}

function readJournalEntry(section: Section, gaps: DossierGap[]): DossierJournalEntry | null {
  const date = readIsoDate(section.heading)
  if (date === null) {
    addGap(
      gaps,
      'journal',
      'journal_heading_without_date',
      `Dans JOURNAL.md, le titre « ${section.heading} » ne commence pas par une date valide. Il est écarté.`
    )
    return null
  }

  const items = readListItems(section.lines, BULLET_ITEM)
  const points = readPoints(items, `dans la séance du ${date} de JOURNAL.md`, 'journal', gaps)
  checkSessionPoints(items, date, gaps)
  const note = JOURNAL_NOTE.exec(section.heading)
  return { date, note: note === null ? null : note[1].trim(), points }
}

/** A session gives the points "Fait.", "Appris." and "Bloque.": "**Fait :**" does not count for "Fait." */
function checkSessionPoints(items: string[], date: string, gaps: DossierGap[]): void {
  const labels = items.map((item) => {
    const bold = BOLD_START.exec(item)
    return bold === null ? null : normalizeText(bold[1]).replace(TRAILING_PERIODS, '')
  })
  const missing = JOURNAL_LABELS.filter((label) => !labels.includes(normalizeText(label)))
  if (missing.length > 0) {
    const names = missing.map((label) => `« ${label}. »`)
    addGap(
      gaps,
      'journal',
      'session_missing_point',
      `Dans JOURNAL.md, la séance du ${date} n'a pas de point ${names.join(', ')}.`
    )
  }
}

// --- What the plan and the journal say together ---

function checkPlanAgainstJournal(plan: DossierPlan | null, journal: JournalReading | null, gaps: DossierGap[]): void {
  if (plan === null || journal === null || journal.entries.length === 0) {
    return
  }

  const latest = journal.entries[0].date
  if (plan.stateDate !== null && latest > plan.stateDate) {
    addGap(
      gaps,
      'plan',
      'state_behind_journal',
      `L'état du projet dans PLAN.md date du ${plan.stateDate}, et JOURNAL.md a une séance du ${latest}. ` +
        "L'état est à mettre à jour."
    )
  }
  if (plan.stateDate !== null && latest < plan.stateDate) {
    addGap(
      gaps,
      'journal',
      'journal_behind_state',
      `L'état du projet dans PLAN.md date du ${plan.stateDate}, et la dernière séance de JOURNAL.md ` +
        `est du ${latest}. La séance du ${plan.stateDate} manque au journal.`
    )
  }

  for (const task of plan.tasks) {
    if (MOVED_STATUSES.includes(task.status) && !journal.citedTaskNumbers.has(task.number)) {
      addGap(
        gaps,
        'journal',
        'task_not_in_journal',
        `La tâche ${task.number} est « ${task.statusText} » dans PLAN.md, ` +
          `et aucune séance de JOURNAL.md ne cite « tâche ${task.number} ».`
      )
    }
  }
}

// --- Labelled points, shared by the plan state and the journal ---

function readPoints(items: string[], place: string, source: GapSource, gaps: DossierGap[]): DossierPoint[] {
  return items.map((item) => readPoint(item, place, source, gaps))
}

/** "**Fait.** text" gives the label "Fait". A bullet without a bold label keeps its text with an empty label */
function readPoint(item: string, place: string, source: GapSource, gaps: DossierGap[]): DossierPoint {
  const bold = BOLD_START.exec(item)
  if (bold === null) {
    addGap(gaps, source, 'point_without_label', `La puce « ${item} » ${place} n'a pas de libellé en gras.`)
    return { label: '', text: item, taskNumbers: findTaskNumbers(item) }
  }
  const text = bold[2].trim()
  return { label: bold[1].replace(TRAILING_PUNCTUATION, ''), text, taskNumbers: findTaskNumbers(text) }
}

/** Task numbers cited as "tâche 1" or "tâches 2 et 3", in order of appearance and without duplicates */
function findTaskNumbers(text: string): number[] {
  // A set keeps the order in which the numbers were added
  const numbers = new Set<number>()
  for (const reference of normalizeText(text).matchAll(TASK_REFERENCE)) {
    for (const digits of reference[1].match(/\d+/g) ?? []) {
      numbers.add(Number(digits))
    }
  }
  return [...numbers]
}

// --- Decisions ---

async function readDecisions(projectPath: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  // The lists are joined with concat: spread into push, a very long list would exceed what one call accepts
  let decisions: DossierDecision[] = []
  for (const folder of DECISION_FOLDERS) {
    decisions = decisions.concat(await readDecisionFolder(projectPath, folder, gaps))
  }
  decisions = decisions.concat(await readDecisionsFile(projectPath, gaps))
  if (decisions.length === 0) {
    addGap(
      gaps,
      'decisions',
      'no_decision',
      `Aucune décision n'est notée, ni dans DECISIONS.md ni dans ${DECISION_FOLDERS[0]}/.`
    )
  }
  return decisions.sort((a, b) => compareNewestFirst(a.date, b.date))
}

async function readDecisionFolder(projectPath: string, folder: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  const folderPath = join(projectPath, folder)
  const decisions: DossierDecision[] = []
  for (const fileName of await listDecisionFiles(folderPath, folder, gaps)) {
    const path = join(folderPath, fileName)
    const displayName = `${folder}/${fileName}`
    const text = await readOptionalFile(path, displayName, 'decisions', gaps)
    if (text === null) {
      continue
    }
    const decision = readDecisionFile(text, path, displayName, gaps)
    if (decision.date === null) {
      addGap(gaps, 'decisions', 'decision_without_date', `La décision ${displayName} n'a pas de date.`)
    }
    decisions.push(decision)
  }
  return decisions
}

/**
 * The markdown files of a decision folder except README.md, symbolic links included.
 * An absent folder has none, an unreadable one is reported.
 */
async function listDecisionFiles(folderPath: string, folder: string, gaps: DossierGap[]): Promise<string[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(folderPath, { withFileTypes: true })
  } catch (error) {
    if (!isMissingPathError(error)) {
      addGap(gaps, 'decisions', 'unreadable_file', `Le dossier ${folder} existe mais n'a pas pu être lu.`)
    }
    return []
  }
  return entries
    .filter((entry) => !entry.isDirectory() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md')
    .map((entry) => entry.name)
    .sort()
    .reverse()
}

/** One decision per file. "**Date**" and "**Statut**" are looked for before the file's second heading */
function readDecisionFile(text: string, path: string, displayName: string, gaps: DossierGap[]): DossierDecision {
  const { data, content } = readFrontmatter(text, displayName, gaps)
  const lines = splitLines(content)
  const firstHeading = lines.findIndex(isHeading)
  const secondHeading = lines.findIndex((line, index) => index > firstHeading && isHeading(line))
  return buildDecision({
    frontmatter: data,
    heading: firstHeading === -1 ? '' : headingText(lines[firstHeading]),
    headerLines: secondHeading === -1 ? lines : lines.slice(0, secondHeading),
    path,
  })
}

function readFrontmatter(
  text: string,
  displayName: string,
  gaps: DossierGap[]
): { data: Record<string, unknown>; content: string } {
  try {
    const { data, content } = parseFrontmatter(text)
    return { data, content }
  } catch {
    addGap(
      gaps,
      'decisions',
      'unreadable_frontmatter',
      `L'en-tête YAML de ${displayName} n'a pas pu être lu. La décision est lue sans lui.`
    )
    return { data: {}, content: text }
  }
}

async function readDecisionsFile(projectPath: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  const path = join(projectPath, 'DECISIONS.md')
  const text = await readOptionalFile(path, 'DECISIONS.md', 'decisions', gaps)
  if (text === null) {
    return []
  }

  const decisions: DossierDecision[] = []
  for (const section of splitSections(splitLines(text), 2)) {
    for (const entry of readDecisionEntries(section)) {
      const decision = buildDecision({ frontmatter: {}, heading: entry.heading, headerLines: entry.lines, path })
      if (decision.date === null) {
        addGap(gaps, 'decisions', 'decision_without_date', `Dans DECISIONS.md, la décision « ${entry.heading} » n'a pas de date.`)
      }
      decisions.push(decision)
    }
  }
  return decisions
}

/**
 * A level-2 section of DECISIONS.md is one decision when its heading opens with a date or an id, when a
 * "**Date**" or "**Statut**" field comes before its first level-3 heading, or when it has no level-3 heading.
 * Its fields are then looked for before that first level-3 heading. Otherwise the section is a group,
 * and each of its level-3 headings is a decision.
 */
function readDecisionEntries(section: Section): Section[] {
  const firstSubheading = section.lines.findIndex((line) => headingLevel(line) === 3)
  const headerLines = firstSubheading === -1 ? section.lines : section.lines.slice(0, firstSubheading)
  const isDecision =
    firstSubheading === -1 ||
    ISO_DATE_START.test(section.heading) ||
    DECISION_ID_PREFIX.test(section.heading) ||
    headerLines.some((line) => DATE_FIELD.test(line) || STATUS_FIELD.test(line))
  return isDecision ? [{ heading: section.heading, lines: headerLines }] : splitSections(section.lines, 3)
}

function buildDecision(source: DecisionSource): DossierDecision {
  const heading = splitDecisionHeading(source.heading)
  const fileName = basename(source.path)
  return {
    id: heading.id,
    title: readText(source.frontmatter.title) ?? heading.title ?? basename(fileName, extname(fileName)),
    date:
      readFrontmatterDate(source.frontmatter.date) ??
      readIsoDate(findField(source.headerLines, DATE_FIELD)) ??
      heading.date ??
      readIsoDate(fileName),
    status:
      readText(source.frontmatter.status) ??
      readText(source.frontmatter.statut) ??
      findField(source.headerLines, STATUS_FIELD),
    path: source.path,
  }
}

/** "2026-11-20 — Titre" or "ADR-005 — Titre" gives the date or the id, and the title without them */
function splitDecisionHeading(heading: string): { id: string | null; date: string | null; title: string | null } {
  const datePrefix = DECISION_DATE_PREFIX.exec(heading)
  const afterDate = datePrefix === null ? heading : heading.slice(datePrefix[0].length)
  const idPrefix = DECISION_ID_PREFIX.exec(afterDate)
  const title = idPrefix === null ? afterDate : afterDate.slice(idPrefix[0].length)
  return {
    id: idPrefix === null ? null : idPrefix[1],
    date: datePrefix === null ? null : readIsoDate(datePrefix[1]),
    title: isBlank(title) ? null : title.trim(),
  }
}

/** The value of the first "**Field** : value" line, up to the " · " separator */
function findField(lines: string[], fieldPattern: RegExp): string | null {
  for (const line of lines) {
    const field = fieldPattern.exec(line)
    if (field !== null) {
      const value = field[1].split(FIELD_SEPARATOR)[0].trim()
      return value === '' ? null : value
    }
  }
  return null
}

/** gray-matter turns an unquoted YAML date (date: 2026-06-19) into a Date object */
function readFrontmatterDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  return typeof value === 'string' ? readIsoDate(value) : null
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && !isBlank(value) ? value.trim() : null
}

function compareNewestFirst(a: string | null, b: string | null): number {
  if (a === b) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return b.localeCompare(a)
}

// --- Markdown and text helpers ---

/** Split text into lines, leaving out fenced code blocks so that nothing written inside them is read */
function splitLines(text: string): string[] {
  return withoutFencedCode(text.split(LINE_BREAK))
}

/** A block runs from its opening fence to a closing fence of the same sign, at least as long, or to the end */
function withoutFencedCode(lines: string[]): string[] {
  const kept: string[] = []
  let openingFence: string | null = null
  for (const line of lines) {
    const fence = CODE_FENCE.exec(line)
    if (openingFence !== null) {
      if (isClosingFence(fence, openingFence)) {
        openingFence = null
      }
    } else if (fence !== null) {
      openingFence = fence[1]
    } else {
      kept.push(line)
    }
  }
  return kept
}

function isClosingFence(fence: RegExpExecArray | null, openingFence: string): boolean {
  return (
    fence !== null &&
    fence[1][0] === openingFence[0] &&
    fence[1].length >= openingFence.length &&
    isBlank(fence[2])
  )
}

function isBlank(text: string): boolean {
  return text.trim() === ''
}

/** Lower case without accents, so that "Tâche" and "tache" compare equal */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}

/**
 * Normalize like normalizeText, without trimming, and remember where each character comes from.
 * Removing accents changes the length of the text, so a position found in the normalized text
 * only gives back the written text through these origins.
 */
function normalizeKeepingOrigins(original: string): NormalizedText {
  let text = ''
  const origins: number[] = []
  let originalIndex = 0
  for (const character of original) {
    const normalized = character.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
    text += normalized
    for (let unit = 0; unit < normalized.length; unit++) {
      origins.push(originalIndex)
    }
    originalIndex += character.length
  }
  return { original, text, origins }
}

/** The written text from the character found at this position of the normalized text */
function originalFrom(written: NormalizedText, normalizedIndex: number): string {
  const start = normalizedIndex < written.origins.length ? written.origins[normalizedIndex] : written.original.length
  return written.original.slice(start)
}

/** The name that opens the text, up to the punctuation that ends it, or null when there is none */
function readName(text: string): string | null {
  const end = text.search(NAME_END)
  const name = (end === -1 ? text : text.slice(0, end)).trim()
  return name === '' ? null : name
}

/** A text quoted in a gap message, cut after QUOTED_TEXT_LIMIT characters */
function shorten(text: string): string {
  const characters = Array.from(text)
  return characters.length <= QUOTED_TEXT_LIMIT ? text : characters.slice(0, QUOTED_TEXT_LIMIT).join('') + '…'
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** Today's date in local time, as YYYY-MM-DD */
function today(): string {
  const now = new Date()
  return `${String(now.getFullYear()).padStart(4, '0')}-${padTwoDigits(now.getMonth() + 1)}-${padTwoDigits(now.getDate())}`
}

/** A "YYYY-MM-DD" date at the start of the text, possibly in brackets, when it exists in the calendar */
function readIsoDate(text: string | null): string | null {
  const match = text === null ? null : ISO_DATE_START.exec(text.trim())
  if (match === null) {
    return null
  }
  return toCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

/**
 * Read "2026-11-22", "22 novembre" or "1er decembre 2026" at a position of a normalized text.
 * A date written without a year falls in the year of the reference date, or the year before
 * when it would come after the reference.
 */
function readDate(text: string, start: number, reference: string): WrittenDate | null {
  const written = text.slice(start)
  const iso = ISO_DATE_START.exec(written)
  if (iso !== null) {
    const date = toCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    return date === null ? null : { date, end: start + iso[0].length }
  }

  const french = FRENCH_DATE_START.exec(written)
  const month = french === null ? 0 : FRENCH_MONTHS.indexOf(french[2]) + 1
  if (french === null || month === 0) {
    return null
  }
  const day = Number(french[1])
  const referenceYear = Number(reference.slice(0, 4))
  const isAfterReference = `${padTwoDigits(month)}-${padTwoDigits(day)}` > reference.slice(5)
  const year = french[3] !== undefined ? Number(french[3]) : isAfterReference ? referenceYear - 1 : referenceYear
  const date = toCalendarDate(year, month, day)
  return date === null ? null : { date, end: start + french[0].length }
}

/** The date as YYYY-MM-DD when it exists in the calendar. Years 1 to 99 are kept, year 0 does not exist */
function toCalendarDate(year: number, month: number, day: number): string | null {
  if (year < 1) {
    return null
  }
  // Date.UTC would read the years 0 to 99 as 1900 to 1999, setUTCFullYear keeps them
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  const isSameDay =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isSameDay ? date.toISOString().slice(0, 10) : null
}

function headingLevel(line: string): number {
  const heading = HEADING.exec(line)
  return heading === null ? 0 : heading[1].length
}

function isHeading(line: string): boolean {
  return headingLevel(line) > 0
}

function headingText(line: string): string {
  const heading = HEADING.exec(line)
  return heading === null ? '' : heading[2].trimEnd()
}

/** Split lines into the sections opened by headings of the given level. A higher-level heading closes the current section */
function splitSections(lines: string[], level: number): Section[] {
  const sections: Section[] = []
  let current: Section | null = null
  for (const line of lines) {
    const lineLevel = headingLevel(line)
    if (lineLevel === level) {
      current = { heading: headingText(line), lines: [] }
      sections.push(current)
    } else if (lineLevel > 0 && lineLevel < level) {
      current = null
    } else if (current !== null) {
      current.lines.push(line)
    }
  }
  return sections
}

/** The text of each list item matching the pattern, joined with its indented continuation lines */
function readListItems(lines: string[], itemPattern: RegExp): string[] {
  const items: string[] = []
  let insideItem = false
  for (const line of lines) {
    const item = itemPattern.exec(line)
    if (item !== null) {
      items.push(item[1].trim())
      insideItem = true
    } else if (insideItem && INDENTED_LINE.test(line)) {
      items[items.length - 1] += ' ' + line.trim()
    } else if (!isBlank(line)) {
      insideItem = false
    }
  }
  return items
}

/** The rows of the first table in the lines, as trimmed cells, without the separator row */
function readTableRows(lines: string[]): string[][] {
  const start = lines.findIndex((line) => TABLE_LINE.test(line))
  if (start === -1) {
    return []
  }

  const rows: string[][] = []
  for (const line of lines.slice(start)) {
    if (!TABLE_LINE.test(line)) {
      break
    }
    if (!TABLE_SEPARATOR.test(line)) {
      rows.push(splitTableRow(line))
    }
  }
  return rows
}

/** Split "| a | b \| c |" into ["a", "b | c"]: an escaped pipe stays inside its cell */
function splitTableRow(line: string): string[] {
  const content = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < content.length; index++) {
    const isEscapedPipe = content[index] === '\\' && content[index + 1] === '|'
    if (isEscapedPipe) {
      cell += '|'
      index++
    } else if (content[index] === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += content[index]
    }
  }
  cells.push(cell.trim())
  return cells
}
