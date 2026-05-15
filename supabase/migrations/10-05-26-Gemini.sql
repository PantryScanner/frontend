-- 1. PULIZIA: Rimuoviamo le policy che causano il loop
DROP POLICY IF EXISTS "Users can view profiles in their groups" ON profiles;
DROP POLICY IF EXISTS "group_members_select_same_group" ON group_members;
DROP POLICY IF EXISTS "View members" ON group_members;

-- 2. SISTEMAZIONE PROFILES: 
-- Permettiamo a tutti gli utenti autenticati di vedere i profili base 
-- (necessario per far funzionare le join di sistema senza crash)
CREATE POLICY "profiles_select_authed" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 3. OTTIMIZZAZIONE GROUP_MEMBERS:
-- Usiamo una struttura gerarchica chiara:
-- L'utente vede se stesso, i membri dei suoi gruppi, o se è proprietario del gruppo.
CREATE POLICY "group_members_refined_select" 
ON group_members FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR 
    group_id IN (
        SELECT g.id FROM groups g WHERE g.owner_id = auth.uid()
    )
    OR
    group_id IN (
        SELECT gm.group_id FROM group_members gm 
        WHERE gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL
    )
);

-- 4. SICUREZZA PER LA FUNZIONE CUSTOM (MOLTO IMPORTANTE)
-- Esegui questo per assicurarti che la tua funzione non causi ricorsione
ALTER FUNCTION is_user_member_of_group(user_id uuid, group_id uuid) SECURITY DEFINER;