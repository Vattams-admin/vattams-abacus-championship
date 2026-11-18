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
    const intentId = typeof body.intent_id === "string" ? body.intent_id : "";
    const displayName = typeof body.student_display_name === "string" ? body.student_display_name.trim() : "";
    const dob = typeof body.date_of_birth === "string" ? body.date_of_birth : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intentId)) return reply({ error: "Invalid consent request reference" }, 400);
    if (body.consent_accepted !== true) return reply({ error: "Guardian must explicitly accept the consent statement" }, 400);
    if (displayName.length < 2 || displayName.length > 120) return reply({ error: "Enter a valid participant name" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob + "T00:00:00Z")) || new Date(dob + "T00:00:00Z").toISOString().slice(0, 10) !== dob) return reply({ error: "Enter date of birth in YYYY-MM-DD format" }, 400);
    const { data, error } = await admin.rpc("abacus_confirm_guardian_registration", {
      p_intent_id: intentId,
      p_guardian_user_id: user.id,
      p_guardian_email: user.email!.toLowerCase(),
      p_student_display_name: displayName,
      p_date_of_birth: dob,
    });
    if (error) return reply({ error: error.message }, error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400);
    return reply({ ...data, message: "Guardian consent recorded. Registration is submitted for eligibility review; this does not grant exam access." }, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be processed";
    return reply({ error: message }, message === "Authentication required" || message.includes("verified email") ? 401 : 400, origin);
  }
});
