# 启动 mysql
chown -R root /var/lib/mysql
mysqld_safe &

sleep 3
# 导入表信息
mysqladmin -u root password "easypicker2"
mysql -uroot -peasypicker2 -e "CREATE DATABASE IF NOT EXISTS easypicker2;"
mysql -uroot -peasypicker2 -e "show databases;use easypicker2;source /easypicker2.sql;show tables;"

# 启动 nginx
nginx -c /etc/nginx/nginx.conf

# 启动 redis
redis-server /etc/redis/redis.conf

# 启动 mongodb
mongod --dbpath /var/lib/mongo --logpath /var/log/mongodb/mongod.log --fork

# 启动 pm2
cd /usr/share/easypicker/server && pm2-runtime start pnpm --name ep-server -- run start