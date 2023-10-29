# 目录准备
if [ ! -d "./client" ]; then
  mkdir ./client
fi
if [ ! -d "./server" ]; then
  mkdir ./server
fi

# 拷贝服务端资源(不在当前项目里，以后优化)
rm -rf ./client/dist
cp -rf ../dist ./client/dist

# 拷贝服务端资源(不在当前项目里，以后优化)
rm -rf ./server/dist
cp -rf ./../../easypicker2-server/dist ./server
cp -rf ./../../easypicker2-server/package.json ./server
cp -rf ./../../easypicker2-server/pnpm-lock.yaml ./server