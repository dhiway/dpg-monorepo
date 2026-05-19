export const admin_domains = (process.env.ADMIN_DOMAINS ?? 'dhiway.com')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);
