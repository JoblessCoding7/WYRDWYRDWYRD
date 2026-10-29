import type { YouzanCredentials } from "./config.server";
import {
  YouzanApiError,
  isRecord,
  resolveTokenExpiry,
  unwrapYouzanResponse,
} from "./response";

export { YouzanApiError };

const tokenEndpoint = "https://open.youzanyun.com/auth/token";
const apiEndpoint = "https://open.youzanyun.com/api";
const requestTimeoutMs = 10_000;
const tokenSafetyMarginMs = 5 * 60 * 1000;

type CachedToken = { kdtId: string; accessToken: string; expiresAt: number };

let cachedToken: CachedToken | null = null;
let pendingToken: Promise<CachedToken> | null = null;

async function postJson(url: string, payload: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new YouzanApiError(
      `Youzan returned HTTP ${response.status} with a non-JSON body.`,
      response.status,
    );
  }
}

async function requestToken(credentials: YouzanCredentials): Promise<CachedToken> {
  const data = unwrapYouzanResponse(
    await postJson(tokenEndpoint, {
      authorize_type: "silent",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_id: credentials.kdtId,
      refresh: false,
    }),
  );
  if (!isRecord(data) || typeof data.access_token !== "string") {
    throw new YouzanApiError("Youzan token response had no access_token.");
  }
  return {
    kdtId: credentials.kdtId,
    accessToken: data.access_token,
    expiresAt: resolveTokenExpiry(data.expires) - tokenSafetyMarginMs,
  };
}

export async function getYouzanAccessToken(
  credentials: YouzanCredentials,
  options: { forceRefresh?: boolean } = {},
): Promise<string> {
  if (
    !options.forceRefresh &&
    cachedToken &&
    cachedToken.kdtId === credentials.kdtId &&
    cachedToken.expiresAt > Date.now()
  ) {
    return cachedToken.accessToken;
  }

  pendingToken ??= requestToken(credentials).finally(() => {
    pendingToken = null;
  });
  cachedToken = await pendingToken;
  return cachedToken.accessToken;
}

function looksLikeTokenError(error: unknown): boolean {
  if (!(error instanceof YouzanApiError)) return false;
  const code = Number(error.code);
  return (code >= 4201 && code <= 4203) || /token/i.test(error.message);
}

export async function callYouzanApi(
  credentials: YouzanCredentials,
  api: string,
  version: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const call = async (forceRefresh: boolean) => {
    const token = await getYouzanAccessToken(credentials, { forceRefresh });
    const url = `${apiEndpoint}/${encodeURIComponent(api)}/${encodeURIComponent(version)}?access_token=${encodeURIComponent(token)}`;
    return unwrapYouzanResponse(await postJson(url, params));
  };

  try {
    return await call(false);
  } catch (error) {
    if (!looksLikeTokenError(error)) throw error;
    return call(true);
  }
}
