# AGENTS

## Dependency Installation

- 安装依赖时直接使用项目配置的镜像源（例如 `.npmrc`），不要在命令中追加 `--registry`，也不要临时执行 `npm config set registry` 覆盖项目配置。
- 如果要在沙箱中执行 pnpm 安装依赖，有问题的话，直接在用户终端执行，或者提示用户执行，避免在项目里产生 .pnpm-store

## 后端

针对 [apps/server](apps/server) 的一些说明

- 如果要修改数据库，请参考[字段变更规范](./apps/server/docs/schema/字段变更流程.md)
