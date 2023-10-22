---
outline: [2,3]
---
# 使用docker部署

:::tip 关于镜像的一点说明❤️
基于 [debian](https://hub.docker.com/_/debian) 构建，默认安装了 Nginx，Redis，PNPM，Node（打包为 [sugarjl/debian](https://hub.docker.com/repository/docker/sugarjl/debian/general)）

easypicker 镜像相关资源
* 镜像地址：[sugarjl/easypicker](https://hub.docker.com/repository/docker/sugarjl/easypicker/general)
* 构建脚本：docker/build-latest.sh，docker/build-beta.sh，docker/build-version.mjs
* Dockerfile：docker/Dockerfile

<span style="color:red;"><strong>easypicker 还依赖了 MySQL，MongoDB，这个需要读者自行在宿主机上准备</strong>(当然不阻塞镜像运行)</span>

**如果你对镜像构建改进有更好的建议，欢迎私聊或提issue讨论。**
:::

## 快速开始

① 获取镜像
```sh
docker pull sugarjl/easypicker:beta
```

② 启动镜像，并设置一个映射的端口，这里设置为`6478`
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

:::warning 注意
需要自行在宿主机上准备 MySQL，MongoDB 环境
:::

### 数据库

**配置MySQL**

:::details 方式1 自动导入，查看shell
```sh
curl https://script.sugarat.top/shell/ep/init-db.sh | bash -s 数据库名 账号 数据库密码
```
:::

:::details 方式2 手动导入，查看SQL
```sql
-- phpMyAdmin SQL Dump
-- version 4.4.15.10
-- https://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: 2023-03-03 22:38:29
-- 服务器版本： 5.6.50-log
-- PHP Version: 5.6.40

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ep-dev`
--

-- --------------------------------------------------------

--
-- 表的结构 `category`
--

CREATE TABLE IF NOT EXISTS `category` (
  `id` int(11) NOT NULL COMMENT '主键自增',
  `name` varchar(256) NOT NULL COMMENT '分类名称',
  `user_id` int(11) NOT NULL COMMENT '所属用户',
  `k` varchar(128) NOT NULL COMMENT '分类唯一标识'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='任务分类';

-- --------------------------------------------------------

--
-- 表的结构 `files`
--

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(11) NOT NULL,
  `task_key` varchar(256) NOT NULL COMMENT '所属任务',
  `task_name` varchar(256) NOT NULL COMMENT '提交时的任务名称',
  `category_key` varchar(256) NOT NULL COMMENT '所属分类',
  `user_id` int(11) NOT NULL COMMENT '所属用户',
  `name` varchar(1024) NOT NULL COMMENT '文件名',
  `info` varchar(10240) DEFAULT NULL COMMENT '提交填写的信息',
  `hash` varchar(512) NOT NULL COMMENT '文件hash',
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传日期',
  `size` int(11) NOT NULL COMMENT '文件大小',
  `people` varchar(256) DEFAULT NULL COMMENT '人员姓名',
  `origin_name` varchar(1024) DEFAULT '' COMMENT '原文件名',
  `del` tinyint(4) DEFAULT '0' COMMENT '是否删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户提交的问题';

-- --------------------------------------------------------

--
-- 表的结构 `people`
--

CREATE TABLE IF NOT EXISTS `people` (
  `id` int(11) NOT NULL COMMENT '主键',
  `task_key` varchar(128) NOT NULL COMMENT '关联任务id',
  `user_id` int(11) NOT NULL COMMENT '所属用户id',
  `name` varchar(128) DEFAULT NULL COMMENT '人员姓名',
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否提交',
  `submit_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后提交时间',
  `submit_count` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='任务关联人员表';

-- --------------------------------------------------------

--
-- 表的结构 `task`
--

CREATE TABLE IF NOT EXISTS `task` (
  `id` int(11) NOT NULL COMMENT '主键',
  `user_id` int(11) NOT NULL COMMENT '所属用户id',
  `category_key` varchar(128) NOT NULL COMMENT '关联分类key',
  `name` varchar(256) NOT NULL COMMENT '任务名称',
  `k` varchar(128) NOT NULL COMMENT '任务唯一标识',
  `del` tinyint(4) DEFAULT '0' COMMENT '是否删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='任务表';

-- --------------------------------------------------------

--
-- 表的结构 `task_info`
--

CREATE TABLE IF NOT EXISTS `task_info` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT '关联user_id',
  `task_key` varchar(256) NOT NULL COMMENT '关联任务的key',
  `template` varchar(512) DEFAULT NULL COMMENT '模板文件名称',
  `rewrite` tinyint(4) NOT NULL DEFAULT '0' COMMENT '自动重命名',
  `format` varchar(1024) DEFAULT NULL COMMENT '文件名格式',
  `info` varchar(10240) DEFAULT NULL COMMENT '提交必填的内容(表单)',
  `ddl` timestamp NULL DEFAULT NULL COMMENT '截止日期',
  `share_key` varchar(128) NOT NULL COMMENT '用于分享的链接',
  `limit_people` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否限制提交人员',
  `tip` text DEFAULT '' COMMENT '批注信息'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='任务附加属性';

-- --------------------------------------------------------

--
-- 表的结构 `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `id` int(11) NOT NULL COMMENT '唯一标识',
  `account` varchar(64) DEFAULT NULL COMMENT '用于登录的账号',
  `phone` varchar(22) DEFAULT NULL COMMENT '手机号',
  `password` varchar(256) NOT NULL COMMENT '密码',
  `power` tinyint(4) NOT NULL DEFAULT '6' COMMENT '账户权限',
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '账户权限',
  `join_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `login_time` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `login_count` int(11) NOT NULL DEFAULT '1' COMMENT '登陆次数',
  `open_time` timestamp NULL DEFAULT NULL COMMENT '解封时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户表';

--
-- Indexes for dumped tables
--

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `files`
--
ALTER TABLE `files`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `people`
--
ALTER TABLE `people`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `task_info`
--
ALTER TABLE `task_info`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_account_uindex` (`account`),
  ADD UNIQUE KEY `user_phone_uindex` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键自增';
--
-- AUTO_INCREMENT for table `files`
--
ALTER TABLE `files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `people`
--
ALTER TABLE `people`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键';
--
-- AUTO_INCREMENT for table `task`
--
ALTER TABLE `task`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键';
--
-- AUTO_INCREMENT for table `task_info`
--
ALTER TABLE `task_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '唯一标识';
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
```
:::

**配置MongoDB**

安装后保持默认配置就行，如有变化根据实际场景配置即可

### 七牛云
参考[七牛云OSS服务创建](./qiniu.md)文章，获取七牛云相关的几个环境变量

### 设置管理员
参考[线上部署文档](./online-new.md#%E9%85%8D%E7%BD%AE%E7%AE%A1%E7%90%86%E5%91%98%E6%9D%83%E9%99%90)最后一部分内容，设置管理员

*user 表里，将对应的用户 `power` 值设置为 0 即可*


## 更新容器

① 备份数据
```sh
# 创建备份目录
mkdir ep_backup

# 备份服务配置文件
docker cp easypicker2:/usr/share/easypicker/server/user-config.json ep_backup/user-config.json
```

② 停止&并删除容器
```sh
docker stop easypicker2 && docker rm easypicker2
```

③ 更新镜像
```sh
docker pull sugarjl/easypicker:beta
```

④ 重新创建容器
```sh
docker run -d -p 6478:80 --name easypicker2 sugarjl/easypicker:beta
```

⑤ 恢复数据
```sh
docker cp ep_backup/user-config.json easypicker2:/usr/share/easypicker/server/user-config.json
```

⑥ 重启容器
```sh
docker restart easypicker2
```

## FAQ
### Q1：启动后，容器自动关闭
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
