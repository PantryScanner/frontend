import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

// Stripe non manda un JWT Supabase: la sicurezza e' garantita dalla verifica
// della firma (STRIPE_WEBHOOK_SECRET), non da CORS/auth header.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const jsonResponse = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
  });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return jsonResponse({ error: "Missing signature or secret" }, 400);
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  try {
    // Idempotenza: se l'evento e' gia' stato processato, l'insert unique fallisce
    // e rispondiamo 200 senza rielaborare.
    const { error: dupError } = await supabase.from("payment_events").insert({
      source: "stripe_webhook",
      event_type: event.type,
      stripe_event_id: event.id,
      payload: event.data.object as unknown as Record<string, unknown>,
    });

    if (dupError) {
      if (dupError.code === "23505") {
        return jsonResponse({ received: true, duplicate: true });
      }
      throw dupError;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        const planId = session.metadata?.plan_id;
        const billingInterval = session.metadata?.billing_interval;

        if (userId && planId && session.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );

          await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              plan_id: planId,
              status: "active",
              provider: "stripe",
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: stripeSub.id,
              billing_interval: billingInterval,
              current_period_start: new Date(
                stripeSub.current_period_start * 1000,
              ).toISOString(),
              current_period_end: new Date(
                stripeSub.current_period_end * 1000,
              ).toISOString(),
              cancel_at_period_end: stripeSub.cancel_at_period_end,
            },
            { onConflict: "user_id" },
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "past_due",
          incomplete: "incomplete",
          incomplete_expired: "expired",
        };

        await supabase
          .from("subscriptions")
          .update({
            status: statusMap[sub.status] ?? "active",
            current_period_start: new Date(
              sub.current_period_start * 1000,
            ).toISOString(),
            current_period_end: new Date(
              sub.current_period_end * 1000,
            ).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: true })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }

      default:
        break;
    }

    return jsonResponse({ received: true });
  } catch (error: unknown) {
    console.error("stripe-webhook processing error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
