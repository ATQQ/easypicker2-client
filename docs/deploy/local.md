---
outline: [2,3]
---

:::danger 注意事项！！
线上部署，请先按照 [线上部署文档](./online-new.md) 操作

如果要修改已经部署在线上网站的部分内容（文案，图片，逻辑等），可参阅文档（请赖心阅读 1-3 部分内容）
:::
# 本地启动&源码修改
## 1. 准备工作
### 安装Node
* [中文官网](https://nodejs.org/zh-cn/download/)
* [菜鸟教程：Node.js](https://www.runoob.com/nodejs/nodejs-install-setup.html)

参考上述文章自行在本地机器安装`Node.js`

测试是否正常安装，终端工具运行如下指令
```shell
node -v
```
![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MDQ3MjM1OA==647480472358)

**建议安装`Node 18`(大于等于`18.16.0`版本)**

:::details Node 各版本生命周期

数据来源：https://github.com/nodejs/Release/blob/main/README.md

![](https://img.cdn.sugarat.top/mdImg/MTY4MzExNTA4NTcyNw==683115085727)
:::

多版本管理可以使用 [nvm](https://github.com/nvm-sh/nvm) 或者 [fnm](https://github.com/Schniz/fnm)

![](https://img.cdn.sugarat.top/mdImg/MTY1MTY0OTU1NzUyNw==651649557527)

![](https://img.cdn.sugarat.top/mdImg/MTY4MzExNDk1MTY5Mw==683114951693)

:::details (可选) 切换镜像源
其中`npm`是随Node一起安装的包管理工具，通过切换到国内的镜像源，有助于加快安装速度

安装`nrm`（切换镜像源工具）
```shell
npm i -g nrm --registry=https://registry.npmmirror.com
```

查看可用源列表
```shell
nrm ls
```
![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MDczNjY3OA==647480736678)

切换`淘宝源`
```shell
nrm use taobao
```

验证是否切换成功
```shell
npm config get registry
```

结果是上述淘宝源即可

:::
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

## 2. 获取客户端源码
GitHub如果没有梯子，下载&访问可能会很慢，Gitee是国内的一个代码托管平台，速度相对快

### 方式1：通过GIT
确保电脑安装有`Git`
* [廖雪峰：Git安装&使用教程](https://www.liaoxuefeng.com/wiki/896043488029600/896067074338496)

在终端工具适当的目录运行
```shell
# from GitHub
git clone https://github.com/ATQQ/easypicker2-client.git

# or from  Gitee
git clone https://gitee.com/sugarjl/easypicker2-client.git
```
地址来源

|          [GitHub](https://github.com/ATQQ/easypicker2-client)           |          [Gitee](https://gitee.com/sugarjl/easypicker2-client)          |
| :---------------------------------------------------------------------: | :---------------------------------------------------------------------: |
| ![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTQ2NjkzMA==647481466930) | ![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTcxMzU1MQ==647481713551) |


### 方式2：压缩包

|          [GitHub](https://github.com/ATQQ/easypicker2-client)           |          [Gitee](https://gitee.com/sugarjl/easypicker2-client)          |
| :---------------------------------------------------------------------: | :---------------------------------------------------------------------: |
| ![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTg1OTMzOQ==647481859339) | ![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTg3NzIwMA==647481877200) |

## 3. 启动客户端

在终端工具中，使用`cd`指令定位到项目跟目录

使用`pwd`查看位置

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MjE0NjQwMA==647482146400)

### 安装依赖
```shell
pnpm install
```

### 本地启动 - 使用线上test服务
后端服务使用线上测试环境的 https://ep.dev.sugarat.top

#### 方式1 - 开发模式
```shell
pnpm dev:test
```
[启动后输出日志](https://app.warp.dev/block/H2XZZUF7yP3hzJbVax2FVa)
```sh
VITE v4.4.7  ready in 443 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.2:5173/
  ➜  Network: http://198.18.0.1:5173/
  ➜  press h to show help
```

浏览器访问 [http://localhost:5173/](http://localhost:5173/)

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MjQwMjg1MQ==647482402851)

#### 方式2 - 预览构建后产物
页面访问速度更快

产物构建
```shell
pnpm build:test
```

预览
```shell
pnpm serve
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4Mjc4NjE1Ng==647482786156)

浏览器访问终端给予的地址即可 [http://localhost:4173/](http://localhost:4173/)

### 本地启动 - 使用本地的后端服务
需要参照 4，5，6 同时启动本地的后端服务

后端服务使用本地的 `http://localhost:3000`

```shell
# 启动
pnpm dev
```

### 本地构建 - 修改源码
在完成客户端的源码拉取，可在(测试)开发模式下直接启动
```sh
pnpm dev:test
```

然后修改代码里的文案，逻辑等，保存后会直接生效

![](https://img.cdn.sugarat.top/mdImg/MTcwMTUzMDM2OTU2NA==701530369564)

如果部署到自己的服务器上，在完成修改后执行构建命令 [pnpm build](https://app.warp.dev/block/og9qOohoyxZxheDYMrZ30g)

```sh
pnpm build
```

将会在当前目录下生成一个 `dist` 目录（里面即为打包后的文件）

![](https://img.cdn.sugarat.top/mdImg/MTcwMTUzMDU0Njk5MA==701530546990)

将这个 dist 目录用作部署到自己的服务器即可，比如下面使用宝塔面板部署的示例目录

![](https://img.cdn.sugarat.top/mdImg/MTcwMTUzMDY4NzEyNg==701530687126)

## 4. 获取服务端源码
### 方式1: 通过Git拉取
```shell
# from GitHub
git clone https://github.com/ATQQ/easypicker2-server.git

# or from  Gitee
git clone https://gitee.com/sugarjl/easypicker2-server.git
```
### 方式2: 下载源码压缩包
* [GitHub](https://github.com/ATQQ/easypicker2-server)
* [Gitee](https://gitee.com/sugarjl/easypicker2-server)

参照客户端源码下载图示，找到下载位置

## 5. 启动后端服务
在终端工具中，使用`cd`指令定位到项目跟目录

### 安装依赖
```shell
pnpm install
```
### 构建产物
```shell
pnpm  build
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2NzUyMTg3NQ==647567521875)

### 运行
```shell
pnpm start
```
![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2NzYxOTg4OA==647567619888)

当然要让服务正常工作需要，在本地安装三个数据库，同时[创建七牛云账号](./qiniu.md)

请接着往下看
### 一些配置
`数据库&云服务&本地服务`等相关的配置均放在了`.env`文件中，如下

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2Nzc1NjE5MQ==647567756191)

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

## 6. 安装数据库
此部分参考[菜鸟教程](https://www.runoob.com/) 自行完成安装

`Redis`与`MongoDB`无需配置账户密码，服务端口等，保持默认行为即可

* [MySQL 教程](https://www.runoob.com/mysql/mysql-tutorial.html) - 存储用户数据
  * 推荐使用5.x[(下载地址)](https://downloads.mysql.com/archives/community/)的版本，8.x的Node驱动存在问题
* [Redis 教程](https://www.runoob.com/redis/redis-tutorial.html) - 记录登录状态
* [MongoDB 教程](https://www.runoob.com/mongodb/mongodb-tutorial.html) - 记录运行日志

## 7. MySQL导入表结构数据
在简单[阅读教程](https://www.runoob.com/mysql/mysql-tutorial.html)，并完成MySQL的安装之后

查看是否安装成功
```shell
mysql --version
```

### 初始化一个数据库

使用`root`账号登录
```shell
mysql -u root -p
```
回车后输入密码

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwODU4NjE3OQ==647608586179)

查看当前已有数据库
```shell
show databases;
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwODY3ODQ4MA==647608678480)

创建一个数据库
```shell
create database ep_local_test;
```
![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwODc5ODc3Nw==647608798777)

### 导入表结构数据
选择咱刚创建的数据库
```shell
use ep_local_test;
```

查看当前拥有的表
```shell
show tables;
```

导入所需的表 其中`sql文件位置`为本地的后端项目中`docs/sql/auto_create.sql`的绝对路径

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwOTE5ODYzNA==647609198634)

```shell
source sql文件位置
```
![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwOTI0ODAzNQ==647609248035)

完成导入后再查看当前拥有的表

```shell
show tables;
```

![](https://img.cdn.sugarat.top/mdImg/MTY0NzYwOTI5MzAyMQ==647609293021)

到此MySQL的本地准备工作准备完毕

接下来在服务端项目中`.env`环境变量中配置MySQL相关值即可
* MYSQL_DB_NAME=ep_local_test
* MYSQL_DB_USER=root
* MYSQL_DB_PWD=你的密码


有其它问题可以小群交流，方便可以加入及时交流沟通问题: 685446473

![](https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjI3MzUwMw==647752273503)