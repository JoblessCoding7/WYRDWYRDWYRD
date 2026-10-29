import { kt2StorefrontProductId } from "~/lib/checkout";
import { formatOfferPrice, type ProductOffer } from "~/lib/product-offer";
import { YouzanApiError, callYouzanApi } from "~/lib/youzan/client.server";
import { readYouzanConfig, type YouzanConfig } from "~/lib/youzan/config.server";
import {
  fenToYuan,
  parseYouzanItemDetail,
  type YouzanItemSnapshot,
} from "~/lib/youzan/item";
import { buildOrderPageParams, readOrderPageUrl } from "~/lib/youzan/order-page";

import { CommerceConfigurationError, ProductUnavailableError } from "../errors";
import type { CommerceProvider } from "../types";

/** Short cache so page views don't each hit Youzan; Youzan re-checks stock at payment. */
const itemCacheMs = 60_000;

const itemCache = new Map<string, { item: YouzanItemSnapshot; expiresAt: number }>();
const pendingItems = new Map<string, Promise<YouzanItemSnapshot>>();

export function invalidateYouzanItemCache(): void {
  itemCache.clear();
}

type YouzanProductRef = { itemId: string; skuId: string | null };

/** Our product id → Youzan item/SKU. Add entries here as products are added. */
function productRef(config: YouzanConfig, productId: string): YouzanProductRef {
  if (productId === kt2StorefrontProductId) {
    return { itemId: config.kt2ItemId, skuId: config.kt2SkuId };
  }
  throw new CommerceConfigurationError(`No Youzan item is mapped to product ${productId}.`);
}

async function fetchItem(config: YouzanConfig, ref: YouzanProductRef): Promise<YouzanItemSnapshot> {
  const data = await callYouzanApi(config, "youzan.item.itemdetail.get", "1.0.0", {
    request: { kdt_id: Number(config.kdtId), item_id: Number(ref.itemId), channel: 0 },
  });
  const parsed = parseYouzanItemDetail(data, ref.skuId);
  if (!parsed.ok) throw new CommerceConfigurationError(parsed.reason);
  return parsed.item;
}

async function getItem(config: YouzanConfig, ref: YouzanProductRef): Promise<YouzanItemSnapshot> {
  const key = `${ref.itemId}:${ref.skuId ?? ""}`;
  const cached = itemCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.item;

  let pending = pendingItems.get(key);
  if (!pending) {
    pending = fetchItem(config, ref).finally(() => pendingItems.delete(key));
    pendingItems.set(key, pending);
  }
  const item = await pending;
  itemCache.set(key, { item, expiresAt: Date.now() + itemCacheMs });
  return item;
}

export function toProductOffer(productId: string, item: YouzanItemSnapshot): ProductOffer {
  const unitPrice = fenToYuan(item.priceFen);
  return {
    productId,
    unitPrice,
    priceLabel: formatOfferPrice(unitPrice),
    stock: item.stock,
    isAvailable: item.isListed && (item.stock === null || item.stock > 0),
    source: "youzan",
    images: item.images,
  };
}

export const youzanProvider: CommerceProvider = {
  id: "youzan",

  async getOffer(productId) {
    const config = readYouzanConfig();
    return toProductOffer(productId, await getItem(config, productRef(config, productId)));
  },

  async createCheckout(lines) {
    const config = readYouzanConfig();

    const orderLines = await Promise.all(
      lines.map(async (line) => {
        const item = await getItem(config, productRef(config, line.productId));
        const offer = toProductOffer(line.productId, item);
        if (!offer.isAvailable) {
          throw new ProductUnavailableError("This product is sold out or not on sale.");
        }
        if (offer.stock !== null && line.quantity > offer.stock) {
          throw new ProductUnavailableError(`Only ${offer.stock} left in stock.`);
        }
        return { item, quantity: line.quantity };
      }),
    );

    const miniProgram = config.miniProgram ? { miniProgram: config.miniProgram } : {};

    if (config.kt2CheckoutUrl) {
      // Manual override (e.g. while the 下单 API permission is pending).
      return { checkoutUrl: config.kt2CheckoutUrl, provider: "youzan", ...miniProgram };
    }

    try {
      // 创建多商品结算下单页: pre-filled order page on Youzan's cashier.
      const data = await callYouzanApi(
        config,
        "youzan.trade.bill.goods.url.get",
        "3.1.0",
        buildOrderPageParams(
          orderLines.map(({ item, quantity }) => ({
            itemId: item.itemId,
            skuId: item.skuId,
            quantity,
          })),
        ),
      );
      const checkoutUrl = readOrderPageUrl(data, config.kdtId);
      if (checkoutUrl) return { checkoutUrl, provider: "youzan", ...miniProgram };
      console.error("[youzan] Order page API returned no usable url", data);
    } catch (error) {
      if (!(error instanceof YouzanApiError)) throw error;
      console.error("[youzan] Order page API failed", error.code, error.message);
    }

    // Fallback: the product page (buyer re-selects quantity there).
    const detailUrl = orderLines.length === 1 ? orderLines[0].item.detailUrl : null;
    if (!detailUrl) {
      throw new CommerceConfigurationError("Youzan order page could not be created.");
    }
    return { checkoutUrl: detailUrl, provider: "youzan", ...miniProgram };
  },
};
