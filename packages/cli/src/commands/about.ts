import { command } from 'maltty'

export default command({
  description: 'Learn about Granary and its current development status',
  handler: (ctx) => {
    ctx.log.info('Granary: ship versioned docs and source as local context for coding agents.')
    ctx.log.info('Install local and Git packs with selectable content and pinned source commits.')
  },
})
