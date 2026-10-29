/**
 * Maps a `youzan.item.itemdetail.get` (1.0.0) response to what the storefront
 * needs. Per the Youzan docs: prices are on `skus[].price` in fen, stock is
 * `skus[].stock_num_str`, and `display` is 0 下架 / 1 上架 / 8 不可售.
 */

export type YouzanImage = { url: string; width: number | null; height: number | null };

export type YouzanItemSnapshot = {
  itemId: string;
  alias: string | null;
  title: string | null;
  /** The SKU that will be sold; null only for items without SKUs. */
  skuId: string | null;
  priceFen: number;
  stock: number | null;
  detailUrl: string | null;
  isListed: boolean;
  /** 商品主图 (`media.images`), https only, in Youzan's order. */
  images: YouzanImage[];
};

export type YouzanItemParseResult =
  | { ok: true; item: YouzanItemSnapshot }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Integer fen (分). A decimal string such as "299.00" is read as yuan so a
 * differently-shaped response cannot silently produce a 100× price error.
 */
export function readPriceFen(value: unknown): number | null {
  if (typeof value === "string" && /^\d+\.\d{1,2}$/.test(value.trim())) {
    return Math.round(Number(value.trim()) * 100);
  }
  const fen = readInteger(value);
  return fen !== null && fen >= 0 ? fen : null;
}

export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100;
}

export function getYouzanH5GoodsUrl(alias: string): string {
  return `https://h5.youzan.com/v2/goods/${encodeURIComponent(alias)}`;
}

function readImages(media: unknown): YouzanImage[] {
  if (!isRecord(media) || !Array.isArray(media.images)) return [];
  return media.images.filter(isRecord).flatMap((image) => {
    const raw = readString(image.url);
    if (!raw) return [];
    const url = raw.replace(/^http:\/\//, "https://");
    if (!url.startsWith("https://")) return [];
    const width = readInteger(image.width);
    const height = readInteger(image.height);
    return [{ url, width: width && width > 0 ? width : null, height: height && height > 0 ? height : null }];
  });
}

export function parseYouzanItemDetail(
  data: unknown,
  configuredSkuId?: string | null,
): YouzanItemParseResult {
  if (!isRecord(data)) return { ok: false, reason: "Item response is not an object." };

  const itemId = readString(data.item_id);
  if (!itemId) return { ok: false, reason: "Item response has no item_id." };

  const skus = (Array.isArray(data.skus) ? data.skus : [])
    .filter(isRecord)
    .filter((sku) => sku.disable_status !== 1);

  let sku: Record<string, unknown> | undefined;
  if (configuredSkuId) {
    sku = skus.find(
      (candidate) =>
        readString(candidate.sku_id) === configuredSkuId ||
        readString(candidate.channel_sku_id) === configuredSkuId,
    );
    if (!sku) {
      return { ok: false, reason: `SKU ${configuredSkuId} is not an enabled SKU of item ${itemId}.` };
    }
  } else if (skus.length === 1) {
    sku = skus[0];
  } else if (skus.length > 1) {
    return {
      ok: false,
      reason: `Item ${itemId} has ${skus.length} SKUs; set YOUZAN_KT2_SKU_ID to choose one.`,
    };
  }

  const priceFen = sku ? readPriceFen(sku.price) : null;
  if (priceFen === null) {
    return { ok: false, reason: `Item ${itemId} has no readable SKU price.` };
  }

  const stock = sku ? readInteger(sku.stock_num_str ?? sku.stock_num) : null;
  const display = readInteger(data.display);
  const alias = readString(data.alias);

  return {
    ok: true,
    item: {
      itemId,
      alias,
      title: readString(data.title),
      skuId: sku ? readString(sku.sku_id) : null,
      priceFen,
      stock: stock !== null && stock >= 0 ? stock : null,
      detailUrl: alias ? getYouzanH5GoodsUrl(alias) : null,
      isListed: (display === null || display === 1) && readInteger(data.delete) !== 1,
      images: readImages(data.media),
    },
  };
}
