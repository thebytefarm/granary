import aiSdk from '#packs/ai-sdk/granary.json' with { type: 'json' }
import hono from '#packs/hono/granary.json' with { type: 'json' }
import nextjs from '#packs/nextjs/granary.json' with { type: 'json' }
import react from '#packs/react/granary.json' with { type: 'json' }
import query from '#packs/tanstack-query/granary.json' with { type: 'json' }
import router from '#packs/tanstack-router/granary.json' with { type: 'json' }
import start from '#packs/tanstack-start/granary.json' with { type: 'json' }
import zod from '#packs/zod/granary.json' with { type: 'json' }

export const toolPacks = [
  {
    name: 'nextjs',
    label: 'Next.js docs',
    dependencies: ['next'],
    markers: ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs'],
    definition: nextjs,
  },
  { name: 'react', label: 'React docs', dependencies: ['react'], markers: [], definition: react },
  {
    name: 'tanstack-query',
    label: 'TanStack Query docs (React)',
    dependencies: ['@tanstack/react-query'],
    markers: [],
    definition: query,
  },
  {
    name: 'tanstack-router',
    label: 'TanStack Router docs',
    dependencies: ['@tanstack/react-router', '@tanstack/solid-router'],
    markers: [],
    definition: router,
  },
  {
    name: 'tanstack-start',
    label: 'TanStack Start docs',
    dependencies: ['@tanstack/react-start', '@tanstack/solid-start', '@tanstack/start'],
    markers: [],
    definition: start,
  },
  { name: 'hono', label: 'Hono docs', dependencies: ['hono'], markers: [], definition: hono },
  { name: 'zod', label: 'Zod docs', dependencies: ['zod'], markers: [], definition: zod },
  {
    name: 'ai-sdk',
    label: 'Vercel AI SDK docs',
    dependencies: ['ai', '@ai-sdk/react', '@ai-sdk/vue', '@ai-sdk/svelte'],
    markers: [],
    definition: aiSdk,
  },
] as const
