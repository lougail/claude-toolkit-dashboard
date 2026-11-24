import matter from 'gray-matter'

/**
 * gray-matter evaluates a frontmatter opened by "---js" or "---javascript" as code. The dashboard
 * reads the files of every project found on the machine, cloned ones included, so no file may run code.
 */
function refuseJavaScript(): never {
  throw new Error('A frontmatter written in JavaScript is not read')
}

/**
 * Split a markdown text into the fields of its frontmatter and the content after it.
 * Throws when the frontmatter is invalid or written in JavaScript.
 *
 * Options are always passed. Called without options, gray-matter caches a text before parsing it,
 * and a second read of the same invalid text would come back from the cache without throwing.
 */
export function parseFrontmatter(text: string): matter.GrayMatterFile<string> {
  return matter(text, { engines: { javascript: refuseJavaScript } })
}

