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

const validateBarcode = (b: string) => /^[A-Za-z0-9\-_.]{4,48}$/.test(b);
const isNumericBarcode = (b: string) => /^\d{8,14}$/.test(b);
const validateQuantity = (q: unknown): q is number =>
  typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= 1000;

const cleanCategory = (cat: string) => cat.replace(/^[a-z]{2}:/, "").trim();

function json(d: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
      category: mainCategory,
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
      categories_for_rel: categoriesTags.slice(0, 10),
    };
  } catch (e) {
    console.error("[OFF] Fetch error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Identità Utente
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const {
      barcode,
      dispensa_id,
      action = "add",
      quantity = 1,
    }: ScanRequest = await req.json();
    const trimmed = (barcode ?? "").toString().trim();

    if (!trimmed || !validateBarcode(trimmed))
      return json({ error: "Barcode non valido" }, 400);

    // 2. QUERY PARALLELE (Dispensa + Prodotto + Quantità Attuale)
    // Eseguiamo tutto in un colpo solo per abbattere la latenza di rete
    const [dispensaRes, productRes] = await Promise.all([
      admin
        .from("dispense")
        .select("id, name, group_id, user_id")
        .eq("id", dispensa_id)
        .maybeSingle(),
      admin
        .from("products")
        .select("id, name")
        .eq("barcode", trimmed)
        .maybeSingle(),
    ]);

    if (dispensaRes.error || !dispensaRes.data)
      return json({ error: "Dispensa non trovata" }, 404);
    const dispensa = dispensaRes.data;

    // 3. Verifica Permessi (Corretta e Ottimizzata)
    const isOwner = dispensa.user_id === user.id;

    if (!isOwner) {
      if (!dispensa.group_id) {
        // Non è il proprietario e non è una dispensa di gruppo -> Blocca subito
        return json({ error: "Permesso negato: Dispensa privata" }, 403);
      }

      // Se è una dispensa di gruppo, verifichiamo l'appartenenza dell'utente corrente
      const { data: membership } = await admin
        .from("group_members")
        .select("role, accepted_at")
        .eq("group_id", dispensa.group_id)
        .eq("user_id", user.id)
        .maybeSingle();

      // Permetti l'accesso se l'invito è accettato e il ruolo è autorizzato a modificare.
      // NOTA: Assicurati che "editor" e "admin" combacino esattamente con i ruoli nel tuo DB.
      // Se i membri semplici si chiamano "member", aggiungilo all'array qui sotto.
      const hasValidRole =
        membership?.role &&
        ["member", "editor", "admin"].includes(membership.role);
      const isAllowedGroupMember = !!(membership?.accepted_at && hasValidRole);

      if (!isAllowedGroupMember) {
        return json(
          {
            error:
              "Permesso negato: Non hai i permessi di scrittura in questo gruppo",
          },
          403,
        );
      }
    }

    let productId: string;
    let productName: string;

    // 4. Trova o Crea Prodotto
    if (productRes.data) {
      productId = productRes.data.id;
      productName = productRes.data.name;
    } else {
      // Solo se il prodotto è nuovo chiamiamo OpenFoodFacts
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

      // Inserimento categorie asincrono (non blocca la risposta principale)
      if (off?.categories_for_rel?.length) {
        const rows = off.categories_for_rel.map((cat) => ({
          product_id: productId,
          name: cat,
        }));
        admin.from("product_categories").insert(rows).then();
      }
    }

    // 5. Aggiorna Quantità
    // Recuperiamo la quantità attuale (poteva essere fatto nel Promise.all iniziale,
    // ma serve l'ID prodotto che potrebbe essere appena stato creato)
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

    // 6. Notifica (FIRE-AND-FORGET)
    // Non usiamo 'await' qui: la risposta al client parte subito
    admin
      .from("notifications")
      .insert({
        user_id: user.id,
        title: action === "add" ? "Aggiunto" : "Rimosso",
        message: `${quantity}x ${productName}`,
        type: "scanner",
      })
      .then();

    // Ritorno immediato dei dati essenziali alla UI
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
