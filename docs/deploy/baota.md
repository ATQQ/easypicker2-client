---
outline: [2, 3]
---

:::danger ！！！推荐使用`Linux`系服务器！！！
下面的所有操作，均在 `Linux` 上进行，如果机器是装的`windows server` 部分操作可能需要远程桌面进行

👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻
:::

# 宝塔面板部署

在 **Linux** 上使用 [宝塔面板](https://www.bt.cn/) 部署 EasyPicker2，资源拉取与目录布局通过 **`@sugarat/easypicker2-cli`（命令 `ep2`）** 完成，与 [通用部署](./general.md) 同源，仅把「路径、数据库、反代」与宝塔操作对应起来。

## 1 配置机器环境

### 1.1 安装宝塔面板

详见 👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻

### 1.2 安装必要的软件

**一定要确认安装完毕! 重要的事情说三遍**

**一定要确认安装完毕! 重要的事情说三遍**

**一定要确认安装完毕! 重要的事情说三遍**

必备的**3**个软件列表

:::tip 推荐选择 Nginx
:::

在「软件商店」安装（均需 **安装完成** 后再继续）：

- 必须：**Nginx**（或 Apache；下文以 Nginx 为例），**MySQL、MongoDB**
- 可选：**PHP**、**phpMyAdmin**（管理 MySQL）

**注意，这里的软件需要自己在宝塔管理软件列表手动安装**

通过宝塔面板提供的软件商店进行安装

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzMwMzg2OQ==647483303869)

安装完后，可以把常用的加至首页

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzM3ODE4Mw==647483378183)

:::details 腾讯云 宝塔 MongoDB 安装失败
参考 https://www.bt.cn/bbs/thread-134959-1-1.html 解决
:::

### 1.3. 安装 Node

使用 Node 管理面板安装`Node`

:::tip 温馨提示 (重要的事情说 3 遍)
建议安装`Node 22`(大于等于`22`版本)

建议安装`Node 22`(大于等于`22`版本)

建议安装`Node 22`(大于等于`22`版本)

:::details Node 各版本生命周期

| Release  |       Status        |  Codename   | Initial Release | Active LTS Start | Maintenance Start | End-of-life |
| :------: | :-----------------: | :---------: | :-------------: | :--------------: | :---------------: | :---------: |
| [22.x][] | **Maintenance LTS** |   [Jod][]   |   2024-04-24    |    2024-10-29    |    2025-10-21     | 2027-04-30  |
| [24.x][] |   **Active LTS**    | [Krypton][] |   2025-05-06    |    2025-10-28    |    2026-10-20     | 2028-04-30  |
| [25.x][] |   **Maintenance**   |             |   2025-10-15    |        -         |    2026-04-01     | 2026-06-01  |

数据来源：https://github.com/nodejs/Release/blob/main/README.md

:::

安装路径：网站 => Node 项目

先安装 Node 版本管理面板

![](https://cdn.upyun.sugarat.top/mdImg/sugar/048ab2d782153e2c8bd754ff8520ecc9)

通过 Node 版本管理器安装需要的 Node 版本

![](https://cdn.upyun.sugarat.top/mdImg/sugar/5bec8f7f510d0c772349a9f3f495c274)

我这里就选择当下最新的稳定版咯`v22.11.0`

然后设置命令行版本为当前安装的版本

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d9586caeb2b19c634c125e668aa83c37)

:::tip 温馨提示
本文的所有`shell`指令无特殊说明，都是在宝塔面板的终端工具中运行
:::

测试是否正常安装`Node.js`，终端工具运行如下指令

```sh
node -v
```

有如下显示表明安装成功

![](https://cdn.upyun.sugarat.top/mdImg/sugar/9a16f766e47b723bdc304c06f6b4aa57)

:::details 提示没有 node 指令?
如果提示没有 node 指令，可手动向 `~/.bashrc` 文件添加如下配置

```sh
export PATH=$PATH:/www/server/nodejs/实际安装版本/bin
```

:::

### 1.4 安装CLI

安装全局依赖 和 CLI（在任意目录执行一次即可）：

```sh
npm config set registry https://registry.npmmirror.com/
npm i -g pnpm pm2 @sugarat/easypicker2-cli
ep2 --help
```

## 2. 创建网站与数据库

### 2.1 创建站点和数据库

点击`添加站点`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzAzMTExMg==647613031112)

**① 输入要绑定的域名 ② 创建数据库 ③ 自定义数据库账号 ④ 选择纯静态**

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjE4MzgyNg==676792183826)

数据填写完毕，点击提交即可，然后会自动帮助创建网站相关目录，并告知关联数据库账号和密码

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjQyMDM5Mg==676792420392)

**记得复制保存一下，后面会用上！！**

**记得复制保存一下，后面会用上！！**

::: details 我忘了数据库账号，密码等等？可以在哪看？
在数据库面板里就能找到我们创建的数据库

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NDk3ODc1Mw==676794978753)

点击小眼睛就能看见密码
:::

:::tip 我没有域名怎么办？
没有域名可以 [联系我](./../author.md)，给你绑定个`sugarat.top`下的3||4级域名

- 例如：https://ep.test.sugarat.top
- 例如：https://ep.dev.sugarat.top
  :::

:::details 我想用ip+端口访问，查看这里

**如果直接使用IP访问**，域名处就输入`你的机器IP加一个端口号`

格式`ip:port`，例如`39.156.66.18:3333`

:::warning 使用IP+端口注意事项
需在自己服务器的`防火墙`中开放使用的端口

例如`笔者`的腾讯云

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5Mjk1NDI4OA==647692954288)

不开放对应端口的话，是无法通过外网进行访问的

:::

### 2.2 一键部署前端

定位到网站所在目录，然后点击终端

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjUxNzc0NA==676792517744)

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjYwNzcyMA==676792607720)

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

:::details 我的脚本执行失败，怎么解决？

- 如果由于目录冲突，导致脚本执行失败，请手动删除`dist`目录
- 其它问题，[加反馈群](./../author.md)或者[联系作者](./../author.md)沟通
  :::

### 2.3 修改网站访问目录

按照图示，修改访问目录为 `dist`

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MzU3Mjg4OA==676793572888)

访问 http://ep.demo.sugarat.top 测试,就看到咱们的前端应用了

此时访问可以看到，页面会有一个报错提示

那是因为我们还没有配置后端服务，后面会有配置的流程

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MzY0MjgwMw==676793642803)

### 2.4 开启HTTPS

为网站添加`SSL`证书，开启 HTTPS 访问

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5Mzg1OTM0Mw==676793859343)

:::tip 温馨提示
宝塔提供了免费SSL证书点击申请即可，收集的信息自己一顿瞎填就行

申请完然后点击对应证书的部署按钮即可

部署完成后，（可选）点击右上角开启`强制HTTPS`，访问`HTTP`将会强制跳转到`HTTPS`
:::

::: danger 一些叮嘱
推荐给自己网站配上 `强制HTTPS` 保证网站的安全性

优先推荐使用`测试证书`，有效期更长（到期在申请即可，有数量限制）

`Let's Encrypt`，没什么限制，不用填资料，可以做到自动化，只是时间短一点 90天有效 需要频繁更换

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NDI5Mjk3Mw==676794292973)

当然一般腾讯云/阿里云服务器也有提供免费的SSL证书，详见各厂商文档
:::

## 3. 部署后端服务

### 3.1 使用CLI部署

定位到网站所在目录，然后点击终端

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjUxNzc0NA==676792517744)

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjYwNzcyMA==676792607720)

执行下述指令，自动完成服务的资源拉取和启动

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

:::details 我的脚本执行失败，怎么解决？

- 如果由于目录冲突，导致脚本执行失败，请手动删除`easypicker2-server/dist`目录
- 其它问题，[加反馈群](./../author.md)或者[联系作者](./../author.md)沟通
  :::

### 3.2 获取端口和管理面板账号

通过查询运行日志可以得到此信息

```sh
# 查询目标服务最近 100条 输出的常规日志
pm2 log --out ep-server --lines 100
```

在服务日志里，可以看到服务监听的端口，和运行打印的log日志情况

![](https://cdn.upyun.sugarat.top/mdImg/sugar/2bfb15e872b3a3eee5032abd89c49e6f)

在服务日志里，可以看到管理面板的账号密码

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NjUwNzU4OA==676796507588)

:::danger 拿小本本记下这个账号密码后面会用到！！！
:::

:::details 其它获取方式？
在 easypicker2-server 目录下，找到`user-config.json`文件，里面可以看到目标的配置

![](https://cdn.upyun.sugarat.top/mdImg/sugar/4efb67e389357a6015b488b6c1922a8d)

因此你也可以在这里面修改
:::

## 4 配置 Nginx

### 4.1 添加反向代理

打开网站的设置面板，点击添加反向代理，勾选`高级功能`

![](https://cdn.upyun.sugarat.top/mdImg/sugar/0aac9d7430fc43b5ab95875ba82eb55a)

<!-- ![](https://cdn.upyun.sugarat.top/mdImg/sugar/9c8acc3c31a141a5434b4ca191196652) -->

:::danger 重要提示，请一定按照指示进行操作！！！
代理名称随便填

- 代理目录`/api/`
- 目标 URL 填`自己的后端服务地址`，例如`http://127.0.0.1:3000`
  :::

::: details 提示 伪静态/nginx主配置/vhost/文件已经存在全局反向代理？，无法添加，请戳这里查看解法

进入此目录找到反向代理的配置文件

```sh
/www/server/panel/vhost/nginx/proxy/你的域名
```

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM4MjE4Mzc1Mw==656382183753)

如果找不到可以尝试手动直接添加下面的示例配置到配置文件中

示例配置

```sh
#PROXY-START/api

location ^~ /api/
{
    # 此处的服务端口改成你的服务地址，可能3000也可能是3001
    # 此处的服务端口改成你的服务地址，通过 pm2 logs指令 查看服务启动监听的端口
    # 此处的服务端口改成你的服务地址
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host 127.0.0.1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;

    add_header X-Cache $upstream_cache_status;

    #Set Nginx Cache

    #proxy_set_header Accept-Encoding "";
    # sub_filter "/api" "";
    # sub_filter_once off;

    set $static_file6DkW7ygY 0;
    if ( $uri ~* "\.(gif|png|jpg|css|js|woff|woff2)$" )
    {
        set $static_file6DkW7ygY 1;
        expires 12h;
    }
    if ( $static_file6DkW7ygY = 0 )
    {
        add_header Cache-Control no-cache;
    }
}
#PROXY-END/api
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/a6fca12d85e484a660596f1543bdee45)
:::

**如仍无法解决，可以重新尝试创建一个新站点，配置先进行反向代理，在做其它操作。如仍然无法解决可加群反馈。**

完成反向代理的配置后，我们就可以用上面提供的管理账号和密码进行服务相关配置的更新了

### 4.2 添加配置防止页面 404

**一定要在配置完反向代理之后再配置，不然宝塔面板有“伪静态”配置报错**

> 参考 [vue-router 官方文档:服务器配置示例](https://router.vuejs.org/zh/guide/essentials/history-mode.html#%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%85%8D%E7%BD%AE%E7%A4%BA%E4%BE%8B)

在对应网站设置面板，点击`配置文件`，加入以下配置。也可以添加到 宝塔面板的 “伪静态” 配置项中。

:::code-group

```sh [nginx]
# vue-router
location / {
   try_files $uri $uri/ /index.html;
}
```

```sh [apache]
    <Directory "/www/wwwroot/你的网站域名/dist">
        SetOutputFilter DEFLATE
        Options FollowSymLinks
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html index.htm default.php default.html default.htm

        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>
```

:::

方式 1(推荐)：伪静态配置项示意：

![](https://cdn.upyun.sugarat.top/mdImg/sugar/2358eed4bbf45c92284f39e270c23b68)

方式 2：直接加入配置项里示意：

|                                  Nginx                                  | Apache |
| :---------------------------------------------------------------------: | :----: |
| ![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5MzExMDgyMw==647693110823) |  TODO  |

## 5. 最后更新配置

1. 访问我们的网站进行登录
2. 输入上面拿到的账号密码

![](https://cdn.upyun.sugarat.top/mdImg/sugar/bd1c72f2a85aeb31dada5ded8a79b81e)

3. 登录后进入 **系统管理**，配置数据库、对象存储等。系统管理能力说明见 [系统管理](../introduction/feature/system.md)。

## 日常更新

```sh
cd /www/wwwroot/你的域名
ep2 deploy web
ep2 deploy server
```

再按 CLI 输出的 **更新** 步骤执行 `pnpm install --prod` 与 **`pm2 restart ep-server`**。

## 相关链接

- [CLI 命令说明](./cli.md)
- [通用部署](./general.md)
- [常见问题](./faq.md)
