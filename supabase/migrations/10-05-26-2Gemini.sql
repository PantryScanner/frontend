-- 1. Rimuoviamo TUTTE le policy esistenti su group_members per pulire il campo
DROP POLICY IF EXISTS "Admins manage members" ON group_members;
DROP POLICY IF EXISTS "View members" ON group_members;
DROP POLICY IF EXISTS "group_members_refined_select" ON group_members;
DROP POLICY IF EXISTS "group_members_select_own" ON group_members;
DROP POLICY IF EXISTS "group_members_select_same_group" ON group_members;

-- 2. Creiamo un'unica policy di SELECT pulita e NON ricorsiva
-- Un utente può vedere i record dei membri se:
-- a) Il record riguarda se stesso
-- b) L'utente è il PROPRIETARIO del gruppo (controllo sulla tabella groups, non group_members!)
CREATE POLICY "group_members_select_v2" 
ON group_members FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_members.group_id 
    AND groups.owner_id = auth.uid()
  )
);

-- 3. Sistemiamo la funzione is_user_member_of_group (Fondamentale)
-- Se la funzione viene usata nelle RLS di altre tabelle (come groups), 
-- deve essere SECURITY DEFINER per non scatenare ricorsione.
ALTER FUNCTION is_user_member_of_group(user_id uuid, group_id uuid) SECURITY DEFINER;

-- 4. Pulizia su Profiles (opzionale ma consigliata per efficienza)
DROP POLICY IF EXISTS "profiles_select_authed" ON profiles;
CREATE POLICY "profiles_select_simple" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);