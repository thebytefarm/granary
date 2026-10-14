import { BUILT_IN_THEMES, defineTheme } from '@ciderpress/theme'
import type { CiderpressTheme } from '@ciderpress/theme'
import { defineConfig } from 'ciderpress/config'

const granaryTheme = createGranaryTheme()

export default defineConfig({
  title: 'Granary',
  description: 'Ship context. Versioned docs and source, right inside your repo.',
  theme: { themes: [granaryTheme], defaultVariant: 'dark', variantSwitcher: false },
  brand: {
    logo: '/logo.svg',
    favicon: { src: '/icon.svg', type: 'image/svg+xml' },
    loader: { content: '/icon.svg', label: 'Granary' },
  },
  home: {
    hero: {
      label: 'Local context for coding agents · In development',
      tagline:
        'Your dependencies ship code. Granary brings the knowledge to work with it. Package docs, source, and examples into versioned context your agent can read on disk.',
      actions: [
        {
          text: 'Create your first pack',
          href: '/getting-started/quick-start',
          variant: 'primary',
        },
        { text: 'Explore the API', href: '/reference/cli', variant: 'secondary' },
      ],
      demo: {
        type: 'image',
        src: '/hero.svg',
        alt: 'A Granary context manifest beside a local pack directory',
      },
    },
    blocks: [
      { type: 'proof', lead: 'Built with', names: ['maltty', 'Zod', 'Ciderpress', 'TypeScript'] },
      {
        type: 'features',
        columns: 3,
        title: 'Reference material, ready for the workspace.',
        items: [
          {
            title: 'A directory is a pack',
            description:
              'Describe your files with granary.json. Keep the structure you already use.',
            icon: 'pixelarticons:folder',
            link: '/reference/pack-manifest',
          },
          {
            title: 'Docs and implementation',
            description:
              'Give agents the explanation and the source behind it, in one readable bundle.',
            icon: 'pixelarticons:code',
            link: '/concepts/context-packs',
          },
          {
            title: 'One place to read',
            description:
              'Copy docs into your chosen directory and keep reference code hidden and Git-ignored.',
            icon: 'pixelarticons:archive',
            link: '/reference/project-config',
          },
          {
            title: 'Bring your own host',
            description:
              'Use local directories and Git repos today. Object storage and URL/API providers are planned.',
            icon: 'pixelarticons:cloud',
            link: '/reference/sources',
          },
          {
            title: 'Versions you can reproduce',
            description:
              'Pin upstream commits and file integrity so your team reads the same material.',
            icon: 'pixelarticons:git-branch',
            link: '/concepts/installation',
          },
          {
            title: 'Any coding agent',
            description:
              'Read the entry file and search the contents with ordinary filesystem tools.',
            icon: 'pixelarticons:terminal',
            link: '/guides/use-agent-context',
          },
        ],
      },
      {
        type: 'split',
        title: 'Declare what you provide and consume.',
        body: 'One granary.json names your packs and dependencies. Paths stay configurable; the lock records exact revisions and selected file integrity.',
        visual: {
          type: 'code',
          language: 'json',
          code: '{\n  "schemaVersion": 1,\n  "dependencies": {\n    "bytefarm/recommended-typescript": {\n      "source": "file:.",\n      "version": "0.1.0"\n    }\n  },\n  "installDir": ".context"\n}',
        },
        cta: {
          text: 'Read the manifest reference',
          href: '/reference/pack-manifest',
          variant: 'secondary',
        },
      },
      {
        type: 'cta',
        title: 'Start with the context you already have.',
        body: 'Granary provides focused engineering and language packs. Select a recommended set and use its installed files with your agent.',
        actions: [
          { text: 'Try the quick start', href: '/getting-started/quick-start', variant: 'primary' },
          {
            text: 'Read the standards',
            href: '/packs',
            variant: 'secondary',
          },
        ],
      },
    ],
  },
  topbar: {
    nav: [
      { title: 'Start here', link: '/getting-started/introduction' },
      { title: 'Concepts', link: '/concepts/context-packs' },
      { title: 'Guides', link: '/guides/create-pack' },
      { title: 'Reference', link: '/reference/cli' },
    ],
    cta: { text: 'Quick start', href: '/getting-started/quick-start' },
  },
  sidebar: {
    bottom: [{ text: 'Contributing', href: '/contributing', icon: 'pixelarticons:git-merge' }],
  },
  pages: [
    {
      title: 'Getting started',
      path: '/getting-started',
      icon: 'pixelarticons:speed-fast',
      pages: [
        {
          title: 'Introduction',
          path: '/getting-started/introduction',
          include: 'docs/getting-started/introduction.md',
        },
        {
          title: 'Quick start',
          path: '/getting-started/quick-start',
          include: 'docs/getting-started/quick-start.md',
        },
        {
          title: 'Project status',
          path: '/getting-started/status',
          include: 'docs/getting-started/status.md',
        },
      ],
    },
    {
      title: 'Concepts',
      path: '/concepts',
      include: 'docs/concepts/*.md',
      discover: { sort: 'alpha' },
      icon: 'pixelarticons:lightbulb',
    },
    {
      title: 'Guides',
      path: '/guides',
      include: 'docs/guides/*.md',
      discover: { sort: 'alpha' },
      icon: 'pixelarticons:book',
    },
    {
      title: 'Reference',
      path: '/reference',
      include: 'docs/reference/*.md',
      discover: { sort: 'alpha' },
      icon: 'pixelarticons:list-box',
    },
    {
      title: 'Packs',
      path: '/packs',
      include: 'packs/README.md',
      nav: { island: true },
      pages: [
        {
          title: 'Engineering',
          path: '/packs/engineering',
          include: 'packs/engineering/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'TypeScript',
          path: '/packs/typescript',
          include: 'packs/typescript/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'Rust',
          path: '/packs/rust',
          include: 'packs/rust/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'Python',
          path: '/packs/python',
          include: 'packs/python/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'Documentation',
          path: '/packs/documentation',
          include: 'packs/documentation/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'Git',
          path: '/packs/git',
          include: 'packs/git/*.md',
          discover: { sort: 'alpha' },
        },
        {
          title: 'Agent instruction pack',
          path: '/packs/agent-instructions',
          include: 'packs/agent-instructions/*.md',
          discover: { sort: 'alpha' },
        },
      ],
    },
    {
      title: 'Contributing',
      path: '/contributing',
      include: 'contributing/README.md',
      nav: { island: true },
      pages: [
        {
          title: 'Agent context',
          path: '/contributing/agents',
          include: 'contributing/agent-context.md',
        },
      ],
    },
  ],
  footer: {
    tagline: 'Ship context.',
    copyright: { company: 'Bytefarm', year: 2026 },
    columns: [
      {
        heading: 'Learn',
        links: [
          { text: 'Introduction', href: '/getting-started/introduction' },
          { text: 'Quick start', href: '/getting-started/quick-start' },
          { text: 'Project status', href: '/getting-started/status' },
        ],
      },
      {
        heading: 'Build',
        links: [
          { text: 'Pack manifest', href: '/reference/pack-manifest' },
          { text: 'CLI', href: '/reference/cli' },
          { text: 'Project configuration', href: '/reference/project-config' },
        ],
      },
      {
        heading: 'Contribute',
        links: [
          { text: 'Contributing', href: '/contributing' },
          { text: 'Standards packs', href: '/packs' },
        ],
      },
    ],
  },
})

/**
 * @private
 */
function createGranaryTheme(): CiderpressTheme {
  const base = BUILT_IN_THEMES.midnight.variants.dark
  if (!base) {
    return BUILT_IN_THEMES.amber
  }
  return defineTheme({
    name: 'granary',
    defaultVariant: 'dark',
    variants: {
      dark: {
        ...base,
        colors: {
          ...base.colors,
          brand: {
            primary: '#e6be72',
            hover: '#f0ce92',
            active: '#cba356',
            fg: '#171c18',
            soft: 'rgba(230, 190, 114, 0.14)',
            onBrand: '#171c18',
            light: '#f0ce92',
            lighter: '#f7e2bb',
          },
          surface: {
            ...base.colors.surface,
            bg: '#171c18',
            bgAlt: '#1d241e',
            bgElv: '#252e26',
            bgSoft: '#121713',
            homeBg: '#121713',
          },
          text: { ...base.colors.text, text1: '#f5f0e6', text2: '#bbbfb0', text3: '#858d7e' },
          border: {
            ...base.colors.border,
            border: 'rgba(230, 190, 114, 0.16)',
            divider: 'rgba(230, 190, 114, 0.09)',
          },
          button: {
            ...base.colors.button,
            brand: { bg: '#e6be72', hoverBg: '#f0ce92', activeBg: '#cba356', text: '#171c18' },
          },
        },
      },
    },
  })
}
