import { command } from 'maltty'
import { isErr } from 'massaman/control'
import { z } from 'zod'

import { granary } from '@granary/sdk'
import { standardsPlugin, setupStandards } from '@granary/plugins/standards'
import { projectDirectory } from '#/arguments.ts'

/**
 * Extract complete standards as JSON or initialize review-only consumer enforcement.
 */
export const standards = command({
  description: 'Extract standards as JSON, including rationale, examples, and enforcement',
  options: {
    format: {
      type: 'string',
      default: 'json',
      description: 'Output format: json, yaml, markdown, or greptile (.greptile/rules.md)',
    },
    source: {
      type: 'string',
      description: 'Inspect local pack sources instead of installed content',
    },
    setup: {
      type: 'boolean',
      default: false,
      description: 'Record review-only enforcement defaults in granary.json',
    },
  },
  handler: async (ctx) => {
    const args = z
      .object({
        source: z.string().optional(),
        setup: z.boolean(),
        format: z.enum(['json', 'yaml', 'markdown', 'greptile']),
      })
      .safeParse(ctx.args)
    if (!args.success) {
      return ctx.fail(args.error.message)
    }
    const project = projectDirectory(ctx)
    if (args.data.setup) {
      if (args.data.source !== undefined || args.data.format !== 'json') {
        return ctx.fail('--setup cannot be combined with --source or a non-JSON format.')
      }
      const result = await setupStandards({ project })
      if (isErr(result)) {
        return ctx.fail(result.error.message)
      }
      ctx.log.info('Standards enforcement configured. Unmapped rules use [review].')
      return
    }
    const client = granary({
      project,
      plugins: [standardsPlugin({ source: args.data.source })],
    })
    if (args.data.format === 'yaml') {
      const result = await client.standards.toYAML()
      if (isErr(result)) {
        return ctx.fail(result.error.message)
      }
      process.stdout.write(result.value)
      return
    }
    if (args.data.format !== 'json') {
      const result = await client.standards.toMarkdown({ target: args.data.format })
      if (isErr(result)) {
        return ctx.fail(result.error.message)
      }
      process.stdout.write(result.value)
      return
    }
    const result = await client.standards.toJSON()
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`)
  },
})
