import {
  nullable,
  boolean,
  date,
  number,
  string,
  array,
  dict,
  map,
  optional,
  set,
  union,
  field,
  fields,
  literal,
  record,
  tuple,
  decodeType,
  Decoder,
  decode,
  intersection,
  always,
  integer,
  regex,
  bigint,
  fallback,
  objectOf,
  transform,
  nonEmptyArray,
  missing,
  lazy,
  unknown,
  safeDecode,
  undef,
  nil,
  DecoderFunction,
} from '../src';

// ---------------------------------------------------------------------------
// A sprawling "project management platform" API response that exercises
// as many decoder features as possible in a single interconnected structure.
// ---------------------------------------------------------------------------

// --- Primitives & regex ---

const emailDecoder = regex(/^[^@]+@[^@]+\.[^@]+$/);
const hexColorDecoder = regex(/^#[0-9a-fA-F]{6}$/);
const slugDecoder = regex(/^[a-z0-9-]+$/);

// --- Discriminated union: user roles ---

const adminDecoder = record({
  role: 'admin' as const,
  level: integer,
  superAdmin: boolean,
});

const memberDecoder = record({
  role: 'member' as const,
  department: string,
  joinedAt: date,
});

const guestDecoder = record({
  role: 'guest' as const,
  expiresAt: date,
  invitedBy: optional(string),
});

const botDecoder = record({
  role: 'bot' as const,
  apiVersion: integer,
  capabilities: set(string),
});

const roleDecoder = union(adminDecoder, memberDecoder, guestDecoder, botDecoder);
type Role = decodeType<typeof roleDecoder>;

// --- User with continuations, field, fields ---

const userDecoder = record({
  id: bigint,
  email: emailDecoder,
  displayName: fields(
    { firstName: string, lastName: string },
    ({ firstName, lastName }) => `${firstName} ${lastName}`,
  ),
  avatarColor: fallback(hexColorDecoder, '#000000'),
  role: roleDecoder,
  tags: set(string),
  preferences: fallback(
    objectOf(union(string, number, boolean)),
    {} as Record<string, string | number | boolean>,
  ),
  lastLogin: nullable(date),
  oldField: missing,
});
type User = decodeType<typeof userDecoder>;

// --- Recursive folder structure (lazy) ---

type Folder = {
  name: string;
  slug: string;
  children: Folder[];
  documentIds: number[];
};

const folderDecoder: Decoder<Folder> = record({
  name: string,
  slug: slugDecoder,
  children: array(lazy(() => folderDecoder)),
  documentIds: array(integer),
});

// --- Documents: union of different doc types ---

const textDocDecoder = record({
  type: 'text' as const,
  content: string,
  wordCount: field('content', string, c => c.split(/\s+/).filter(Boolean).length),
});

const spreadsheetDocDecoder = record({
  type: 'spreadsheet' as const,
  cells: objectOf(union(string, number, boolean)),
  dimensions: tuple(integer, integer),
});

const imageDocDecoder = record({
  type: 'image' as const,
  url: string,
  alt: optional(string),
  dimensions: optional(tuple(integer, integer)),
});

const linkDocDecoder = record({
  type: 'link' as const,
  href: string,
  title: nullable(string),
});

const documentContentDecoder = union(
  textDocDecoder,
  spreadsheetDocDecoder,
  imageDocDecoder,
  linkDocDecoder,
);

// --- Full document with metadata intersection ---

const timestampsDecoder = record({
  createdAt: date,
  updatedAt: date,
});

const ownershipDecoder = record({
  ownerId: bigint,
  collaboratorIds: array(bigint),
});

const documentMetaDecoder = intersection(timestampsDecoder, ownershipDecoder);

const documentDecoder = record({
  id: integer,
  title: string,
  slug: slugDecoder,
  status: union('draft' as const, 'published' as const, 'archived' as const),
  priority: fallback(union(literal(1), literal(2), literal(3)), 2 as 1 | 2 | 3),
  metadata: documentMetaDecoder,
  content: documentContentDecoder,
  tags: nonEmptyArray(string),
  relatedDocIds: fallback(array(integer), []),
  rawPayload: unknown,
  deletedAt: missing,
});
type Document = decodeType<typeof documentDecoder>;

// --- Activity log: tuple + union ---

const activityDecoder = union(
  tuple(literal('created'), string, date),
  tuple(literal('edited'), string, date, string),
  tuple(literal('deleted'), string, date),
  tuple(literal('commented'), string, date, string),
);

// --- Notification settings: dict + literal forms ---

const notificationSettingDecoder = record({
  email: boolean,
  push: boolean,
  frequency: union('instant' as const, 'daily' as const, 'weekly' as const),
});

const notificationSettingsDecoder = dict(
  notificationSettingDecoder,
  ['mentions', 'updates', 'assignments'] as const,
);

// --- Project: ties everything together ---

// transform: derive a slug-to-id lookup from folders
const folderLookupDecoder: DecoderFunction<Map<string, number[]>> = transform(
  array(folderDecoder),
  folders => {
    const result = new Map<string, number[]>();
    const walk = (f: Folder) => { result.set(f.slug, f.documentIds); f.children.forEach(walk); };
    folders.forEach(walk);
    return result;
  },
);

// union with nil, undef, and always fallback
const reasonDecoder = union(
  record({ reason: string, detail: nullable(string) }),
  nil,
  undef,
  always('no-reason' as const),
);

const projectDecoder = record({
  name: string,
  slug: slugDecoder,
  description: nullable(string),
  version: decode([integer, integer, integer]),
  active: literal(true),
  budget: optional(bigint),

  owner: userDecoder,
  members: map(userDecoder, u => u.id),

  folders: array(folderDecoder),
  folderLookup: field('folders', folderLookupDecoder),
  documents: map(documentDecoder, d => d.id),

  recentActivity: nonEmptyArray(activityDecoder),
  pinnedDocuments: fallback(array(integer), []),

  pauseReason: reasonDecoder,

  settings: {
    visibility: union('public' as const, 'private' as const, 'internal' as const),
    notificationSettings: notificationSettingsDecoder,
    maxDocuments: fallback(integer, 1000),
    colorScheme: objectOf(hexColorDecoder, ['primary', 'secondary', 'accent'] as const),
  },

  stats: fields(
    { documents: array(documentDecoder), members: map(userDecoder, u => u.id) },
    ({ documents, members }) => ({
      documentCount: documents.length,
      memberCount: members.size,
      publishedCount: documents.filter(d => d.status === 'published').length,
    }),
  ),

  legacyData: missing,
});
type Project = decodeType<typeof projectDecoder>;

// ---------------------------------------------------------------------------
// The monster input
// ---------------------------------------------------------------------------

const now = '2026-03-09T12:00:00Z';
const yesterday = '2026-03-08T12:00:00Z';
const lastWeek = '2026-03-02T12:00:00Z';
const lastMonth = '2026-02-09T12:00:00Z';

const makeUser = (overrides: Record<string, any> = {}) => ({
  id: '1001',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Wonderland',
  role: { role: 'admin', level: 5, superAdmin: true },
  tags: ['frontend', 'lead', 'frontend'],
  lastLogin: now,
  ...overrides,
});

const projectInput = {
  name: 'Decoder Platform',
  slug: 'decoder-platform',
  description: null,
  version: [2, 1, 0],
  active: true,
  budget: '999999999999999999',

  owner: makeUser(),
  members: [
    makeUser(),
    makeUser({
      id: 1002,
      email: 'bob@test.org',
      firstName: 'Bob',
      lastName: 'Builder',
      role: { role: 'member', department: 'backend', joinedAt: lastMonth },
      tags: ['backend', 'databases'],
      lastLogin: yesterday,
    }),
    makeUser({
      id: '1003',
      email: 'eve@bots.io',
      firstName: 'Eve',
      lastName: 'Bot',
      role: { role: 'bot', apiVersion: 3, capabilities: ['read', 'write', 'admin'] },
      tags: ['automation'],
      lastLogin: null,
      preferences: { theme: 'dark', fontSize: 14, notifications: true },
    }),
    makeUser({
      id: '1004',
      email: 'guest@temp.com',
      firstName: 'Temp',
      lastName: 'Guest',
      role: { role: 'guest', expiresAt: now, invitedBy: 'alice@example.com' },
      tags: [],
      lastLogin: null,
    }),
  ],

  folders: [
    {
      name: 'Root',
      slug: 'root',
      documentIds: [1, 2],
      children: [
        {
          name: 'Design',
          slug: 'design',
          documentIds: [3],
          children: [
            {
              name: 'Mockups',
              slug: 'mockups',
              documentIds: [],
              children: [],
            },
          ],
        },
        {
          name: 'Engineering',
          slug: 'engineering',
          documentIds: [4],
          children: [],
        },
      ],
    },
  ],

  documents: [
    {
      id: 1,
      title: 'Getting Started',
      slug: 'getting-started',
      status: 'published',
      priority: 1,
      metadata: {
        createdAt: lastMonth,
        updatedAt: yesterday,
        ownerId: '1001',
        collaboratorIds: ['1002'],
      },
      content: {
        type: 'text',
        content: 'Welcome to the platform. This is your first document.',
      },
      tags: ['onboarding', 'docs'],
      rawPayload: { anything: true, nested: [1, 2, 3] },
    },
    {
      id: 2,
      title: 'Budget Spreadsheet',
      slug: 'budget-spreadsheet',
      status: 'draft',
      metadata: {
        createdAt: lastWeek,
        updatedAt: lastWeek,
        ownerId: '1002',
        collaboratorIds: [],
      },
      content: {
        type: 'spreadsheet',
        cells: { A1: 'Revenue', B1: 100000, A2: 'Costs', B2: 75000, C1: true },
        dimensions: [10, 5],
      },
      tags: ['finance'],
      relatedDocIds: [1],
      rawPayload: null,
    },
    {
      id: 3,
      title: 'Logo',
      slug: 'logo',
      status: 'published',
      priority: 3,
      metadata: {
        createdAt: lastMonth,
        updatedAt: lastMonth,
        ownerId: '1001',
        collaboratorIds: [],
      },
      content: {
        type: 'image',
        url: 'https://example.com/logo.png',
        alt: 'Company Logo',
        dimensions: [512, 512],
      },
      tags: ['branding'],
      rawPayload: 'some opaque string',
    },
    {
      id: 4,
      title: 'API Reference',
      slug: 'api-reference',
      status: 'archived',
      priority: 2,
      metadata: {
        createdAt: lastMonth,
        updatedAt: now,
        ownerId: '1003',
        collaboratorIds: ['1001', '1002'],
      },
      content: {
        type: 'link',
        href: 'https://docs.example.com/api',
        title: null,
      },
      tags: ['api', 'engineering'],
      rawPayload: undefined,
    },
  ],

  recentActivity: [
    ['created', 'Getting Started', lastMonth],
    ['edited', 'Budget Spreadsheet', yesterday, 'Updated revenue figures'],
    ['commented', 'Logo', now, 'Looks great!'],
    ['deleted', 'Old Draft', lastWeek],
  ],

  pauseReason: 42, // doesn't match record, nil, or undef — falls through to always

  settings: {
    visibility: 'internal',
    notificationSettings: {
      mentions: { email: true, push: true, frequency: 'instant' },
      updates: { email: true, push: false, frequency: 'daily' },
      assignments: { email: false, push: true, frequency: 'weekly' },
    },
    colorScheme: {
      primary: '#1a2b3c',
      secondary: '#4d5e6f',
      accent: '#ff9900',
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('decodes the full project structure', () => {
  const project = projectDecoder(projectInput);

  // --- top level ---
  expect(project.name).toBe('Decoder Platform');
  expect(project.slug).toBe('decoder-platform');
  expect(project.description).toBeNull();
  expect(project.version).toEqual([2, 1, 0]);
  expect(project.active).toBe(true);
  expect(project.budget).toBe(BigInt('999999999999999999'));
  expect(project.pinnedDocuments).toEqual([]);

  // pauseReason: 42 doesn't match record/nil/undef, falls to always
  expect(project.pauseReason).toBe('no-reason');

  // folderLookup: transform flattens folder tree into slug->docIds map
  expect(project.folderLookup.get('root')).toEqual([1, 2]);
  expect(project.folderLookup.get('design')).toEqual([3]);
  expect(project.folderLookup.get('mockups')).toEqual([]);
  expect(project.folderLookup.get('engineering')).toEqual([4]);
});

test('decodes owner with field merging and continuations', () => {
  const project = projectDecoder(projectInput);
  const owner = project.owner;

  expect(owner.id).toBe(BigInt(1001));
  expect(owner.email).toBe('alice@example.com');
  expect(owner.displayName).toBe('Alice Wonderland');
  expect(owner.avatarColor).toBe('#000000'); // fallback
  expect(owner.role).toEqual({ role: 'admin', level: 5, superAdmin: true });
  expect(owner.tags).toEqual(new Set(['frontend', 'lead'])); // set dedupes
  expect(owner.lastLogin).toEqual(new Date(now));
  expect(owner.preferences).toEqual({});
});

test('decodes members map with all four role variants', () => {
  const project = projectDecoder(projectInput);
  const members = project.members;

  expect(members.size).toBe(4);

  // admin
  const alice = members.get(BigInt(1001))!;
  expect(alice.role).toEqual({ role: 'admin', level: 5, superAdmin: true });

  // member
  const bob = members.get(BigInt(1002))!;
  expect(bob.role.role).toBe('member');
  expect(bob.displayName).toBe('Bob Builder');
  if (bob.role.role === 'member') {
    expect(bob.role.department).toBe('backend');
    expect(bob.role.joinedAt).toEqual(new Date(lastMonth));
  }

  // bot with preferences
  const eve = members.get(BigInt(1003))!;
  expect(eve.role.role).toBe('bot');
  if (eve.role.role === 'bot') {
    expect(eve.role.apiVersion).toBe(3);
    expect(eve.role.capabilities).toEqual(new Set(['read', 'write', 'admin']));
  }
  expect(eve.lastLogin).toBeNull();
  expect(eve.preferences).toEqual({ theme: 'dark', fontSize: 14, notifications: true });

  // guest
  const guest = members.get(BigInt(1004))!;
  expect(guest.role.role).toBe('guest');
  if (guest.role.role === 'guest') {
    expect(guest.role.invitedBy).toBe('alice@example.com');
  }
  expect(guest.tags).toEqual(new Set());
});

test('decodes recursive folder structure (lazy)', () => {
  const project = projectDecoder(projectInput);
  const root = project.folders[0];

  expect(root.name).toBe('Root');
  expect(root.documentIds).toEqual([1, 2]);
  expect(root.children).toHaveLength(2);

  const design = root.children[0];
  expect(design.name).toBe('Design');
  expect(design.children).toHaveLength(1);
  expect(design.children[0].name).toBe('Mockups');
  expect(design.children[0].children).toEqual([]);

  const engineering = root.children[1];
  expect(engineering.name).toBe('Engineering');
  expect(engineering.children).toEqual([]);
});

test('decodes documents with all content type variants', () => {
  const project = projectDecoder(projectInput);
  const docs = project.documents;

  // text doc — with wordCount transform from field continuation
  const gettingStarted = docs.get(1)!;
  expect(gettingStarted.title).toBe('Getting Started');
  expect(gettingStarted.status).toBe('published');
  expect(gettingStarted.priority).toBe(1);
  expect(gettingStarted.tags).toEqual(['onboarding', 'docs']);
  expect(gettingStarted.metadata.ownerId).toBe(BigInt(1001));
  expect(gettingStarted.metadata.collaboratorIds).toEqual([BigInt(1002)]);
  if (gettingStarted.content.type === 'text') {
    expect(gettingStarted.content.wordCount).toBe(9);
  }
  expect(gettingStarted.relatedDocIds).toEqual([]);
  // unknown decoder passes rawPayload through as-is
  expect(gettingStarted.rawPayload).toEqual({ anything: true, nested: [1, 2, 3] });

  // spreadsheet doc — with objectOf cells and tuple dimensions
  const budget = docs.get(2)!;
  expect(budget.status).toBe('draft');
  expect(budget.priority).toBe(2); // fallback
  if (budget.content.type === 'spreadsheet') {
    expect(budget.content.cells).toEqual({
      A1: 'Revenue', B1: 100000, A2: 'Costs', B2: 75000, C1: true,
    });
    expect(budget.content.dimensions).toEqual([10, 5]);
  }
  expect(budget.relatedDocIds).toEqual([1]);

  // image doc — with optional dimensions
  const logo = docs.get(3)!;
  if (logo.content.type === 'image') {
    expect(logo.content.url).toBe('https://example.com/logo.png');
    expect(logo.content.alt).toBe('Company Logo');
    expect(logo.content.dimensions).toEqual([512, 512]);
  }

  // link doc — with nullable title
  const apiRef = docs.get(4)!;
  if (apiRef.content.type === 'link') {
    expect(apiRef.content.href).toBe('https://docs.example.com/api');
    expect(apiRef.content.title).toBeNull();
  }
  expect(apiRef.metadata.collaboratorIds).toEqual([BigInt(1001), BigInt(1002)]);
});

test('decodes activity log tuples', () => {
  const project = projectDecoder(projectInput);
  const activity = project.recentActivity;

  expect(activity).toHaveLength(4);
  expect(activity[0]).toEqual(['created', 'Getting Started', new Date(lastMonth)]);
  expect(activity[1]).toEqual([
    'edited', 'Budget Spreadsheet', new Date(yesterday), 'Updated revenue figures',
  ]);
  expect(activity[2]).toEqual(['commented', 'Logo', new Date(now), 'Looks great!']);
  expect(activity[3]).toEqual(['deleted', 'Old Draft', new Date(lastWeek)]);
});

test('decodes nested settings with dict, objectOf, and literal forms', () => {
  const project = projectDecoder(projectInput);
  const settings = project.settings;

  expect(settings.visibility).toBe('internal');
  expect(settings.maxDocuments).toBe(1000); // fallback

  // dict with constrained keys
  const notifs = settings.notificationSettings;
  expect(notifs.get('mentions')).toEqual({ email: true, push: true, frequency: 'instant' });
  expect(notifs.get('updates')).toEqual({ email: true, push: false, frequency: 'daily' });
  expect(notifs.get('assignments')).toEqual({ email: false, push: true, frequency: 'weekly' });

  // objectOf with constrained keys
  expect(settings.colorScheme).toEqual({
    primary: '#1a2b3c',
    secondary: '#4d5e6f',
    accent: '#ff9900',
  });
});

test('decodes computed stats via fields continuation', () => {
  const project = projectDecoder(projectInput);

  expect(project.stats.documentCount).toBe(4);
  expect(project.stats.memberCount).toBe(4);
  expect(project.stats.publishedCount).toBe(2);
});

test('pauseReason union: nil branch', () => {
  const project = projectDecoder({ ...projectInput, pauseReason: null });
  expect(project.pauseReason).toBeNull();
});

test('pauseReason union: undef branch', () => {
  const project = projectDecoder({ ...projectInput, pauseReason: undefined });
  expect(project.pauseReason).toBeUndefined();
});

test('pauseReason union: record branch', () => {
  const project = projectDecoder({
    ...projectInput,
    pauseReason: { reason: 'maintenance', detail: 'upgrading servers' },
  });
  expect(project.pauseReason).toEqual({ reason: 'maintenance', detail: 'upgrading servers' });
});

test('pauseReason union: always fallback for unmatched values', () => {
  const project = projectDecoder({ ...projectInput, pauseReason: 999 });
  expect(project.pauseReason).toBe('no-reason');
});

test('rejects project with legacyData present (missing decoder)', () => {
  expect(() => projectDecoder({
    ...projectInput,
    legacyData: { old: 'stuff' },
  })).toThrow('expected to be missing');
});

test('rejects owner with oldField present (missing decoder)', () => {
  expect(() => projectDecoder({
    ...projectInput,
    owner: { ...makeUser(), oldField: 'should not be here' },
  })).toThrow('expected to be missing');
});

test('rejects invalid email', () => {
  expect(() => projectDecoder({
    ...projectInput,
    owner: makeUser({ email: 'not-an-email' }),
  })).toThrow();
});

test('rejects invalid slug', () => {
  expect(() => projectDecoder({
    ...projectInput,
    slug: 'NOT A VALID SLUG!',
  })).toThrow();
});

test('rejects non-integer version components', () => {
  expect(() => projectDecoder({
    ...projectInput,
    version: [2, 1.5, 0],
  })).toThrow();
});

test('rejects empty tags on documents (nonEmptyArray)', () => {
  const badDocs = [...projectInput.documents];
  badDocs[0] = { ...badDocs[0], tags: [] };
  expect(() => projectDecoder({
    ...projectInput,
    documents: badDocs,
  })).toThrow('non-empty');
});

test('rejects empty recentActivity (nonEmptyArray)', () => {
  expect(() => projectDecoder({
    ...projectInput,
    recentActivity: [],
  })).toThrow('non-empty');
});

test('rejects invalid color in colorScheme', () => {
  expect(() => projectDecoder({
    ...projectInput,
    settings: {
      ...projectInput.settings,
      colorScheme: {
        primary: 'red',       // not a hex color
        secondary: '#4d5e6f',
        accent: '#ff9900',
      },
    },
  })).toThrow();
});

test('rejects unknown notification channel key', () => {
  expect(() => projectDecoder({
    ...projectInput,
    settings: {
      ...projectInput.settings,
      notificationSettings: {
        mentions: { email: true, push: true, frequency: 'instant' },
        updates: { email: true, push: false, frequency: 'daily' },
        assignments: { email: false, push: true, frequency: 'weekly' },
        sms: { email: false, push: false, frequency: 'daily' }, // not allowed
      },
    },
  })).toThrow();
});

test('safeDecode on the full project', () => {
  const result = safeDecode(projectDecoder, projectInput);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.name).toBe('Decoder Platform');
  }

  const failure = safeDecode(projectDecoder, { name: 'incomplete' });
  expect(failure.ok).toBe(false);
  if (!failure.ok) {
    expect(failure.error).toBeDefined();
  }
});

test('active must be literally true', () => {
  expect(() => projectDecoder({
    ...projectInput,
    active: false,
  })).toThrow();
});

test('rejects deeply nested invalid folder (lazy + regex)', () => {
  expect(() => projectDecoder({
    ...projectInput,
    folders: [{
      name: 'Root',
      slug: 'root',
      documentIds: [],
      children: [{
        name: 'Bad',
        slug: 'INVALID SLUG',
        documentIds: [],
        children: [],
      }],
    }],
  })).toThrow();
});
