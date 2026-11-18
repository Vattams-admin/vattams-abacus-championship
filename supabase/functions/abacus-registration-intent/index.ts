import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function getAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server configuration is incomplete");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function verifiedUser(req: Request, admin: ReturnType<typeof getAdmin>) {
  const match = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Authentication required");
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user?.email || !data.user.email_confirmed_at) throw new Error("A verified email sign-in is required");
  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const admin = getAdmin();
    const user = await verifiedUser(req, admin);
    const body = await req.json();
    const competitionSlug = typeof body.competition_slug === "string" ? body.competition_slug.trim() : "";
    const displayName = typeof body.student_display_name === "string" ? body.student_display_name.trim() : "";
    const dob = typeof body.date_of_birth === "string" ? body.date_of_birth : "";
    const guardianEmail = typeof body.guardian_email === "string" ? body.guardian_email.trim().toLowerCase() : "";
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(competitionSlug)) return reply({ error: "Invalid competition" }, 400);
    if (displayName.length < 2 || displayName.length > 120) return reply({ error: "Enter a valid participant name" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob + "T00:00:00Z")) || new Date(dob + "T00:00:00Z").toISOString().slice(0, 10) !== dob) return reply({ error: "Enter date of birth in YYYY-MM-DD format" }, 400);
    if (guardianEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) return reply({ error: "Enter a valid guardian email address" }, 400);
    if (guardianEmail === user.email.toLowerCase()) return reply({ error: "A separate guardian account is required for this consent workflow" }, 400);
    const { data, error } = await admin.rpc("abacus_create_registration_intent", {
      p_competition_slug: competitionSlug, p_student_user_id: user.id,
      p_student_display_name: displayName, p_date_of_birth: dob, p_guardian_email: guardianEmail,
    });
    if (error) return reply({ error: error.message }, error.code === "23505" ? 409 : 400);
    return reply({ ...data, message: "Share the request ID with the named guardian. The guardian must sign in with that exact email and confirm consent before a registration is created." }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be processed";
    return reply({ error: message }, message === "Authentication required" || message.includes("verified email") ? 401 : 400);
  }
});
