---
outline: [2,3]
---

# 线上部署(v3 · 归档)

::: tip 推荐使用独立 CLI：`ep2`
当前 **推荐** 的私有化部署方式为 [`@sugarat/easypicker2-cli`](https://www.npmjs.com/package/@sugarat/easypicker2-cli)：请优先阅读 **[CLI 说明](./cli.md)**、 **[宝塔面板部署](./baota.md)**、 **[通用 Linux 部署](./general.md)**。
本文保留基于 **`q ep`（`@sugarat/cli` + `cli-plugin-ep`）** 的图文步骤与截图，便于与老环境对齐；新开站点建议直接按新版文档执行。

:::

:::danger ！！！推荐使用`Linux`系服务器！！！
下面的所有操作，均在 `Linux` 上进行，如果机器是装的`windows server` 部分操作可能需要远程桌面进行

👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻
:::

## 1 配置机器环境

### 1.1 安装宝塔面板

详见 👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻

### 1.2 安装必要的软件

**一定要确认安装完毕! 重要的事情说三遍**

**一定要确认安装完毕! 重要的事情说三遍**

**一定要确认安装完毕! 重要的事情说三遍**

必备的**6**个软件列表

- Nginx 或 Apache (优先推荐 Nginx)
- 数据库
  - redis
  - mysql
  - MongoDB

* PHP（mysql数据库管理工具需要的环境）
* phpMyAdmin（mysql数据库管理工具）

**注意，这里的软件需要自己在宝塔管理软件列表手动安装**

通过宝塔面板提供的软件商店进行安装

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzMwMzg2OQ==647483303869)

安装完后，可以把常用的加至首页

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzM3ODE4Mw==647483378183)

:::details 腾讯云 宝塔 MongoDB 安装失败
参考 https://www.bt.cn/bbs/thread-134959-1-1.html 解决
:::

### 1.3 安装Node

使用 Node 管理面板安装`Node`

:::tip 温馨提示 (重要的事情说 3 遍)
建议安装`Node 18`(大于等于`18.16.0`版本)

建议安装`Node 18`(大于等于`18.16.0`版本)

建议安装`Node 18`(大于等于`18.16.0`版本)
:::

:::details Node 各版本生命周期

数据来源：https://github.com/nodejs/Release/blob/main/README.md

![](https://img.cdn.sugarat.top/mdImg/MTY4MzExNTA4NTcyNw==683115085727)
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

:::details (旧) 通过 PM2 安装 Node
![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzQ0MjUzMg==647483442532)
:::

### 1.4 安装辅助CLI工具

执行如下指令安装

```sh
npm i -g @sugarat/cli --registry=https://registry.npmmirror.com
```

安装完后你将得到一个 `q` 指令，执行 `q --version` 即可查询版本情况

```sh
q --version
```

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MTIwODU5Ng==676791208596)

有版本信息表明安装成功

紧接着通过`q`指令安装 `@sugarat/cli-plugin-ep` 插件

**后续大部分部署工作由此插件提供支持**

```sh
q add ep
```

后续更新插件只需要执行

```sh
q update
```

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MTQyNjExOQ==676791426119)

:::tip q add ep 执行结果示例

```sh
🌩 正在安装插件 @sugarat/cli-plugin-ep ，请稍等
完成 ep 指令安装 0.1.1
执行 q ep --help 查看细节
```

:::

### 1.5 初始化 Node 相关环境

:::tip 温馨提示
可重复执行，用于检查环境，不会重复安装已有库

下述方式选择其一即可
:::

手动执行 shell 指令安装，稳定不出错

```sh
# 设置镜像源为 npm 国内镜像源
npm config set registry https://registry.npmmirror.com/

# 安装 nrm
npm i -g nrm

# 安装 pnpm
npm i -g pnpm

# 安装 pm2
npm i -g pm2
```

:::details 我相知道，这些库是干嘛的?

- [node](https://nodejs.org/zh-cn/): `JavaScript` 服务端运行时
- [nrm](https://github.com/Pana/nrm): `npm` 镜像源切换工具
- [pnpm](https://pnpm.io/zh/): 快速的，节省磁盘空间的包管理工具
- [pm2](https://pm2.keymetrics.io/): 守护进程管理工具
  :::

**如果在执行过程中出现问题或后续启动服务时出现问题，可进行重新安装**

_如遇解决不了的问题，可加群反馈_

## 2 创建网站

### 2.1 创建站点和数据库

点击`添加站点`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzAzMTExMg==647613031112)

**① 输入要绑定的域名 ② 创建数据库 ③ 自定义数据库账号 ④ 选择纯静态**

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjE4MzgyNg==676792183826)

数据填写完毕，点击提交即可，然后会自动帮助创建网站相关目录，并告知关联数据库账号和密码

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjQyMDM5Mg==676792420392)

**记得复制保存一下，后面会用上！！**

**记得复制保存一下，后面会用上！！**

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

执行下述指令：部署客户端，默认选择最新的稳定版本即可

```sh
q ep deploy
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/7e7fcc04084ca592e9cd59dbda20367b)

:::tip 终端展示如下

```sh
q ep deploy

┌   部署 EasyPicker 项目
│
◆  选择部署端
│  ● 客户端 - client
│  ○ 数据库 - mysql
│  ○ 服务端 - server
└
```

:::details 交互式部署结果

```sh
┌   部署 EasyPicker 项目
│
◇  选择部署端
│  客户端 - client
│
◇  选择部署版本
│  稳定版 - latest
│
◇  选择具体版本
│  2.5.0
│
◇  资源包拉取完成 (easypicker2-client-2.5.0.tgz)
│
◇  资源解压完成（目录：./dist）
│
└  部署完成！🎉，记得设置 nginx 访问目录为 dist 目录

```

:::

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

### 2.5 导入数据库表数据

咱们前面在创建站点的时候已经创建了数据库，这一步只需要做表数据的导入

::: details 前面忘了创建数据库咋办？如何进行手动创建？
![](https://img.cdn.sugarat.top/mdImg/MTY1NjM4MTUzNDExMA==656381534110)

在数据库面板，点击添加数据库

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MjU0MDYwNg==647652540606)

:::danger 注意事项!!!

- **密码推荐使用随机的，输入数据库名字即可（账号默认和数据库名一致）**
- **数据库名记得小写**
  :::

```sh
q ep deploy
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/4df2acc73f022b05fd77f32688d7f1fa)

:::tip 终端展示如下

```sh
q ep deploy

┌   部署 EasyPicker 项目
│
◆  选择部署端
│  ○ 客户端 - client
│  ● 数据库 - mysql
│  ○ 服务端 - server
└
```

:::details 交互式部署结果

```sh
┌   部署 EasyPicker 项目
│
◇  选择部署端
│  数据库 - mysql
│
◇  请输入数据库名称
│  ep_test2_sugarat
│
◇  请输入数据库用户名
│  ep_test2_sugarat
│
◇  请输入数据库密码
│  xxxxxxx
│
◇  再次确认上述录入的数据库信息是否正确？
│  Yes
│
◇  表导入完成
Tables_in_ep_test2_sugarat
category
files
people
task
task_info
user

mysql: [Warning] Using a password on the command line interface can be insecure.

│
◇  ✅ 完成 user-config.json 检查
│
◇  ✅ 数据库配置完成写入
│
└  mysql 数据表初始化完成！🎉

```

:::

::: details 我忘了数据库账号，密码等等？可以在哪看？
在数据库面板里就能找到我们创建的数据库

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NDk3ODc1Mw==676794978753)

点击小眼睛就能看见密码
:::

这样`6`张表，就直接初始化完成啦

:::details 手动导入sql？
sql 脚本可以前往 Github 查看

https://github.com/ATQQ/easypicker2-server/blob/master/docs/sql/auto_create.sql
:::

## 3. 部署后端服务

### 3.1 使用CLI部署

定位到网站所在目录，然后点击终端

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjUxNzc0NA==676792517744)

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjYwNzcyMA==676792607720)

执行下述指令，自动完成服务的资源拉取和启动

```sh
q ep deploy
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/b5898c38c6823ec4aa023311b332162c)

:::tip 终端展示如下

```sh
q ep deploy

┌   部署 EasyPicker 项目
│
◆  选择部署端
│  ○ 客户端 - client
│  ○ 数据库 - mysql
│  ● 服务端 - server
└
```

:::details 交互式部署结果

```sh
┌   部署 EasyPicker 项目
│
◇  选择部署端
│  服务端 - server
│
◇  选择部署版本
│  稳定版 - latest
│
◇  选择具体版本
│  2.7.1
│
◇  资源包拉取完成 (easypicker2-server-2.7.1.tgz)
│
◇  资源解压完成（目录：./easypicker2-server）
│
◇  依赖安装完成 (use pnpm)
```

:::

如果没有提示 `部署完成！🎉，记得配置反向代理` 则需手动完成后续步骤！

![](https://cdn.upyun.sugarat.top/mdImg/sugar/5eaad999c6dad95e60523021d67ce378)

```sh
# 定位到 easypicker2-server 目录
cd easypicker2-server

# 安装依赖
pnpm install

# 使用 pm2 启动服务

pm2 start npm --name ep2-server -- run start
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d36c58955c4eef441a363ae77319002b)

:::details 我的脚本执行失败，怎么解决？

- 如果由于目录冲突，导致脚本执行失败，请手动删除`easypicker2-server/dist`目录
- 其它问题，[加反馈群](./../author.md)或者[联系作者](./../author.md)沟通
  :::

### 3.2 获取端口和管理面板账号

通过查询运行日志可以得到此信息

```sh
# 查询目标服务最近 100条 输出的常规日志
pm2 log --out ep2-server --lines 100
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

### 3.3 pm2 常用操作

查看服务列表

```sh
pm2 ls
```

启动 ep-server 新服务

```sh
pm2 start npm --name 自定义的服务名 -- run start
```

重启指定服务

```sh
pm2 restart 目标的服务名
```

查看指定服务日志

```sh
pm2 log 目标的服务名

# 输出最近 100条 输出的常规日志
pm2 log --out 目标的服务名 --lines 100

# 输出最近 100条 输出的错误日志
pm2 log --err 目标的服务名 --lines 100
```

## 4 配置 Nginx

### 4.1 添加反向代理

打开网站的设置面板，点击添加反向代理，勾选`高级功能`

![](https://cdn.upyun.sugarat.top/mdImg/sugar/9c8acc3c31a141a5434b4ca191196652)

:::danger 重要提示，请一定按照指示进行操作！！！
代理名称随便填

- 代理目录`/api/`
- 目标 URL 填`自己的后端服务地址`，例如`http://127.0.0.1:3000/`
  - 末尾一定要带`/`
- 内容替换`/api`,第二个留空
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
    sub_filter "/api" "";
    sub_filter_once off;

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
3. 在新面板中进行相应配置更新

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzOTEzNzg1Ng==659939137856)

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5OTQwNTY2Nw==676799405667)

:::details 标红的为必要更新的字段

- MySQL
  - 数据库名
  - 用户名
  - 密码
- MongoDB
  - 数据库名：例如 ep-prod,ep-test,ep-log
- 七牛云
  - AccessKey
  - SecretKey
  - 存储空间名
  - 绑定的域名
  - 存储区域
    :::

:::danger 从哪获取这些变量？

### MySQL 相关

MySQL 的账号密码在数据库面板获取，即前面创建的数据库账号密码

### MongoDB

这里只需要填入数据库名，格式 `小写+连字符`

例如 `ep-prod`, `ep-test`, `ep-log`

### 七牛云相关配置

参考[七牛云OSS服务创建](./qiniu.md)文章，获取七牛云相关的几个环境变量

### 腾讯云相关配置（可选）

不接入短信登录可以不配
:::

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzOTAyNDM2OA==659939024368)

更新完立马生效

:::details 如何不通过面板修改配置？
后端服务启动后会创建一个 user-config.json 文件

![](https://img.cdn.sugarat.top/mdImg/MTY5Nzk2NTc3MjM0MQ==697965772341)

这个 JSON 文件里面就是我们的配置信息，可以直接修改

配置项格式如下

```json
{
  "type": "mysql",
  "key": "host",
  "value": "localhost",
  "isSecret": false
}
```

修改后按下述方式重启服务即可
:::

当然，为预防一些意外情况，可以在都配置完后，通过如下指令重启一下服务

```sh
# 服务名可以通过 pm2 ls 查看

pm2 restart 服务名
```

![](https://cdn.upyun.sugarat.top/mdImg/sugar/3f1f3167da8dd55062ac068c4aaba0ef)

到此所有的配置都搞定了，ღ( ´･ᴗ･` )比心。感谢赖心阅读

## 99. 其余功能

### 开启内容压缩

在之前添加的反向代理配置里

添加`#`注释或者删掉 `proxy_set_header Accept-Encoding "";`

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5Nzk5MzUwMw==676797993503)

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5MzM2MDI3OQ==647693360279)

这样返回的内容会进行压缩，响应速度会有所提升

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5ODAzNDkxMw==676798034913)

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5Mzg3MDc2NA==647693870764)

### 配置管理员权限

账号加了管理员权限后，就能看到后台管理的入口

- 查看访问日志
- 管理用户账号

| 添加前                                                                  | 添加后                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDAzOTMxNg==647694039316) | ![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDMxMDE1OA==647694310158) |

打开对应的数据库

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDE5NTQyMA==647694195420)

选择`user`表

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDI0NjM5Ng==647694246396)

修改账号的`power`字段值为`0`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDE1NTczMg==647694155732)

然后重新登录账号，就能看到入口了

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDMxMDE1OA==647694310158)

大功告成

有其它问题可以小群交流，方便可以加入及时交流沟通问题: 685446473

![](https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjI3MzUwMw==647752273503)
