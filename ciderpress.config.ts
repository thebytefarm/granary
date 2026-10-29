import { BUILT_IN_THEMES, defineTheme } from '@ciderpress/theme'
import type { CiderpressTheme } from '@ciderpress/theme'
import { defineConfig } from 'ciderpress/config'

const granaryTheme = createGranaryTheme()

export default defineConfig({
  title: 'Granary',
  description: 'A storehouse for agent knowledge.',
  theme: { themes: [granaryTheme], defaultVariant: 'dark', variantSwitcher: false },
  brand: {
    logo: '/logo.svg',
    favicon: { src: '/icon.svg', type: 'image/svg+xml' },
    loader: { content: '/icon.svg', label: 'Granary' },
  },
  home: {
    hero: {
      label: 'Versioned docs & source',
      tagline:
        'The right docs. The actual source. Right in your repo. Give your coding agent versioned reference material it can read on disk.',
      actions: [
        {
          text: 'Get started',
          href: '/getting-started/quick-start',
          variant: 'primary',
        },
        { text: 'Browse the packs', href: '/packs', variant: 'secondary' },
      ],
      demo: {
        type: 'code',
        language: 'sh',
        code: 'npm install --global granary-ai\ngranary add thebytefarm/granary --pack recommended-typescript',
      },
    },
    blocks: [
      {
        type: 'features',
        columns: 3,
        label: 'Stock the workspace',
        title: 'Good context. Close at hand.',
        body: 'From a local directory or a Git repo to reference material your agent can use.',
        items: [
          {
            title: 'Pack what matters',
            description:
              'Turn docs, source, and examples into a versioned pack. Keep the directory structure you already use.',
            icon: { id: 'pixelarticons:archive', color: 'amber' },
            link: '/reference/pack-manifest',
          },
          {
            title: 'Keep it local',
            description:
              'Install reference material into your repo. Your agent reads ordinary files with the tools it already has.',
            icon: { id: 'pixelarticons:folder', color: 'amber' },
            link: '/reference/project-config',
          },
          {
            title: 'Lock the harvest',
            description:
              'Pin versions, Git commits, and file integrity. Restore the same reference material across your team.',
            icon: { id: 'pixelarticons:git-branch', color: 'amber' },
            link: '/concepts/installation',
          },
        ],
      },
      {
        type: 'split',
        label: 'One manifest. A stocked repo.',
        title: 'Choose your context. Make it repeatable.',
        body: 'Declare the packs your project needs in granary.json. Install from local directories or Git, then keep exact revisions in the lockfile.',
        bullets: [
          'Compose focused packs into a recommended set.',
          'Keep readable docs in .context/.',
          'Store reference source separately and Git-ignored.',
        ],
        visual: {
          type: 'code',
          language: 'json',
          code: '{\n  "schemaVersion": 1,\n  "dependencies": {\n    "bytefarm/recommended-typescript": {\n      "source": "file:.",\n      "version": "0.1.0"\n    }\n  },\n  "installDir": ".context"\n}',
        },
        cta: {
          text: 'See how installation works',
          href: '/guides/install-packs',
          variant: 'secondary',
        },
      },
      {
        type: 'cta',
        label: 'From the Bytefarm',
        title: 'Your first packs are already here.',
        body: 'Start with a recommended TypeScript, Rust, or Python set. Each includes shared engineering, Git, documentation, and agent-instruction packs.',
        actions: [
          { text: 'Try the quick start', href: '/getting-started/quick-start', variant: 'primary' },
          {
            text: 'Explore the standards',
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
      { title: 'Packs', link: '/packs' },
      { title: 'Guides', link: '/guides/create-pack' },
      { title: 'Reference', link: '/reference/cli' },
      { title: 'GitHub', link: 'https://github.com/thebytefarm/granary' },
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
      include: 'docs/packs/index.mdx',
      icon: 'pixelarticons:archive',
      discover: { sort: 'none' },
      nav: { island: true },
      pages: [
        {
          title: 'Recommended',
          description:
            'Install a language pack together with engineering, Git, documentation, and agent instructions.',
          path: '/packs/recommended',
          icon: { id: 'pixelarticons:layers', color: 'amber' },
          discover: { sort: 'none' },
          pages: [
            {
              title: 'TypeScript',
              description: 'Shared engineering standards and functional TypeScript in one install.',
              path: '/packs/recommended/typescript',
              include: 'docs/packs/recommended-typescript.mdx',
              icon: { id: 'simple-icons:typescript', color: 'amber' },
            },
            {
              title: 'Rust',
              description: 'Shared engineering standards and functional Rust in one install.',
              path: '/packs/recommended/rust',
              include: 'docs/packs/recommended-rust.mdx',
              icon: { id: 'simple-icons:rust', color: 'amber' },
            },
            {
              title: 'Python',
              description: 'Shared engineering standards and functional Python in one install.',
              path: '/packs/recommended/python',
              include: 'docs/packs/recommended-python.mdx',
              icon: { id: 'simple-icons:python', color: 'amber' },
            },
          ],
        },
        {
          title: 'Languages',
          description:
            'Language-specific rules for functional code, explicit failures, and behavioral testing.',
          path: '/packs/languages',
          icon: { id: 'pixelarticons:code', color: 'amber' },
          discover: { sort: 'none' },
          nav: { collapsible: true },
          pages: [
            {
              title: 'TypeScript',
              description:
                'Write functional TypeScript with declared functions, immutable values, typed Results, and exhaustive matching. Covers module layout, naming, types, state, composition, JSDoc, and behavioral tests.',
              path: '/packs/languages/typescript',
              icon: { id: 'simple-icons:typescript', color: 'amber' },
              include: 'packs/typescript/*.md',
              discover: { sort: 'alpha' },
            },
            {
              title: 'Rust',
              description:
                'Use ownership and borrowing to keep domain logic pure. Covers native Result and Option, exhaustive enums, iterator composition, crate layout, API contracts, and behavioral tests.',
              path: '/packs/languages/rust',
              icon: { id: 'simple-icons:rust', color: 'amber' },
              include: 'packs/rust/*.md',
              discover: { sort: 'alpha' },
            },
            {
              title: 'Python',
              description:
                'Build Python around pure transformations, immutable domain values, explicit capabilities, and typed Results with returns. Covers modules, types, state, composition, documentation, and behavioral tests.',
              path: '/packs/languages/python',
              icon: { id: 'simple-icons:python', color: 'amber' },
              include: 'packs/python/*.md',
              discover: { sort: 'alpha' },
            },
          ],
        },
        {
          title: 'Shared standards',
          description:
            'Language-independent rules for engineering decisions, review, documentation, and agent context.',
          path: '/packs/shared',
          icon: { id: 'pixelarticons:sliders', color: 'amber' },
          discover: { sort: 'none' },
          nav: { collapsible: true },
          pages: [
            {
              title: 'Engineering',
              description:
                'Keep domain logic pure and effects behind resource-owning adapters. Covers focused changes, immutable state, errors as values, dependency evaluation, meaningful comments, and behavioral testing.',
              path: '/packs/shared/engineering',
              icon: { id: 'pixelarticons:sliders', color: 'amber' },
              include: 'packs/engineering/*.md',
              discover: { sort: 'alpha' },
            },
            {
              title: 'Git',
              description:
                'Make each change understandable in history and review. Covers scoped commits, useful commit messages, focused pull requests, and accurate verification evidence.',
              path: '/packs/shared/git',
              icon: { id: 'pixelarticons:git-branch', color: 'amber' },
              include: 'packs/git/*.md',
              discover: { sort: 'alpha' },
            },
            {
              title: 'Documentation',
              description:
                "Choose a page shape from the reader's task. Covers writing, portable Markdown, diagrams, standards, guides, quick starts, tutorials, references, troubleshooting, and runbooks.",
              path: '/packs/shared/documentation',
              icon: { id: 'pixelarticons:book', color: 'amber' },
              include: 'packs/documentation/*.md',
              discover: { sort: 'alpha' },
            },
            {
              title: 'Agent instructions',
              description:
                'Give coding agents a short operating contract and a route to the right context. Covers repository instructions, canonical rule ownership, and reading order across installed packs.',
              path: '/packs/shared/agent-instructions',
              icon: { id: 'pixelarticons:robot', color: 'amber' },
              include: 'packs/agent-instructions/*.md',
              discover: { sort: 'alpha' },
            },
          ],
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
    tagline: 'A storehouse for agent knowledge.',
    copyright: { company: 'Bytefarm', year: 2026 },
    columns: [
      {
        heading: 'Learn',
        links: [
          { text: 'Introduction', href: '/getting-started/introduction' },
          { text: 'Quick start', href: '/getting-started/quick-start' },
          { text: 'Install packs', href: '/guides/install-packs' },
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
          { text: 'GitHub', href: 'https://github.com/thebytefarm/granary' },
        ],
      },
    ],
  },
})

/**
 * @private
 */
function createGranaryTheme(): CiderpressTheme {
  const base = BUILT_IN_THEMES.amber.variants.dark
  if (!base) {
    return BUILT_IN_THEMES.amber
  }
  return defineTheme({
    name: 'granary',
    defaultVariant: 'dark',
    variants: {
      dark: {
        ...base,
        radii: { ...base.radii, md: '6px', lg: '8px', mdLg: '10px' },
        shadows: {
          ...base.shadows,
          cardHover: '0 4px 16px rgba(0, 0, 0, 0.14)',
          heroDemo: '0 16px 40px -16px rgba(0, 0, 0, 0.35)',
        },
        gradients: {
          ...base.gradients,
          brand: 'linear-gradient(135deg, #d6a252, #b77a2b)',
          heroTitle: 'linear-gradient(135deg, #f7e5c5, #f7e5c5)',
        },
        colors: {
          ...base.colors,
          brand: {
            primary: '#d6a252',
            hover: '#f7e5c5',
            active: '#b77a2b',
            fg: '#181610',
            soft: 'rgba(214, 162, 82, 0.14)',
            onBrand: '#181610',
            light: '#f7e5c5',
            lighter: '#f7e5c5',
          },
          surface: {
            ...base.colors.surface,
            bg: '#211d17',
            bgAlt: '#282219',
            bgElv: '#30291f',
            bgSoft: '#1b1813',
            bgIcon: '#382e20',
            homeBg: '#211d17',
            overlayFaint: 'rgba(247, 229, 197, 0.04)',
            gutter: '#1b1813',
            codeBlockBg: '#1b1813',
          },
          text: { ...base.colors.text, text1: '#f7e5c5', text2: '#bfb5a3', text3: '#918675' },
          border: {
            ...base.colors.border,
            border: 'rgba(214, 162, 82, 0.16)',
            divider: 'rgba(214, 162, 82, 0.09)',
            sidebarAltBorderDark: '#5a4830',
          },
          tint: {
            ...base.colors.tint,
            amber: { bg: 'rgba(214, 162, 82, 0.12)', fg: '#d6a252' },
            purpleGlow: 'rgba(214, 162, 82, 0.06)',
          },
          gradient: { heroCyan: '#f7e5c5', heroPurple: '#d6a252' },
          terminal: {
            ...base.colors.terminal,
            bg: '#1b1813',
            titlebarBg: '#282219',
            border: '#493c29',
            title: '#bfb5a3',
            text: '#f7e5c5',
            output: '#bfb5a3',
            promptPrefix: '#d6a252',
          },
          syntax: { kw: '#d6a252', str: '#e8c993', fn: '#f7e5c5' },
          scrollbar: { thumb: '#5a4830', thumbHover: '#87571f' },
          button: {
            ...base.colors.button,
            brand: { bg: '#d6a252', hoverBg: '#f7e5c5', activeBg: '#b77a2b', text: '#181610' },
          },
        },
      },
    },
  })
}
