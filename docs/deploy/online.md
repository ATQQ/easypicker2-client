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

TODO:待完善

## 3. 部署网站
### 构建产物
### 创建网站
### 上传产物

## 4. 部署后端服务
### 上传源码
### 安装依赖
### 配置数据库
### 创建七牛云OSS存储服务
### 修改环境变量
### 启动服务

## 5. 配置反向代理