# 七牛云OSS配置

文件存储采用七牛云的[OSS](https://www.qiniu.com/products/kodo)（对象存储服务）

这部分将手把手介绍如何在本项目中接入七牛云OSS

:::tip 为什么使用七牛云？

- 因为资费便宜，还有**30G**的免费额度
  :::

## 1. 账号注册

访问[七牛云-注册页面](https://portal.qiniu.com/signup?redirect_url=https:~2F~2Fwww.qiniu.com~2Fproducts~2Fkodo) 注册一个账号

## 2. 创建存储空间

访问[七牛云-对象存储](https://www.qiniu.com/products/kodo)

戳页面上的立即使用

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTQ5MzAyNg==647569493026)

新建空间，输入一些必要的数据

![](https://cdn.upyun.sugarat.top/mdImg/sugar/20c5b44a7a673c6ce0c5aef57e436328)

其中**访问控制**一定记得选私有，避免文件不通过鉴权就被下载

:::tip

- 存储空间名即为，后端服务中`.env`中`QINIU_BUCKET_NAME`的值
- 存储区域对应后端服务`.env`中`QINIU_BUCKET_ZONE`的值
  :::

`QINIU_BUCKET_ZONE`可选值如下
| 存储区域 | 值 |
| -------- | ------------- |
| 华东 | huadong |
| 华北 | huabei |
| 华南 | huanan |
| 北美 | beimei |
| 东南亚 | SoutheastAsia |

创建成功提示，测试域名有**30天**有效期

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTc1ODczNA==647569758734)

如果需要长期使用，建议绑定一个自定义域名，

:::tip 我没有域名怎么办
当然如果你没有域名，可以[联系作者](../author.md)，提供一个`.sugarat.top`下的3级，4级域名
:::

## 3. 获取到域名

进入我们创建的空间`easypicker-test`,就能看到提供的测试域名

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU2OTk3NjcwMQ==647569976702)

如果需要添加自己的域名，请在下面的页面自定义源站域名绑定自己的域名映射到空间内

![](https://cdn.upyun.sugarat.top/mdImg/sugar/3888bbaeb43e8c4dcd23cf24824fef52)

## 4. 获取ack与sek

:::warning 重要提示！！！-
**这两个东西千万不要泄露!!!**

**这两个东西千万不要泄露!!!**
:::

当然泄漏了可自己进行重置

获取位置如下

控制面板右上角的秘钥管理

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU3MDI3MDQwMw==647570270403)

接下来就能看到

![](https://img.cdn.sugarat.top/mdImg/MTY0NzU3MDM1MTUxOA==647570351518)

:::tip

- `AK` 对应`.env`中的 `QINIU_ACCESS_KEY`
- `SC` 对应`.env`中的 `QINIU_SECRET_KEY`
  :::

## 5. 通过面板快速更新配置

到此七牛云相关的 **5** 个必要需要的环境变量我们都拿到了

- QINIU_BUCKET_ZONE: 存储区域
- QINIU_BUCKET_NAME: 存储空间名
- QINIU_BUCKET_DOMAIN: 绑定的域名
- QINIU_ACCESS_KEY: 访问密钥
- QINIU_SECRET_KEY: 安全密钥

将其更新到管理面板中七牛云配置的位置即可

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzNjMzMTE2Mg==659936331162)

:::danger 注意：域名的值需要加上协议

- 注意：这里的值需要加上协议`http://你的域名`
- 注意：这里的值需要加上协议`http://你的域名`
- 注意：这里的值需要加上协议`http://你的域名`
  - **如果升级了https，这里对应填入https**

:::

:::details 如果应用版本 < v2.1.9，需要手动更新
手动将上述配置内容填写到，后端服务中`.env`中对应位置，然后重启服务即可
:::

## 6. 添加必要响应头信息

目的：避免图片，pdf，txt等浏览器支持预览的文件直接被预览而不触发下载

首先找到对应的存储空间，选择绑定的域名查看详情

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzNjgxOTc4OA==659936819788)

在打开的详情页面中找到 `HTTP响应头配置`

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzNjkwODY2Mw==659936908663)

添加一条规则,然后点击确定即可

```sh
Content-Disposition attachment
```

![](https://img.cdn.sugarat.top/mdImg/MTY1OTkzNjk3ODQxMg==659936978412)

## 7. 设置图片样式（可选）

现在手机拍摄的图片往往都很大，动辄10几兆，为了加快图片的预览与节省服务带宽可以配置七牛云的图片样式进行裁剪

![](https://img.cdn.sugarat.top/mdImg/MTY0OTkwMTE5NDY5Mw==649901194693)

点击新建图片样式，然后根据指引操作，完成创建

共需要两个样式，一个缩略图一个预览图，下面是场景示例

| 缩略图                                                                  | 预览图                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ![](https://img.cdn.sugarat.top/mdImg/MTY0OTkwMTMyOTI3Ng==649901329276) | ![](https://img.cdn.sugarat.top/mdImg/MTY0OTkwMTM0ODcwOA==649901348708) |

设置样式分隔符

![](https://img.cdn.sugarat.top/mdImg/MTY0OTkwMTc1MzA1OQ==649901753059)

在配置面板中更新即可

- **注意**
  - 不同存储空间之间的样式不互通
  - 填入格式是分隔符+样式名

完成配置后重启服务即可
:::details 如果应用版本 < v2.1.9，需要手动在配置文件中更新

将创建好的样式名和分隔符，填入到服务端的环境变量中

![](https://img.cdn.sugarat.top/mdImg/MTY0OTkwMTgwOTI3NQ==649901809275)
:::

## 8. 绑定自定义域名（可选）

在存储空间里找到`域名管理`，点击绑定域名即可

![](https://img.cdn.sugarat.top/mdImg/MTY0NzY5NDUwNTkzNw==647694505937)

域名输入一个自己域名对应的2/3/4级域名均可

- 例如：`sugarat.top`
  - 3级域名: `ep.sugarat.top`
  - 4级域名: `ep.test.sugarat.top`
  - 5级: `ep.test.file.sugarat.top`

![](https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjY5ODk5NA==647752698994)

填写完成后点击`创建`即可，然后按照要求添加域名解析

可以自行阅读[七牛云提供的域名绑定文档](https://developer.qiniu.com/kodo/8527/kodo-domain-name-management)完成

有其它问题可以小群交流，方便可以加入及时交流沟通问题: 685446473

![](https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjI3MzUwMw==647752273503)
