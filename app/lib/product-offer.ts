import { kt2StorefrontProductId } from "./checkout";

export type ProductOfferSource = "mock" | "youzan" | "unavailable";

/**
 * Public, browser-safe view of what a product currently sells for.
 * Prices are CNY yuan. The server is the only place that decides these values.
 */
export type ProductImage = { url: string; width: number | null; height: number | null };

export type ProductOffer = {
  productId: string;
  unitPrice: number;
  priceLabel: string;
  stock: number | null;
  isAvailable: boolean;
  source: ProductOfferSource;
  /** Product photos from the provider (Youzan 商品主图); empty for the mock. */
  images: ProductImage[];
};

export function formatOfferPrice(unitPrice: number): string {
  return Number.isInteger(unitPrice)
    ? `¥${unitPrice}`
    : `¥${unitPrice.toFixed(2)}`;
}

export const kt2MockOffer: ProductOffer = {
  productId: kt2StorefrontProductId,
  unitPrice: 299,
  priceLabel: formatOfferPrice(299),
  stock: null,
  isAvailable: true,
  source: "mock",
  images: [],
};

export const kt2UnavailableOffer: ProductOffer = {
  ...kt2MockOffer,
  isAvailable: false,
  source: "unavailable",
};
