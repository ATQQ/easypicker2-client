#!/bin/bash

# 设置默认变量
IMAGE_NAME="sugarjl/easypicker2-client"
IMAGE_TAG="latest"
PLATFORMS="linux/amd64,linux/arm64"

# 处理命令行参数
while getopts ":t:" opt; do
  case $opt in
    t) IMAGE_TAG="$OPTARG" ;;
    \?) echo "无效的选项: -$OPTARG" >&2; exit 1 ;;
    :) echo "选项 -$OPTARG 需要参数." >&2; exit 1 ;;
  esac
done

# 显示构建信息
echo "====================================="
echo "构建并推送多平台镜像: $IMAGE_NAME:$IMAGE_TAG"
echo "支持平台: $PLATFORMS"
echo "====================================="

# 确保buildx构建器存在
if ! docker buildx inspect builder > /dev/null 2>&1; then
  echo "创建buildx构建器..."
  docker buildx create --name builder --use
else
  echo "使用现有buildx构建器"
  docker buildx use builder
  docker buildx inspect --bootstrap
fi

# 构建并推送多平台Docker镜像
echo "开始构建并推送镜像..."
docker buildx build \
  --platform=$PLATFORMS \
  --tag $IMAGE_NAME:$IMAGE_TAG \
  --push \
  .

# 检查构建是否成功
if [ $? -eq 0 ]; then
  echo "====================================="
  echo "多平台镜像构建并推送成功: $IMAGE_NAME:$IMAGE_TAG"
  echo "支持平台: $PLATFORMS"
  echo "====================================="
else
  echo "====================================="
  echo "镜像构建或推送失败"
  echo "====================================="
  exit 1
fi

# 显示使用说明
echo "使用说明:"
echo "docker pull $IMAGE_NAME:$IMAGE_TAG"
echo "docker run -d -p 8080:80 --name easypicker2-client-app $IMAGE_NAME:$IMAGE_TAG"
echo "应用将在 http://localhost:8080 可访问"