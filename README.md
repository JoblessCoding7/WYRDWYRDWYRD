# WYRD

WYRD 官网商城（中国大陆版）。前端是 WYRD 自己的设计（开场 logo 动画、3D 鞋盒、KT2 商品体验），
交易交给有赞：价格、库存、商品图从有赞读取，买家在有赞收银台付款，订单由聚水潭从有赞拉取发货。

```
浏览器 → WYRD 网站（React Router，Node）→ 有赞（读商品 / 生成下单页）→ 有赞收银台付款
                         ↑ 订单推送 /api/youzan/webhook          → 聚水潭 → 云仓
```

## 本地开发

```bash
pnpm install
cp .env.example .env      # COMMERCE_PROVIDER=mock 时不需要任何凭证
pnpm dev                  # http://localhost:5173
```

接真实有赞：在 `.env` 里填好凭证，设 `COMMERCE_PROVIDER=youzan`，先跑 `pnpm youzan:probe` 自检。

## 检查

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

推送非 `main` 分支时，GitHub Actions（`.github/workflows/ci.yml`）会跑同样的检查，并启动网站做一遍冒烟测试。

## 结构

| 位置 | 作用 |
| --- | --- |
| `app/routes/_index.tsx` | 首页 logo 动画 |
| `app/routes/products.$handle.tsx` | KT2 商品页（`/products/album-product`） |
| `app/components/KillThomeTwoProduct.tsx`、`ShoeboxScene.tsx` | KT2 体验与 3D 鞋盒 |
| `app/lib/cart.tsx` | 浏览器本地购物车（只存商品和数量） |
| `app/routes/api.checkout.tsx` | 结账：服务端核对库存，返回有赞付款链接 |
| `app/routes/api.youzan.webhook.tsx` | 有赞消息推送（验签） |
| `app/lib/commerce/` | 商城提供方接口：`mock`、`youzan`；海外 Shopify 以后作为新的提供方加入 |
| `app/lib/youzan/` | 有赞 token、API、商品解析、下单页、推送验签 |
| `app/content/kt2.ts` | KT2 标题和描述文案 |

## 文档

- [docs/youzan-integration.md](docs/youzan-integration.md)：有赞云应用、能力包、IP 白名单、聚水潭、小程序、海外路线
- [docs/deploy.md](docs/deploy.md)：部署到国内服务器
