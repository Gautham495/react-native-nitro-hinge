import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Examples',
      link: {
        type: 'generated-index',
        slug: '/examples',
        description:
          'Full screens from the example app, each with a recording from a simulator or emulator.',
      },
      items: [
        'examples/list-detail',
        'examples/posture',
        'examples/lid',
        'examples/blocked-js',
      ],
    },
    'ai-agents',
    {
      type: 'category',
      label: 'Background',
      items: ['foldables', 'android-foldables-device-metrics'],
    },
  ],
};

export default sidebars;
