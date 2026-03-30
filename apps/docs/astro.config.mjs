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
          label: 'Start Here',
          items: [
            { label: 'What Is DPG?', slug: 'index' },
            { label: 'Vocabulary', slug: 'concepts/vocabulary' },
            { label: 'Architecture', slug: 'concepts/architecture' },
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Environment', slug: 'environment' },
          ],
        },
        {
          label: 'Hosting',
          items: [
            { label: 'Local And Docker', slug: 'hosting/local-docker' },
            { label: 'Single Instance', slug: 'hosting/single-domain' },
            {
              label: 'Multi-Instance Hosting',
              slug: 'hosting/multi-domain-instance',
            },
            {
              label: 'Dokploy Nixpacks',
              slug: 'hosting/dokploy-nixpacks',
            },
          ],
        },
        {
          label: 'Schemas',
          items: [
            {
              label: 'Schema Authoring Guide',
              slug: 'schemas/authoring',
            },
            {
              label: 'Network Schema Reference',
              slug: 'schemas/network-actions-domain',
            },
            { label: 'Example Networks', slug: 'schemas/examples' },
            {
              label: 'DOT Example Schemas',
              slug: 'schemas/dot-examples',
            },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'API Overview', slug: 'apps/api' },
            {
              label: 'Better Auth And OTP',
              slug: 'auth/better-auth-unified-otp',
            },
            { label: 'DB Access', slug: 'database/access' },
          ],
        },
        {
          label: 'Internals',
          items: [
            { label: 'Flow Structure', slug: 'flow-structure' },
            { label: 'Package Overview', slug: 'packages/overview' },
            { label: 'Adding Packages', slug: 'packages/add-packages' },
            { label: 'Config Package', slug: 'packages/config-package' },
            { label: 'Database Package', slug: 'packages/database-package' },
            { label: 'Schemas Package', slug: 'packages/schemas-and-registry' },
            { label: 'Auth Package', slug: 'packages/auth-package' },
            { label: 'API App', slug: 'apps/api' },
            { label: 'UI App', slug: 'apps/ui' },
          ],
        },
      ],
    }),
  ],
});
