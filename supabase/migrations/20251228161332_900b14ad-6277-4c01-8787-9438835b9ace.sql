-- Remove columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;

-- Remove columns from scanners
ALTER TABLE public.scanners DROP COLUMN IF EXISTS qr_code;

-- Remove columns from dispense and add color
ALTER TABLE public.dispense DROP COLUMN IF EXISTS status;
ALTER TABLE public.dispense DROP COLUMN IF EXISTS icon;
ALTER TABLE public.dispense ADD COLUMN color text DEFAULT '#6366f1';

-- Remove columns from products
ALTER TABLE public.products DROP COLUMN IF EXISTS image_url;
ALTER TABLE public.products DROP COLUMN IF EXISTS brand;
ALTER TABLE public.products DROP COLUMN IF EXISTS description;
ALTER TABLE public.products DROP COLUMN IF EXISTS unit;

-- Make products.name nullable (not required anymore)
ALTER TABLE public.products ALTER COLUMN name DROP NOT NULL;