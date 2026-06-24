CREATE OR REPLACE FUNCTION get_user_role_in_list(p_list_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
  SELECT role::TEXT
  FROM list_members
  WHERE list_id = p_list_id
    AND user_id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_insert_own"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "lists_select_member"
ON lists
FOR SELECT
TO authenticated
USING (
  get_user_role_in_list(id, auth.uid()) IS NOT NULL
);

CREATE POLICY "lists_insert_authenticated_owner"
ON lists
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
);

CREATE POLICY "lists_update_owner_or_editor"
ON lists
FOR UPDATE
TO authenticated
USING (
  get_user_role_in_list(id, auth.uid()) IN ('owner', 'editor')
)
WITH CHECK (
  get_user_role_in_list(id, auth.uid()) IN ('owner', 'editor')
);

CREATE POLICY "lists_delete_owner"
ON lists
FOR DELETE
TO authenticated
USING (
  get_user_role_in_list(id, auth.uid()) = 'owner'
);

CREATE POLICY "list_members_select_list_member"
ON list_members
FOR SELECT
TO authenticated
USING (
  get_user_role_in_list(list_id, auth.uid()) IS NOT NULL
);

CREATE POLICY "list_members_insert_owner_or_invited_user"
ON list_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_members.list_id
      AND lists.owner_id = auth.uid()
  )
  OR (
    list_members.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM invitations
      WHERE invitations.list_id = list_members.list_id
        AND invitations.role = list_members.role
        AND invitations.accepted_at IS NOT NULL
        AND (
          invitations.email IS NULL
          OR lower(invitations.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  )
);

CREATE POLICY "list_members_delete_owner_or_self"
ON list_members
FOR DELETE
TO authenticated
USING (
  list_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_members.list_id
      AND lists.owner_id = auth.uid()
  )
);

CREATE POLICY "invitations_select_invited_or_list_admin"
ON invitations
FOR SELECT
TO authenticated
USING (
  (
    invitations.email IS NOT NULL
    AND lower(invitations.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  OR get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
);

CREATE POLICY "invitations_insert_owner_or_editor"
ON invitations
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
);

CREATE POLICY "invitations_update_invited_user"
ON invitations
FOR UPDATE
TO authenticated
USING (
  invitations.email IS NOT NULL
  AND lower(invitations.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  invitations.email IS NOT NULL
  AND lower(invitations.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "todos_select_list_member"
ON todos
FOR SELECT
TO authenticated
USING (
  get_user_role_in_list(list_id, auth.uid()) IS NOT NULL
);

CREATE POLICY "todos_insert_owner_or_editor"
ON todos
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
);

CREATE POLICY "todos_update_owner_or_editor"
ON todos
FOR UPDATE
TO authenticated
USING (
  get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
)
WITH CHECK (
  get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
);

CREATE POLICY "todos_delete_owner_or_editor"
ON todos
FOR DELETE
TO authenticated
USING (
  get_user_role_in_list(list_id, auth.uid()) IN ('owner', 'editor')
);
