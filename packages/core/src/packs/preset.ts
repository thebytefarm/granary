import { uniq } from 'massaman/array'
import { z } from 'zod'

import { packRequestSchema } from '../project/config.js'
import { packManifestSchema } from './manifest.js'

const fields = packManifestSchema.unwrap().shape

/**
 * Describe an ordered, versioned set of leaf packs without recursive dependencies.
 * @example
 * presetSchema.safeParse({
 *   name: 'example/recommended', version: '0.1.0', description: 'Recommended rules.',
 *   packs: [{ name: 'example/rules', source: { kind: 'local', path: '../../rules' },
 *     manifest: 'granary.json', version: '0.1.0', content: ['docs'] }],
 * })
 */
export const presetSchema = z
  .strictObject({
    name: fields.name,
    version: fields.version,
    description: fields.description,
    packs: z
      .array(
        z
          .strictObject({ ...packRequestSchema.unwrap().shape, version: fields.version })
          .refine(
            (pack) => !pack.manifest.endsWith('granary.preset.json'),
            'Presets may contain only leaf packs'
          )
          .readonly()
      )
      .min(1)
      .readonly(),
  })
  .refine(
    (preset) =>
      uniq(preset.packs.map((pack) => pack.name)).length === preset.packs.length &&
      preset.packs.every((pack) => pack.name !== preset.name),
    'Preset members must have unique identities different from the preset'
  )
  .readonly()

export type Preset = z.infer<typeof presetSchema>
