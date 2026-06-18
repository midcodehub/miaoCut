let rrIndex = 0;
let rrSeeded = false;
const circuitByHost = new Map();

export default {
  async fetch(request, env) {
    seedRoundRobin();

    const corsHeaders = buildCorsHeaders(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const config = getConfig(env);
    const cnHosts = parseHosts(env.CN_HOSTS);
    const globalHosts = parseHosts(env.GLOBAL_HOSTS);
    const country = request.cf?.country || "XX";
    const { primaryHosts, backupHosts } = chooseHostGroups(country, cnHosts, globalHosts);
    const orderedHosts = orderHosts(primaryHosts, backupHosts);

    if (orderedHosts.length === 0) {
      return jsonResponse(
        { error: "CONFIGURATION_ERROR", message: "No target hosts configured." },
        500,
        corsHeaders,
      );
    }

    let bodyBuffer = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentLength = Number(request.headers.get("content-length") || "0");
      if (contentLength > config.maxBodyBufferBytes) {
        return jsonResponse(
          {
            error: "REQUEST_TOO_LARGE",
            message: `Request body exceeds ${config.maxBodyBufferBytes} bytes.`,
          },
          413,
          corsHeaders,
        );
      }
      bodyBuffer = await request.arrayBuffer();
    }

    const upstreamHeaders = buildUpstreamHeaders(request);
    const result = await proxyWithFailover({
      request,
      env,
      country,
      hosts: orderedHosts,
      bodyBuffer,
      upstreamHeaders,
      config,
    });

    if (result.response) {
      const headers = new Headers(result.response.headers);
      applyCors(headers, corsHeaders);
      headers.set("X-Upstream-Node", result.host);
      headers.set("X-Upstream-Latency-Ms", String(result.latencyMs));
      headers.set("X-Upstream-Attempts", String(result.attempts));

      return new Response(result.response.body, {
        status: result.response.status,
        statusText: result.response.statusText,
        headers,
      });
    }

    return jsonResponse(
      {
        error: "UPSTREAM_UNAVAILABLE",
        message: "All upstream nodes are unavailable, overloaded, or timed out.",
        attempts: result.attempts,
        lastFailure: result.lastFailure,
      },
      502,
      corsHeaders,
    );
  },
};

function seedRoundRobin() {
  if (rrSeeded) return;
  rrSeeded = true;
  rrIndex = crypto.getRandomValues(new Uint32Array(1))[0];
}

async function proxyWithFailover(args) {
  const { request, country, hosts, config } = args;
  const rankedHosts = rankHostsByCircuit(hosts);
  const deadline = Date.now() + config.totalTimeoutMs;
  const active = new Map();
  let nextIndex = 0;
  let attempts = 0;
  let lastFailure = null;
  let lastLaunchAt = 0;

  const canHedge =
    config.enableHedging &&
    config.hedgeDelayMs > 0 &&
    config.maxParallelRequests > 1 &&
    (config.hedgeUnsafeMethods || isSafeMethod(request.method));
  const maxParallel = canHedge ? Math.min(config.maxParallelRequests, rankedHosts.length) : 1;

  const launchNext = () => {
    if (nextIndex >= rankedHosts.length || active.size >= maxParallel) return false;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return false;

    const host = rankedHosts[nextIndex++];
    const controller = new AbortController();
    const timeoutMs = Math.min(config.perHostTimeoutMs, remainingMs);
    attempts += 1;
    lastLaunchAt = Date.now();

    let promise;
    promise = fetchOneHost({ ...args, host, timeoutMs, controller }).then((result) => ({
      promise,
      result,
    }));
    active.set(promise, controller);
    return true;
  };

  launchNext();

  while (active.size > 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      abortActive(active, "total_timeout");
      lastFailure = { reason: "total_timeout" };
      break;
    }

    const canLaunchMore = nextIndex < rankedHosts.length && active.size < maxParallel;
    const waitForNextLaunch = canLaunchMore
      ? Math.max(0, config.hedgeDelayMs - (Date.now() - lastLaunchAt))
      : Infinity;

    const races = [Promise.race(active.keys())];
    if (canLaunchMore) {
      races.push(sleep(Math.min(waitForNextLaunch, remainingMs)).then(() => ({ timer: true })));
    }

    const event = await Promise.race(races);

    if (event.timer) {
      launchNext();
      continue;
    }

    active.delete(event.promise);
    const result = event.result;

    if (result.ok) {
      recordHostSuccess(result.host);
      abortActive(active, "winner_selected");
      console.log(
        `[${country}] ${result.host} ok ${result.status} in ${result.latencyMs}ms, attempts=${attempts}`,
      );
      return { ...result, attempts };
    }

    lastFailure = sanitizeFailure(result);
    recordHostFailure(result.host, result.reason, config);
    console.warn(
      `[${country}] ${result.host} failed: ${result.reason}, status=${result.status || 0}, latency=${result.latencyMs}ms`,
    );

    if (active.size === 0) launchNext();
  }

  return { response: null, attempts, lastFailure };
}

async function fetchOneHost({
  request,
  host,
  bodyBuffer,
  upstreamHeaders,
  config,
  timeoutMs,
  controller,
}) {
  const startedAt = Date.now();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = host;

    const init = {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "manual",
    };
    if (bodyBuffer !== null) init.body = bodyBuffer;

    const proxyRequest = new Request(url.toString(), init);
    const response = await fetch(proxyRequest, { signal: controller.signal });
    const latencyMs = Date.now() - startedAt;

    if (config.failoverStatuses.has(response.status)) {
      await cancelBody(response);
      return {
        ok: false,
        host,
        status: response.status,
        reason: `status_${response.status}`,
        latencyMs,
      };
    }

    return {
      ok: true,
      host,
      status: response.status,
      response,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const reason =
      controller.signal.aborted && controller.signal.reason === "timeout"
        ? "timeout"
        : err?.message || err?.name || "fetch_error";
    return { ok: false, host, status: 0, reason, latencyMs };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getConfig(env) {
  return {
    perHostTimeoutMs: readInt(env.PER_HOST_TIMEOUT_MS, 35_000, 1_000, 110_000),
    totalTimeoutMs: readInt(env.TOTAL_TIMEOUT_MS, 58_000, 1_000, 115_000),
    hedgeDelayMs: readInt(env.HEDGE_DELAY_MS, 12_000, 0, 60_000),
    maxParallelRequests: readInt(env.MAX_PARALLEL_REQUESTS, 2, 1, 5),
    enableHedging: env.ENABLE_HEDGING !== "false",
    hedgeUnsafeMethods: env.HEDGE_UNSAFE_METHODS !== "false",
    circuitBaseCooldownMs: readInt(env.CIRCUIT_BASE_COOLDOWN_MS, 20_000, 1_000, 600_000),
    circuitMaxCooldownMs: readInt(env.CIRCUIT_MAX_COOLDOWN_MS, 120_000, 1_000, 900_000),
    maxBodyBufferBytes: readInt(env.MAX_BODY_BUFFER_BYTES, 64 * 1024 * 1024, 1, 100 * 1024 * 1024),
    failoverStatuses: parseStatusSet(
      env.FAILOVER_STATUS_CODES || "429,500,502,503,504,520,521,522,523,524",
    ),
  };
}

function parseHosts(raw) {
  const seen = new Set();
  const hosts = [];
  for (const item of String(raw || "").split(",")) {
    const host = normalizeHost(item);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    hosts.push(host);
  }
  return hosts;
}

function normalizeHost(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      return url.host;
    } catch {
      return "";
    }
  }
  return text.replace(/^\/+/, "").split("/")[0].trim();
}

function chooseHostGroups(country, cnHosts, globalHosts) {
  if (country === "CN") {
    if (cnHosts.length > 0) return { primaryHosts: cnHosts, backupHosts: globalHosts };
    return { primaryHosts: globalHosts, backupHosts: [] };
  }

  if (globalHosts.length > 0) return { primaryHosts: globalHosts, backupHosts: cnHosts };
  return { primaryHosts: cnHosts, backupHosts: [] };
}

function orderHosts(primaryHosts, backupHosts) {
  const ordered = [];
  const pushUnique = (host) => {
    if (host && !ordered.includes(host)) ordered.push(host);
  };

  if (primaryHosts.length > 0) {
    const start = rrIndex % primaryHosts.length;
    rrIndex = (rrIndex + 1) >>> 0;
    for (let i = 0; i < primaryHosts.length; i += 1) {
      pushUnique(primaryHosts[(start + i) % primaryHosts.length]);
    }
  }

  if (backupHosts.length > 0) {
    const start = rrIndex % backupHosts.length;
    for (let i = 0; i < backupHosts.length; i += 1) {
      pushUnique(backupHosts[(start + i) % backupHosts.length]);
    }
  }

  return ordered;
}

function rankHostsByCircuit(hosts) {
  const now = Date.now();
  const available = [];
  const coolingDown = [];

  for (const host of hosts) {
    const state = circuitByHost.get(host);
    if (state && state.cooldownUntil > now) {
      coolingDown.push(host);
    } else {
      available.push(host);
    }
  }

  return available.length > 0 ? [...available, ...coolingDown] : hosts;
}

function recordHostSuccess(host) {
  circuitByHost.delete(host);
}

function recordHostFailure(host, reason, config) {
  const previous = circuitByHost.get(host);
  const failures = (previous?.failures || 0) + 1;
  const backoffFactor = Math.min(failures - 1, 6);
  const cooldownMs = Math.min(
    config.circuitMaxCooldownMs,
    config.circuitBaseCooldownMs * 2 ** backoffFactor,
  );

  circuitByHost.set(host, {
    failures,
    reason,
    cooldownUntil: Date.now() + cooldownMs,
  });
}

function buildUpstreamHeaders(request) {
  const headers = new Headers(request.headers);
  const incomingXff = headers.get("X-Forwarded-For");
  const cfConnectingIp = headers.get("CF-Connecting-IP");

  for (const name of [
    "host",
    "content-length",
    "connection",
    "keep-alive",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
    "x-real-ip",
  ]) {
    headers.delete(name);
  }

  const forwardedFor = [incomingXff, cfConnectingIp].filter(Boolean).join(", ");
  if (forwardedFor) headers.set("X-Forwarded-For", forwardedFor);

  const url = new URL(request.url);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");
  return headers;
}

function buildCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": env.CORS_ALLOW_METHODS || "GET,POST,OPTIONS,PUT,DELETE",
    "Access-Control-Allow-Headers": env.CORS_ALLOW_HEADERS || "*",
    "Access-Control-Max-Age": env.CORS_MAX_AGE || "86400",
  };
}

function applyCors(headers, corsHeaders) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseStatusSet(value) {
  return new Set(
    String(value)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((code) => Number.isInteger(code) && code >= 400 && code <= 599),
  );
}

function readInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function isSafeMethod(method) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abortActive(active, reason) {
  for (const controller of active.values()) {
    controller.abort(reason);
  }
  active.clear();
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Ignore cancellation failures.
  }
}

function sanitizeFailure(result) {
  if (!result) return null;
  return {
    host: result.host,
    status: result.status || 0,
    reason: result.reason,
    latencyMs: result.latencyMs,
  };
}
