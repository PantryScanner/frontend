-- Create products table to store product catalog
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  image_url TEXT,
  unit TEXT DEFAULT 'pz',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scanners table for physical devices
CREATE TABLE public.scanners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dispensa_id UUID REFERENCES public.dispense(id) ON DELETE SET NULL,
  serial_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  qr_code TEXT UNIQUE NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dispense_products junction table for inventory
CREATE TABLE public.dispense_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispensa_id UUID NOT NULL REFERENCES public.dispense(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER DEFAULT 2,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dispensa_id, product_id)
);

-- Create scan_logs table to track all scan events
CREATE TABLE public.scan_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scanner_id UUID NOT NULL REFERENCES public.scanners(id) ON DELETE CASCADE,
  dispensa_id UUID NOT NULL REFERENCES public.dispense(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove')),
  quantity INTEGER NOT NULL DEFAULT 1,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispense_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Products RLS policies
CREATE POLICY "Users can view their own products" ON public.products
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" ON public.products
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
FOR DELETE USING (auth.uid() = user_id);

-- Scanners RLS policies
CREATE POLICY "Users can view their own scanners" ON public.scanners
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scanners" ON public.scanners
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scanners" ON public.scanners
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scanners" ON public.scanners
FOR DELETE USING (auth.uid() = user_id);

-- Dispense products RLS policies (based on dispensa ownership)
CREATE POLICY "Users can view products in their pantries" ON public.dispense_products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dispense 
    WHERE dispense.id = dispense_products.dispensa_id 
    AND dispense.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add products to their pantries" ON public.dispense_products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dispense 
    WHERE dispense.id = dispense_products.dispensa_id 
    AND dispense.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update products in their pantries" ON public.dispense_products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.dispense 
    WHERE dispense.id = dispense_products.dispensa_id 
    AND dispense.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove products from their pantries" ON public.dispense_products
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.dispense 
    WHERE dispense.id = dispense_products.dispensa_id 
    AND dispense.user_id = auth.uid()
  )
);

-- Scan logs RLS policies
CREATE POLICY "Users can view their scan logs" ON public.scan_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.scanners 
    WHERE scanners.id = scan_logs.scanner_id 
    AND scanners.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create scan logs" ON public.scan_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scanners 
    WHERE scanners.id = scan_logs.scanner_id 
    AND scanners.user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scanners_updated_at
BEFORE UPDATE ON public.scanners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispense_products_updated_at
BEFORE UPDATE ON public.dispense_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();