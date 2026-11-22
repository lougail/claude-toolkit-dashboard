import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import matter from 'gray-matter'
import { exists } from '@/lib/fs'
import type {
  Dossier,
  DossierDecision,
  DossierGap,
  DossierJournalEntry,
  DossierPlan,
  DossierPoint,
  DossierTask,
  DossierTaskStatus,
  DossierWaitingItem,
} from '@/lib/types'

type GapSource = DossierGap['source']

/**
 * How the start of a task's "État" cell maps to a status, compared without case or accents.
 * The dossier format is on trial until 2026-11-29: update this list once it is fixed.
 */
const TASK_STATUS_PREFIXES: ReadonlyArray<{ prefix: string; status: DossierTaskStatus }> = [
  { prefix: 'à faire', status: 'todo' },
  { prefix: 'en cours', status: 'in_progress' },
  { prefix: 'à valider', status: 'to_validate' },
  { prefix: 'fait', status: 'done' },
  { prefix: 'plus tard', status: 'later' },
]

/** Start of the three expected PLAN.md headings, compared without case or accents */
const PLAN_HEADINGS = {
  state: 'Où en est le projet',
  tasks: 'Prochaines tâches',
  waiting: 'Ce qui attend',
}

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

const COMBINING_MARKS = /[\u0300-\u036f]/g
// A code fence opens with at least three backticks or tildes, optionally followed by a language name
const CODE_FENCE = /^\s*(`{3,}|~{3,})(.*)$/
const HEADING = /^(#{1,6})\s+(.*?)\s*$/
const BULLET_ITEM = /^[-*+]\s+(.*)$/
const NUMBERED_ITEM = /^\d+[.)]\s+(.*)$/
const INDENTED_LINE = /^\s+\S/
const BOLD_START = /^\*\*(.+?)\*\*(.*)$/
const TRAILING_PUNCTUATION = /[\s.:;,!?…]+$/
const TRAILING_PERIOD = /\.\s*$/
const TABLE_LINE = /^\s*\|/
const TABLE_SEPARATOR = /^[\s|:-]+$/
const TASK_NUMBER = /^\d+$/
const ISO_DATE_START = /^\[?(\d{4})-(\d{2})-(\d{2})\]?/
const STATE_HEADING_DATE = /\(([^)]*)\)/
const JOURNAL_NOTE = /^\d{4}-\d{2}-\d{2}\s*\((.*)\)/
// The patterns below run on normalized text: lower case, without accents
const REQUESTED_ON = /\bdemande le\s+(.*)$/
const FRENCH_DATE_START = /^(\d{1,2})(?:er)?\s+([a-z]+)(?:\s+(\d{4}))?/
const TASK_REFERENCE = /\btaches?\s+(\d+(?:\s*(?:,|et)\s*\d+)*)/g
// Decision headings such as "2026-11-20 — Title", "[2026-11-20] Title" or "ADR-005 — Title"
const DECISION_DATE_PREFIX = /^\[?(\d{4}-\d{2}-\d{2})\]?\s*[—–:-]?\s*/
const DECISION_ID_PREFIX = /^([A-Z]{2,}-\d+)\s*[—–:-]?\s*/
// "**Date** : value" and "**Date :** value" are both written
const DATE_FIELD = /\*\*date\s*:?\s*\*\*\s*:?\s*(.*)$/i
const STATUS_FIELD = /\*\*statut\s*:?\s*\*\*\s*:?\s*(.*)$/i
const FIELD_SEPARATOR = ' · '

interface Section {
  heading: string
  lines: string[]
}

interface DateParts {
  day: number
  month: number
  year: number | null
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
  const decisions = await readDecisions(projectPath, gaps)
  return { projectPath, plan, journal, decisions, gaps }
}

// --- Files ---

async function readPlan(projectPath: string, gaps: DossierGap[]): Promise<DossierPlan | null> {
  const text = await readDossierFile(projectPath, 'PLAN.md', 'plan', gaps)
  return text === null ? null : parsePlan(text, gaps)
}

async function readJournal(projectPath: string, gaps: DossierGap[]): Promise<DossierJournalEntry[] | null> {
  const text = await readDossierFile(projectPath, 'JOURNAL.md', 'journal', gaps)
  return text === null ? null : parseJournal(text, gaps)
}

async function readDossierFile(
  projectPath: string,
  fileName: string,
  source: GapSource,
  gaps: DossierGap[]
): Promise<string | null> {
  const path = join(projectPath, fileName)
  if (!(await exists(path))) {
    gaps.push({ source, kind: 'missing_file', message: `${fileName} est absent du projet.` })
    return null
  }
  return readTextFile(path, fileName, source, gaps)
}

async function readTextFile(
  path: string,
  displayName: string,
  source: GapSource,
  gaps: DossierGap[]
): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    gaps.push({ source, kind: 'unreadable_file', message: `${displayName} existe mais n'a pas pu être lu.` })
    return null
  }
}

// --- PLAN.md ---

function parsePlan(text: string, gaps: DossierGap[]): DossierPlan {
  if (isBlank(text)) {
    gaps.push({ source: 'plan', kind: 'empty_file', message: 'PLAN.md est vide.' })
    return { stateDate: null, state: [], tasks: [], waiting: [] }
  }

  const sections = splitSections(splitLines(text), 2)
  const stateSection = findPlanSection(sections, PLAN_HEADINGS.state, gaps)
  const tasksSection = findPlanSection(sections, PLAN_HEADINGS.tasks, gaps)
  const waitingSection = findPlanSection(sections, PLAN_HEADINGS.waiting, gaps)
  const stateDate = stateSection === null ? null : readStateDate(stateSection.heading, gaps)
  const statePlace = `dans la section « ${PLAN_HEADINGS.state} » de PLAN.md`

  return {
    stateDate,
    state: stateSection === null ? [] : readPoints(stateSection.lines, statePlace, 'plan', gaps),
    tasks: tasksSection === null ? [] : readTasks(tasksSection.lines, gaps),
    waiting: waitingSection === null ? [] : readWaiting(waitingSection.lines, stateDate, gaps),
  }
}

function findPlanSection(sections: Section[], expectedStart: string, gaps: DossierGap[]): Section | null {
  const section = sections.find((candidate) =>
    normalizeText(candidate.heading).startsWith(normalizeText(expectedStart))
  )
  if (section === undefined) {
    gaps.push({
      source: 'plan',
      kind: 'missing_section',
      message: `Dans PLAN.md, la section « ${expectedStart} » est absente. ${describeHeadings(sections)}`,
    })
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
    gaps.push({
      source: 'plan',
      kind: 'missing_state_date',
      message: `Dans PLAN.md, le titre « ${heading} » n'a pas de date valide entre parenthèses.`,
    })
  }
  return date
}

function readTasks(lines: string[], gaps: DossierGap[]): DossierTask[] {
  const rows = readTableRows(lines)
  if (rows.length === 0) {
    gaps.push({
      source: 'plan',
      kind: 'unreadable_tasks_table',
      message: `Dans PLAN.md, la section « ${PLAN_HEADINGS.tasks} » n'a pas de tableau.`,
    })
    return []
  }

  const columns = locateTaskColumns(rows[0])
  const missingColumns = TASK_COLUMNS.filter((column) => columns[column] === -1)
  if (missingColumns.length > 0) {
    const names = missingColumns.map((column) => `« ${TASK_COLUMN_NAMES[column]} »`)
    gaps.push({
      source: 'plan',
      kind: 'unreadable_tasks_table',
      message: `Dans PLAN.md, le tableau des tâches n'a pas de colonne ${names.join(' ni de colonne ')}.`,
    })
    return []
  }

  const tasks: DossierTask[] = []
  for (const row of rows.slice(1)) {
    const task = readTaskRow(row, columns, gaps)
    if (task !== null) {
      tasks.push(task)
    }
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

function readTaskRow(row: string[], columns: Record<TaskColumn, number>, gaps: DossierGap[]): DossierTask | null {
  const numberCell = cellAt(row, columns.number)
  if (!TASK_NUMBER.test(numberCell)) {
    gaps.push({
      source: 'plan',
      kind: 'unreadable_task_row',
      message: `Dans PLAN.md, la ligne du tableau des tâches numérotée « ${numberCell} » n'a pas un numéro entier. Elle est écartée.`,
    })
    return null
  }

  const statusText = cellAt(row, columns.status)
  const task: DossierTask = {
    number: Number(numberCell),
    ...splitTaskCell(cellAt(row, columns.task)),
    doneWhen: cellAt(row, columns.doneWhen),
    status: readTaskStatus(statusText),
    statusText,
  }

  if (task.doneWhen === '') {
    gaps.push({
      source: 'plan',
      kind: 'task_without_done_when',
      message: `Dans PLAN.md, la tâche ${task.number} n'a pas de « Fini quand ».`,
    })
  }
  if (task.status === 'unknown') {
    gaps.push({
      source: 'plan',
      kind: 'unknown_status',
      message: `Dans PLAN.md, l'état « ${statusText} » de la tâche ${task.number} n'est pas reconnu.`,
    })
  }
  return task
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
  const known = TASK_STATUS_PREFIXES.find((entry) => written.startsWith(normalizeText(entry.prefix)))
  return known === undefined ? 'unknown' : known.status
}

function readWaiting(lines: string[], stateDate: string | null, gaps: DossierGap[]): DossierWaitingItem[] {
  return readListItems(lines, NUMBERED_ITEM).map((text, index) => ({
    position: index + 1,
    text,
    requestedOn: readRequestedOn(text, index + 1, stateDate, gaps),
    taskNumbers: findTaskNumbers(text),
  }))
}

function readRequestedOn(
  text: string,
  position: number,
  stateDate: string | null,
  gaps: DossierGap[]
): string | null {
  const parts = readRequestedDateParts(text)
  if (parts === null) {
    gaps.push(waitingWithoutDateGap(position))
    return null
  }

  const year = parts.year ?? inferRequestYear(parts, stateDate)
  // Without a state date the year stays unknown, and the state date already has its own gap
  if (year === null) {
    return null
  }

  const date = toCalendarDate(year, parts.month, parts.day)
  if (date === null) {
    gaps.push(waitingWithoutDateGap(position))
  }
  return date
}

function waitingWithoutDateGap(position: number): DossierGap {
  return {
    source: 'plan',
    kind: 'waiting_without_date',
    message: `Dans PLAN.md, la ligne ${position} de « ${PLAN_HEADINGS.waiting} » n'a pas de « Demandé le » suivi d'une date lisible.`,
  }
}

/** Read the date written after "Demandé le": "22 novembre", "1er décembre 2026" or "2026-11-22" */
function readRequestedDateParts(text: string): DateParts | null {
  const requested = REQUESTED_ON.exec(normalizeText(text))
  if (requested === null) {
    return null
  }

  const written = requested[1]
  const iso = ISO_DATE_START.exec(written)
  if (iso !== null) {
    return { day: Number(iso[3]), month: Number(iso[2]), year: Number(iso[1]) }
  }

  const french = FRENCH_DATE_START.exec(written)
  if (french === null) {
    return null
  }
  const month = FRENCH_MONTHS.indexOf(french[2]) + 1
  if (month === 0) {
    return null
  }
  return { day: Number(french[1]), month, year: french[3] === undefined ? null : Number(french[3]) }
}

/** A request without a year was made in the state's year, or the year before when it would fall after the state date */
function inferRequestYear(parts: DateParts, stateDate: string | null): number | null {
  if (stateDate === null) {
    return null
  }
  const stateYear = Number(stateDate.slice(0, 4))
  const requestMonthDay = `${padTwoDigits(parts.month)}-${padTwoDigits(parts.day)}`
  const stateMonthDay = stateDate.slice(5)
  return requestMonthDay > stateMonthDay ? stateYear - 1 : stateYear
}

// --- JOURNAL.md ---

function parseJournal(text: string, gaps: DossierGap[]): DossierJournalEntry[] {
  if (isBlank(text)) {
    gaps.push({ source: 'journal', kind: 'empty_file', message: 'JOURNAL.md est vide.' })
    return []
  }

  const entries: DossierJournalEntry[] = []
  for (const section of splitSections(splitLines(text), 2)) {
    const entry = readJournalEntry(section, gaps)
    if (entry !== null) {
      entries.push(entry)
    }
  }
  return entries.sort((a, b) => compareNewestFirst(a.date, b.date))
}

function readJournalEntry(section: Section, gaps: DossierGap[]): DossierJournalEntry | null {
  const date = readIsoDate(section.heading)
  if (date === null) {
    gaps.push({
      source: 'journal',
      kind: 'journal_heading_without_date',
      message: `Dans JOURNAL.md, le titre « ${section.heading} » ne commence pas par une date valide. Il est écarté.`,
    })
    return null
  }

  const note = JOURNAL_NOTE.exec(section.heading)
  return {
    date,
    note: note === null ? null : note[1].trim(),
    points: readPoints(section.lines, `dans la séance du ${date} de JOURNAL.md`, 'journal', gaps),
  }
}

// --- Labelled points, shared by the plan state and the journal ---

function readPoints(lines: string[], place: string, source: GapSource, gaps: DossierGap[]): DossierPoint[] {
  return readListItems(lines, BULLET_ITEM).map((item) => readPoint(item, place, source, gaps))
}

/** "**Fait.** text" gives the label "Fait". A bullet without a bold label keeps its text with an empty label */
function readPoint(item: string, place: string, source: GapSource, gaps: DossierGap[]): DossierPoint {
  const bold = BOLD_START.exec(item)
  if (bold === null) {
    gaps.push({
      source,
      kind: 'point_without_label',
      message: `La puce « ${item} » ${place} n'a pas de libellé en gras.`,
    })
    return { label: '', text: item, taskNumbers: findTaskNumbers(item) }
  }
  const text = bold[2].trim()
  return { label: bold[1].replace(TRAILING_PUNCTUATION, ''), text, taskNumbers: findTaskNumbers(text) }
}

/** Task numbers cited as "tâche 1" or "tâches 2 et 3", in order of appearance and without duplicates */
function findTaskNumbers(text: string): number[] {
  const numbers: number[] = []
  for (const reference of normalizeText(text).matchAll(TASK_REFERENCE)) {
    for (const digits of reference[1].match(/\d+/g) ?? []) {
      const taskNumber = Number(digits)
      if (!numbers.includes(taskNumber)) {
        numbers.push(taskNumber)
      }
    }
  }
  return numbers
}

// --- Decisions ---

async function readDecisions(projectPath: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  const decisions: DossierDecision[] = []
  for (const folder of DECISION_FOLDERS) {
    decisions.push(...(await readDecisionFolder(projectPath, folder, gaps)))
  }
  decisions.push(...(await readDecisionsFile(projectPath, gaps)))
  return decisions.sort((a, b) => compareNewestFirst(a.date, b.date))
}

async function readDecisionFolder(projectPath: string, folder: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  const folderPath = join(projectPath, folder)
  if (!(await exists(folderPath))) {
    return []
  }

  const decisions: DossierDecision[] = []
  for (const fileName of await listMarkdownFiles(folderPath, folder, gaps)) {
    const path = join(folderPath, fileName)
    const displayName = `${folder}/${fileName}`
    const text = await readTextFile(path, displayName, 'decisions', gaps)
    if (text !== null) {
      decisions.push(readDecisionFile(text, path, displayName, gaps))
    }
  }
  return decisions
}

async function listMarkdownFiles(folderPath: string, folder: string, gaps: DossierGap[]): Promise<string[]> {
  try {
    const entries = await readdir(folderPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort()
      .reverse()
  } catch {
    gaps.push({
      source: 'decisions',
      kind: 'unreadable_file',
      message: `Le dossier ${folder} existe mais n'a pas pu être lu.`,
    })
    return []
  }
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
    const { data, content } = matter(text)
    return { data, content }
  } catch {
    gaps.push({
      source: 'decisions',
      kind: 'unreadable_frontmatter',
      message: `L'en-tête YAML de ${displayName} n'a pas pu être lu. La décision est lue sans lui.`,
    })
    return { data: {}, content: text }
  }
}

/** One decision per "###" heading when the file has some, otherwise one per "##" heading */
async function readDecisionsFile(projectPath: string, gaps: DossierGap[]): Promise<DossierDecision[]> {
  const path = join(projectPath, 'DECISIONS.md')
  if (!(await exists(path))) {
    return []
  }
  const text = await readTextFile(path, 'DECISIONS.md', 'decisions', gaps)
  if (text === null) {
    return []
  }

  const lines = splitLines(text)
  const entryLevel = lines.some((line) => headingLevel(line) === 3) ? 3 : 2
  const entries = splitSections(lines, entryLevel)
  if (entries.length === 0) {
    gaps.push({ source: 'decisions', kind: 'no_decision_entry', message: "DECISIONS.md n'a aucun titre de décision." })
  }
  return entries.map((entry) =>
    buildDecision({ frontmatter: {}, heading: entry.heading, headerLines: entry.lines, path })
  )
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
  return withoutFencedCode(text.split(/\r?\n/))
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

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** A "YYYY-MM-DD" date at the start of the text, possibly in brackets, when it exists in the calendar */
function readIsoDate(text: string | null): string | null {
  const match = text === null ? null : ISO_DATE_START.exec(text.trim())
  if (match === null) {
    return null
  }
  return toCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

function toCalendarDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
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
  return heading === null ? '' : heading[2]
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

function cellAt(row: string[], index: number): string {
  return row[index] ?? ''
}
