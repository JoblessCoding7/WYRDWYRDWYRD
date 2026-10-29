export const kt2StorefrontProductId = "kt2-limited-edition-merch";

export type CheckoutLineItemInput = {
  productId: string;
  quantity: number;
};

export type CheckoutRequest = {
  lineItems: CheckoutLineItemInput[];
};

/** Commerce backends the storefront can check out with. Shopify will join for overseas sales. */
export const commerceProviderIds = ["mock", "youzan"] as const;

export type CommerceProviderId = (typeof commerceProviderIds)[number];

export type CheckoutSession = {
  checkoutUrl: string;
  provider: CommerceProviderId;
  /** For a future WeChat mini program shell: open this Youzan page natively. */
  miniProgram?: { appId: string; path: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseCheckoutQuantity(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity <= 999 ? quantity : null;
}

export function parseCheckoutRequest(value: unknown): CheckoutRequest | null {
  if (!isRecord(value) || !Array.isArray(value.lineItems)) {
    return null;
  }

  if (value.lineItems.length !== 1) {
    return null;
  }

  const [lineItem] = value.lineItems;

  if (
    !isRecord(lineItem) ||
    lineItem.productId !== kt2StorefrontProductId ||
    typeof lineItem.quantity !== "number" ||
    !Number.isSafeInteger(lineItem.quantity) ||
    lineItem.quantity < 1 ||
    lineItem.quantity > 999
  ) {
    return null;
  }

  return {
    lineItems: [
      {
        productId: kt2StorefrontProductId,
        quantity: lineItem.quantity,
      },
    ],
  };
}

export function isCheckoutSession(value: unknown): value is CheckoutSession {
  return (
    isRecord(value) &&
    typeof value.checkoutUrl === "string" &&
    value.checkoutUrl.length > 0 &&
    commerceProviderIds.some((id) => id === value.provider)
  );
}

export function getMockCheckoutUrl(quantity: number): string {
  return `/checkout/mock?quantity=${quantity}`;
}
