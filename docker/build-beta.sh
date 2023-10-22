# 目录准备
if [ ! -d "./client" ]; then
  mkdir ./client
fi

# 拷贝服务端资源(不在当前项目里，以后优化)
cp -rf ../dist ./client/dist

# 拷贝服务端资源(不在当前项目里，以后优化)
cp -rf ./../../easypicker2-server/dist ./server
cp -rf ./../../easypicker2-server/package.json ./server
cp -rf ./../../easypicker2-server/pnpm-lock.yaml ./server

docker build -t sugarjl/easypicker:beta .