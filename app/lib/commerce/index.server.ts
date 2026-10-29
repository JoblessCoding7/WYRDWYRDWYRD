import { readCommerceProviderId } from "~/lib/youzan/config.server";

import { mockProvider } from "./providers/mock.server";
import { youzanProvider } from "./providers/youzan.server";
import type { CommerceProvider } from "./types";

export { CommerceConfigurationError, ProductUnavailableError } from "./errors";
export type { CheckoutLine, CommerceProvider } from "./types";

/**
 * The active provider. Today one per deployment (`COMMERCE_PROVIDER`).
 * When overseas sales return, this becomes a lookup by market
 * (e.g. CN → youzan, everywhere else → shopify).
 */
export function getCommerceProvider(): CommerceProvider {
  return readCommerceProviderId() === "youzan" ? youzanProvider : mockProvider;
}
