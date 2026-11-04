import { BUILT_IN_THEMES, defineTheme } from '@ciderpress/theme'
import type { CiderpressTheme } from '@ciderpress/theme'
import { defineConfig } from 'ciderpress/config'
import { createElement } from 'react'

import { FarmHero } from './docs/components/farm-hero.tsx'

const granaryTheme = createGranaryTheme()

export default defineConfig({
  title: 'Granary',
  description: 'Give your agent better context.',
  theme: { themes: [granaryTheme], defaultVariant: 'dark', variantSwitcher: false },
  brand: {
    logo: '/logo.svg',
    banner: () => createElement(FarmHero),
    favicon: { src: '/icon.svg', type: 'image/svg+xml' },
    loader: { content: '/icon.svg', label: 'Granary' },
  },
  home: {
    hero: {
      label: 'Alpha',
      tagline:
        'Install versioned docs and source in your repository for your coding agent to read.',
      actions: [
        {
          text: 'Try the quick start',
          href: '/getting-started/quick-start',
          variant: 'primary',
        },
        { text: 'Browse the packs', href: '/packs', variant: 'secondary' },
      ],
      demo: false,
    },
    blocks: [
      {
        type: 'split',
        label: 'Reference material for coding agents',
        title: 'Give your agent the version you use.',
        body: 'Choose the revision and files your project needs. A lockfile lets your team restore the same selection.',
        visual: {
          type: 'image',
          src: '/context-workspace.svg',
          alt: 'An illustrative Next.js v16.0.0 selection in granary.json produces local docs, a lockfile, and direct reference links in AGENTS.md. This installs reference files, not the Next.js dependency.',
        },
        cta: {
          text: 'Try the quick start',
          href: '/getting-started/quick-start',
          variant: 'primary',
        },
      },
      {
        type: 'split',
        reverse: true,
        label: 'How the agent uses it',
        title: 'Your agent knows where to look.',
        body: 'Granary links installed docs and source directly in AGENTS.md. Your agent reads them with its existing tools, even offline.',
        visual: {
          type: 'image',
          src: '/context-sources.svg',
          alt: 'Git docs, source examples, and local standards become local context with direct reference links in AGENTS.md for your coding agent.',
        },
        cta: {
          text: 'See how agents use it',
          href: '/guides/use-agent-context',
          variant: 'secondary',
        },
      },
      {
        type: 'split',
        label: 'Tend your context',
        title: 'Update without losing your edits.',
        body: 'Adapt installed files to your project, then review upstream changes before applying them. Keep your edits, accept incoming files, or supply a merged version.',
        visual: {
          type: 'image',
          src: '/context-review.svg',
          alt: 'A three-way review compares baseline, local edits, and incoming changes, with explicit keep, accept, or merge decisions.',
        },
        cta: {
          text: 'Read the update workflow',
          href: '/concepts/pack-maintenance',
          variant: 'secondary',
        },
      },
      {
        type: 'features',
        columns: 3,
        label: 'Grown at the Bytefarm',
        title: 'Start with our engineering standards.',
        body: 'Functional coding standards, bundled with shared engineering, Git, documentation, and agent guidance.',
        items: [
          {
            title: 'TypeScript',
            description: 'Factories, immutable values, typed Results, and exhaustive matching.',
            icon: { id: 'simple-icons:typescript', color: 'amber' },
            link: '/packs/recommended/typescript',
          },
          {
            title: 'Rust',
            description:
              'Ownership, Result and Option, exhaustive enums, and iterator composition.',
            icon: { id: 'simple-icons:rust', color: 'amber' },
            link: '/packs/recommended/rust',
          },
          {
            title: 'Python',
            description: 'Pure functions, immutable data, and typed Results with returns.',
            icon: { id: 'simple-icons:python', color: 'green' },
            link: '/packs/recommended/python',
          },
        ],
      },
      {
        type: 'cta',
        label: 'Try the alpha',
        title: 'Give your next session the docs it needs.',
        body: 'Install Granary from npm and try Next.js 16 docs in a disposable project. No hosted account required.',
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
        radii: { ...base.radii, md: '4px', lg: '6px', mdLg: '8px', pill: '4px' },
        shadows: {
          ...base.shadows,
          cardHover: '0 4px 0 rgba(214, 162, 82, 0.12)',
          heroDemo: '0 16px 40px -16px rgba(0, 0, 0, 0.55)',
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
            bg: '#0c1010',
            bgAlt: '#101615',
            bgElv: '#161d1a',
            bgSoft: '#080c0c',
            bgIcon: '#1d261e',
            homeBg: '#0c1010',
            overlayFaint: 'rgba(247, 229, 197, 0.04)',
            gutter: '#080c0c',
            codeBlockBg: '#080c0c',
          },
          text: { ...base.colors.text, text1: '#f7eedc', text2: '#b9c2b7', text3: '#8e9b8d' },
          border: {
            ...base.colors.border,
            border: 'rgba(185, 194, 183, 0.16)',
            divider: 'rgba(185, 194, 183, 0.09)',
            sidebarAltBorderDark: '#2d3c31',
          },
          tint: {
            ...base.colors.tint,
            amber: { bg: 'rgba(214, 162, 82, 0.12)', fg: '#d6a252' },
            green: { bg: 'rgba(147, 181, 122, 0.12)', fg: '#a6c58b' },
            purpleGlow: 'rgba(147, 181, 122, 0.04)',
          },
          gradient: { heroCyan: '#f7e5c5', heroPurple: '#d6a252' },
          terminal: {
            ...base.colors.terminal,
            bg: '#080c0c',
            titlebarBg: '#101615',
            border: '#2d3c31',
            title: '#b9c2b7',
            text: '#f7e5c5',
            output: '#b9c2b7',
            promptPrefix: '#d6a252',
          },
          syntax: { kw: '#d6a252', str: '#a6c58b', fn: '#f7eedc' },
          scrollbar: { thumb: '#354539', thumbHover: '#607254' },
          button: {
            ...base.colors.button,
            brand: { bg: '#d6a252', hoverBg: '#f7e5c5', activeBg: '#b77a2b', text: '#181610' },
          },
        },
      },
    },
  })
}
