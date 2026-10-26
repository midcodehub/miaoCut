// Thin frontend transport only. Auth, asset ownership, orchestration and billing remain in the private gateway.
import type { NextRequest } from "next/server";

const UUID = "[0-9a-fA-F-]{36}";
const READ = new RegExp(`^(capabilities|assets/${UUID}|jobs/${UUID}|groups/${UUID})$`);
const WRITE = new RegExp(`^(assets|assets/${UUID}/confirm|quotes|jobs|jobs/${UUID}/cancel|group-quotes|groups|groups/${UUID}/(cancel|resume))$`);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (process.env.WORKBENCH_INTERNAL_ENABLED !== "1") return fail("internal_disabled", 404);
  const path = (await context.params).path.join("/");
  if (!(request.method === "GET" ? READ : WRITE).test(path) || request.nextUrl.search) return fail("not_found", 404);
  const origin = request.headers.get("Origin");
  // Next can normalize the internal URL hostname to localhost. Compare against the HTTP Host seen by the browser.
  const expectedOrigin = process.env.WORKBENCH_PUBLIC_ORIGIN || `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`;
  if (origin && origin !== expectedOrigin) return fail("origin_rejected", 403);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return fail("login_required", 401);
  let base: URL;
  try { base = new URL(process.env.WORKBENCH_API_URL || "https://pro-api.miaocut.app"); }
  catch { return fail("api_configuration", 503); }
  const local = process.env.NODE_ENV === "development" && ["127.0.0.1", "localhost"].includes(base.hostname);
  if ((base.protocol !== "https:" && !(local && base.protocol === "http:")) || base.username || base.password || base.search || base.hash) return fail("api_configuration", 503);
  let body: Uint8Array | undefined;
  if (request.method === "POST") {
    const reader = request.body?.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
    if (!reader) return fail("json_required", 400);
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.length;
        if (bytes > 65536) { await reader.cancel(); return fail("body_too_large", 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  }
  try {
    const response = await fetch(`${base.href.replace(/\/$/, "")}/comfy/v1/${path}`, {
      method: request.method, headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: body ? new TextDecoder().decode(body) : undefined, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return fail("service_unavailable", 503); }
}
export const GET = forward;
export const POST = forward;
