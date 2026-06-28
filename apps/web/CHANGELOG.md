# @sugarat/easypicker2-client

## 2.9.2

### Patch Changes

- feat: 管理后台清理文件后展示具体清理数量，并自动刷新用户列表
- fix: 批量扣费按钮仅在开启钱包限制且非本机存储时显示

## 2.9.1

### Patch Changes

- feat: 支持设置任务密码，提交页带密码任务可快捷切换
- feat: 文件页支持自动下载归档与一键复制文件链接
- feat: 归档下载点击后立即在下载历史展示「归档中」占位记录
- feat: 批量下载与下载选中任务时自动打开下载历史面板
- feat: 管理后台日志查询支持时间范围筛选
- refactor: 拆分全局配置获取，按作用域分别拉取
- refactor: 调整全局账户配置项与接口权限
- fix: 任务列表改为按分类合并接口，避免 GET /api/task 报错
- fix: 任务配置页改用单任务接口替代全量列表请求
- fix: 任务卡片缓存按 recent 维度区分，避免最近提交记录缺失

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
