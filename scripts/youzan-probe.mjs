// Checks the Youzan setup end to end without touching the website:
//   1. token        POST https://open.youzanyun.com/auth/token (自用型应用 silent)
//   2. item list    youzan.item.base.search 1.0.0      — when YOUZAN_KT2_ITEM_ID is empty
//      item detail  youzan.item.itemdetail.get 1.0.0  — prints the raw response
//   3. order page   youzan.trade.bill.goods.url.get 3.1.0 — only with --order-page
// Usage: pnpm youzan:probe [-- --order-page]   (reads .env; prints no secrets)

const env = process.env;
const required = ["YOUZAN_CLIENT_ID", "YOUZAN_CLIENT_SECRET", "YOUZAN_STORE_ID"];
const missing = required.filter((name) => !env[name]?.trim());
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}
const v = (name) => env[name]?.trim() || null;

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

const token = await post("https://open.youzanyun.com/auth/token", {
  authorize_type: "silent",
  client_id: v("YOUZAN_CLIENT_ID"),
  client_secret: v("YOUZAN_CLIENT_SECRET"),
  grant_id: v("YOUZAN_STORE_ID"),
  refresh: false,
});
const accessToken = token.body?.data?.access_token;
console.log("1. token:", token.status, accessToken ? "OK" : token.body);
if (!accessToken) process.exit(1);
console.log("   expires:", new Date(token.body.data.expires).toISOString());

function explainAndExit(body) {
  const code = body?.gw_err_resp?.err_code ?? body?.code;
  const hints = {
    4007: "IP not whitelisted: add the IP in the message above to the app's IP 白名单 in the Youzan Cloud console.",
    4204: "No permission (没有操作权限): add the 能力包 for this API in the Youzan Cloud console — 商品查询 for item APIs, 前端页下单定制 for the order page.",
  };
  console.error(`\n✗ ${hints[code] ?? "See the error above. A permission error means the 能力包 (商品查询 / 前端页下单定制) is missing."}`);
  process.exit(1);
}

const api = (name, version, params) =>
  post(`https://open.youzanyun.com/api/${name}/${version}?access_token=${encodeURIComponent(accessToken)}`, params);

if (!v("YOUZAN_KT2_ITEM_ID")) {
  const list = await api("youzan.item.base.search", "1.0.0", {
    kdt_id: Number(v("YOUZAN_STORE_ID")),
    channel: 0,
    page_no: 1,
    page_size: 50,
  });
  console.log("2. youzan.item.base.search:", list.status, list.body?.success ? "OK" : list.body);
  if (!list.body?.success) explainAndExit(list.body);
  const items = list.body?.data?.items ?? [];
  console.log(`   ${items.length} item(s) (newest first):`);
  for (const it of items) {
    const state = it.display === 1 ? (it.sold_status === 2 ? "售罄" : "出售中") : "仓库中";
    console.log(`   item_id=${it.item_id}  ¥${(it.price / 100).toFixed(2)}  库存=${it.total_stock}  ${state}  ${it.title}`);
  }
  console.log("\nCopy the KT2 item_id into YOUZAN_KT2_ITEM_ID in .env, then run this again.");
  process.exit(0);
}

const item = await api("youzan.item.itemdetail.get", "1.0.0", {
  request: { kdt_id: Number(v("YOUZAN_STORE_ID")), item_id: Number(v("YOUZAN_KT2_ITEM_ID")), channel: 0 },
});
console.log("2. youzan.item.itemdetail.get:", item.status, item.body?.success ? "OK" : item.body);
if (!item.body?.success) explainAndExit(item.body);
const data = item.body?.data;
if (data) {
  console.log("   title:", data.title, "| alias:", data.alias, "| display:", data.display, "| sold_status:", data.sold_status);
  for (const sku of data.skus ?? []) {
    console.log(`   sku_id=${sku.sku_id} price=${sku.price}分 stock=${sku.stock_num_str} disabled=${sku.disable_status ?? 0}`);
  }
}
console.log(JSON.stringify(item.body, null, 2));

if (process.argv.includes("--order-page")) {
  const sku = v("YOUZAN_KT2_SKU_ID") ?? (data?.skus?.length === 1 ? String(data.skus[0].sku_id) : null);
  const page = await api("youzan.trade.bill.goods.url.get", "3.1.0", {
    order_type: 0,
    order_from: "open",
    item_list: JSON.stringify([{ goods_id: Number(v("YOUZAN_KT2_ITEM_ID")), ...(sku ? { sku_id: Number(sku) } : {}), num: 1 }]),
  });
  console.log("3. youzan.trade.bill.goods.url.get:", page.status, page.body?.success ? "OK" : page.body);
  if (!page.body?.success) explainAndExit(page.body);
  if (page.body?.data?.url) console.log("   open this to test checkout:", `${page.body.data.url}&kdt_id=${v("YOUZAN_STORE_ID")}`);
}
