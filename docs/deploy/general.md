---
outline: [2, 3]
---

# 通用部署流程

<!-- :::tip 通用的部署流程介绍

::: -->

## 1. 准备运行环境

1. **Node.js**：`node -v` 建议 ≥ 22
2. **全局工具**（在项目目录外执行一次即可）：

```sh
# 设置镜像源
npm config set registry https://registry.npmmirror.com/
# 安装需要用到的该工具
npm i -g pnpm pm2 @sugarat/easypicker2-cli
```

3. 数据库：安装并启动 **MySQL、MongoDB**，记录 MySQL 库名 / 用户名 / 密码。

:::details 这些工具干什么用的？

1. Node.js: 服务端运行环境
2. pnpm: 依赖安装
3. pm2: 守护进程运行 Node.js 应用
4. @sugarat/easypicker2-cli: 项目部署CLI
5. MySQL: 存储核心用户数据
6. MongoDB: 服务运行过程中的各种日志
   :::

环境准备好后就可以开始了，后面的就非常简单！

## 2. 准备部署目录

任选部署根目录（示例 `/var/www/easypicker`），后续：

- 前端静态：**`<根目录>/dist`**（由 `ep2 deploy web` 生成）
- 服务端：**`<根目录>/easypicker2-server`**（由 `ep2 deploy server` 生成）

示例

```sh
mkdir -p ep-tests/

cd ep-tests
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d9730015cd0cd8574ec30d2fce961b51)

## 3. 部署

### 3.1 部署前端

在咱刚刚创建的目录运行

```sh
ep2 deploy web
```

默认会拉取最新的版本
![](https://cdn.upyun.sugarat.top/mdImg/sugar/db44c3ae5b1de568bc3f0f848fc2c9f2)

选择其他版本

```sh
ep2 deploy web -i
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/c3129983075d44e20627d45b3490dbb1)

资源会存储到 `/dist` 目录下

### 3.2 部署后端

```sh
ep2 deploy server
```

默认会拉取最新的版本

![](https://cdn.upyun.sugarat.top/mdImg/sugar/0d495edfd3165a9b0eaa7cf7b9960ffc)

选择其他版本

```sh
ep2 deploy server -i
```

按提示启动后端

```sh
# 进入服务端资源目录
cd easypicker2-server

# 安装依赖
pnpm install --prod

# 启动，默认3000端口监听
pm2 start npm --name ep-server -- run start

# 指定端口 3001
SERVER_PORT=3001 pm2 start npm --name ep-server -- run start

# 存储进程信息，方便机器重启后恢复
pm2 save
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/4fd2ad4c9b28090af0653208e69b1be3)

查看启动日志

```sh
pm2 log --out ep-server --lines 100
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d1092f786659b95edbb5d6c19342039d)

记录这里打印的`服务端口`,`管理面板账号`和`密码`后续会用到

## 4. 启动 Web 服务

使用 Web Server 代理前端静态资源和反向代理后端接口

### 4.1 本地预览效果

在刚刚创建的根目录运行

```sh
npx live-server dist --host=0.0.0.0 --port=8080 --proxy=/api:http://127.0.0.1:3001 --entry-file=index.html
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d45008733bd5ea388ceb73416df4d3c1)

本地访问：`http://127.0.0.1:8080/` 即可打开页面看到相关效果

### 4.2 使用 Nginx

下面是一份最小可用的 `server` 示例（请按需改 `server_name`、`root`、`proxy_pass` 端口；**`proxy_pass` 端口默认按上文 PM2 的 3000**，若上一节 `live-server` 示例用的是 `3001`，此处改为 `3001`）：

```nginx
server {
    listen 80;
    server_name _;  # 或你的域名

    root /var/www/easypicker/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 与 4.1 中 live-server 的 --proxy=/api:… 等价：/api/* 转发到本机后端
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

_一般线上环境使用_

## 5. 最后的配置

在浏览器访问 **你的站点地址**（本地则为 `http://127.0.0.1:8080/`，线上则为绑定的域名或服务器 IP，与 Nginx `server_name` 一致）。

使用 **管理面板账号、密码** 登录。

账号信息在 **启动服务时终端 / `pm2 log` 输出** 中可见，也可在服务端目录 **`easypicker2-server/user-config.json`** 中查看。

![](https://cdn.upyun.sugarat.top/mdImg/sugar/bd1c72f2a85aeb31dada5ded8a79b81e)

登录后进入 **系统管理**，配置数据库、对象存储等。系统管理能力说明见 [系统管理](../introduction/feature/system.md)。

## 相关链接

<!-- TODO -->

- [CLI 详细参数](./cli.md)
- [宝塔图形化步骤](./baota.md)
- [Docker](./docker.md)
- [常见问题](./faq.md)
