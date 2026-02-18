const default_allowed_origins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:2742',
];

const from_env =
  process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const allowed_origins =
  from_env.length > 0 ? from_env : default_allowed_origins;
