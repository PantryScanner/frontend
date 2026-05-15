-- 1. Reset delle policy esistenti per pulizia
DROP POLICY IF EXISTS "Group owners and admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view fellow group members" ON public.group_members;

-- 2. Nuova policy per la GESTIONE (INSERT/UPDATE/DELETE)
-- Usiamo una subquery sulla tabella 'groups' per rompere la ricorsione sulla tabella 'group_members'
CREATE POLICY "Admins manage members"
ON public.group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND (g.owner_id = auth.uid())
  )
  OR 
  (
    role = 'admin' AND user_id = auth.uid() -- Un admin può gestire se stesso (es. uscire)
  )
);

-- 3. Nuova policy per la VISIBILITÀ (SELECT)
-- Molto semplice: se fai parte del gruppo (o sei l'owner), vedi gli altri.
CREATE POLICY "View members"
ON public.group_members
FOR SELECT
USING (
  user_id = auth.uid() -- Vedi te stesso
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.owner_id = auth.uid() -- L'owner vede tutti
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members internal_gm
    WHERE internal_gm.group_id = group_members.group_id
    AND internal_gm.user_id = auth.uid()
    AND internal_gm.accepted_at IS NOT NULL -- I membri accettati vedono gli altri
  )
);