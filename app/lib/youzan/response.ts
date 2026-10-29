/** Pure helpers for Youzan gateway responses (no network, safe to unit test). */

export class YouzanApiError extends Error {
  constructor(
    message: string,
    readonly code: string | number | null = null,
  ) {
    super(message);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCode(...candidates: unknown[]): string | number | null {
  for (const value of candidates) {
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return null;
}

/** Youzan returns `expires` as an epoch timestamp (ms); tolerate s / duration. */
export function resolveTokenExpiry(expires: unknown, now = Date.now()): number {
  const value = typeof expires === "string" ? Number(expires) : expires;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return now + 60 * 60 * 1000;
  }
  if (value > 1e12) return value;
  if (value > 1e9) return value * 1000;
  return now + value * 1000;
}

/**
 * Normalizes the gateway's response shapes:
 * `{ success, code, data, message }`, `{ response }`, `{ error_response }`.
 */
export function unwrapYouzanResponse(body: unknown): unknown {
  if (!isRecord(body)) throw new YouzanApiError("Youzan returned a non-object response.");

  if (isRecord(body.error_response)) {
    const error = body.error_response;
    throw new YouzanApiError(
      String(error.msg ?? error.message ?? "Youzan API error"),
      readCode(error.code),
    );
  }
  if ("response" in body) return body.response;

  const hasErrorCode =
    typeof body.code === "number" && body.code !== 200 && body.code !== 0;

  if (body.success === false || (body.success !== true && hasErrorCode)) {
    const errorData = isRecord(body.gw_err_resp) ? body.gw_err_resp : body;
    throw new YouzanApiError(
      String(errorData.err_msg ?? body.message ?? "Youzan API error"),
      readCode(errorData.err_code, body.code),
    );
  }
  return "data" in body ? body.data : body;
}
