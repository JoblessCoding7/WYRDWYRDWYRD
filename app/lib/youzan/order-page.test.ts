import { describe, expect, it } from "vitest";

import { buildOrderPageParams, readOrderPageUrl } from "./order-page";

describe("buildOrderPageParams", () => {
  it("sends items as a JSON string with numeric ids and no price", () => {
    const params = buildOrderPageParams([
      { itemId: "5268077660", skuId: "111", quantity: 2 },
      { itemId: "42", skuId: null, quantity: 1 },
    ]);
    expect(params.order_type).toBe(0);
    expect(params.order_from).toBe("open");
    expect(JSON.parse(params.item_list)).toEqual([
      { goods_id: 5268077660, sku_id: 111, num: 2 },
      { goods_id: 42, num: 1 },
    ]);
  });
});

describe("readOrderPageUrl", () => {
  const url = "https://cashier.youzan.com/pay/wsctrade_buy?book_key=3f19216f";

  it("appends kdt_id to the cashier link", () => {
    expect(readOrderPageUrl({ is_success: true, url, book_key: "3f19216f" }, "90809720")).toBe(
      `${url}&kdt_id=90809720`,
    );
    expect(readOrderPageUrl({ url: `${url}&kdt_id=1` }, "2")).toBe(`${url}&kdt_id=1`);
  });

  it("rejects failures and non-Youzan or non-https links", () => {
    expect(readOrderPageUrl({ is_success: false, url }, "1")).toBeNull();
    expect(readOrderPageUrl({ url: "https://evil.example/pay" }, "1")).toBeNull();
    expect(readOrderPageUrl({ url: "https://youzan.com.evil.example/x" }, "1")).toBeNull();
    expect(readOrderPageUrl({ url: "http://cashier.youzan.com/x" }, "1")).toBeNull();
    expect(readOrderPageUrl(null, "1")).toBeNull();
  });
});
