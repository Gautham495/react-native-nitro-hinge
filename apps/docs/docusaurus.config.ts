import type { Options as DocsOptions } from '@docusaurus/plugin-content-docs';
import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import type { PluginOptions as LlmsOptions } from 'docusaurus-plugin-llms';
import { themes as prismThemes } from 'prism-react-renderer';
import { version } from '../../packages/react-native-nitro-hinge/package.json';
import codeMatchesFile from './src/remark/code-matches-file';

const url = 'https://gautham495.github.io';
const baseUrl = '/react-native-nitro-hinge/';
const site = `${url}${baseUrl}`;
const repo = 'https://github.com/Gautham495/react-native-nitro-hinge';

const description =
  'Size class, safe insets, hinge geometry and hinge angle for React Native on iOS and Android. One API for phones, tablets, Android foldables, tri-folds and the iPhone Duo, built on Nitro.';

const config: Config = {
  title: 'react-native-nitro-hinge',
  tagline: 'Adaptive layouts for foldables, tablets and the iPhone Duo',
  favicon: 'img/favicon.png',

  url,
  baseUrl,
  customFields: { version },
  organizationName: 'Gautham495',
  projectName: 'react-native-nitro-hinge',

  // GitHub Pages redirects /page to /page/. Generating the same URLs keeps
  // the canonical links and the sitemap pointing at the served address.
  trailingSlash: true,

  onBrokenLinks: 'throw',
  markdown: {
    // The pages are plain Markdown that GitHub renders too, so .md files
    // skip MDX parsing, which chokes on braces and angle brackets in prose.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },

  // Also turns on Docusaurus Faster (Rspack and SWC).
  future: {
    v4: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../../docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: ({ docPath }) => `${repo}/edit/main/docs/${docPath}`,
          remarkPlugins: [codeMatchesFile],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // The skill's reference files double as the Reference section, so
    // agents using the skill and readers of the site get the same text.
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'reference',
        path: '../../skills/react-native-nitro-hinge/references',
        routeBasePath: 'reference',
        sidebarPath: './sidebars-reference.ts',
        editUrl: ({ docPath }) =>
          `${repo}/edit/main/skills/react-native-nitro-hinge/references/${docPath}`,
      } satisfies DocsOptions,
    ],
    [
      'docusaurus-plugin-llms',
      {
        docsDir: [
          { path: '../../docs', routeBasePath: '/', label: 'Docs' },
          {
            path: '../../skills/react-native-nitro-hinge/references',
            routeBasePath: 'reference',
            label: 'Reference',
          },
        ],
        version,
        description,
        rootContent: [
          'Install with `yarn add react-native-nitro-hinge react-native-nitro-modules`.',
          'Each page below is also served as Markdown: replace the trailing slash of its URL with `.md`.',
          'Coding agents can install the agent skill with `npx skills add Gautham495/react-native-nitro-hinge`.',
        ].join(' '),
        includeOrder: [
          'intro.md',
          'examples/list-detail.md',
          'examples/posture.md',
          'examples/lid.md',
          'examples/blocked-js.md',
          'setup.md',
          'api.md',
          'layouts.md',
          'animations.md',
          'ai-agents.md',
          'foldables.md',
          'android-foldables-device-metrics.md',
        ],
        generateMarkdownFiles: true,
        rewriteImageUrls: true,
      } satisfies LlmsOptions,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'react-native-nitro-hinge',
      logo: {
        alt: '',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'reference',
          docsPluginId: 'reference',
          position: 'left',
          label: 'Reference',
        },
        {
          href: `${site}llms.txt`,
          label: 'llms.txt',
          position: 'right',
        },
        {
          href: repo,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/intro/' },
            { label: 'Examples', to: '/examples/' },
            { label: 'API', to: '/reference/api/' },
          ],
        },
        {
          title: 'For AI agents',
          items: [
            { label: 'llms.txt', href: `${site}llms.txt` },
            { label: 'llms-full.txt', href: `${site}llms-full.txt` },
            { label: 'Agent skill', to: '/ai-agents/' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: repo },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/react-native-nitro-hinge',
            },
          ],
        },
      ],
      copyright: 'MIT © Gautham Vijayan',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
