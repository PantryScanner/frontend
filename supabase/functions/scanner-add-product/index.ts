import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // 2. Trova Scanner e Dispensa associata
    const { data: scanner, error: scannerError } = await supabase
      .from('scanners')
      .select('id, user_id, dispensa_id, name')
      .eq('serial_number', scanner_serial)
      .maybeSingle()

    if (!scanner || scannerError) {
      return new Response(JSON.stringify({ error: 'Scanner not found or unauthorized' }), { status: 404, headers: corsHeaders })
    }

    // Aggiorna ultimo avvistamento scanner
    await supabase.from('scanners').update({ last_seen_at: new Date().toISOString() }).eq('id', scanner.id)

    // 3. Gestione Prodotto (Trova o Crea con dati OpenFoodFacts)
    let productId: string
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .eq('user_id', scanner.user_id)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
    } else {
      // Recupero dati da OpenFoodFacts
      let productName = "Nuovo Prodotto";
      let imageUrl = null;
      let brand = null;

      try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        if (offResponse.ok) {
          const offData = await offResponse.json();
          if (offData.status === 1) {
            const p = offData.product;
            productName = p.product_name || p.product_name_it || productName;
            imageUrl = p.image_front_url || p.image_url || null;
            brand = p.brands || null;
          }
        }
      } catch (err) {
        console.error("OFF Fetch error:", err);
      }

      const { data: newProduct, error: pError } = await supabase
        .from('products')
        .insert({
          barcode,
          user_id: scanner.user_id,
          name: productName,
          image_url: imageUrl,
          brand: brand
        })
        .select('id')
        .single()

      if (pError) throw pError
      productId = newProduct.id
    }

    // 2. Aggiornamento Quantità (Solo se c'è una dispensa assegnata)
    if (scanner.dispensa_id) {
      const { data: existingEntry } = await supabase
        .from('dispense_products')
        .select('id, quantity')
        .eq('dispensa_id', scanner.dispensa_id)
        .eq('product_id', productId)
        .maybeSingle()

      if (existingEntry) {
        const newQty = action === 'add' ? existingEntry.quantity + quantity : Math.max(0, existingEntry.quantity - quantity)
        await supabase.from('dispense_products').update({ quantity: newQty, last_scanned_at: new Date().toISOString() }).eq('id', existingEntry.id)
      } else {
        await supabase.from('dispense_products').insert({
          dispensa_id: scanner.dispensa_id,
          product_id: productId,
          quantity: action === 'add' ? quantity : 0,
          last_scanned_at: new Date().toISOString()
        })
      }
    }

    // 3. Log e Notifica (Gestiscono dispensa nulla)
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
      title: action === 'add' ? 'Prodotto rilevato' : 'Prodotto rimosso',
      message: `${quantity} x ${barcode} rilevato in ${locationName}${!scanner.dispensa_id ? ' (Nessuna dispensa assegnata)' : ''}`,
      type: 'scanner'
    })

    return new Response(JSON.stringify({ 
      success: true, 
      productId, 
      dispensa_assigned: !!scanner.dispensa_id 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})