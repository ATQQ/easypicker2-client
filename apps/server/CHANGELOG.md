# @sugarat/easypicker2-server

## 2.9.1

### Patch Changes

- feat: 支持设置任务密码（含提交密码门控的边界处理）
- feat: 新增 task/grouped 聚合接口，修复 no-task 虚拟分类 404
- feat: 管理后台日志查询支持时间范围筛选
- feat: 记录批量扣费明细
- refactor: 重构批量扣费逻辑，改为异步后台执行
- refactor: 调整全局账户配置项与接口权限
- fix: 兼容任务批注图片和模板文件跨存储模式访问
- fix: 本机模式批注图片上传后立即回填预览地址
- fix: 名单手动添加改为接口批量入库，补齐模板文件和批注图片本机上传链路

## 2.9.0

### Minor Changes

- feat: 提交页支持同分类任务切换问题
- feat: 支持邮箱登录与邮箱绑定
- feat: 支持文件提交消息推送
- feat: 任务列表优化
- feat: 支持本地模式
- feat: 邮箱相关通知
- feat: 支持设置通告
- feat: 提交页显示最近文件上传记录

## 2.8.4

### Patch Changes

- fix: 据兼容脏数据兼容,text2json

## 2.8.3

### Patch Changes

- fix: 七牛云配置报错，未配置数据库时登录报错，自动导表优化

## 2.8.2

### Patch Changes

- fix: 批注不支持 emoji，截止日期展示异常，绑定表单项优化，表单编辑优化

## 2.8.1

### Patch Changes

- fix: 表单数据解析失败

## 2.8.0

### Minor Changes

- feat: 重构管理员面板和任务编辑页面
