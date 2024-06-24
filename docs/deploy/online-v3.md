# 线上部署(v3)

TODO: 待补充

可以[先看 V2 的文档](./online-new.md)，使用如下最新版本的CLI工具


:::tip 请先安装工具

```sh
# 安装工具
npm i -g @sugarat/cli --registry=https://registry.npmmirror.com

# 安装插件
q add ep

# 更新插件
q update
```

```sh
# q add ep 执行结果
🌩 正在安装插件 @sugarat/cli-plugin-ep ，请稍等
完成 ep 指令安装 0.1.1
执行 q ep --help 查看细节
```

<!-- 详细用法参考，[最新部署文档 V3](../deploy/online-v3.md) -->
:::

:::tip 线上部署

```sh
q ep deploy

┌   部署 EasyPicker 项目
│
◆  选择部署端
│  ● 客户端 - client
│  ○ 数据库 - mysql
│  ○ 服务端 - server
└
```

:::details 交互式部署结果

```sh
┌   部署 EasyPicker 项目
│
◇  选择部署端
│  客户端 - client
│
◇  选择部署版本
│  稳定版 - latest
│
◇  选择具体版本
│  2.5.0
│
◇  资源包拉取完成 (easypicker2-client-2.5.0.tgz)
│
◇  资源解压完成（目录：./dist）
│
└  部署完成！🎉，记得设置 nginx 访问目录为 dist 目录

```

:::
