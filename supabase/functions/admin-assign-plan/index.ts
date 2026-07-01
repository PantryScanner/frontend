import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-cli-key",
};

interface AssignRequest {
  target_user_id: string;
  plan_id: string;
  expires_at?: string | null;
  billing_interval?: "monthly" | "yearly";
  mode: "manual" | "simulate";
}

function addInterval(date: Date, interval: "monthly" | "yearly"): Date {
  const result = new Date(date);
  if (interval === "yearly") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Auth: JWT admin OR X-Admin-Cli-Key secret (per uso da script/CLI)
    const adminCliKey = req.headers.get("X-Admin-Cli-Key");
    const expectedCliKey = Deno.env.get("ADMIN_CLI_SECRET");
    let callerId: string | null = null;

    if (adminCliKey && expectedCliKey && adminCliKey === expectedCliKey) {
      // Bypass CLI autorizzato via secret
      callerId = "cli";
    } else {
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

      const { data: isAdmin } = await supabase.rpc("is_admin", {
        uid: user.id,
      });

      if (!isAdmin) {
        return jsonResponse({ error: "Forbidden: admin access required" }, 403);
      }
      callerId = user.id;
    }

    // 2. Parse & validate body
    const body: AssignRequest = await req.json();
    const { target_user_id, plan_id, mode, billing_interval = "monthly" } = body;
    let { expires_at } = body;

    if (!target_user_id || !plan_id) {
      return jsonResponse(
        { error: "target_user_id e plan_id sono obbligatori" },
        400,
      );
    }
    if (!["manual", "simulate"].includes(mode)) {
      return jsonResponse({ error: 'mode deve essere "manual" o "simulate"' }, 400);
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("id", plan_id)
      .maybeSingle();

    if (planError || !plan) {
      return jsonResponse({ error: "Piano non trovato" }, 404);
    }

    const now = new Date();
    if (mode === "simulate" && !expires_at) {
      expires_at = addInterval(now, billing_interval).toISOString();
    }

    // 3. Upsert subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: target_user_id,
          plan_id,
          status: "active",
          provider: "manual",
          billing_interval,
          current_period_start: now.toISOString(),
          current_period_end: expires_at ?? null,
          cancel_at_period_end: false,
          assigned_by: callerId !== "cli" ? callerId : null,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (subError) throw subError;

    // 4. Audit log
    await supabase.from("payment_events").insert({
      user_id: target_user_id,
      subscription_id: subscription.id,
      source: mode === "simulate" ? "admin_simulate" : "admin_manual",
      event_type: mode === "simulate" ? "simulated_payment" : "manual_assignment",
      payload: { plan_id, expires_at, billing_interval, assigned_by: callerId },
    });

    return jsonResponse({ success: true, subscription_id: subscription.id });
  } catch (error: unknown) {
    console.error("admin-assign-plan error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
