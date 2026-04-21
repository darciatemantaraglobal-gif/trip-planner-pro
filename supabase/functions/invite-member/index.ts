// Edge Function: invite-member
// Owner invites staff. Buat auth user + tambah agency_members row.
//
// POST /functions/v1/invite-member
// Headers: Authorization: Bearer <user-jwt>
// Body: { email: string, password: string, displayName?: string, role?: 'staff'|'owner' }
//
// Deploy: supabase functions deploy invite-member

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization" }, 401);

    // Identify caller
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Cek caller adalah owner di agency-nya
    const { data: callerMembership, error: memberErr } = await admin
      .from("agency_members").select("agency_id, role").eq("user_id", callerId).maybeSingle();
    if (memberErr || !callerMembership) return jsonResponse({ error: "Tidak terdaftar di agency manapun" }, 403);
    if (callerMembership.role !== "owner") return jsonResponse({ error: "Hanya owner yang bisa invite" }, 403);

    const body = await req.json();
    const { email, password, displayName } = body;
    const role = body.role === "owner" ? "owner" : "staff";

    if (!email || !password) return jsonResponse({ error: "email & password required" }, 400);
    if (typeof password !== "string" || password.length < 8) {
      return jsonResponse({ error: "Password minimal 8 karakter" }, 400);
    }

    // Buat user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName ?? email.split("@")[0] },
    });
    if (createErr || !created.user) return jsonResponse({ error: createErr?.message ?? "Gagal buat user" }, 500);

    const newUserId = created.user.id;

    // Tambah membership
    const { error: addErr } = await admin.from("agency_members").insert({
      agency_id: callerMembership.agency_id, user_id: newUserId, role,
    });
    if (addErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: addErr.message }, 500);
    }

    return jsonResponse({ ok: true, userId: newUserId, email, role });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
