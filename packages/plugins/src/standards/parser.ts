import type { Element, TagSchemaShape } from 'marxml'
import { attempt, attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { z } from 'zod'

import { standardsError } from '#/standards/errors.ts'
import type { StandardsError } from '#/standards/errors.ts'
import { collectOutcomes } from '#/results.ts'
import { enforcementMarkerSchema } from '#/standards/config.ts'

const levelSchema = z.enum(['MUST', 'MUST NOT', 'SHOULD', 'SHOULD NOT', 'MAY'])
const idConstraint = { kind: 'regex', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', required: true }
const markupSchema: Record<string, TagSchemaShape> = {
  standard: {
    attrs: { id: idConstraint },
    childrenRequired: ['why', 'rules', 'examples'],
    childrenOptional: ['enforcement'],
    childrenExclusive: true,
  },
  why: { contentRequired: true },
  rules: { childrenRequired: ['rule'], childrenExclusive: true },
  rule: {
    attrs: { id: idConstraint },
    childrenRequired: ['level', 'enforcement'],
    childrenExclusive: true,
  },
  level: { contentRequired: true, childrenExclusive: true },
  enforcement: { contentRequired: true, childrenExclusive: true },
  examples: {},
}

/**
 * Retain authored enforcement text alongside its individually addressable markers.
 */
export type Enforcement = { readonly markdown: string; readonly markers: readonly string[] }

/**
 * Describe one rule without losing its literal requirement keyword.
 */
export type StandardRule = {
  readonly id: string
  readonly level: z.infer<typeof levelSchema>
  readonly statement: string
  readonly enforcement: Enforcement
}

/**
 * Retain the complete authored concept rather than just its imperative sentences.
 */
export type Standard = {
  readonly id: string
  readonly title: string
  readonly markdown: string
  readonly why: string
  readonly examples: string
  readonly enforcementNotes: string
  readonly rules: readonly StandardRule[]
}

/**
 * Parse explicitly classified standards with the native marxml adapter.
 * @param options - Original UTF-8 Markdown and a diagnostic source path.
 * @returns Complete standards, or a contextual markup/identity validation failure.
 * @example
 * await parseStandards({ source: markdown, path: 'errors.md' })
 */
export async function parseStandards({
  source,
  path,
}: {
  readonly source: string
  readonly path: string
}): Promise<Result<readonly Standard[], StandardsError>> {
  const binding = await attemptAsync(() => import('marxml'))
  if (isErr(binding)) {
    return err(
      standardsError({
        kind: 'invalid',
        message: `Cannot load marxml for ${path}: ${binding.error.message}`,
        cause: binding.error,
      })
    )
  }
  const parsed = attempt(() => {
    const document = binding.value.parse(maskCodeTags(source))
    return { elements: document.elements, report: document.validate(markupSchema) }
  })
  if (isErr(parsed)) {
    return invalid(`${path}: ${parsed.error.message}`)
  }
  if (!parsed.value.report.valid) {
    return invalid(
      `${path}: ${parsed.value.report.errors.map((error) => `line ${error.line}: ${error.message}`).join('; ')}`
    )
  }
  if (
    parsed.value.elements.length === 0 ||
    parsed.value.elements.some((element) => element.tag !== 'standard')
  ) {
    return invalid(`${path}: expected one or more top-level <standard> elements.`)
  }
  const standards = collectOutcomes(
    parsed.value.elements.map((element) => readStandard({ element, source }))
  )
  if (isErr(standards)) {
    return invalid(`${path}: ${standards.error.message}`)
  }
  if (hasDuplicates(standards.value.map((standard) => standard.id))) {
    return invalid(`${path}: duplicate standard IDs.`)
  }
  return standards
}

/**
 * @private
 */
function readStandard({
  element,
  source,
}: {
  readonly element: Element
  readonly source: string
}): Result<Standard, StandardsError> {
  const why = onlyChild({ element, tag: 'why' })
  const examples = onlyChild({ element, tag: 'examples' })
  const rules = onlyChild({ element, tag: 'rules' })
  const enforcement = onlyChild({ element, tag: 'enforcement' })
  const title = /^#{1,6}\s+(.+)$/m.exec(element.content)?.[1]?.trim()
  const id = element.attrs.id
  if (!why || !examples || !rules || !title || !id) {
    return invalid(
      'Each standard needs an ID, Markdown heading, and exactly one why, rules, and examples region.'
    )
  }
  if (element.children.filter((child) => child.tag === 'enforcement').length > 1) {
    return invalid('A standard can have at most one shared enforcement region.')
  }
  const extracted = collectOutcomes(
    rules.children.map((rule) => readRule({ element: rule, source }))
  )
  if (isErr(extracted)) {
    return extracted
  }
  if (hasDuplicates(extracted.value.map((rule) => rule.id))) {
    return invalid(`Duplicate rule IDs in ${id}.`)
  }
  return ok({
    id,
    title,
    markdown: elementSource({ element, source }),
    why: originalContent({ element: why, source }).trim(),
    examples: originalContent({ element: examples, source }).trim(),
    enforcementNotes: enforcementContent({ element: enforcement, source }),
    rules: extracted.value,
  })
}

/**
 * @private
 */
function enforcementContent({
  element,
  source,
}: {
  readonly element: Element | undefined
  readonly source: string
}): string {
  if (!element) {
    return ''
  }
  return originalContent({ element, source }).trim()
}

/**
 * @private
 */
function readRule({
  element,
  source,
}: {
  readonly element: Element
  readonly source: string
}): Result<StandardRule, StandardsError> {
  const level = onlyChild({ element, tag: 'level' })
  const enforcement = onlyChild({ element, tag: 'enforcement' })
  const parsedLevel = levelSchema.safeParse(level?.content.trim())
  const id = element.attrs.id
  if (!level || !enforcement || !parsedLevel.success || !id) {
    return invalid(
      'Each rule needs an ID, exactly one valid level, and exactly one enforcement region.'
    )
  }
  const markers = enforcement.content.match(/\[(?:review|lint:[^\]\r\n]*)\]/g) ?? []
  if (
    markers.length === 0 ||
    markers.some((marker) => !enforcementMarkerSchema.safeParse(marker).success)
  ) {
    return invalid(
      `Rule ${id} needs bracket enforcement markers such as [review] or [lint: check-id].`
    )
  }
  const statement = originalContent({ element, source })
    .replace(elementSource({ element: enforcement, source }), '')
    .replace(elementSource({ element: level, source }), parsedLevel.data)
    .trim()
  if (
    !statement
      .replace(parsedLevel.data, '')
      .replace(/^[-*]\s*/, '')
      .trim()
  ) {
    return invalid(`Rule ${id} needs a statement in addition to its level.`)
  }
  return ok({
    id,
    level: parsedLevel.data,
    statement,
    enforcement: { markdown: originalContent({ element: enforcement, source }).trim(), markers },
  })
}

/**
 * @private
 */
function onlyChild({
  element,
  tag,
}: {
  readonly element: Element
  readonly tag: string
}): Element | undefined {
  const matches = element.children.filter((child) => child.tag === tag)
  if (matches.length !== 1) {
    return undefined
  }
  return matches[0]
}

/**
 * @private
 */
function elementSource({
  element,
  source,
}: {
  readonly element: Element
  readonly source: string
}): string {
  return Buffer.from(source)
    .subarray(element.loc.start.offset, element.loc.end.offset)
    .toString('utf8')
}

/**
 * @private
 */
function originalContent({
  element,
  source,
}: {
  readonly element: Element
  readonly source: string
}): string {
  return elementSource({ element, source })
    .replace(/^<[^>]*>/, '')
    .replace(/<\/[^>]+>$/, '')
}

/**
 * @private
 */
function maskCodeTags(source: string): string {
  const masked = source
    .split(/(?<=\n)/)
    .reduce<{ readonly fence: string; readonly lines: readonly string[] }>(
      (state, line) => {
        const opening = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line)
        if (state.fence !== '') {
          const closing = opening?.[1]
          const isClosing =
            closing !== undefined &&
            closing[0] === state.fence[0] &&
            closing.length >= state.fence.length &&
            (opening?.[2] ?? '').trim() === ''
          if (isClosing) {
            return { fence: '', lines: [...state.lines, line.replaceAll('<', ' ')] }
          }
          return { ...state, lines: [...state.lines, line.replaceAll('<', ' ')] }
        }
        if (opening?.[1]) {
          return { fence: opening[1], lines: [...state.lines, line.replaceAll('<', ' ')] }
        }
        return { ...state, lines: [...state.lines, line] }
      },
      { fence: '', lines: [] }
    )
  return masked.lines
    .join('')
    .replace(/(`+)([^`]|(?!\1)`)*?\1/g, (code) => code.replaceAll('<', ' '))
}

/**
 * @private
 */
function hasDuplicates(values: readonly string[]): boolean {
  return values.some((value, index) => values.indexOf(value) !== index)
}

/**
 * @private
 */
function invalid(message: string): Result<never, StandardsError> {
  return err(standardsError({ kind: 'invalid', message }))
}
