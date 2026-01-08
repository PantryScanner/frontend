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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Helper per risposte JSON uniformi
  const jsonResponse = (data: any, status = 200) => 
    new Response(JSON.stringify(data), { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { barcode, scanner_serial, action = 'add', quantity = 1 }: ScanRequest = await req.json()

    if (!barcode || !scanner_serial) return jsonResponse({ error: 'Missing fields' }, 400)

    // 1. Ottimizzato: Recuperiamo scanner e nome dispensa in un colpo solo
    const { data: scanner, error: scannerError } = await supabase
      .from('scanners')
      .select('id, user_id, dispensa_id, name, dispense(name)') // Join con dispense
      .eq('serial_number', scanner_serial)
      .maybeSingle()

    if (!scanner || scannerError) return jsonResponse({ error: 'Scanner not found' }, 404)

    // Aggiornamento asincrono (non blocca la risposta)
    supabase.from('scanners').update({ last_seen_at: new Date().toISOString() }).eq('id', scanner.id).then();

    // 2. Gestione Prodotto
    let productId: string
    let productName: string
    
    const { data: existingProduct } = await supabase
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
      
      const { data: newProduct, error: pError } = await supabase
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

      // Inserimento categorie (opzionale, asincrono)
      if (offData?.categories?.length) {
        const cats = offData.categories.slice(0, 5).map(cat => ({ product_id: productId, category_name: cat }));
        supabase.from('product_categories').insert(cats).then();
      }
    }

    // 3. Gestione Quantità con UPSERT (Evita race conditions)
    if (scanner.dispensa_id) {
      // Nota: Assicurati di avere un vincolo UNIQUE su (dispensa_id, product_id) nel DB
      const { data: currentEntry } = await supabase
        .from('dispense_products')
        .select('quantity')
        .eq('dispensa_id', scanner.dispensa_id)
        .eq('product_id', productId)
        .maybeSingle();

      const oldQty = currentEntry?.quantity || 0;
      const newQty = action === 'add' ? oldQty + quantity : Math.max(0, oldQty - quantity);

      await supabase
        .from('dispense_products')
        .upsert({
          dispensa_id: scanner.dispensa_id,
          product_id: productId,
          quantity: newQty,
          last_scanned_at: new Date().toISOString()
        }, { onConflict: 'dispensa_id,product_id' })
    }

    // 4. Notifiche e Log
    const locationName = Array.isArray(scanner.dispense) 
      ? scanner.dispense[0]?.name 
      : scanner.dispense?.name || "pantry";
    
    // Eseguiamo log e notifiche in parallelo per velocizzare
    await Promise.all([
      supabase.from('scan_logs').insert({
        scanner_id: scanner.id,
        dispensa_id: scanner.dispensa_id,
        product_id: productId,
        barcode,
        action,
        quantity
      }),
      supabase.from('notifications').insert({
        user_id: scanner.user_id,
        title: action === 'add' ? 'Prodotto aggiunto' : 'Prodotto rimosso',
        message: `${quantity}x ${productName} ${action === 'add' ? 'aggiunto a' : 'rimosso da'} ${locationName}`,
        type: 'scanner'
      })
    ]);

    return jsonResponse({ success: true, productId, productName });

  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
})
