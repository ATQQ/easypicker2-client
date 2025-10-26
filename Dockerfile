# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 设置npm镜像源并安装依赖
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm install

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产阶段
FROM nginx:alpine

# 安装envsubst工具（用于环境变量替换）
RUN apk add --no-cache gettext

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置模板和入口脚本
COPY ./nginx.conf.template /etc/nginx/nginx.conf.template
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

# 设置脚本执行权限
RUN chmod u+x /docker-entrypoint.sh

# 设置默认环境变量
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=3000

# 暴露端口
EXPOSE 80

# 使用自定义入口脚本启动
ENTRYPOINT ["/docker-entrypoint.sh"]