// HACERLO · Pasarela autenticada para las funciones de IA.
// El navegador invoca Supabase; esta función consulta el motor en Render.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json; charset=utf-8",
};
const ENGINE = "https://hacerlo-engine.onrender.com";
const targets = {
  interpret: "/api/ai/interpret",
  activation: "/api/ai/activation-message",
};
const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readyEngine() {
  const deadline = Date.now() + 69000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    try {
      const res = await fetch(ENGINE + "/api/health", {
        method: "GET",
        signal: AbortSignal.timeout(Math.max(1000, remaining)),
      });
      lastStatus = res.status;
      if (res.ok) {
        const health = await res.json().catch(() => ({}));
        if (health.ai === "not-configured")
          return { error: "El motor está activo, pero no tiene configurado el proveedor de IA en Render.", status: 503 };
        return { ok: true };
      }
      if (![502, 503, 504].includes(res.status)) break;
    } catch (_error) {
      // Render puede tardar en activar una instancia inactiva.
    }
    if (Date.now() + 3500 < deadline) await sleep(3500);
    else break;
  }
  console.error("HACERLO AI gateway: motor no disponible", lastStatus);
  return { error: "El motor de IA no está disponible en este momento. Revisa el estado del servicio de Render.", status: 503 };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { status: 200, headers });
  if (request.method !== "POST") return reply({ detail: "Método no permitido." }, 405);
  const authorization = request.headers.get("authorization") || "";
  const apikey = request.headers.get("apikey") || "";
  if (!authorization.startsWith("Bearer ") || !apikey)
    return reply({ detail: "Inicia sesión de nuevo en HACERLO." }, 401);

  let action, payload;
  try {
    const raw = await request.text();
    if (raw.length > 90000)
      return reply({ detail: "La información enviada supera el límite permitido." }, 413);
    ({ action, payload } = JSON.parse(raw));
    if (!Object.hasOwn(targets, action) || !payload || typeof payload !== "object" || Array.isArray(payload))
      return reply({ detail: "Solicitud de IA no reconocida." }, 400);
  } catch (_error) {
    return reply({ detail: "No se pudo leer la solicitud de IA." }, 400);
  }

  const ready = await readyEngine();
  if (!ready.ok) return reply({ detail: ready.error }, ready.status);

  try {
    const upstream = await fetch(ENGINE + targets[action], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
        "X-Supabase-Apikey": apikey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(70000),
    });
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message = typeof result?.detail === "string"
        ? result.detail.slice(0, 1000)
        : "El servicio de IA devolvió un error (HTTP " + upstream.status + ").";
      console.error("HACERLO AI gateway: error del motor", upstream.status, action);
      return reply({ detail: message }, upstream.status);
    }
    if (!result || typeof result !== "object")
      return reply({ detail: "El motor respondió en un formato no válido." }, 502);
    return reply(result);
  } catch (error) {
    console.error("HACERLO AI gateway: comunicación con motor", String(error?.name || "Error"));
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return reply({
      detail: timedOut
        ? "El motor de IA tardó demasiado en responder. Intenta nuevamente."
        : "No se logró conectar con el motor de IA de Render.",
    }, timedOut ? 504 : 503);
  }
});
