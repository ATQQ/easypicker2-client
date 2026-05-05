# 目录准备
if [ ! -d "./client" ]; then
  mkdir ./client
fi
if [ ! -d "./server" ]; then
  mkdir ./server
fi

# 拷贝前端资源
rm -rf ./client/dist
cp -rf ../apps/web/dist ./client/dist

# 拷贝服务端资源
rm -rf ./server/dist
cp -rf ../apps/server/dist ./server
cp -rf ../apps/server/package.json ./server
cp -rf ../pnpm-lock.yaml ./server