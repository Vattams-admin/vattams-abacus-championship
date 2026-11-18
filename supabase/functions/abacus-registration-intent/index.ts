import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigins = (Deno.env.get("ABACUS_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function reply(body: unknown, status = 200, origin = "null") {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });
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
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return allowedOrigins.includes(origin)
    ? new Response("ok", { headers: corsHeaders(origin) })
    : new Response("Origin not allowed", { status: 403 });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!origin || !allowedOrigins.includes(origin)) return reply({ error: "Origin not allowed" }, 403);
  try {
    const admin = getAdmin();
    const user = await verifiedUser(req, admin);
    const body = await req.json();
    const competitionSlug = typeof body.competition_slug === "string" ? body.competition_slug.trim() : "";
    const guardianEmail = typeof body.guardian_email === "string" ? body.guardian_email.trim().toLowerCase() : "";
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(competitionSlug)) return reply({ error: "Invalid competition" }, 400, origin);
    if (guardianEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) return reply({ error: "Enter a valid guardian email address" }, 400, origin);
    if (guardianEmail === user.email.toLowerCase()) return reply({ error: "A separate guardian account is required for this consent workflow" }, 400, origin);
    const { data, error } = await admin.rpc("abacus_create_registration_intent", {
      p_competition_slug: competitionSlug,
      p_student_user_id: user.id,
      p_guardian_email: guardianEmail,
    });
    if (error) return reply({ error: error.message }, error.code === "23505" ? 409 : 400, origin);
    return reply({ ...data, message: "No participant name or date of birth has been collected yet. Share this reference with the named guardian; the guardian will enter the participant details after reviewing the consent statement." }, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be processed";
    return reply({ error: message }, message === "Authentication required" || message.includes("verified email") ? 401 : 400, origin);
  }
});
