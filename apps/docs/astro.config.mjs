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
          label: 'Setup',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Environment', slug: 'environment' },
            { label: 'Flow Structure', slug: 'flow-structure' },
            { label: 'DB Access', slug: 'database/access' },
          ],
        },
        {
          label: 'Hosting',
          items: [
            { label: 'Single Domain', slug: 'hosting/single-domain' },
            {
              label: 'Multiple Domains',
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
              label: 'Network Action Domain',
              slug: 'schemas/network-actions-domain',
            },
          ],
        },
        {
          label: 'Auth',
          items: [
            {
              label: 'Better Auth And OTP',
              slug: 'auth/better-auth-unified-otp',
            },
          ],
        },
        {
          label: 'Packages',
          items: [
            { label: 'Package Overview', slug: 'packages/overview' },
            { label: 'Adding Packages', slug: 'packages/add-packages' },
            { label: 'Config Package', slug: 'packages/config-package' },
            { label: 'Database Package', slug: 'packages/database-package' },
            { label: 'Schemas Package', slug: 'packages/schemas-and-registry' },
            { label: 'Auth Package', slug: 'packages/auth-package' },
            { label: 'API App', slug: 'apps/api' },
          ],
        },
      ],
    }),
  ],
});
