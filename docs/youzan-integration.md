# 有赞 · 聚水潭 · 小程序 对接说明

> 2026-10-26 按有赞云文档中心（doc.youzanyun.com）逐项核实过。

## 1. 整体链路

```
WYRD 网站（React Router，部署在国内服务器）
  │  GET  /api/products/kt2   ← 价格/库存：youzan.item.itemdetail.get（缓存 60 秒）
  │  POST /api/checkout       → 校验库存 → youzan.trade.bill.goods.url.get
  │                             → 返回有赞「下单页」链接（已带好商品、规格、数量）
  ▼
有赞收银台 cashier.youzan.com   ← 买家填地址、付款；钱进有赞账户（有赞标品支付）
  │
  ├─ 消息推送 → POST /api/youzan/webhook   （Event-Sign 验签 → 刷新库存缓存 → 日志）
  │
  └─ 聚水潭自动下载订单 → 云仓发货 → 物流单号回传有赞   （聚水潭后台授权，无需代码）
```

有赞提供「下单支付集成方案」：外部网站调用 `youzan.trade.bill.goods.url.get`，拿到一个**已经带好商品、规格和数量的下单页**，买家直接进入填地址、付款这一步，用的是有赞自己的收银台。订单在有赞后台、有赞小程序里都能正常看到，所以也会被聚水潭拉走。

下单页 API 如果暂时不可用（比如能力包还没开通），后端会自动退回到「跳转有赞商品页」，买家需要在那边重新选一次数量。

## 2. 用到的接口（均已对照官方文档）

| 用途 | 接口 | 要点 |
|---|---|---|
| 获取 token | `POST https://open.youzanyun.com/auth/token` | `authorize_type: "silent"`，`grant_id` = 店铺 kdt_id；token 有效 7 天，`expires` 为毫秒时间戳 |
| 调用格式 | `POST https://open.youzanyun.com/api/{接口}/{版本}?access_token=…` | JSON 请求体；返回 `{success, code:200, data, message}` |
| 商品详情 | `youzan.item.itemdetail.get` 1.0.0 | 请求体 `{request:{kdt_id, item_id, channel:0}}`；价格在 `skus[].price`（**分**），库存在 `skus[].stock_num_str`；`display` 0 下架 / 1 上架 / 8 不可售 |
| 生成下单页 | `youzan.trade.bill.goods.url.get` 3.1.0 | `order_type:0`、`item_list`（JSON 字符串：`goods_id`、`sku_id`、`num`）；返回 `data.url`，后端会自动补上 `&kdt_id=` |
| 消息推送 | 应用配置的推送地址 | 请求头 `Event-Sign = MD5(client_id + 原始请求体 + client_secret)`、`Event-Type`、`Client-Id`；`msg` 字段是 UrlEncode 过的；**5 秒内**返回 `{"code":0,"msg":"success"}`，否则会重推 |
| 买家付款消息 | `trade_TradeBuyerPay` | 买家付款、订单变成「等待商家发货」时触发；`id` 是订单号 |

注意：上面这些 API 文档都标了「计费」，费用规则以有赞后台显示的为准。

## 3. 开通有赞云自用型应用

1. 用有赞商家账号登录有赞云控制台（diy.youzanyun.com），完成开发者入驻。现在自用型应用支持快速认证、免审核创建。
2. 创建「**自用型应用**」，授权绑定你的店铺。
3. 记下三样东西，填进 `.env`：
   - `client_id` → `YOUZAN_CLIENT_ID`
   - `client_secret` → `YOUZAN_CLIENT_SECRET`
   - 店铺 ID（kdt_id）→ `YOUZAN_STORE_ID`
4. 在「应用中心 → 类目能力」里确认有这两个**能力包**：
   - **商品查询**（`youzan.item.itemdetail.get`）
   - **前端页下单定制**（`youzan.trade.bill.goods.url.get`）
5. KT2 商品的 `item_id` 填 `YOUZAN_KT2_ITEM_ID`。如果这个商品有多个规格，还要填 `YOUZAN_KT2_SKU_ID`，否则后端会报错，不会随便选一个规格去卖。
6. **IP 白名单**：有赞云只接受白名单内 IP 的 API 调用（否则报 4007「源IP地址…非法调用」）。本地开发时，把你家网络的出口 IP 加进去；家庭宽带的 IP 可能会变，报 4007 时看报错里的新 IP 再加。**线上服务器必须有固定出口 IP**，并且加进白名单，所以后端适合部署在国内云服务器上，不适合用出口 IP 不固定的 Serverless 平台。
7. **消息推送**：推送地址填 `https://<你的域名>/api/youzan/webhook`（每个应用只能配置一个地址）。订阅这些消息：交易创建、买家付款、卖家发货、交易成功、交易关闭、退款成功、规格库存变更通知。

### 本地验证

```bash
cp .env.example .env           # 填好上面的值，COMMERCE_PROVIDER=youzan
pnpm youzan:probe                 # 1. token OK  2. 打印商品详情和每个 SKU 的价格/库存
pnpm youzan:probe -- --order-page # 3. 再生成一个真实下单页链接，可以在手机上打开试付款
pnpm dev
```

webhook 必须能被有赞服务器访问到。本地开发时，用内网穿透工具（如 cpolar、natapp）把 `localhost:3000` 暴露成 https 地址，再填到推送配置里。有赞云还提供「消息调试工具」，可以手动推送测试消息。

## 4. 聚水潭连接有赞（后台操作，不写代码）

1. 聚水潭 ERP → 店铺管理 → 新增店铺 → 平台选「有赞」→ 按提示授权。
2. 打开：自动下载订单、发货后自动回传物流单号。
3. **库存只能以一方为准**。推荐聚水潭（云仓实际库存）为准，开启「库存同步到有赞」。网站读的是有赞库存，这样三方始终一致。
4. 用一笔小额真实订单走一遍：网站下单 → 有赞付款 → 聚水潭出现订单 → 发货 → 有赞订单显示物流。

## 5. 浏览器购买（电脑 / 手机，非小程序）

点结账后，浏览器整页跳转到 `cashier.youzan.com` 的下单页。下面几点需要实测确认：
- 不在微信里打开时，有赞可能要求买家用手机号验证码登录。
- 能用哪些付款方式，取决于浏览器环境和店铺开通了哪些支付。
- 付款完成后买家会留在有赞的页面上。订单状态由推送告诉后端，不依赖买家回到网站。

## 6. 以后放进自有微信小程序

有赞官方有两种对应方案（文档中心 → 客户端开放）：
- **半屏小程序**：在你自研的小程序里半屏拉起有赞商城，可以内嵌商品页、下单页、支付结果页等。账号互通，用户不用重复授权。这是最贴合「自建前端 + 有赞交易」的路线，需要单独订购。
- **小程序跳 H5**：在有赞小程序里嵌入你自己的 H5（适合 3D 展示页这类场景），需要通过安全审核或具备等保资质。

后端已经预留了字段：配置 `YOUZAN_MINIPROGRAM_APP_ID` 和 `YOUZAN_KT2_MINIPROGRAM_PATH` 后，`/api/checkout` 会额外返回 `miniProgram: { appId, path }`。

## 7. 海外销售（Shopify，之后再接）

后端按「商城提供方」组织：`app/lib/commerce/` 下定义了统一接口 `CommerceProvider`（`getOffer`、`createCheckout`）。目前有两个实现：
- `mock`：本地演示
- `youzan`：中国大陆

前端和 API 路由只调用这个接口，不直接接触有赞。以后接 Shopify：
1. 新增 `providers/shopify.server.ts`：用 Storefront API 读价格和库存，创建 Cart 拿到 `checkoutUrl`。
2. 在它自己的配置里，把我们的商品 id（`kt2-limited-edition-merch`）映射到 Shopify 的 variant id。
3. `commerce/index.server.ts` 从「按环境变量选一个」改成「按市场选」：CN → youzan，其他地区 → shopify。
4. 价格展示会涉及多币种，这时 `ProductOffer` 要加上 `currency` 字段。

## 8. 还需要用真实店铺确认的

- ~~无规格商品的 `skus` 返回什么~~ 已用真实店铺确认（2026-10-28）：无规格商品也会返回一条 SKU（`specs: []`，`skus` 里有一条带 `sku_id` 的记录），所以下单页请求会带上这个 `sku_id`。
- 错误码 4204「没有操作权限」= 应用缺少该接口的能力包。生成下单页需要「前端页下单定制」（或「APP开店原生页面开发」）能力包。
- 买家付款后能不能配置跳回网站（文档里有「支付成功页跳转链接定制扩展点」，属于有容器应用的能力）。
- 浏览器（非微信）里，有赞下单页的登录方式和可用的付款方式。
