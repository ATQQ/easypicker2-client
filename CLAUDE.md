# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 行为准则

减少常见的 LLM 编码错误。与项目特定指令合并使用。

**权衡：** 这些准则偏向谨慎而非速度。对于简单任务，自行判断。

### 1. 先思考再编码

**不要假设。不要隐藏困惑。暴露权衡。**

实现之前：

- 明确说明你的假设。不确定时，提问。
- 如果存在多种解释，呈现它们 — 不要默默选择。
- 如果有更简单的方案，说出来。有理由时提出反对。
- 如果不清楚，停下来。指出困惑之处，提问。

### 2. 简单优先

**解决问题的最少代码。不做投机性编写。**

- 不添加超出要求的功能。
- 不为单次使用的代码做抽象。
- 不做未被要求的"灵活性"或"可配置性"。
- 不为不可能的场景做错误处理。
- 如果写了 200 行可以 50 行搞定，重写。

问自己："资深工程师会觉得这过度复杂吗？" 如果是，简化。

### 3. 精准修改

**只动必须动的。只清理自己制造的混乱。**

编辑现有代码时：

- 不要"顺便改进"相邻代码、注释或格式。
- 不要重构没坏的东西。
- 匹配现有风格，即使你会用不同方式写。
- 如果发现无关的死代码，提一下 — 不要删除。

当你的修改产生孤立代码时：

- 移除你的修改导致的未使用 import/变量/函数。
- 不要移除之前就存在的死代码，除非被要求。

检验标准：每一行改动都应直接追溯到用户的需求。

### 4. 目标驱动执行

**定义成功标准。循环直到验证通过。**

将任务转化为可验证的目标：

- "添加验证" → "为无效输入写测试，然后让它们通过"
- "修复 bug" → "写一个复现测试，然后让它通过"
- "重构 X" → "确保重构前后测试通过"

多步骤任务，说明简要计划：

```
1. [步骤] → 验证: [检查项]
2. [步骤] → 验证: [检查项]
3. [步骤] → 验证: [检查项]
```

强成功标准让你能独立循环。弱标准（"让它能用"）需要不断确认。

---

**这些准则有效的标志：** diff 中不必要的变更更少，因过度复杂导致的重写更少，澄清问题在实现之前而非犯错之后提出。

---

## 项目简介

EasyPicker2（轻取）是一个在线文件收取平台，用于创建收集任务、提交文件、管理人员与统计结果。采用 pnpm monorepo 维护。

## 常用命令

```bash
# 安装依赖（使用项目 .npmrc 配置的镜像源，不要加 --registry）
pnpm install

# 前后端同时开发
pnpm dev

# 仅前端开发（端口由 vite 配置，代理 /api/ 到 localhost:3000）
pnpm web:dev
# 仅前端开发（连接测试环境 API）
pnpm web:dev:test

# 仅后端开发（tsup watch + nodemon）
pnpm server:dev

# 构建
pnpm build            # 前端构建
pnpm web:build:test   # 前端测试环境构建
pnpm server:build     # 后端构建

# 启动生产服务
pnpm start

# Lint
pnpm lint
pnpm lint:fix

# 测试（仅后端有 vitest）
pnpm --filter @sugarat/easypicker2-server test

# 部署
pnpm web:deploy     # 前端部署
pnpm server:deploy  # 后端部署

# 文档
pnpm docs:dev
```

## 项目结构

```
apps/
  web/          # 前端 Vue3 + Vite + TypeScript
  server/       # 后端 Node.js + TypeScript
packages/
  easypicker2-cli/  # 独立部署 CLI 工具
docs/               # VitePress 文档站点
scripts/deploy/     # 部署脚本（zx）
tools/              # 运维工具脚本
```

## 架构概览

### 前端（apps/web）

- **框架**：Vue 3 + TypeScript + Vite
- **UI**：Element Plus（通过 unplugin-auto-import 和 unplugin-vue-components 自动导入）
- **路由**：Vue Router 4，页面在 `src/pages/` 下按目录组织
- **状态管理**：Vuex 4，store 模块在 `src/store/modules/`
- **HTTP**：Axios，API 封装在 `src/apis/`
- **路径别名**：`@` → `src/`，`@components` → `src/components/`
- **环境变量**：`VITE_APP_AXIOS_BASE_URL` 控制 API 前缀，`.env` / `.env.test` / `.env.production`

开发代理规则（vite.config.mts）：

- `/api/` → `http://127.0.0.1:3000`（本地后端）
- `/api-test/` → `https://ep.test.sugarat.top`（测试环境，rewrite 为 `/api/`）

### 后端（apps/server）

- **框架**：flash-wolves（轻量 Node.js 框架）
- **构建**：tsup（入口 `src/index.ts`，输出到 `dist/`）
- **数据库**：
  - **MySQL**（主库）：TypeORM，entity 在 `src/db/entity/`，Repository 基类封装在 `src/db/index.ts`
  - **MongoDB**：日志/行为数据存储，连接在 `src/db/logDb.ts`
  - **Redis**：缓存，配置在 `src/db/redisDb.ts`
- **分层**：routes → controllers → services，路由模块在 `src/routes/modules/`，controller 在 `src/controllers/`
- **启动流程**：initTypeORM → ensureMysqlBootstrap → runMysqlPatchesOnStartup（自动对齐 schema）
- **路由前缀**：自动为所有路由添加 `/api/` 别名

### CLI（packages/easypicker2-cli）

- 命令名：`easypicker2` 或 `ep2`
- 用于一键私有化部署

## 数据库 Schema 变更规范

修改数据库表结构时，必须同步更新以下三个位置：

1. `apps/server/docs/schema/mysql-schema.json` — 唯一数据源，启动时自动对齐
2. `apps/server/docs/sql/auto_create.sql` — 空库 bootstrap SQL
3. `src/db/model/*.ts`（TypeORM Entity）— 运行时 ORM 映射

详见 [字段变更流程](apps/server/docs/schema/字段变更流程.md)。

## 代码风格

- ESLint 使用 `@antfu/eslint-config` + `formatters: true`
- 代码格式由 ESLint 自动格式化（通过 `eslint-plugin-format`）
- pre-commit hook 通过 `simple-git-hooks` + `lint-staged` 自动执行 `eslint --fix`
- `no-console: off`，后端允许 console 输出

## 依赖安装注意事项

- 直接使用项目 `.npmrc` 配置的镜像源（npmmirror），不要在命令中追加 `--registry`
- 如果沙箱环境安装依赖有问题，提示用户在终端手动执行 `pnpm install`
