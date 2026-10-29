import {getCommerceProvider} from '~/lib/commerce/index.server';
import {kt2StorefrontProductId} from '~/lib/checkout';
import {kt2UnavailableOffer, type ProductOffer} from '~/lib/product-offer';

/** Offer for rendering. Never throws: a provider outage shows the product as unavailable. */
export async function getKt2Offer(): Promise<ProductOffer> {
  try {
    return await getCommerceProvider().getOffer(kt2StorefrontProductId);
  } catch (error) {
    console.error('[catalog] Could not load KT2 offer', error);
    return kt2UnavailableOffer;
  }
}
