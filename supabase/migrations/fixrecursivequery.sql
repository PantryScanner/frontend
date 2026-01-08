-- 1. Eliminiamo la policy ricorsiva su group_members
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- 2. Creiamo una versione corretta che non causa loop
-- Controlliamo la proprietà del gruppo direttamente dalla tabella groups 
-- o verifichiamo l'ID utente senza rieseguire un sub-select ricorsivo complesso
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    user_id = auth.uid() 
    OR 
    group_id IN (
        SELECT id FROM public.groups WHERE owner_id = auth.uid()
    )
    OR
    group_id IN (
        SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
    )
);

-- 3. Correggiamo anche la policy di gestione admin che è potenzialmente pericolosa
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;

CREATE POLICY "Group admins can manage members"
ON public.group_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
);

-- Eliminiamo la vecchia policy problematica
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Creiamo una nuova policy sicura
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    -- Permetti se è la riga dell'utente stesso (base)
    user_id = auth.uid() 
    OR 
    -- Permetti se l'utente è il proprietario del gruppo associato
    EXISTS (
        SELECT 1 FROM public.groups 
        WHERE groups.id = group_members.group_id 
        AND groups.owner_id = auth.uid()
    )
);

-- Aggiorniamo la policy delle dispense
DROP POLICY IF EXISTS "Users can view their own and group pantries" ON public.dispense;

CREATE POLICY "Users can view their own and group pantries" 
ON public.dispense FOR SELECT 
USING (
    -- Proprietario diretto
    user_id = auth.uid() 
    OR 
    -- Accesso tramite gruppo (senza join profondi)
    group_id IN (
        SELECT g.id 
        FROM public.groups g
        JOIN public.group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL
    )
);

-- Elimina le vecchie policy che causano il loop
DROP POLICY IF EXISTS "Group owners can manage their groups" ON public.groups;
DROP POLICY IF EXISTS "Group members can view their groups" ON public.groups;

-- Policy per il proprietario (semplicissima, zero ricorsione)
CREATE POLICY "Group owners can manage their groups" 
ON public.groups FOR ALL 
USING (auth.uid() = owner_id);

-- Policy per i membri (interroga group_members in modo diretto)
CREATE POLICY "Group members can view their groups"
ON public.groups FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE group_members.group_id = id 
        AND group_members.user_id = auth.uid() 
        AND group_members.accepted_at IS NOT NULL
    )
);

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    -- Può vedere se stesso
    user_id = auth.uid() 
    OR 
    -- Può vedere se fa parte dello stesso gruppo (senza join con la tabella groups)
    group_id IN (
        SELECT gm.group_id 
        FROM public.group_members gm 
        WHERE gm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view their own and group pantries" ON public.dispense;

CREATE POLICY "Users can view their own and group pantries" 
ON public.dispense FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    group_id IN (
        SELECT gm.group_id 
        FROM public.group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.accepted_at IS NOT NULL
    )
);


-- 1. PULIZIA TOTALE (Rimuoviamo le policy sospette di ricorsione)
DROP POLICY IF EXISTS "Group owners can manage their groups" ON public.groups;
DROP POLICY IF EXISTS "Group members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their own and group pantries" ON public.dispense;
DROP POLICY IF EXISTS "Users can update their own and group pantries" ON public.dispense;

-- 2. POLICY PER "GROUPS"
-- Il proprietario vede tutto
CREATE POLICY "groups_owner_policy" ON public.groups
FOR ALL USING (auth.uid() = owner_id);

-- I membri vedono il gruppo (usiamo una query diretta su group_members senza join)
CREATE POLICY "groups_member_select" ON public.groups
FOR SELECT USING (
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- 3. POLICY PER "GROUP_MEMBERS" (Il punto critico)
-- Evitiamo di guardare la tabella 'groups' qui. 
-- Ogni utente può vedere i record dei gruppi a cui appartiene.
CREATE POLICY "members_select_policy" ON public.group_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  group_id IN (SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid())
);

-- Permessi di gestione (Solo il proprietario del gruppo o chi è admin nel gruppo)
-- Nota: qui usiamo un controllo sul ruolo senza ricorsione
CREATE POLICY "members_admin_policy" ON public.group_members
FOR ALL USING (
  group_id IN (
    SELECT id FROM public.groups WHERE owner_id = auth.uid()
  )
);

-- 4. POLICY PER "DISPENSE" (Quella che sta fallendo nel tuo log)
-- Uniamo i permessi personali e quelli di gruppo in modo lineare
CREATE POLICY "dispense_access_policy" ON public.dispense
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  group_id IN (SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL)
);

CREATE POLICY "dispense_update_policy" ON public.dispense
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  group_id IN (SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid() AND gm.role IN ('admin', 'editor'))
);

-- 1. Rimuoviamo tutte le policy delle tabelle coinvolte per resettare lo stato
DROP POLICY IF EXISTS "groups_owner_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_member_select" ON public.groups;
DROP POLICY IF EXISTS "members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "members_admin_policy" ON public.group_members;
DROP POLICY IF EXISTS "dispense_access_policy" ON public.dispense;
DROP POLICY IF EXISTS "dispense_update_policy" ON public.dispense;
DROP POLICY IF EXISTS "Group members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- 2. Policy per GROUP_MEMBERS (La radice del problema)
-- Usiamo solo controlli diretti sulla riga corrente per evitare di interrogare di nuovo la tabella
CREATE POLICY "members_basic_access" ON public.group_members
FOR SELECT USING (
  user_id = auth.uid()
);

-- Permettiamo di vedere gli altri membri dello stesso gruppo usando una subquery 
-- che Postgres processa in modo più efficiente (evitando il loop)
CREATE POLICY "members_group_access" ON public.group_members
FOR SELECT USING (
  group_id IN (
    SELECT id FROM public.groups WHERE owner_id = auth.uid()
  )
);

-- 3. Policy per GROUPS
CREATE POLICY "groups_owner_all" ON public.groups
FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "groups_member_view" ON public.groups
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid()
  )
);

-- 4. Policy per DISPENSE (Quella richiesta dal tuo frontend)
-- Separiamo nettamente i due casi: proprietà e appartenenza a gruppo
CREATE POLICY "dispense_owner_select" ON public.dispense
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "dispense_group_select" ON public.dispense
FOR SELECT USING (
  group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = dispense.group_id 
    AND group_members.user_id = auth.uid()
    AND group_members.accepted_at IS NOT NULL
  )
);