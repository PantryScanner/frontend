import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  plan_id: string;
  billing_interval: "monthly" | "yearly";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const jsonResponse = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { plan_id, billing_interval }: CheckoutRequest = await req.json();
    if (!plan_id || !["monthly", "yearly"].includes(billing_interval)) {
      return jsonResponse({ error: "plan_id e billing_interval validi sono obbligatori" }, 400);
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, stripe_price_id_monthly, stripe_price_id_yearly")
      .eq("id", plan_id)
      .maybeSingle();

    if (planError || !plan) {
      return jsonResponse({ error: "Piano non trovato" }, 404);
    }

    const priceId =
      billing_interval === "yearly"
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;

    if (!priceId) {
      return jsonResponse(
        { error: "Piano non configurato per il pagamento (nessun price Stripe associato)" },
        400,
      );
    }

    // Riusa il customer Stripe esistente se presente
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/abbonamento?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: { user_id: user.id, plan_id, billing_interval },
      subscription_data: {
        metadata: { user_id: user.id, plan_id, billing_interval },
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error: unknown) {
    console.error("stripe-create-checkout error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
