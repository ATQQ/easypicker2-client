# 启动服务
serverName=$1
pm2 delete $serverName
pm2 start npm --name $serverName -- run start

echo "✅ 部署完成 🎉🎉🎉"

echo "✅ 运行 pm2 logs $serverName 查看启动日志"