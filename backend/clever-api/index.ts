// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const publishableKey = publishableKeys?.default;
    const secretKey = secretKeys?.default;
    if (!publishableKey || !secretKey) throw new Error("Supabase API keys are not configured");

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid authentication" }, 401);

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: appUser, error: userError } = await adminClient
      .from("users")
      .select("id,role,is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (userError) throw userError;
    if (!appUser || !appUser.is_active) return json({ error: "Application user not found or inactive" }, 403);

    const body = await req.json();
    const action = body?.action;

    if (action === "health") return json({ ok: true, user_id: appUser.id, role: appUser.role });

    if (action === "issue_delivery_otp") {
      const orderId = body?.order_id;
      if (typeof orderId !== "string") return json({ error: "order_id is required" }, 400);

      const { data: order, error: orderError } = await adminClient
        .from("orders").select("id,customer_id").eq("id", orderId).maybeSingle();
      if (orderError) throw orderError;
      if (!order) return json({ error: "Order not found" }, 404);

      let allowed = ["dispatcher", "owner_admin"].includes(appUser.role);
      if (!allowed && appUser.role === "customer") {
        const { data: customer } = await adminClient.from("customers").select("id").eq("user_id", appUser.id).maybeSingle();
        allowed = customer?.id === order.customer_id;
      }
      if (!allowed && appUser.role === "rider") {
        const { data: rider } = await adminClient.from("riders").select("id").eq("user_id", appUser.id).maybeSingle();
        if (rider) {
          const [{ data: khat }, { data: eeu }] = await Promise.all([
            adminClient.from("khat_orders").select("rider_id").eq("order_id", orderId).maybeSingle(),
            adminClient.from("eeu_orders").select("rider_id").eq("order_id", orderId).maybeSingle(),
          ]);
          allowed = khat?.rider_id === rider.id || eeu?.rider_id === rider.id;
        }
      }
      if (!allowed) return json({ error: "Not authorized for this order" }, 403);

      const { data: otp, error: otpError } = await adminClient.rpc("issue_delivery_otp", { p_order_id: orderId });
      if (otpError) throw otpError;
      return json({ ok: true, order_id: orderId, code: otp });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
