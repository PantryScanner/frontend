import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanRequest {
  barcode: string
  scanner_serial: string
  action?: 'add' | 'remove'
  quantity?: number
}

// Input validation
function validateBarcode(barcode: string): boolean {
  // Allow EAN-8, EAN-13, UPC-A, UPC-E formats (numeric, 8-13 digits)
  return /^\d{8,13}$/.test(barcode);
}

function validateQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 1000;
}

function validateSerialNumber(serial: string): boolean {
  // Format: SCN-XXXXXXXX-XXXX
  return /^SCN-[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(serial);
}

// Unified product data fetching from OpenFoodFacts
async function fetchOpenFoodFactsData(barcode: string) {
  try {
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (!offResponse.ok) return null;
    
    const offData = await offResponse.json();
    if (offData.status !== 1) return null;
    
    const p = offData.product;
    
    return {
      name: p.product_name || p.product_name_it || null,
      image_url: p.image_front_url || p.image_url || null,
      brand: p.brands || null,
      category: p.categories_old || p.categories || null,
      ingredients: p.ingredients_text || p.ingredients_text_it || null,
      nutriscore: p.nutriscore_grade || null,
      ecoscore: p.ecoscore_grade || null,
      nova_group: p.nova_group || null,
      allergens: p.allergens || null,
      nutritional_values: p.nutriments ? {
        energyKcal: p.nutriments['energy-kcal_100g'],
        fat: p.nutriments.fat_100g,
        saturatedFat: p.nutriments['saturated-fat_100g'],
        carbohydrates: p.nutriments.carbohydrates_100g,
        sugars: p.nutriments.sugars_100g,
        fiber: p.nutriments.fiber_100g,
        proteins: p.nutriments.proteins_100g,
        salt: p.nutriments.salt_100g,
        sodium: p.nutriments.sodium_100g
      } : null,
      packaging: p.packaging || null,
      labels: p.labels || null,
      origin: p.origins || p.countries || null,
      carbon_footprint: p.ecoscore_data?.agribalyse?.co2_total ? {
        co2_total: p.ecoscore_data.agribalyse.co2_total,
        co2_agriculture: p.ecoscore_data.agribalyse.co2_agriculture,
        co2_packaging: p.ecoscore_data.agribalyse.co2_packaging,
        co2_transportation: p.ecoscore_data.agribalyse.co2_transportation
      } : null,
      categories: p.categories_tags?.map((c: string) => c.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')) || []
    };
  } catch (err) {
    console.error("OFF Fetch error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Helper for uniform JSON responses
  const jsonResponse = (data: Record<string, unknown>, status = 200) => 
    new Response(JSON.stringify(data), { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  try {
    // 1. Verify JWT authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized - Missing or invalid authorization header' }, 401)
    }

    // Create client with user's auth token (uses anon key, respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the JWT and get user claims
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'Unauthorized - Invalid token' }, 401)
    }

    const userId = claimsData.claims.sub as string

    // 2. Parse and validate request body
    const { barcode, scanner_serial, action = 'add', quantity = 1 }: ScanRequest = await req.json()

    // Input validation
    if (!barcode || !scanner_serial) {
      return jsonResponse({ error: 'Missing required fields: barcode and scanner_serial' }, 400)
    }

    if (!validateBarcode(barcode)) {
      return jsonResponse({ error: 'Invalid barcode format. Must be 8-13 digits.' }, 400)
    }

    if (!validateSerialNumber(scanner_serial)) {
      return jsonResponse({ error: 'Invalid scanner serial number format' }, 400)
    }

    if (!validateQuantity(quantity)) {
      return jsonResponse({ error: 'Invalid quantity. Must be between 1 and 1000.' }, 400)
    }

    if (action !== 'add' && action !== 'remove') {
      return jsonResponse({ error: 'Invalid action. Must be "add" or "remove".' }, 400)
    }

    // 3. Verify scanner ownership - RLS will filter to only user's scanners
    const { data: scanner, error: scannerError } = await supabase
      .from('scanners')
      .select('id, user_id, dispensa_id, name, dispense(name)')
      .eq('serial_number', scanner_serial)
      .maybeSingle()

    if (scannerError) {
      console.error('Scanner query error:', scannerError)
      return jsonResponse({ error: 'Error querying scanner' }, 500)
    }

    if (!scanner) {
      return jsonResponse({ error: 'Scanner not found or not authorized' }, 404)
    }

    // Verify the authenticated user owns this scanner
    if (scanner.user_id !== userId) {
      return jsonResponse({ error: 'Forbidden - You do not own this scanner' }, 403)
    }

    // Update last_seen_at (fire and forget)
    supabase.from('scanners').update({ last_seen_at: new Date().toISOString() }).eq('id', scanner.id).then();

    // 4. Handle Product - use service role only for product creation (not user-scoped)
    // We need service role here because products are scoped to user_id and we're creating for the scanner owner
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let productId: string
    let productName: string
    
    const { data: existingProduct } = await serviceSupabase
      .from('products')
      .select('id, name')
      .eq('barcode', barcode)
      .eq('user_id', scanner.user_id)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
      productName = existingProduct.name || "Prodotto senza nome"
    } else {
      const offData = await fetchOpenFoodFactsData(barcode)
      
      const { data: newProduct, error: pError } = await serviceSupabase
        .from('products')
        .insert({
          barcode,
          user_id: scanner.user_id,
          name: offData?.name || "Nuovo Prodotto",
          image_url: offData?.image_url,
          brand: offData?.brand,
          nutriscore: offData?.nutriscore,
          ecoscore: offData?.ecoscore || null,
          nova_group: offData?.nova_group || null,
          allergens: offData?.allergens || null,
          nutritional_values: offData?.nutritional_values || null,
          packaging: offData?.packaging || null,
          labels: offData?.labels || null,
          origin: offData?.origin || null,
          carbon_footprint: offData?.carbon_footprint || null
        })
        .select('id, name')
        .single()

      if (pError) throw pError
      productId = newProduct.id
      productName = newProduct.name

      // Insert categories (optional, async)
      if (offData?.categories?.length) {
        const cats = offData.categories.slice(0, 5).map((cat: string) => ({ product_id: productId, category_name: cat }));
        serviceSupabase.from('product_categories').insert(cats).then();
      }
    }

    // 5. Handle Quantity with UPSERT (Avoids race conditions)
    if (scanner.dispensa_id) {
      const { data: currentEntry } = await serviceSupabase
        .from('dispense_products')
        .select('quantity')
        .eq('dispensa_id', scanner.dispensa_id)
        .eq('product_id', productId)
        .maybeSingle();

      const oldQty = currentEntry?.quantity || 0;
      const newQty = action === 'add' ? oldQty + quantity : Math.max(0, oldQty - quantity);

      await serviceSupabase
        .from('dispense_products')
        .upsert({
          dispensa_id: scanner.dispensa_id,
          product_id: productId,
          quantity: newQty,
          last_scanned_at: new Date().toISOString()
        }, { onConflict: 'dispensa_id,product_id' })
    }

    // 6. Notifications and Logs
    const dispenseData = scanner.dispense as { name: string } | { name: string }[] | null;
    const locationName = Array.isArray(dispenseData) 
      ? dispenseData[0]?.name 
      : dispenseData?.name || "pantry";
    
    // Execute log and notification in parallel for speed
    await Promise.all([
      serviceSupabase.from('scan_logs').insert({
        scanner_id: scanner.id,
        dispensa_id: scanner.dispensa_id,
        product_id: productId,
        barcode,
        action,
        quantity
      }),
      serviceSupabase.from('notifications').insert({
        user_id: scanner.user_id,
        title: action === 'add' ? 'Prodotto aggiunto' : 'Prodotto rimosso',
        message: `${quantity}x ${productName} ${action === 'add' ? 'aggiunto a' : 'rimosso da'} ${locationName}`,
        type: 'scanner'
      })
    ]);

    return jsonResponse({ success: true, productId, productName });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Scanner function error:', errorMessage)
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
})
