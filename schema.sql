-- =========================================================
-- HYP3 by Teepresso - Supabase Schema
-- =========================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  num TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 1199,
  stock INTEGER NOT NULL DEFAULT 20,
  sizes JSONB NOT NULL DEFAULT '["S", "M", "L", "XL", "XXL"]'::jsonb,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  shipping_address TEXT,
  item TEXT NOT NULL,
  size TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  utr TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'shipped'
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR PRODUCTS
-- Anyone can view products
CREATE POLICY "Public products viewable by everyone" 
  ON public.products FOR SELECT 
  USING (true);

-- Authenticated admin can insert, update, delete products
CREATE POLICY "Admin full access to products" 
  ON public.products FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 4. RLS POLICIES FOR ORDERS
-- Anyone can submit a checkout order
CREATE POLICY "Public can insert orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (true);

-- Authenticated admin can view and update orders
CREATE POLICY "Admin full access to orders" 
  ON public.orders FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. STORAGE BUCKET FOR PRODUCT IMAGES
-- Create bucket 'product-images' if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Public can view images
CREATE POLICY "Public Access to product-images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'product-images');

-- Authenticated admin can upload/update/delete product images
CREATE POLICY "Admin upload to product-images" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admin update product-images" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin delete product-images" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'product-images');

-- 6. SEED INITIAL PRODUCTS
INSERT INTO public.products (id, num, name, subtitle, price, stock, sizes, image, description)
VALUES 
(
  'shatter',
  '01',
  'SHATTER',
  'Thermal Vinyl Graphic Tee',
  1199,
  24,
  '["S", "M", "L", "XL", "XXL"]'::jsonb,
  '/assets/shatter.png',
  'Deconstructed geometric fracture printed in high-density matte thermal polyurethane. Heat pressed at 165°C onto 280 GSM heavyweight French terry cotton with zero cracking.'
),
(
  'spiral',
  '02',
  'SPIRAL',
  'Kinetic Motion Vinyl Tee',
  1199,
  18,
  '["S", "M", "L", "XL", "XXL"]'::jsonb,
  '/assets/spiral.png',
  'Vortex radial distortion engineered through optical heat vinyl transfer. Retains sharp edge contrast and ultra flexible tactile finish through 50+ wash cycles.'
),
(
  'core',
  '03',
  'CORE',
  'Thermal Nucleus Graphic Tee',
  1199,
  12,
  '["S", "M", "L", "XL", "XXL"]'::jsonb,
  '/assets/core.png',
  'Centralized high-intensity thermal reactor graphic. Dual-layer vinyl fused under hydraulic industrial pressure for an ultra-flat matte feel.'
),
(
  'flow',
  '04',
  'FLOW',
  'Organic Thermal Streamline Tee',
  1199,
  30,
  '["S", "M", "L", "XL", "XXL"]'::jsonb,
  '/assets/flow.png',
  'Fluid waveform typographic vinyl print wrapping the lower chest line. Smooth satin sheen vinyl with zero cracking guarantee and reinforced neckline.'
)
ON CONFLICT (id) DO NOTHING;
