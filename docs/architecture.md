# Architecture Overview

A collaborative, offline-first todo list app for iOS and Android built with React Native + Expo.

---

## Table of Contents

1. [Starting Point — App Boot Sequence](#1-starting-point--app-boot-sequence)
2. [Layer Map](#2-layer-map)
3. [Local Data Storage](#3-local-data-storage)
4. [API Calls](#4-api-calls)
5. [Sync System](#5-sync-system)
6. [Real-time Collaboration](#6-real-time-collaboration)
7. [Sharing & Invitations](#7-sharing--invitations)
8. [How It Works on a Mobile Device](#8-how-it-works-on-a-mobile-device)
9. [Data Flow Diagrams](#9-data-flow-diagrams)

---

## 1. Starting Point — App Boot Sequence

When the app launches, it runs through the following sequence in order:

```
app/index.tsx
  └── RootNavigator
        ├── 1. runMigrations()          — create/upgrade SQLite tables
        ├── 2. useAuth().initialize()   — restore session from secure storage
        │         ├── getSession()      — reads from expo-secure-store
        │         └── onAuthStateChange() — subscribes to future auth events
        ├── 3. [if session exists]
        │         └── syncEngine.start(userId)
        │               ├── realtimeSubscriber.subscribe(userId)
        │               └── syncNow()   — drain any queued offline mutations
        └── 4. [check for deep link]
                  └── Linking.getInitialURL() — handle todoapp://invite/{token}
```

**While loading** (`authStore.loading === true`): a full-screen `ActivityIndicator` is shown.

**After loading**:
- `session === null` → `AuthNavigator` (Login / Signup screens)
- `session !== null` → `AppNavigator` (Lists tab + Settings tab)

---

## 2. Layer Map

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│   Screens (ListsScreen, ListDetailScreen, etc.)      │
│   Components (TodoItem, ListCard, SyncStatusBanner)  │
│   Design System (Button, TextInput, Checkbox, Badge) │
└────────────────────┬────────────────────────────────┘
                     │ hooks
┌────────────────────▼────────────────────────────────┐
│                 Domain Hooks                         │
│   useLists · useTodos · useAuth · useSync            │
│   useListMembers · useNetworkStatus                  │
└──────┬─────────────────────────┬────────────────────┘
       │                         │
┌──────▼──────┐         ┌────────▼────────────────────┐
│  Zustand    │         │       Sync Engine            │
│  Stores     │◄────────│  SyncEngine (queue drainer)  │
│  authStore  │         │  RealtimeSubscriber (push)   │
│  syncStore  │         │  conflictResolver            │
└─────────────┘         └────────┬────────────────────┘
                                 │
              ┌──────────────────┴───────────────────┐
              │                                      │
┌─────────────▼───────────┐            ┌─────────────▼──────────┐
│    Local SQLite DB       │            │    Supabase API         │
│  (expo-sqlite)           │            │  (REST + Realtime)      │
│  local_lists             │            │  authApi                │
│  local_todos             │            │  listsApi               │
│  local_list_members      │            │  todosApi               │
│  sync_queue              │            │                         │
└──────────────────────────┘            └────────────────────────┘
```

---

## 3. Local Data Storage

All data is stored in a **SQLite database** on the device using `expo-sqlite`. The file is named `todo.db`.

### Tables

#### `local_lists`
Mirrors the remote `lists` table, plus a `synced_at` column.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID, generated client-side |
| `title` | TEXT | |
| `owner_id` | TEXT | User UUID |
| `created_at` | TEXT | ISO 8601 timestamp |
| `updated_at` | TEXT | ISO 8601 timestamp — used for conflict resolution |
| `deleted_at` | TEXT\|NULL | Soft delete — NULL means active |
| `synced_at` | TEXT\|NULL | When this row was last confirmed synced to server |

#### `local_todos`
Mirrors the remote `todos` table, plus `synced_at`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID, generated client-side |
| `list_id` | TEXT | FK → local_lists.id |
| `title` | TEXT | |
| `notes` | TEXT\|NULL | |
| `completed` | INTEGER | **0 = false, 1 = true** (SQLite has no boolean) |
| `completed_at` | TEXT\|NULL | ISO timestamp |
| `completed_by` | TEXT\|NULL | User UUID |
| `due_date` | TEXT\|NULL | ISO date `YYYY-MM-DD` |
| `priority` | TEXT\|NULL | `low` \| `medium` \| `high` |
| `position` | REAL | Float for ordering; higher = lower in list |
| `created_by` | TEXT | User UUID |
| `created_at` | TEXT | |
| `updated_at` | TEXT | Used for conflict resolution |
| `deleted_at` | TEXT\|NULL | Soft delete |
| `synced_at` | TEXT\|NULL | |

#### `local_list_members`
Tracks who belongs to each list (cached locally for display).

| Column | Type |
|--------|------|
| `list_id` | TEXT |
| `user_id` | TEXT |
| `role` | TEXT — `owner` \| `editor` \| `viewer` |
| `invited_by` | TEXT\|NULL |
| `joined_at` | TEXT |

#### `sync_queue`
Outbound mutation queue. Every create/update/delete is written here before being sent to the server.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `entity_type` | TEXT | `list` \| `todo` \| `list_member` |
| `entity_id` | TEXT | UUID of the affected entity |
| `operation` | TEXT | `insert` \| `update` \| `delete` |
| `payload` | TEXT | JSON-encoded fields for the operation |
| `created_at` | TEXT | When the mutation happened |
| `retry_count` | INTEGER | Incremented on server errors; dropped at ≥ 5 |

### Schema versioning

A `schema_version` table tracks which migrations have run. On each app launch, `runMigrations()` checks the current version and runs any pending migrations inside a transaction, preventing partial upgrades.

### Indexes

```sql
idx_local_todos_list_id  ON local_todos(list_id, deleted_at)  -- primary query path
idx_local_todos_updated_at  ON local_todos(updated_at)        -- conflict resolution lookups
idx_local_lists_owner  ON local_lists(owner_id)               -- filtering by owner
```

---

## 4. API Calls

All remote calls go through the Supabase client (`src/api/supabaseClient.ts`), which wraps `@supabase/supabase-js` with `expo-secure-store` as the session storage backend.

### Authentication (`src/api/authApi.ts`)

| Function | HTTP | Description |
|----------|------|-------------|
| `signUp(email, password, displayName)` | POST `/auth/v1/signup` | Creates auth user, then INSERTs a `profiles` row |
| `signIn(email, password)` | POST `/auth/v1/token` | Password grant, returns session + profile |
| `signOut()` | POST `/auth/v1/logout` | Invalidates session token |
| `getSession()` | reads secure store | Returns cached session without a network call |
| `onAuthStateChange(cb)` | WebSocket | Subscribes to auth state events (TOKEN_REFRESHED, SIGNED_OUT) |

The JWT session token is automatically stored in `expo-secure-store` (encrypted on-device key-value store) and refreshed in the background by the Supabase client.

### Lists (`src/api/listsApi.ts`)

| Function | Supabase call | Notes |
|----------|---------------|-------|
| `getLists()` | SELECT lists + member count | Filters `deleted_at IS NULL`, ordered by `updated_at DESC` |
| `getList(id)` | SELECT list + members | Returns `TodoListWithMembers` |
| `createList(input)` | INSERT list → INSERT list_members (owner) | Two calls in sequence |
| `updateList(id, patch)` | UPDATE lists | |
| `deleteList(id)` | UPDATE lists SET deleted_at | Soft delete — data preserved |
| `inviteToList(listId, email, role)` | INSERT invitations | Generates UUID token, 7-day expiry |
| `acceptInvitation(token)` | SELECT invitation → UPDATE accepted_at → INSERT list_members | Validates expiry + email match |
| `removeMember(listId, userId)` | DELETE list_members | |

### Todos (`src/api/todosApi.ts`)

| Function | Supabase call | Notes |
|----------|---------------|-------|
| `getTodos(listId)` | SELECT todos | Filters deleted, orders by `position ASC`, `completed ASC` |
| `createTodo(listId, data)` | INSERT todos | Accepts optional client-generated `id` (for idempotent sync) |
| `updateTodo(id, patch)` | UPDATE todos | Auto-sets `completed_at` / `completed_by` when toggling completion |
| `deleteTodo(id)` | UPDATE todos SET deleted_at | Soft delete |
| `reorderTodos(updates)` | UPDATE todos (per item) | Runs as `Promise.allSettled` — partial success is acceptable |

### Row-Level Security

All API calls include the user's JWT (set automatically by the Supabase client). The database enforces:
- Users can only read/write lists and todos they are a member of
- Only owners and editors can mutate todos
- Only owners can manage membership
- Invitation acceptance validates the token, expiry, and email server-side

No authorization logic lives in the app — the server enforces it all.

---

## 5. Sync System

The sync system has two halves that work in opposite directions:

- **Outbound** (local → server): `SyncEngine` drains the `sync_queue`
- **Inbound** (server → local): `RealtimeSubscriber` handles pushed changes

### 5a. Outbound Sync — SyncEngine

**Entry point**: `syncEngine.start(userId)` is called in `RootNavigator` as soon as the user's session is confirmed.

**Trigger conditions** — `syncNow()` is called when:
1. The app starts (if online)
2. Network connectivity is restored (`NetInfo` event: `isConnected && isInternetReachable`)

**Processing loop** (`syncNow()`):

```
1. Guard: if already syncing, return immediately (no re-entrant syncs)
2. Set syncStore status → 'syncing'
3. clearFailedOperations(5)  — drop ops with retry_count >= 5
4. Loop:
     batch = getNextBatch(20)  — read up to 20 ops from sync_queue, FIFO
     if empty → break
     for each op in batch (in parallel via Promise.allSettled):
       processOperation(op):
         entity_type='todo'  → processTodoOp(insert|update|delete)
         entity_type='list'  → processListOp(insert|update|delete)
     for each result:
       fulfilled  → add to successIds[]
       rejected (4xx client error) → add to successIds[] (drop bad op)
       rejected (5xx / network)   → incrementRetry(op.id)
     markProcessed(successIds[])  — DELETE from sync_queue
5. setLastSyncedAt(now)
6. setPendingCount(getPendingCount())
7. Set syncStore status → 'idle'
```

**After a successful server response**, the SyncEngine writes the server's returned row back to SQLite via `upsertTodo` / `upsertList` and calls `markTodoSynced` / `markListSynced`. This ensures the local copy reflects the server's canonical timestamps (e.g. `created_at` set by the DB trigger).

**Client IDs**: Todos and lists are given a UUID client-side before being written locally. The same UUID is sent to the server in the insert payload, so the local and remote rows always share the same `id`. This makes the sync idempotent.

**Retry policy**:

| Scenario | Action |
|----------|--------|
| Network error / 5xx | Increment `retry_count`; retry on next sync |
| 4xx (400, 403, 404) | Drop operation (mark as processed) |
| `retry_count >= 5` | Cleared before next sync begins |

### 5b. Inbound Sync — RealtimeSubscriber

Supabase Realtime pushes Postgres changes over a WebSocket. Two channels are subscribed per session:

- `todos-changes:{userId}` — listens to all `INSERT`, `UPDATE`, `DELETE` on the `todos` table
- `lists-changes:{userId}` — same for the `lists` table

RLS ensures the user only receives events for rows they have access to.

**On each incoming event**:

```
DELETE → softDeleteTodo / softDeleteList (set deleted_at locally)

INSERT → upsertTodo / upsertList + markSynced
         (no conflict possible — it's a new row)

UPDATE → fetch local row
         if not found locally → upsertTodo / upsertList
         if found → resolve(local, remote)
           winner = 'remote' → upsertTodo / upsertList
           winner = 'local'  → leave local as-is
                               (it will push to server via sync_queue)
```

### 5c. Conflict Resolution

**Algorithm**: last-write-wins using `updated_at` ISO timestamps.

```typescript
function resolve<T extends { updated_at: string }>(local: T, remote: T): ConflictResult<T> {
  const localTime  = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();

  if (localTime > remoteTime)  → local wins
  if (remoteTime > localTime)  → remote wins
  if equal                     → remote wins (tiebreaker)
}
```

**When local wins**: the local change remains in the `sync_queue` and will be pushed to the server on the next sync pass, overwriting the older remote value.

**When remote wins**: the local SQLite row is updated immediately. If the superseded local mutation is still in the `sync_queue`, it will be sent to the server but will arrive with an older `updated_at`, so the server row (already at the newer value) won't regress — the server's trigger updates `updated_at` on every write, so the Realtime push will again have a newer timestamp.

---

## 6. Real-time Collaboration

When two users share a list, they both maintain their own local SQLite copy. Changes flow like this:

```
User A device                         Supabase                    User B device
─────────────                         ────────                    ─────────────
tap "Add todo"
  → write to SQLite
  → enqueue sync op
  → SyncEngine.syncNow()
    → todosApi.createTodo() ──────────► INSERT todos
                                        Realtime broadcast ──────► handleTodoChange()
                                                                      → upsertTodo()
                                                                      → UI updates
```

The broadcast happens at the database level (Postgres logical replication), so User B sees the new todo within ~100–300ms on a good connection without any polling.

**Presence and member display**: member data (`local_list_members`) is cached locally and shown in `MemberAvatarRow`. It is refreshed when a list is opened by fetching `getList(id)` which returns members alongside the list.

---

## 7. Sharing & Invitations

Sharing a list generates an invitation with a unique token:

```
Owner taps Share
  → inviteToList(listId, email, 'editor')
    → INSERT invitations (token=UUID, expires_at=+7 days)
    → returns Invitation row
  → UI shows deep link: todoapp://invite/{token}
  → Owner copies/shares the link
```

When the recipient opens the link:

```
Deep link: todoapp://invite/abc123
  → RootNavigator catches via Linking.getInitialURL() or Linking.addEventListener()
  → stores pendingInviteToken in state
  → once session is confirmed:
      acceptInvitation(token)
        → SELECT invitation (validate: not expired, not accepted, email matches)
        → UPDATE invitations SET accepted_at = now
        → INSERT list_members (user_id = current user, role = invitation.role)
        → returns listId
      getList(listId)
        → upsertList() into local SQLite
        → upsertListMember() for each member
      syncStore.bumpDataVersion()  → triggers UI refresh
```

The `todoapp://invite/{token}` deep link scheme is registered in `app.json` under `scheme: "todoapp"`. On iOS it opens via Universal Links; on Android via intent filters.

---

## 8. How It Works on a Mobile Device

### Session persistence
The Supabase JWT and refresh token are stored in `expo-secure-store`, which uses the iOS Keychain and Android Keystore. They survive app restarts and are encrypted at rest. The Supabase client auto-refreshes the JWT before it expires.

### Offline operation
The app is fully functional with no connectivity:
- All reads come from SQLite — no network calls needed
- All mutations write to SQLite immediately (user sees changes instantly)
- Mutations are serialised to the `sync_queue` for later delivery
- The `SyncStatusBanner` component reflects the current state:
  - **Offline** (orange): `isOnline === false`
  - **Syncing** (blue): `syncStore.status === 'syncing'`
  - **N pending** (amber): `pendingCount > 0` while online
  - **Error** (red): `syncStore.status === 'error'`
  - **Hidden**: online, idle, no pending ops

### Coming back online
`@react-native-community/netinfo` fires a connectivity event. `SyncEngine` listens and immediately calls `syncNow()`, draining the queue. The user's offline changes are pushed to the server and, via Realtime, propagate to other users' devices.

### Background behaviour
React Native apps on iOS are suspended in the background; sync runs on resume. On Android, the app may remain in a limited background state. In both cases, any pending queue entries are safely persisted in SQLite and will sync on the next foreground session.

### Performance considerations
- FlatLists use `keyExtractor` and `getItemLayout` for smooth scrolling
- SQLite queries filter on indexed columns (`list_id`, `deleted_at`, `updated_at`)
- Realtime channels are filtered server-side so only relevant row changes are broadcast
- Sync batches are capped at 20 operations to avoid blocking the main thread

---

## 9. Data Flow Diagrams

### Creating a todo (happy path, online)

```
User types title → taps "Add"
        │
        ▼
useTodos.createTodo()
  1. generates UUID client-side
  2. builds TodoItem with updated_at = now()
  3. todoRepository.upsertTodo()    ← writes to SQLite immediately
  4. syncQueueRepository.enqueue()  ← queues 'insert' op
  5. syncStore.incrementPendingCount()
  6. UI refresh from SQLite          ← user sees todo instantly
        │
        ▼ (async, background)
SyncEngine.syncNow()
  7. todosApi.createTodo(listId, payload)
        │  Supabase INSERT todos (same UUID sent in payload)
        ▼
  8. server returns canonical row
  9. todoRepository.upsertTodo(serverRow)   ← sync any server-set fields
 10. markTodoSynced(id, now())
 11. syncQueueRepository.markProcessed([id])
 12. syncStore.setPendingCount(0)
        │
        ▼ (Realtime, other devices)
 13. RealtimeSubscriber.handleTodoChange(INSERT event)
     → other users' devices call upsertTodo() → their UI updates
```

### Creating a todo (offline)

```
Steps 1–6 above (SQLite write + queue) — identical
SyncEngine.syncNow() is called but NetInfo reports offline
  → todosApi.createTodo() throws network error
  → incrementRetry(op.id)   ← retry_count = 1

[network restored]
NetInfo event → SyncEngine.syncNow()
  → retries the operation
  → steps 7–12 above complete normally
```
