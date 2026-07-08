/**
 * Saju "Read my chart" proxy (Cloudflare Worker).
 *
 * The web app is a static site, so it can't safely hold the Anthropic API key or the reading
 * instructions. This little Worker sits in between: the browser POSTs the computed chart here, the
 * Worker adds the secret key + the reading spec, calls Claude, and streams the reading back as
 * plain text. The browser appends the text as it arrives.
 *
 * Before doing any of that, the Worker checks who is asking. The browser sends a signed-in session
 * token (from Clerk). The Worker verifies it, looks the person up in a little usage table (D1), and
 * only proceeds if they still have free readings or paid credits left. Each successful reading ticks
 * their count up, so nobody can quietly burn through more than their allowance.
 *
 * Secrets / config (set with wrangler, NOT committed):
 *   ANTHROPIC_API_KEY   — required. `wrangler secret put ANTHROPIC_API_KEY`
 *   CLERK_SECRET_KEY    — required. `wrangler secret put CLERK_SECRET_KEY`
 *   MODEL               — optional override. Defaults to a current Claude Opus.
 *   FREE_LIMIT          — optional override for the number of free readings. Defaults to 5.
 * Bindings (in wrangler.toml):
 *   DB                  — D1 database holding the per-user usage table.
 */

import { verifyToken, createClerkClient } from "@clerk/backend";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-8";
const DEFAULT_FREE_LIMIT = 5;

// Origins allowed to call this Worker. Add your custom domain here if you get one.
const ALLOWED_ORIGINS = [
  "https://world-of-simone.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/**
 * The reading spec — the "brain" of the reading. This is the system prompt that tells Claude how to
 * interpret the chart in Master Kim's method.
 *
 * ⚠️ INTERIM VERSION. This enforces the framing and tone, but it is NOT yet Master Kim's full
 * interpretive method (the "v6 spec"). Replace the body below with her instructions to make the
 * reading truly hers.
 */
const READING_SPEC = `You are writing a Saju (사주, Korean Four Pillars) reading. The chart has already been
calculated for you and is given by the user. Treat every fact in it — the pillars, stems, branches,
hidden stems, Ten Gods (십성), Five Elements (오행) counts, spirit-stars (신살), and luck pillars
(대운) — as authoritative. Do NOT recompute, correct, or second-guess any of it. Your job is
interpretation, not calculation.

Method and stance:
- This is the Korean Saju tradition, not Chinese BaZi. Use Korean terms with the hanja, and give a
  short plain-English gloss the first time each term appears. Never use pinyin.
- You are a mirror and a reference, never a verdict. Saju is an interpretive art for contemplating
  life — not deterministic prediction, not a fixed judgment of who someone is or what will happen.
  Never make absolute claims about the future. Frame insights as tendencies, invitations, and
  things to try on and test against their own life.
- Teach as you go. The reader is likely new to Saju. Briefly explain what a feature is before you
  say what it might mean, so they learn the system, not just the conclusion.
- Warm, grounded, and specific. Not flattering, not doom-laden, not vague horoscope-speak. Ground
  each observation in a specific feature of THIS chart (name the pillar or element you're reading
  from).
- Empower the reader. Leave them feeling more like the author of their own life, not less. If
  something in the chart is challenging, frame it as material to work with, never as a sentence.

Structure the reading with clear sections (e.g. the Day Master and core self, the balance of the
five elements, notable Ten Gods and spirit-stars, and how the luck pillars color different seasons
of life). Close with a grounded, encouraging note that hands agency back to the reader.

If a birth time was unknown, the hour pillar is absent — say so plainly and read only what the rest
of the chart supports.`;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "X-Readings-Remaining",
    "Vary": "Origin",
  };
}

/**
 * Look the signed-in person up in the usage table, creating their row on first sight. On the very
 * first insert we fetch their email from Clerk so you have it on record. Returns the current row.
 */
async function getOrCreateUser(env, userId) {
  const existing = await env.DB.prepare(
    "SELECT id, email, free_used, paid_credits FROM users WHERE id = ?",
  )
    .bind(userId)
    .first();
  if (existing) return existing;

  // First time we've seen this person — grab their email for your records.
  let email = null;
  try {
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    email =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null;
  } catch {
    // Non-fatal: we can still meter usage without the email on file.
  }

  await env.DB.prepare(
    "INSERT INTO users (id, email, free_used, paid_credits) VALUES (?, ?, 0, 0)",
  )
    .bind(userId, email)
    .run();

  return { id: userId, email, free_used: 0, paid_credits: 0 };
}

/** Turn Anthropic's SSE stream into a plain-text stream of just the words. */
function anthropicTextStream(upstreamBody) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Pump in the background; the runtime keeps the request alive while the
  // response body is still open, so this drains fully.
  (async () => {
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          for (const line of evt.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
                await writer.write(encoder.encode(obj.delta.text));
              }
            } catch {
              // ignore keep-alives / partial lines
            }
          }
        }
      }
    } catch {
      // upstream broke mid-stream; fall through and close what we have
    } finally {
      try {
        await writer.close();
      } catch {
        /* already closed */
      }
    }
  })();

  return readable;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }
    if (!env.ANTHROPIC_API_KEY || !env.CLERK_SECRET_KEY || !env.DB) {
      return new Response("Server not configured", { status: 500, headers: cors });
    }

    // Who is asking? The browser sends the signed-in session token as a Bearer token.
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return new Response("Please sign in first.", { status: 401, headers: cors });
    }

    let userId;
    try {
      const claims = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
        authorizedParties: ALLOWED_ORIGINS,
      });
      userId = claims.sub;
    } catch {
      return new Response("Your sign-in has expired. Please sign in again.", {
        status: 401,
        headers: cors,
      });
    }
    if (!userId) {
      return new Response("Please sign in first.", { status: 401, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: cors });
    }

    const chart = String(body?.chart ?? "").trim();
    const lang = body?.lang === "ko" ? "ko" : "en";
    if (!chart) {
      return new Response("Missing chart", { status: 400, headers: cors });
    }

    // How many readings does this person have left?
    const freeLimit = Number(env.FREE_LIMIT) || DEFAULT_FREE_LIMIT;
    const user = await getOrCreateUser(env, userId);
    const freeLeft = Math.max(0, freeLimit - user.free_used);
    const paidLeft = Math.max(0, user.paid_credits);
    if (freeLeft <= 0 && paidLeft <= 0) {
      return new Response(
        "You've used all of your readings. Add credits to read more charts.",
        { status: 402, headers: cors },
      );
    }

    const userMessage =
      `Here is the person's Saju chart, already computed from their birth details. ` +
      `Every fact below is authoritative — read it, do not recompute it.\n\n` +
      `<chart>\n${chart}\n</chart>\n\n` +
      `Write the reading in ${lang === "ko" ? "Korean" : "English"}.`;

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: 6000,
        stream: true,
        system: READING_SPEC,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return new Response(`Upstream error: ${upstream.status} ${detail}`, {
        status: 502,
        headers: cors,
      });
    }

    // The reading is happening — charge it. Spend a free reading first, then a paid credit.
    let remaining;
    if (freeLeft > 0) {
      await env.DB.prepare(
        "UPDATE users SET free_used = free_used + 1, last_reading_at = datetime('now') WHERE id = ?",
      )
        .bind(userId)
        .run();
      remaining = freeLeft - 1 + paidLeft;
    } else {
      await env.DB.prepare(
        "UPDATE users SET paid_credits = paid_credits - 1, last_reading_at = datetime('now') WHERE id = ?",
      )
        .bind(userId)
        .run();
      remaining = paidLeft - 1;
    }

    return new Response(anthropicTextStream(upstream.body), {
      headers: {
        ...cors,
        "content-type": "text/plain; charset=utf-8",
        "X-Readings-Remaining": String(remaining),
      },
    });
  },
};
