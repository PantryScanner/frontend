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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { barcode, scanner_serial, action = 'add', quantity = 1 }: ScanRequest = await req.json()

    console.log(`Received scan request: barcode=${barcode}, scanner=${scanner_serial}, action=${action}, qty=${quantity}`)

    // Validate input
    if (!barcode || !scanner_serial) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })
    }

    // Find Scanner and associated Dispensa
    const { data: scanner, error: scannerError } = await supabase
      .from('scanners')
      .select('id, user_id, dispensa_id, name')
      .eq('serial_number', scanner_serial)
      .maybeSingle()

    if (!scanner || scannerError) {
      return new Response(JSON.stringify({ error: 'Scanner not found or unauthorized' }), { status: 404, headers: corsHeaders })
    }

    // Update scanner last seen
    await supabase.from('scanners').update({ last_seen_at: new Date().toISOString() }).eq('id', scanner.id)

    // Product Management (Find or Create with OpenFoodFacts data)
    let productId: string
    let productName = "Nuovo Prodotto";
    
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, name')
      .eq('barcode', barcode)
      .eq('user_id', scanner.user_id)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
      productName = existingProduct.name || productName
    } else {
      // Fetch full data from OpenFoodFacts for new products
      const offData = await fetchOpenFoodFactsData(barcode);
      
      const productInsertData = {
        barcode,
        user_id: scanner.user_id,
        name: offData?.name || "Nuovo Prodotto",
        image_url: offData?.image_url || null,
        brand: offData?.brand || null,
        category: offData?.category || null,
        ingredients: offData?.ingredients || null,
        nutriscore: offData?.nutriscore || null,
        ecoscore: offData?.ecoscore || null,
        nova_group: offData?.nova_group || null,
        allergens: offData?.allergens || null,
        nutritional_values: offData?.nutritional_values || null,
        packaging: offData?.packaging || null,
        labels: offData?.labels || null,
        origin: offData?.origin || null,
        carbon_footprint: offData?.carbon_footprint || null
      };

      const { data: newProduct, error: pError } = await supabase
        .from('products')
        .insert(productInsertData)
        .select('id, name')
        .single()

      if (pError) throw pError
      productId = newProduct.id
      productName = newProduct.name || "Nuovo Prodotto"
      
      // Insert categories if available
      if (offData?.categories && offData.categories.length > 0) {
        const categoriesToInsert = offData.categories.slice(0, 10).map((cat: string) => ({
          product_id: productId,
          category_name: cat
        }));
        
        await supabase.from('product_categories').insert(categoriesToInsert);
      }
    }

    // Update quantity (only if dispensa is assigned)
    if (scanner.dispensa_id) {
      const { data: existingEntry } = await supabase
        .from('dispense_products')
        .select('id, quantity')
        .eq('dispensa_id', scanner.dispensa_id)
        .eq('product_id', productId)
        .maybeSingle()

      if (existingEntry) {
        const newQty = action === 'add' 
          ? existingEntry.quantity + quantity 
          : Math.max(0, existingEntry.quantity - quantity)
        await supabase
          .from('dispense_products')
          .update({ quantity: newQty, last_scanned_at: new Date().toISOString() })
          .eq('id', existingEntry.id)
      } else {
        await supabase.from('dispense_products').insert({
          dispensa_id: scanner.dispensa_id,
          product_id: productId,
          quantity: action === 'add' ? quantity : 0,
          last_scanned_at: new Date().toISOString()
        })
      }
    }

    // Log and Notification
    await supabase.from('scan_logs').insert({
      scanner_id: scanner.id,
      dispensa_id: scanner.dispensa_id || null,
      product_id: productId,
      barcode,
      action,
      quantity
    })

    let locationName = "inventario generale";
    if (scanner.dispensa_id) {
      const { data: dispensa } = await supabase.from('dispense').select('name').eq('id', scanner.dispensa_id).single()
      if (dispensa) locationName = dispensa.name;
    }

    await supabase.from('notifications').insert({
      user_id: scanner.user_id,
      title: action === 'add' ? 'Prodotto aggiunto' : 'Prodotto rimosso',
      message: `${quantity}x ${productName} ${action === 'add' ? 'aggiunto a' : 'rimosso da'} ${locationName}`,
      type: 'scanner'
    })

    console.log(`Successfully processed: product=${productId}, dispensa_assigned=${!!scanner.dispensa_id}`)

    return new Response(JSON.stringify({ 
      success: true, 
      productId, 
      productName,
      dispensa_assigned: !!scanner.dispensa_id 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Scanner edge function error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders })
  }
})
