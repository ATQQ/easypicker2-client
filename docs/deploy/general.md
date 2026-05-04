---
outline: [2, 3]
---

# 通用 Linux 部署（CLI）

适用于任意 **Linux** 单机：已安装 **Nginx**（或等价反代）、**Node.js**（建议 ≥ 18 LTS）、**MySQL / Redis / MongoDB**），不依赖宝塔图形界面时的推荐流程。

与 [CLI 命令说明](./cli.md) / [宝塔部署](./baota.md) 使用同一套 **`@sugarat/easypicker2-cli`（`ep2`）**。

:::danger 环境建议
推荐使用 **Linux** 服务器。**Windows Server** 下路径、常驻进程与 nginx 配置差异较大，本文以 Linux 为例。
:::

## 1. 准备运行环境

1. **Node.js**：`node -v` 建议 ≥ 18
2. **全局工具**（在项目目录外执行一次即可）：

```sh
npm config set registry https://registry.npmmirror.com/
npm i -g pnpm pm2 @sugarat/easypicker2-cli
```

3. 安装并启动 **MySQL、Redis、MongoDB**，记录 MySQL 库名 / 用户名 / 密码。

## 2. 规划目录与站点

任选部署根目录（示例 `/var/www/easypicker`），后续：

- 前端静态：**`<根目录>/dist`**（由 `ep2 deploy web` 生成）
- 服务端：**`<根目录>/easypicker2-server`**（由 `ep2 deploy server` 生成，也可用 `--dir` 改名）

为该站点准备一个 **域名**，DNS 指向本机；无域名时使用 `IP:端口` 并做好防火墙放行。

## 3. 初始化数据库表

任选其一：

**方式 A：官方 SQL**

从服务端仓库获取 `docs/sql/auto_create.sql`，在目标库执行导入。

**方式 B：一键脚本（与历史文档兼容）**

```sh
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s 数据库名 账号 数据库密码
```

确认出现业务表（如 `user`、`task` 等）后再继续。

## 4. 拉取前端资源

```sh
mkdir -p /var/www/easypicker && cd /var/www/easypicker

ep2 deploy web
# 按需：ep2 deploy web -i
```

完成后应存在 `./dist`。Nginx **`root`** 指向该 `dist`。

## 5. Nginx：静态站点 + SPA

在 **`location /`** 内使用 **`try_files`**，避免 Vue Router History 模式下刷新 404：

```nginx
server {
    listen 80;
    server_name your.domain.com;

    root /var/www/easypicker/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host 127.0.0.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        sub_filter "/api" "";
        sub_filter_once off;
    }
}
```

:::warning 后端实际端口
`proxy_pass` 中的端口必须与进程环境变量 **`SERVER_PORT`** 一致（未单独配置时不要假设一定是 `3000`，以 **`pm2 logs`** 日志为准）。**推荐**用 PM2 / 配置文件注入 `SERVER_PORT`，或使用前缀 `SERVER_PORT=4000 pm2 start npm …`。详见 [CLI 文档 `./cli.md#server-port`]。
:::

`nginx -t && systemctl reload nginx`（或你环境对应的 reload）后，仅访问前端可先看到页面（接口未连通时控制台可能报错，属预期）。

生产环境建议再配置 **HTTPS**（Let’s Encrypt 或云厂商证书）。

## 6. 拉取并启动服务端

```sh
cd /var/www/easypicker

ep2 deploy server --pm2-name ep-prod
```

在终端 **复制 CLI 打印的命令** 执行，通常包括：

```sh
cd '/var/www/easypicker/easypicker2-server'
pnpm install --prod
pm2 start npm --name ep-prod -- run start
pm2 save
```

首次启动后在 **`pm2 logs ep-prod`** 或目录下 **`user-config.json`** 中查看 **管理后台账号密码** 与监听端口；若端口不是 `3000`，请同步修改 Nginx `proxy_pass`。

## 7. 在管理后台写入配置

浏览器打开站点，使用上一步账号密码登录管理端，按界面要求填写 **MySQL、MongoDB、七牛云** 等（七牛见 [七牛云 OSS](./qiniu.md)）。保存后一般 **无需** 再改 Nginx；若修改了关键环境变量，可按需 `pm2 restart ep-prod`。

## 8. 更新版本

```sh
cd /var/www/easypicker
ep2 deploy web
ep2 deploy server --pm2-name ep-prod
# 再按 CLI 提示执行「更新」那一组：pnpm install --prod + pm2 restart
```

## 相关链接

- [CLI 详细参数](./cli.md)
- [宝塔图形化步骤](./baota.md)
- [Docker](./docker.md)
- [常见问题](./faq.md)
