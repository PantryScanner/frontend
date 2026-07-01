import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// auth.users non e' esposto via API di default: questa funzione (service role)
// unisce auth.admin.listUsers() con profiles/subscriptions/plans per l'admin panel.
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

    const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden: admin access required" }, 403);
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const perPage = Number(url.searchParams.get("per_page") ?? "50");
    const search = url.searchParams.get("search")?.toLowerCase().trim() ?? "";

    const { data: usersPage, error: listError } =
      await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;

    let authUsers = usersPage.users;
    if (search) {
      authUsers = authUsers.filter((u) =>
        (u.email ?? "").toLowerCase().includes(search),
      );
    }
    authUsers = authUsers.slice(0, perPage);

    const userIds = authUsers.map((u) => u.id);

    const [{ data: profiles }, { data: subscriptions }, { data: admins }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds),
        supabase
          .from("subscriptions")
          .select("user_id, status, provider, current_period_end, plans(id, key, name, tier)")
          .in("user_id", userIds),
        supabase.from("admin_users").select("user_id").in("user_id", userIds),
      ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const subMap = new Map((subscriptions ?? []).map((s) => [s.user_id, s]));
    const adminSet = new Set((admins ?? []).map((a) => a.user_id));

    const result = authUsers.map((u) => ({
      id: u.id,
      email: u.email,
      username: profileMap.get(u.id)?.username ?? null,
      is_admin: adminSet.has(u.id),
      subscription: subMap.get(u.id) ?? null,
      created_at: u.created_at,
    }));

    return jsonResponse({ users: result });
  } catch (error: unknown) {
    console.error("admin-list-users error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
