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
  `size` bigint NOT NULL COMMENT '文件大小',
  `people` varchar(256) DEFAULT NULL COMMENT '人员姓名',
  `origin_name` varchar(1024) DEFAULT '' COMMENT '原文件名',
  `del` tinyint(4) DEFAULT '0' COMMENT '是否删除',
  `oss_del_time` TIMESTAMP NULL DEFAULT NULL COMMENT 'oss资源删除时间',
  `del_time` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  `last_update_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
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
  `tip` text COMMENT '批注信息',
  `bind_field` varchar(255) DEFAULT '姓名' COMMENT '绑定表单字段'
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
  `open_time` timestamp NULL DEFAULT NULL COMMENT '解封时间',
  `size` INT(11) NOT NULL DEFAULT '2' COMMENT '可支配空间上限GB',
  `wallet` DECIMAL(10,2) NOT NULL DEFAULT '2.00' COMMENT '钱包余额'
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
