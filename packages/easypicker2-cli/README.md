# @sugarat/easypicker2-cli

EasyPicker2 独立部署 CLI。

核心职责：

- 拉取 `@sugarat/easypicker2-client` 的 `dist` 资源并部署到本地 `dist` 目录
- 拉取 `@sugarat/easypicker2-server` 的服务端资源并部署到本地服务目录
- 输出 `pnpm` / `pm2` 指令，让用户复制后自行执行

## 安装

```sh
npm i -g @sugarat/easypicker2-cli
```

安装后可使用 `ep2` 或 `easypicker2` 命令。

## 本地开发

在仓库根目录安装依赖并构建 CLI：

```sh
pnpm install
pnpm --filter @sugarat/easypicker2-cli build
```

将本地包 link 到全局，之后就可以直接使用 `ep2` 或 `easypicker2`：

```sh
cd packages/easypicker2-cli
pnpm link --global
ep2 --help
```

开发时可以启动 TypeScript 监听构建：

```sh
pnpm --filter @sugarat/easypicker2-cli dev
```

修改代码后，全局 `ep2` 会指向当前本地包，重新构建即可验证最新代码。

取消全局 link：

```sh
pnpm remove --global @sugarat/easypicker2-cli
```

## 部署前端

```sh
ep2 deploy web
```

默认会从 `https://registry.npmmirror.com` 拉取 latest 版本，并把前端资源部署到当前目录的 `dist`。

如需手动选择版本，可以开启交互式模式：

```sh
ep2 deploy web -i
```

## 部署服务端

```sh
ep2 deploy server --pm2-name ep-prod
```

默认会把服务端资源部署到当前目录的 `easypicker2-server`，完成后打印安装依赖和启动服务的指令。

服务端部署完成后，CLI 会按场景输出命令：

- 首次部署：执行安装依赖、`pm2 start`、`pm2 save`
- 更新代码：执行安装依赖、`pm2 restart`
- 查看状态：执行 `pm2 list` 或 `pm2 logs`
- **监听端口**：由环境变量 `SERVER_PORT` 决定。**推荐**在 PM2 / 宝塔面板为该进程写入 `SERVER_PORT`；也可用 Linux 前缀 `SERVER_PORT=4000 pm2 start npm --name xxx -- run start`。`deploy server` 结束后终端会再次出现简要说明。
- 可选补充：按需执行 `pm2 startup`、`pm2 save`、`pm2 resurrect`

## 常用参数

```sh
ep2 deploy web --tag beta
ep2 deploy web --interactive
ep2 deploy server -i --tag beta
ep2 deploy server --version 2.7.3
ep2 deploy server --dir ./server --pm2-name ep-prod
ep2 deploy server --registry https://registry.npmjs.org
```

## PM2 指令

CLI 只打印命令，不直接操作 PM2：

```sh
ep2 pm2 start --name ep-prod --dir ./easypicker2-server
ep2 pm2 restart --name ep-prod
ep2 pm2 logs --name ep-prod
```
