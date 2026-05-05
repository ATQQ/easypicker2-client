---
outline: [2, 3]
---

# EasyPicker2 部署 CLI 说明（`ep2`）

独立包 [`@sugarat/easypicker2-cli`](https://www.npmjs.com/package/@sugarat/easypicker2-cli) 用于从 npm 拉取 **已发布的** 前端静态资源与服务端源码包，解压到本地目录，并打印后续需要手动执行的 `pnpm` / `pm2` 命令。

:::tip CLI 不负责的事
不会自动初始化 MySQL 表结构、不会替你执行 `pnpm install`、不会直接调用 PM2——这些步骤需在终端照着 CLI 输出的提示复制执行，或使用 [宝塔部署](./baota.md) / [通用部署](./general.md) 中与面板、脚本配合的说明。
:::

## 安装

```sh
npm i -g @sugarat/easypicker2-cli
```

安装后可使用 **`ep2`** 或 **`easypicker2`**，两者等价。

```sh
ep2 --help
ep2 -v
```

## 命令总览

| 形式                          | 说明                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| `ep2 deploy web [options]`    | 部署前端，生成站点根目录下的 `dist`                                       |
| `ep2 deploy server [options]` | 部署服务端到指定目录（默认 `easypicker2-server`），并打印 PM2 / pnpm 命令 |
| `ep2 web`、`ep2 server`       | 等价于上面省略 `deploy` 子命令                                            |

```text
用法:
  ep2 deploy web [options]
  ep2 deploy server [options]
  ep2 pm2 <start|restart|stop|delete|logs|list> [options]
```

## `ep2 deploy web`

从 registry 读取 `@sugarat/easypicker2-client` 的版本元数据，下载对应 tarball，解压后将构建产物拷贝到 **`--cwd` 指定的目录下的 `dist`**（默认是当前工作目录）。

```sh
cd /www/wwwroot/your-domain.com

ep2 deploy web
```

### 常用参数

| 参数                     | 说明                                                |
| ------------------------ | --------------------------------------------------- |
| `--tag <latest \| beta>` | dist-tag，默认 `latest`                             |
| `--version <x.y.z>`      | 精确版本，优先级高于 `tag`                          |
| `-i` / `--interactive`   | 交互式选择列表中的版本                              |
| `--registry <url>`       | npm registry，默认 `https://registry.npmmirror.com` |
| `--cwd <dir>`            | 工作目录，默认当前目录                              |
| `--keep-tarball`         | 保留下载与解压使用的临时目录（调试用）              |

### 示例

```sh
ep2 deploy web
ep2 deploy web -i
ep2 deploy web --tag beta
ep2 deploy web --version 2.7.3
ep2 deploy web --registry https://registry.npmjs.org
```

部署成功后，请将 **站点根目录** 指向生成的 `dist`（与 Nginx `root` / 宝塔「网站目录」一致）。

## `ep2 deploy server`

下载 `@sugarat/easypicker2-server` 的资源包并解压到 **`--dir`（相对于 `--cwd`）** 指定的目录，默认 `./easypicker2-server`。

CLI **仅打印** 建议执行的命令：

- **首次**：`cd` 到服务端目录、`pnpm install --prod`、`pm2 start ...`、`pm2 save`
- **更新**：`pnpm install --prod`、`pm2 restart <name>`
- 以及查看日志、可选的 `pm2 startup` / `save` / `resurrect` 说明
- **`SERVER_PORT` 监听端口**：见下文

### 指定服务端监听端口（`SERVER_PORT`） {#server-port}

服务端实际监听端口由运行时环境变量 **`SERVER_PORT`** 决定（源码中 `serverConfig.port` 读取 `process.env.SERVER_PORT`）。**Nginx / 宝塔反向代理的目标端口必须与之一致**。

可选做法（与 `ep2 deploy server` 结束后终端中的提示一致）：

1. **PM2「环境变量」或 `ecosystem` 配置文件**（推荐）：为该进程写入 `SERVER_PORT=<端口>`，与宝塔面板里 Node/PM2 项目的环境变量配置一致。
2. **Linux / macOS 启动前缀**（作用于本次 `pm2 start` 拉起的进程）：`SERVER_PORT=4000 pm2 start npm …`
3. **`.env`**：可把 `SERVER_PORT` 写入服务端根目录 `.env`，但当前发布包的 `pnpm start` / `npm run start` 为 **`node ./dist/index.js`**，并不会自动载入 `.env`；若你希望从文件取值，须在启动脚本或宿主环境中先 `export` / 或使用支持 `env_file` 的工具，或直接采用前两种方式。

改端口后请记住：**反向代理 `proxy_pass` 的端口**、`pm2 logs` / 启动日志里的监听地址要对应更新。

### 常用参数

| 参数                                                  | 说明                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `--tag` / `--version` / `-i` / `--registry` / `--cwd` | 与 web 语义相同                                       |
| `--dir <relativePath>`                                | 服务端目录（相对 `--cwd`），默认 `easypicker2-server` |
| `--pm2-name <name>`                                   | PM2 进程名，默认 `ep-server`                          |
| `--overwrite-env`                                     | 若目标目录已有 `.env`，允许覆盖写入                   |
| `--keep-tarball`                                      | 保留临时目录                                          |

### 示例

```sh
cd /www/wwwroot/your-domain.com

ep2 deploy server --pm2-name ep-prod
ep2 deploy server -i --tag beta
ep2 deploy server --version 2.7.3 --dir ./server
```

解压完成后，请在终端 **按 CLI 输出逐条复制执行**（需已全局安装 `pnpm` 与 `pm2`，见部署文档环境准备）。

## `ep2 pm2 ...`

打印指定 PM2 操作的参考命令（**不替你执行 PM2**），便于对齐文档或服务名。

```sh
ep2 pm2 start --name ep-prod --dir ./easypicker2-server
ep2 pm2 restart --name ep-prod
ep2 pm2 logs --name ep-prod
```

`-dir` / `--cwd` 会解析为服务端根目录（与 `easypicker2-cli` 中 `deploy server` 的目录概念一致）。

## Registry 与国内网络

默认使用 `npmmirror`，若拉包失败可换官方源或其它镜像：

```sh
ep2 deploy web --registry https://registry.npmjs.org
```

## 与私有化部署文档的关系

- [宝塔面板部署](./baota.md)：在宝塔里完成建站、数据库、Nginx、`ep2` 与 PM2 的衔接。
- [通用部署](./general.md)：不依赖宝塔的同等流程简述。
- 历史基于 `q ep` / Shell 脚本的方式仍可参考 [线上部署(v3)](./online-v3.md) 中与当前环境不一致的步骤仅作存档。
