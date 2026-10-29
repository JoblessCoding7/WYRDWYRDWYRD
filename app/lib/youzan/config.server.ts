import { CommerceConfigurationError } from "~/lib/commerce/errors";
import type { CommerceProviderId } from "~/lib/checkout";

export { CommerceConfigurationError };

export type YouzanCredentials = {
  clientId: string;
  clientSecret: string;
  /** 店铺 kdt_id, used as `grant_id` for 自用型应用 silent authorization. */
  kdtId: string;
};

export type YouzanConfig = YouzanCredentials & {
  kt2ItemId: string;
  kt2SkuId: string | null;
  /** Optional override, e.g. a product link copied from the Youzan admin. */
  kt2CheckoutUrl: string | null;
  miniProgram: { appId: string; path: string } | null;
};

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

export function readCommerceProviderId(env: Env = process.env): CommerceProviderId {
  const provider = read(env, "COMMERCE_PROVIDER") ?? "mock";
  if (provider === "mock" || provider === "youzan") return provider;
  throw new CommerceConfigurationError(
    `Unsupported commerce provider: ${provider}`,
  );
}

function missingConfiguration(
  env: Env,
  names: readonly string[],
): CommerceConfigurationError {
  const missing = names.filter((name) => !read(env, name));
  return new CommerceConfigurationError(
    `Youzan is not configured. Missing: ${missing.join(", ")}`,
  );
}

export function readYouzanCredentials(env: Env = process.env): YouzanCredentials {
  const clientId = read(env, "YOUZAN_CLIENT_ID");
  const clientSecret = read(env, "YOUZAN_CLIENT_SECRET");
  const kdtId = read(env, "YOUZAN_STORE_ID");
  if (!clientId || !clientSecret || !kdtId) {
    throw missingConfiguration(env, [
      "YOUZAN_CLIENT_ID",
      "YOUZAN_CLIENT_SECRET",
      "YOUZAN_STORE_ID",
    ]);
  }
  return { clientId, clientSecret, kdtId };
}

export function readYouzanConfig(env: Env = process.env): YouzanConfig {
  const credentials = readYouzanCredentials(env);
  const kt2ItemId = read(env, "YOUZAN_KT2_ITEM_ID");
  if (!kt2ItemId) throw missingConfiguration(env, ["YOUZAN_KT2_ITEM_ID"]);

  const kt2CheckoutUrl = read(env, "YOUZAN_KT2_CHECKOUT_URL");
  if (kt2CheckoutUrl && !kt2CheckoutUrl.startsWith("https://")) {
    throw new CommerceConfigurationError(
      "YOUZAN_KT2_CHECKOUT_URL must be an https:// link.",
    );
  }

  const appId = read(env, "YOUZAN_MINIPROGRAM_APP_ID");
  const path = read(env, "YOUZAN_KT2_MINIPROGRAM_PATH");

  return {
    ...credentials,
    kt2ItemId,
    kt2SkuId: read(env, "YOUZAN_KT2_SKU_ID"),
    kt2CheckoutUrl,
    miniProgram: appId && path ? { appId, path } : null,
  };
}
