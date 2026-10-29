import type { CheckoutSession, CommerceProviderId } from "~/lib/checkout";
import type { ProductOffer } from "~/lib/product-offer";

export type { CommerceProviderId };

/** A storefront product (our own id, e.g. "kt2-limited-edition-merch") and quantity. */
export type CheckoutLine = {
  productId: string;
  quantity: number;
};

/**
 * One commerce backend. Today: `mock` and `youzan` (China). The storefront only
 * talks to this interface, so an overseas `shopify` provider can be added later
 * without changing routes or UI — each provider maps our product ids to its own
 * ids (Youzan item/SKU id, Shopify variant id) in its configuration.
 */
export interface CommerceProvider {
  readonly id: CommerceProviderId;
  getOffer(productId: string): Promise<ProductOffer>;
  /** Validates stock and returns where to send the buyer to pay. */
  createCheckout(lines: readonly CheckoutLine[]): Promise<CheckoutSession>;
}
