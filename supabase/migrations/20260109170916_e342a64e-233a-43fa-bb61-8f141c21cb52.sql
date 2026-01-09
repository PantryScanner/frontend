-- Fix the group_members SELECT policy - correct the self-referencing bug
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    -- User is the group owner
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_members.group_id 
        AND g.owner_id = auth.uid()
    )
    OR
    -- User is a member of this specific group (using user_id = auth.uid() directly on the table being queried avoids recursion)
    user_id = auth.uid()
);