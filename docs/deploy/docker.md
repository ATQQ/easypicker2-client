---
outline: [2,3]
---
# 使用docker部署

:::tip 关于镜像的一点说明❤️
基于 [debian](https://hub.docker.com/_/debian) 构建，默认安装了 Nginx，Redis，PNPM，Node，MySQL，MongoDB（打包为 [sugarjl/debian](https://hub.docker.com/repository/docker/sugarjl/debian/general)）

easypicker 镜像相关资源
* 镜像地址：[sugarjl/easypicker](https://hub.docker.com/repository/docker/sugarjl/easypicker/general)
* 构建脚本：docker/build-latest.sh，docker/build-beta.sh，docker/build-version.mjs
* Dockerfile：docker/Dockerfile

<span style="color:red;"><strong>如果你希望是用宿主机的数据库，请阅最后一部分自定义镜像</strong></span>

**如果你对镜像构建改进有更好的建议，欢迎私聊或提issue讨论。**

*笔者使用的加速镜像源为：`https://dockerproxy.com`*
:::

## 快速开始

① 获取镜像
```sh
docker pull sugarjl/easypicker:beta
```

② 启动镜像，并设置一个映射的端口

这里设置为`6478`，同时设置容器名为`easypicker2`（这些都可以根据实际情况进行修改）
```sh
docker run -d -p 6478:80 --name easypicker2 sugarjl/easypicker:beta
```

运行`docker ps` 如果看到下面类似的日志，*恭喜你，你已经成功启动了 easypicker2 🎉*

![](https://img.cdn.sugarat.top/mdImg/MTY5Nzk2OTc3MDM4MA==697969770380)

可以打开浏览器访问一下 http://localhost:6478 即可看到页面

③ 获取系统账号，登录后台

```sh
docker logs easypicker2
```

![](https://img.cdn.sugarat.top/mdImg/MTY5Nzk3MTc4MzQ1MA==697971783450)

访问 http://localhost:6478/login ，输入账号密码即可登录后台

![](https://img.cdn.sugarat.top/mdImg/MTY3Njc5OTQwNTY2Nw==676799405667)


## 配置服务
根据实际的情况完成 七牛云，腾讯云（可选）的配置

### 七牛云
参考[七牛云OSS服务创建](./qiniu.md)文章，获取七牛云相关的几个环境变量

### 设置管理员
参考[线上部署文档](./online-new.md#%E9%85%8D%E7%BD%AE%E7%AE%A1%E7%90%86%E5%91%98%E6%9D%83%E9%99%90)最后一部分内容，设置管理员

*user 表里，将对应的用户 `power` 值设置为 0 即可*

下面是操作案例，将 `admin` 账号设置为管理员
```sh
# 进入容器内部
docker exec -it easypicker2 /bin/bash

# 执行sql修改目标账号权限
mysql -uroot -peasypicker2 -e "use easypicker2;UPDATE user SET power=0 WHERE account='admin';"
```
重新登录账号即可生效

## 更新容器

① 备份数据
```sh
# 创建备份目录
mkdir ep_backup

# 备份服务配置文件
docker cp easypicker2:/usr/share/easypicker/server/user-config.json ep_backup/user-config.json

# 备份mysql
docker exec easypicker2 mysqldump -uroot -peasypicker2 easypicker2 > ep_backup/easypicker2.sql

# 备份mongodb
docker exec easypicker2 mongodump -d easypicker2 -o /tmp/ep_backup
docker cp easypicker2:/tmp/ep_backup ep_backup/mongodb
```

② 停止容器
```sh
docker stop easypicker2
```

③ 更新镜像
```sh
docker pull sugarjl/easypicker:beta
```

④ 重新创建容器
:::warning 注意事项
如果要继续使用之前的容器名，需要先删除之前的容器

<span style="color:red;">请确保相关数据都有备份，删除容器后无法恢复</span>

否则使用一个新的镜像名（例如 easypicker-next）
```sh
# 移除旧容器
docker rm easypicker2
```
:::
```sh
# 重新创建新的容器
docker run -d -p 6478:80 --name easypicker2 sugarjl/easypicker:beta
```

⑤ 恢复数据
```sh
# 恢复配置
docker cp ep_backup/user-config.json easypicker2:/usr/share/easypicker/server/user-config.json
# 恢复mysql
docker exec -i easypicker2 mysql -uroot -peasypicker2 easypicker2 < ep_backup/easypicker2.sql
# 恢复mongodb
docker cp ep_backup/mongodb easypicker2:/tmp/ep_backup
docker exec easypicker2 mongorestore -d easypicker2 /tmp/ep_backup/easypicker2
```

⑥ 重启容器
```sh
docker restart easypicker2
```

## FAQ
### Q1: 启动后，容器自动关闭
查看日志
```sh
docker logs easypicker2
```

如果有如下报错信息
```sh
SyntaxError: Unexpected token { in JSON at position 2765
    at JSON.parse (<anonymous>)
    at /usr/share/easypicker/server/dist/index.js:622:48
    at step (/usr/share/easypicker/server/dist/index.js:337:23)
    at Object.next (/usr/share/easypicker/server/dist/index.js:278:20)
    at asyncGeneratorStep (/usr/share/easypicker/server/dist/index.js:20:28)
    at _next (/usr/share/easypicker/server/dist/index.js:38:17)
```

说明配置文件 `user-config.json` 格式有误，可以CV出来修改一下
```sh
# 复制到当前目录下下
docker cp easypicker2:/usr/share/easypicker/server/user-config.json user-config.json
```
使用[JSON编辑器打开](https://www.json.cn/)，查看错误的位置

例如这里的错误

![](https://img.cdn.sugarat.top/mdImg/MTY5Nzk3NjM5NjM1NA==697976396354)

修复正确后，将配置文件重新复制到容器内即可
```sh
# 配置文件复制到容器内
docker cp user-config.json easypicker2:/usr/share/easypicker/server/user-config.json
# 重新启动
docker restart easypicker2
```

### Q2: 宝塔面板如何使用docker部署

1 宝塔面板安装docker

2 Docker 管理器中配置加速器
```json
{
  "registry-mirrors": [
    "https://dockerproxy.com"
  ]
}
```

3 按照上面的步骤运行镜像

4 创建网站
