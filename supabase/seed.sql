-- Local development seed data only. These placeholder profile UUIDs must match auth.users rows created separately in the local Supabase instance.

INSERT INTO profiles (id, display_name, avatar_url, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test-user-1', 'https://example.com/avatar-1.png', '2026-01-01T00:00:00Z'),
  ('22222222-2222-2222-2222-222222222222', 'test-user-2', 'https://example.com/avatar-2.png', '2026-01-01T00:05:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lists (id, title, owner_id, created_at, updated_at, deleted_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Shared Groceries', '11111111-1111-1111-1111-111111111111', '2026-01-02T09:00:00Z', '2026-01-02T09:00:00Z', NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Weekend Errands', '11111111-1111-1111-1111-111111111111', '2026-01-03T09:00:00Z', '2026-01-03T09:00:00Z', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Work Tasks', '22222222-2222-2222-2222-222222222222', '2026-01-04T09:00:00Z', '2026-01-04T09:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO list_members (list_id, user_id, role, invited_by, joined_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'owner', NULL, '2026-01-02T09:00:00Z'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'owner', NULL, '2026-01-03T09:00:00Z'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', 'owner', NULL, '2026-01-04T09:00:00Z'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '22222222-2222-2222-2222-222222222222', 'editor', '11111111-1111-1111-1111-111111111111', '2026-01-02T10:00:00Z')
ON CONFLICT (list_id, user_id) DO NOTHING;

INSERT INTO todos (
  id,
  list_id,
  title,
  notes,
  completed,
  completed_at,
  completed_by,
  due_date,
  priority,
  position,
  created_by,
  created_at,
  updated_at,
  deleted_at
)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Buy milk',
    '2% if available',
    FALSE,
    NULL,
    NULL,
    '2026-01-05T18:00:00Z',
    'high',
    1,
    '11111111-1111-1111-1111-111111111111',
    '2026-01-02T09:05:00Z',
    '2026-01-02T09:05:00Z',
    NULL
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Pick up bread',
    NULL,
    TRUE,
    '2026-01-02T12:00:00Z',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'medium',
    2,
    '22222222-2222-2222-2222-222222222222',
    '2026-01-02T09:10:00Z',
    '2026-01-02T12:00:00Z',
    NULL
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Drop off donations',
    'Clothes and books',
    FALSE,
    NULL,
    NULL,
    '2026-01-06T12:00:00Z',
    'low',
    1,
    '11111111-1111-1111-1111-111111111111',
    '2026-01-03T09:30:00Z',
    '2026-01-03T09:30:00Z',
    NULL
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc4',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'Prepare sprint summary',
    NULL,
    FALSE,
    NULL,
    NULL,
    '2026-01-07T17:00:00Z',
    'high',
    1,
    '22222222-2222-2222-2222-222222222222',
    '2026-01-04T09:15:00Z',
    '2026-01-04T09:15:00Z',
    NULL
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc5',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'Review pull requests',
    'Focus on blockers first',
    FALSE,
    NULL,
    NULL,
    NULL,
    'medium',
    2,
    '22222222-2222-2222-2222-222222222222',
    '2026-01-04T09:20:00Z',
    '2026-01-04T09:20:00Z',
    NULL
  )
ON CONFLICT (id) DO NOTHING;
