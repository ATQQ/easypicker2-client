# 本地启动

测试内容
## 1. 准备工作
### 安装Node
* [中文官网](https://nodejs.org/zh-cn/download/)
* [菜鸟教程：Node.js](https://www.runoob.com/nodejs/nodejs-install-setup.html)

参考上述文章自行在本地机器安装`Node.js`

测试是否正常安装，终端工具运行如下指令
```shell
node -v
```
![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MDQ3MjM1OA==647480472358)

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
![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MDczNjY3OA==647480736678)

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

## 2. 获取客户端源码
Github如果没有梯子，下载&访问可能会很慢，Gitee是国内的一个代码托管平台，速度相对快

### 方式1：通过GIT
确保电脑安装有`Git`
* [廖雪峰：Git安装&使用教程](https://www.liaoxuefeng.com/wiki/896043488029600/896067074338496)

在终端工具适当的目录运行
```shell
# from Github
git clone https://github.com/ATQQ/easypicker2-client.git

#or from  Gitee

git clone https://gitee.com/sugarjl/easypicker2-client.git
```
地址来源
* [Github](https://github.com/ATQQ/easypicker2-client): ![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTQ2NjkzMA==647481466930)
* [Gitee](https://gitee.com/sugarjl/easypicker2-client): ![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTcxMzU1MQ==647481713551)


### 方式2：压缩包

* [Github](https://github.com/ATQQ/easypicker2-client): ![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTg1OTMzOQ==647481859339)
* [Gitee](https://gitee.com/sugarjl/easypicker2-client): ![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MTg3NzIwMA==647481877200)

## 3. 启动客户端

在终端工具中，使用`cd`指令定位到项目跟目录

使用`pwd`查看位置

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MjE0NjQwMA==647482146400)

### 安装依赖
```shell
pnpm install
```

### 本地启动 - 线上test服务
后端服务使用线上测试环境的 https://ep.dev.sugarat.top

#### 方式1 - 开发模式
```shell
pnpm dev:test
```

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MjMwNjQ4OA==647482306488)

浏览器访问 `[http://localhost:8080/](http://localhost:8080/)`

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4MjQwMjg1MQ==647482402851)

#### 方式2 - 构建后产物
页面访问速度更快

产物构建
```shell
pnpm build:test
```

预览
```shell
pnpm serve
```

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzQ4Mjc4NjE1Ng==647482786156)

浏览器访问终端给予的地址即可

### 本地启动 - 本地的后端服务
需要参照 4，5，6 同时启动本地的后端服务

```shell
pnpm dev
```

TODO：待完善
## 4. 获取服务端源码
### 方式1：通过Git拉取
### 方式2：下载源码压缩包

## 5. 本地安装数据库
### 5.1 Mysql - 用户数据
### 5.2 Redis - 登录状态
### 5.3 MongoDB - 运行日志

## 6. 启动后端服务