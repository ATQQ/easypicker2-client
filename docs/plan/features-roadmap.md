# Easypicker2 功能优化与扩展（路线图摘要）

本文档为「规划 → 落地」的索引；实现细节以代码与 `docs/plan/log.md` 为准。

## 已规划条目（串行交付顺序）

1. **任务列表**：后端聚合最近提交；控制台任务列表按 `localStorage` 最近使用排序。
2. **邮箱 / SMTP**：站点 SMTP、邮箱验证码通道、可选邮箱验证码登录；服务异常告警邮件（若已配置）。
3. **本机存储与上传上限**：`storageMode`（`qiniu` | `local`）、`maxUploadSizeMB`、本地上传/下载/删除与元数据写入。
4. **分类提交页任务切换**：分类维度的 `submitNavTaskKeys`，公开 `task/info` 返回 `submitNavTasks`；提交页任务切换 UI。
5. **提交成功邮件通知**：用户绑定邮箱、`notifyOnSubmit`、提交成功后通知任务 owner（若已验证邮箱且开启通知）。
6. **配置与类型**：管理端全局配置表单项、前台 `getGlobalConfig` 字段、Web `api.d.ts` 与 composables 默认值对齐。

## 相关模块（速查）

| 能力 | 服务端要点 | 前端要点 |
|------|------------|----------|
| 任务列表 | `taskService` 聚合查询 | 控制台 `tasks/index.vue` |
| 邮件 | `mail.ts`、`tokenService` 通道、`siteConfig` | 登录/注册/重置、文件页通知 |
| 本机存储 | `serverInterceptor` `/api/file/upload`、`fileService` | `file/token`、`task/index.vue` 上传分支 |
| 提交导航 | `categoryService.updateSubmitNav`、`taskInfoService` | `CategoryPanel`、提交页选择器 |
| 提交通知 | `notifyOwnerOnSubmit` | Profile / 通知开关 |

## 验收建议

- `pnpm build`（server + web）。
- 切换 `storageMode`，验证七牛与本机直传、下载与删除。
- 配置 SMTP 后：邮箱验证码、重置密码、（可选）提交成功邮件。
