import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  barcode: string;
  dispensa_id: string;
  action?: "add" | "remove";
  quantity?: number;
}

// ─── Validatori ────────────────────────────────────────────────────────────────
const validateBarcode = (b: string) => /^[A-Za-z0-9\-_.]{4,48}$/.test(b);
const isNumericBarcode = (b: string) => /^\d{8,14}$/.test(b);
const validateQuantity = (q: unknown): q is number =>
  typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= 1000;

// ─── Helper ───────────────────────────────────────────────────────────────────
const cleanCategory = (cat: string) => cat.replace(/^[a-z]{2}:/, "").trim();

function json(d: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── OpenFoodFacts API ─────────────────────────────────────────────────────────
async function fetchOpenFoodFactsData(barcode: string) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { "User-Agent": "PantryApp/1.0" } },
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;

    // Estraiamo la lista delle categorie come array di stringhe
    const categoriesTags: string[] = (p.categories_tags ?? []).map(
      cleanCategory,
    );
    const mainCategory =
      categoriesTags[0] || p.categories?.split(",")[0]?.trim() || null;

    return {
      name:
        p.product_name_it ||
        p.product_name_en ||
        p.product_name ||
        "Prodotto Sconosciuto",
      brand: p.brands?.split(",")[0]?.trim() || null,
      category: mainCategory, // Categoria principale per la tabella products
      image_url: p.image_front_url || p.image_url || null,
      ingredients: p.ingredients_text_it || p.ingredients_text || null,
      nutriscore: p.nutriscore_grade || null,
      ecoscore: p.ecoscore_grade || null,
      nova_group: p.nova_group ? Number(p.nova_group) : null,
      allergens: p.allergens || null,
      nutritional_values: p.nutriments
        ? {
            energyKcal: p.nutriments["energy-kcal_100g"] ?? null,
            fat: p.nutriments["fat_100g"] ?? null,
            carbohydrates: p.nutriments["carbohydrates_100g"] ?? null,
            proteins: p.nutriments["proteins_100g"] ?? null,
            salt: p.nutriments["salt_100g"] ?? null,
          }
        : null,
      categories_for_rel: categoriesTags.slice(0, 10), // Limitiamo a 10 per non intasare il DB
    };
  } catch (e) {
    console.error("[OFF] Fetch error:", e);
    return null;
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client Utente (per identità) e Admin (per bypassare RLS durante l'automazione)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body: ScanRequest = await req.json();
    const { barcode, dispensa_id, action = "add", quantity = 1 } = body;

    const trimmed = (barcode ?? "").toString().trim();
    if (!trimmed || !validateBarcode(trimmed))
      return json({ error: "Codice a barre non valido" }, 400);
    if (!validateQuantity(quantity))
      return json({ error: "Quantità non valida" }, 400);

    // 1. Verifica dispensa e permessi
    const { data: dispensa, error: dErr } = await admin
      .from("dispense")
      .select("id, name, group_id, user_id")
      .eq("id", dispensa_id)
      .maybeSingle();

    if (dErr || !dispensa) return json({ error: "Dispensa non trovata" }, 404);

    let allowed = dispensa.user_id === user.id;
    if (!allowed && dispensa.group_id) {
      const { data: membership } = await admin
        .from("group_members")
        .select("role, accepted_at")
        .eq("group_id", dispensa.group_id)
        .eq("user_id", user.id)
        .maybeSingle();
      allowed = !!(
        membership?.accepted_at && ["editor", "admin"].includes(membership.role)
      );
    }

    if (!allowed) return json({ error: "Permesso negato" }, 403);

    // 2. Trova o crea prodotto
    let productQuery = admin
      .from("products")
      .select("id, name")
      .eq("barcode", trimmed);
    if (dispensa.group_id) {
      productQuery = productQuery.or(
        `user_id.eq.${dispensa.user_id},group_id.eq.${dispensa.group_id}`,
      );
    } else {
      productQuery = productQuery.eq("user_id", dispensa.user_id);
    }

    const { data: existing } = await productQuery.maybeSingle();

    let productId: string;
    let productName: string;

    if (existing) {
      productId = existing.id;
      productName = existing.name;
    } else {
      const off = isNumericBarcode(trimmed)
        ? await fetchOpenFoodFactsData(trimmed)
        : null;

      const { data: created, error: pErr } = await admin
        .from("products")
        .insert({
          barcode: trimmed,
          user_id: dispensa.user_id,
          group_id: dispensa.group_id,
          name: off?.name ?? "Prodotto Scansionato",
          brand: off?.brand ?? null,
          category: off?.category ?? null,
          image_url: off?.image_url ?? null,
          ingredients: off?.ingredients ?? null,
          nutriscore: off?.nutriscore ?? null,
          ecoscore: off?.ecoscore ?? null,
          nova_group: off?.nova_group ?? null,
          allergens: off?.allergens ?? null,
          nutritional_values: off?.nutritional_values ?? null,
        })
        .select("id, name")
        .single();

      if (pErr) throw pErr;
      productId = created.id;
      productName = created.name;

      // Inserimento categorie nella tabella correlata
      if (off?.categories_for_rel && off.categories_for_rel.length > 0) {
        const categoryRows = off.categories_for_rel.map((cat) => ({
          product_id: productId,
          name: cat,
        }));
        await admin.from("product_categories").insert(categoryRows);
      }
    }

    // 3. Aggiorna quantità in dispensa
    const { data: curRow } = await admin
      .from("dispense_products")
      .select("quantity")
      .eq("dispensa_id", dispensa_id)
      .eq("product_id", productId)
      .maybeSingle();

    const currentQty = curRow?.quantity ?? 0;
    const newQty =
      action === "add"
        ? currentQty + quantity
        : Math.max(0, currentQty - quantity);

    const { error: upsertErr } = await admin.from("dispense_products").upsert(
      {
        dispensa_id,
        product_id: productId,
        quantity: newQty,
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: "dispensa_id,product_id" },
    );

    if (upsertErr) throw upsertErr;

    // 4. Notifica asincrona
    admin
      .from("notifications")
      .insert({
        user_id: user.id,
        title: action === "add" ? "Prodotto aggiunto" : "Prodotto rimosso",
        message: `${quantity}x ${productName} ${action === "add" ? "nella dispensa" : "dalla dispensa"} ${dispensa.name}`,
        type: "scanner",
      })
      .then();

    return json({
      success: true,
      productId,
      productName,
      newQuantity: newQty,
      action,
    });
  } catch (err) {
    console.error("[Fatal Error]:", err);
    return json({ error: "Errore interno", details: err.message }, 500);
  }
});
