# 部署到国内服务器

网站是一个普通的 Node 应用（React Router + `react-router-serve`）。它需要：

- 一台**中国大陆地域**的云服务器（阿里云、腾讯云的轻量应用服务器或 ECS 都可以），带**固定公网 IP**。
- 一个**已经 ICP 备案的域名**，解析到这台服务器，并配好 HTTPS。
- 把服务器的公网 IP 加进有赞云应用的 **IP 白名单**（否则调接口会报 4007）。
- 有赞云「消息推送」地址填 `https://<域名>/api/youzan/webhook`。

## 第一次部署

```bash
# 服务器上（Node 20.6+，建议 22）
npm install -g pnpm@10.17.0 pm2
git clone https://github.com/JoblessCoding7/WYRDWYRDWYRD.git wyrd && cd wyrd
git checkout feature/youzan-china
pnpm install --frozen-lockfile
cp .env.example .env    # 填好有赞凭证，COMMERCE_PROVIDER=youzan
pnpm youzan:probe       # 确认 token、商品都正常
pnpm build
pm2 start "node --env-file=.env node_modules/@react-router/serve/bin.js ./build/server/index.js" --name wyrd
pm2 save
```

应用默认监听 3000 端口。前面放 Nginx 做 HTTPS 和反向代理：

```nginx
server {
  listen 443 ssl http2;
  server_name wyrd.example.cn;            # 换成备案域名
  ssl_certificate     /etc/ssl/wyrd.pem;  # 云厂商可免费签发证书
  ssl_certificate_key /etc/ssl/wyrd.key;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

## 更新

```bash
git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart wyrd
```

## 注意

- `.env` 只放在服务器上，不要提交到 git。
- 有赞推送要求 5 秒内回应；服务器重启期间收到的推送，有赞会自动重推。
- 这个分支不再部署到 Shopify Oxygen。合并到 `main` 之前，要先决定 `.github/workflows/oxygen-deployment-*.yml` 怎么处理（删除或停用），否则 `main` 上的 Oxygen 部署会失败。
