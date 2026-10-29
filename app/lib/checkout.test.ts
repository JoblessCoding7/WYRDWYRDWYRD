import { describe, expect, it } from "vitest";
import {
  isCheckoutSession,
  kt2StorefrontProductId,
  parseCheckoutQuantity,
  parseCheckoutRequest,
} from "./checkout";
describe("mock checkout quantity", () => {
  it("accepts whole quantities in the demo range", () => {
    expect(parseCheckoutQuantity("1")).toBe(1);
    expect(parseCheckoutQuantity("999")).toBe(999);
  });
  it("rejects empty, fractional, negative, malformed and oversized input", () => {
    for (const value of [undefined, "", "0", "-1", "1.5", "2abc", "1000", "Infinity"]) {
      expect(parseCheckoutQuantity(value)).toBeNull();
    }
  });
});

describe("checkout request", () => {
  it("accepts the supported storefront product and a safe quantity", () => {
    expect(
      parseCheckoutRequest({
        lineItems: [{ productId: kt2StorefrontProductId, quantity: 2 }],
      }),
    ).toEqual({
      lineItems: [{ productId: kt2StorefrontProductId, quantity: 2 }],
    });
  });

  it("rejects client prices, unknown products and invalid quantities", () => {
    expect(
      parseCheckoutRequest({
        lineItems: [
          { productId: kt2StorefrontProductId, quantity: 1, price: 0 },
        ],
      }),
    ).toEqual({
      lineItems: [{ productId: kt2StorefrontProductId, quantity: 1 }],
    });
    expect(
      parseCheckoutRequest({
        lineItems: [{ productId: "unknown", quantity: 1 }],
      }),
    ).toBeNull();
    expect(
      parseCheckoutRequest({
        lineItems: [{ productId: kt2StorefrontProductId, quantity: 0 }],
      }),
    ).toBeNull();
  });

  it("recognizes only valid checkout session responses", () => {
    expect(
      isCheckoutSession({ checkoutUrl: "/checkout/mock", provider: "mock" }),
    ).toBe(true);
    expect(isCheckoutSession({ checkoutUrl: "", provider: "mock" })).toBe(
      false,
    );
    expect(
      isCheckoutSession({ checkoutUrl: "/checkout/mock", provider: "other" }),
    ).toBe(false);
  });
});
