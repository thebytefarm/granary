import type { StandardsExport } from '#/standards/client.ts'

/**
 * Render complete authored concepts and effective consumer controls for Markdown-based reviewers.
 * @param options - Validated canonical extraction; Greptile output is suitable for .greptile/rules.md.
 * @returns Markdown retaining original examples, qualified rule identities, provenance, and coverage notes.
 * @example
 * renderStandardsMarkdown({ standards: extracted, target: 'greptile' })
 */
export function renderStandardsMarkdown({
  standards,
  target,
}: {
  readonly standards: StandardsExport
  readonly target: 'markdown' | 'greptile'
}): string {
  const heading = exportHeading(target)
  const concepts = standards.standards
    .map((standard) => {
      const provenance = standard.provenance
      const rules = standard.rules
        .map((rule) => {
          const notes = rule.effectiveEnforcement.notes ?? ''
          return `- ${rule.qualifiedId}: ${rule.effectiveEnforcement.markers.join(' ')} ${notes}`.trimEnd()
        })
        .join('\n')
      return `## ${standard.title}\n\nIdentity: ${standard.qualifiedId}\n\nSource: ${provenance.pack}@${provenance.version}, ${provenance.group}/${provenance.path}\n\nContent hash: ${provenance.hash}\n\nAccepted upstream hash: ${provenance.upstreamHash ?? 'none (local addition)'}\n\nCustomized: ${String(provenance.customized)}\n\n${standard.markdown}\n\n### Effective consumer enforcement\n\n${rules}`
    })
    .join('\n\n---\n\n')
  if (concepts === '') {
    return `${heading}\n\nNo standards were selected. This is not evidence that code complies with any rules.\n`
  }
  return `${heading}\n\nGenerated from Granary standards JSON schema version ${standards.schemaVersion}. Review applicable rules using their rationale and examples. Enforcement markers describe controls; they do not execute checks or establish finding severity.\n\n${concepts}\n`
}

/**
 * Serialize standards using YAML 1.2's JSON-compatible flow syntax.
 * @param standards - Validated standards with authored and effective enforcement.
 * @returns YAML retaining multiline sources without an additional serializer.
 */
export function renderStandardsYAML(standards: StandardsExport): string {
  return `${JSON.stringify(standards, null, 2)}\n`
}

/**
 * @private
 */
function exportHeading(target: 'markdown' | 'greptile'): string {
  if (target === 'greptile') {
    return '# Granary standards for Greptile review'
  }
  return '# Granary standards'
}
