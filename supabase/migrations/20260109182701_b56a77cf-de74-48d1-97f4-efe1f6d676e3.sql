-- PHASE 1: Make groups mandatory for products and dispense
-- Add group_id to products table (currently user_id only)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS group_id UUID;

-- Add unique constraint for invites
ALTER TABLE public.group_invites 
ADD CONSTRAINT group_invites_unique_email_group UNIQUE (group_id, invited_email);

-- Add invited_by profile fields to group_invites for display
ALTER TABLE public.group_invites 
ADD COLUMN IF NOT EXISTS invited_by_username TEXT,
ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid();

-- Add accepted/rejected tracking
ALTER TABLE public.group_invites 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster invite lookups by email
CREATE INDEX IF NOT EXISTS idx_group_invites_email ON public.group_invites(invited_email);

-- Add active_group_id to profiles for storing user's current selected group
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_group_id UUID;

-- Allow profiles to view other group members' profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their groups"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
    AND gm2.user_id = profiles.user_id
    AND gm1.accepted_at IS NOT NULL
    AND gm2.accepted_at IS NOT NULL
  )
);

-- Update products RLS to support group-based access
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view products in their groups"
ON public.products FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = products.group_id
      AND gm.user_id = auth.uid()
      AND gm.accepted_at IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
CREATE POLICY "Users can create products in their groups"
ON public.products FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    group_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = products.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('editor', 'admin')
      AND gm.accepted_at IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update products in their groups"
ON public.products FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = products.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('editor', 'admin')
      AND gm.accepted_at IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete products in their groups"
ON public.products FOR DELETE
USING (
  auth.uid() = user_id
  OR (
    group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = products.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('editor', 'admin')
      AND gm.accepted_at IS NOT NULL
    )
  )
);

-- Update dispense_products RLS to support group access through dispense
DROP POLICY IF EXISTS "Users can view products in their pantries" ON public.dispense_products;
CREATE POLICY "Users can view products in their pantries"
ON public.dispense_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dispense d
    LEFT JOIN public.group_members gm ON gm.group_id = d.group_id
    WHERE d.id = dispense_products.dispensa_id
    AND (
      d.user_id = auth.uid()
      OR (d.group_id IS NOT NULL AND gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL)
    )
  )
);

DROP POLICY IF EXISTS "Users can add products to their pantries" ON public.dispense_products;
CREATE POLICY "Users can add products to their pantries"
ON public.dispense_products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dispense d
    LEFT JOIN public.group_members gm ON gm.group_id = d.group_id
    WHERE d.id = dispense_products.dispensa_id
    AND (
      d.user_id = auth.uid()
      OR (d.group_id IS NOT NULL AND gm.user_id = auth.uid() AND gm.role IN ('editor', 'admin') AND gm.accepted_at IS NOT NULL)
    )
  )
);

DROP POLICY IF EXISTS "Users can update products in their pantries" ON public.dispense_products;
CREATE POLICY "Users can update products in their pantries"
ON public.dispense_products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dispense d
    LEFT JOIN public.group_members gm ON gm.group_id = d.group_id
    WHERE d.id = dispense_products.dispensa_id
    AND (
      d.user_id = auth.uid()
      OR (d.group_id IS NOT NULL AND gm.user_id = auth.uid() AND gm.role IN ('editor', 'admin') AND gm.accepted_at IS NOT NULL)
    )
  )
);

DROP POLICY IF EXISTS "Users can remove products from their pantries" ON public.dispense_products;
CREATE POLICY "Users can remove products from their pantries"
ON public.dispense_products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.dispense d
    LEFT JOIN public.group_members gm ON gm.group_id = d.group_id
    WHERE d.id = dispense_products.dispensa_id
    AND (
      d.user_id = auth.uid()
      OR (d.group_id IS NOT NULL AND gm.user_id = auth.uid() AND gm.role IN ('editor', 'admin') AND gm.accepted_at IS NOT NULL)
    )
  )
);