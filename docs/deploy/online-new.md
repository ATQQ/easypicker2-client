---
outline: [2,3]
---

# 线上部署 - 使用宝塔面板(v2)

:::danger 此为旧版操作文档，供老朋友做一下使用参考
**此为旧版操作文档，供老朋友做一下使用参考**
:::

:::tip 推荐阅读
当前推荐：**[CLI 命令说明](./cli.md)** · **[宝塔部署](./baota.md)** · **[通用部署](./general.md)**。
历史图文仍可见：[线上部署(v3)](./online-v3.md)（基于 `q ep`）。
:::

:::danger ！！！推荐使用`Linux`系服务器！！！
下面的所有操作，均在 `Linux` 上进行，如果机器是装的`windows server` 部分操作可能需要远程桌面进行

👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻
:::

## 1 配置机器环境

### 1.1 安装宝塔面板

详见 👉🏻 **[宝塔面板官方安装教程](https://www.bt.cn/)** 👈🏻

### 1.2 安装必要的软件

通过宝塔面板一顿点点点旧安装完成了

:::details 查看必备的**7**个软件列表

- Nginx
- PM2
- 数据库
  - redis
  - mysql
  - MongoDB
- phpMyAdmin
- PHP
  :::

通过宝塔面板提供的软件商店进行安装

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzMwMzg2OQ==647483303869)

安装完后，可以把常用的加至首页

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzM3ODE4Mw==647483378183)

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

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzQ0MjUzMg==647483442532)

:::tip 温馨提示
本文的所有`shell`指令无特殊说明，都是在宝塔面板的终端工具中运行
:::

测试是否正常安装`Node.js`，终端工具运行如下指令

```sh
node -v
```

有如下显示表明安装成功

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjU3OTk2NA==647612579964)

如果提示没有 node 指令，可手动向 `~/.bashrc` 文件添加如下配置

```sh
export PATH=$PATH:/www/server/nodejs/实际安装版本/bin
```

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

### 1.5 初始化 Node 相关环境

:::tip 温馨提示
可重复执行，用于检查环境，不会重复安装已有库

下述方式选择其一即可
:::

方式 ①：手动执行 shell 指令安装（较推荐），稳定不出错

```sh
# 设置镜像源为 npm 国内镜像源
npm config set registry https://registry.npmmirror.com/

# 安装 zx
npm i -g zx

# 安装 nrm
npm i -g nrm

# 安装 pnpm
npm i -g pnpm

# 安装 pm2
npm i -g pm2
```

方式 ②：使用`q`指令安装，自动完成安装，部分操作系统不一样执行了不一定生效
::: code-group

```shell [使用CLI工具]
q ep --check
```

```shell [使用shell脚本]
curl https://script.sugarat.top/shell/ep/init-env.sh | bash
```

:::

自动完成`zx`,`node`,`nrm`,`镜像源配置`,`pnpm`等等等安装与环境检查

下面分别是 2 种方法的执行结果

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MTg1NTY2Mg==676791855662)

![](https://img.cdn.sugarat.top/mdImg/MTY1NjMzMDIyNTg5MA==656330225890)

:::details 我相知道，这些库是干嘛的?

- [zx](https://github.com/google/zx): 谷歌出品的一个使用`JavaScript`，编写复杂`Shell`脚本的工具
- [node](https://nodejs.org/zh-cn/): `JavaScript` 服务端运行时
- [nrm](https://github.com/Pana/nrm): `npm` 镜像源切换工具
- [pnpm](https://pnpm.io/zh/): 快速的，节省磁盘空间的包管理工具
- [pm2](https://pm2.keymetrics.io/): 守护进程管理工具
  :::

**如果在执行过程中出现问题或后续启动服务时出现问题，可以按方式 1 进行重新安装**

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

执行下述指令

::: code-group

```sh [部署最新稳定版]
q ep client --deploy
```

```sh [部署最新预览版]
q ep client --deploy beta
```

```sh [部署指定版本]
q ep client --deploy 2.3.4
# 更多可用版本见 > 更新日志(>=v2.3.4)：https://docs.ep.sugarat.top/plan/log.html
```

```sh [拉源码构建部署]
# 此方式适合，需要对网站内容做调整的场景
# Github
curl https://script.sugarat.top/shell/ep/deploy-client.sh | bash -s github

# Gitee
curl https://script.sugarat.top/shell/ep/deploy-client.sh | bash -s gitee
```

:::

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NjA3NTY1NQ==676796075655)

演示视频如下(无声，可放心观看)

<video src="https://img.cdn.sugarat.top/mdImg/MTY3Njc5MzMzOTY2Ng==ep2-client.mp4" preload controls="controls">
您的浏览器不支持 video 标签。
</video>

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

### 2.4 添加配置防止页面404

在对应网站设置面板，点击`配置文件`，加入以下配置

```sh
# vue-router
location / {
   try_files $uri $uri/ /index.html;
}
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5MzExMDgyMw==647693110823)

### 2.5 开启HTTPS

为网站添加`SSL`证书

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5Mzg1OTM0Mw==676793859343)

:::tip 温馨提示
宝塔提供了免费SSL证书点击申请即可，收集的信息自己一顿瞎填就行

申请完然后点击对应证书的部署按钮即可

部署完成后，可以点击右上角开启`强制HTTPS`，访问`HTTP`将会强制跳转到`HTTPS`
:::

::: danger 一些叮嘱
推荐给自己网站配上 `强制HTTPS` 保证网站的安全性

优先推荐使用`测试证书`，有效期更长（到期在申请即可，有数量限制）

`Let's Encrypt`，没什么限制，不用填资料，可以做到自动化，只是时间短一点 90天有效 需要频繁更换

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NDI5Mjk3Mw==676794292973)

当然一般腾讯云/阿里云服务器也有提供免费的SSL证书，详见各厂商文档
:::

### 2.6 导入数据库表数据

咱们前面在创建站点的时候已经创建了数据库，这一步只需要做表数据的导入

::: details 前面忘了创建数据库咋办？如何进行手动创建？
![](https://img.cdn.sugarat.top/mdImg/MTY1NjM4MTUzNDExMA==656381534110)

在数据库面板，点击添加数据库

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MjU0MDYwNg==647652540606)

:::danger 注意事项!!!

- **密码推荐使用随机的，输入数据库名字即可（账号默认和数据库名一致）**
- **数据库名记得小写**
  :::

下属方式任选其一即可

::: code-group

```shell [使用CLI工具]
q ep --init-mysql 数据库名 账号 数据库密码
```

```shell [使用shell脚本]
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s 数据库名 账号 数据库密码
```

:::

::: details 我忘了数据库账号，密码等等？可以在哪看？
在数据库面板里就能找到我们创建的数据库

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NDk3ODc1Mw==676794978753)

点击小眼睛就能看见密码
:::

下面分别是2种方式导入的截图示例

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NTA4MjYzMw==676795082633)

![](https://img.cdn.sugarat.top/mdImg/MTY1NjQyOTI2NzI0OQ==656429267249)

这样`6`张表，就直接初始化完成啦

## 3. 部署后端服务

### 3.1 使用CLI部署

定位到网站所在目录，然后点击终端

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjUxNzc0NA==676792517744)

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5MjYwNzcyMA==676792607720)

执行下述指令，自动完成服务的资源拉取和启动

:::details 如果已经使用旧版的教程部署过？
① 先用 `pm2 ls` 查看应用的名称

② 使用下面的指令部署时添加 `--name` 参数，指定当前应用的名称

例如

```sh
q ep server --deploy --name ep-server
```

:::

::: code-group

```sh [部署最新稳定版]
q ep server --deploy
```

```sh [部署最新预览版]
q ep server --deploy beta
```

```sh [部署指定版本]
q ep server --deploy 2.3.4
# 更多可用版本见 > 更新日志(>=v2.3.4)：https://docs.ep.sugarat.top/plan/log.html
```

:::

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NjE5MDc1Nw==676796190757)

演示视频如下(无声，可放心观看)

<video src="https://img.cdn.sugarat.top/mdImg/MTY3Njc5NTc4MzY0Ng==ep2-server.mp4" preload controls="controls">
您的浏览器不支持 video 标签。
</video>

:::details 我的脚本执行失败，怎么解决？

- 如果由于目录冲突，导致脚本执行失败，请手动删除`easypicker2-server/dist`目录
- 其它问题，[加反馈群](./../author.md)或者[联系作者](./../author.md)沟通
  :::

### 3.2 获取端口

通过查询运行日志可以得到此信息

```sh
q ep server --log
```

在服务日志里，可以看到服务监听的端口，和运行打印的log日志情况

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NjUwNzU4OA==676796507588)

:::details 如果显示是localhost，展开查看注意事项
① 旧版源码默认会监听 `localhost`

如果机器上没有配`127.0.0.1   localhost`，会导致后续的配置无法通过 localhost 访问

② 如何确定我有没有这个配置？

终端执行下面的指令

```sh
ping -c 1 localhost
```

如果执行没有报错，那就不用看下面的注意事项，**如果有报错，请接着往下看**

![](https://img.cdn.sugarat.top/mdImg/MTY5NTczNTk1NTk1MQ==695735955951)

③ ping 报错提示 `ping: localhost: Name or service not known`

方式1（推荐）：在`/etc/hosts`文件中添加`这个映射，执行如下指令

```sh
# 一键添加
echo "127.0.0.1 localhost" | sudo tee -a /etc/hosts

# 查看添加后的结果
cat /etc/hosts
```

方式2：后续用到 `localhost` 的地方都替换成 `127.0.0.1`

比如后端服务代码里面的`.env`文件里的`SERVER_HOST`(修改完成后记得重启后端服务，下面有介绍)

![](https://img.cdn.sugarat.top/mdImg/MTY5NTczNjExMTIyMg==695736111222)
:::

**重启服务**

```sh
q ep server --restart
q ep server --log
```

### 3.3 获取管理面板账号

通过查询运行日志可以得到此信息

```sh
q ep server --log
```

在服务日志里，可以看到管理面板的账号密码

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5NjUwNzU4OA==676796507588)

:::danger 拿小本本记下这个账号密码后面会用到！！！
:::

如果后续忘了，可以通过如下**3种方式获取**

::: code-group

```sh [使用CLI]
q ep server --config server
```

```sh [重启服务]
q ep server --restart
q ep server --log
```

```sh [使用Shell脚本获取]
# 进入 easypicker2-server 目录
cd easypicker2-server

# 执行
curl https://script.sugarat.top/js/ep/user-config.js | node - server
```

:::

下面分别是3种方式的执行结果

|                                 使用CLI                                 |                                重启服务                                 |                                Shell脚本                                |
| :---------------------------------------------------------------------: | :---------------------------------------------------------------------: | :---------------------------------------------------------------------: |
| ![](https://img.cdn.sugarat.top/mdImg/MTY3NjgwMDQ0NzE1MA==676800447150) | ![](https://img.cdn.sugarat.top/mdImg/MTY3NjgwMDAzNjUwNg==676800036506) | ![](https://img.cdn.sugarat.top/mdImg/MTY3NjgwMDczMDU2Mw==676800730563) |

## 4 配置反向代理

<!-- 任选下面任意一个方案即可，推荐使用方式1 简单利索 -->

<!-- ### 4.1 方式1（推荐）

在对应网站设置面板，点击`配置文件`，加入以下 `反向代理配置`，其中端口号根据自己的实际情况指定即可

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5Nzc2NzUxOQ==676797767519)

:::details 点击查看配置文件内容
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
::: -->

<!-- ### 4.1 使用面板设置 -->

打开网站的设置面板，点击添加反向代理，勾选`高级功能`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY2Njc0Nzg4Mw==647666747883)

:::danger 重要提示，请一定按照指示进行操作！！！
代理名称随便填

- 代理目录`/api/`
- 目标 URL 填`自己的后端服务地址`，例如`http://127.0.0.1:3000/`
  - 末尾一定要带`/`(截图里漏了)
- 内容替换`/api`,第二个留空
  :::

::: details 如果提示 XX 已存在，无法添加，请戳这里查看解法

进入此目录找到反向代理的配置文件

```sh
/www/server/panel/vhost/nginx/proxy/你的域名
```

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM4MjE4Mzc1Mw==656382183753)

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

:::

**如仍无法解决，可以重新尝试创建一个新站点，配置先进行反向代理，在做其它操作。如仍然无法解决可加群反馈。**

完成反向代理的配置后，我们就可以用上面提供的管理账号和密码进行服务相关配置的更新了

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
q ep server --restart
```

![](https://img.cdn.sugarat.top/mdImg/MTY3NjgwMDAzNjUwNg==676800036506)

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
