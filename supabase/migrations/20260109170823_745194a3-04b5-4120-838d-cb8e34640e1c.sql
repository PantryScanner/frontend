-- Fix the group_members SELECT policy logic error
-- The current policy incorrectly allows any group member to see all group members

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_members.group_id AND (
            g.owner_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.group_members gm2 
                   WHERE gm2.group_id = group_members.group_id 
                   AND gm2.user_id = auth.uid())
        )
    )
);