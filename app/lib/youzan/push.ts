import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Verification for Youzan Cloud message push (消息推送).
 *
 * Two signing schemes are accepted:
 * - Header scheme: `Event-Sign = md5(client_id + rawBody + client_secret)`.
 * - Body scheme:   `body.sign  = md5(client_id + body.msg + client_secret)`.
 * Whichever Youzan sends, the comparison is constant-time.
 */

export type YouzanPushEvent = {
  type: string;
  /** Usually the trade id (tid) for trade events. */
  id: string | null;
  kdtId: string | null;
  status: string | null;
  isTest: boolean;
  message: unknown;
};

export type YouzanPushVerification =
  | { ok: true; event: YouzanPushEvent }
  | { ok: false; reason: "malformed" | "bad-signature" };

export const youzanPushSuccessBody = { code: 0, msg: "success" } as const;

export function md5Hex(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected.toLowerCase(), "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** `msg` is URL-encoded JSON (Java URLDecoder style, so `+` means space). */
export function decodeYouzanMessage(msg: unknown): unknown {
  if (typeof msg !== "string") return msg ?? null;
  let text = msg;
  try {
    text = decodeURIComponent(msg.replace(/\+/g, "%20"));
  } catch {
    // Not URL-encoded; fall through with the raw string.
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function verifyYouzanPush(input: {
  rawBody: string;
  eventSign: string | null;
  clientId: string;
  clientSecret: string;
}): YouzanPushVerification {
  let body: unknown;
  try {
    body = JSON.parse(input.rawBody);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isRecord(body)) return { ok: false, reason: "malformed" };

  const isTest = body.test === true || body.test === "true";
  const event: YouzanPushEvent = {
    type: readString(body.type) ?? "unknown",
    id: readString(body.id),
    kdtId: readString(body.kdt_id),
    status: readString(body.status),
    isTest,
    message: decodeYouzanMessage(body.msg),
  };

  const { clientId, clientSecret } = input;
  let signed = false;

  if (input.eventSign) {
    signed = safeEqualHex(
      md5Hex(clientId + input.rawBody + clientSecret),
      input.eventSign,
    );
  }

  if (!signed && typeof body.sign === "string" && typeof body.msg === "string") {
    signed = safeEqualHex(md5Hex(clientId + body.msg + clientSecret), body.sign);
  }

  return signed ? { ok: true, event } : { ok: false, reason: "bad-signature" };
}
