import { invalidateYouzanItemCache } from "~/lib/commerce/providers/youzan.server";

import type { YouzanPushEvent } from "./push";

/**
 * Order lifecycle events this storefront reacts to. Fulfilment itself is
 * handled by 聚水潭, which pulls orders from Youzan directly; these handlers
 * only keep the storefront in sync (stock cache, logs, future notifications).
 */
const stockChangingEvents = new Set([
  "trade_TradeBuyerPay",
    "trade_TradeClose",
  "trade_refund_RefundSuccess",
]);

export async function handleYouzanEvent(event: YouzanPushEvent): Promise<void> {
  if (stockChangingEvents.has(event.type) || event.type.startsWith("ITEM_")) {
    invalidateYouzanItemCache();
  }

  // Structured log line; replace with persistence / notifications when needed.
  console.info(
    "[youzan:event]",
    JSON.stringify({
      type: event.type,
      id: event.id,
      status: event.status,
      kdtId: event.kdtId,
    }),
  );
}
