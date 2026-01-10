import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  inviteId: string;
  groupName: string;
  inviterName: string;
  inviteeEmail: string;
  role: string;
}

async function sendEmailWithResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "PantryOS <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return res.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { inviteId, groupName, inviterName, inviteeEmail, role }: InviteEmailRequest = await req.json();

    if (!inviteId || !groupName || !inviteeEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://pantryos.lovable.app";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f5;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">🏠 PantryOS</h1>
          </div>
          
          <h2 style="color: #18181b; margin-bottom: 10px;">Sei stato invitato!</h2>
          <p style="color: #71717a; line-height: 1.6;">
            <strong>${inviterName}</strong> ti ha invitato a unirti al gruppo <strong>"${groupName}"</strong> come <strong>${role}</strong>.
          </p>
          
          <p style="color: #71717a; line-height: 1.6;">
            Con PantryOS puoi gestire la dispensa di casa insieme alla tua famiglia, tenere traccia dei prodotti e ricevere notifiche quando qualcosa sta per finire.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accedi a PantryOS
            </a>
          </div>
          
          <p style="color: #a1a1aa; font-size: 14px; text-align: center;">
            Accedi con questa email (${inviteeEmail}) per vedere l'invito.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
          
          <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
            Se non hai richiesto questo invito, puoi ignorare questa email.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmailWithResend(
      inviteeEmail,
      `${inviterName} ti ha invitato a unirsi a "${groupName}" su PantryOS`,
      emailHtml
    );

    console.log("Email sent successfully:", emailResponse);

    // Update invite with inviter username
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient
      .from("group_invites")
      .update({ invited_by_username: inviterName })
      .eq("id", inviteId);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
