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

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]