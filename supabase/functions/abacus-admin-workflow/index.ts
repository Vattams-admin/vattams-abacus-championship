import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const allowedOrigins = (Deno.env.get("ABACUS_ALLOWED_ORIGINS") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!allowedOrigins.includes(origin)) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, allowedOrigins[0] ?? "null");
  if (!origin || !allowedOrigins.includes(origin)) return json({ error: "Origin not allowed" }, 403, "null");

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server configuration unavailable" }, 500, origin);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user || !user.email_confirmed_at) {
    return json({ error: "A verified signed-in account is required" }, 401, origin);
  }

  // Authorization is read from the private staff_roles table, never user_metadata or request JSON.
  const { data: role, error: roleError } = await serviceClient.rpc(
    "abacus_get_active_staff_role",
    { p_user_id: user.id },
  );

  if (roleError) return json({ error: "Unable to verify staff authorization" }, 500, origin);
  if (!role || !["super_admin", "competition_admin", "reviewer"].includes(role)) {
    return json({ error: "Staff authorization required" }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const action = body.action;
  if (action === "save_configuration") {
    if (!["super_admin", "competition_admin"].includes(role)) {
      return json({ error: "Competition administrator permission required" }, 403, origin);
    }
    const config = body.config;
    const competitionId = body.competition_id ?? null;
    if (!config || typeof config !== "object" || Array.isArray(config) ||
        (competitionId !== null && typeof competitionId !== "string")) {
      return json({ error: "Invalid competition configuration payload" }, 400, origin);
    }
    const { data, error } = await serviceClient.schema("abacus").rpc(
      "admin_save_competition_configuration",
      { p_competition_id: competitionId, p_actor_user_id: user.id, p_config: config },
    );
    if (error) return json({ error: error.message }, 422, origin);
    return json({ ok: true, result: data }, 200, origin);
  }

  if (action === "review_registration") {
    if (!["super_admin", "competition_admin", "reviewer"].includes(role.role)) {
      return json({ error: "Eligibility reviewer permission required" }, 403, origin);
    }
    const registrationId = body.registration_id;
    const decision = body.decision;
    const note = body.note;
    if (typeof registrationId !== "string" ||
        !["approved", "rejected", "needs_information"].includes(String(decision)) ||
        (note !== undefined && typeof note !== "string")) {
      return json({ error: "Invalid eligibility review payload" }, 400, origin);
    }
    const { data, error } = await serviceClient.schema("abacus").rpc(
      "admin_review_registration",
      {
        p_registration_id: registrationId,
        p_actor_user_id: user.id,
        p_decision: decision,
        p_note: typeof note === "string" ? note.slice(0, 1000) : null,
      },
    );
    if (error) return json({ error: error.message }, 422, origin);
    return json({ ok: true, result: data }, 200, origin);
  }

  return json({ error: "Unsupported action" }, 400, origin);
});
