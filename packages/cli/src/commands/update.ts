import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { command } from 'maltty'
import { attempt, attemptAsync, isErr } from 'massaman/control'
import { z } from 'zod'

import { granary } from '@granary/sdk'
import { defaultPlugins } from '@granary/plugins'

import { projectDirectory } from '#/arguments.ts'

/**
 * Prepare a portable review or apply explicit decisions after stale-state checks.
 */
export const update = command({
  description: 'Prepare an update review as JSON, or apply an edited review file',
  options: {
    apply: { type: 'string', description: 'Apply a previously prepared review JSON file' },
  },
  handler: async (ctx) => {
    const args = z.object({ apply: z.string().optional() }).safeParse(ctx.args)
    if (!args.success) {
      return ctx.fail(args.error.message)
    }
    const project = projectDirectory(ctx)
    const client = granary({ project, plugins: defaultPlugins() })
    if (args.data.apply === undefined) {
      const result = await client.updates.prepare()
      if (isErr(result)) {
        return ctx.fail(result.error.message)
      }
      process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`)
      return
    }
    const path = resolve(project, args.data.apply)
    const bytes = await attemptAsync(() => readFile(path, 'utf8'))
    if (isErr(bytes)) {
      return ctx.fail(bytes.error.message)
    }
    const review = attempt((): unknown => JSON.parse(bytes.value))
    if (isErr(review)) {
      return ctx.fail(review.error.message)
    }
    const result = await client.updates.apply({ review: review.value })
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`)
  },
})
