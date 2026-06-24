import {
  acceptInvitation,
  createList,
  getLists,
  inviteToList,
  removeMember,
} from '@/api/listsApi';
import { supabase } from '@/api/supabaseClient';

jest.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const mockedSupabase = supabase as {
  from: jest.Mock;
  auth: {
    getUser: jest.Mock;
  };
};

const userOne = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'user1@example.com',
};

const userTwo = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'user2@example.com',
};

const originalCrypto = globalThis.crypto;

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: jest.fn(() => 'invite-token-123'),
    },
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: originalCrypto,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
  mockedSupabase.auth.getUser.mockResolvedValue({
    data: { user: userOne },
    error: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sharing flow', () => {
  it('createList() creates a list and inserts an owner list_member', async () => {
    const createdList = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Groceries',
      owner_id: userOne.id,
      created_at: '2026-06-24T12:00:00.000Z',
      updated_at: '2026-06-24T12:00:00.000Z',
      deleted_at: null,
    };

    const listInsertBuilder = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdList,
            error: null,
          }),
        }),
      }),
    };

    const memberInsertBuilder = {
      insert: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockedSupabase.from
      .mockImplementationOnce(() => listInsertBuilder)
      .mockImplementationOnce(() => memberInsertBuilder);

    const result = await createList('Groceries');

    expect(mockedSupabase.from).toHaveBeenNthCalledWith(1, 'lists');
    expect(listInsertBuilder.insert).toHaveBeenCalledWith({
      title: 'Groceries',
      owner_id: userOne.id,
    });
    expect(mockedSupabase.from).toHaveBeenNthCalledWith(2, 'list_members');
    expect(memberInsertBuilder.insert).toHaveBeenCalledWith({
      list_id: createdList.id,
      user_id: userOne.id,
      role: 'owner',
    });
    expect(result).toEqual({
      ...createdList,
      member_count: 1,
    });
  });

  it('inviteToList() creates an invitation with correct expiry and role', async () => {
    const createdInvitation = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      list_id: 'list-1',
      invited_by: userOne.id,
      email: 'invitee@example.com',
      token: 'invite-token-123',
      role: 'editor',
      accepted_at: null,
      expires_at: '2026-07-01T12:00:00.000Z',
      created_at: '2026-06-24T12:00:00.000Z',
    };

    const invitationBuilder = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdInvitation,
            error: null,
          }),
        }),
      }),
    };

    mockedSupabase.from.mockImplementationOnce(() => invitationBuilder);

    const result = await inviteToList('list-1', 'invitee@example.com', 'editor');

    expect(mockedSupabase.from).toHaveBeenCalledWith('invitations');
    expect(invitationBuilder.insert).toHaveBeenCalledWith({
      list_id: 'list-1',
      invited_by: userOne.id,
      email: 'invitee@example.com',
      token: 'invite-token-123',
      role: 'editor',
      expires_at: '2026-07-01T12:00:00.000Z',
    });
    expect(result).toEqual(createdInvitation);
  });

  it('acceptInvitation() with valid token sets accepted_at and creates a list_member', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: userTwo },
      error: null,
    });

    const invitation = {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      list_id: 'list-1',
      invited_by: userOne.id,
      email: userTwo.email,
      token: 'invite-token-123',
      role: 'editor',
      accepted_at: null,
      expires_at: '2026-07-01T12:00:00.000Z',
      created_at: '2026-06-24T12:00:00.000Z',
    };

    const selectChain = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: invitation,
          error: null,
        }),
      }),
    };

    const invitationSelectBuilder = {
      select: jest.fn().mockReturnValue(selectChain),
    };

    const invitationUpdateBuilder = {
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      }),
    };

    const memberInsertBuilder = {
      insert: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockedSupabase.from
      .mockImplementationOnce(() => invitationSelectBuilder)
      .mockImplementationOnce(() => invitationUpdateBuilder)
      .mockImplementationOnce(() => memberInsertBuilder);

    await acceptInvitation('invite-token-123');

    expect(invitationSelectBuilder.select).toHaveBeenCalledWith('*');
    expect(selectChain.eq).toHaveBeenCalledWith('token', 'invite-token-123');
    expect(invitationUpdateBuilder.update).toHaveBeenCalledWith({
      accepted_at: '2026-06-24T12:00:00.000Z',
    });
    expect(memberInsertBuilder.insert).toHaveBeenCalledWith({
      list_id: invitation.list_id,
      user_id: userTwo.id,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });
  });

  it('acceptInvitation() with expired token throws an error', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: userTwo },
      error: null,
    });

    const expiredInvitation = {
      id: 'expired-id',
      list_id: 'list-1',
      invited_by: userOne.id,
      email: userTwo.email,
      token: 'expired-token',
      role: 'viewer',
      accepted_at: null,
      expires_at: '2026-06-23T12:00:00.000Z',
      created_at: '2026-06-20T12:00:00.000Z',
    };

    const invitationSelectBuilder = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: expiredInvitation,
            error: null,
          }),
        }),
      }),
    };

    mockedSupabase.from.mockImplementationOnce(() => invitationSelectBuilder);

    await expect(acceptInvitation('expired-token')).rejects.toThrow('Invitation has expired.');
  });

  it('acceptInvitation() with already-accepted token throws an error', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: userTwo },
      error: null,
    });

    const acceptedInvitation = {
      id: 'accepted-id',
      list_id: 'list-1',
      invited_by: userOne.id,
      email: userTwo.email,
      token: 'accepted-token',
      role: 'viewer',
      accepted_at: '2026-06-23T12:00:00.000Z',
      expires_at: '2026-07-01T12:00:00.000Z',
      created_at: '2026-06-20T12:00:00.000Z',
    };

    const invitationSelectBuilder = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: acceptedInvitation,
            error: null,
          }),
        }),
      }),
    };

    mockedSupabase.from.mockImplementationOnce(() => invitationSelectBuilder);

    await expect(acceptInvitation('accepted-token')).rejects.toThrow(
      'Invitation has already been accepted.',
    );
  });

  it('removeMember() removes the member row', async () => {
    const eqUserId = jest.fn().mockResolvedValue({
      error: null,
    });
    const eqListId = jest.fn().mockReturnValue({
      eq: eqUserId,
    });
    const memberDeleteBuilder = {
      delete: jest.fn().mockReturnValue({
        eq: eqListId,
      }),
    };

    mockedSupabase.from.mockImplementationOnce(() => memberDeleteBuilder);

    await removeMember('list-1', userTwo.id);

    expect(mockedSupabase.from).toHaveBeenCalledWith('list_members');
    expect(memberDeleteBuilder.delete).toHaveBeenCalled();
    expect(eqListId).toHaveBeenCalledWith('list_id', 'list-1');
    expect(eqUserId).toHaveBeenCalledWith('user_id', userTwo.id);
  });

  it('getLists() only returns lists where the user is a member', async () => {
    const rows = [
      {
        id: 'list-1',
        title: 'Shared Groceries',
        owner_id: userOne.id,
        created_at: '2026-06-20T12:00:00.000Z',
        updated_at: '2026-06-24T12:00:00.000Z',
        deleted_at: null,
        list_members: [{ count: 2 }],
      },
      {
        id: 'list-2',
        title: 'Weekend Errands',
        owner_id: userOne.id,
        created_at: '2026-06-19T12:00:00.000Z',
        updated_at: '2026-06-23T12:00:00.000Z',
        deleted_at: null,
        list_members: [{ count: 1 }],
      },
    ];

    const firstOrder = jest.fn().mockResolvedValue({
      data: rows,
      error: null,
    });
    const isBuilder = jest.fn().mockReturnValue({
      order: firstOrder,
    });
    const listSelectBuilder = {
      select: jest.fn().mockReturnValue({
        is: isBuilder,
      }),
    };

    mockedSupabase.from.mockImplementationOnce(() => listSelectBuilder);

    const result = await getLists();

    expect(mockedSupabase.from).toHaveBeenCalledWith('lists');
    expect(listSelectBuilder.select).toHaveBeenCalledWith(
      'id, title, owner_id, created_at, updated_at, deleted_at, list_members(count)',
    );
    expect(isBuilder).toHaveBeenCalledWith('deleted_at', null);
    expect(firstOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result).toEqual([
      {
        id: 'list-1',
        title: 'Shared Groceries',
        owner_id: userOne.id,
        created_at: '2026-06-20T12:00:00.000Z',
        updated_at: '2026-06-24T12:00:00.000Z',
        deleted_at: null,
        member_count: 2,
      },
      {
        id: 'list-2',
        title: 'Weekend Errands',
        owner_id: userOne.id,
        created_at: '2026-06-19T12:00:00.000Z',
        updated_at: '2026-06-23T12:00:00.000Z',
        deleted_at: null,
        member_count: 1,
      },
    ]);
  });
});
