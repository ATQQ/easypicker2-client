---
outline: [2, 3]
---

# 宝塔面板部署（CLI）

在 **Linux** 上使用 [宝塔面板](https://www.bt.cn/) 部署 EasyPicker2，资源拉取与目录布局通过 **`@sugarat/easypicker2-cli`（命令 `ep2`）** 完成，与 [通用部署](./general.md) 同源，仅把「路径、数据库、反代」与宝塔操作对应起来。

:::tip 前置阅读
完整参数见 [CLI 命令说明](./cli.md)。本文不重复解释每个 flag。
:::

## 1. 面板与软件

1. 按官网说明安装宝塔。
2. 在「软件商店」安装（均需 **安装完成** 后再继续）：
   - **Nginx**（或 Apache；下文以 Nginx 为例）
   - **MySQL、Redis、MongoDB**
   - **PHP**、**phpMyAdmin**（管理 MySQL）

:::details MongoDB 在腾讯云等环境安装失败
可参考 [宝塔论坛相关讨论](https://www.bt.cn/bbs/thread-134959-1-1.html) 排查。
:::

## 2. 安装 Node 与 CLI

推荐使用宝塔 **「网站 → Node 项目 → Node 版本管理」** 安装 **Node ≥ 18**，并在面板里设为 **命令行默认版本**。在 **宝塔终端** 验证：

```sh
node -v
```

安装全局依赖（在任意目录执行一次即可）：

```sh
npm config set registry https://registry.npmmirror.com/
npm i -g pnpm pm2 @sugarat/easypicker2-cli
ep2 --help
```

若提示找不到 `node`，可将 Node 的 `bin` 目录加入 `~/.bashrc` 的 `PATH`（路径以面板实际安装为准），例如：

```sh
export PATH=$PATH:/www/server/nodejs/v18.x.x/bin
```

## 3. 创建网站与数据库

1. **网站 → 添加站点**：填写域名（无域名可参考 [通用部署](./general.md) 中 IP:端口）、类型选 **静态**（或纯静态）；可同时创建 MySQL 库并记下 **库名 / 用户名 / 密码**。
2. 记录站点 **根目录**，例如：`/www/wwwroot/ep.example.com` —— 下文统称 **站点目录**。

## 4. 初始化 MySQL 表

CLI **不包含** 建表逻辑，任选其一：

**方式 A：脚本（与旧版文档一致）**

在宝塔终端执行（参数换成你的库名、账号、密码）：

```sh
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s 数据库名 账号 数据库密码
```

**方式 B：phpMyAdmin**

导入服务端仓库中的 [`docs/sql/auto_create.sql`](https://github.com/ATQQ/easypicker2-server/blob/master/docs/sql/auto_create.sql)。

## 5. 部署前端（`ep2 deploy web`）

在宝塔中进入 **站点目录** → **终端**，执行：

```sh
cd /www/wwwroot/你的域名

ep2 deploy web
# 需要选版本时：ep2 deploy web -i
```

成功后当前目录下会有 **`dist`**。在 **网站 → 设置 → 网站目录**，将 **运行目录** 指向 **`/dist`**（或把站点根目录改为带 `dist` 的路径，与面板选项一致即可）。

## 6. HTTPS 与 SPA（避免刷新 404）

1. **SSL**：在站点设置中申请并部署证书（宝塔测试证书 / Let’s Encrypt / 云证书均可）。
2. **History 路由**：在 **伪静态** 或 **配置文件** 的 `location /` 中加入：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

若先配伪静态再配反向代理报冲突，可先完成 **反向代理** 再补本段（与 [线上部署 v3](./online-v3.md) 中说明一致）。

## 7. 部署服务端（`ep2 deploy server`）

仍在 **站点目录** 终端：

```sh
cd /www/wwwroot/你的域名

ep2 deploy server --pm2-name ep-prod
# 目录想自定义：--dir ./easypicker2-server（默认即此相对路径）
```

终端会打印 **首次部署** 或 **更新** 两组命令，请 **整段复制执行**，一般包括：

```sh
cd '/www/wwwroot/你的域名/easypicker2-server'
pnpm install --prod
pm2 start npm --name ep-prod -- run start
pm2 save
```

:::warning 目录冲突
若解压失败，可先删除旧的 `easypicker2-server`（或你自定义的 `--dir`）再执行 `ep2 deploy server`。需要覆盖环境中的 `.env` 时使用 `--overwrite-env`（慎用）。
:::

**监听端口**：由 **`SERVER_PORT`** 控制；**首推**宝塔 / PM2 项目里配置环境变量，或使用 `SERVER_PORT=端口 pm2 start …`。详见 [CLI 文档](./cli.md#server-port)。

在 **`pm2 logs ep-prod`** 或服务端目录 **`user-config.json`** 中查看 **管理后台账号密码** 与 **当前监听端口**。若实际端口不是 **3000**，下一步反代的「目标 URL」必须写同一端口。

## 8. 配置反向代理 `/api/`

**网站 → 设置 → 反向代理 → 高级**：

| 项目     | 填写                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| 代理目录 | `/api/`                                                                         |
| 目标 URL | `http://127.0.0.1:端口/`（**末尾保留 /**，端口与 PM2 日志一致）                 |
| 替换     | 将 `/api` 替换为空（宝塔「内容替换」中旧路径 `/api`、新路径留空，与旧文档一致） |

若面板提示「已存在」无法添加，可到 `/www/server/panel/vhost/nginx/proxy/你的域名` 手工合并 `location ^~ /api/` 块，示例见 [线上部署 v3 中「添加反向代理」](./online-v3.md)。

## 9. 管理后台与环境变量

1. 浏览器打开你的域名，使用上一步账号密码登录。
2. 在面板中配置 **MySQL、MongoDB、七牛云** 等（七牛见 [七牛云 OSS](./qiniu.md)）。
3. 配置保存后多数情况 **无需** 重启；若直接改了 `user-config.json` 或 `.env`，可 `pm2 restart ep-prod`。

## 10. 日常更新

```sh
cd /www/wwwroot/你的域名
ep2 deploy web
ep2 deploy server --pm2-name ep-prod
```

再按 CLI 输出的 **更新** 步骤执行 `pnpm install --prod` 与 **`pm2 restart ep-prod`**。

## 相关链接

- [CLI 命令说明](./cli.md)
- [通用部署](./general.md)
- [常见问题](./faq.md)
