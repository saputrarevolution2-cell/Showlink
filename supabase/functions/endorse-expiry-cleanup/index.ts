import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-secret" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const secret = Deno.env.get("ENDORSE_CLEANUP_SECRET");
  if (!secret || req.headers.get("x-cleanup-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ error: "Missing server configuration" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase.from("showlink_endorse_requests")
    .select("id,image_url,payment_proof_url,status,expires_at")
    .eq("status", "approved").not("expires_at", "is", null).lte("expires_at", new Date().toISOString()).limit(100);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  const toRemove = new Map<string, Set<string>>();
  for (const row of rows ?? []) {
    for (const fileUrl of [row.image_url, row.payment_proof_url]) {
      if (!fileUrl) continue;
      try {
        const parsed = new URL(fileUrl);
        const marker = "/storage/v1/object/public/showlink-endorsements/";
        const idx = parsed.pathname.indexOf(marker);
        if (idx < 0) continue;
        const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length));
        if (!path || path.includes("..")) continue;
        if (!toRemove.has("showlink-endorsements")) toRemove.set("showlink-endorsements", new Set());
        toRemove.get("showlink-endorsements")!.add(path);
      } catch { /* Ignore malformed URLs; record remains for retry/manual review. */ }
    }
  }
  const failed = new Set<string>();
  for (const [bucket, paths] of toRemove) {
    if (paths.size) {
      const { error: storageError } = await supabase.storage.from(bucket).remove([...paths]);
      if (storageError) for (const p of paths) failed.add(p);
    }
  }
  const deleted: string[] = [];
  const skipped: string[] = [];
  for (const row of rows ?? []) {
    const paths = [row.image_url, row.payment_proof_url].filter(Boolean).map((u) => {
      try {
        const parsed = new URL(u!); const marker = "/storage/v1/object/public/showlink-endorsements/";
        const idx = parsed.pathname.indexOf(marker);
        return idx < 0 ? "" : decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      } catch { return ""; }
    }).filter(Boolean);
    if (paths.some((p) => failed.has(p))) { skipped.push(row.id); continue; }
    const { error: deleteError } = await supabase.from("showlink_endorse_requests").delete().eq("id", row.id);
    if (deleteError) skipped.push(row.id); else deleted.push(row.id);
  }
  return new Response(JSON.stringify({ ok: true, scanned: rows?.length ?? 0, deleted: deleted.length, skipped }), { headers: { ...cors, "Content-Type": "application/json" } });
});
