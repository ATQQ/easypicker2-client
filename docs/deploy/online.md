# 线上部署 - 使用宝塔面板(v1)

:::danger 此为旧版操作文档，供老朋友做一下使用参考
**此为旧版操作文档，供老朋友做一下使用参考**
:::

:::tip 推荐阅读
新的部署文档：[线上部署(v3)](./online-v3.md)，步骤更加简洁，更新更方便
:::

:::danger ！！！推荐使用`Linux`系服务器！！！
下面的所有操作，均在 `Linux` 上进行，如果机器是装的`windows server` 部分操作可能需要远程桌面进行
:::

**[宝塔面板官网](https://www.bt.cn/)**

## 1. 安装宝塔面板
宝塔面板介绍安装教程：https://www.bt.cn/

### 通过面板安装必要的软件
:::details 查看必备的**7**个软件列表
* Nginx
* PM2
* 数据库
  * redis
  * mysql
  * MongoDB
* phpMyAdmin
* PHP
:::

通过宝塔面板提供的软件商店进行安装

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzMwMzg2OQ==647483303869)

安装完后，可以把常用的加至首页

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzM3ODE4Mw==647483378183)

## 2. 初始化运行环境
### 安装Node

使用PM2面板安装`Node`

:::tip 温馨提示 (重要的事情说3遍)
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
此部分的`shell`指令无特殊说明，都是在宝塔面板的终端工具中运行
:::

测试是否正常安装`Node.js`，终端工具运行如下指令
```sh
node -v
```
有如下显示表明安装成功

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjU3OTk2NA==647612579964)

### 执行环境初始化脚本

:::tip 温馨提示
可重复执行，用于检查环境，不会重复安装已有库
:::

```shell
curl https://script.sugarat.top/shell/ep/init-env.sh | bash
```
自动完成`zx`,`node`,`nrm`,`镜像源配置`,`pnpm`等等等安装与环境检查

![](https://img.cdn.sugarat.top/mdImg/MTY1NjMzMDIyNTg5MA==656330225890)

:::details 告诉我，这些库是干嘛的?
* [zx](https://github.com/google/zx): 谷歌出品的一个使用`JavaScript`，编写复杂`Shell`脚本的工具
* [node](https://nodejs.org/zh-cn/): `JavaScript` 服务端运行时
* [nrm](https://github.com/Pana/nrm): `npm` 镜像源切换工具
* [pnpm](https://pnpm.io/zh/): 快速的，节省磁盘空间的包管理工具
:::

:::details 我想自己一步步配置（不推荐）
### 设置镜像源

其中`npm`是随Node一起安装的包管理工具，通过切换到国内的镜像源，有助于加快安装速度

安装`nrm`（切换镜像源工具）
```shell
npm i -g nrm --registry=https://registry.npmmirror.com
```

查看可用源列表
```shell
nrm ls
```

切换`淘宝源`
```shell
nrm use taobao
```

验证是否切换成功
```shell
npm config get registry
```

结果是上述淘宝源即可

### 安装PNPM
#### 方式1
使用 `npm` 安装

```shell
npm install -g pnpm
```

#### 其它方式
参看 [pnpm官方中文文档](https://pnpm.io/zh/installation)

#### 验证是否安装成功

```shell
pnpm -v
```
:::

## 3. 创建网站
### 添加站点
点击`添加站点`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzAzMTExMg==647613031112)

**输入要绑定的域名，选择纯静态**

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzI5NTU2NQ==647613295565)

:::tip 我没有域名怎么办？
没有域名可以 [联系我](./../author.md)，给你绑定个`sugarat.top`下的3||4级域名
* 例如：https://ep.test.sugarat.top
* 例如：https://ep.dev.sugarat.top
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


### 执行自动化部署脚本
定位到网站所在目录，然后点击终端

![](https://img.cdn.sugarat.top/mdImg/MTY1NjQ2NzQ4ODUxOQ==656467488519)

![](https://img.cdn.sugarat.top/mdImg/MTY1NjMzOTI2ODAzMw==656339268033)

执行下述指令

:::details 我要体验最新beta版

```shell
curl https://script.sugarat.top/shell/ep/deploy-client.sh | bash -s github release/beta
```
:::
:::tip
此后应用版本有新版本，更新操作也可使用此脚本进行自动更新

由于网络问题，如遇卡顿，可结束，重新执行
:::

```shell
curl https://script.sugarat.top/shell/ep/deploy-client.sh | bash -s github
```

:::tip
如果很长时间卡在Git，请换用下面的脚本，从`gitee`拉取代码
```shell
curl https://script.sugarat.top/shell/ep/deploy-client.sh | bash -s gitee
```
:::


演示视频如下

<video src="https://img.cdn.sugarat.top/mdImg/MTY1NjM0MDcwMjIyNA==deploy-client.mp4" preload controls="controls">
您的浏览器不支持 video 标签。
</video>


:::details 我的脚本执行失败，怎么解决？
* 如果由于目录冲突，导致脚本执行失败，请手动删除`dist`与`easypicker2-client` 目录
* 其它问题，[加反馈群](./../author.md)或者[联系作者](./../author.md)沟通 
:::

:::details 我想手动一步步配置（不推荐）

### 构建产物
参考[本地部署-启动客户端](./local.md#_3-启动客户端)

在完成依赖安装后,执行`build`,构建产物

```shell
pnpm build
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjkxMzU1MA==647612913550)

此时构建产物，都在项目的`dist`目录中

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjk3OTkzOQ==647612979939)

### 上传产物
点击前往创建的目录

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzQ3OTEwNQ==647613479105)

点击上传，将我们刚才构建生成的`dist`目录拖到上传面板

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzU1NDU4Mw==647613554583)

上传完成

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzY2MzU3Mw==647613663573)

:::

### 修改网站访问目录
修改访问目录为 `dist`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzc3ODEwNA==647613778104)

访问 https://ep.test.sugarat.top 测试,就看到咱们的前端应用了

此时访问可以看到，页面会有一个报错提示

那是因为我们还没有配置后端服务，后面会有配置的流程

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM0MTg1MDgwNQ==656341850805)

### 添加配置防止路由404
在对应网站设置面板，点击`配置文件`，加入以下配置

```sh
# vue-router
location / {
   try_files $uri $uri/ /index.html;
}
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5MzExMDgyMw==647693110823)

### 开启HTTPS(可选)
为网站添加`SSL`证书

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1Mzc4OTkzNQ==647653789935)

:::tip 温馨提示
宝塔提供了免费SSL证书点击申请即可，收集的信息自己一顿瞎填就行

申请完然后点击对应证书的部署按钮即可

部署完成后，可以点击右上角开启`强制HTTPS`，访问`HTTP`将会强制跳转到`HTTPS`
:::


## 4. 创建MySQL数据库
### 新增数据库
![](https://img.cdn.sugarat.top/mdImg/MTY1NjM4MTUzNDExMA==656381534110)

在数据库面板，点击添加数据库

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MjU0MDYwNg==647652540606)

:::warning 注意事项!!!
* **密码推荐使用随机的，输入数据库名字即可（账号默认和数据库名一致）**
* **数据库名记得小写**
:::


### 自动创建表数据
执行如下脚本
```sh
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s 数据库名 账号 数据库密码
```

例如下图中示例
```sh
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s ep-shell-test ep-shell-test ep-shell-test
```

![](https://img.cdn.sugarat.top/mdImg/MTY1NjQyOTI2NzI0OQ==656429267249)

这样`6`张表，就直接初始化完成，比手动执行方便得多

:::details 我想手动创建（不推荐）

### 导入表结构

管理创建的数据库

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MjY5MjQzNA==647652692434)

跳转到`phpMyAdmin`面板,选择导入

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1Mjg2NDcxNw==647652864717)

选择服务端项目中 [docs/sql/auto_create.sql](https://github.com/ATQQ/easypicker2-server/blob/master/docs/sql/auto_create.sql) 进行上传

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MzA2NjE5MQ==647653066191)

选择文件后点击执行

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MzE2OTExNw==647653169117)

再次来到结构面板，即可看到完成了 6 张表的创建

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1MzI1MDUzNQ==647653250535)

:::

## 5. 部署后端服务

### 代码部署
定位到网站所在目录，然后点击终端，执行下述指令

![](https://img.cdn.sugarat.top/mdImg/MTY1NjMzOTI2ODAzMw==656339268033)

:::details 我要体验最新beta版

```shell
curl https://script.sugarat.top/shell/ep/deploy-server.sh | bash -s github release/beta
```
:::
:::tip
此后应用版本有新版本，更新操作也可使用此脚本进行自动更新
:::

```shell
curl https://script.sugarat.top/shell/ep/deploy-server.sh | bash -s github
```

:::tip
如果很长时间卡在Git，请换用下面的脚本，从`gitee`拉取代码
```shell
curl https://script.sugarat.top/shell/ep/deploy-server.sh | bash -s gitee
```
:::

演示视频如下

<video src="https://img.cdn.sugarat.top/mdImg/MTY1NjM5NDEzNDQ1MQ==deploy-serveer.mp4" preload controls="controls">
您的浏览器不支持 video 标签。
</video>

:::warning
如果由于目录冲突，导致脚本执行失败，请手动删除`easypicker2-server` 目录后重试
:::

:::tip 应用版本 ≥ v2.1.9 可直接跳过本节后续内容，直接快进到`启动服务`步骤
:::

:::details 如果应用版本 < v2.1.9，需要手动修改.env.local配置文件
进入`easypicker2-server`目录双击 `.env.local` 文件进行修改

如果不存在，手动创建`.env.local`文件即可,内容格式同`.env`文件

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM5NDQwMTA1OQ==656394401059)

:::tip 温馨提示
每个变量的释义参看源码中的 [src/types/env.d.ts](https://github.com/ATQQ/easypicker2-server/blob/master/src/types/env.d.ts)
:::

:::details 手动修改 .env.local 我需要关心的几个变量
* 服务相关
  * SERVER_PORT: 服务启动的端口，默认3000，无特殊需求可以不修改
* MySql相关
  * MYSQL_DB_NAME: 数据库名
  * MYSQL_DB_USER: 账号
  * MYSQL_DB_PWD:  密码
* MongoDB相关
  * MONGO_DB_NAME: 数据库名（随便使用小写字母组合）
    * 例如：`ep-prod`，`my-ep-db`
* 七牛云相关：OSS - 文件存储，上传/下载文件依赖其提供服务
* 腾讯云相关：短信服务，不接入短信不用配
:::

:::details 从哪获取这些变量？
#### MySQL 相关

MySQL 的账号密码在数据库面板获取，即前面创建的数据库账号密码

#### 服务占用端口

默认启动监听端口为3000，如与其它服务有冲突可以修改`SERVER_PORT`为其它值（推荐 3000 => 65535），服务启动会自动避免冲突，如`3000`已经占用，则会使用`3001`，以此类推

#### 七牛云相关配置

参考[七牛云OSS服务创建](./qiniu.md)文章，获取七牛云相关的几个环境变量
:::

到此准备工作算完成了，接下来启动我们的后端服务即可

### 启动服务
进入`easypicker2-server` 目录执行如下脚本即可

```sh
curl https://script.sugarat.top/shell/ep/run-server.sh | bash -s ep-server
```
其中 `ep-server`,可以换成自己的服务名（主要用于服务的管理）

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM5NDg2ODI2NQ==656394868265)

### 查看服务日志
```sh
pm2 logs ep-server
```
在服务日志里，可以看到服务监听的端口，和运行打印的log日志情况

![](https://img.cdn.sugarat.top/mdImg/MTY1NjM5NTA0Mzg4Ng==656395043886)

在应用版本 `> v2.1.8`，还可以看到一个服务管理面板的账号与密码，用于后续随时修改服务的配置信息

:::warning 拿小本本记下这个账号密码后面会用到！！！
拿小本本记下这个账号密码后面会用到 ！！！

拿小本本记下这个账号密码后面会用到 ！！！
:::

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzODEwNDg4Mw==659938104883)

后续也可以在`easypicker2-server`目录下执行如下脚本获取
```sh
curl https://script.sugarat.top/js/ep/user-config.js | node - server
```

![图片](https://img.cdn.sugarat.top/mdImg/MTY2NjI2NjMwOTA3MQ==666266309071)

:::tip 温馨提示
后续 如果代码有更新，只需要重新进行`代码部署`和`启动服务`这个步骤即可，即执行**2**行脚本
:::

:::details 我想手动一步步配置（不推荐）
### 本地构建源码
参照[本地启动-后端服务](./local.md#_5-启动后端服务)，进行依赖安装和构建

此部分是在本地项目中进行
```shell
pnpm install
```

```shell
pnpm build
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDEwMTIyMw==647614101223)

### 上传构建产物
咱们再上面创建网站的目录下，创建一个`server`目录

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDI4MDc2OA==647614280768)

进入这个目录，上传我们的产物以及一些配置文件（共4个文件）

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDU5MTY2Mw==647614591663)

### 安装依赖
在当前目录下打开宝塔终端工具执行

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDg5MDkyMg==647614890922)
```shell
pnpm install
```

### 修改环境变量
双击 `.env` 文件进行修改

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNTIzNzAzMg==647615237032)

每个变量的释义参看源码中的 [src/types/env.d.ts](https://github.com/ATQQ/easypicker2-server/blob/master/src/types/env.d.ts)

通常情况下只需要关心一下
* 服务相关
  * SERVER_PORT: 服务启动的端口，默认3000，无特殊需求可以不修改
* MySql相关
  * MYSQL_DB_NAME: 数据库名
  * MYSQL_DB_USER: 账号
  * MYSQL_DB_PWD:  密码
* 七牛云相关：OSS - 文件存储，上传/下载文件依赖其提供服务
* 腾讯云相关：短信服务，不接入短信不用配

#### MySQL 相关
MySQL 的账号密码在数据库面板获取，即前面创建的数据库账号密码

#### 监听端口
默认启动监听端口为3000，如与其它服务有冲突可以修改`SERVER_PORT`为其它值（推荐 3000 => 65535）

#### 七牛云
参考[七牛云OSS服务创建](./qiniu.md)部分的文章，获取七牛云相关的几个环境变量

到此准备工作算完成了，接下来启动我们的后端服务即可

### 启动服务

在PM2面板点击添加项目

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1NTQxMTAzOQ==647655411039)

* 启动文件输入 `npm`
* 运行目录选择 前面创建的 `server`所在目录
* 项目名称随意，自己能辨别即可

然后点击启动即可


### 查看运行日志
点击对应服务的 运行/错误 查看相关日志，从面板能看到最终服务启动所在的端口

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY1NjM4MzI3Mw==647656383273)

到此服务端启动算完成了

只差最后一步了

:::
## 6. 配置反向代理

打开网站的设置面板，点击添加反向代理，勾选`高级功能`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY2Njc0Nzg4Mw==647666747883)


:::danger 重要提示
代理名称随便填
* 代理目录`/api/`
* 目标URL填`自己的后端服务地址`
* 内容替换`/api`,第二个留空
:::

::: details 如果提示XX已存在，无法添加，请戳这里查看解法

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
    proxy_pass http://localhost:3000/;
    proxy_set_header Host localhost;
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

完成反向代理的配置后，我们就可以用上面提供的管理账号和密码进行服务相关配置的更新了

## 7. 最后更新配置
1. 访问我们的网站进行登录
2. 输入上面拿到的账号密码
3. 在新面板中进行相应配置更新

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzOTEzNzg1Ng==659939137856)

:::details 标红的为必要更新的字段
* MySQL
  * 数据库名
  * 用户名
  * 密码
* MongoDB
  * 数据库名：例如 ep-prod,ep-test,ep-log
* 七牛云
  * AccessKey
  * SecretKey
  * 存储空间名
  * 绑定的域名
  * 存储区域
:::

:::details 从哪获取这些变量？
#### MySQL 相关

MySQL 的账号密码在数据库面板获取，即前面创建的数据库账号密码

#### MongoDB
这里只需要填入数据库名，格式 `小写+连字符`

例如 `ep-prod`, `ep-test`, `ep-log`
#### 七牛云相关配置

参考[七牛云OSS服务创建](./qiniu.md)文章，获取七牛云相关的几个环境变量
:::

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzOTAyNDM2OA==659939024368)

更新完立马生效，不需要再重新启动后端服务了
## 99. 其余功能
### 开启内容压缩
在网站设置面板，点击反向代理，配置文件

添加`#`注释或者删掉 `proxy_set_header Accept-Encoding "";`

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5MzM2MDI3OQ==647693360279)

这样返回的内容会进行压缩，响应速度会有所提升

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5Mzg3MDc2NA==647693870764)

### 配置管理员权限

账号加了管理员权限后，就能看到后台管理的入口
* 查看访问日志
* 管理用户账号


| 添加前                                                                               | 添加后                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
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