import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://docs.example.com',
  integrations: [
    mermaid({
      autoTheme: true,
    }),
    starlight({
      title: 'DPG Documentation',
      description:
        'Architecture, setup, and package documentation for the DPG backend monorepo.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/dhiway/dpg-monorepo',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/dhiway/dpg-monorepo/edit/main/apps/docs/',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#050505',
          },
        },
        {
          tag: 'script',
          content:
            "try{if(!localStorage.getItem('starlight-theme'))localStorage.setItem('starlight-theme','dark')}catch{}",
        },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'What Is DPG?', slug: 'index' },
            { label: 'Vocabulary', slug: 'concepts/vocabulary' },
            { label: 'Architecture', slug: 'concepts/architecture' },
            {
              label: 'Architecture Diagrams',
              slug: 'concepts/architecture-diagrams',
            },
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
              label: 'Dokploy',
              slug: 'hosting/dokploy',
            },
          ],
        },
        {
          label: 'Network Schema',
          items: [
            {
              label: 'Overview',
              slug: 'schemas/overview',
            },
            {
              label: 'Authoring Guide',
              slug: 'schemas/authoring',
            },
            {
              label: 'Action Flow Guide',
              slug: 'schemas/action-flow',
            },
            {
              label: 'Use Case Examples',
              slug: 'schemas/examples',
            },
            {
              label: 'Reference',
              slug: 'schemas/network-actions-domain',
            },
            {
              label: 'Existing Example Networks',
              slug: 'schemas/dot-examples',
            },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'API Overview', slug: 'apps/api' },
            { label: 'Running And Docker', slug: 'apps/api/running' },
            { label: 'Auth', slug: 'apps/api/auth' },
            { label: 'Items', slug: 'apps/api/items' },
            { label: 'Network Fetch', slug: 'apps/api/network-fetch' },
            { label: 'Actions And Events', slug: 'apps/api/actions-events' },
            { label: 'Schemas And Cache', slug: 'apps/api/schemas-cache' },
            { label: 'Route Reference', slug: 'apps/api/route-reference' },
            {
              label: 'Better Auth And OTP',
              slug: 'auth/better-auth-unified-otp',
            },
            { label: 'DB Access', slug: 'database/access' },
          ],
        },
        {
          label: 'UI',
          items: [
            { label: 'UI Overview', slug: 'apps/ui' },
            { label: 'Running The UI', slug: 'apps/ui/running' },
            {
              label: 'Credential Import And Wallets',
              slug: 'apps/ui/credential-import-and-wallets',
            },
            { label: 'Hardcoded Parts', slug: 'apps/ui/hardcoded-parts' },
            {
              label: 'Schema-Generated Parts',
              slug: 'apps/ui/schema-generated-parts',
            },
            { label: 'Components', slug: 'apps/ui/components' },
            { label: 'Utils And Packages', slug: 'apps/ui/utils-and-packages' },
            { label: 'Custom UI Guide', slug: 'apps/ui/custom-ui-guide' },
            { label: 'Maps', slug: 'apps/ui/maps' },
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
            {
              label: 'Notification Package',
              slug: 'packages/notification-package',
            },
            {
              label: 'Match Score Package',
              slug: 'packages/match-score-package',
            },
          ],
        },
        {
          label: 'Services',
          items: [
            { label: 'Services Overview', slug: 'services/overview' },
            {
              label: 'Notification Service',
              slug: 'services/notification-service',
            },
            {
              label: 'Authentication Service',
              slug: 'services/authentication-service',
            },
            {
              label: 'Wallet Service',
              slug: 'services/wallet-service',
            },
            {
              label: 'DigiLocker Service',
              slug: 'services/digilocker-service',
            },
            {
              label: 'Match Score Service',
              slug: 'services/match-score-service',
            },
          ],
        },
      ],
    }),
  ],
});
