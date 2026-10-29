import { getMockCheckoutUrl, kt2StorefrontProductId } from "~/lib/checkout";
import { kt2MockOffer } from "~/lib/product-offer";

import { CommerceConfigurationError } from "../errors";
import type { CommerceProvider } from "../types";

/** Local demo: fixed ¥299 price, no external calls, demo checkout page. */
export const mockProvider: CommerceProvider = {
  id: "mock",

  async getOffer(productId) {
    if (productId !== kt2StorefrontProductId) {
      throw new CommerceConfigurationError(`Unknown product: ${productId}`);
    }
    return kt2MockOffer;
  },

  async createCheckout(lines) {
    const quantity = lines.reduce((total, line) => total + line.quantity, 0);
    return { checkoutUrl: getMockCheckoutUrl(quantity), provider: "mock" };
  },
};
