# 线上部署 - 使用宝塔面板

* [宝塔面板官网](https://www.bt.cn/)

推荐使用`Linux`系服务器
## 1. 安装宝塔面板
宝塔面板介绍安装教程：https://www.bt.cn/

### 通过面板安装必要的软件
* Nginx
* PM2
* 数据库
  * redis
  * mysql
  * MongoDB
* phpMyAdmin
* PHP

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzMwMzg2OQ==647483303869)

安装完后，可以把常用的加至首页

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzM3ODE4Mw==647483378183)

## 2. 安装必要依赖
### 安装Node

使用PM2面板安装，

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MzQ0MjUzMg==647483442532)

此部分的`shell`指令无特殊说明，都是在宝塔面板的终端工具中运行

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjU3OTk2NA==647612579964)

测试是否正常安装，终端工具运行如下指令
```shell
node -v
```

建议安装大于等于`14.8`版本的

### 切换镜像源
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

## 3. 部署网站
### 构建产物
参考[本地部署-启动客户端](./local.md#_3-启动客户端)

在完成依赖安装后,执行`build`,构建产物
```shell
pnpm build
```

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjkxMzU1MA==647612913550)

此时构建产物，都在项目的`dist`目录中

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMjk3OTkzOQ==647612979939)

### 创建网站
点击`添加站点`

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzAzMTExMg==647613031112)

输入要绑定的域名，选择纯静态，没有域名可以联系我，给你绑定个`sugarat.top`下的3||4级域名

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzI5NTU2NQ==647613295565)

### 上传产物
点击前往创建的目录

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzQ3OTEwNQ==647613479105)

点击上传，将我们刚才构建生成的`dist`目录拖到上传面板

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzU1NDU4Mw==647613554583)

上传完成

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzY2MzU3Mw==647613663573)

### 修改网站访问目录

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxMzc3ODEwNA==647613778104)

访问 `http://ep.test.sugarat.top`测试,就看到咱们的前端应用了

## 4. 创建MySQL数据库

## 5. 部署后端服务
### 本地构建源码
参照[本地启动-后端服务](./local.md#_5-启动后端服务)，进行依赖安装和构建

此部分是在本地项目中进行
```shell
pnpm install
```

```shell
pnpm build
```

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDEwMTIyMw==647614101223)

### 上传构建产物
咱们再上面创建网站的目录下，创建一个`server`目录

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDI4MDc2OA==647614280768)

进入这个目录，上传我们的产物以及一些配置文件（共4个文件）

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDU5MTY2Mw==647614591663)

### 安装依赖
在当前目录下打开宝塔终端工具执行

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNDg5MDkyMg==647614890922)
```shell
pnpm install
```

### 修改环境变量
双击 `.env` 文件进行修改

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzYxNTIzNzAzMg==647615237032)

MySQL 的账号密码在 数据库面板获取


### 启动服务

## 5. 配置反向代理