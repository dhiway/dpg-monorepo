import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.example.com',
  integrations: [
    starlight({
      title: 'DPG Monorepo',
      description:
        'Architecture, setup, and package documentation for the DPG backend monorepo.',
      head: [],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Environment', slug: 'environment' },
          ],
        },
        {
          label: 'Apps',
          items: [{ label: 'API App', slug: 'apps/api' }],
        },
        {
          label: 'Packages',
          items: [
            { label: 'Package Overview', slug: 'packages/overview' },
            {
              label: 'Schemas And Registry',
              slug: 'packages/schemas-and-registry',
            },
          ],
        },
      ],
    }),
  ],
});
