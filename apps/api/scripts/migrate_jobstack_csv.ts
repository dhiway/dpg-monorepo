import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureItemPartition, Pool } from '@dpg/database';
import {
  getDomainItemSchema,
  parseNetworkConfigDocument,
  validateAgainstJsonSchema,
  type NetworkConfigDocument,
} from '@dpg/schemas';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../..');

const DEFAULTS = {
  seekerDir:
    '/Users/amitbhat/Downloads/seeker_csv_dumps_20260415-100001',
  providerDir:
    '/Users/amitbhat/Downloads/provider_csv_dumps_20260415-100001',
  seekerLimit: 30,
  providerLimit: 30,
  itemNetwork: 'blue_dot',
  itemInstanceUrl: 'https://ubi-backend.onest.dhiway.net',
  networkConfigRef: 'blue_dot:examples/schemas/blue_dot/network.json',
  randomSeed: 'jobstack-migration',
} as const;

type CliOptions = {
  dbUrl?: string;
  seekerDir: string;
  providerDir: string;
  seekerLimit: number;
  providerLimit: number;
  itemNetwork: string;
  itemInstanceUrl: string;
  networkConfigRef?: string;
  networkConfigFile?: string;
  randomSeed: string;
  dryRun: boolean;
};

type CsvRecord = Record<string, string>;

type RawUser = {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  phoneNumber: string | null;
  phoneNumberVerified: boolean | null;
  dateOfBirth: Date | null;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

type ItemInsert = {
  itemDomain: 'seeker' | 'provider';
  itemType: 'profile_1.0' | 'job_posting_1.0';
  itemId: string;
  itemSchemaUrl: string;
  itemState: Record<string, unknown>;
  itemLatitude: number | null;
  itemLongitude: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type SelectedRecord = {
  user: RawUser;
  item: ItemInsert;
};

type SelectionStats = {
  selected: number;
  missingUser: number;
  invalidItemId: number;
  invalidCreatedBy: number;
  invalidMetadata: number;
  invalidShape: number;
};

type MigrationStats = {
  usersUpserted: number;
  itemsInserted: number;
};

async function main() {
  loadRootEnv();
  const options = parseCliOptions(process.argv.slice(2));
  const networkConfig = await loadNetworkConfig(options);
  const seekerSchema = getDomainItemSchema(networkConfig, 'seeker', 'profile_1.0');
  const providerSchema = getDomainItemSchema(
    networkConfig,
    'provider',
    'job_posting_1.0'
  );

  const seekerUsers = await loadCsvById(join(options.seekerDir, 'user.csv'));
  const providerUsers = await loadCsvById(join(options.providerDir, 'user.csv'));
  const seekerProfiles = await loadCsv(join(options.seekerDir, 'profile.csv'));
  const providerJobs = await loadCsv(join(options.providerDir, 'job_posting.csv'));

  const seekerSelection = selectSeekers({
    candidates: seekerProfiles,
    userMap: seekerUsers,
    schema: seekerSchema,
    limit: options.seekerLimit,
    itemNetwork: options.itemNetwork,
    itemInstanceUrl: options.itemInstanceUrl,
    randomSeed: `${options.randomSeed}:seekers`,
  });

  const providerSelection = selectProviders({
    candidates: providerJobs,
    userMap: providerUsers,
    schema: providerSchema,
    limit: options.providerLimit,
    itemNetwork: options.itemNetwork,
    itemInstanceUrl: options.itemInstanceUrl,
    randomSeed: `${options.randomSeed}:providers`,
  });

  if (seekerSelection.records.length < options.seekerLimit) {
    throw new Error(
      `Only ${seekerSelection.records.length} valid seeker profiles found for migration out of requested ${options.seekerLimit}.`
    );
  }

  if (providerSelection.records.length < options.providerLimit) {
    throw new Error(
      `Only ${providerSelection.records.length} valid provider job postings found for migration out of requested ${options.providerLimit}.`
    );
  }

  printSelectionSummary('seekers', seekerSelection.stats);
  printSelectionSummary('providers', providerSelection.stats);

  const selectedRecords = [...seekerSelection.records, ...providerSelection.records];
  const users = dedupeUsers(selectedRecords.map((record) => record.user));
  const items = selectedRecords.map((record) => record.item);

  if (options.dryRun) {
    console.log('Dry run complete. No database changes were made.');
    console.log(`Prepared ${users.length} users and ${items.length} items.`);
    return;
  }

  const databaseUrl = resolveDatabaseUrl(options.dbUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    const drizzleDb = drizzle(pool);
    await ensureItemPartitionIfMissing(pool, drizzleDb, 'profile_1.0');
    await ensureItemPartitionIfMissing(pool, drizzleDb, 'job_posting_1.0');

    const stats = await persistMigration(pool, users, items, options);
    console.log(
      `Migration complete. Upserted ${stats.usersUpserted} users and inserted ${stats.itemsInserted} items.`
    );
  } finally {
    await pool.end();
  }
}

async function ensureItemPartitionIfMissing(
  pool: Pool,
  drizzleDb: ReturnType<typeof drizzle>,
  itemType: string
) {
  if (await hasAttachedItemPartitionForType(pool, itemType)) {
    return;
  }

  try {
    await ensureItemPartition(drizzleDb, 'blue_dot', 'unused', itemType);
  } catch (error) {
    if (await hasAttachedItemPartitionForType(pool, itemType)) {
      return;
    }

    throw error;
  }
}

async function hasAttachedItemPartitionForType(pool: Pool, itemType: string) {
  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_inherits i
        JOIN pg_class child ON child.oid = i.inhrelid
        JOIN pg_class parent ON parent.oid = i.inhparent
        JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
        JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
        WHERE child_ns.nspname = current_schema()
          AND parent_ns.nspname = current_schema()
          AND parent.relname = 'items'
          AND pg_get_expr(child.relpartbound, child.oid, true) = $1
      ) AS exists
    `,
    [`FOR VALUES IN ('${itemType.replace(/'/g, "''")}')`]
  );

  return result.rows[0]?.exists ?? false;
}

function loadRootEnv() {
  dotenv.config({ path: resolve(repoRoot, '.env'), quiet: true });
}

function parseCliOptions(args: string[]): CliOptions {
  const values = new Map<string, string>();
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    values.set(key, value);
    index += 1;
  }

  return {
    dbUrl: values.get('db-url') ?? process.env.POSTGRES_URL,
    seekerDir: values.get('seeker-dir') ?? DEFAULTS.seekerDir,
    providerDir: values.get('provider-dir') ?? DEFAULTS.providerDir,
    seekerLimit: parsePositiveInt(
      values.get('seeker-limit'),
      DEFAULTS.seekerLimit,
      'seeker-limit'
    ),
    providerLimit: parsePositiveInt(
      values.get('provider-limit'),
      DEFAULTS.providerLimit,
      'provider-limit'
    ),
    itemNetwork: values.get('item-network') ?? DEFAULTS.itemNetwork,
    itemInstanceUrl:
      values.get('item-instance-url') ?? DEFAULTS.itemInstanceUrl,
    networkConfigRef:
      values.get('network-config-ref') ?? DEFAULTS.networkConfigRef,
    networkConfigFile: values.get('network-config-file') ?? undefined,
    randomSeed: values.get('random-seed') ?? DEFAULTS.randomSeed,
    dryRun,
  };
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  label: string
) {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${label}: ${raw}`);
  }

  return parsed;
}

function resolveDatabaseUrl(cliDbUrl?: string) {
  if (cliDbUrl) {
    return cliDbUrl;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST ?? '127.0.0.1';
  const port = process.env.POSTGRES_PORT ?? process.env.DATABASE_PORT ?? '6543';
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !database) {
    throw new Error(
      'Database connection details are missing. Pass --db-url or set POSTGRES_URL / POSTGRES_* env vars.'
    );
  }

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function loadNetworkConfig(
  options: Pick<CliOptions, 'networkConfigFile' | 'networkConfigRef'>
): Promise<NetworkConfigDocument> {
  const contents = options.networkConfigFile
    ? await readFile(resolve(options.networkConfigFile), 'utf8')
    : execFileSync(
        'git',
        ['show', options.networkConfigRef ?? DEFAULTS.networkConfigRef],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );

  return parseNetworkConfigDocument(JSON.parse(contents));
}

async function loadCsvById(filePath: string) {
  const rows = await loadCsv(filePath);
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadCsv(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  const rows = parseCsv(contents);

  if (rows.length === 0) {
    return [] as CsvRecord[];
  }

  const [headers, ...records] = rows;

  return records.map((record) => {
    const entry: CsvRecord = {};

    headers.forEach((header, index) => {
      entry[header] = record[index] ?? '';
    });

    return entry;
  });
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (char === '"') {
      const nextChar = input[index + 1];

      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && input[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(currentField);
      currentField = '';

      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function selectSeekers(input: {
  candidates: CsvRecord[];
  userMap: Map<string, CsvRecord>;
  schema: Record<string, unknown>;
  limit: number;
  itemNetwork: string;
  itemInstanceUrl: string;
  randomSeed: string;
}) {
  const stats = createSelectionStats();
  const records: SelectedRecord[] = [];
  const schemaUrl = buildSchemaUrl(
    input.itemInstanceUrl,
    input.itemNetwork,
    'seeker',
    'profile_1.0'
  );

  for (const row of shuffle(input.candidates, input.randomSeed)) {
    if (records.length >= input.limit) {
      break;
    }

    const userId = asNonEmptyString(row.user_id);

    if (!userId) {
      stats.invalidCreatedBy += 1;
      continue;
    }

    const userRow = input.userMap.get(userId);

    if (!userRow) {
      stats.missingUser += 1;
      continue;
    }

    if (!isUuid(row.id)) {
      stats.invalidItemId += 1;
      continue;
    }

    let metadata: unknown;

    try {
      metadata = parseJsonLike(row.metadata);
    } catch {
      stats.invalidMetadata += 1;
      continue;
    }

    const user = normalizeUser(userRow);
    const itemState = buildSeekerItemState(metadata);

    try {
      validateAgainstJsonSchema(input.schema, itemState, 'seeker item_state');
    } catch {
      stats.invalidShape += 1;
      continue;
    }

    records.push({
      user,
      item: {
        itemDomain: 'seeker',
        itemType: 'profile_1.0',
        itemId: row.id,
        itemSchemaUrl: schemaUrl,
        itemState,
        itemLatitude: null,
        itemLongitude: null,
        createdBy: user.id,
        createdAt: parseDate(row.created_at),
        updatedAt: parseDate(row.updated_at),
      },
    });
    stats.selected += 1;
  }

  return { records, stats };
}

function selectProviders(input: {
  candidates: CsvRecord[];
  userMap: Map<string, CsvRecord>;
  schema: Record<string, unknown>;
  limit: number;
  itemNetwork: string;
  itemInstanceUrl: string;
  randomSeed: string;
}) {
  const stats = createSelectionStats();
  const records: SelectedRecord[] = [];
  const schemaUrl = buildSchemaUrl(
    input.itemInstanceUrl,
    input.itemNetwork,
    'provider',
    'job_posting_1.0'
  );

  for (const row of shuffle(input.candidates, input.randomSeed)) {
    if (records.length >= input.limit) {
      break;
    }

    const createdBy = asNonEmptyString(row.created_by);

    if (!createdBy) {
      stats.invalidCreatedBy += 1;
      continue;
    }

    const userRow = input.userMap.get(createdBy);

    if (!userRow) {
      stats.missingUser += 1;
      continue;
    }

    if (!isUuid(row.id)) {
      stats.invalidItemId += 1;
      continue;
    }

    let metadata: unknown;
    let location: unknown;

    try {
      metadata = parseJsonLike(row.metadata);
      location = parseJsonLike(row.location || '{}');
    } catch {
      stats.invalidMetadata += 1;
      continue;
    }

    const user = normalizeUser(userRow);
    const itemState = buildProviderItemState(metadata, row, user);

    try {
      validateAgainstJsonSchema(input.schema, itemState, 'provider item_state');
    } catch {
      stats.invalidShape += 1;
      continue;
    }

    const gps = extractGps(location);

    records.push({
      user,
      item: {
        itemDomain: 'provider',
        itemType: 'job_posting_1.0',
        itemId: row.id,
        itemSchemaUrl: schemaUrl,
        itemState,
        itemLatitude: gps?.lat ?? null,
        itemLongitude: gps?.lng ?? null,
        createdBy: user.id,
        createdAt: parseDate(row.created_at),
        updatedAt: parseDate(row.updated_at),
      },
    });
    stats.selected += 1;
  }

  return { records, stats };
}

function createSelectionStats(): SelectionStats {
  return {
    selected: 0,
    missingUser: 0,
    invalidItemId: 0,
    invalidCreatedBy: 0,
    invalidMetadata: 0,
    invalidShape: 0,
  };
}

function printSelectionSummary(label: string, stats: SelectionStats) {
  console.log(
    `${label}: selected=${stats.selected}, missingUser=${stats.missingUser}, invalidItemId=${stats.invalidItemId}, invalidCreatedBy=${stats.invalidCreatedBy}, invalidMetadata=${stats.invalidMetadata}, invalidShape=${stats.invalidShape}`
  );
}

function normalizeUser(row: CsvRecord): RawUser {
  return {
    id: row.id,
    name: asNonEmptyString(row.name) ?? 'Unknown User',
    email: asNonEmptyString(row.email),
    emailVerified: parseBoolean(row.email_verified) ?? false,
    image: asNonEmptyString(row.image),
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
    role: asNonEmptyString(row.role),
    banned: parseBooleanOrNull(row.banned),
    banReason: asNonEmptyString(row.ban_reason),
    banExpires: parseOptionalDate(row.ban_expires),
    phoneNumber: asNonEmptyString(row.phone_number),
    phoneNumberVerified: parseBooleanOrNull(row.phone_number_verified),
    dateOfBirth: parseOptionalDate(row.date_of_birth),
    termsAccepted: parseBoolean(row.terms_accepted) ?? false,
    privacyAccepted: parseBoolean(row.privacy_accepted) ?? false,
  };
}

function buildSeekerItemState(metadata: unknown) {
  const object = asObject(metadata);
  const whoIAm = asObject(object.whoIAm);
  const whatIHave = asObject(object.whatIHave);
  const whatIWant = asObject(object.whatIWant);

  const state: Record<string, unknown> = {
    name:
      asNonEmptyString(object.name) ??
      asNonEmptyString(whoIAm.name) ??
      asNonEmptyString(object.role),
    gender:
      normalizeGender(object.gender) ?? normalizeGender(whoIAm.gender),
    location:
      asNonEmptyString(object.location) ??
      asNonEmptyString(whoIAm.location) ??
      stringifyLocation(whoIAm.locationData),
    age: firstInteger(object.age, whoIAm.age, whatIHave.age),
    phone:
      normalizePhone(object.phone) ?? normalizePhone(whoIAm.phone),
  };

  const workExperience = normalizeWorkExperience(
    object.workExperience,
    whatIHave.workExperience
  );
  const workExperienceYearsConditional = normalizeWorkExperienceYears(
    object.workExperienceYearsConditional,
    whatIHave.workExperienceYears,
    object.workExperienceYears
  );
  const highestQualificationOrSkill = normalizeHighestQualification(
    object.highestQualificationOrSkill,
    whatIHave.highestQualificationOrSkill,
    whatIHave.highestQualification,
    object.highestQualificationOrSkill
  );
  const natureOfJobsInterestedIn = normalizeNatureOfJob(
    object.natureOfJobsInterestedIn,
    whatIWant.natureOfJobsInterestedIn
  );
  const nameOfJobRolesInterestedIn =
    asNonEmptyString(object.nameOfJobRolesInterestedIn) ??
    asNonEmptyString(whatIWant.nameOfJobRolesInterestedIn) ??
    asNonEmptyString(object.role);
  const otherHelpNeeded = normalizeOtherHelpNeeded(
    object.otherHelpNeeded,
    whatIWant.otherHelpNeeded
  );

  addIfDefined(state, 'workExperience', workExperience);
  addIfDefined(
    state,
    'workExperienceYearsConditional',
    workExperienceYearsConditional
  );
  addIfDefined(
    state,
    'highestQualificationOrSkill',
    highestQualificationOrSkill
  );
  addIfDefined(
    state,
    'natureOfJobsInterestedIn',
    natureOfJobsInterestedIn
  );
  addIfDefined(
    state,
    'nameOfJobRolesInterestedIn',
    nameOfJobRolesInterestedIn
  );
  addIfDefined(state, 'otherHelpNeeded', otherHelpNeeded);

  return state;
}

function buildProviderItemState(
  metadata: unknown,
  row: CsvRecord,
  user: RawUser
) {
  const object = asObject(metadata);
  const basicInfo = asObject(object.basicInfo);
  const jobDetails = asObject(object.jobDetails);
  const state: Record<string, unknown> = {
    jobProviderName:
      asNonEmptyString(object.jobProviderName) ??
      asNonEmptyString(basicInfo.jobProviderName) ??
      asNonEmptyString(row.organization_name),
    role:
      asNonEmptyString(object.role) ??
      asNonEmptyString(jobDetails.title) ??
      asNonEmptyString(row.title),
    jobProviderLocation:
      stringifyLocation(object.jobProviderLocation) ??
      stringifyLocation(basicInfo.jobProviderLocation) ??
      stringifyLocation(parseJsonLikeSafe(row.location)),
    hiringManagerName:
      asNonEmptyString(object.hiringManagerName) ??
      asNonEmptyString(basicInfo.hiringManagerName) ??
      asNonEmptyString(jobDetails.hiringManagerName) ??
      user.name,
    hiringManagerPhoneNumber:
      normalizePhone(object.hiringManagerPhoneNumber) ??
      normalizePhone(basicInfo.hiringManagerPhoneNumber) ??
      normalizePhone(jobDetails.hiringManagerPhoneNumber) ??
      normalizePhone(user.phoneNumber),
    hiringManagerEmail:
      asNonEmptyString(object.hiringManagerEmail) ??
      asNonEmptyString(basicInfo.hiringManagerEmail) ??
      asNonEmptyString(jobDetails.hiringManagerEmail) ??
      user.email,
    positions: firstInteger(object.positions, jobDetails.positions),
    natureOfJob: normalizeNatureOfJob(
      object.natureOfJob,
      jobDetails.jobType,
      jobDetails.natureOfJob
    ),
  };

  addIfDefined(state, 'stipendMin', firstNumber(object.stipendMin, jobDetails.minMonthlyInHand));
  addIfDefined(state, 'stipendMax', firstNumber(object.stipendMax, jobDetails.maxMonthlyInHand));
  addIfDefined(state, 'salaryMin', firstNumber(object.salaryMin, jobDetails.minSalary));
  addIfDefined(state, 'salaryMax', firstNumber(object.salaryMax, jobDetails.maxSalary));
  addIfDefined(state, 'taskRateMin', firstNumber(object.taskRateMin, jobDetails.taskRateMin));
  addIfDefined(state, 'taskRateMax', firstNumber(object.taskRateMax, jobDetails.taskRateMax));
  addIfDefined(
    state,
    'candidateExperienceType',
    normalizeWorkExperience(
      object.candidateExperienceType,
      object.workExperience,
      jobDetails.workExperience
    )
  );
  addIfDefined(
    state,
    'minEducationalInstitute',
    normalizeEducationalInstitute(
      object.minEducationalInstitute,
      asObject(object.jobNeeds).educationSubsection,
      object.industry
    )
  );
  addIfDefined(
    state,
    'workExperienceYears',
    normalizeWorkExperienceYears(object.workExperienceYears, jobDetails.workExperienceYears)
  );
  addIfDefined(
    state,
    'lastRoleHeld',
    asNonEmptyString(object.lastRoleHeld) ?? asNonEmptyString(jobDetails.lastRoleHeld)
  );

  return state;
}

function parseJsonLikeSafe(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    return parseJsonLike(value);
  } catch {
    return {};
  }
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  let current = value.trim();

  if (!current) {
    return {};
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const parsed = JSON.parse(current);

      if (typeof parsed === 'string') {
        current = parsed.trim();
        continue;
      }

      return parsed;
    } catch {
      const stripped = stripMatchingQuotes(current);

      if (stripped === current) {
        break;
      }

      current = stripped.replace(/\\"/g, '"');
    }
  }

  throw new Error('Failed to parse JSON-like string');
}

function stripMatchingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function addIfDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown
) {
  if (value !== null && value !== undefined) {
    target[key] = value;
  }
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = asNonEmptyString(value)?.toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 't' || normalized === 'true') {
    return true;
  }

  if (normalized === 'f' || normalized === 'false') {
    return false;
  }

  return null;
}

function parseBooleanOrNull(value: unknown) {
  return parseBoolean(value);
}

function parseDate(value: unknown) {
  const parsed = parseOptionalDate(value);
  return parsed ?? new Date();
}

function parseOptionalDate(value: unknown) {
  const raw = asNonEmptyString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePhone(value: unknown) {
  const raw = asNonEmptyString(value);

  if (!raw) {
    return null;
  }

  const compact = raw.replace(/\s+/g, '');
  return compact.length >= 10 ? compact : null;
}

function normalizeGender(...values: unknown[]) {
  for (const value of values) {
    const raw = asNonEmptyString(value);

    if (!raw) {
      continue;
    }

    if (/^male$/i.test(raw)) {
      return 'Male';
    }

    if (/^female$/i.test(raw)) {
      return 'Female';
    }

    return raw;
  }

  return null;
}

function normalizeWorkExperience(...values: unknown[]) {
  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw) {
      continue;
    }

    if (raw.includes('fresher') || raw === '0') {
      return 'Fresher';
    }

    if (raw.includes('return')) {
      return 'Returning after a break';
    }

    if (
      raw.includes('worked') ||
      raw.includes('experience') ||
      raw.includes('year')
    ) {
      return 'Worked before';
    }
  }

  return null;
}

function normalizeWorkExperienceYears(...values: unknown[]) {
  const allowed = new Map<string, string>([
    ['0', '0'],
    ['< 1 year', '< 1 Year'],
    ['1 year', '1 Year'],
    ['2 year', '2 Years'],
    ['2 years', '2 Years'],
    ['3 year', '3 Years'],
    ['3 years', '3 Years'],
    ['3-5 years', '3-5 Years'],
    ['5-10 years', '5-10 Years'],
    ['10-15 years', '10-15 Years'],
    ['15+ years', '15+ Years'],
    ['other', 'Other'],
  ]);

  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw) {
      continue;
    }

    for (const [key, normalized] of allowed) {
      if (raw === key || raw.includes(key)) {
        return normalized;
      }
    }

    if (raw.includes('less than 1')) {
      return '< 1 Year';
    }
  }

  return null;
}

function normalizeHighestQualification(...values: unknown[]) {
  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw) {
      continue;
    }

    if (raw.includes('school') || raw.includes('10th') || raw.includes('12th')) {
      return 'School';
    }

    if (raw.includes('college') || raw.includes('bachelor') || raw.includes('degree')) {
      return 'College';
    }

    if (raw.includes('iti') || raw.includes('vocational')) {
      return 'ITI / Other Vocational Trainings';
    }

    if (raw.includes('certification') || raw.includes('learned on the job') || raw.includes('skill')) {
      return 'Certification / Learned on the job';
    }
  }

  return null;
}

function normalizeNatureOfJob(...values: unknown[]) {
  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw) {
      continue;
    }

    if (raw.includes('intern')) {
      return 'Internship';
    }

    if (raw.includes('apprent')) {
      return 'Apprenticeship';
    }

    if (raw.includes('full')) {
      return 'Full-time';
    }

    if (raw.includes('flex')) {
      return 'Flexible';
    }
  }

  return null;
}

function normalizeOtherHelpNeeded(...values: unknown[]) {
  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw || raw === 'na') {
      continue;
    }

    if (raw.includes('train')) {
      return 'Training';
    }

    if (raw.includes('accom')) {
      return 'Accommodation';
    }

    if (raw.includes('travel')) {
      return 'Travel';
    }

    return 'Other';
  }

  return null;
}

function normalizeEducationalInstitute(...values: unknown[]) {
  for (const value of values) {
    const raw = flattenToString(value)?.toLowerCase();

    if (!raw) {
      continue;
    }

    if (raw.includes('school')) {
      return 'School';
    }

    if (raw.includes('college') || raw.includes('diploma') || raw.includes('bachelor')) {
      return 'College';
    }

    if (raw.includes('iti')) {
      return 'ITI';
    }

    if (raw.includes('vocational')) {
      return 'Other Vocational Training';
    }

    if (raw.includes('cert')) {
      return 'Certifications';
    }

    if (raw.includes('none')) {
      return 'None';
    }
  }

  return null;
}

function flattenToString(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const flattened = flattenToString(entry);

      if (flattened) {
        return flattened;
      }
    }

    return null;
  }

  if (value && typeof value === 'object') {
    if ('category' in value && typeof value.category === 'string') {
      return value.category;
    }

    if ('subCategory' in value && typeof value.subCategory === 'string') {
      return value.subCategory;
    }

    return null;
  }

  return asNonEmptyString(value);
}

function firstInteger(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseInteger(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseNumber(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);

  if (parsed === null) {
    return null;
  }

  return Number.isInteger(parsed) ? parsed : Math.trunc(parsed);
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = asNonEmptyString(value);

  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringifyLocation(value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || null;
  }

  const object = asObject(value);
  const gps = asObject(object.gps);
  const parts = [
    asNonEmptyString(object.tag),
    asNonEmptyString(object.city),
    asNonEmptyString(object.state),
    asNonEmptyString(object.address),
    asNonEmptyString(object.country),
  ].filter((entry): entry is string => Boolean(entry));

  if (parts.length > 0) {
    return Array.from(new Set(parts)).join(', ');
  }

  if (Object.keys(gps).length > 0) {
    const lat = parseNumber(gps.lat);
    const lng = parseNumber(gps.lng);

    if (lat !== null && lng !== null) {
      return `${lat}, ${lng}`;
    }
  }

  return null;
}

function extractGps(value: unknown) {
  const object = asObject(value);
  const gps = asObject(object.gps);
  const lat = parseNumber(gps.lat);
  const lng = parseNumber(gps.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

function buildSchemaUrl(
  itemInstanceUrl: string,
  itemNetwork: string,
  itemDomain: string,
  itemType: string
) {
  const trimmedBase = itemInstanceUrl.replace(/\/$/, '');
  return `${trimmedBase}/api/v1/network/schema/${encodeURIComponent(itemNetwork)}/${encodeURIComponent(itemDomain)}/${encodeURIComponent(itemType)}`;
}

function dedupeUsers(users: RawUser[]) {
  const uniqueUsers = new Map<string, RawUser>();

  for (const user of users) {
    uniqueUsers.set(user.id, user);
  }

  return Array.from(uniqueUsers.values());
}

async function persistMigration(
  pool: Pool,
  users: RawUser[],
  items: ItemInsert[],
  options: Pick<CliOptions, 'itemInstanceUrl' | 'itemNetwork'>
): Promise<MigrationStats> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sanitizedUsers = await sanitizeUsersForUniqueConstraints(client, users);

    let usersUpserted = 0;

    for (const user of sanitizedUsers) {
      const result = await client.query({
        text: `
          INSERT INTO "user" (
            id, name, email, email_verified, image, created_at, updated_at, role,
            banned, ban_reason, ban_expires, phone_number, phone_number_verified,
            date_of_birth, terms_accepted, privacy_accepted
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = COALESCE(EXCLUDED.email, "user".email),
            email_verified = EXCLUDED.email_verified,
            image = COALESCE(EXCLUDED.image, "user".image),
            updated_at = GREATEST("user".updated_at, EXCLUDED.updated_at),
            role = COALESCE(EXCLUDED.role, "user".role),
            banned = COALESCE(EXCLUDED.banned, "user".banned),
            ban_reason = COALESCE(EXCLUDED.ban_reason, "user".ban_reason),
            ban_expires = COALESCE(EXCLUDED.ban_expires, "user".ban_expires),
            phone_number = COALESCE(EXCLUDED.phone_number, "user".phone_number),
            phone_number_verified = COALESCE(EXCLUDED.phone_number_verified, "user".phone_number_verified),
            date_of_birth = COALESCE(EXCLUDED.date_of_birth, "user".date_of_birth),
            terms_accepted = COALESCE(EXCLUDED.terms_accepted, "user".terms_accepted),
            privacy_accepted = COALESCE(EXCLUDED.privacy_accepted, "user".privacy_accepted)
        `,
        values: [
          user.id,
          user.name,
          user.email,
          user.emailVerified,
          user.image,
          user.createdAt,
          user.updatedAt,
          user.role,
          user.banned,
          user.banReason,
          user.banExpires,
          user.phoneNumber,
          user.phoneNumberVerified,
          user.dateOfBirth,
          user.termsAccepted,
          user.privacyAccepted,
        ],
      });

      usersUpserted += result.rowCount ?? 0;
    }

    let itemsInserted = 0;

    for (const item of items) {
      const result = await client.query({
        text: `
          INSERT INTO items (
            item_network, item_domain, item_type, item_id, item_instance_url,
            item_schema_url, item_state, item_latitude, item_longitude,
            created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4::uuid, $5,
            $6, $7::jsonb, $8, $9,
            $10, $11, $12
          )
          ON CONFLICT (item_network, item_domain, item_type, item_id) DO NOTHING
        `,
        values: [
          options.itemNetwork,
          item.itemDomain,
          item.itemType,
          item.itemId,
          options.itemInstanceUrl,
          item.itemSchemaUrl,
          JSON.stringify(item.itemState),
          item.itemLatitude,
          item.itemLongitude,
          item.createdBy,
          item.createdAt,
          item.updatedAt,
        ],
      });

      itemsInserted += result.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { usersUpserted, itemsInserted };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function sanitizeUsersForUniqueConstraints(
  client: Awaited<ReturnType<Pool['connect']>>,
  users: RawUser[]
) {
  const emailToId = new Map<string, string>();
  const phoneToId = new Map<string, string>();
  const selectedEmails = new Set<string>();
  const selectedPhones = new Set<string>();

  for (const user of users) {
    if (user.email) {
      selectedEmails.add(user.email);
    }

    if (user.phoneNumber) {
      selectedPhones.add(user.phoneNumber);
    }
  }

  if (selectedEmails.size > 0) {
    const result = await client.query<{
      id: string;
      email: string | null;
    }>({
      text: 'SELECT id, email FROM "user" WHERE email = ANY($1::text[])',
      values: [Array.from(selectedEmails)],
    });

    for (const row of result.rows) {
      if (row.email) {
        emailToId.set(row.email, row.id);
      }
    }
  }

  if (selectedPhones.size > 0) {
    const result = await client.query<{
      id: string;
      phone_number: string | null;
    }>({
      text: 'SELECT id, phone_number FROM "user" WHERE phone_number = ANY($1::text[])',
      values: [Array.from(selectedPhones)],
    });

    for (const row of result.rows) {
      if (row.phone_number) {
        phoneToId.set(row.phone_number, row.id);
      }
    }
  }

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  return users.map((user) => {
    let email = user.email;
    let phoneNumber = user.phoneNumber;

    if (email) {
      const existingId = emailToId.get(email);

      if ((existingId && existingId !== user.id) || seenEmails.has(email)) {
        email = null;
      } else {
        seenEmails.add(email);
      }
    }

    if (phoneNumber) {
      const existingId = phoneToId.get(phoneNumber);

      if ((existingId && existingId !== user.id) || seenPhones.has(phoneNumber)) {
        phoneNumber = null;
      } else {
        seenPhones.add(phoneNumber);
      }
    }

    return {
      ...user,
      email,
      phoneNumber,
    };
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function shuffle<T>(values: T[], seed: string) {
  const random = createSeededRandom(seed);
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function createSeededRandom(seed: string) {
  let state = 0;

  for (const char of seed) {
    state = Math.imul(31, state) + char.charCodeAt(0);
    state |= 0;
  }

  return function next() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
