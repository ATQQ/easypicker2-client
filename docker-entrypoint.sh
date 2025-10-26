#!/bin/sh

# Docker entrypoint script for nginx with environment variable support
# 用于处理环境变量替换和启动nginx的入口脚本

set -e

# 设置默认值
export BACKEND_HOST=${BACKEND_HOST:-backend}
export BACKEND_PORT=${BACKEND_PORT:-3000}

echo "==================================="
echo "Nginx Docker Entrypoint"
echo "==================================="
echo "Backend Host: $BACKEND_HOST"
echo "Backend Port: $BACKEND_PORT"
echo "Backend URL: http://$BACKEND_HOST:$BACKEND_PORT"
echo "==================================="

# 检查模板文件是否存在
if [ -f "/etc/nginx/nginx.conf.template" ]; then
    echo "使用模板文件生成nginx配置..."
    # 使用envsubst替换环境变量并生成最终的nginx配置文件
    envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
    echo "nginx配置文件已生成: /etc/nginx/conf.d/default.conf"
else
    echo "警告: 未找到模板文件 /etc/nginx/nginx.conf.template"
    echo "将使用默认的nginx配置"
fi

# 测试nginx配置
echo "测试nginx配置..."
nginx -t

# 启动nginx
echo "启动nginx..."
exec nginx -g "daemon off;"