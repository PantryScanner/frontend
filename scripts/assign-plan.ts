// CLI di comodo per assegnare/simulare un piano senza passare dall'Admin Panel.
// Uso: bunx tsx scripts/assign-plan.ts <email> <planKey> [expiresAtISO] [--simulate]
// Richiede le env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_CLI_SECRET,
// e che la function admin-assign-plan sia deployata (verify_jwt = false).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_CLI_SECRET = process.env.ADMIN_CLI_SECRET;

async function main() {
  const [email, planKey, expiresAtArg] = process.argv.slice(2);
  const simulate = process.argv.includes("--simulate");

  if (!email || !planKey) {
    console.error(
      "Uso: bunx tsx scripts/assign-plan.ts <email> <planKey> [expiresAtISO] [--simulate]",
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_CLI_SECRET) {
    console.error(
      "Variabili mancanti: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_CLI_SECRET",
    );
    process.exit(1);
  }

  const restHeaders = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const userRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: restHeaders },
  );
  const userData = await userRes.json();
  const targetUser = userData.users?.[0];
  if (!targetUser) {
    console.error(`Utente non trovato per email: ${email}`);
    process.exit(1);
  }

  const planRes = await fetch(
    `${SUPABASE_URL}/rest/v1/plans?key=eq.${planKey}&select=id`,
    { headers: restHeaders },
  );
  const plans = await planRes.json();
  const plan = plans?.[0];
  if (!plan) {
    console.error(`Piano non trovato per key: ${planKey}`);
    process.exit(1);
  }

  const assignRes = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-assign-plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Cli-Key": ADMIN_CLI_SECRET,
      },
      body: JSON.stringify({
        target_user_id: targetUser.id,
        plan_id: plan.id,
        expires_at: expiresAtArg ?? null,
        mode: simulate ? "simulate" : "manual",
      }),
    },
  );

  const result = await assignRes.json();
  if (!assignRes.ok) {
    console.error("Errore:", result.error ?? result);
    process.exit(1);
  }

  console.log(`Piano "${planKey}" assegnato a ${email}.`, result);
}

main();
