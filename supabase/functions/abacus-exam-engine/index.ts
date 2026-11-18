import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ABACUS_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
const headers = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
function reply(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return allowedOrigins.includes(origin) ? new Response("ok", { headers: headers(origin) }) : new Response("Origin not allowed", { status: 403 });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405, "null");
  if (!origin || !allowedOrigins.includes(origin)) return reply({ error: "Origin not allowed" }, 403, "null");
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Authentication required" }, 401, origin);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Server configuration unavailable" }, 500, origin);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return reply({ error: "A verified signed-in participant account is required" }, 401, origin);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON body" }, 400, origin); }
  const userId = data.user.id, action = body.action;
  let rpcName: string, rpcArgs: Record<string, unknown>;
  if (action === "list_my_competitions") {
    rpcName = "participant_list_my_competitions";
    rpcArgs = { p_user_id: userId };
  } else if (action === "start_or_resume") {
    if (typeof body.competition_id !== "string") return reply({ error: "Competition ID is required" }, 400, origin);
    rpcName = "exam_start_or_resume"; rpcArgs = { p_user_id: userId, p_competition_id: body.competition_id };
  } else if (action === "save_response") {
    if (typeof body.attempt_id !== "string" || typeof body.question_id !== "string" || typeof body.response_version !== "number" || !Number.isSafeInteger(body.response_version) || body.response_version < 1 || !Object.prototype.hasOwnProperty.call(body, "response")) return reply({ error: "Invalid response payload" }, 400, origin);
    if (JSON.stringify(body.response).length > 12000) return reply({ error: "Response is too large" }, 413, origin);
    rpcName = "exam_save_response";
    rpcArgs = { p_user_id: userId, p_attempt_id: body.attempt_id, p_question_id: body.question_id, p_response: body.response, p_response_version: body.response_version, p_client_saved_at: typeof body.client_saved_at === "string" ? body.client_saved_at : null };
  } else if (action === "submit") {
    if (typeof body.attempt_id !== "string") return reply({ error: "Attempt ID is required" }, 400, origin);
    rpcName = "exam_submit_and_score"; rpcArgs = { p_user_id: userId, p_attempt_id: body.attempt_id };
  } else return reply({ error: "Unsupported action" }, 400, origin);
  const { data: result, error: rpcError } = await adminClient.schema("abacus").rpc(rpcName, rpcArgs);
  if (rpcError) {
    const status = rpcError.code === "42501" ? 403 : rpcError.code === "P0002" ? 404 : rpcError.code === "55000" ? 409 : 422;
    return reply({ error: rpcError.message }, status, origin);
  }
  return reply({ ok: true, result }, 200, origin);
});
