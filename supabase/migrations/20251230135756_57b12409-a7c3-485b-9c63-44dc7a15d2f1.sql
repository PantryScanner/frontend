-- Create product_categories table for many-to-many relationship
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_categories
CREATE POLICY "Users can view their product categories"
ON public.product_categories
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_categories.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can create their product categories"
ON public.product_categories
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_categories.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can delete their product categories"
ON public.product_categories
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_categories.product_id 
  AND products.user_id = auth.uid()
));

-- Add extended product metadata columns
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS nutriscore TEXT,
ADD COLUMN IF NOT EXISTS ecoscore TEXT,
ADD COLUMN IF NOT EXISTS nova_group INTEGER,
ADD COLUMN IF NOT EXISTS allergens TEXT,
ADD COLUMN IF NOT EXISTS nutritional_values JSONB,
ADD COLUMN IF NOT EXISTS packaging TEXT,
ADD COLUMN IF NOT EXISTS labels TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS carbon_footprint JSONB;

-- Create index for faster category lookups
CREATE INDEX idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX idx_product_categories_category_name ON public.product_categories(category_name);

-- Add tutorial_completed to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT false;