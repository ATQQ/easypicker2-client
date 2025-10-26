#!/bin/bash

# 设置变量
IMAGE_NAME="sugarjl/easypicker2-client"
IMAGE_TAG="latest"
CONTAINER_NAME="easypicker2-client-app"
PORT="8080"

# 显示构建信息
echo "===================================="
echo "构建 $IMAGE_NAME:$IMAGE_TAG 镜像"
echo "===================================="

# 构建Docker镜像
docker build -t $IMAGE_NAME:$IMAGE_TAG .

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "===================================="
    echo "镜像构建成功: $IMAGE_NAME:$IMAGE_TAG"
    echo "===================================="
    
    # 检查是否有同名容器正在运行，如果有则停止并删除
    if [ "$(docker ps -a -q -f name=$CONTAINER_NAME)" ]; then
        echo "停止并删除已存在的容器: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    
    # 运行新容器
    echo "启动新容器: $CONTAINER_NAME，端口映射: $PORT:80"
    # 将容器连接到名为 easypicker-network 的 Docker 网络中，使容器可以与同一网络中的其他容器通信
    # 检查 easypicker-network 网络是否存在，如果不存在则创建
    if ! docker network inspect easypicker-network >/dev/null 2>&1; then
        echo "创建 Docker 网络: easypicker-network"
        docker network create easypicker-network
    fi
    docker run -d \
        -p $PORT:80 \
        -e BACKEND_HOST=easypicker2-server-app \
        --network easypicker-network \
        --name $CONTAINER_NAME \
        $IMAGE_NAME:$IMAGE_TAG
    
    echo "===================================="
    echo "应用已部署，访问地址: http://localhost:$PORT"
    echo "===================================="
else
    echo "===================================="
    echo "镜像构建失败"
    echo "===================================="
    exit 1
fi