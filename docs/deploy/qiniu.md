# 七牛云OSS服务创建

文件存储采用七牛云的[OSS](https://www.qiniu.com/products/kodo)（对象存储服务）

这部分将手把手介绍如何在本项目中接入七牛云OSS

为什么使用七牛云？
* 因为资费便宜，还有**30G**的免费额度

## 1. 账号注册
访问[七牛云-注册页面](https://portal.qiniu.com/signup?redirect_url=https:~2F~2Fwww.qiniu.com~2Fproducts~2Fkodo) 注册一个账号

## 2. 创建存储空间
访问[七牛云-对象存储](https://www.qiniu.com/products/kodo)

戳页面上的立即使用

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTQ5MzAyNg==647569493026)

新建空间，输入一些必要的数据

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTYwOTY3Nw==647569609677)

其中**访问控制**一定记得选私有，避免文件不通过鉴权就被下载

存储空间名即为，后端服务中`.env`中`QINIU_BUCKET_NAME`的值

创建成功提示，测试域名有**30天**有效期

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTc1ODczNA==647569758734)

如果需要长期使用，建议绑定一个自定义域名，当然如果你没有域名，可以联系我，给你提供一个`.sugarat.top`下的3级，4级域名

## 3. 获取到域名
进入我们创建的空间`easypicker-test`,就能看到提供的测试域名

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTk3NjcwMQ==647569976702)

域名即为后端服务中`.env`中`QINIU_BUCKET_DOMAIN`的值

## 4. 获取ack与sek

**这两个东西千万不要泄露**

**这两个东西千万不要泄露**

**这两个东西千万不要泄露**

当然泄漏了可自己进行重置

获取位置如下

控制面板右上角，的秘钥管理

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU3MDI3MDQwMw==647570270403)

接下来就能看到

![图片](https://img.cdn.sugarat.top/mdImg/MTY0NzU3MDM1MTUxOA==647570351518)

到此七牛云相关的几个需要的环境变量我们都拿到了
* QINIU_ACCESS_KEY
* QINIU_SECRET_KEY
* QINIU_BUCKET_NAME
* QINIU_BUCKET_DOMAIN
  
填写到，后端服务中`.env`中对应位置即可，然后重启服务