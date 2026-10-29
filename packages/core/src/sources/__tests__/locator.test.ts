import { describe, expect, it } from 'vitest'

import { packDirectory, packDirectorySegment } from '#/sources/locator.ts'

describe('default context paths', () => {
  it('preserves readable repository names and full versions', () => {
    expect(packDirectory('github:vercel/next.js')).toBe('github/vercel/next.js')
    expect(packDirectory('github:my-org/my_repo/docs')).toBe('github/my-org/my_repo/docs')
    expect(packDirectorySegment('v15.4.0')).toBe('v15.4.0')
    expect(packDirectorySegment('v15.5.0')).toBe('v15.5.0')
  })

  it.each([
    '',
    '.',
    '..',
    '-ref',
    'feature/docs',
    'a:b',
    'a\\b',
    'a b',
    'a%20b',
    'Zoë',
    'a?b',
    'a*b',
  ])('keeps unsafe segments contained and uses only portable filename characters: %j', (value) => {
    const segment = packDirectorySegment(value)
    expect(segment).toMatch(/^[A-Za-z0-9_][A-Za-z0-9._-]*$/)
    expect(segment).not.toContain('%')
    expect(segment).not.toBe('.')
    expect(segment).not.toBe('..')
  })

  it('distinguishes escaped characters from literal escape-looking names', () => {
    const values = [
      '',
      '_x_',
      '/',
      '_x2f_',
      'feature/docs',
      'feature_x2f_docs',
      '.',
      '_x2e_',
      '..',
      '_x2e_.',
      'a:b',
      'a-b',
      'a b',
      'a_b',
    ]
    const segments = values.map(packDirectorySegment)
    expect(new Set(segments).size).toBe(values.length)
  })

  it('never lets local source traversal escape the output namespace', () => {
    expect(packDirectory('file:../team/docs')).toBe('file/_x2e_./team/docs')
    expect(packDirectory('./docs')).toBe('_x2e_/docs')
  })
})
