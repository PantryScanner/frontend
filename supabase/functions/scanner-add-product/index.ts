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
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing barcode or scanner_serial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate scanner serial format: SCN-XXXXXXXX-XXXX
    const serialPattern = /^SCN-[A-Z0-9]{8}-[A-Z0-9]{4}$/
    if (!serialPattern.test(scanner_serial)) {
      console.error(`Invalid scanner serial format: ${scanner_serial}`)
      return new Response(
        JSON.stringify({ error: 'Invalid scanner serial format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the scanner by serial number
    const { data: scanner, error: scannerError } = await supabase
      .from('scanners')
      .select('id, user_id, dispensa_id, name')
      .eq('serial_number', scanner_serial)
      .maybeSingle()

    if (scannerError) {
      console.error('Error finding scanner:', scannerError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!scanner) {
      console.error(`Scanner not found: ${scanner_serial}`)
      return new Response(
        JSON.stringify({ error: 'Scanner not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!scanner.dispensa_id) {
      console.error(`Scanner ${scanner_serial} has no dispensa assigned`)
      return new Response(
        JSON.stringify({ error: 'Scanner has no pantry assigned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Scanner found: ${scanner.name}, dispensa_id: ${scanner.dispensa_id}`)

    // Update scanner last_seen_at
    await supabase
      .from('scanners')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', scanner.id)

    // Find or create the product
    let productId: string

    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .eq('user_id', scanner.user_id)
      .limit(1)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
      console.log(`Found existing product: ${productId}`)
    } else {
      // Create new product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          barcode,
          user_id: scanner.user_id,
        })
        .select('id')
        .single()

      if (productError) {
        console.error('Error creating product:', productError)
        return new Response(
          JSON.stringify({ error: 'Failed to create product' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      productId = newProduct.id
      console.log(`Created new product: ${productId}`)
    }

    // Update or create dispense_products entry
    const { data: existingDispenseProduct } = await supabase
      .from('dispense_products')
      .select('id, quantity')
      .eq('dispensa_id', scanner.dispensa_id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existingDispenseProduct) {
      const newQuantity = action === 'add' 
        ? existingDispenseProduct.quantity + quantity 
        : Math.max(0, existingDispenseProduct.quantity - quantity)

      await supabase
        .from('dispense_products')
        .update({ 
          quantity: newQuantity, 
          last_scanned_at: new Date().toISOString() 
        })
        .eq('id', existingDispenseProduct.id)

      console.log(`Updated dispense_products quantity: ${newQuantity}`)
    } else {
      await supabase
        .from('dispense_products')
        .insert({
          dispensa_id: scanner.dispensa_id,
          product_id: productId,
          quantity: action === 'add' ? quantity : 0,
          last_scanned_at: new Date().toISOString(),
        })

      console.log('Created new dispense_products entry')
    }

    // Create scan log
    const { error: logError } = await supabase
      .from('scan_logs')
      .insert({
        scanner_id: scanner.id,
        dispensa_id: scanner.dispensa_id,
        product_id: productId,
        barcode,
        action,
        quantity,
      })

    if (logError) {
      console.error('Error creating scan log:', logError)
    }

    // Create notification for the user
    const { data: dispensaData } = await supabase
      .from('dispense')
      .select('name')
      .eq('id', scanner.dispensa_id)
      .single()

    await supabase
      .from('notifications')
      .insert({
        user_id: scanner.user_id,
        title: action === 'add' ? 'Prodotto aggiunto' : 'Prodotto rimosso',
        message: `${quantity} prodott${quantity > 1 ? 'i' : 'o'} ${action === 'add' ? 'aggiunt' : 'rimoss'}${quantity > 1 ? 'i' : 'o'} in ${dispensaData?.name || 'dispensa'}`,
        type: 'scanner',
      })

    console.log('Scan completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        product_id: productId,
        action,
        quantity 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})