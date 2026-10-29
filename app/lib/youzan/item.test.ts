import { describe, expect, it } from "vitest";

import { fenToYuan, parseYouzanItemDetail, readPriceFen } from "./item";

// Shape from the youzan.item.itemdetail.get 1.0.0 response example.
const detail = {
  item_id: 5268077660,
  alias: "35zv7ceibaj8uzg",
  title: "KT2 限量周边",
  display: 1,
  delete: 0,
  sold_status: 1,
  skus: [
    { sku_id: 111, price: 29900, stock_num: 40, stock_num_str: "40", disable_status: 0 },
  ],
};

describe("parseYouzanItemDetail", () => {
  it("reads the single SKU's fen price, string stock and alias link", () => {
    expect(parseYouzanItemDetail(detail)).toEqual({
      ok: true,
      item: {
        itemId: "5268077660",
        alias: "35zv7ceibaj8uzg",
        title: "KT2 限量周边",
        skuId: "111",
        priceFen: 29900,
        stock: 40,
        detailUrl: "https://h5.youzan.com/v2/goods/35zv7ceibaj8uzg",
        isListed: true,
        images: [],
      },
    });
  });

  it("requires a configured SKU when there are several, and uses it", () => {
    const multi = {
      ...detail,
      skus: [
        ...detail.skus,
        { sku_id: 222, price: 35900, stock_num_str: "5" },
        { sku_id: 333, price: 1, stock_num_str: "9", disable_status: 1 },
      ],
    };
    expect(parseYouzanItemDetail(multi).ok).toBe(false);
    const chosen = parseYouzanItemDetail(multi, "222");
    expect(chosen.ok && chosen.item.priceFen).toBe(35900);
    expect(chosen.ok && chosen.item.stock).toBe(5);
    // Disabled SKUs are never sold.
    expect(parseYouzanItemDetail(multi, "333").ok).toBe(false);
  });

  it("marks delisted, unsellable and deleted items as not listed", () => {
    for (const patch of [{ display: 0 }, { display: 8 }, { delete: 1 }]) {
      const result = parseYouzanItemDetail({ ...detail, ...patch });
      expect(result.ok && result.item.isListed).toBe(false);
    }
  });

  it("reads 商品主图 as https urls and drops unusable ones", () => {
    const result = parseYouzanItemDetail({
      ...detail,
      media: {
        images: [
          { url: "https://img.yzcdn.cn/a.png", width: 640, height: 640 },
          { url: "http://img.yzcdn.cn/b.png", width: 0 },
          { url: "" },
          "nope",
        ],
      },
    });
    expect(result.ok && result.item.images).toEqual([
      { url: "https://img.yzcdn.cn/a.png", width: 640, height: 640 },
      { url: "https://img.yzcdn.cn/b.png", width: null, height: null },
    ]);
  });

  it("fails clearly when id or price is missing", () => {
    expect(parseYouzanItemDetail({ ...detail, item_id: undefined }).ok).toBe(false);
    expect(parseYouzanItemDetail({ ...detail, skus: [] }).ok).toBe(false);
    expect(parseYouzanItemDetail("nope").ok).toBe(false);
  });
});

describe("prices", () => {
  it("reads integer fen and decimal yuan strings", () => {
    expect(readPriceFen(29900)).toBe(29900);
    expect(readPriceFen("29900")).toBe(29900);
    expect(readPriceFen("299.00")).toBe(29900);
    expect(readPriceFen(-1)).toBeNull();
    expect(fenToYuan(29900)).toBe(299);
    expect(fenToYuan(1999)).toBe(19.99);
  });
});
