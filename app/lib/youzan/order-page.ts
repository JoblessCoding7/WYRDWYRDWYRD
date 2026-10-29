/**
 * Helpers for `youzan.trade.bill.goods.url.get` (3.1.0, 创建多商品结算下单页).
 * The API returns a Youzan cashier link (`cashier.youzan.com/pay/wsctrade_buy?book_key=…`)
 * with the items and quantities pre-filled; the buyer enters the address and
 * pays there, so funds stay in the Youzan account.
 */

export type YouzanOrderPageLine = {
  itemId: string;
  skuId: string | null;
  quantity: number;
};

export function buildOrderPageParams(lines: readonly YouzanOrderPageLine[]) {
  return {
    order_type: 0, // 普通订单
    order_from: "open",
    item_list: JSON.stringify(
      lines.map((line) => ({
        goods_id: Number(line.itemId),
        ...(line.skuId ? { sku_id: Number(line.skuId) } : {}),
        num: line.quantity,
      })),
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const allowedHosts = /(^|\.)youzan\.com$/;

/**
 * Returns the cashier URL, with `kdt_id` appended as the docs recommend
 * (avoids "参数错误 编号：160100900"). Rejects anything that is not https on a
 * youzan.com host, so a malformed response can never redirect buyers elsewhere.
 */
export function readOrderPageUrl(data: unknown, kdtId: string): string | null {
  if (!isRecord(data) || data.is_success === false || typeof data.url !== "string") {
    return null;
  }
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !allowedHosts.test(url.hostname)) return null;
  if (!url.searchParams.has("kdt_id")) url.searchParams.set("kdt_id", kdtId);
  return url.toString();
}
