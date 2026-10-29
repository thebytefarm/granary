import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { Outcome } from '@granary/core'
import type { StandardsError } from '#/standards/errors.ts'
import { standardsError } from '#/standards/errors.ts'
import { createHash } from 'node:crypto'
import { collectOutcomes } from '#/results.ts'
import type { StandardsConfig } from '#/standards/config.ts'
import { parseStandards } from '#/standards/parser.ts'
import type { Standard, StandardRule } from '#/standards/parser.ts'
import { createStandardsReader } from '#/standards/reader.ts'
import type { DocumentInput } from '#/standards/reader.ts'
import { renderStandardsMarkdown, renderStandardsYAML } from '#/standards/render.ts'

type ExportedRule = StandardRule & {
  readonly qualifiedId: string
  readonly effectiveEnforcement: {
    readonly markers: readonly string[]
    readonly notes?: string | undefined
  }
}
type ExportedStandard = Omit<Standard, 'rules'> & {
  readonly qualifiedId: string
  readonly rules: readonly ExportedRule[]
  readonly provenance: Omit<DocumentInput, 'source'> & {
    readonly hash: string
    readonly customized: boolean
  }
}

/**
 * Retain complete standards, source provenance, and authored/effective enforcement in JSON output.
 */
export type StandardsExport = {
  readonly schemaVersion: 1
  readonly standards: readonly ExportedStandard[]
}

export type StandardsOptions = {
  /** Inspect authored local packs instead of installed content. Resolved relative to the project. */
  readonly source?: string | undefined
}
export type StandardsClient = {
  readonly toJSON: () => Promise<Outcome<StandardsExport, StandardsError>>
  readonly toMarkdown: (options?: {
    readonly target?: 'markdown' | 'greptile'
  }) => Promise<Outcome<string, StandardsError>>
  readonly toYAML: () => Promise<Outcome<string, StandardsError>>
}

/**
 * Bind standards interpretation and in-memory conversion to a project.
 * @param options - Project root and optional local source; conversion rereads and validates each time.
 * @returns Readonly conversions; none write files or require a setup call.
 */
export function createStandardsClient({
  project,
  source,
}: StandardsOptions & { readonly project: string }): StandardsClient {
  return Object.freeze({
    toJSON(): ReturnType<typeof extractStandards> {
      return extractStandards({ project, source })
    },
    async toMarkdown({
      target = 'markdown',
    }: { readonly target?: 'markdown' | 'greptile' } = {}): Promise<
      Result<string, StandardsError>
    > {
      const result = await extractStandards({ project, source })
      if (isErr(result)) {
        return result
      }
      return ok(renderStandardsMarkdown({ standards: result.value, target }))
    },
    async toYAML(): Promise<Result<string, StandardsError>> {
      const result = await extractStandards({ project, source })
      if (isErr(result)) {
        return result
      }
      return ok(renderStandardsYAML(result.value))
    },
  })
}
/**
 * @private
 */
async function extractStandards({
  project,
  source,
}: {
  readonly project: string
  readonly source?: string | undefined
}): Promise<Result<StandardsExport, StandardsError>> {
  const read = await createStandardsReader({ project, source }).read()
  if (isErr(read)) {
    return read
  }
  const { inputs, settings } = read.value
  const documents = collectOutcomes(
    await Promise.all(
      inputs.map(async (input) => {
        const parsed = await parseStandards({
          source: input.source,
          path: `${input.pack}/${input.path}`,
        })
        if (isErr(parsed)) {
          return parsed
        }
        return ok(
          parsed.value.map((standard) => buildExport({ standard, input, settings: settings }))
        )
      })
    )
  )
  if (isErr(documents)) {
    return documents
  }
  const standards = documents.value.flat()
  const identities = standards.map((standard) => standard.qualifiedId)
  if (identities.some((id, index) => identities.indexOf(id) !== index)) {
    return err(
      standardsError({
        kind: 'invalid',
        message: 'Standard IDs must be unique across documents in a pack.',
      })
    )
  }
  const rules = standards.flatMap((standard) => standard.rules.map((rule) => rule.qualifiedId))
  const unknown = Object.keys(settings.rules).filter((id) => !rules.includes(id))
  if (unknown.length > 0) {
    return err(
      standardsError({
        kind: 'invalid',
        message: `Unknown enforcement rule IDs: ${unknown.join(', ')}`,
      })
    )
  }
  return ok({ schemaVersion: 1, standards })
}

/**
 * @private
 */
function buildExport({
  standard,
  input,
  settings,
}: {
  readonly standard: Standard
  readonly input: DocumentInput
  readonly settings: StandardsConfig
}): ExportedStandard {
  const qualifiedId = `${input.pack}#${standard.id}`
  const { source, ...provenance } = input
  const hash = createHash('sha256').update(source).digest('hex')
  return {
    ...standard,
    qualifiedId,
    provenance: { ...provenance, hash, customized: hash !== input.upstreamHash },
    rules: standard.rules.map((rule) => {
      const identity = `${qualifiedId}/${rule.id}`
      return {
        ...rule,
        qualifiedId: identity,
        effectiveEnforcement: settings.rules[identity] ?? { markers: [settings.default] },
      }
    }),
  }
}
