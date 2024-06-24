# 常见问题
协助自助排查`部署问题`

## Q1:PM2/后端服务启动失败，如何手动启动后端服务
查看 `pm2` 应用列表
```shell
pm2 ls
```
![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0NTI1MDEzOQ==655345250139)

观察服务重启次数是否一直在增加

查看服务日志

```sh
# 所有日志
pm2 log
# 指定应用日志,如ep-dev
pm2 log ep-dev
```

如有报错，将报错信息贴至交流群，协助开发者排查

如果pm2启动失败，尝试更新 `pm2`

```sh
npm i -g pm2
```

完成升级后，手动启动服务
1. 先确保当前执行目录在服务目录下

![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0NTYzMzk0Nw==655345633947)

2. 删除旧的服务

```sh
# 查看服务列表
pm2 ls
# 删除指定服务,如ep-dev
pm2 del ep-dev
```

3. 启动服务

```sh
pm2 start npm --name 自定义服务名 -- run start
# 例如
pm2 start npm --name my-ep2-server -- run start
```

![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0NTg4MTQzNw==655345881437)

4. 查看服务情况

```sh
pm2 log my-ep2-server
```

:::warning 如有报错红色的信息
执行指令停止服务
```sh
pm2 stop my-ep2-server
```

![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0NjEwODI3Nw==655346108277)
:::

没有错误就完事大吉

## Q2:批量下载出错，能上传

这种情况一般是七牛云的存储空间区域没有配置对

根据服务版本。

### > v2.1.7
见最新 [接入七牛云OSS服务](./qiniu.md) 文档，根据自己的区域配置 `存储空间区域` 值。

### <= v2.1.7

修改代码`src/utils/qiniuUtil.ts`第`251`行，Zone的值为对应区域的值

![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0Njg4NDIxNQ==655346884215)

![](https://img.cdn.sugarat.top/mdImg/MTY1NTM0Njk0NTY2Mw==655346945663)
